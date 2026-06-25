import * as React from "react"
import { Link } from "wouter"
import { motion, AnimatePresence } from "framer-motion"
import { useQuery } from "@tanstack/react-query"
import type { Listing, ListingKind } from "@/types/listing"
import { formatPrice, formatListingDate } from "@/lib/listings"

const KIND_COLORS: Record<string, string> = {
  trip: "bg-[#C8956A]/15 text-[#C8956A] border-[#C8956A]/30",
  request: "bg-[#7EB89A]/15 text-[#7EB89A] border-[#7EB89A]/30",
  delivery: "bg-[#8B9AE8]/15 text-[#8B9AE8] border-[#8B9AE8]/30",
}

function KindBadge({ kind }: { kind: ListingKind }) {
  const labels: Record<string, string> = { trip: "TRIP", request: "REQUEST", delivery: "DELIVERY" }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-sm text-[10px] tracking-widest border ${KIND_COLORS[kind] ?? "bg-white/5 text-[#8C7B68] border-white/10"}`} style={{ fontFamily: "'JetBrains Mono', monospace" }}>
      {labels[kind] ?? kind.toUpperCase()}
    </span>
  )
}

function ListingCard({ listing }: { listing: Listing }) {
  return (
    <motion.div layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.28 }} whileHover={{ y: -2 }}>
      <Link href={`/listings/${listing.id}`}>
        <div className="group relative bg-[#111008] border border-[#2E2418] hover:border-[#C8956A]/40 rounded-md p-5 cursor-pointer transition-all duration-200 hover:shadow-[0_0_24px_rgba(200,149,106,0.08)]">
          {/* Kind + price */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex-1 min-w-0">
              <div className="mb-2"><KindBadge kind={listing.kind} /></div>
              <h3 className="text-[#F4EDE4] font-medium text-[15px] leading-snug group-hover:text-[#C8956A] transition-colors line-clamp-2">
                {listing.title || `${listing.origin_city} → ${listing.dest_city}`}
              </h3>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[#C8956A] font-bold text-lg" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {formatPrice(listing.price, listing.currency)}
              </p>
              {listing.capacity_kg && (
                <p className="text-[10px] text-[#8C7B68] mt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  {listing.capacity_kg}kg cap
                </p>
              )}
            </div>
          </div>

          {/* Route */}
          <div className="flex items-center gap-2 mb-3 text-sm">
            <span className="text-[#F4EDE4] font-medium">{listing.origin_city}</span>
            <span className="text-[#8C7B68] text-xs">{listing.origin_country}</span>
            <span className="text-[#C8956A] text-base leading-none mx-1">→</span>
            <span className="text-[#F4EDE4] font-medium">{listing.dest_city}</span>
            <span className="text-[#8C7B68] text-xs">{listing.dest_country}</span>
          </div>

          {/* Date + owner */}
          <div className="flex items-center justify-between text-[11px] text-[#8C7B68]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            <div className="flex items-center gap-2">
              {listing.depart_date && <span>{formatListingDate(listing.depart_date)}</span>}
              {listing.arrive_date && listing.depart_date && <span className="text-[#2E2418]">→</span>}
              {listing.arrive_date && <span>{formatListingDate(listing.arrive_date)}</span>}
            </div>
            {listing.owner_display_name && (
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-full bg-[#1A1208] border border-[#2E2418] flex items-center justify-center text-[9px] text-[#C8956A]">
                  {listing.owner_display_name.charAt(0).toUpperCase()}
                </div>
                <span>{listing.owner_display_name}</span>
              </div>
            )}
          </div>

          {listing.description && (
            <p className="mt-3 text-[13px] text-[#8C7B68] line-clamp-2 leading-relaxed border-t border-[#1E1810] pt-3">
              {listing.description}
            </p>
          )}

          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C8956A]/40 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
        </div>
      </Link>
    </motion.div>
  )
}

function FilterInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="block text-[10px] tracking-[0.18em] text-[#8C7B68] mb-1.5 uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#C8956A]/50 select-none pointer-events-none text-[11px]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>›</span>
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          className="w-full bg-[#111008] border border-[#2E2418] focus:border-[#C8956A]/60 focus:outline-none text-[#F4EDE4] placeholder-[#3A2E20] rounded-sm py-2.5 pl-7 pr-3 text-[12px] transition-colors"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        />
      </div>
    </div>
  )
}

const KINDS = ["all", "trip", "request", "delivery"] as const

async function fetchListings(kind: string, originCity: string, destCity: string): Promise<Listing[]> {
  const params = new URLSearchParams({ status: "open", limit: "40" })
  if (kind && kind !== "all") params.set("kind", kind)
  if (originCity) params.set("origin_city", originCity)
  if (destCity) params.set("dest_city", destCity)
  const res = await fetch(`/api/listings?${params}`)
  if (!res.ok) throw new Error("Failed to fetch listings")
  const data = await res.json()
  return Array.isArray(data) ? data : (data.items ?? [])
}

export function Browse() {
  const [kind, setKind] = React.useState("all")
  const [originCity, setOriginCity] = React.useState("")
  const [destCity, setDestCity] = React.useState("")
  const [debouncedOrigin, setDebouncedOrigin] = React.useState("")
  const [debouncedDest, setDebouncedDest] = React.useState("")

  React.useEffect(() => { const t = setTimeout(() => setDebouncedOrigin(originCity), 400); return () => clearTimeout(t) }, [originCity])
  React.useEffect(() => { const t = setTimeout(() => setDebouncedDest(destCity), 400); return () => clearTimeout(t) }, [destCity])

  const { data: listings, isLoading, isError } = useQuery({
    queryKey: ["listings", kind, debouncedOrigin, debouncedDest],
    queryFn: () => fetchListings(kind, debouncedOrigin, debouncedDest),
    staleTime: 30_000,
  })

  return (
    <div className="min-h-screen bg-[#0E0B08] pt-16">
      {/* Sticky header */}
      <div className="border-b border-[#1E1810] bg-[#0E0B08]/90 backdrop-blur-sm sticky top-16 z-30">
        <div className="max-w-[1200px] mx-auto px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1.5 h-1.5 rounded-full bg-[#D4A855] animate-pulse" />
                <span className="text-[10px] tracking-[0.2em] text-[#8C7B68]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>BROWSE LISTINGS</span>
              </div>
              <h1 className="text-2xl text-[#F4EDE4]" style={{ fontFamily: "'DM Serif Display', serif" }}>Active Routes</h1>
            </div>
            <div className="flex gap-2 shrink-0">
              <Link href="/trips/new">
                <button className="px-4 py-2 bg-[#C8956A] hover:bg-[#D4A855] text-[#0E0B08] font-bold text-[11px] tracking-widest rounded-sm transition-colors" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  + TRIP
                </button>
              </Link>
              <Link href="/requests/new">
                <button className="px-4 py-2 border border-[#2E2418] hover:border-[#C8956A]/40 text-[#8C7B68] hover:text-[#F4EDE4] font-bold text-[11px] tracking-widest rounded-sm transition-colors" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  + REQUEST
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-6 py-8">
        {/* Filters */}
        <div className="bg-[#0D0B08] border border-[#1E1810] rounded-md p-5 mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <FilterInput label="From city" value={originCity} onChange={setOriginCity} placeholder="e.g. London" />
            <FilterInput label="To city" value={destCity} onChange={setDestCity} placeholder="e.g. Dubai" />
          </div>
          <div className="flex gap-2 flex-wrap">
            {KINDS.map((k) => (
              <button key={k} onClick={() => setKind(k)}
                className={`px-4 py-1.5 text-[11px] tracking-[0.1em] rounded-sm border transition-all ${kind === k ? "bg-[#C8956A] border-[#C8956A] text-[#0E0B08] font-bold" : "border-[#2E2418] text-[#8C7B68] hover:border-[#C8956A]/40 hover:text-[#F4EDE4]"}`}
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {k.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <svg className="animate-spin h-8 w-8 text-[#C8956A]" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <span className="text-[11px] tracking-widest text-[#8C7B68]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>LOADING ROUTES...</span>
          </div>
        )}

        {isError && (
          <div className="text-center py-24">
            <p className="text-[#C47B6B] text-sm mb-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>! FAILED TO LOAD LISTINGS</p>
            <p className="text-[#8C7B68] text-xs">Check your connection and try again.</p>
          </div>
        )}

        {!isLoading && !isError && listings && (
          <>
            <p className="text-[11px] text-[#8C7B68] tracking-widest mb-5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {listings.length} RESULT{listings.length !== 1 ? "S" : ""}
            </p>
            {listings.length === 0 ? (
              <div className="text-center py-24 border border-dashed border-[#2E2418] rounded-md">
                <div className="text-[48px] mb-4" style={{ fontFamily: "'DM Serif Display', serif", color: "transparent", WebkitTextStroke: "1px rgba(200,149,106,0.3)" }}>∅</div>
                <p className="text-[#8C7B68] mb-4">No listings match your filters.</p>
                <button onClick={() => { setKind("all"); setOriginCity(""); setDestCity("") }} className="text-[#C8956A] text-[11px] hover:underline tracking-widest" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  CLEAR FILTERS
                </button>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {listings.map((listing) => <ListingCard key={listing.id} listing={listing} />)}
                </div>
              </AnimatePresence>
            )}
          </>
        )}
      </div>
    </div>
  )
}
