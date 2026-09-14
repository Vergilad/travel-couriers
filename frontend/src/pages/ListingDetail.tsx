/**
 * Listing detail as a manifest: header field, meta strip, details,
 * owner, and a sidebar field with price and the one action that matters.
 * Same data flow as before; only the reading surface changed.
 */
import * as React from "react"
import { useParams, Link, useNavigate } from "@tanstack/react-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/lib/auth"
import { authedFetch } from "@/lib/api"
import type { Listing } from "@/types/listing"
import { formatListingDate, formatPrice } from "@/lib/listings"
import { VerifiedBadge, UnverifiedBadge } from "@/components/VerifiedBadge"
import { UnverifiedWarningModal } from "@/components/UnverifiedWarningModal"
import { useTranslation } from "@/i18n/I18nContext"

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
    identity_verified?: boolean
  } | null
}

async function fetchListing(id: string): Promise<ListingWithOwner> {
  const res = await fetch(`/api/listings/${id}`)
  if (!res.ok) throw new Error("Listing not found")
  return res.json()
}

// ── Star rating ───────────────────────────────────────────────────────────────
function StarRating({ rating, count }: { rating: number | null; count: number }) {
  const { t } = useTranslation()
  if (!rating) return (
    <span className="font-label field-dim">{t("listings.no_reviews")}</span>
  )
  const stars = Math.round(rating)
  return (
    <span className="font-label" style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} style={{ color: i < stars ? "var(--text)" : "var(--text-faint)" }}>★</span>
      ))}
      {count > 0 && <span className="field-dim" style={{ marginLeft: 4 }}>({count})</span>}
    </span>
  )
}

