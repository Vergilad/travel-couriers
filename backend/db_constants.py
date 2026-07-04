class Tables:
    PROFILES = "profiles"
    LISTINGS = "listings"
    MESSAGES = "messages"
    COMPLETED_DEALS = "completed_deals"


class ProfileFields:
    ID = "id"
    DISPLAY_NAME = "display_name"
    AVATAR_URL = "avatar_url"
    BIO = "bio"
    CITY = "city"
    COUNTRY = "country"
    CREATED_AT = "created_at"


class ListingFields:
    ID = "id"
    KIND = "kind"
    ORIGIN_CITY = "origin_city"
    DEST_CITY = "dest_city"
    STATUS = "status"
    OWNER_ID = "owner_id"
    CREATED_AT = "created_at"
    DEPART_DATE = "depart_date"
    ARRIVE_DATE = "arrive_date"
    DESCRIPTION = "description"


class MessageFields:
    ID = "id"
    READ_AT = "read_at"
    SENDER_ID = "sender_id"
    IS_SYSTEM = "is_system"


class ListingStatus:
    OPEN = "open"
    MATCHED = "matched"
    DEALING = "dealing"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
