export const DB = {
  TABLES: {
    PROFILES: 'profiles',
    MESSAGES: 'messages',
  },
  FIELDS: {
    PROFILES: {
      ID: 'id',
      DISPLAY_NAME: 'display_name',
      AVATAR_URL: 'avatar_url',
    },
    MESSAGES: {
      ID: 'id',
      READ_AT: 'read_at',
      SENDER_ID: 'sender_id',
    },
  },
}

export function getEmailUsername(email: string): string {
  return email.split('@')[0]
}

export function getInitial(name: string): string {
  return name.charAt(0).toUpperCase()
}
