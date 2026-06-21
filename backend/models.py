from pydantic import BaseModel
from datetime import date
from typing import Literal, Optional

class ListingCreate(BaseModel):
  kind: Literal["trip", "request", "delivery"]
  origin_city: str
  origin_country: str
  dest_city: str
  dest_country: str
  depart_date: date
  arrive_date: date
  title: str
  description: str
  price: float
  currency: str
  capacity_kg: float

class MessageCreate(BaseModel):
  thread_id: str
  body: str

class ReviewCreate(BaseModel):
  listing_id: str
  reviewee_id: str
  rating: int
  comment: str

class ReportCreate(BaseModel):
  target_user_id: Optional[str]
  target_listing_id: Optional[str]
  reason: str
  details: str

class ProfileUpdate(BaseModel):
  display_name: Optional[str]
  bio: Optional[str]
  city: Optional[str]
  country: Optional[str]