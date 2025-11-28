"""
Database initialization script.
Run this to create all tables in the MySQL database.
"""
from app.models.models import Base
from app.db.database import engine

def init_db():
    """Create all database tables"""
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("Database tables created successfully!")

if __name__ == "__main__":
    init_db()
