import * as React from "react"
import { useParams, Link, useNavigate } from "@tanstack/react-router"
import { motion, AnimatePresence } from "framer-motion"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/lib/auth"
import { authedFetch } from "@/lib/api"
import type { Listing } from "@/types/listing"
import { formatListingDate } from "@/lib/listings"

// ── Kind / status config ──────────────────────────────────────────────────────
const KIND_BADGE_STYLE: Record<string, React.CSSProperties> = {
  trip:     { background: "rgba(37,99,235,0.12)",  border: "1px solid rgba(37,99,235,0.30)",  color: "#93c5fd" },
  request:  { background: "rgba(34,197,94,0.10)",  border: "1px solid rgba(34,197,94,0.28)",  color: "#86efac" },
  delivery: { background: "rgba(168,85,247,0.10)", border: "1px solid rgba(168,85,247,0.28)", color: "#d8b4fe" },
}

const FLEXIBILITY_LABELS: Record<string, string> = {
  exact: "Exact date",
  week: "±1 week flexible",
  month: "±1 month flexible",
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

// ── Star rating ───────────────────────────────────────────────────────────────
function StarRating({ rating, count }: { rating: number | null; count: number }) {
  if (!rating) return (
    <span className="font-mono text-[11px]" style={{ color: "var(--text-muted)" }}>No reviews yet</span>
  )
  const stars = Math.round(rating)
  return (
    <span className="flex items-center gap-0.5 font-mono text-[11px]">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} style={{ color: i < stars ? "var(--accent)" : "var(--text-faint)" }}>★</span>
      ))}
      {count > 0 && <span className="ml-1" style={{ color: "var(--text-muted)" }}>({count})</span>}
    </span>
  )
}