// ── Contact button ────────────────────────────────────────────────────────────
function ContactButton({ listing }: { listing: ListingWithOwner }) {
  const { t } = useTranslation()
  const { user, session } = useAuth()
  const navigate = useNavigate()
  const [contacting, setContacting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [showWarning, setShowWarning] = React.useState(false)

  const label = listing.kind === "carry" ? t("listings.contact_carry") : t("listings.contact_need")
  const ownerVerified = listing.owner?.identity_verified ?? null

  async function doContact() {
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

  function handleContact() {
    if (ownerVerified === false) {
      setShowWarning(true)
      return
    }
    doContact()
  }

  if (!user) {
    return (
      <Link to="/auth" search={{ mode: "signin", redirect: undefined }} className="btn btn--primary press" style={{ width: "100%" }}>
        {t("listings.sign_in_to_contact")}
      </Link>
    )
  }

  return (
    <>
      <button
        onClick={handleContact}
        disabled={contacting}
        className="btn btn--primary press"
        style={{ width: "100%", opacity: contacting ? 0.6 : 1 }}
      >
        {contacting ? t("listings.opening") : label}
      </button>
      {error && (
        <p className="copy" style={{ color: "var(--destructive)", textAlign: "center", marginTop: 10 }}>{error}</p>
      )}
      {showWarning && (
        <UnverifiedWarningModal
          variant="contact"
          otherName={listing.owner?.display_name ?? "This user"}
          onProceed={() => { setShowWarning(false); doContact() }}
          onCancel={() => setShowWarning(false)}
        />
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: "color-mix(in srgb, var(--ground) 82%, transparent)" }}
      onClick={onCancel}
    >
      <div
        className="w-full"
        style={{
          maxWidth: 420,
          background: "var(--sheet)",
          border: "var(--bw) solid var(--line)",
          boxShadow: "var(--shadow)",
          padding: "var(--tile-pad)",
        }}
        onClick={e => e.stopPropagation()}
      >
        <h3 className="font-display" style={{ fontSize: "var(--t-h3)", margin: 0 }}>{title}</h3>
        <p className="copy ink-dim" style={{ marginTop: 10 }}>{message}</p>
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 20 }}>
          <button
            onClick={onCancel}
            disabled={busy}
            className="btn btn--ghost"
            style={{ opacity: busy ? 0.4 : 1 }}
          >
            CANCEL
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className="btn btn--primary press"
            style={danger ? { background: "var(--destructive)", borderColor: "var(--destructive)" } : undefined}
          >
            {busy ? "…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Meta cell ─────────────────────────────────────────────────────────────────
function MetaCell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-label field-dim" style={{ margin: "0 0 8px" }}>{label}</p>
      <div className="copy" style={{ fontWeight: 500 }}>{children}</div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export function ListingDetail() {
  const { t } = useTranslation()
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
      <div className="manifest">
        <div className="manifest-field" aria-hidden="true">
          <div className="skel" style={{ height: 180 }} />
        </div>
      </div>
    )
  }

  // ── Error / 404 ──────────────────────────────────────────────────────────
  if (isError || !listing) {
    return (
      <div className="manifest">
        <div className="manifest-field" style={{ textAlign: "left" }}>
          <h2 className="field-caption">404</h2>
          <h1 className="font-display" style={{ fontSize: "var(--t-h2)", margin: 0 }}>
            {t("listings.listing_not_found")}
          </h1>
          <p className="copy ink-dim" style={{ marginTop: 12 }}>
            {t("listings.not_found_message")}
          </p>
          <Link to="/browse" className="btn btn--ghost" style={{ marginTop: 20 }}>
            {t("listings.back_to_browse")}
          </Link>
        </div>
      </div>
    )
  }

  const owner = listing.owner
  const isOwn = user?.id === listing.owner_id
  const priceDisplay = formatPrice(listing.price, listing.currency)
  const hasDates = listing.depart_date || listing.arrive_date

  return (
    <div className="manifest">
      {/* ── Header field ── */}
      <div className="manifest-field">
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
          <span className="stencil-chip" data-side={listing.kind}>
            {t(`kinds.${listing.kind}`)}
          </span>
          {listing.kind === "need" && listing.needs_purchase && (
            <span className="stencil-chip" data-side="buy">
              {t("listings.buy_badge")}
            </span>
          )}
          <span className="font-label field-dim" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span
              aria-hidden="true"
              style={{
                width: 8,
                height: 8,
                background: listing.status === "open" ? "var(--success)" : "var(--text-faint)",
              }}
            />
            {listing.status.toUpperCase()}
          </span>
        </div>

        <h1 className="font-display" style={{ fontSize: "var(--t-h1)", margin: 0 }}>
          {listing.title || `${listing.origin_city} → ${listing.dest_city}`}
        </h1>
        <p className="font-label field-dim" style={{ marginTop: 12 }}>
          {listing.origin_city}
          {listing.origin_country && <span> · {listing.origin_country}</span>}
          {" → "}
          {listing.dest_city}
          {listing.dest_country && <span> · {listing.dest_country}</span>}
        </p>
      </div>

      {/* ── Meta + sidebar ── */}
      <div className="detail-split">
        <div className="manifest-field">
          {hasDates && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "24px 40px" }}>
              {listing.depart_date && (
                <MetaCell label={t("listings.departure")}>
                  {formatListingDate(listing.depart_date)}
                  {listing.date_flexibility && listing.date_flexibility !== "exact" && (
                    <span className="font-label field-dim" style={{ display: "block", marginTop: 4 }}>
                      {listing.date_flexibility === "week" ? t("listings.week_flexible") : t("listings.month_flexible")}
                    </span>
                  )}
                </MetaCell>
              )}
              {listing.arrive_date && (
                <MetaCell label={t("listings.arrival")}>{formatListingDate(listing.arrive_date)}</MetaCell>
              )}
            </div>
          )}

          <h2 className="field-caption" style={{ marginTop: hasDates ? 24 : 0 }}>
            {t("listings.details")}
          </h2>
          <p className="copy" style={{ color: "var(--text-muted)" }}>
            {listing.description || t("listings.no_details")}
          </p>

          {owner && (
            <Link
              to="/profile/$userId"
              params={{ userId: owner.id }}
              style={{ textDecoration: "none", color: "inherit", display: "block", marginTop: 24 }}
            >
              <h3 className="field-caption">
                {listing.kind === "carry" ? t("listings.carrier_profile") : t("listings.sender_profile")}
              </h3>
              <span style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <span
                  aria-hidden="true"
                  style={{
                    width: 48,
                    height: 48,
                    flexShrink: 0,
                    display: "grid",
                    placeItems: "center",
                    border: "var(--bw) solid var(--line)",
                    overflow: "hidden",
                  }}
                >
                  {owner.avatar_url ? (
                    <img src={owner.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <span className="font-display" style={{ fontSize: "1.4rem" }}>
                      {(owner.display_name ?? "?").charAt(0).toUpperCase()}
                    </span>
                  )}
                </span>
                <span style={{ minWidth: 0 }}>
                  <span className="copy" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", fontWeight: 600 }}>
                    {owner.display_name ?? "Anonymous"}
                    {owner.identity_verified === true && <VerifiedBadge size="xs" />}
                    {owner.identity_verified === false && <UnverifiedBadge size="xs" />}
                    <StarRating rating={owner.rating} count={owner.review_count ?? 0} />
                  </span>
                  {(owner.city || owner.country) && (
                    <span className="font-label field-dim" style={{ display: "block", marginTop: 4 }}>
                      {[owner.city, owner.country].filter(Boolean).join(", ")}
                    </span>
                  )}
                  {owner.bio && (
                    <span className="copy ink-dim" style={{ display: "block", marginTop: 4 }}>
                      {owner.bio}
                    </span>
                  )}
                </span>
                <span className="font-label field-dim" style={{ marginLeft: "auto", flexShrink: 0 }}>
                  {t("listings.view_profile")}
                </span>
              </span>
            </Link>
          )}
        </div>

        <div className="manifest-field">
          <h2 className="field-caption">
            {listing.kind === "need" ? t("listings.offered_reward") : t("listings.price_label")}
          </h2>
          <p
            className="font-display tabular"
            style={{ fontSize: "var(--t-h1)", margin: 0, lineHeight: 1 }}
          >
            {priceDisplay}
          </p>
          {listing.currency && listing.price && (
            <p className="font-label field-dim" style={{ marginTop: 8 }}>{listing.currency}</p>
          )}

          <div className="field-rule" aria-hidden="true" style={{ marginTop: 20, marginBottom: 20 }} />

          {isOwn ? (
            <div style={{ display: "grid", gap: 12 }}>
              <p className="font-label field-dim" style={{ margin: 0, textAlign: "center" }}>
                {t("listings.your_listing")}
              </p>
              {listing.status === "open" && (
                <button
                  type="button"
                  onClick={() => setConfirmClose(true)}
                  className="btn btn--ghost"
                  style={{ width: "100%" }}
                >
                  {t("listings.confirm_close")}
                </button>
              )}
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="btn btn--ghost"
                style={{ width: "100%" }}
              >
                {t("listings.delete_listing")}
              </button>
            </div>
          ) : listing.status === "open" ? (
            <ContactButton listing={listing} />
          ) : (
            <button type="button" disabled className="btn btn--ghost" style={{ width: "100%", opacity: 0.5 }}>
              {t("listings.listing_closed")}
            </button>
          )}

          {actionError && (
            <p className="copy" style={{ color: "var(--destructive)", textAlign: "center", marginTop: 12 }}>
              {actionError}
            </p>
          )}
        </div>
      </div>

      {confirmClose && (
        <ConfirmModal
          title={t("listings.close_this_listing")}
          message={`"${listing.title || `${listing.origin_city} → ${listing.dest_city}`}" ${t("listings.close_listing_confirm_detail")}`}
          confirmLabel={t("listings.confirm_close")}
          busy={closeMutation.isPending}
          onConfirm={() => closeMutation.mutate()}
          onCancel={() => setConfirmClose(false)}
        />
      )}
      {confirmDelete && (
        <ConfirmModal
          title={t("listings.delete_this_listing")}
          message={`"${listing.title || `${listing.origin_city} → ${listing.dest_city}`}" ${t("listings.delete_listing_confirm_detail")}`}
          confirmLabel={t("listings.confirm_deleting")}
          danger
          busy={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate()}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  )
}
