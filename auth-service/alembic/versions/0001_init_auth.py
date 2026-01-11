"""Initial migration - create all tables and seed data

Revision ID: 0001_init_auth
Revises:
Create Date: 2026-01-09

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

# revision identifiers, used by Alembic.
revision: str = '0001_init_auth'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create roles table
    op.create_table(
        'roles',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('name', sa.String(length=50), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name'),
    )
    op.create_index(op.f('ix_roles_name'), 'roles', ['name'], unique=False)

    # Create permissions table
    op.create_table(
        'permissions',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('resource', sa.String(length=100), nullable=False),
        sa.Column('action', sa.String(length=50), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('resource', 'action', name='_resource_action_uc'),
    )

    # Create role_permissions table
    op.create_table(
        'role_permissions',
        sa.Column('role_id', sa.Integer(), nullable=False),
        sa.Column('permission_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['permission_id'], ['permissions.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['role_id'], ['roles.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('role_id', 'permission_id'),
    )

    # Create users table
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('username', sa.String(length=100), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('hashed_password', sa.String(length=255), nullable=False),
        sa.Column('full_name', sa.String(length=255), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('last_login', sa.DateTime(timezone=True), nullable=True),
        sa.Column('role_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['role_id'], ['roles.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email'),
        sa.UniqueConstraint('username'),
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=False)
    op.create_index(op.f('ix_users_username'), 'users', ['username'], unique=False)

    # Create sessions table
    op.create_table(
        'sessions',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('token_jti', sa.String(length=255), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('revoked', sa.Boolean(), nullable=False),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('user_agent', sa.String(length=512), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('token_jti'),
    )
    op.create_index(op.f('ix_sessions_token_jti'), 'sessions', ['token_jti'], unique=False)
    op.create_index(op.f('ix_sessions_user_id'), 'sessions', ['user_id'], unique=False)

    # Create audit_logs table
    op.create_table(
        'audit_logs',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('action', sa.String(length=100), nullable=False),
        sa.Column('resource_type', sa.String(length=100), nullable=True),
        sa.Column('resource_id', sa.Integer(), nullable=True),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=False),
        sa.Column('details', JSONB, nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_audit_logs_action'), 'audit_logs', ['action'], unique=False)
    op.create_index(op.f('ix_audit_logs_timestamp'), 'audit_logs', ['timestamp'], unique=False)
    op.create_index(op.f('ix_audit_logs_user_id'), 'audit_logs', ['user_id'], unique=False)

    # Seed data - Roles
    op.execute("""
        INSERT INTO roles (id, name, description, created_at)
        VALUES
            (1, 'Admin', 'Full access to all resources and actions', NOW()),
            (2, 'Analyst', 'Can create and view scans, assessments, and alerts', NOW()),
            (3, 'Auditor', 'Read-only access to all resources including audit logs', NOW())
    """)

    # Seed data - Permissions
    permissions_table = sa.table('permissions',
        sa.column('id', sa.Integer),
        sa.column('resource', sa.String),
        sa.column('action', sa.String),
    )

    # Admin permissions (wildcard)
    op.bulk_insert(permissions_table, [
        {'id': 1, 'resource': '*', 'action': '*'},  # Admin wildcard
    ])

    # Analyst permissions
    analyst_perms = [
        {'resource': 'scans', 'action': 'create'},
        {'resource': 'scans', 'action': 'read'},
        {'resource': 'assessments', 'action': 'create'},
        {'resource': 'assessments', 'action': 'read'},
        {'resource': 'alerts', 'action': 'read'},
        {'resource': 'alerts', 'action': 'update'},
        {'resource': 'network', 'action': 'read'},
        {'resource': 'intel', 'action': 'read'},
        {'resource': 'incidents', 'action': 'read'},
        {'resource': 'incidents', 'action': 'update'},
    ]

    for idx, perm in enumerate(analyst_perms, start=2):
        op.execute(
            permissions_table.insert().values(
                id=idx,
                resource=perm['resource'],
                action=perm['action']
            )
        )

    # Auditor permissions (read all)
    auditor_perms = [
        {'resource': '*', 'action': 'read'},
        {'resource': 'audit', 'action': 'read'},
    ]

    for idx, perm in enumerate(auditor_perms, start=12):
        op.execute(
            permissions_table.insert().values(
                id=idx,
                resource=perm['resource'],
                action=perm['action']
            )
        )

    # Seed data - Role Permissions
    role_permissions_table = sa.table('role_permissions',
        sa.column('role_id', sa.Integer),
        sa.column('permission_id', sa.Integer),
    )

    # Admin role (id=1) gets wildcard permission (id=1)
    op.bulk_insert(role_permissions_table, [{'role_id': 1, 'permission_id': 1}])

    # Analyst role (id=2) gets permissions 2-11
    for perm_id in range(2, 12):
        op.execute(
            role_permissions_table.insert().values(role_id=2, permission_id=perm_id)
        )

    # Auditor role (id=3) gets permissions 12-13
    for perm_id in range(12, 14):
        op.execute(
            role_permissions_table.insert().values(role_id=3, permission_id=perm_id)
        )

    # Seed data - Default admin user
    # Pre-hashed password for 'changeme' using bcrypt
    # Generated with: bcrypt.hashpw(b'changeme', bcrypt.gensalt()).decode()
    hashed_password = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyVK.dK.8K6e'
    op.execute(f"""
        INSERT INTO users (id, username, email, hashed_password, full_name, is_active, created_at, role_id)
        VALUES (1, 'admin', 'admin@example.com', '{hashed_password}', 'System Administrator', TRUE, NOW(), 1)
    """)


def downgrade() -> None:
    op.drop_table('audit_logs')
    op.drop_table('sessions')
    op.drop_table('users')
    op.drop_table('role_permissions')
    op.drop_table('permissions')
    op.drop_table('roles')
