from app.db.database import SessionLocal, engine
from sqlalchemy import text

def migrate_workflow_steps():
    print("Creating workflow_execution_steps table...")
    with engine.connect() as conn:
        # Create workflow_execution_steps table
        try:
            conn.execute(text("""
                CREATE TABLE workflow_execution_steps (
                    id INTEGER PRIMARY KEY AUTO_INCREMENT,
                    execution_id INTEGER NOT NULL,
                    step_number INTEGER NOT NULL,
                    step_name VARCHAR(255) NOT NULL,
                    status VARCHAR(50) NOT NULL,
                    started_at DATETIME NOT NULL,
                    completed_at DATETIME,
                    error_message TEXT,
                    output_data TEXT,
                    FOREIGN KEY (execution_id) REFERENCES workflow_executions(id) ON DELETE CASCADE,
                    INDEX idx_execution_id (execution_id)
                )
            """))
            print("✓ Created workflow_execution_steps table")
        except Exception as e:
            print(f"workflow_execution_steps table might already exist: {e}")
        
        # Add Temporal fields to workflow_executions
        try:
            conn.execute(text("ALTER TABLE workflow_executions ADD COLUMN temporal_workflow_id VARCHAR(255)"))
            print("✓ Added temporal_workflow_id column")
        except Exception as e:
            print(f"temporal_workflow_id might already exist: {e}")
        
        try:
            conn.execute(text("ALTER TABLE workflow_executions ADD COLUMN temporal_run_id VARCHAR(255)"))
            print("✓ Added temporal_run_id column")
        except Exception as e:
            print(f"temporal_run_id might already exist: {e}")
        
        conn.commit()
    print("Migration complete!")

if __name__ == "__main__":
    migrate_workflow_steps()
