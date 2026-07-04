import * as React from "react"
import { Link } from "@tanstack/react-router"
import { motion, AnimatePresence } from "framer-motion"
import { useQuery } from "@tanstack/react-query"
import type { Listing, ListingKind } from "@/types/listing"
import { formatPrice, formatListingDate } from "@/lib/listings"
import { CityAutocomplete } from "@/components/CityAutocomplete"

const KIND_COLORS: Record<string, string> = {
  trip: "bg-[#C8956A]/15 text-[#C8956A] border-[#C8956A]/30",
  request: "bg-[#7EB89A]/15 text-[#7EB89A] border-[#7EB89A]/30",
  delivery: "bg-[#8B9AE8]/15 text-[#8B9AE8] border-[#8B9AE8]/30",
}

function KindBadge({ kind }: { kind: ListingKind }) {
  const labels: Record<string, string> = { trip: "TRIP", request: "REQUEST", delivery: "DELIVERY" }
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-sm text-[10px] tracking-widest border ${KIND_COLORS[kind] ?? "bg-white/5 text-[#8C7B68] border-white/10"}`}
      style={{ fontFamily: "'JetBrains Mono', monospace" }}
    >
      {labels[kind] ?? kind.toUpperCase()}
    </span>
  )
}

function ListingCard({ listing }: { listing: Listing }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.24 }}
      whileHover={{ y: -2 }}
    >
      <Link to="/listings/$id" params={{ id: listing.id }}>
        <div className="group relative bg-[#111008] border border-[#2E2418] hover:border-[#C8956A]/40 rounded-md p-5 cursor-pointer transition-all duration-200 hover:shadow-[0_0_24px_rgba(200,149,106,0.06)]">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <div className="mb-2 flex items-center gap-2">
                <KindBadge kind={listing.kind} />
              </div>
              <h3 className="text-[#F4EDE4] font-medium text-[14px] leading-snug group-hover:text-[#C8956A] transition-colors line-clamp-1">
                {listing.title || `${listing.origin_city} → ${listing.dest_city}`}
              </h3>
            </div>
            <div className="text-right shrink-0">
              {listing.price ? (
                <p className="text-[#C8956A] font-semibold text-base" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  {formatPrice(listing.price, listing.currency)}
                </p>
              ) : (
                <p className="text-[#8C7B68] text-[11px]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>NEGOTIABLE</p>
              )}
              {listing.capacity_kg && (
                <p className="text-[10px] text-[#8C7B68] mt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  {listing.capacity_kg}kg
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 mb-3 text-sm" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            <span className="text-[#F4EDE4] text-[13px]">{listing.origin_city}</span>
            {listing.origin_country && <span className="text-[#8C7B68] text-[11px]">{listing.origin_country}</span>}
            <span className="text-[#C8956A] mx-1">→</span>
            <span className="text-[#F4EDE4] text-[13px]">{listing.dest_city}</span>
            {listing.dest_country && <span className="text-[#8C7B68] text-[11px]">{listing.dest_country}</span>}
          </div>

          <div className="flex items-center justify-between text-[11px] text-[#8C7B68]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            <div className="flex items-center gap-3">
              {listing.depart_date && (
                <span>
                  {formatListingDate(listing.depart_date)}
                  {(listing as any).date_flexibility && (listing as any).date_flexibility !== "exact" && (
                    <span className="text-[#8C7B68]/60 ml-1">
                      {(listing as any).date_flexibility === "week" ? "±1w" : "±1mo"}
                    </span>
                  )}
                </span>
              )}
              {!listing.depart_date && (
                <span className="text-[#8C7B68]/60 italic">FLEXIBLE</span>
              )}
            </div>
            {(listing as any).owner_display_name && (
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-full bg-[#1A1208] border border-[#2E2418] flex items-center justify-center text-[9px] text-[#C8956A]">
                  {(listing as any).owner_display_name.charAt(0).toUpperCase()}
                </div>
                <span>{(listing as any).owner_display_name}</span>
              </div>
            )}
          </div>

          {listing.description && (
            <p className="mt-3 text-[12px] text-[#8C7B68] line-clamp-1 leading-relaxed border-t border-[#1E1810] pt-3">
              {listing.description}
            </p>
          )}

          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C8956A]/30 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
        </div>
      </Link>
    </motion.div>
  )
}

function NumberInput({
  label, value, onChange, placeholder, min, max,
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; min?: number; max?: number }) {
  return (
    <div>
      <label className="block text-[10px] tracking-[0.18em] text-[#8C7B68] mb-1.5 uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        min={min}
        max={max}
        className="w-full bg-[#111008] border border-[#2E2418] focus:border-[#C8956A]/60 focus:outline-none text-[#F4EDE4] placeholder-[#3A2E20] rounded-sm py-2 px-3 text-[12px] transition-colors"
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      />
    </div>
  )
}

function DateInput({
  label, value, onChange,
}: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-[10px] tracking-[0.18em] text-[#8C7B68] mb-1.5 uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{label}</label>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[#111008] border border-[#2E2418] focus:border-[#C8956A]/60 focus:outline-none text-[#F4EDE4] placeholder-[#3A2E20] rounded-sm py-2 px-3 text-[12px] transition-colors"
        style={{ fontFamily: "'JetBrains Mono', monospace", colorScheme: "dark" }}
      />
    </div>
  )
}

const KINDS = ["all", "trip", "request", "delivery"] as const

async function fetchListings(params: {
  kind: string; originCity: string; destCity: string;
  priceMin: string; priceMax: string; departFrom: string; departTo: string;
}): Promise<Listing[]> {
  const q = new URLSearchParams({ status: "open", limit: "40" })
  if (params.kind && params.kind !== "all") q.set("kind", params.kind)
  if (params.originCity) q.set("origin_city", params.originCity)
  if (params.destCity) q.set("dest_city", params.destCity)
  if (params.priceMin) q.set("price_min", params.priceMin)
  if (params.priceMax) q.set("price_max", params.priceMax)
  if (params.departFrom) q.set("depart_from", params.departFrom)
  if (params.departTo) q.set("depart_to", params.departTo)
  const res = await fetch(`/api/listings?${q}`)
  if (!res.ok) throw new Error("Failed to fetch listings")
  const data = await res.json()
  return Array.isArray(data) ? data : (data.items ?? [])
}

function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = React.useState(value)
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

export function Browse() {
  const params = new URLSearchParams(window.location.search)
  const initOrigin = params.get("origin_city") ?? ""
  const initDest = params.get("dest_city") ?? ""

  const [kind, setKind] = React.useState("all")
  const [originCity, setOriginCity] = React.useState(initOrigin)
  const [destCity, setDestCity] = React.useState(initDest)
  const [originCityValue, setOriginCityValue] = React.useState(initOrigin)
  const [destCityValue, setDestCityValue] = React.useState(initDest)
  const [priceMin, setPriceMin] = React.useState("")
  const [priceMax, setPriceMax] = React.useState("")
  const [departFrom, setDepartFrom] = React.useState("")
  const [departTo, setDepartTo] = React.useState("")
  const [filtersOpen, setFiltersOpen] = React.useState(false)

  const debouncedOrigin = useDebounced(originCity, 400)
  const debouncedDest = useDebounced(destCity, 400)
  const debouncedPriceMin = useDebounced(priceMin, 500)
  const debouncedPriceMax = useDebounced(priceMax, 500)

  const { data: listings, isLoading, isError } = useQuery({
    queryKey: ["listings", kind, debouncedOrigin, debouncedDest, debouncedPriceMin, debouncedPriceMax, departFrom, departTo],
    queryFn: () => fetchListings({
      kind, originCity: debouncedOrigin, destCity: debouncedDest,
      priceMin: debouncedPriceMin, priceMax: debouncedPriceMax,
      departFrom, departTo,
    }),
    staleTime: 30_000,
  })

  const hasActiveFilters = originCity || destCity || priceMin || priceMax || departFrom || departTo || kind !== "all"

  function clearFilters() {
    setKind("all")
    setOriginCity("")
    setDestCity("")
    setOriginCityValue("")
    setDestCityValue("")
    setPriceMin("")
    setPriceMax("")
    setDepartFrom("")
    setDepartTo("")
  }

  return (
    <div className="min-h-screen bg-[#0E0B08] pt-16">
      <div className="border-b border-[#1E1810] bg-[#0E0B08]/95 backdrop-blur-sm sticky top-16 z-30">
        <div className="max-w-[1200px] mx-auto px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1.5 h-1.5 rounded-full bg-[#D4A855] animate-pulse" />
                <span className="text-[10px] tracking-[0.2em] text-[#8C7B68]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>BROWSE LISTINGS</span>
              </div>
              <h1 className="text-2xl text-[#F4EDE4]" style={{ fontFamily: "'DM Serif Display', serif" }}>Active Routes</h1>
            </div>
            <div className="flex gap-2 shrink-0">
              <Link to="/trips/new">
                <button className="px-4 py-2 bg-[#C8956A] hover:bg-[#D4A855] text-[#0E0B08] font-bold text-[10px] tracking-widest rounded-full transition-colors" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  + TRIP
                </button>
              </Link>
              <Link to="/requests/new">
                <button className="px-4 py-2 border border-[#2E2418] hover:border-[#C8956A]/40 text-[#8C7B68] hover:text-[#F4EDE4] font-bold text-[10px] tracking-widest rounded-full transition-colors" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  + REQUEST
                </button>
              </Link>
              <Link to="/deliveries/new">
                <button className="px-4 py-2 border border-[#2E2418] hover:border-[#8B9AE8]/40 text-[#8C7B68] hover:text-[#8B9AE8] font-bold text-[10px] tracking-widest rounded-full transition-colors" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  + DELIVERY
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-6 py-8">
        <div className="bg-[#0D0B08] border border-[#1E1810] rounded-md p-5 mb-8">

          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-1.5 flex-wrap">
              {KINDS.map((k) => (
                <button
                  key={k}
                  onClick={() => setKind(k)}
                  className={`px-4 py-1.5 text-[10px] tracking-[0.12em] rounded-full border transition-all ${kind === k
                    ? "bg-[#C8956A] border-[#C8956A] text-[#0E0B08] font-bold"
                    : "border-[#2E2418] text-[#8C7B68] hover:border-[#C8956A]/40 hover:text-[#F4EDE4]"}`}
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {k.toUpperCase()}
                </button>
              ))}
            </div>
            <button
              onClick={() => setFiltersOpen(o => !o)}
              className={`flex items-center gap-2 px-3 py-1.5 text-[10px] tracking-widest rounded-sm border transition-all ${filtersOpen || (priceMin || priceMax || departFrom || departTo) ? "border-[#C8956A]/40 text-[#C8956A]" : "border-[#1E1810] text-[#8C7B68] hover:text-[#F4EDE4]"}`}
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18M6 12h12M10 20h4" />
              </svg>
              FILTERS
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-1">
            <CityAutocomplete
              label="From city"
              value={originCityValue}
              placeholder="London, Tokyo…"
              compact
              onSelect={(city) => {
                setOriginCity(city)
                setOriginCityValue(city)
              }}
              onChange={(raw) => {
                setOriginCityValue(raw)
                setOriginCity(raw)
              }}
              onClear={() => {
                setOriginCity("")
                setOriginCityValue("")
              }}
            />
            <CityAutocomplete
              label="To city"
              value={destCityValue}
              placeholder="Dubai, New York…"
              compact
              onSelect={(city) => {
                setDestCity(city)
                setDestCityValue(city)
              }}
              onChange={(raw) => {
                setDestCityValue(raw)
                setDestCity(raw)
              }}
              onClear={() => {
                setDestCity("")
                setDestCityValue("")
              }}
            />
          </div>

          <AnimatePresence>
            {filtersOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="pt-4 mt-3 border-t border-[#1E1810] grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <NumberInput label="Min price ($)" value={priceMin} onChange={setPriceMin} placeholder="0" min={0} max={10000} />
                  <NumberInput label="Max price ($)" value={priceMax} onChange={setPriceMax} placeholder="10000" min={0} max={10000} />
                  <DateInput label="Depart after" value={departFrom} onChange={setDepartFrom} />
                  <DateInput label="Depart before" value={departTo} onChange={setDepartTo} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-6 h-6 rounded-full border-2 border-[#C8956A]/20 border-t-[#C8956A] animate-spin" />
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
            <div className="flex items-center justify-between mb-5">
              <p className="text-[11px] text-[#8C7B68] tracking-widest" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {listings.length} RESULT{listings.length !== 1 ? "S" : ""}
                {(originCity || destCity) && (
                  <span className="text-[#C8956A]/70 ml-2">
                    {originCity && `FROM ${originCity.toUpperCase()}`}
                    {originCity && destCity && " → "}
                    {destCity && `TO ${destCity.toUpperCase()}`}
                  </span>
                )}
              </p>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-[10px] text-[#C8956A]/70 hover:text-[#C8956A] tracking-widest transition-colors"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  CLEAR ALL
                </button>
              )}
            </div>

            {listings.length === 0 ? (
              <div className="text-center py-24 border border-dashed border-[#2E2418] rounded-md">
                <div className="text-[48px] mb-4" style={{ fontFamily: "'DM Serif Display', serif", color: "transparent", WebkitTextStroke: "1px rgba(200,149,106,0.3)" }}>∅</div>
                <p className="text-[#8C7B68] mb-4 text-sm">No listings match your filters.</p>
                <button onClick={clearFilters} className="text-[#C8956A] text-[11px] hover:underline tracking-widest" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  CLEAR FILTERS
                </button>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {listings.map((listing) => (
                    <ListingCard key={listing.id} listing={listing} />
                  ))}
                </div>
              </AnimatePresence>
            )}
          </>
        )}
      </div>
    </div>
  )
}
