from pydantic import BaseModel, field_validator, model_validator
from datetime import date
from typing import Literal, Optional

MAX_PRICE = 10_000.0
MAX_CAPACITY_KG = 3_000.0

class ListingCreate(BaseModel):
    kind: Literal["trip", "request", "delivery"]
    origin_city: str
    origin_country: str
    dest_city: str
    dest_country: str
    title: str
    description: Optional[str] = None
    price: Optional[float] = None
    currency: str = "USD"
    capacity_kg: Optional[float] = None
    depart_date: Optional[date] = None
    arrive_date: Optional[date] = None
    accepts_multiple: bool = False
    date_flexibility: Literal["exact", "3days", "1week", "2weeks"] = "exact"

    @field_validator("price")
    @classmethod
    def validate_price(cls, v):
        if v is not None:
            if v < 0:
                raise ValueError("Price cannot be negative")
            if v > MAX_PRICE:
                raise ValueError(f"Price cannot exceed {MAX_PRICE:,.0f}")
        return v

    @field_validator("capacity_kg")
    @classmethod
    def validate_capacity(cls, v):
        if v is not None:
            if v <= 0:
                raise ValueError("Capacity must be greater than 0")
            if v > MAX_CAPACITY_KG:
                raise ValueError(f"Capacity cannot exceed {MAX_CAPACITY_KG:,.0f} kg")
        return v

    @field_validator("origin_city", "dest_city", "origin_country", "dest_country", "title")
    @classmethod
    def validate_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError("Field cannot be empty")
        return v.strip()

    @model_validator(mode="after")
    def validate_dates(self):
        if self.arrive_date and self.depart_date:
            if self.arrive_date < self.depart_date:
                raise ValueError("Arrival date cannot be before departure date")
        return self


class MessageCreate(BaseModel):
    thread_id: str
    body: str


class ReviewCreate(BaseModel):
    listing_id: str
    reviewee_id: str
    rating: int
    comment: str


class ReportCreate(BaseModel):
    target_user_id: Optional[str] = None
    target_listing_id: Optional[str] = None
    reason: str
    details: str


class ProfileUpdate(BaseModel):
    display_name: Optional[str] = None
    bio: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
