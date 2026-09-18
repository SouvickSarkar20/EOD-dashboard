"""initial_schema_with_supabase_2fa

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-09-18 14:58:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create admin_users table
    op.create_table(
        'admin_users',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('dmid', sa.String(length=50), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('email', sa.String(length=150), nullable=False),
        sa.Column('role', sa.Enum('ADMIN', 'DISTRICT_MANAGER', name='user_role'), nullable=False),
        sa.Column('status', sa.Enum('ACTIVE', 'INACTIVE', name='user_status'), nullable=False),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('supabase_user_id', sa.String(length=255), nullable=True),
        sa.Column('is_2fa_enabled', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('is_demo_creds', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('must_change_password', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('last_login_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('dmid'),
        sa.UniqueConstraint('email')
    )
    op.create_index(op.f('ix_admin_users_dmid'), 'admin_users', ['dmid'], unique=True)
    op.create_index(op.f('ix_admin_users_email'), 'admin_users', ['email'], unique=True)

    # 2. Create districts table
    op.create_table(
        'districts',
        sa.Column('district_id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('district_name', sa.String(length=100), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('district_id'),
        sa.UniqueConstraint('district_name')
    )
    op.create_index(op.f('ix_districts_district_name'), 'districts', ['district_name'], unique=True)

    # 3. Create stations table
    op.create_table(
        'stations',
        sa.Column('station_id', sa.String(length=50), nullable=False),
        sa.Column('station_name', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('station_id')
    )

    # 4. Create operators table
    op.create_table(
        'operators',
        sa.Column('operator_code', sa.String(length=50), nullable=False),
        sa.Column('operator_name', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('operator_code')
    )

    # 5. Create station_assignments table
    op.create_table(
        'station_assignments',
        sa.Column('assignment_id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('station_id', sa.String(length=50), nullable=False),
        sa.Column('dm_user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('district_id', sa.Integer(), nullable=False),
        sa.Column('effective_month', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['district_id'], ['districts.district_id'], ),
        sa.ForeignKeyConstraint(['dm_user_id'], ['admin_users.id'], ),
        sa.ForeignKeyConstraint(['station_id'], ['stations.station_id'], ),
        sa.PrimaryKeyConstraint('assignment_id'),
        sa.UniqueConstraint('station_id', 'effective_month', name='uq_station_effective_month')
    )
    op.create_index(op.f('ix_station_assignments_district_id'), 'station_assignments', ['district_id'], unique=False)
    op.create_index(op.f('ix_station_assignments_dm_user_id'), 'station_assignments', ['dm_user_id'], unique=False)
    op.create_index(op.f('ix_station_assignments_effective_month'), 'station_assignments', ['effective_month'], unique=False)
    op.create_index(op.f('ix_station_assignments_station_id'), 'station_assignments', ['station_id'], unique=False)

    # 6. Create daily_records table
    op.create_table(
        'daily_records',
        sa.Column('record_id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('enroll_date', sa.Date(), nullable=False),
        sa.Column('station_id', sa.String(length=50), nullable=False),
        sa.Column('operator_code', sa.String(length=50), nullable=False),
        sa.Column('total_enrollment', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('total_amount', sa.Numeric(precision=12, scale=2), nullable=False, server_default=sa.text('0.00')),
        sa.Column('bmu_100', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('dmu_50', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('mbu_0', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('mbu_100', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('new_0', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('bmu_125', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('dmu_75', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('mbu_125', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.ForeignKeyConstraint(['operator_code'], ['operators.operator_code'], ),
        sa.ForeignKeyConstraint(['station_id'], ['stations.station_id'], ),
        sa.PrimaryKeyConstraint('record_id'),
        sa.UniqueConstraint('station_id', 'operator_code', 'enroll_date', name='uq_station_operator_date')
    )
    op.create_index(op.f('ix_daily_records_enroll_date'), 'daily_records', ['enroll_date'], unique=False)
    op.create_index(op.f('ix_daily_records_operator_code'), 'daily_records', ['operator_code'], unique=False)
    op.create_index(op.f('ix_daily_records_station_id'), 'daily_records', ['station_id'], unique=False)
    op.create_index('ix_daily_operator_date', 'daily_records', ['operator_code', 'enroll_date'], unique=False)
    op.create_index('ix_daily_station_date', 'daily_records', ['station_id', 'enroll_date'], unique=False)

    # 7. Create monthly_summary table
    op.create_table(
        'monthly_summary',
        sa.Column('summary_id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('enroll_month', sa.Integer(), nullable=False),
        sa.Column('station_id', sa.String(length=50), nullable=False),
        sa.Column('operator_code', sa.String(length=50), nullable=False),
        sa.Column('total_enrollment', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('total_amount', sa.Numeric(precision=12, scale=2), nullable=False, server_default=sa.text('0.00')),
        sa.Column('bmu_100', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('dmu_50', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('mbu_0', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('mbu_100', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('new_0', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('bmu_125', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('dmu_75', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('mbu_125', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.ForeignKeyConstraint(['operator_code'], ['operators.operator_code'], ),
        sa.ForeignKeyConstraint(['station_id'], ['stations.station_id'], ),
        sa.PrimaryKeyConstraint('summary_id'),
        sa.UniqueConstraint('enroll_month', 'station_id', 'operator_code', name='uq_month_station_operator')
    )
    op.create_index(op.f('ix_monthly_summary_enroll_month'), 'monthly_summary', ['enroll_month'], unique=False)
    op.create_index(op.f('ix_monthly_summary_operator_code'), 'monthly_summary', ['operator_code'], unique=False)
    op.create_index(op.f('ix_monthly_summary_station_id'), 'monthly_summary', ['station_id'], unique=False)
    op.create_index('ix_monthly_operator_month', 'monthly_summary', ['operator_code', 'enroll_month'], unique=False)
    op.create_index('ix_monthly_station_month', 'monthly_summary', ['station_id', 'enroll_month'], unique=False)

    # 8. Create audit_logs table
    op.create_table(
        'audit_logs',
        sa.Column('log_id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('action', sa.String(length=100), nullable=False),
        sa.Column('resource_type', sa.String(length=50), nullable=True),
        sa.Column('resource_id', sa.String(length=100), nullable=True),
        sa.Column('details', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['user_id'], ['admin_users.id'], ),
        sa.PrimaryKeyConstraint('log_id')
    )
    op.create_index(op.f('ix_audit_logs_action'), 'audit_logs', ['action'], unique=False)
    op.create_index(op.f('ix_audit_logs_created_at'), 'audit_logs', ['created_at'], unique=False)
    op.create_index(op.f('ix_audit_logs_user_id'), 'audit_logs', ['user_id'], unique=False)


def downgrade() -> None:
    op.drop_table('audit_logs')
    op.drop_table('monthly_summary')
    op.drop_table('daily_records')
    op.drop_table('station_assignments')
    op.drop_table('operators')
    op.drop_table('stations')
    op.drop_table('districts')
    op.drop_table('admin_users')
    op.execute('DROP TYPE IF EXISTS user_role')
    op.execute('DROP TYPE IF EXISTS user_status')
