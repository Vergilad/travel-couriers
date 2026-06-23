export const DB = {
  TABLES: {
    PROFILES: 'profiles',
    MESSAGES: 'messages',
    THREADS: 'threads',
    THREAD_PARTICIPANTS: 'thread_participants',
    LISTINGS: 'listings',
    REVIEWS: 'reviews',
    PAYMENTS: 'payments',
  },
  FIELDS: {
    PROFILES: {
      ID: 'id',
      DISPLAY_NAME: 'display_name',
      AVATAR_URL: 'avatar_url',
      BIO: 'bio',
      CITY: 'city',
      COUNTRY: 'country',
      IS_BANNED: 'is_banned',
    },
    MESSAGES: {
      ID: 'id',
      THREAD_ID: 'thread_id',
      READ_AT: 'read_at',
      SENDER_ID: 'sender_id',
      BODY: 'body',
    },
    THREAD_PARTICIPANTS: {
      THREAD_ID: 'thread_id',
      USER_ID: 'user_id',
    },
    THREADS: {
      ID: 'id',
      LISTING_ID: 'listing_id',
    },
    LISTINGS: {
      ID: 'id',
      OWNER_ID: 'owner_id',
      KIND: 'kind',
      ORIGIN_CITY: 'origin_city',
      ORIGIN_COUNTRY: 'origin_country',
      DEST_CITY: 'dest_city',
      DEST_COUNTRY: 'dest_country',
      DEPART_DATE: 'depart_date',
      ARRIVE_DATE: 'arrive_date',
      TITLE: 'title',
      DESCRIPTION: 'description',
      PRICE: 'price',
      CURRENCY: 'currency',
      CAPACITY_KG: 'capacity_kg',
      STATUS: 'status',
    },
  },
}

export function getEmailUsername(email: string): string {
  return email.split('@')[0]
}

export function getInitial(name: string): string {
  return name.charAt(0).toUpperCase()
}
