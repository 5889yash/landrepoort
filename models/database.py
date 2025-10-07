from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy import create_engine
from pathlib import Path

Base = declarative_base()

# Create data directory if it doesn't exist
DATA_DIR = Path("data")
DATA_DIR.mkdir(exist_ok=True)

# Database paths
DB_NAME = "farmer_land_records.db"
DB_PATH = DATA_DIR / DB_NAME

# Database setup
DATABASE_URL = f"sqlite:///{DB_PATH}"
engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)