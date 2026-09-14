from pydantic import BaseModel, field_validator, model_validator
from datetime import date, timedelta
from typing import Literal, Optional

MAX_PRICE = 10_000.0

# Text length boundaries, enforced on the backend as well as the UI.
MAX_DISPLAY_NAME = 40
MAX_BIO = 300
MAX_TITLE = 80
MAX_DESCRIPTION = 500
MAX_MESSAGE = 1000
MAX_REVIEW_COMMENT = 500
MAX_REPORT_DETAILS = 500

# Flexibility window (in days) applied when filtering listings by date.
FLEXIBILITY_DAYS: dict[str, int] = {
    "exact": 0,
    "week": 7,
    "month": 30,
}


class ListingCreate(BaseModel):
    kind: Literal["carry", "need"]
    needs_purchase: bool = False
    origin_city: str
    origin_country: str
    dest_city: str
    dest_country: str
    title: str
    description: Optional[str] = None
    price: Optional[float] = None
    currency: str = "USD"
    depart_date: Optional[date] = None
    arrive_date: Optional[date] = None
    accepts_multiple: bool = False
    date_flexibility: Literal["exact", "week", "month"] = "exact"

    @field_validator("price")
    @classmethod
    def validate_price(cls, v):
        if v is not None:
            if v < 0:
                raise ValueError("Price cannot be negative")
            if v > MAX_PRICE:
                raise ValueError(f"Price cannot exceed {MAX_PRICE:,.0f}")
        return v

    @field_validator("origin_city", "dest_city", "origin_country", "dest_country", "title")
    @classmethod
    def validate_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError("Field cannot be empty")
        return v.strip()

    @field_validator("title")
    @classmethod
    def validate_title_length(cls, v):
        if len(v) > MAX_TITLE:
            raise ValueError(f"Title cannot exceed {MAX_TITLE} characters")
        return v

    @field_validator("description")
    @classmethod
    def validate_description_length(cls, v):
        if v is not None and len(v) > MAX_DESCRIPTION:
            raise ValueError(f"Description cannot exceed {MAX_DESCRIPTION} characters")
        return v

    @model_validator(mode="after")
    def validate_dates(self):
        if self.arrive_date and self.depart_date:
            if self.arrive_date < self.depart_date:
                raise ValueError("Arrival date cannot be before departure date")
        return self


class MessageCreate(BaseModel):
    thread_id: str
    body: str

    @field_validator("body")
    @classmethod
    def validate_body(cls, v):
        if not v or not v.strip():
            raise ValueError("Message cannot be empty")
        if len(v) > MAX_MESSAGE:
            raise ValueError(f"Message cannot exceed {MAX_MESSAGE} characters")
        return v


class ReviewCreate(BaseModel):
    completed_deal_id: str
    reviewee_id: str
    rating: int
    comment: str = ""

    @field_validator("rating")
    @classmethod
    def validate_rating(cls, v):
        if not (1 <= v <= 5):
            raise ValueError("Rating must be between 1 and 5")
        return v

    @field_validator("comment")
    @classmethod
    def validate_comment(cls, v):
        # Allow empty (no comment) but still cap length. Normalize empty to "".
        if v is None:
            return ""
        if len(v) > MAX_REVIEW_COMMENT:
            raise ValueError(f"Comment cannot exceed {MAX_REVIEW_COMMENT} characters")
        return v


class HandoverCodeSubmit(BaseModel):
    thread_id: str
    code: str

    @field_validator("code")
    @classmethod
    def validate_code(cls, v):
        v = (v or "").strip()
        if not v:
            raise ValueError("Code cannot be empty")
        return v


class ReportCreate(BaseModel):
    target_user_id: Optional[str] = None
    target_listing_id: Optional[str] = None
    reason: str
    details: str

    @field_validator("details")
    @classmethod
    def validate_details(cls, v):
        if len(v) > MAX_REPORT_DETAILS:
            raise ValueError(f"Details cannot exceed {MAX_REPORT_DETAILS} characters")
        return v


class ProfileUpdate(BaseModel):
    display_name: Optional[str] = None
    bio: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    avatar_url: Optional[str] = None

    @field_validator("display_name")
    @classmethod
    def validate_display_name(cls, v):
        if v is not None and len(v) > MAX_DISPLAY_NAME:
            raise ValueError(f"Display name cannot exceed {MAX_DISPLAY_NAME} characters")
        return v

    @field_validator("bio")
    @classmethod
    def validate_bio(cls, v):
        if v is not None and len(v) > MAX_BIO:
            raise ValueError(f"Bio cannot exceed {MAX_BIO} characters")
        return v


def dates_overlap(
    date_a: Optional[date],
    flex_a: int,
    date_b: Optional[date],
    flex_b: int,
) -> bool:
    """Do the two listing date windows overlap? Either null date = no constraint."""
    if date_a is None or date_b is None:
        return True
    lo_a = date_a - timedelta(days=flex_a)
    hi_a = date_a + timedelta(days=flex_a)
    lo_b = date_b - timedelta(days=flex_b)
    hi_b = date_b + timedelta(days=flex_b)
    return lo_a <= hi_b and lo_b <= hi_a


def flexibility_window_days(value: Optional[str]) -> int:
    """Days of slack a listing's date gets when filtered by depart_from/depart_to."""
    if not value:
        return 0
    return FLEXIBILITY_DAYS.get(value, 0)


def date_falls_in_window(
    listing_date: Optional[date],
    depart_from: Optional[date],
    depart_to: Optional[date],
    flexibility_days: int,
) -> bool:
    """Does `listing_date` satisfy the [depart_from, depart_to] window,
    expanded by `flexibility_days` on both sides?

    Listings with no date (NULL) are treated as always matching — they surface
    under any time filter (sorted to the bottom by the caller)."""
    if listing_date is None:
        return True
    lo = depart_from - timedelta(days=flexibility_days) if depart_from else None
    hi = depart_to + timedelta(days=flexibility_days) if depart_to else None
    if lo and listing_date < lo:
        return False
    if hi and listing_date > hi:
        return False
    return True
