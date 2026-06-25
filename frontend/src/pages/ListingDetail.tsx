import * as React from "react"
import { useParams, Link } from "wouter"
import { motion } from "framer-motion"
import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/lib/auth"
import type { Listing } from "@/types/listing"
import { formatPrice, formatListingDate } from "@/lib/listings"

const KIND_COLORS: Record<string, string> = {
  trip: "bg-[#C8956A]/15 text-[#C8956A] border-[#C8956A]/30",
  request: "bg-[#7EB89A]/15 text-[#7EB89A] border-[#7EB89A]/30",
  delivery: "bg-[#8B9AE8]/15 text-[#8B9AE8] border-[#8B9AE8]/30",
}

interface ListingWithOwner extends Listing {
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
  if (!rating) return null
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
  const params = useParams()
  const id = params.id as string
  const { user } = useAuth()

  const { data: listing, isLoading, isError } = useQuery({
    queryKey: ["listing", id],
    queryFn: () => fetchListing(id),
    enabled: !!id,
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0E0B08] pt-16 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <svg className="animate-spin h-8 w-8 text-[#C8956A]" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
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
        <p className="text-[#8C7B68] text-sm mb-8">This route or item could not be located in the system.</p>
        <Link href="/browse">
          <button className="px-6 py-2.5 border border-[#2E2418] hover:border-[#C8956A]/40 text-[#8C7B68] hover:text-[#F4EDE4] text-[11px] tracking-widest rounded-sm transition-colors" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            ← BACK TO BOARD
          </button>
        </Link>
      </div>
    )
  }

  const owner = listing.owner
  const isOwn = user?.id === listing.owner_id

  return (
    <div className="min-h-screen bg-[#0E0B08] pt-16">
      {/* Back nav */}
      <div className="border-b border-[#1E1810]">
        <div className="max-w-[1100px] mx-auto px-6 py-3">
          <Link href="/browse">
            <button className="text-[11px] text-[#8C7B68] hover:text-[#C8956A] tracking-widest transition-colors" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              ← BACK TO BOARD
            </button>
          </Link>
        </div>
      </div>

      <div className="max-w-[1100px] mx-auto px-6 py-10 flex flex-col lg:flex-row gap-12">
        {/* Left: main content */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="flex-1 min-w-0">
          {/* Route header */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-sm text-[10px] tracking-widest border ${KIND_COLORS[listing.kind] ?? "bg-white/5 text-[#8C7B68] border-white/10"}`} style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {listing.kind.toUpperCase()}
              </span>
              <span className={`text-[10px] tracking-widest ${listing.status === "open" ? "text-[#7EB89A]" : "text-[#8C7B68]"}`} style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                ● {listing.status.toUpperCase()}
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl text-[#F4EDE4] leading-tight mb-4" style={{ fontFamily: "'DM Serif Display', serif" }}>
              {listing.title || `${listing.origin_city} → ${listing.dest_city}`}
            </h1>
            <div className="flex items-center gap-3 text-base">
              <span className="text-[#F4EDE4] font-medium">{listing.origin_city}</span>
              <span className="text-[#8C7B68] text-sm">{listing.origin_country}</span>
              <span className="text-[#C8956A] text-xl">→</span>
              <span className="text-[#F4EDE4] font-medium">{listing.dest_city}</span>
              <span className="text-[#8C7B68] text-sm">{listing.dest_country}</span>
            </div>
          </div>

          {/* Meta strip */}
          <div className="flex flex-wrap gap-8 py-5 border-y border-[#1E1810] mb-8" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            {listing.depart_date && (
              <div>
                <p className="text-[9px] tracking-[0.2em] text-[#8C7B68] mb-1 uppercase">Departure</p>
                <p className="text-[#F4EDE4] text-sm">{formatListingDate(listing.depart_date)}</p>
              </div>
            )}
            {listing.arrive_date && (
              <div>
                <p className="text-[9px] tracking-[0.2em] text-[#8C7B68] mb-1 uppercase">Arrival</p>
                <p className="text-[#F4EDE4] text-sm">{formatListingDate(listing.arrive_date)}</p>
              </div>
            )}
            {listing.capacity_kg && (
              <div>
                <p className="text-[9px] tracking-[0.2em] text-[#8C7B68] mb-1 uppercase">Capacity</p>
                <p className="text-[#F4EDE4] text-sm">{listing.capacity_kg} kg</p>
              </div>
            )}
            {listing.currency && listing.price && (
              <div>
                <p className="text-[9px] tracking-[0.2em] text-[#8C7B68] mb-1 uppercase">Currency</p>
                <p className="text-[#F4EDE4] text-sm">{listing.currency}</p>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="mb-10">
            <h2 className="text-[10px] tracking-[0.2em] text-[#8C7B68] mb-4 uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Details</h2>
            <p className="text-[#8C7B68] leading-relaxed text-[15px]">
              {listing.description || "No additional details provided for this listing."}
            </p>
          </div>

          {/* Owner card */}
          {owner && (
            <div className="bg-[#111008] border border-[#2E2418] rounded-md p-6">
              <h3 className="text-[10px] tracking-[0.2em] text-[#8C7B68] mb-5 uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {listing.kind === "trip" ? "Traveler Profile" : "Requester Profile"}
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
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-[#F4EDE4] text-lg truncate" style={{ fontFamily: "'DM Serif Display', serif" }}>
                      {owner.display_name ?? "Anonymous"}
                    </span>
                    <StarRating rating={owner.rating} count={owner.review_count} />
                  </div>
                  {(owner.city || owner.country) && (
                    <p className="text-[12px] text-[#8C7B68]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      {[owner.city, owner.country].filter(Boolean).join(", ")}
                    </p>
                  )}
                  {owner.bio && <p className="text-[13px] text-[#8C7B68] mt-2 line-clamp-2">{owner.bio}</p>}
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Right: action panel */}
        <motion.aside initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.1 }} className="w-full lg:w-[300px] shrink-0">
          <div className="sticky top-24 bg-[#111008] border border-[#2E2418] rounded-md p-6">
            {/* Price */}
            <div className="mb-6">
              <p className="text-[9px] tracking-[0.2em] text-[#8C7B68] mb-2 uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {listing.kind === "request" ? "Offered Reward" : "Base Price"}
              </p>
              <p className="text-4xl text-[#C8956A]" style={{ fontFamily: "'DM Serif Display', serif" }}>
                {formatPrice(listing.price, listing.currency)}
              </p>
            </div>

            {/* Status */}
            <div className="flex items-center gap-2 mb-6 py-3 border-y border-[#1E1810]">
              <div className={`w-2 h-2 rounded-full ${listing.status === "open" ? "bg-[#7EB89A] shadow-[0_0_8px_rgba(126,184,154,0.6)]" : "bg-[#8C7B68]"} animate-pulse`} />
              <span className="text-[11px] tracking-widest text-[#8C7B68]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {listing.status.toUpperCase()}
              </span>
            </div>

            {/* CTA */}
            {isOwn ? (
              <div className="py-3 text-center">
                <p className="text-[11px] text-[#8C7B68] tracking-widest" style={{ fontFamily: "'JetBrains Mono', monospace" }}>YOUR LISTING</p>
              </div>
            ) : listing.status === "open" ? (
              user ? (
                <button className="w-full py-3.5 bg-[#C8956A] hover:bg-[#D4A855] text-[#0E0B08] font-bold tracking-widest text-xs rounded-sm transition-colors" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  CONTACT {listing.kind === "trip" ? "COURIER" : "REQUESTER"}
                </button>
              ) : (
                <Link href="/auth">
                  <button className="w-full py-3.5 bg-[#C8956A] hover:bg-[#D4A855] text-[#0E0B08] font-bold tracking-widest text-xs rounded-sm transition-colors" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    SIGN IN TO CONTACT
                  </button>
                </Link>
              )
            ) : (
              <button disabled className="w-full py-3.5 border border-[#2E2418] text-[#8C7B68] text-xs tracking-widest rounded-sm cursor-not-allowed" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
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
