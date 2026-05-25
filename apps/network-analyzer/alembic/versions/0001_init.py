"""init

Revision ID: 0001_init
Revises:
Create Date: 2026-01-07
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "0001_init"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "flows",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("first_seen", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_seen", sa.DateTime(timezone=True), nullable=False),
        sa.Column("src_ip", sa.String(length=64), nullable=False),
        sa.Column("dst_ip", sa.String(length=64), nullable=False),
        sa.Column("protocol", sa.String(length=32), nullable=False),
        sa.Column("dst_port", sa.Integer(), nullable=True),
        sa.Column("packets", sa.Integer(), nullable=False),
        sa.Column("bytes", sa.Integer(), nullable=False),
    )
    op.create_index("ix_flows_src_dst", "flows", ["src_ip", "dst_ip"])

    op.create_table(
        "anomalies",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("kind", sa.String(length=64), nullable=False),
        sa.Column("severity", sa.String(length=16), nullable=False),
        sa.Column("summary", sa.String(length=512), nullable=False),
        sa.Column("details", sa.Text(), nullable=True),
        sa.Column("src_ip", sa.String(length=64), nullable=True),
        sa.Column("dst_ip", sa.String(length=64), nullable=True),
        sa.Column("dst_port", sa.Integer(), nullable=True),
        sa.Column("score", sa.Float(), nullable=True),
    )
    op.create_index("ix_anomalies_created_at", "anomalies", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_anomalies_created_at", table_name="anomalies")
    op.drop_table("anomalies")
    op.drop_index("ix_flows_src_dst", table_name="flows")
    op.drop_table("flows")
