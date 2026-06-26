import * as React from "react"
import { useParams, Link } from "@tanstack/react-router"
import { motion } from "framer-motion"
import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/lib/auth"
import type { Listing } from "@/types/listing"
import { formatListingDate } from "@/lib/listings"

const KIND_COLORS: Record<string, string> = {
  trip: "bg-[#C8956A]/15 text-[#C8956A] border-[#C8956A]/30",
  request: "bg-[#7EB89A]/15 text-[#7EB89A] border-[#7EB89A]/30",
  delivery: "bg-[#8B9AE8]/15 text-[#8B9AE8] border-[#8B9AE8]/30",
}

const FLEXIBILITY_LABELS: Record<string, string> = {
  exact: "Exact dates",
  "3days": "±3 days flexible",
  "1week": "±1 week flexible",
  "2weeks": "±2 weeks flexible",
}

function formatPrice(price: number | string | null | undefined, currency: string | null | undefined): string {
  if (price === null || price === undefined || price === "" || Number.isNaN(Number(price))) return "Negotiable"
  const amount = typeof price === "string" ? Number(price) : price
  if (amount === 0) return "Free"
  const symbol = currency === "USD" ? "$" : currency === "EUR" ? "€" : currency === "GBP" ? "£" : ""
  return symbol ? `${symbol}${amount.toLocaleString()}` : `${amount.toLocaleString()} ${currency ?? ""}`
}

interface ListingWithOwner extends Listing {
  date_flexibility?: string
  owner: {
    id: string
    display_name: string | null
    avatar_url: string | null
    bio: string | null
    city: string | null
    country: string | null
    rating: number | null
    review_count: number
  } | null
}

async function fetchListing(id: string): Promise<ListingWithOwner> {
  const res = await fetch(`/api/listings/${id}`)
  if (!res.ok) throw new Error("Listing not found")
  return res.json()
}

function StarRating({ rating, count }: { rating: number | null; count: number }) {
  if (!rating) return <span className="text-[11px] text-[#8C7B68]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>No reviews yet</span>
  const stars = Math.round(rating)
  return (
    <span className="flex items-center gap-1 text-[11px]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={i < stars ? "text-[#D4A855]" : "text-[#2E2418]"}>★</span>
      ))}
      {count > 0 && <span className="ml-1 text-[#8C7B68]">({count})</span>}
    </span>
  )
}

