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

export function formatPrice(price: number | string | null | undefined, currency: string | null | undefined): string {
  if (price === null || price === undefined || price === "" || Number.isNaN(Number(price))) return "Negotiable"
  const amount = typeof price === "string" ? Number(price) : price
  if (amount === 0) return "Free"
  const symbol = currency === "USD" ? "$" : currency === "EUR" ? "€" : currency === "GBP" ? "£" : ""
  return symbol ? `${symbol}${amount.toLocaleString()}` : `${amount.toLocaleString()} ${currency ?? ""}`
}

export function kindLabel(kind: ListingKind): string {
  switch (kind) {
    case "carry":
      return "Carry"
    case "need":
      return "Need"
  }
}
