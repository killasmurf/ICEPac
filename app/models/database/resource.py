"""Resource and Supplier database models."""
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Numeric, Text

from app.core.database import Base


class Resource(Base):
    """Resource model - maps to legacy tblResource."""

    __tablename__ = "resources"

    id = Column(Integer, primary_key=True, index=True)
    resource_code = Column(String(50), unique=True, nullable=False, index=True)
    description = Column(String(500), nullable=False)
    eoc = Column(String(50), nullable=True)  # Element of Cost
    cost = Column(Numeric(18, 2), default=0)
    units = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<Resource(id={self.id}, code='{self.resource_code}')>"


class Supplier(Base):
    """Supplier model - maps to legacy tblSupplier."""

    __tablename__ = "suppliers"

    id = Column(Integer, primary_key=True, index=True)
    supplier_code = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    contact = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    email = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<Supplier(id={self.id}, code='{self.supplier_code}', name='{self.name}')>"
