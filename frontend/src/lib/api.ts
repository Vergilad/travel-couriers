import type { Listing } from "@/types/listing"
import { supabase } from "./supabase"

const API_BASE = import.meta.env.VITE_API_URL ?? ""

export async function fetchOpenListings(limit = 5): Promise<Listing[]> {
  const params = new URLSearchParams({ status: "open", limit: String(limit) })
  const response = await fetch(`${API_BASE}/api/listings?${params}`)
  if (!response.ok) throw new Error("Failed to load listings")
  return response.json()
}

export async function authedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  return fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  })
}
