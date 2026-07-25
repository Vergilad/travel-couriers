import * as React from "react"
import { Link, useNavigate } from "@tanstack/react-router"
import { motion, AnimatePresence } from "framer-motion"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/lib/auth"
import { authedFetch } from "@/lib/api"
import type { Listing } from "@/types/listing"
import { formatListingDate, formatPrice } from "@/lib/listings"

// ── Kind / status ─────────────────────────────────────────────────────────────
const KIND_STYLE: Record<string, React.CSSProperties> = {
  trip:     { background: "rgba(37,99,235,0.12)",  border: "1px solid rgba(37,99,235,0.30)",  color: "#93c5fd" },
  request:  { background: "rgba(34,197,94,0.10)",  border: "1px solid rgba(34,197,94,0.28)",  color: "#86efac" },
  delivery: { background: "rgba(168,85,247,0.10)", border: "1px solid rgba(168,85,247,0.28)", color: "#d8b4fe" },
}

const STATUS_COLOR: Record<string, string> = {
  open:      "var(--success)",
  matched:   "#fde047",
  completed: "var(--text-muted)",
  cancelled: "var(--destructive)",
}

type Tab = "all" | "open" | "cancelled"

async function fetchMyListings(): Promise<Listing[]> {
  const res = await authedFetch("/api/listings/mine")
  if (!res.ok) throw new Error("Failed to load your listings")
  return res.json()
}

async function closeListing(id: string) {
  const res = await authedFetch(`/api/listings/${id}`, { method: "PATCH", body: JSON.stringify({ status: "cancelled" }) })
  if (!res.ok) throw new Error("Failed to close listing")
  return res.json()
}

async function deleteListing(id: string) {
  const res = await authedFetch(`/api/listings/${id}`, { method: "DELETE" })
  if (!res.ok) throw new Error("Failed to delete listing")
  return res.json()
}


