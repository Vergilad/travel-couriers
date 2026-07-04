import * as React from "react"
import { Link, useNavigate } from "@tanstack/react-router"
import { motion, AnimatePresence } from "framer-motion"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/lib/auth"
import { authedFetch } from "@/lib/api"
import type { Listing } from "@/types/listing"
import { formatListingDate } from "@/lib/listings"

const KIND_COLORS: Record<string, string> = {
  trip: "text-[#C8956A] border-[#C8956A]/30 bg-[#C8956A]/10",
  request: "text-[#7EB89A] border-[#7EB89A]/30 bg-[#7EB89A]/10",
  delivery: "text-[#8B9AE8] border-[#8B9AE8]/30 bg-[#8B9AE8]/10",
}

const STATUS_COLORS: Record<string, string> = {
  open: "text-[#7EB89A]",
  matched: "text-[#D4A855]",
  completed: "text-[#8C7B68]",
  cancelled: "text-[#C47B6B]",
}

type Tab = "all" | "open" | "cancelled"

async function fetchMyListings(): Promise<Listing[]> {
  const res = await authedFetch("/api/listings/mine")
  if (!res.ok) throw new Error("Failed to load your listings")
  return res.json()
}

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

function formatPrice(price: number | null | undefined, currency: string | null | undefined): string {
  if (!price) return "—"
  const symbol = currency === "USD" ? "$" : currency === "EUR" ? "€" : currency === "GBP" ? "£" : ""
  return symbol ? `${symbol}${price}` : `${price} ${currency ?? ""}`
}

