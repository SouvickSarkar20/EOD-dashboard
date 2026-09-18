import asyncio
import os
import sys
from datetime import datetime, date
from decimal import Decimal
import pandas as pd
from sqlalchemy import select, func, delete, insert

# Add backend directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import AsyncSessionLocal, engine
from app.models import (
    AdminUser, UserRole, UserStatus,
    District, Station, Operator,
    StationAssignment, DailyRecord, MonthlySummary
)
from app.utils.security import get_password_hash

EXCEL_FILE_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "EOD.xlsx"))

def parse_date(val) -> date:
    """Helper to parse YYYYMMDD integer or string into date object."""
    s = str(val).strip()
    if len(s) == 8:
        return date(int(s[:4]), int(s[4:6]), int(s[6:8]))
    raise ValueError(f"Invalid date format: {val}")

async def run_migration():
    start_time = datetime.now()
    print(f"Reading Excel file from: {EXCEL_FILE_PATH}")
    if not os.path.exists(EXCEL_FILE_PATH):
        raise FileNotFoundError(f"Excel file not found at {EXCEL_FILE_PATH}")

    xl = pd.ExcelFile(EXCEL_FILE_PATH)
    users_df = xl.parse("Users")
    monthly_df = xl.parse("Monthly")
    daily_df = xl.parse("Daily")

    print(f"Excel Sheets Loaded in {(datetime.now() - start_time).total_seconds():.2f}s:")
    print(f" - Users sheet: {len(users_df)} rows")
    print(f" - Monthly sheet: {len(monthly_df)} rows")
    print(f" - Daily sheet: {len(daily_df)} rows")

    async with AsyncSessionLocal() as db:
        print("\n--- Phase 2 Fast Bulk Migration In Progress ---")

        # 1. Seed Districts
        print("1. Migrating Districts...")
        district_names = set()
        for d in monthly_df["District"].dropna().unique():
            district_names.add(str(d).strip().upper())
        for d in daily_df["District"].dropna().unique():
            district_names.add(str(d).strip().upper())

        district_map = {} # name -> district_id
        for name in sorted(district_names):
            stmt = select(District).where(District.district_name == name)
            res = await db.execute(stmt)
            existing = res.scalar_one_or_none()
            if not existing:
                dist = District(district_name=name)
                db.add(dist)
                await db.flush()
                district_map[name] = dist.district_id
            else:
                district_map[name] = existing.district_id
        await db.commit()
        print(f"   [OK] {len(district_map)} Districts ready.")

        # 2. Seed Stations
        print("2. Migrating Stations...")
        station_ids = set()
        for s in monthly_df["StationID"].dropna().unique():
            station_ids.add(str(s).strip())
        for s in daily_df["StationID"].dropna().unique():
            station_ids.add(str(s).strip())

        station_dicts = []
        existing_stations = set((await db.execute(select(Station.station_id))).scalars().all())
        for sid in sorted(station_ids):
            if sid not in existing_stations:
                station_dicts.append({"station_id": sid, "station_name": f"Station {sid}"})
        if station_dicts:
            await db.execute(insert(Station), station_dicts)
            await db.commit()
        print(f"   [OK] {len(station_ids)} Stations ready.")

        # 3. Seed Operators
        print("3. Migrating Operators...")
        operator_map = {} # code -> name
        for idx, row in monthly_df.iterrows():
            code = str(row["UserID"]).strip()
            name = str(row["OperatorName"]).strip() if pd.notna(row["OperatorName"]) else None
            operator_map[code] = name
        for idx, row in daily_df.iterrows():
            code = str(row["OPERATOR_ID"]).strip()
            name = str(row["OperatorName"]).strip() if pd.notna(row["OperatorName"]) else None
            if code not in operator_map or not operator_map[code]:
                operator_map[code] = name

        existing_ops = set((await db.execute(select(Operator.operator_code))).scalars().all())
        op_dicts = []
        for code, name in operator_map.items():
            if code not in existing_ops:
                op_dicts.append({"operator_code": code, "operator_name": name})
        if op_dicts:
            await db.execute(insert(Operator), op_dicts)
            await db.commit()
        print(f"   [OK] {len(operator_map)} Operators ready.")

        # 4. Seed Admin & District Managers
        print("4. Migrating Admin & District Managers...")
        dm_user_map = {} # DM Name -> UUID

        # System Admin Demo Credentials
        admin_stmt = select(AdminUser).where(AdminUser.email == "admin@demo.com")
        res = await db.execute(admin_stmt)
        sys_admin = res.scalar_one_or_none()
        if not sys_admin:
            sys_admin = AdminUser(
                dmid="ADMIN001",
                name="System Admin",
                email="admin@demo.com",
                role=UserRole.ADMIN,
                status=UserStatus.ACTIVE,
                password_hash=get_password_hash("AdminDemo123!"),
                is_demo_creds=True,
                is_2fa_enabled=False,
            )
            db.add(sys_admin)
            await db.flush()
            print("   - Initialized Admin Demo Creds: admin@demo.com / AdminDemo123!")

        # District Managers from Users sheet
        for idx, row in users_df.iterrows():
            dmid = str(row["DMID"]).strip()
            dm_name = str(row["District Manager"]).strip()
            role_str = str(row["Role"]).strip()

            if role_str == "Admin":
                continue

            email = f"{dmid.lower()}@eod.internal"
            stmt = select(AdminUser).where(AdminUser.dmid == dmid)
            res = await db.execute(stmt)
            dm_user = res.scalar_one_or_none()
            if not dm_user:
                dm_user = AdminUser(
                    dmid=dmid,
                    name=dm_name,
                    email=email,
                    role=UserRole.DISTRICT_MANAGER,
                    status=UserStatus.ACTIVE,
                    password_hash=get_password_hash("DmPass@123!"),
                    is_demo_creds=True,
                    is_2fa_enabled=False,
                )
                db.add(dm_user)
                await db.flush()
            dm_user_map[dm_name] = dm_user.id
            dm_user_map[dmid] = dm_user.id

        await db.commit()
        print(f"   [OK] {len(dm_user_map)} DM user references mapped.")

        # 5. Build Station Assignments from Monthly sheet
        print("5. Migrating Station Assignments...")
        existing_assignments = set()
        assignment_dicts = []
        for idx, row in monthly_df.iterrows():
            month = int(row["EnrollMth"])
            station_id = str(row["StationID"]).strip()
            dm_name = str(row["DistrictManger"]).strip()
            district_name = str(row["District"]).strip().upper()

            pair = (station_id, month)
            if pair in existing_assignments:
                continue

            dm_uuid = dm_user_map.get(dm_name)
            dist_id = district_map.get(district_name)

            if dm_uuid and dist_id:
                assignment_dicts.append({
                    "station_id": station_id,
                    "dm_user_id": dm_uuid,
                    "district_id": dist_id,
                    "effective_month": month
                })
                existing_assignments.add(pair)

        if assignment_dicts:
            await db.execute(delete(StationAssignment))
            await db.execute(insert(StationAssignment), assignment_dicts)
            await db.commit()
        print(f"   [OK] {len(assignment_dicts)} Station Assignments populated.")

        # 6. Fast Core Bulk Insert Monthly Summaries
        print("6. Migrating Monthly Summaries (1,346 records)...")
        await db.execute(delete(MonthlySummary))
        await db.commit()

        monthly_dicts = []
        for idx, row in monthly_df.iterrows():
            monthly_dicts.append({
                "enroll_month": int(row["EnrollMth"]),
                "station_id": str(row["StationID"]).strip(),
                "operator_code": str(row["UserID"]).strip(),
                "total_enrollment": int(row["Total Enroll"]),
                "total_amount": Decimal(str(row["Amount to be Collect"])),
                "bmu_100": int(row["BMU @ 100"]),
                "dmu_50": int(row["DMU @ 50"]),
                "mbu_0": int(row["MBU @ 0"]),
                "mbu_100": int(row["MBU @ 100"]),
                "new_0": int(row["NEW @ 0"]),
                "bmu_125": int(row["BMU @ 125"]),
                "dmu_75": int(row["DMU @ 75"]),
                "mbu_125": int(row["MBU @ 125"])
            })
        
        await db.execute(insert(MonthlySummary), monthly_dicts)
        await db.commit()
        print(f"   [OK] {len(monthly_dicts)} Monthly Summary records migrated.")

        # 7. Fast Core Bulk Insert Daily Records (chunk size 5,000)
        print("7. Migrating Daily Records (26,018 records in fast core bulk mode)...")
        await db.execute(delete(DailyRecord))
        await db.commit()

        daily_dicts = []
        chunk_size = 5000
        total_inserted = 0

        for idx, row in daily_df.iterrows():
            daily_dicts.append({
                "enroll_date": parse_date(row["EnrollDT"]),
                "station_id": str(row["StationID"]).strip(),
                "operator_code": str(row["OPERATOR_ID"]).strip(),
                "total_enrollment": int(row["Total Enrollment"]),
                "total_amount": Decimal(str(row["Total amount"])),
                "bmu_100": int(row["BMU @ 100"]),
                "dmu_50": int(row["DMU @ 50"]),
                "mbu_0": int(row["MBU @ 0"]),
                "mbu_100": int(row["MBU @ 100"]),
                "new_0": int(row["NEW @ 0"]),
                "bmu_125": int(row["BMU @ 125"]),
                "dmu_75": int(row["DMU @ 75"]),
                "mbu_125": int(row["MBU @ 125"])
            })

            if len(daily_dicts) >= chunk_size:
                await db.execute(insert(DailyRecord), daily_dicts)
                await db.commit()
                total_inserted += len(daily_dicts)
                print(f"     -> Bulk inserted {total_inserted} / {len(daily_df)} daily records...")
                daily_dicts = []

        if daily_dicts:
            await db.execute(insert(DailyRecord), daily_dicts)
            await db.commit()
            total_inserted += len(daily_dicts)
            print(f"     -> Bulk inserted {total_inserted} / {len(daily_df)} daily records...")

        print(f"   [OK] {total_inserted} Daily Records migrated successfully.")

        # 8. Data Verification
        print("\n--- Migration Data Integrity Verification ---")
        num_districts = (await db.execute(select(func.count(District.district_id)))).scalar()
        num_stations = (await db.execute(select(func.count(Station.station_id)))).scalar()
        num_operators = (await db.execute(select(func.count(Operator.operator_code)))).scalar()
        num_users = (await db.execute(select(func.count(AdminUser.id)))).scalar()
        num_assignments = (await db.execute(select(func.count(StationAssignment.assignment_id)))).scalar()
        num_monthly = (await db.execute(select(func.count(MonthlySummary.summary_id)))).scalar()
        num_daily = (await db.execute(select(func.count(DailyRecord.record_id)))).scalar()

        print(f" [DB Audit] Districts: {num_districts}")
        print(f" [DB Audit] Stations: {num_stations}")
        print(f" [DB Audit] Operators: {num_operators}")
        print(f" [DB Audit] Users (Admin + DMs): {num_users}")
        print(f" [DB Audit] Station Assignments: {num_assignments}")
        print(f" [DB Audit] Monthly Summaries: {num_monthly}")
        print(f" [DB Audit] Daily Records: {num_daily}")

        assert num_monthly == 1346, f"Expected 1346 monthly records, found {num_monthly}"
        assert num_daily == 26018, f"Expected 26018 daily records, found {num_daily}"
        
        total_time = (datetime.now() - start_time).total_seconds()
        print(f"\nSUCCESS: Migration Completed & Verified in {total_time:.2f} seconds!")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(run_migration())