export function ListingDetail() {
  const { id } = useParams({ strict: false })
  const { user } = useAuth()

  const { data: listing, isLoading, isError } = useQuery({
    queryKey: ["listing", id],
    queryFn: () => fetchListing(id as string),
    enabled: !!id,
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0E0B08] pt-16 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-6 h-6 rounded-full border-2 border-[#C8956A]/20 border-t-[#C8956A] animate-spin" />
          <span className="text-[11px] tracking-widest text-[#8C7B68]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>LOADING MANIFEST...</span>
        </div>
      </div>
    )
  }

  if (isError || !listing) {
    return (
      <div className="min-h-screen bg-[#0E0B08] pt-16 flex flex-col items-center justify-center text-center px-6">
        <div className="text-[64px] mb-4" style={{ fontFamily: "'DM Serif Display', serif", color: "transparent", WebkitTextStroke: "1px rgba(200,149,106,0.4)" }}>404</div>
        <h2 className="text-[#F4EDE4] text-2xl mb-3" style={{ fontFamily: "'DM Serif Display', serif" }}>Listing Not Found</h2>
        <p className="text-[#8C7B68] text-sm mb-8">This route could not be located in the system.</p>
        <Link to="/browse">
          <button className="px-6 py-2.5 border border-[#2E2418] hover:border-[#C8956A]/40 text-[#8C7B68] hover:text-[#F4EDE4] text-[11px] tracking-widest rounded-full transition-colors" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            ← BACK TO BOARD
          </button>
        </Link>
      </div>
    )
  }

  const owner = listing.owner
  const isOwn = user?.id === listing.owner_id
  const priceDisplay = formatPrice(listing.price, listing.currency)
  const hasDates = listing.depart_date || listing.arrive_date

  return (
    <div className="min-h-screen bg-[#0E0B08] pt-16">
      <div className="border-b border-[#1E1810]">
        <div className="max-w-[1100px] mx-auto px-6 py-3">
          <Link to="/browse">
            <button className="text-[11px] text-[#8C7B68] hover:text-[#C8956A] tracking-widest transition-colors" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              ← BACK TO BOARD
            </button>
          </Link>
        </div>
      </div>

      <div className="max-w-[1100px] mx-auto px-6 py-10 flex flex-col lg:flex-row gap-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="flex-1 min-w-0"
        >
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-sm text-[10px] tracking-widest border ${KIND_COLORS[listing.kind] ?? "bg-white/5 text-[#8C7B68] border-white/10"}`} style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {listing.kind.toUpperCase()}
              </span>
              <span className={`text-[10px] tracking-widest flex items-center gap-1.5 ${listing.status === "open" ? "text-[#7EB89A]" : "text-[#8C7B68]"}`} style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                <span className={`w-1.5 h-1.5 rounded-full ${listing.status === "open" ? "bg-[#7EB89A]" : "bg-[#8C7B68]"}`} />
                {listing.status.toUpperCase()}
              </span>
            </div>

            <h1 className="text-3xl md:text-4xl text-[#F4EDE4] leading-tight mb-5" style={{ fontFamily: "'DM Serif Display', serif" }}>
              {listing.title || `${listing.origin_city} → ${listing.dest_city}`}
            </h1>

            <div className="flex items-center gap-2 text-base" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              <span className="text-[#F4EDE4]">{listing.origin_city}</span>
              {listing.origin_country && <span className="text-[#8C7B68] text-sm">{listing.origin_country}</span>}
              <span className="text-[#C8956A] text-lg mx-1">→</span>
              <span className="text-[#F4EDE4]">{listing.dest_city}</span>
              {listing.dest_country && <span className="text-[#8C7B68] text-sm">{listing.dest_country}</span>}
            </div>
          </div>

          {(hasDates || listing.capacity_kg) && (
            <div className="flex flex-wrap gap-8 py-5 border-y border-[#1E1810] mb-8">
              {listing.depart_date && (
                <div>
                  <p className="text-[9px] tracking-[0.2em] text-[#8C7B68] mb-1.5 uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Departure</p>
                  <p className="text-[#F4EDE4] text-sm" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatListingDate(listing.depart_date)}</p>
                  {listing.date_flexibility && listing.date_flexibility !== "exact" && (
                    <p className="text-[10px] text-[#8C7B68] mt-0.5">{FLEXIBILITY_LABELS[listing.date_flexibility]}</p>
                  )}
                </div>
              )}
              {listing.arrive_date && (
                <div>
                  <p className="text-[9px] tracking-[0.2em] text-[#8C7B68] mb-1.5 uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Arrival</p>
                  <p className="text-[#F4EDE4] text-sm" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatListingDate(listing.arrive_date)}</p>
                </div>
              )}
              {listing.capacity_kg && (
                <div>
                  <p className="text-[9px] tracking-[0.2em] text-[#8C7B68] mb-1.5 uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Capacity</p>
                  <p className="text-[#F4EDE4] text-sm" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{listing.capacity_kg} kg</p>
                </div>
              )}
            </div>
          )}

          <div className="mb-10">
            <h2 className="text-[10px] tracking-[0.2em] text-[#8C7B68] mb-4 uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Details</h2>
            <p className="text-[#8C7B68] leading-relaxed text-[15px]">
              {listing.description || "No additional details provided for this listing."}
            </p>
          </div>

          {owner && (
            <div className="bg-[#111008] border border-[#2E2418] rounded-md p-6">
              <h3 className="text-[10px] tracking-[0.2em] text-[#8C7B68] mb-5 uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {listing.kind === "trip" ? "Traveler Profile" : listing.kind === "delivery" ? "Carrier Profile" : "Requester Profile"}
              </h3>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-[#1A1208] border border-[#2E2418] flex items-center justify-center shrink-0 overflow-hidden">
                  {owner.avatar_url ? (
                    <img src={owner.avatar_url} alt={owner.display_name ?? "User"} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xl text-[#C8956A]" style={{ fontFamily: "'DM Serif Display', serif" }}>
                      {(owner.display_name ?? "?").charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap mb-1.5">
                    <span className="text-[#F4EDE4] text-lg" style={{ fontFamily: "'DM Serif Display', serif" }}>
                      {owner.display_name ?? "Anonymous"}
                    </span>
                    <StarRating rating={owner.rating} count={owner.review_count ?? 0} />
                  </div>
                  {(owner.city || owner.country) && (
                    <p className="text-[12px] text-[#8C7B68] mb-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      {[owner.city, owner.country].filter(Boolean).join(", ")}
                    </p>
                  )}
                  {owner.bio && <p className="text-[13px] text-[#8C7B68] leading-relaxed line-clamp-2">{owner.bio}</p>}
                </div>
              </div>
            </div>
          )}
        </motion.div>

        <motion.aside
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
          className="w-full lg:w-[280px] shrink-0"
        >
          <div className="sticky top-24 bg-[#111008] border border-[#2E2418] rounded-md p-6">
            <div className="mb-5">
              <p className="text-[9px] tracking-[0.2em] text-[#8C7B68] mb-2 uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {listing.kind === "request" ? "Offered Reward" : "Price"}
              </p>
              <p className="text-3xl text-[#C8956A]" style={{ fontFamily: "'DM Serif Display', serif" }}>
                {priceDisplay}
              </p>
              {listing.currency && listing.price && (
                <p className="text-[10px] text-[#8C7B68] mt-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{listing.currency}</p>
              )}
            </div>

            <div className="flex items-center gap-2 mb-5 py-3 border-y border-[#1E1810]">
              <div className={`w-2 h-2 rounded-full ${listing.status === "open" ? "bg-[#7EB89A] shadow-[0_0_8px_rgba(126,184,154,0.5)]" : "bg-[#8C7B68]"} animate-pulse`} />
              <span className="text-[11px] tracking-widest text-[#8C7B68]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {listing.status.toUpperCase()}
              </span>
            </div>

            {isOwn ? (
              <div className="py-3 text-center">
                <p className="text-[11px] text-[#8C7B68] tracking-widest" style={{ fontFamily: "'JetBrains Mono', monospace" }}>YOUR LISTING</p>
              </div>
            ) : listing.status === "open" ? (
              user ? (
                <button
                  className="w-full py-3.5 bg-[#C8956A] hover:bg-[#D4A855] text-[#0E0B08] font-bold tracking-widest text-[11px] rounded-full transition-colors"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  CONTACT {listing.kind === "trip" ? "COURIER" : listing.kind === "delivery" ? "CARRIER" : "REQUESTER"}
                </button>
              ) : (
                <Link to="/auth" search={{ mode: "signin", redirect: undefined }}>
                  <button className="w-full py-3.5 bg-[#C8956A] hover:bg-[#D4A855] text-[#0E0B08] font-bold tracking-widest text-[11px] rounded-full transition-colors" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    SIGN IN TO CONTACT
                  </button>
                </Link>
              )
            ) : (
              <button disabled className="w-full py-3.5 border border-[#2E2418] text-[#8C7B68] text-[11px] tracking-widest rounded-full cursor-not-allowed" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                LISTING CLOSED
              </button>
            )}

            <p className="text-center text-[10px] text-[#3A2E20] mt-4 tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              SECURED BY TRAVEL COURIERS
            </p>
          </div>
        </motion.aside>
      </div>
    </div>
  )
}
