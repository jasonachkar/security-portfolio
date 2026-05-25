"""Initial compliance tables.

Revision ID: 0001
Revises:
Create Date: 2024-01-10 16:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '0001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Compliance frameworks table
    op.create_table(
        'compliance_frameworks',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('version', sa.String(length=50), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )

    # Compliance controls table
    op.create_table(
        'compliance_controls',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('framework_id', sa.Integer(), nullable=False),
        sa.Column('control_id', sa.String(length=50), nullable=False),
        sa.Column('title', sa.String(length=512), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('category', sa.String(length=100), nullable=True),
        sa.Column('severity', sa.String(length=20), nullable=True),
        sa.Column('implementation_guidance', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['framework_id'], ['compliance_frameworks.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_compliance_controls_framework_id'), 'compliance_controls', ['framework_id'])
    op.create_index(op.f('ix_compliance_controls_control_id'), 'compliance_controls', ['control_id'])

    # Compliance reports table
    op.create_table(
        'compliance_reports',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('framework_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=512), nullable=False),
        sa.Column('report_period_start', sa.DateTime(timezone=True), nullable=False),
        sa.Column('report_period_end', sa.DateTime(timezone=True), nullable=False),
        sa.Column('generated_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('generated_by', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('file_path', sa.String(length=512), nullable=True),
        sa.Column('summary', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.ForeignKeyConstraint(['framework_id'], ['compliance_frameworks.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_compliance_reports_framework_id'), 'compliance_reports', ['framework_id'])

    # Finding control mappings table
    op.create_table(
        'finding_control_mappings',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('source_service', sa.String(length=50), nullable=False),
        sa.Column('source_finding_id', sa.Integer(), nullable=False),
        sa.Column('control_id', sa.Integer(), nullable=False),
        sa.Column('compliance_status', sa.String(length=20), nullable=False),
        sa.Column('mapped_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('mapped_by', sa.String(length=50), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['control_id'], ['compliance_controls.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_finding_control_mappings_source_service'), 'finding_control_mappings', ['source_service'])
    op.create_index(op.f('ix_finding_control_mappings_control_id'), 'finding_control_mappings', ['control_id'])


def downgrade() -> None:
    op.drop_table('finding_control_mappings')
    op.drop_table('compliance_reports')
    op.drop_table('compliance_controls')
    op.drop_table('compliance_frameworks')
