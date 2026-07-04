import type { Listing, ListingKind } from "@/types/listing"

export function formatRoute(listing: Listing): string {
  const origin = listing.origin_city.toUpperCase()
  const dest = listing.dest_city.toUpperCase()
  return `${origin} → ${dest}`
}

export function formatListingDate(date: string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}

export function formatPrice(price: number | string, currency: string): string {
  const amount = typeof price === "string" ? Number(price) : price
  const symbol =
    currency === "USD" ? "$" : currency === "EUR" ? "€" : currency === "GBP" ? "£" : ""
  return symbol ? `${symbol}${amount}` : `${amount} ${currency}`
}

export function kindLabel(kind: ListingKind): string {
  switch (kind) {
    case "trip":
      return "Trip"
    case "request":
      return "Request"
    case "delivery":
      return "Delivery"
  }
}
