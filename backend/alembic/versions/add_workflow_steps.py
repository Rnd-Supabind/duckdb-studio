"""Add steps column to workflows

Revision ID: add_workflow_steps
Create Date: 2025-12-02

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = 'add_workflow_steps'
down_revision = 'add_integrations'

def upgrade():
    op.add_column('workflows', sa.Column('steps', sa.JSON(), nullable=True))

def downgrade():
    op.drop_column('workflows', 'steps')
