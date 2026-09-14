/**
 * Browse as a manifest: one sheet of transit paperwork, not a dashboard of
 * floating cards. The search block is a field, every result is a ledger row
 * separated by the sheet's own rules. No card boxes, no glow hovers: rows
 * highlight in the field language on hover and press like everything else.
 *
 * Search state is identical to before (route + side + anchor date +
 * flexibility chips); only the reading surface changed.
 */
import * as React from "react"
import { Link } from "@tanstack/react-router"
import { useQuery, keepPreviousData } from "@tanstack/react-query"
import { IconX } from "@tabler/icons-react"
import type { Listing, ListingKind } from "@/types/listing"
import { formatPrice, formatListingDate } from "@/lib/listings"
import { CityAutocomplete } from "@/components/CityAutocomplete"
import { useTranslation } from "@/i18n/I18nContext"

// ── Kind badge ────────────────────────────────────────────────────────────────

function KindBadge({ kind }: { kind: ListingKind }) {
  const { t } = useTranslation()
  return (
    <span className="stencil-chip" data-side={kind}>
      {t(`kinds.${kind}`)}
    </span>
  )
}

// ── Ledger row ────────────────────────────────────────────────────────────────

function ListingRow({ listing }: { listing: Listing }) {
  const { t } = useTranslation()
  return (
    <Link to="/listings/$id" params={{ id: listing.id }} className="manifest-row field-row">
      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <KindBadge kind={listing.kind} />
        {listing.kind === "need" && listing.needs_purchase && (
          <span className="stencil-chip" data-side="buy">
            {t("listings.buy_badge")}
          </span>
        )}
      </span>

      <span style={{ minWidth: 0 }}>
        <span className="font-display" style={{ fontSize: "1.05rem", display: "block" }}>
          {listing.title || `${listing.origin_city} → ${listing.dest_city}`}
        </span>
        <span className="font-label field-dim" style={{ display: "block", marginTop: 4 }}>
          {listing.origin_city} &rarr; {listing.dest_city}
        </span>
        {listing.description && (
          <span
            className="copy"
            style={{
              display: "block",
              marginTop: 6,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {listing.description}
          </span>
        )}
      </span>

      <span className="font-label field-dim" style={{ whiteSpace: "nowrap" }}>
        {listing.depart_date ? (
          <>
            {formatListingDate(listing.depart_date)}
            {(listing as unknown as { date_flexibility?: string }).date_flexibility &&
              (listing as unknown as { date_flexibility?: string }).date_flexibility !== "exact" && (
                <span style={{ marginLeft: 6, opacity: 0.7 }}>
                  {(listing as unknown as { date_flexibility?: string }).date_flexibility === "week"
                    ? "±1w"
                    : "±1mo"}
                </span>
              )}
          </>
        ) : (
          t("listings.flexible")
        )}
      </span>

      <span
        className="font-label"
        style={{ whiteSpace: "nowrap", fontSize: "0.95rem", color: "var(--text)" }}
      >
        {listing.price
          ? formatPrice(listing.price, listing.currency)
          : t("listings.negotiate")}
      </span>

      {(listing as unknown as { owner_display_name?: string | null }).owner_display_name && (
        <span className="font-label field-dim" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <span className="tickbox" aria-hidden="true" style={{ width: 20, height: 20, fontSize: 11 }}>
            {(listing as unknown as { owner_display_name: string }).owner_display_name
              .charAt(0)
              .toUpperCase()}
          </span>
          {(listing as unknown as { owner_display_name: string }).owner_display_name}
        </span>
      )}
    </Link>
  )
}

// ── Data fetching ─────────────────────────────────────────────────────────────

const KINDS = ["all", "carry", "need"] as const

async function fetchListings(params: {
  kind: string; originCity: string; destCity: string;
  aroundDate: string;
}): Promise<Listing[]> {
  const q = new URLSearchParams({ status: "open", limit: "40" })
  if (params.kind && params.kind !== "all") q.set("kind", params.kind)
  if (params.originCity) q.set("origin_city", params.originCity)
  if (params.destCity) q.set("dest_city", params.destCity)
  // One anchor date. Listings match through their own flexibility window,
  // so a 6 April listing with a +-week flag matches a 3 April search
  // with no extra control.
  if (params.aroundDate) {
    q.set("depart_from", params.aroundDate)
    q.set("depart_to", params.aroundDate)
  }
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
  const { t } = useTranslation()
  const params = new URLSearchParams(window.location.search)
  const initOrigin = params.get("origin_city") ?? ""
  const initDest   = params.get("dest_city") ?? ""

  const [kind, setKind]                 = React.useState("all")
  const [originCity, setOriginCity]     = React.useState(initOrigin)
  const [destCity, setDestCity]         = React.useState(initDest)
  const [originValue, setOriginValue]   = React.useState(initOrigin)
  const [destValue, setDestValue]       = React.useState(initDest)
  const [aroundDate, setAroundDate]     = React.useState("")

  const dOrigin   = useDebounced(originCity, 400)
  const dDest     = useDebounced(destCity, 400)

  const { data: listings, isLoading, isError } = useQuery({
    queryKey: ["listings", kind, dOrigin, dDest, aroundDate],
    queryFn: () => fetchListings({
      kind, originCity: dOrigin, destCity: dDest,
      aroundDate,
    }),
    // Keep the old rows on screen while the next filter resolves.
    // Without this every tap flashes skeletons for a frame.
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  })

  const hasFilters = originCity || destCity || aroundDate || kind !== "all"

  function clearFilters() {
    setKind("all")
    setOriginCity(""); setOriginValue("")
    setDestCity("");   setDestValue("")
    setAroundDate("")
  }

  return (
    <div className="manifest">
      {/* ── Search field ── */}
      <section className="manifest-field">
        <div className="closing-row" style={{ marginTop: 0 }}>
          <h1 className="font-display" style={{ fontSize: "var(--t-h2)", margin: 0 }}>
            {t("navigation.browse")}
          </h1>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            <Link to="/carry/new" className="btn btn--primary press">
              {t("listings.post_carry")}
            </Link>
            <Link to="/need/new" className="btn btn--teal press">
              {t("listings.post_need")}
            </Link>
          </div>
        </div>

        <div className="field-rule" aria-hidden="true" style={{ marginTop: 20, marginBottom: 20 }} />

        <h2 className="field-caption">{t("listings.route_search")}</h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 14,
          }}
        >
          <CityAutocomplete
            label={t("listings.from_city")}
            value={originValue}
            placeholder={t("listings.from_placeholder")}
            compact
            onSelect={(city) => { setOriginCity(city); setOriginValue(city) }}
            onChange={(raw) => { setOriginValue(raw); setOriginCity(raw) }}
            onClear={() => { setOriginCity(""); setOriginValue("") }}
          />
          <CityAutocomplete
            label={t("listings.to_city")}
            value={destValue}
            placeholder={t("listings.to_placeholder")}
            compact
            onSelect={(city) => { setDestCity(city); setDestValue(city) }}
            onChange={(raw) => { setDestValue(raw); setDestCity(raw) }}
            onClear={() => { setDestCity(""); setDestValue("") }}
          />
        </div>

        <div style={{ marginTop: 18 }}>
          <label style={{ display: "grid", gap: 6, minWidth: 0, maxWidth: 420 }}>
            <span className="font-label field-dim">{t("listings.around_date")}</span>
            <input
              type="date"
              className="route-input"
              value={aroundDate}
              onChange={(e) => setAroundDate(e.target.value)}
            />
          </label>
        </div>

        <div className="seg" role="group" aria-label={t("listings.kind")} style={{ marginTop: 18 }}>
          {KINDS.map((k) => (
            <button
              key={k}
              type="button"
              className="seg-btn font-label"
              aria-pressed={kind === k}
              data-active={kind === k || undefined}
              onClick={() => setKind(k)}
            >
              {k === "all" ? t("listings.all") : t(`kinds.${k}`)}
            </button>
          ))}
        </div>
      </section>

      {/* ── Result count ── */}
      <div
        className="manifest-field"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <p className="font-label field-dim" style={{ margin: 0 }}>
          {isLoading ? t("listings.loading_routes") : `${listings?.length ?? 0} ${t("listings.results")}`}
          {(originCity || destCity) && !isLoading && (
            <span style={{ marginLeft: 10, color: "var(--text)" }}>
              {originCity && `${originCity.toUpperCase()}`}
              {originCity && destCity && " → "}
              {destCity && `${destCity.toUpperCase()}`}
            </span>
          )}
        </p>
        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="font-label"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              cursor: "pointer",
              background: "none",
              border: 0,
              padding: 0,
              color: "var(--text-muted)",
            }}
          >
            <IconX size={12} stroke={2} aria-hidden="true" />
            {t("listings.clear_all")}
          </button>
        )}
      </div>

      {/* ── Rows ── */}
      {isLoading && (
        <div className="manifest-field" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skel" style={{ height: 76, marginBottom: i < 2 ? 12 : 0 }} />
          ))}
        </div>
      )}

      {isError && (
        <div className="manifest-field">
          <p className="copy" style={{ color: "var(--destructive)" }}>
            {t("listings.failed_to_load")}
          </p>
          <p className="copy ink-dim" style={{ marginTop: 8 }}>
            {t("listings.check_connection")}
          </p>
        </div>
      )}

      {!isLoading && !isError && listings && listings.length === 0 && (
        <div className="manifest-field" style={{ textAlign: "left" }}>
          <p className="font-display" style={{ fontSize: "var(--t-h3)", margin: 0 }}>
            {t("listings.no_matching")}
          </p>
          <button
            type="button"
            onClick={clearFilters}
            className="btn btn--ghost"
            style={{ marginTop: 16 }}
          >
            {t("listings.clear_filters")}
          </button>
        </div>
      )}

      {!isLoading && !isError && listings && listings.length > 0 && (
        <nav aria-label={t("listings.results")} style={{ display: "grid", gap: "var(--bw)", background: "var(--line)" }}>
          {listings.map((listing) => (
            <ListingRow key={listing.id} listing={listing} />
          ))}
        </nav>
      )}
    </div>
  )
}
