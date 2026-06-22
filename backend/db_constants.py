class Tables:
    PROFILES = "profiles"
    LISTINGS = "listings"
    MESSAGES = "messages"


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


class ListingStatus:
    OPEN = "open"
    CANCELLED = "cancelled"
