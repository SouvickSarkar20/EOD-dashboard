import asyncio
import os
import sys
from datetime import datetime, date
from decimal import Decimal
import pandas as pd
from sqlalchemy import select, func, insert

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import AsyncSessionLocal, engine
from app.models import (
    District, Station, Operator,
    StationAssignment, DailyRecord, MonthlySummary
)

EXCEL_FILE_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "EOD_Output_082026_Formatted.xlsx"))

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
    # the user said: "use the sheet monthly and daily of this read the data"
    # the sheet names might be 'Monthly' and 'Daily' or 'monthly' and 'daily'
    sheet_names = xl.sheet_names
    print(f"Available sheets: {sheet_names}")
    
    monthly_sheet = next((s for s in sheet_names if s.lower() == 'monthly'), None)
    daily_sheet = next((s for s in sheet_names if s.lower() == 'daily'), None)
    
    monthly_df = xl.parse(monthly_sheet)
    daily_df = xl.parse(daily_sheet)

    print(f"Excel Sheets Loaded in {(datetime.now() - start_time).total_seconds():.2f}s:")
    print(f" - Monthly sheet: {len(monthly_df)} rows")
    print(f" - Daily sheet: {len(daily_df)} rows")

    async with AsyncSessionLocal() as db:
        print("\n--- Phase 2 Migration In Progress (Appending New Data) ---")

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
        
        # Check column names
        user_col = "UserID" if "UserID" in monthly_df.columns else "OPERATOR_ID" if "OPERATOR_ID" in monthly_df.columns else monthly_df.columns[2]
        daily_user_col = "OPERATOR_ID" if "OPERATOR_ID" in daily_df.columns else "UserID" if "UserID" in daily_df.columns else daily_df.columns[2]
        
        for idx, row in monthly_df.iterrows():
            code = str(row[user_col]).strip()
            name = str(row["OperatorName"]).strip() if pd.notna(row.get("OperatorName")) else None
            operator_map[code] = name
        for idx, row in daily_df.iterrows():
            code = str(row[daily_user_col]).strip()
            name = str(row["OperatorName"]).strip() if pd.notna(row.get("OperatorName")) else None
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

        # 4. We skip DM insertion since they are already in the DB.
        # But we need their UUIDs for StationAssignments.
        from app.models import AdminUser
        dm_user_map = {}
        res = await db.execute(select(AdminUser))
        for dm in res.scalars():
            dm_user_map[dm.name] = dm.id
            dm_user_map[dm.dmid] = dm.id

        # 5. Build Station Assignments from Monthly sheet
        print("5. Migrating Station Assignments...")
        # Get existing assignments to avoid duplicates
        existing_assignments = set()
        res = await db.execute(select(StationAssignment.station_id, StationAssignment.effective_month))
        for row in res.all():
            existing_assignments.add((row[0], row[1]))

        assignment_dicts = []
        for idx, row in monthly_df.iterrows():
            month = int(row["EnrollMth"])
            station_id = str(row["StationID"]).strip()
            # If DistrictManger column exists
            dm_col = "DistrictManger" if "DistrictManger" in monthly_df.columns else "District Manager"
            dm_name = str(row.get(dm_col, "")).strip()
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
            await db.execute(insert(StationAssignment), assignment_dicts)
            await db.commit()
        print(f"   [OK] {len(assignment_dicts)} New Station Assignments populated.")

        # 6. Insert Monthly Summaries
        print(f"6. Migrating Monthly Summaries ({len(monthly_df)} records)...")
        monthly_dicts = []
        for idx, row in monthly_df.iterrows():
            monthly_dicts.append({
                "enroll_month": int(row["EnrollMth"]),
                "station_id": str(row["StationID"]).strip(),
                "operator_code": str(row[user_col]).strip(),
                "total_enrollment": int(row["Total Enroll"]),
                "total_amount": Decimal(str(row["Amount to be Collect"])),
                "bmu_100": int(row.get("BMU @ 100", 0)),
                "dmu_50": int(row.get("DMU @ 50", 0)),
                "mbu_0": int(row.get("MBU @ 0", row.get("MBU @", 0))),
                "mbu_100": int(row.get("MBU @ 100", 0)),
                "new_0": int(row.get("NEW @ 0", row.get("NEW @", 0))),
                "bmu_125": int(row.get("BMU @ 125", 0)),
                "dmu_75": int(row.get("DMU @ 75", 0)),
                "mbu_125": int(row.get("MBU @ 125", 0))
            })
        
        # Depending on if there's an existing constraint, we might need to be careful.
        # MonthlySummary doesn't have unique constraint on (station, operator, month) but logically it shouldn't duplicate.
        # We will just insert them for now as it's a new month.
        if monthly_dicts:
            await db.execute(insert(MonthlySummary), monthly_dicts)
            await db.commit()
        print(f"   [OK] {len(monthly_dicts)} Monthly Summary records migrated.")

        # 7. Insert Daily Records
        print(f"7. Migrating Daily Records ({len(daily_df)} records)...")
        daily_dicts = []
        chunk_size = 5000
        total_inserted = 0

        for idx, row in daily_df.iterrows():
            daily_dicts.append({
                "enroll_date": parse_date(row["EnrollDT"]),
                "station_id": str(row["StationID"]).strip(),
                "operator_code": str(row[daily_user_col]).strip(),
                "total_enrollment": int(row["Total Enrollment"]),
                "total_amount": Decimal(str(row["Total amount"])),
                "bmu_100": int(row.get("BMU @ 100", 0)),
                "dmu_50": int(row.get("DMU @ 50", 0)),
                "mbu_0": int(row.get("MBU @ 0", row.get("MBU @", 0))),
                "mbu_100": int(row.get("MBU @ 100", 0)),
                "new_0": int(row.get("NEW @ 0", row.get("NEW @", 0))),
                "bmu_125": int(row.get("BMU @ 125", 0)),
                "dmu_75": int(row.get("DMU @ 75", 0)),
                "mbu_125": int(row.get("MBU @ 125", 0))
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
        
        total_time = (datetime.now() - start_time).total_seconds()
        print(f"\nSUCCESS: Migration Completed in {total_time:.2f} seconds!")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(run_migration())
