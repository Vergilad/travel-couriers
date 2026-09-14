export type ListingKind = "carry" | "need"
export type ListingStatus = "open" | "matched" | "completed" | "cancelled"

export interface Listing {
  id: string
  owner_id: string
  kind: ListingKind
  origin_city: string
  origin_country: string
  dest_city: string
  dest_country: string
  depart_date: string
  arrive_date: string
  title: string
  description: string | null
  price: number
  currency: string
  needs_purchase: boolean
  status: ListingStatus
  created_at: string
  owner_display_name?: string | null
}
