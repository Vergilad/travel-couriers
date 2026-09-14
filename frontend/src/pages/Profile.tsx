/**
 * Profile as a Viactor dossier: one manifest, four fields. Identity block on
 * top (avatar, name, verification stamp, home base, track record, bio),
 * then active listings, history and reviews as ledger rows. Same queries and
 * mutations as before; only the reading surface changed.
 *
 * Rating input is a seg control (1-5), the sheet's own vocabulary for "pick
 * one". The pentagon graph and motion reveals are gone: a dossier is read,
 * not watched.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { useState } from "react"
import { useAuth } from "@/lib/auth"
import { authedFetch } from "@/lib/api"
import { VerifiedBadge, UnverifiedBadge } from "@/components/VerifiedBadge"
import { useTranslation } from "@/i18n/I18nContext"

interface PublicProfile {
  id: string
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  city: string | null
  country: string | null
  created_at: string
  identity_verified?: boolean
}

interface ProfileListing {
  id: string
  kind: string
  origin_city: string
  dest_city: string
  status: string
  created_at: string
}

interface Review {
  id: string
  reviewer_id: string
  rating: number
  comment: string | null
  created_at: string
  reviewer?: {
    id: string | null
    display_name: string | null
    avatar_url: string | null
  } | null
}

interface EligibleDeal {
  completed_deal_id: string
  reviewee_id: string
  kind: string | null
  origin_city: string | null
  dest_city: string | null
  completed_at: string | null
}

const RATING_LABELS = ["", "POOR", "BELOW AVG", "ALRIGHT", "GOOD", "EXCELLENT"]

// ── Small pieces ────────────────────────────────────────────────────────────

function KindChip({ kind }: { kind: string }) {
  const { t } = useTranslation()
  const k = kind?.toLowerCase()
  if (k === "carry" || k === "need") {
    return (
      <span className="stencil-chip" data-side={k}>
        {t(`kinds.${k}`)}
      </span>
    )
  }
  return <span className="stencil-chip">{kind?.toUpperCase()}</span>
}

function Face({ name, url, size = 28 }: { name: string; url?: string | null; size?: number }) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        background: "var(--face)",
        border: "var(--bw) solid var(--line)",
        borderRadius: "var(--radius-base)",
        fontFamily: "var(--font-mono)",
        fontWeight: 700,
        fontSize: Math.max(11, Math.round(size * 0.4)),
        color: "var(--face-ink)",
      }}
    >
      {url ? (
        <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      ) : (
        name.charAt(0).toUpperCase()
      )}
    </span>
  )
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { month: "short", year: "numeric" }).toUpperCase()
}

// ── Rate panel (seg 1-5 + note, same mutation as before) ────────────────────

const MAX_REVIEW_COMMENT = 500

function RatePanel({
  partnerName,
  deal,
  onClose,
  onSubmitted,
}: {
  partnerName: string
  deal: EligibleDeal
  onClose: () => void
  onSubmitted: () => void
}) {
  const { t } = useTranslation()
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState("")
  const [error, setError] = useState<string | null>(null)
  const qc = useQueryClient()

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await authedFetch("/api/reviews", {
        method: "POST",
        body: JSON.stringify({
          completed_deal_id: deal.completed_deal_id,
          reviewee_id: deal.reviewee_id,
          rating,
          comment: comment.trim(),
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.detail ?? "Failed to submit review")
      }
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile-reviews", deal.reviewee_id] })
      qc.invalidateQueries({ queryKey: ["review-eligible", deal.reviewee_id] })
      onSubmitted()
    },
    onError: (e: Error) => setError(e.message),
  })

  return (
    <div style={{ marginTop: 18, border: "var(--bw) solid var(--line)", borderRadius: "var(--radius-base)", padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <h3 className="font-label" style={{ margin: 0 }}>
          {t("profile.rate_user_label")} {partnerName.toUpperCase()}
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="font-label"
          style={{ cursor: "pointer", background: "none", border: 0, padding: 4, color: "var(--text-muted)" }}
        >
          ✕
        </button>
      </div>

      {deal.origin_city && deal.dest_city && (
        <p className="font-label field-dim" style={{ margin: "10px 0 0" }}>
          {deal.kind?.toUpperCase()} · {deal.origin_city} → {deal.dest_city}
        </p>
      )}

      <div className="seg" role="group" aria-label={t("profile.rate_user_label")} style={{ marginTop: 14 }}>
        {[1, 2, 3, 4, 5].map((v) => (
          <button
            key={v}
            type="button"
            className="seg-btn"
            aria-pressed={rating === v}
            data-active={rating === v || undefined}
            onClick={() => setRating(v)}
          >
            {v}
          </button>
        ))}
      </div>
      <p className="font-label field-dim" style={{ margin: "10px 0 0", minHeight: 16 }}>
        {rating > 0 ? RATING_LABELS[rating] : t("profile.hover_to_rate")}
      </p>

      <label style={{ display: "grid", gap: 6, marginTop: 12 }}>
        <span className="font-label field-dim">{t("profile.share_experience")}</span>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value.slice(0, MAX_REVIEW_COMMENT))}
          rows={3}
          maxLength={MAX_REVIEW_COMMENT}
          className="route-input"
          style={{ resize: "none", lineHeight: 1.6 }}
        />
      </label>
      <p className="font-label field-dim tabular" style={{ margin: "8px 0 0" }}>
        {comment.length}/{MAX_REVIEW_COMMENT}
      </p>
      {error && (
        <p role="alert" className="copy" style={{ margin: "8px 0 0", color: "var(--destructive)" }}>
          {error}
        </p>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => { if (rating === 0) { setError(t("profile.select_rating_first")); return } setError(null); mutation.mutate() }}
          disabled={mutation.isPending || rating === 0}
          className="btn btn--primary press"
          style={{ flex: 1, minWidth: 160 }}
        >
          {mutation.isPending ? "…" : t("profile.submit_review")}
        </button>
        <button type="button" onClick={onClose} className="btn btn--plain press">
          {t("profile.cancel_btn")}
        </button>
      </div>
    </div>
  )
}

// ── Report panel (same mutation as before) ──────────────────────────────────

const REPORT_REASONS = [
  "Fraud or scam",
  "Dangerous or illegal items",
  "Harassment or threats",
  "No-show / didn't deliver",
  "Fake profile",
  "Other",
]

const MAX_REPORT_DETAILS = 500

function ReportPanel({
  targetUserId,
  targetName,
  onClose,
  onSubmitted,
}: {
  targetUserId: string
  targetName: string
  onClose: () => void
  onSubmitted: () => void
}) {
  const { t } = useTranslation()
  const [reason, setReason] = useState("")
  const [details, setDetails] = useState("")
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await authedFetch("/api/reports", {
        method: "POST",
        body: JSON.stringify({ target_user_id: targetUserId, reason, details: details.trim() }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.detail ?? "Failed to submit report")
      }
      return res.json()
    },
    onSuccess: onSubmitted,
    onError: (e: Error) => setError(e.message),
  })

  return (
    <div style={{ marginTop: 18, border: "var(--bw) solid var(--destructive)", borderRadius: "var(--radius-base)", padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <h3 className="font-label" style={{ margin: 0, color: "var(--destructive)" }}>
          {t("profile.report_panel_title")} {targetName.toUpperCase()}
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="font-label"
          style={{ cursor: "pointer", background: "none", border: 0, padding: 4, color: "var(--text-muted)" }}
        >
          ✕
        </button>
      </div>

      <p className="copy ink-dim" style={{ marginTop: 10, maxWidth: "62ch" }}>
        Reports are reviewed by the Peregri team. We do not mediate financial disputes or
        guarantee refunds. Please only transact with people you trust.
      </p>

      <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span className="font-label field-dim">{t("profile.reason")}</span>
          <select value={reason} onChange={(e) => setReason(e.target.value)} className="route-input">
            <option value="" disabled>{t("profile.select_reason")}</option>
            {REPORT_REASONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          <span className="font-label field-dim">{t("profile.details_optional")}</span>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value.slice(0, MAX_REPORT_DETAILS))}
            placeholder={t("profile.describe_what_happened")}
            rows={3}
            maxLength={MAX_REPORT_DETAILS}
            className="route-input"
            style={{ resize: "none", lineHeight: 1.6 }}
          />
        </label>
      </div>
      {error && (
        <p role="alert" className="copy" style={{ margin: "8px 0 0", color: "var(--destructive)" }}>
          {error}
        </p>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => { if (!reason) { setError(t("profile.select_reason_first")); return } setError(null); mutation.mutate() }}
          disabled={mutation.isPending || !reason}
          className="btn btn--plain press"
          style={{ flex: 1, minWidth: 160, borderColor: "var(--destructive)", color: "var(--destructive)" }}
        >
          {mutation.isPending ? "…" : t("profile.submit_report")}
        </button>
        <button type="button" onClick={onClose} className="btn btn--plain press">
          {t("profile.cancel_btn")}
        </button>
      </div>
    </div>
  )
}

// ── Page ────────────────────────────────────────────────────────────────────

export function ProfilePage({ userId }: { userId: string }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const isOwnProfile = user?.id === userId
  const [rateOpen, setRateOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const res = await fetch(`/api/profiles/${userId}`)
      if (!res.ok) throw new Error("Profile not found")
      return res.json() as Promise<PublicProfile>
    },
  })

  const { data: eligibleDeal } = useQuery({
    queryKey: ["review-eligible", userId],
    queryFn: async () => {
      const res = await authedFetch(`/api/reviews/eligible/with?partner_id=${userId}`)
      if (!res.ok) return null
      const data = await res.json()
      return (data ?? null) as EligibleDeal | null
    },
    enabled: !!user && !isOwnProfile,
  })

  const { data: listings } = useQuery({
    queryKey: ["profile-listings", userId],
    queryFn: async () => {
      const res = await fetch(`/api/profiles/${userId}/listings`)
      if (!res.ok) return []
      return res.json() as Promise<ProfileListing[]>
    },
    enabled: !!profile,
  })

  const { data: reviews } = useQuery({
    queryKey: ["profile-reviews", userId],
    queryFn: async () => {
      const res = await fetch(`/api/reviews/${userId}`)
      if (!res.ok) return []
      return res.json() as Promise<Review[]>
    },
    enabled: !!profile,
  })

  const avgRating =
    reviews && reviews.length > 0
      ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
      : null

  const name = profile?.display_name ?? t("profile.traveler_default")

  return (
    <div className="manifest">
      {/* ── Identity field ── */}
      <section className="manifest-field">
        <h2 className="field-caption">{t("profile.title")}</h2>
        {profileLoading || !profile ? (
          <div aria-hidden="true">
            <div className="skel" style={{ height: 96, width: 96, marginBottom: 16 }} />
            <div className="skel" style={{ height: 32, maxWidth: 280, marginBottom: 12 }} />
            <div className="skel" style={{ height: 14, maxWidth: 200 }} />
          </div>
        ) : (
          <>
            <div
              style={{
                display: "flex",
                gap: 20,
                alignItems: "flex-start",
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  width: 96,
                  height: 96,
                  flexShrink: 0,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  background: "var(--face)",
                  border: "var(--bw) solid var(--line)",
                  borderRadius: "var(--radius-base)",
                  boxShadow: "var(--shadow)",
                  fontFamily: "var(--font-mono)",
                  fontWeight: 700,
                  fontSize: 36,
                  color: "var(--face-ink)",
                }}
              >
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                ) : (
                  name.charAt(0).toUpperCase()
                )}
              </span>
              <div style={{ minWidth: 0, flex: "1 1 240px" }}>
                <h1 className="font-display" style={{ fontSize: "var(--t-h2)", margin: 0 }}>
                  {name}
                </h1>
                <div style={{ marginTop: 10 }}>
                  {profile.identity_verified ? <VerifiedBadge size="md" /> : <UnverifiedBadge size="md" />}
                </div>
                {(profile.city || profile.country) && (
                  <p className="font-label field-dim" style={{ margin: "10px 0 0" }}>
                    {[profile.city, profile.country].filter(Boolean).join(", ")}
                  </p>
                )}
                {avgRating !== null && (
                  <p className="font-label" style={{ margin: "10px 0 0" }}>
                    <span className="tabular">{avgRating.toFixed(1)}/5</span>
                    <span className="field-dim"> · {reviews!.length} {t("profile.reviews")}</span>
                  </p>
                )}
              </div>
            </div>

            {profile.bio && (
              <p className="copy" style={{ marginTop: 16, maxWidth: "62ch" }}>
                {profile.bio}
              </p>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
              {isOwnProfile ? (
                <>
                  <Link to="/settings" className="btn btn--plain press">
                    {t("profile.edit_profile_btn")}
                  </Link>
                  {!profile.identity_verified && (
                    <Link to="/verify" className="btn btn--teal press">
                      {t("profile.verify_now")}
                    </Link>
                  )}
                </>
              ) : (
                <>
                  {eligibleDeal && (
                    <button
                      type="button"
                      onClick={() => { setRateOpen((v) => !v); setReportOpen(false) }}
                      aria-pressed={rateOpen}
                      className="btn btn--primary press"
                    >
                      {t("profile.rate_user_label")}
                    </button>
                  )}
                  {user && (
                    <button
                      type="button"
                      onClick={() => { setReportOpen((v) => !v); setRateOpen(false) }}
                      aria-pressed={reportOpen}
                      className="btn btn--plain press"
                    >
                      {t("profile.report")}
                    </button>
                  )}
                </>
              )}
            </div>

            {rateOpen && eligibleDeal && (
              <RatePanel
                partnerName={profile.display_name ?? "User"}
                deal={eligibleDeal}
                onClose={() => setRateOpen(false)}
                onSubmitted={() => setRateOpen(false)}
              />
            )}
            {reportOpen && !isOwnProfile && user && (
              <ReportPanel
                targetUserId={userId}
                targetName={profile.display_name ?? "this user"}
                onClose={() => setReportOpen(false)}
                onSubmitted={() => setReportOpen(false)}
              />
            )}
          </>
        )}
      </section>

      {/* ── Active listings field ── */}
      <section className="manifest-field">
        <h2 className="field-caption">
          {t("profile.active_listings_section")}
          {listings && listings.length > 0 && <span className="tabular"> · {listings.length}</span>}
        </h2>
        {!listings ? (
          <div aria-hidden="true">
            {[0, 1].map((i) => (
              <div key={i} className="skel" style={{ height: 60, marginBottom: i < 1 ? 12 : 0 }} />
            ))}
          </div>
        ) : listings.length === 0 ? (
          <p className="copy ink-dim" style={{ margin: 0 }}>
            {t("profile.no_active_listings")}
          </p>
        ) : (
          <nav aria-label={t("profile.active_listings_section")} style={{ display: "grid", gap: "var(--bw)", background: "var(--line)" }}>
            {listings.slice(0, 10).map((l) => (
              <Link key={l.id} to="/listings/$id" params={{ id: l.id }} className="dossier-row field-row">
                <KindChip kind={l.kind} />
                <span className="font-display" style={{ fontSize: "1rem", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {l.origin_city} → {l.dest_city}
                </span>
                <span className="font-label" style={{ color: "var(--success)", whiteSpace: "nowrap" }}>
                  {t("listings.open")}
                </span>
              </Link>
            ))}
          </nav>
        )}
      </section>

      {/* ── Reviews field ── */}
      <section className="manifest-field">
        <h2 className="field-caption">
          {t("profile.reviews")}
          {reviews && reviews.length > 0 && <span className="tabular"> · {reviews.length}</span>}
        </h2>
        {!reviews ? (
          <div aria-hidden="true">
            <div className="skel" style={{ height: 84 }} />
          </div>
        ) : reviews.length === 0 ? (
          <p className="copy ink-dim" style={{ margin: 0 }}>
            {t("profile.no_reviews_yet")}
          </p>
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            {reviews.map((review) => {
              const reviewerName = review.reviewer?.display_name ?? "Traveler"
              return (
                <article key={review.id} style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                      {review.reviewer?.id ? (
                        <Link to="/profile/$userId" params={{ userId: review.reviewer.id }} style={{ display: "inline-flex" }}>
                          <Face name={reviewerName} url={review.reviewer?.avatar_url} />
                        </Link>
                      ) : (
                        <Face name={reviewerName} url={review.reviewer?.avatar_url} />
                      )}
                      <span style={{ minWidth: 0 }}>
                        {review.reviewer?.id ? (
                          <Link
                            to="/profile/$userId"
                            params={{ userId: review.reviewer.id }}
                            className="font-label"
                            style={{ color: "var(--text)", textDecoration: "none" }}
                          >
                            {reviewerName}
                          </Link>
                        ) : (
                          <span className="font-label">{reviewerName}</span>
                        )}
                        <span className="font-label tabular" style={{ display: "block", marginTop: 2 }}>
                          {review.rating}/5
                        </span>
                      </span>
                    </span>
                    <span className="font-label field-dim tabular" style={{ whiteSpace: "nowrap" }}>
                      {shortDate(review.created_at)}
                    </span>
                  </div>
                  {review.comment && (
                    <p className="copy" style={{ margin: "10px 0 0", maxWidth: "62ch" }}>
                      {review.comment}
                    </p>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
