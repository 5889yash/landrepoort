from sqlalchemy import Column, Integer, String, DateTime, Float, ForeignKey
from models.database import Base
from datetime import datetime

class LandRecord(Base):
    __tablename__ = 'land_records'

    id = Column(Integer, primary_key=True)
    farmer_id = Column(Integer, ForeignKey('farmers.id'))
    sr_no = Column(String)
    owner_id = Column(Integer)
    owner_name = Column(String)
    revenue_village_id = Column(Integer)
    village_name = Column(String)
    city_name = Column(String)
    district_name = Column(String)
    area_type = Column(String)
    owner_area = Column(String) # Changed to String to match API data
    land_owner_area_k = Column(Float)
    land_owner_area_m = Column(Float)
    land_owner_area_sarsai = Column(Float)
    owner_type = Column(String)
    khewat_no = Column(String)
    khasra_no = Column(String)
    period = Column(String)
    type = Column(String)
    kanal = Column(Float)
    marle = Column(Float)
    sarsai = Column(Float)
    mapped_area = Column(Float)
    license_id = Column(Integer)
    verify_status = Column(Integer)
    kanal1 = Column(Float)
    marle1 = Column(Float)
    sarsai1 = Column(Float)
    commodity_id = Column(Integer)
    min_land = Column(Float)
    auction = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<LandRecord(id='{self.id}', sr_no='{self.sr_no}')>"