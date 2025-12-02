from app.db.database import SessionLocal, engine
from sqlalchemy import text

def update_schema():
    print("Updating workflow schema...")
    with engine.connect() as conn:
        # Add source_type
        try:
            conn.execute(text("ALTER TABLE workflows ADD COLUMN source_type VARCHAR(50) DEFAULT 'none'"))
            print("Added source_type")
        except Exception as e:
            print(f"source_type might already exist: {e}")

        # Add source_config
        try:
            conn.execute(text("ALTER TABLE workflows ADD COLUMN source_config TEXT DEFAULT '{}'"))
            print("Added source_config")
        except Exception as e:
            print(f"source_config might already exist: {e}")

        # Add destination_type
        try:
            conn.execute(text("ALTER TABLE workflows ADD COLUMN destination_type VARCHAR(50) DEFAULT 'storage'"))
            print("Added destination_type")
        except Exception as e:
            print(f"destination_type might already exist: {e}")

        # Add destination_config
        try:
            conn.execute(text("ALTER TABLE workflows ADD COLUMN destination_config TEXT DEFAULT '{}'"))
            print("Added destination_config")
        except Exception as e:
            print(f"destination_config might already exist: {e}")

        # Add template_id
        try:
            conn.execute(text("ALTER TABLE workflows ADD COLUMN template_id INTEGER REFERENCES query_templates(id)"))
            print("Added template_id")
        except Exception as e:
            print(f"template_id might already exist: {e}")
            
        conn.commit()
    print("Schema update complete.")

if __name__ == "__main__":
    update_schema()