// ── Contact button ────────────────────────────────────────────────────────────
function ContactButton({ listing }: { listing: ListingWithOwner }) {
  const { user, session } = useAuth()
  const navigate = useNavigate()
  const [contacting, setContacting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const label = listing.kind === "trip" ? "COURIER" : listing.kind === "delivery" ? "CARRIER" : "REQUESTER"

  async function handleContact() {
    if (!session?.access_token) return
    setContacting(true)
    setError(null)
    try {
      const res = await fetch(`/api/threads?listing_id=${listing.id}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.detail ?? "Failed to start conversation")
      }
      const thread = await res.json()
      navigate({ to: "/messages/$threadId", params: { threadId: thread.id } })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong")
      setContacting(false)
    }
  }

  if (!user) {
    return (
      <Link to="/auth" search={{ mode: "signin", redirect: undefined }}>
        <button
          className="w-full font-mono font-bold tracking-widest text-[11px] rounded-sm transition-colors"
          style={{ background: "var(--accent)", color: "#fff", padding: "12px 0" }}
          onMouseEnter={e => (e.currentTarget.style.background = "var(--accent-dim)")}
          onMouseLeave={e => (e.currentTarget.style.background = "var(--accent)")}
        >
          SIGN IN TO CONTACT
        </button>
      </Link>
    )
  }

  return (
    <>
      <button
        onClick={handleContact}
        disabled={contacting}
        className="w-full font-mono font-bold tracking-widest text-[11px] rounded-sm transition-colors disabled:opacity-60 disabled:cursor-wait"
        style={{ background: "var(--accent)", color: "#fff", padding: "12px 0" }}
        onMouseEnter={e => { if (!contacting) e.currentTarget.style.background = "var(--accent-dim)" }}
        onMouseLeave={e => (e.currentTarget.style.background = "var(--accent)")}
      >
        {contacting ? "OPENING…" : `CONTACT ${label}`}
      </button>
      {error && (
        <p className="font-mono text-[11px] text-center mt-2" style={{ color: "var(--destructive)" }}>{error}</p>
      )}
    </>
  )
}

// ── Mutations ─────────────────────────────────────────────────────────────────
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
  title, message, confirmLabel, danger, busy, onConfirm, onCancel,
}: {
  title: string; message: string; confirmLabel: string;
  danger?: boolean; busy?: boolean; onConfirm: () => void; onCancel: () => void;
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
            disabled={busy}
            className="font-mono text-[11px] tracking-widest rounded-sm px-5 py-2 transition-colors disabled:opacity-40"
            style={{ color: "var(--text-muted)", border: "1px solid var(--border)" }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--text)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}
          >
            CANCEL
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className="font-mono text-[11px] tracking-widest font-bold rounded-sm px-5 py-2 transition-colors disabled:opacity-60"
            style={danger
              ? { background: "var(--destructive)", color: "#fff" }
              : { background: "var(--accent)", color: "#fff" }
            }
          >
            {busy ? "…" : confirmLabel}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Meta chip ─────────────────────────────────────────────────────────────────
function MetaCell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-mono text-[9px] tracking-[0.2em] mb-1.5 uppercase" style={{ color: "var(--text-muted)" }}>{label}</p>
      <div className="font-mono text-sm" style={{ color: "var(--text)" }}>{children}</div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export function ListingDetail() {
  const { id } = useParams({ strict: false })
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [confirmClose, setConfirmClose] = React.useState(false)
  const [confirmDelete, setConfirmDelete] = React.useState(false)
  const [actionError, setActionError] = React.useState<string | null>(null)

  const { data: listing, isLoading, isError } = useQuery({
    queryKey: ["listing", id],
    queryFn: () => fetchListing(id as string),
    enabled: !!id,
  })

  const closeMutation = useMutation({
    mutationFn: () => closeListing(id as string),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["listing", id] })
      queryClient.invalidateQueries({ queryKey: ["my-listings"] })
      queryClient.invalidateQueries({ queryKey: ["listings"] })
      setConfirmClose(false)
    },
    onError: (e: unknown) => setActionError(e instanceof Error ? e.message : "Failed to close"),
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteListing(id as string),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-listings"] })
      queryClient.invalidateQueries({ queryKey: ["listings"] })
      navigate({ to: "/browse" })
    },
    onError: (e: unknown) => {
      setActionError(e instanceof Error ? e.message : "Failed to delete")
      setConfirmDelete(false)
    },
  })

  // ── Loading ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen pt-16 flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <div className="flex flex-col items-center gap-4">
          <motion.div
            className="w-5 h-5 rounded-full"
            style={{ border: "2px solid rgba(37,99,235,0.15)", borderTopColor: "var(--accent)" }}
            animate={{ rotate: 360 }}
            transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
          />
          <span className="font-mono text-[11px] tracking-widest" style={{ color: "var(--text-muted)" }}>
            LOADING MANIFEST...
          </span>
        </div>
      </div>
    )
  }

  // ── Error / 404 ──────────────────────────────────────────────────────────
  if (isError || !listing) {
    return (
      <div className="min-h-screen pt-16 flex flex-col items-center justify-center text-center px-6" style={{ background: "var(--bg)" }}>
        <div className="font-mono text-[64px] mb-4 font-bold" style={{ color: "var(--text-faint)" }}>404</div>
        <h2 className="text-2xl font-bold mb-3" style={{ color: "var(--text)" }}>Listing Not Found</h2>
        <p className="text-sm mb-8" style={{ color: "var(--text-muted)" }}>This route could not be located in the system.</p>
        <Link to="/browse">
          <button
            className="font-mono text-[11px] tracking-widest rounded-sm px-6 py-2.5 transition-colors"
            style={{ border: "1px solid var(--border)", color: "var(--text-muted)" }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = "rgba(37,99,235,0.4)"
              e.currentTarget.style.color = "var(--text)"
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = "var(--border)"
              e.currentTarget.style.color = "var(--text-muted)"
            }}
          >
            ← BACK TO BROWSE
          </button>
        </Link>
      </div>
    )
  }

  const owner = listing.owner
  const isOwn = user?.id === listing.owner_id
  const priceDisplay = formatPrice(listing.price, listing.currency)
  const hasDates = listing.depart_date || listing.arrive_date
  const kindStyle = KIND_BADGE_STYLE[listing.kind] ?? {}

  return (
    <div className="min-h-screen pt-16" style={{ background: "var(--bg)" }}>

      {/* Breadcrumb */}
      <div style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="max-w-[1100px] mx-auto px-6 py-3">
          <Link to="/browse">
            <button
              className="font-mono text-[11px] tracking-widest transition-colors"
              style={{ color: "var(--text-muted)" }}
              onMouseEnter={e => (e.currentTarget.style.color = "var(--accent)")}
              onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}
            >
              ← BACK TO BROWSE
            </button>
          </Link>
        </div>
      </div>

      <div className="max-w-[1100px] mx-auto px-6 py-10 flex flex-col lg:flex-row gap-12">

        {/* ── Main ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex-1 min-w-0"
        >
          {/* Kind + status row */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-sm font-mono text-[10px] tracking-widest"
              style={kindStyle}
            >
              {listing.kind.toUpperCase()}
            </span>
            <span
              className="font-mono text-[10px] tracking-widest flex items-center gap-1.5"
              style={{ color: listing.status === "open" ? "var(--success)" : "var(--text-muted)" }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: listing.status === "open" ? "var(--success)" : "var(--text-muted)" }}
              />
              {listing.status.toUpperCase()}
            </span>
          </div>

          {/* Title */}
          <h1
            className="text-3xl md:text-4xl font-bold leading-tight mb-5"
            style={{ color: "var(--text)", letterSpacing: "-0.03em" }}
          >
            {listing.title || `${listing.origin_city} → ${listing.dest_city}`}
          </h1>

          {/* Route */}
          <div className="flex items-center gap-2 font-mono text-base mb-6">
            <span style={{ color: "var(--text)" }}>{listing.origin_city}</span>
            {listing.origin_country && (
              <span className="text-sm" style={{ color: "var(--text-muted)" }}>{listing.origin_country}</span>
            )}
            <span className="mx-1 text-lg" style={{ color: "var(--accent)" }}>→</span>
            <span style={{ color: "var(--text)" }}>{listing.dest_city}</span>
            {listing.dest_country && (
              <span className="text-sm" style={{ color: "var(--text-muted)" }}>{listing.dest_country}</span>
            )}
          </div>

          {/* Meta chips */}
          {(hasDates || listing.capacity_kg) && (
            <div
              className="flex flex-wrap gap-8 py-5 mb-8"
              style={{ borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}
            >
              {listing.depart_date && (
                <MetaCell label="Departure">
                  {formatListingDate(listing.depart_date)}
                  {listing.date_flexibility && listing.date_flexibility !== "exact" && (
                    <p className="font-mono text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                      {FLEXIBILITY_LABELS[listing.date_flexibility]}
                    </p>
                  )}
                </MetaCell>
              )}
              {listing.arrive_date && (
                <MetaCell label="Arrival">{formatListingDate(listing.arrive_date)}</MetaCell>
              )}
              {listing.capacity_kg && (
                <MetaCell label="Capacity">{listing.capacity_kg} kg</MetaCell>
              )}
            </div>
          )}

          {/* Description */}
          <div className="mb-10">
            <h2 className="font-mono text-[10px] tracking-[0.2em] mb-4 uppercase" style={{ color: "var(--text-muted)" }}>
              Details
            </h2>
            <p className="leading-relaxed text-[15px]" style={{ color: "var(--text-muted)" }}>
              {listing.description || "No additional details provided for this listing."}
            </p>
          </div>

          {/* Owner card */}
          {owner && (
            <Link to="/profile/$userId" params={{ userId: owner.id }} className="block group">
              <div
                className="p-6 rounded-sm transition-all"
                style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(37,99,235,0.35)")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}
              >
                <h3 className="font-mono text-[10px] tracking-[0.2em] mb-5 uppercase" style={{ color: "var(--text-muted)" }}>
                  {listing.kind === "trip" ? "Traveler Profile" : listing.kind === "delivery" ? "Carrier Profile" : "Requester Profile"}
                </h3>
                <div className="flex items-center gap-4">
                  <div
                    className="w-14 h-14 rounded-sm flex items-center justify-center shrink-0 overflow-hidden"
                    style={{ background: "rgba(37,99,235,0.08)", border: "1px solid rgba(37,99,235,0.2)" }}
                  >
                    {owner.avatar_url ? (
                      <img src={owner.avatar_url} alt={owner.display_name ?? "User"} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xl font-bold" style={{ color: "var(--accent)" }}>
                        {(owner.display_name ?? "?").charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap mb-1.5">
                      <span className="text-lg font-semibold" style={{ color: "var(--text)" }}>
                        {owner.display_name ?? "Anonymous"}
                      </span>
                      <StarRating rating={owner.rating} count={owner.review_count ?? 0} />
                    </div>
                    {(owner.city || owner.country) && (
                      <p className="font-mono text-[12px] mb-1" style={{ color: "var(--text-muted)" }}>
                        {[owner.city, owner.country].filter(Boolean).join(", ")}
                      </p>
                    )}
                    {owner.bio && (
                      <p className="text-[13px] leading-relaxed line-clamp-2" style={{ color: "var(--text-muted)" }}>{owner.bio}</p>
                    )}
                  </div>
                  <span
                    className="font-mono text-[11px] tracking-widest shrink-0 self-center transition-colors"
                    style={{ color: "var(--text-faint)" }}
                  >
                    VIEW →
                  </span>
                </div>
              </div>
            </Link>
          )}
        </motion.div>

        {/* ── Sidebar ── */}
        <motion.aside
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="w-full lg:w-[280px] shrink-0"
        >
          <div
            className="sticky top-24 rounded-sm p-6"
            style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}
          >
            {/* Price */}
            <div className="mb-5">
              <p className="font-mono text-[9px] tracking-[0.2em] mb-2 uppercase" style={{ color: "var(--text-muted)" }}>
                {listing.kind === "request" ? "Offered Reward" : "Price"}
              </p>
              <p
                className="text-3xl font-bold"
                style={{ color: "var(--accent)", letterSpacing: "-0.02em" }}
              >
                {priceDisplay}
              </p>
              {listing.currency && listing.price && (
                <p className="font-mono text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>{listing.currency}</p>
              )}
            </div>

            {/* Status */}
            <div
              className="flex items-center gap-2 mb-5 py-3"
              style={{ borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}
            >
              <motion.div
                className="w-2 h-2 rounded-full"
                style={{
                  background: listing.status === "open" ? "var(--success)" : "var(--text-muted)",
                  boxShadow: listing.status === "open" ? "0 0 8px rgba(34,197,94,0.5)" : "none",
                }}
                animate={listing.status === "open" ? { opacity: [1, 0.4, 1] } : {}}
                transition={{ duration: 1.6, repeat: Infinity }}
              />
              <span className="font-mono text-[11px] tracking-widest" style={{ color: "var(--text-muted)" }}>
                {listing.status.toUpperCase()}
              </span>
            </div>

            {/* Actions */}
            {isOwn ? (
              <div className="space-y-3">
                <p className="text-center font-mono text-[11px] tracking-widest" style={{ color: "var(--text-muted)" }}>
                  YOUR LISTING
                </p>
                {listing.status === "open" && (
                  <button
                    onClick={() => setConfirmClose(true)}
                    className="w-full font-mono text-[11px] tracking-widest rounded-sm py-3 transition-colors"
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
                    CLOSE LISTING
                  </button>
                )}
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="w-full font-mono text-[11px] tracking-widest rounded-sm py-3 transition-colors"
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
                  DELETE LISTING
                </button>
              </div>
            ) : listing.status === "open" ? (
              <ContactButton listing={listing} />
            ) : (
              <button
                disabled
                className="w-full font-mono text-[11px] tracking-widest rounded-sm py-3 cursor-not-allowed"
                style={{ border: "1px solid var(--border)", color: "var(--text-muted)", opacity: 0.5 }}
              >
                LISTING CLOSED
              </button>
            )}

            {actionError && (
              <p className="font-mono text-[11px] text-center mt-3" style={{ color: "var(--destructive)" }}>
                {actionError}
              </p>
            )}

            <p className="text-center font-mono text-[10px] mt-4 tracking-wider" style={{ color: "var(--text-faint)" }}>
              SECURED BY PEREGRI
            </p>
          </div>
        </motion.aside>
      </div>

      {/* Confirm modals */}
      <AnimatePresence>
        {confirmClose && (
          <ConfirmModal
            title="Close this listing?"
            message={`"${listing.title || `${listing.origin_city} → ${listing.dest_city}`}" will be marked closed and removed from browse. Existing messages remain open.`}
            confirmLabel="CLOSE LISTING"
            busy={closeMutation.isPending}
            onConfirm={() => closeMutation.mutate()}
            onCancel={() => setConfirmClose(false)}
          />
        )}
        {confirmDelete && (
          <ConfirmModal
            title="Delete this listing?"
            message={`"${listing.title || `${listing.origin_city} → ${listing.dest_city}`}" will be permanently removed along with its messages. This cannot be undone.`}
            confirmLabel="DELETE"
            danger
            busy={deleteMutation.isPending}
            onConfirm={() => deleteMutation.mutate()}
            onCancel={() => setConfirmDelete(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
