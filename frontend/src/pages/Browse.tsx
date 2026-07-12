import * as React from "react"
import { Link } from "@tanstack/react-router"
import { motion, AnimatePresence } from "framer-motion"
import { useQuery } from "@tanstack/react-query"
import { SlidersHorizontal, X } from "lucide-react"
import type { Listing, ListingKind } from "@/types/listing"
import { formatPrice, formatListingDate } from "@/lib/listings"
import { CityAutocomplete } from "@/components/CityAutocomplete"

// ── Kind badge ────────────────────────────────────────────────────────────────

const KIND_META: Record<string, { label: string; color: string }> = {
  trip:     { label: "TRIP",     color: "rgba(37,99,235,0.15) border-[rgba(37,99,235,0.35)] text-[#93c5fd]" },
  request:  { label: "REQUEST",  color: "rgba(34,197,94,0.12) border-[rgba(34,197,94,0.30)] text-[#86efac]" },
  delivery: { label: "DELIVERY", color: "rgba(168,85,247,0.12) border-[rgba(168,85,247,0.30)] text-[#d8b4fe]" },
}

function KindBadge({ kind }: { kind: ListingKind }) {
  const meta = KIND_META[kind] ?? { label: kind.toUpperCase(), color: "rgba(255,255,255,0.05) border-[var(--border)] text-[var(--text-muted)]" }
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-sm text-[10px] tracking-widest border font-mono`}
      style={{ background: meta.color.split(" ")[0] }}
    >
      <span style={{ color: meta.color.split(" ")[2].replace("text-[","").replace("]","") }}>
        {meta.label}
      </span>
    </span>
  )
}

function KindBadgeClean({ kind }: { kind: ListingKind }) {
  const labels: Record<string, string> = { trip: "TRIP", request: "REQUEST", delivery: "DELIVERY" }
  const styles: Record<string, React.CSSProperties> = {
    trip:     { background: "rgba(37,99,235,0.12)",  border: "1px solid rgba(37,99,235,0.30)",  color: "#93c5fd" },
    request:  { background: "rgba(34,197,94,0.10)",  border: "1px solid rgba(34,197,94,0.28)",  color: "#86efac" },
    delivery: { background: "rgba(168,85,247,0.10)", border: "1px solid rgba(168,85,247,0.28)", color: "#d8b4fe" },
  }
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-sm text-[10px] tracking-widest font-mono"
      style={styles[kind] ?? { background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
    >
      {labels[kind] ?? kind.toUpperCase()}
    </span>
  )
}

// ── Listing card ──────────────────────────────────────────────────────────────

function ListingCard({ listing }: { listing: Listing }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      whileHover={{ y: -2 }}
    >
      <Link to="/listings/$id" params={{ id: listing.id }}>
        <div
          className="group relative cursor-pointer transition-all duration-200"
          style={{
            background: "var(--surface-raised)",
            border: "1px solid var(--border)",
            borderRadius: "2px",
            padding: "18px 20px",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(37,99,235,0.35)"
            ;(e.currentTarget as HTMLDivElement).style.boxShadow = "0 0 20px rgba(37,99,235,0.06)"
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)"
            ;(e.currentTarget as HTMLDivElement).style.boxShadow = "none"
          }}
        >
          {/* Header row */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <div className="mb-2">
                <KindBadgeClean kind={listing.kind} />
              </div>
              <h3
                className="text-[14px] font-medium leading-snug line-clamp-1 transition-colors"
                style={{ color: "var(--text)" }}
              >
                {listing.title || `${listing.origin_city} → ${listing.dest_city}`}
              </h3>
            </div>
            <div className="text-right shrink-0">
              {listing.price ? (
                <p className="font-mono font-semibold text-[14px]" style={{ color: "var(--accent)" }}>
                  {formatPrice(listing.price, listing.currency)}
                </p>
              ) : (
                <p className="font-mono text-[10px] tracking-widest" style={{ color: "var(--text-faint)" }}>
                  NEGOTIATE
                </p>
              )}
              {listing.capacity_kg && (
                <p className="font-mono text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                  {listing.capacity_kg}kg
                </p>
              )}
            </div>
          </div>

          {/* Route row */}
          <div className="flex items-center gap-2 mb-3 font-mono text-[12px]">
            <span style={{ color: "var(--text)" }}>{listing.origin_city}</span>
            {listing.origin_country && (
              <span className="text-[10px]" style={{ color: "var(--text-faint)" }}>{listing.origin_country}</span>
            )}
            <span className="mx-0.5" style={{ color: "var(--accent)" }}>→</span>
            <span style={{ color: "var(--text)" }}>{listing.dest_city}</span>
            {listing.dest_country && (
              <span className="text-[10px]" style={{ color: "var(--text-faint)" }}>{listing.dest_country}</span>
            )}
          </div>

          {/* Footer row */}
          <div
            className="flex items-center justify-between font-mono text-[11px] pt-3"
            style={{ borderTop: "1px solid var(--border)", color: "var(--text-muted)" }}
          >
            <div className="flex items-center gap-3">
              {listing.depart_date ? (
                <span>
                  {formatListingDate(listing.depart_date)}
                  {(listing as any).date_flexibility && (listing as any).date_flexibility !== "exact" && (
                    <span className="ml-1 opacity-50">
                      {(listing as any).date_flexibility === "week" ? "±1w" : "±1mo"}
                    </span>
                  )}
                </span>
              ) : (
                <span className="opacity-40 tracking-widest">FLEXIBLE</span>
              )}
            </div>
            {(listing as any).owner_display_name && (
              <div className="flex items-center gap-1.5">
                <div
                  className="w-4 h-4 rounded-sm flex items-center justify-center text-[9px]"
                  style={{
                    background: "rgba(37,99,235,0.12)",
                    border: "1px solid rgba(37,99,235,0.25)",
                    color: "var(--accent)",
                  }}
                >
                  {(listing as any).owner_display_name.charAt(0).toUpperCase()}
                </div>
                <span>{(listing as any).owner_display_name}</span>
              </div>
            )}
          </div>

          {listing.description && (
            <p
              className="mt-3 text-[12px] line-clamp-1 leading-relaxed"
              style={{ color: "var(--text-muted)" }}
            >
              {listing.description}
            </p>
          )}

          {/* Bottom edge accent on hover */}
          <div
            className="absolute bottom-0 left-0 right-0 h-px scale-x-0 group-hover:scale-x-100 transition-transform duration-300"
            style={{ background: "linear-gradient(to right, transparent, var(--accent), transparent)" }}
          />
        </div>
      </Link>
    </motion.div>
  )
}

// ── Filter inputs ─────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: "2px",
  padding: "7px 10px",
  fontSize: "12px",
  fontFamily: "'JetBrains Mono', monospace",
  color: "var(--text)",
  outline: "none",
  transition: "border-color 0.15s",
}

function FilterInput({
  label, children,
}: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label
        className="block font-mono text-[10px] tracking-[0.16em] mb-1.5 uppercase"
        style={{ color: "var(--text-muted)" }}
      >
        {label}
      </label>
      {children}
    </div>
  )
}

function NumInput({ label, value, onChange, placeholder, min, max }: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; min?: number; max?: number
}) {
  return (
    <FilterInput label={label}>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        min={min}
        max={max}
        style={inputStyle}
        onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
        onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
      />
    </FilterInput>
  )
}

function DateInput({ label, value, onChange }: {
  label: string; value: string; onChange: (v: string) => void
}) {
  return (
    <FilterInput label={label}>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...inputStyle, colorScheme: "dark" }}
        onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
        onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
      />
    </FilterInput>
  )
}

// ── Data fetching ─────────────────────────────────────────────────────────────

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

// ── Page ──────────────────────────────────────────────────────────────────────

export function Browse() {
  const params = new URLSearchParams(window.location.search)
  const initOrigin = params.get("origin_city") ?? ""
  const initDest   = params.get("dest_city") ?? ""

  const [kind, setKind]                 = React.useState("all")
  const [originCity, setOriginCity]     = React.useState(initOrigin)
  const [destCity, setDestCity]         = React.useState(initDest)
  const [originValue, setOriginValue]   = React.useState(initOrigin)
  const [destValue, setDestValue]       = React.useState(initDest)
  const [priceMin, setPriceMin]         = React.useState("")
  const [priceMax, setPriceMax]         = React.useState("")
  const [departFrom, setDepartFrom]     = React.useState("")
  const [departTo, setDepartTo]         = React.useState("")
  const [filtersOpen, setFiltersOpen]   = React.useState(false)

  const dOrigin   = useDebounced(originCity, 400)
  const dDest     = useDebounced(destCity, 400)
  const dPriceMin = useDebounced(priceMin, 500)
  const dPriceMax = useDebounced(priceMax, 500)

  const { data: listings, isLoading, isError } = useQuery({
    queryKey: ["listings", kind, dOrigin, dDest, dPriceMin, dPriceMax, departFrom, departTo],
    queryFn: () => fetchListings({
      kind, originCity: dOrigin, destCity: dDest,
      priceMin: dPriceMin, priceMax: dPriceMax,
      departFrom, departTo,
    }),
    staleTime: 30_000,
  })

  const hasFilters = originCity || destCity || priceMin || priceMax || departFrom || departTo || kind !== "all"
  const hasDateOrPrice = priceMin || priceMax || departFrom || departTo

  function clearFilters() {
    setKind("all")
    setOriginCity(""); setOriginValue("")
    setDestCity("");   setDestValue("")
    setPriceMin(""); setPriceMax("")
    setDepartFrom(""); setDepartTo("")
  }

  return (
    <div className="min-h-screen pt-16" style={{ background: "var(--bg)" }}>

      {/* ── Sticky toolbar ── */}
      <div
        className="sticky top-16 z-30 backdrop-blur-sm"
        style={{ borderBottom: "1px solid var(--border)", background: "rgba(9,9,11,0.92)" }}
      >
        <div className="max-w-[1200px] mx-auto px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">

            {/* Title */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <motion.div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: "var(--accent)" }}
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.6, repeat: Infinity }}
                />
                <span
                  className="font-mono text-[10px] tracking-[0.2em]"
                  style={{ color: "var(--text-muted)" }}
                >
                  ACTIVE ROUTES
                </span>
              </div>
              <h1
                className="text-xl font-bold tracking-tight"
                style={{ color: "var(--text)", letterSpacing: "-0.02em" }}
              >
                Browse
              </h1>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 shrink-0">
              <Link to="/trips/new">
                <button
                  className="font-mono text-[10px] tracking-widest transition-colors px-4 py-2 rounded-sm"
                  style={{
                    background: "var(--accent)",
                    color: "#fff",
                    border: "1px solid var(--accent)",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--accent-dim)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "var(--accent)")}
                >
                  + TRIP
                </button>
              </Link>
              <Link to="/requests/new">
                <button
                  className="font-mono text-[10px] tracking-widest transition-colors px-4 py-2 rounded-sm"
                  style={{
                    background: "transparent",
                    color: "var(--text-muted)",
                    border: "1px solid var(--border)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "rgba(37,99,235,0.4)"
                    e.currentTarget.style.color = "var(--text)"
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--border)"
                    e.currentTarget.style.color = "var(--text-muted)"
                  }}
                >
                  + REQUEST
                </button>
              </Link>
              <Link to="/deliveries/new">
                <button
                  className="font-mono text-[10px] tracking-widest transition-colors px-4 py-2 rounded-sm"
                  style={{
                    background: "transparent",
                    color: "var(--text-muted)",
                    border: "1px solid var(--border)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "rgba(168,85,247,0.4)"
                    e.currentTarget.style.color = "#d8b4fe"
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--border)"
                    e.currentTarget.style.color = "var(--text-muted)"
                  }}
                >
                  + DELIVERY
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="max-w-[1200px] mx-auto px-6 pt-6 pb-0">
        <div
          className="mb-6"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "2px",
            padding: "16px 20px",
          }}
        >
          {/* Kind tabs + filter toggle */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-1.5 flex-wrap">
              {KINDS.map((k) => (
                <button
                  key={k}
                  onClick={() => setKind(k)}
                  className="font-mono text-[10px] tracking-[0.1em] px-3 py-1.5 rounded-sm transition-all"
                  style={
                    kind === k
                      ? { background: "var(--accent)", color: "#fff", border: "1px solid var(--accent)" }
                      : { background: "transparent", color: "var(--text-muted)", border: "1px solid var(--border)" }
                  }
                  onMouseEnter={(e) => {
                    if (kind !== k) {
                      e.currentTarget.style.borderColor = "rgba(37,99,235,0.4)"
                      e.currentTarget.style.color = "var(--text)"
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (kind !== k) {
                      e.currentTarget.style.borderColor = "var(--border)"
                      e.currentTarget.style.color = "var(--text-muted)"
                    }
                  }}
                >
                  {k.toUpperCase()}
                </button>
              ))}
            </div>

            <button
              onClick={() => setFiltersOpen(o => !o)}
              className="flex items-center gap-2 font-mono text-[10px] tracking-widest px-3 py-1.5 rounded-sm transition-all"
              style={{
                background: "transparent",
                color: filtersOpen || hasDateOrPrice ? "var(--accent)" : "var(--text-muted)",
                border: `1px solid ${filtersOpen || hasDateOrPrice ? "rgba(37,99,235,0.4)" : "var(--border)"}`,
              }}
            >
              <SlidersHorizontal size={11} />
              FILTERS
              {hasDateOrPrice && (
                <span
                  className="w-1.5 h-1.5 rounded-full ml-0.5"
                  style={{ background: "var(--accent)" }}
                />
              )}
            </button>
          </div>

          {/* City search */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-1">
            <CityAutocomplete
              label="From city"
              value={originValue}
              placeholder="Moscow, Istanbul…"
              compact
              onSelect={(city) => { setOriginCity(city); setOriginValue(city) }}
              onChange={(raw) => { setOriginValue(raw); setOriginCity(raw) }}
              onClear={() => { setOriginCity(""); setOriginValue("") }}
            />
            <CityAutocomplete
              label="To city"
              value={destValue}
              placeholder="Dubai, London…"
              compact
              onSelect={(city) => { setDestCity(city); setDestValue(city) }}
              onChange={(raw) => { setDestValue(raw); setDestCity(raw) }}
              onClear={() => { setDestCity(""); setDestValue("") }}
            />
          </div>

          {/* Expanded filters */}
          <AnimatePresence>
            {filtersOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.18 }}
                className="overflow-hidden"
              >
                <div
                  className="pt-4 mt-3 grid grid-cols-2 sm:grid-cols-4 gap-4"
                  style={{ borderTop: "1px solid var(--border)" }}
                >
                  <NumInput label="Min price ($)" value={priceMin} onChange={setPriceMin} placeholder="0"     min={0} max={10000} />
                  <NumInput label="Max price ($)" value={priceMax} onChange={setPriceMax} placeholder="9999"  min={0} max={10000} />
                  <DateInput label="Depart after"  value={departFrom} onChange={setDepartFrom} />
                  <DateInput label="Depart before" value={departTo}   onChange={setDepartTo} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Results ── */}
      <div className="max-w-[1200px] mx-auto px-6 pb-16">

        {/* Loading */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <motion.div
              className="w-5 h-5 rounded-full"
              style={{ border: "2px solid rgba(37,99,235,0.15)", borderTopColor: "var(--accent)" }}
              animate={{ rotate: 360 }}
              transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
            />
            <span
              className="font-mono text-[11px] tracking-widest"
              style={{ color: "var(--text-muted)" }}
            >
              LOADING ROUTES...
            </span>
          </div>
        )}

        {/* Error */}
        {isError && (
          <div className="text-center py-24">
            <p className="font-mono text-[12px] mb-2" style={{ color: "var(--destructive)" }}>
              ! FAILED TO LOAD LISTINGS
            </p>
            <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>
              Check your connection and try again.
            </p>
          </div>
        )}

        {/* Results */}
        {!isLoading && !isError && listings && (
          <>
            {/* Result count + clear */}
            <div className="flex items-center justify-between mb-5">
              <p className="font-mono text-[11px] tracking-widest" style={{ color: "var(--text-muted)" }}>
                {listings.length} RESULT{listings.length !== 1 ? "S" : ""}
                {(originCity || destCity) && (
                  <span className="ml-2" style={{ color: "var(--accent)", opacity: 0.8 }}>
                    {originCity && `FROM ${originCity.toUpperCase()}`}
                    {originCity && destCity && " → "}
                    {destCity && `TO ${destCity.toUpperCase()}`}
                  </span>
                )}
              </p>
              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1.5 font-mono text-[10px] tracking-widest transition-colors"
                  style={{ color: "var(--text-muted)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
                >
                  <X size={10} />
                  CLEAR ALL
                </button>
              )}
            </div>

            {/* Empty state */}
            {listings.length === 0 ? (
              <div
                className="text-center py-24 rounded-sm"
                style={{ border: "1px dashed var(--border)" }}
              >
                <div
                  className="text-5xl mb-5 font-mono"
                  style={{ color: "var(--text-faint)" }}
                >
                  —
                </div>
                <p className="text-[14px] mb-4" style={{ color: "var(--text-muted)" }}>
                  No listings match your filters.
                </p>
                <button
                  onClick={clearFilters}
                  className="font-mono text-[11px] tracking-widest transition-colors"
                  style={{ color: "var(--accent)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
                  onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
                >
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
