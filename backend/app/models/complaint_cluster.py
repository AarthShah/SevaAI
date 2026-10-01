"""
Complaint Cluster & Membership Models
Enables multi-complaint grouping under shared civic incidents without destructive deletion.
"""

from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from ..database.session import Base

class ComplaintCluster(Base):
    __tablename__ = "complaint_clusters"

    id = Column(String(50), primary_key=True, index=True)  # e.g., CL-0017
    issue_type = Column(String(80), nullable=False)
    category = Column(String(80), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    complaint_count = Column(Integer, default=1)
    center_lat = Column(Float, nullable=True)
    center_lon = Column(Float, nullable=True)
    location_summary = Column(String(255), nullable=True)
    radius_meters = Column(Float, default=50.0)
    severity = Column(String(20), default="MEDIUM")
    
    # Status: ACTIVE, RESOLVED
    status = Column(String(30), default="ACTIVE")
    first_reported = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    last_reported = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    members = relationship("ComplaintClusterMember", back_populates="cluster", cascade="all, delete-orphan")
    department = relationship("Department")


class ComplaintClusterMember(Base):
    __tablename__ = "complaint_cluster_members"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    cluster_id = Column(String(50), ForeignKey("complaint_clusters.id"), nullable=False, index=True)
    complaint_id = Column(String(30), ForeignKey("complaints.id"), nullable=False, index=True)
    similarity_score = Column(Float, default=0.90)
    added_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    cluster = relationship("ComplaintCluster", back_populates="members")
    complaint = relationship("Complaint", backref="cluster_membership")
