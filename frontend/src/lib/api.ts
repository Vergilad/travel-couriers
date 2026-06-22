import type { Listing } from "@/types/listing"

const API_BASE = import.meta.env.VITE_API_URL ?? ""

export async function fetchOpenListings(limit = 5): Promise<Listing[]> {
  const params = new URLSearchParams({
    status: "open",
    limit: String(limit),
  })
  const response = await fetch(`${API_BASE}/api/listings?${params}`)
  if (!response.ok) {
    throw new Error("Failed to load listings")
  }
  return response.json()
}