function ConfirmModal({
  title, message, confirmLabel, danger, onConfirm, onCancel,
}: {
  title: string; message: string; confirmLabel: string; danger?: boolean;
  onConfirm: () => void; onCancel: () => void;
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
            className="px-5 py-2 text-[11px] tracking-widest text-[#8C7B68] hover:text-[#F4EDE4] transition-colors border border-[#2E2418] rounded-full"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            CANCEL
          </button>
          <button
            onClick={onConfirm}
            className={`px-5 py-2 text-[11px] tracking-widest font-bold rounded-full transition-colors ${
              danger
                ? "bg-[#C47B6B] hover:bg-[#D4846E] text-white"
                : "bg-[#C8956A] hover:bg-[#D4A855] text-[#0E0B08]"
            }`}
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {confirmLabel}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-listings"] })
      setConfirmClose(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteListing,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-listings"] })
      setConfirmDelete(null)
    },
  })

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-[#0E0B08] flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-[#C8956A]/20 border-t-[#C8956A] animate-spin" />
      </div>
    )
  }

  const filtered = (listings ?? []).filter((l) => {
    if (tab === "open") return l.status === "open"
    if (tab === "cancelled") return l.status === "cancelled" || l.status === "completed"
    return true
  })

  const openCount = (listings ?? []).filter(l => l.status === "open").length
  const closedCount = (listings ?? []).filter(l => l.status !== "open").length

  const closingListing = listings?.find(l => l.id === confirmClose)
  const deletingListing = listings?.find(l => l.id === confirmDelete)

  return (
    <>
      <AnimatePresence>
        {confirmClose && closingListing && (
          <ConfirmModal
            title="Close this listing?"
            message={`"${closingListing.title || `${closingListing.origin_city} → ${closingListing.dest_city}`}" will be marked as closed and removed from browse. You won't receive new contacts, but existing threads remain open.`}
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

      <div className="min-h-screen bg-[#0E0B08] pt-16">
        <div className="border-b border-[#1E1810]">
          <div className="max-w-[1000px] mx-auto px-6 py-8">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#D4A855] animate-pulse" />
                  <span className="text-[10px] tracking-[0.2em] text-[#8C7B68]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>MY ACCOUNT</span>
                </div>
                <h1 className="text-3xl text-[#F4EDE4]" style={{ fontFamily: "'DM Serif Display', serif" }}>My Listings</h1>
              </div>
              <div className="flex gap-2">
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

        <div className="max-w-[1000px] mx-auto px-6 py-8">
          <div className="flex items-center gap-1.5 mb-8">
            {([
              { key: "all", label: `ALL (${listings?.length ?? 0})` },
              { key: "open", label: `OPEN (${openCount})` },
              { key: "cancelled", label: `CLOSED (${closedCount})` },
            ] as const).map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-1.5 text-[10px] tracking-[0.12em] rounded-full border transition-all ${tab === t.key
                  ? "bg-[#C8956A] border-[#C8956A] text-[#0E0B08] font-bold"
                  : "border-[#2E2418] text-[#8C7B68] hover:border-[#C8956A]/30 hover:text-[#F4EDE4]"}`}
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {isLoading && (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="w-6 h-6 rounded-full border-2 border-[#C8956A]/20 border-t-[#C8956A] animate-spin" />
              <span className="text-[11px] tracking-widest text-[#8C7B68]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>LOADING YOUR LISTINGS...</span>
            </div>
          )}

          {isError && (
            <div className="text-center py-24">
              <p className="text-[#C47B6B] text-sm" style={{ fontFamily: "'JetBrains Mono', monospace" }}>! FAILED TO LOAD LISTINGS</p>
            </div>
          )}

          {!isLoading && !isError && (
            filtered.length === 0 ? (
              <div className="text-center py-24 border border-dashed border-[#2E2418] rounded-md">
                <div className="text-[48px] mb-4" style={{ fontFamily: "'DM Serif Display', serif", color: "transparent", WebkitTextStroke: "1px rgba(200,149,106,0.3)" }}>
                  {tab === "open" ? "∅" : "○"}
                </div>
                <p className="text-[#8C7B68] text-sm mb-6">
                  {tab === "open"
                    ? "No open listings. Post a trip, request, or delivery."
                    : tab === "cancelled"
                    ? "No closed listings yet."
                    : "You haven't posted any listings yet."}
                </p>
                {tab !== "cancelled" && (
                  <Link to="/trips/new">
                    <button className="px-6 py-2.5 bg-[#C8956A] hover:bg-[#D4A855] text-[#0E0B08] font-bold text-[10px] tracking-widest rounded-full transition-colors" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      POST YOUR FIRST TRIP
                    </button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="border border-[#1E1810] rounded-md overflow-hidden">
                <div className="hidden sm:grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 px-5 py-3 border-b border-[#1E1810] bg-[#0D0B08]"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  {["KIND", "ROUTE", "DATE", "PRICE", "ACTIONS"].map(h => (
                    <span key={h} className="text-[9px] tracking-[0.2em] text-[#8C7B68] uppercase">{h}</span>
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
                      className={`flex flex-col sm:grid sm:grid-cols-[auto_1fr_auto_auto_auto] gap-3 sm:gap-4 items-start sm:items-center px-5 py-4 border-b border-[#1A1208] last:border-0 hover:bg-[#111008] transition-colors group`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-sm text-[10px] tracking-widest border ${KIND_COLORS[listing.kind] ?? "text-[#8C7B68] border-[#2E2418] bg-white/5"}`}
                          style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                          {listing.kind.toUpperCase()}
                        </span>
                      </div>

                      <div className="min-w-0">
                        <Link to="/listings/$id" params={{ id: listing.id }}>
                          <p className="text-[13px] text-[#F4EDE4] hover:text-[#C8956A] transition-colors truncate max-w-[280px]">
                            {listing.title || `${listing.origin_city} → ${listing.dest_city}`}
                          </p>
                        </Link>
                        <p className="text-[11px] text-[#8C7B68] mt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                          {listing.origin_city} → {listing.dest_city}
                          <span className={`ml-3 ${STATUS_COLORS[listing.status] ?? "text-[#8C7B68]"}`}>
                            ● {listing.status.toUpperCase()}
                          </span>
                        </p>
                      </div>

                      <div className="text-[11px] text-[#8C7B68] shrink-0" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        {listing.depart_date ? formatListingDate(listing.depart_date) : "—"}
                      </div>

                      <div className="text-[12px] text-[#C8956A] shrink-0" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        {formatPrice(listing.price, listing.currency)}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {listing.status === "open" && (
                          <button
                            onClick={() => setConfirmClose(listing.id)}
                            disabled={closeMutation.isPending}
                            className="px-3 py-1.5 text-[10px] tracking-widest border border-[#2E2418] text-[#8C7B68] hover:border-[#D4A855]/40 hover:text-[#D4A855] rounded-full transition-colors disabled:opacity-40"
                            style={{ fontFamily: "'JetBrains Mono', monospace" }}
                          >
                            CLOSE
                          </button>
                        )}
                        <button
                          onClick={() => setConfirmDelete(listing.id)}
                          disabled={deleteMutation.isPending}
                          className="px-3 py-1.5 text-[10px] tracking-widest border border-[#2E2418] text-[#8C7B68] hover:border-[#C47B6B]/40 hover:text-[#C47B6B] rounded-full transition-colors disabled:opacity-40"
                          style={{ fontFamily: "'JetBrains Mono', monospace" }}
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
