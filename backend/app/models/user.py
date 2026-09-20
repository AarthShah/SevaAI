"""
User Model
"""

from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from ..database.session import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), default="citizen", nullable=False)  # citizen, authority, admin
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    complaints = relationship("Complaint", back_populates="citizen", foreign_keys="Complaint.citizen_id")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
