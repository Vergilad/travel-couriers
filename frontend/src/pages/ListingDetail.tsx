import * as React from "react"
import { useParams, Link, useNavigate } from "@tanstack/react-router"
import { motion, AnimatePresence } from "framer-motion"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/lib/auth"
import { authedFetch } from "@/lib/api"
import type { Listing } from "@/types/listing"
import { formatListingDate } from "@/lib/listings"

const KIND_COLORS: Record<string, string> = {
  trip: "bg-[#C8956A]/15 text-[#C8956A] border-[#C8956A]/30",
  request: "bg-[#7EB89A]/15 text-[#7EB89A] border-[#7EB89A]/30",
  delivery: "bg-[#8B9AE8]/15 text-[#8B9AE8] border-[#8B9AE8]/30",
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

function ContactButton({ listing }: { listing: ListingWithOwner }) {
  const { user, session } = useAuth()
  const navigate = useNavigate()
  const [contacting, setContacting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const label =
    listing.kind === "trip" ? "COURIER" : listing.kind === "delivery" ? "CARRIER" : "REQUESTER"

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
        <button className="w-full py-3.5 bg-[#C8956A] hover:bg-[#D4A855] text-[#0E0B08] font-bold tracking-widest text-[11px] rounded-full transition-colors" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
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
        className="w-full py-3.5 bg-[#C8956A] hover:bg-[#D4A855] disabled:opacity-60 disabled:cursor-wait text-[#0E0B08] font-bold tracking-widest text-[11px] rounded-full transition-colors"
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        {contacting ? "OPENING…" : `CONTACT ${label}`}
      </button>
      {error && (
        <p className="text-[11px] text-[#C47B6B] text-center mt-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          {error}
        </p>
      )}
    </>
  )
}

// ─── Owner actions (Close / Delete) ──────────────────────────────────────────
async function closeListing(id: string) {
  const res = await authedFetch(`/api/listings/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status: "cancelled" }),
  })
  if (!res.ok) throw new Error("Failed to close listing")
  return res.json()
}

async function deleteListing(id: string) {
  const res = await authedFetch(`/api/listings/${id}`, { method: "DELETE" })
  if (!res.ok) throw new Error("Failed to delete listing")
  return res.json()
}

function ConfirmModal({
  title,
  message,
  confirmLabel,
  danger,
  busy,
  onConfirm,
  onCancel,
}: {
  title: string
  message: string
  confirmLabel: string
  danger?: boolean
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0E0B08]/80 backdrop-blur-sm px-4"
      onClick={onCancel}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.18 }}
        className="bg-[#171109] border border-[#2E2418] rounded-md p-6 max-w-sm w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-[#F4EDE4] text-lg mb-2" style={{ fontFamily: "'DM Serif Display', serif" }}>{title}</h3>
        <p className="text-[#8C7B68] text-sm leading-relaxed mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={busy}
            className="px-5 py-2 text-[11px] tracking-widest text-[#8C7B68] hover:text-[#F4EDE4] transition-colors border border-[#2E2418] rounded-full disabled:opacity-40"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            CANCEL
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className={`px-5 py-2 text-[11px] tracking-widest font-bold rounded-full transition-colors disabled:opacity-60 ${
              danger
                ? "bg-[#C47B6B] hover:bg-[#D4846E] text-white"
                : "bg-[#C8956A] hover:bg-[#D4A855] text-[#0E0B08]"
            }`}
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {busy ? "…" : confirmLabel}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

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
            <Link
              to="/profile/$userId"
              params={{ userId: owner.id }}
              className="block bg-[#111008] border border-[#2E2418] rounded-md p-6 hover:border-[#C8956A]/40 transition-colors group"
            >
              <h3 className="text-[10px] tracking-[0.2em] text-[#8C7B68] mb-5 uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {listing.kind === "trip" ? "Traveler Profile" : listing.kind === "delivery" ? "Carrier Profile" : "Requester Profile"}
              </h3>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-[#1A1208] border border-[#2E2418] flex items-center justify-center shrink-0 overflow-hidden group-hover:border-[#C8956A]/40 transition-colors">
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
                    <span className="text-[#F4EDE4] text-lg group-hover:text-[#C8956A] transition-colors" style={{ fontFamily: "'DM Serif Display', serif" }}>
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
                <span className="text-[#3A2E20] text-[11px] tracking-widest group-hover:text-[#C8956A] transition-colors shrink-0 self-center" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  VIEW →
                </span>
              </div>
            </Link>
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
              <div className="space-y-3">
                <p className="text-center text-[11px] text-[#8C7B68] tracking-widest" style={{ fontFamily: "'JetBrains Mono', monospace" }}>YOUR LISTING</p>
                {listing.status === "open" && (
                  <button
                    onClick={() => setConfirmClose(true)}
                    className="w-full py-3 border border-[#2E2418] hover:border-[#D4A855]/40 text-[#8C7B68] hover:text-[#D4A855] text-[11px] tracking-widest rounded-full transition-colors"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    CLOSE LISTING
                  </button>
                )}
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="w-full py-3 border border-[#2E2418] hover:border-[#C47B6B]/40 text-[#8C7B68] hover:text-[#C47B6B] text-[11px] tracking-widest rounded-full transition-colors"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  DELETE LISTING
                </button>
              </div>
            ) : listing.status === "open" ? (
              <ContactButton listing={listing} />
            ) : (
              <button disabled className="w-full py-3.5 border border-[#2E2418] text-[#8C7B68] text-[11px] tracking-widest rounded-full cursor-not-allowed" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                LISTING CLOSED
              </button>
            )}

            {actionError && (
              <p className="text-[11px] text-[#C47B6B] text-center" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {actionError}
              </p>
            )}

            <p className="text-center text-[10px] text-[#3A2E20] mt-4 tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              SECURED BY TRAVEL COURIERS
            </p>
          </div>
        </motion.aside>
      </div>

      {/* Owner action confirm modals */}
      <AnimatePresence>
        {confirmClose && (
          <ConfirmModal
            title="Close this listing?"
            message={`"${listing.title || `${listing.origin_city} → ${listing.dest_city}`}" will be marked as closed and removed from browse. You won't receive new contacts, but existing messages remain open.`}
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
