"""
Department Model
"""

from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from ..database.session import Base

class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(120), unique=True, nullable=False)
    category = Column(String(80), nullable=False)
    location = Column(String(200), nullable=True)
    contact = Column(String(50), nullable=True)
    email = Column(String(100), nullable=True)
    sla_hours = Column(Integer, default=48)

    complaints = relationship("Complaint", back_populates="department")