// ── Confirm modal ─────────────────────────────────────────────────────────────
function ConfirmModal({
  title, message, confirmLabel, danger, onConfirm, onCancel,
}: {
  title: string; message: string; confirmLabel: string;
  danger?: boolean; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center px-4 backdrop-blur-sm"
      style={{ background: "rgba(9,9,11,0.8)" }}
      onClick={onCancel}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.18 }}
        className="max-w-sm w-full p-6 rounded-sm"
        style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold mb-2" style={{ color: "var(--text)" }}>{title}</h3>
        <p className="text-sm leading-relaxed mb-6" style={{ color: "var(--text-muted)" }}>{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="font-mono text-[11px] tracking-widest rounded-sm px-5 py-2 transition-colors"
            style={{ color: "var(--text-muted)", border: "1px solid var(--border)" }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--text)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}
          >
            CANCEL
          </button>
          <button
            onClick={onConfirm}
            className="font-mono text-[11px] tracking-widest font-bold rounded-sm px-5 py-2 transition-colors"
            style={danger
              ? { background: "var(--destructive)", color: "#fff" }
              : { background: "var(--accent)", color: "#fff" }
            }
          >
            {confirmLabel}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export function MyListings() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [tab, setTab] = React.useState<Tab>("all")
  const [confirmClose, setConfirmClose] = React.useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: "/auth", search: { mode: "signin", redirect: "/my-listings" } })
    }
  }, [authLoading, user, navigate])

  const { data: listings, isLoading, isError } = useQuery({
    queryKey: ["my-listings"],
    queryFn: fetchMyListings,
    enabled: !!user,
  })

  const closeMutation = useMutation({
    mutationFn: closeListing,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["my-listings"] }); setConfirmClose(null) },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteListing,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["my-listings"] }); setConfirmDelete(null) },
  })

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <motion.div
          className="w-5 h-5 rounded-full"
          style={{ border: "2px solid rgba(37,99,235,0.15)", borderTopColor: "var(--accent)" }}
          animate={{ rotate: 360 }}
          transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
        />
      </div>
    )
  }

  const filtered = (listings ?? []).filter(l => {
    if (tab === "open") return l.status === "open"
    if (tab === "cancelled") return l.status === "cancelled" || l.status === "completed"
    return true
  })

  const openCount   = (listings ?? []).filter(l => l.status === "open").length
  const closedCount = (listings ?? []).filter(l => l.status !== "open").length
  const closingListing  = listings?.find(l => l.id === confirmClose)
  const deletingListing = listings?.find(l => l.id === confirmDelete)

  return (
    <>
      <AnimatePresence>
        {confirmClose && closingListing && (
          <ConfirmModal
            title="Close this listing?"
            message={`"${closingListing.title || `${closingListing.origin_city} → ${closingListing.dest_city}`}" will be marked closed and removed from browse. Existing threads remain open.`}
            confirmLabel="CLOSE LISTING"
            onConfirm={() => closeMutation.mutate(confirmClose)}
            onCancel={() => setConfirmClose(null)}
          />
        )}
        {confirmDelete && deletingListing && (
          <ConfirmModal
            title="Delete this listing?"
            message={`"${deletingListing.title || `${deletingListing.origin_city} → ${deletingListing.dest_city}`}" will be permanently removed. This cannot be undone.`}
            confirmLabel="DELETE"
            danger
            onConfirm={() => deleteMutation.mutate(confirmDelete)}
            onCancel={() => setConfirmDelete(null)}
          />
        )}
      </AnimatePresence>

      <div className="min-h-screen pt-16" style={{ background: "var(--bg)" }}>

        {/* ── Header ── */}
        <div style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="max-w-[1000px] mx-auto px-6 py-8">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <motion.div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: "var(--accent)" }}
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1.6, repeat: Infinity }}
                  />
                  <span className="font-mono text-[10px] tracking-[0.2em]" style={{ color: "var(--text-muted)" }}>
                    MY ACCOUNT
                  </span>
                </div>
                <h1 className="text-3xl font-bold tracking-tight" style={{ color: "var(--text)", letterSpacing: "-0.03em" }}>
                  My Listings
                </h1>
              </div>

              {/* Quick-post buttons */}
              <div className="flex gap-2">
                <Link to="/trips/new">
                  <button
                    className="font-mono text-[10px] tracking-widest rounded-sm px-4 py-2 transition-colors"
                    style={{ background: "var(--accent)", color: "#fff", border: "1px solid var(--accent)" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--accent-dim)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "var(--accent)")}
                  >
                    + TRIP
                  </button>
                </Link>
                <Link to="/requests/new">
                  <button
                    className="font-mono text-[10px] tracking-widest rounded-sm px-4 py-2 transition-colors"
                    style={{ background: "transparent", color: "var(--text-muted)", border: "1px solid var(--border)" }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = "rgba(34,197,94,0.4)"
                      e.currentTarget.style.color = "#86efac"
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = "var(--border)"
                      e.currentTarget.style.color = "var(--text-muted)"
                    }}
                  >
                    + REQUEST
                  </button>
                </Link>
                <Link to="/deliveries/new">
                  <button
                    className="font-mono text-[10px] tracking-widest rounded-sm px-4 py-2 transition-colors"
                    style={{ background: "transparent", color: "var(--text-muted)", border: "1px solid var(--border)" }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = "rgba(168,85,247,0.4)"
                      e.currentTarget.style.color = "#d8b4fe"
                    }}
                    onMouseLeave={e => {
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

        <div className="max-w-[1000px] mx-auto px-6 py-8">

          {/* ── Tab bar ── */}
          <div className="flex items-center gap-1.5 mb-8">
            {([
              { key: "all",       label: `ALL (${listings?.length ?? 0})` },
              { key: "open",      label: `OPEN (${openCount})` },
              { key: "cancelled", label: `CLOSED (${closedCount})` },
            ] as const).map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className="font-mono text-[10px] tracking-[0.1em] px-3 py-1.5 rounded-sm transition-all"
                style={
                  tab === t.key
                    ? { background: "var(--accent)", color: "#fff", border: "1px solid var(--accent)" }
                    : { background: "transparent", color: "var(--text-muted)", border: "1px solid var(--border)" }
                }
                onMouseEnter={e => { if (tab !== t.key) { e.currentTarget.style.borderColor = "rgba(37,99,235,0.4)"; e.currentTarget.style.color = "var(--text)" } }}
                onMouseLeave={e => { if (tab !== t.key) { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-muted)" } }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* ── Loading ── */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <motion.div
                className="w-5 h-5 rounded-full"
                style={{ border: "2px solid rgba(37,99,235,0.15)", borderTopColor: "var(--accent)" }}
                animate={{ rotate: 360 }}
                transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
              />
              <span className="font-mono text-[11px] tracking-widest" style={{ color: "var(--text-muted)" }}>
                LOADING YOUR LISTINGS...
              </span>
            </div>
          )}

          {/* ── Error ── */}
          {isError && (
            <div className="text-center py-24">
              <p className="font-mono text-sm" style={{ color: "var(--destructive)" }}>! FAILED TO LOAD LISTINGS</p>
            </div>
          )}

          {/* ── Results ── */}
          {!isLoading && !isError && (
            filtered.length === 0 ? (
              <div
                className="text-center py-24 rounded-sm"
                style={{ border: "1px dashed var(--border)" }}
              >
                <div className="font-mono text-5xl mb-5" style={{ color: "var(--text-faint)" }}>—</div>
                <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
                  {tab === "open"
                    ? "No open listings. Post a trip, request, or delivery."
                    : tab === "cancelled"
                    ? "No closed listings yet."
                    : "You haven't posted any listings yet."}
                </p>
                {tab !== "cancelled" && (
                  <Link to="/trips/new">
                    <button
                      className="font-mono font-bold text-[10px] tracking-widest rounded-sm px-6 py-2.5 transition-colors"
                      style={{ background: "var(--accent)", color: "#fff" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "var(--accent-dim)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "var(--accent)")}
                    >
                      POST YOUR FIRST TRIP
                    </button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="rounded-sm overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                {/* Table header */}
                <div
                  className="hidden sm:grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 px-5 py-3"
                  style={{ borderBottom: "1px solid var(--border)", background: "var(--surface)" }}
                >
                  {["KIND", "ROUTE", "DATE", "PRICE", "ACTIONS"].map(h => (
                    <span key={h} className="font-mono text-[9px] tracking-[0.2em] uppercase" style={{ color: "var(--text-muted)" }}>
                      {h}
                    </span>
                  ))}
                </div>

                <AnimatePresence mode="popLayout">
                  {filtered.map((listing, i) => (
                    <motion.div
                      key={listing.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2, delay: i * 0.03 }}
                      className="flex flex-col sm:grid sm:grid-cols-[auto_1fr_auto_auto_auto] gap-3 sm:gap-4 items-start sm:items-center px-5 py-4 transition-colors"
                      style={{ borderBottom: "1px solid var(--border)" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "var(--surface)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      {/* Kind badge */}
                      <div>
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-sm font-mono text-[10px] tracking-widest"
                          style={KIND_STYLE[listing.kind] ?? { background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
                        >
                          {listing.kind.toUpperCase()}
                        </span>
                      </div>

                      {/* Route + status */}
                      <div className="min-w-0">
                        <Link to="/listings/$id" params={{ id: listing.id }}>
                          <p
                            className="text-[13px] truncate max-w-[280px] transition-colors"
                            style={{ color: "var(--text)" }}
                            onMouseEnter={e => (e.currentTarget.style.color = "var(--accent)")}
                            onMouseLeave={e => (e.currentTarget.style.color = "var(--text)")}
                          >
                            {listing.title || `${listing.origin_city} → ${listing.dest_city}`}
                          </p>
                        </Link>
                        <p className="font-mono text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                          {listing.origin_city} → {listing.dest_city}
                          <span className="ml-3" style={{ color: STATUS_COLOR[listing.status] ?? "var(--text-muted)" }}>
                            ● {listing.status.toUpperCase()}
                          </span>
                        </p>
                      </div>

                      {/* Date */}
                      <div className="font-mono text-[11px] shrink-0" style={{ color: "var(--text-muted)" }}>
                        {listing.depart_date ? formatListingDate(listing.depart_date) : "—"}
                      </div>

                      {/* Price */}
                      <div className="font-mono text-[12px] shrink-0" style={{ color: "var(--accent)" }}>
                        {formatPrice(listing.price, listing.currency)}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        {listing.status === "open" && (
                          <button
                            onClick={() => setConfirmClose(listing.id)}
                            disabled={closeMutation.isPending}
                            className="font-mono text-[10px] tracking-widest rounded-sm px-3 py-1.5 transition-colors disabled:opacity-40"
                            style={{ border: "1px solid var(--border)", color: "var(--text-muted)" }}
                            onMouseEnter={e => {
                              e.currentTarget.style.borderColor = "rgba(234,179,8,0.4)"
                              e.currentTarget.style.color = "#fde047"
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.borderColor = "var(--border)"
                              e.currentTarget.style.color = "var(--text-muted)"
                            }}
                          >
                            CLOSE
                          </button>
                        )}
                        <button
                          onClick={() => setConfirmDelete(listing.id)}
                          disabled={deleteMutation.isPending}
                          className="font-mono text-[10px] tracking-widest rounded-sm px-3 py-1.5 transition-colors disabled:opacity-40"
                          style={{ border: "1px solid var(--border)", color: "var(--text-muted)" }}
                          onMouseEnter={e => {
                            e.currentTarget.style.borderColor = "rgba(239,68,68,0.4)"
                            e.currentTarget.style.color = "var(--destructive)"
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.borderColor = "var(--border)"
                            e.currentTarget.style.color = "var(--text-muted)"
                          }}
                        >
                          DELETE
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )
          )}
        </div>
      </div>
    </>
  )
}
