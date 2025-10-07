from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from models.database import Base

class FarmerBankDetail(Base):
    __tablename__ = 'farmer_bank_details'

    id = Column(Integer, primary_key=True)
    farmer_id = Column(Integer, ForeignKey('farmers.id'), unique=True, index=True)
    bank_id = Column(Integer)
    account_holder_name = Column(String(200))
    account_no_encrypted = Column(String(200))
    ifsc_code = Column(String(50))
    branch_name = Column(String(200))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    farmer = relationship("Farmer", back_populates="bank_detail")

    def __repr__(self):
        return f"<FarmerBankDetail(id='{self.id}', farmer_id='{self.farmer_id}', bank_name='{self.bank_id}')>"

class Farmer(Base):
    __tablename__ = 'farmers'

    id = Column(Integer, primary_key=True)
    farmer_id = Column(Integer, index=True) # Changed to Integer to match ForeignKey in FarmerBankDetail
    farmer_name = Column(String(200))
    father_name = Column(String(200))
    grandfather_name = Column(String(200))
    mobile_number = Column(String(15), nullable=True, index=True)
    aadhar_number = Column(String(12), nullable=True, index=True)
    village_name = Column(String(200))
    district_name = Column(String(100))
    city_name = Column(String(100))
    owner_area = Column(String(50), nullable=True) # Changed to String to match fetch_farmer_data.py
    final_owner_area = Column(String(50), nullable=True) # Changed to String to match fetch_farmer_data.py
    update_owner_area = Column(String(50), nullable=True) # Changed to String to match fetch_farmer_data.py
    owner_type = Column(Integer) # Changed to Integer to match fetch_farmer_data.py
    verify_status = Column(String(10)) # Changed to String to match fetch_farmer_data.py
    auction = Column(Integer)
    source_api = Column(String(100))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship to bank details
    bank_detail = relationship("FarmerBankDetail", back_populates="farmer", uselist=False)

    def __repr__(self):
        return f"<Farmer(id='{self.id}', farmer_name='{self.farmer_name}')>"
