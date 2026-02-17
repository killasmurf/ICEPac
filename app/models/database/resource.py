"""Resource and Supplier database models."""
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Integer, Numeric, String, Text

from app.core.database import Base


class Resource(Base):
    """Resource model - maps to legacy tblResource.

    Resources are items that can be assigned to WBS tasks
    with associated costs and units.
    """

    __tablename__ = "resources"

    id = Column(Integer, primary_key=True, index=True)
    resource_code = Column(String(50), unique=True, nullable=False, index=True)
    description = Column(String(500), nullable=False)
    eoc = Column(String(50), nullable=True)  # Element of Cost
    cost = Column(Numeric(18, 2), default=0, nullable=False)
    units = Column(String(50), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    def __repr__(self):
        return f"<Resource(id={self.id}, code='{self.resource_code}')>"


class Supplier(Base):
    """Supplier model - maps to legacy tblSupplier.

    Suppliers are external vendors that can be associated
    with resource assignments.
    """

    __tablename__ = "suppliers"

    id = Column(Integer, primary_key=True, index=True)
    supplier_code = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    contact = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    email = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    def __repr__(self):
        return (
            f"<Supplier(id={self.id}, code='{self.supplier_code}', name='{self.name}')>"
        )
