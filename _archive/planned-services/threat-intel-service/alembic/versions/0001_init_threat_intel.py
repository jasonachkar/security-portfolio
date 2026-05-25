"""Initial threat intelligence tables.

Revision ID: 0001
Revises:
Create Date: 2024-01-10 12:00:00.000000
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
    # CVE entries table
    op.create_table(
        'cve_entries',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('cve_id', sa.String(length=20), nullable=False),
        sa.Column('published_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_modified', sa.DateTime(timezone=True), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('cvss_v3_score', sa.Float(), nullable=True),
        sa.Column('cvss_v3_vector', sa.String(length=100), nullable=True),
        sa.Column('severity', sa.String(length=20), nullable=True),
        sa.Column('cwe_ids', postgresql.ARRAY(sa.String()), nullable=True),
        sa.Column('references', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_cve_entries_cve_id'), 'cve_entries', ['cve_id'], unique=True)

    # MITRE ATT&CK techniques table
    op.create_table(
        'mitre_attack_techniques',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('technique_id', sa.String(length=20), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('tactics', postgresql.ARRAY(sa.String()), nullable=True),
        sa.Column('platforms', postgresql.ARRAY(sa.String()), nullable=True),
        sa.Column('data_sources', postgresql.ARRAY(sa.String()), nullable=True),
        sa.Column('detection', sa.Text(), nullable=True),
        sa.Column('mitigations', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_mitre_attack_techniques_technique_id'), 'mitre_attack_techniques', ['technique_id'], unique=True)

    # Threat feeds table
    op.create_table(
        'threat_feeds',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('feed_type', sa.String(length=50), nullable=False),
        sa.Column('url', sa.String(length=512), nullable=True),
        sa.Column('enabled', sa.Boolean(), nullable=False),
        sa.Column('last_updated', sa.DateTime(timezone=True), nullable=True),
        sa.Column('update_frequency', sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )

    # Threat indicators table
    op.create_table(
        'threat_indicators',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('feed_id', sa.Integer(), nullable=False),
        sa.Column('indicator_type', sa.String(length=50), nullable=False),
        sa.Column('value', sa.String(length=512), nullable=False),
        sa.Column('confidence', sa.Integer(), nullable=False),
        sa.Column('severity', sa.String(length=20), nullable=False),
        sa.Column('tags', postgresql.ARRAY(sa.String()), nullable=True),
        sa.Column('indicator_metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('first_seen', sa.DateTime(timezone=True), nullable=False),
        sa.Column('last_seen', sa.DateTime(timezone=True), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['feed_id'], ['threat_feeds.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_threat_indicators_feed_id'), 'threat_indicators', ['feed_id'])
    op.create_index(op.f('ix_threat_indicators_indicator_type'), 'threat_indicators', ['indicator_type'])
    op.create_index(op.f('ix_threat_indicators_value'), 'threat_indicators', ['value'])

    # Finding enrichment table
    op.create_table(
        'finding_enrichments',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('source_service', sa.String(length=50), nullable=False),
        sa.Column('source_finding_id', sa.Integer(), nullable=False),
        sa.Column('cve_ids', postgresql.ARRAY(sa.String()), nullable=True),
        sa.Column('mitre_techniques', postgresql.ARRAY(sa.String()), nullable=True),
        sa.Column('matched_indicators', postgresql.ARRAY(sa.Integer()), nullable=True),
        sa.Column('enriched_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('enrichment_metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('source_service', 'source_finding_id', name='_source_finding_uc')
    )
    op.create_index(op.f('ix_finding_enrichments_source_service'), 'finding_enrichments', ['source_service'])
    op.create_index(op.f('ix_finding_enrichments_source_finding_id'), 'finding_enrichments', ['source_finding_id'])


def downgrade() -> None:
    op.drop_table('finding_enrichments')
    op.drop_table('threat_indicators')
    op.drop_table('threat_feeds')
    op.drop_table('mitre_attack_techniques')
    op.drop_table('cve_entries')
