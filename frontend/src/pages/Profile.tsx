import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { motion, AnimatePresence } from "framer-motion"
import { Link } from "@tanstack/react-router"
import { useState } from "react"
import { useAuth } from "@/lib/auth"
import { authedFetch } from "@/lib/api"

interface PublicProfile {
  id: string
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  city: string | null
  country: string | null
  created_at: string
}

interface ProfileListing {
  id: string
  kind: string
  origin_city: string
  dest_city: string
  status: string
  created_at: string
}

interface HistoryDeal {
  id: string
  kind: string
  origin_city: string
  dest_city: string
  depart_date: string | null
  completed_at: string
  partner: { display_name: string | null; avatar_url: string | null }
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

// Kind badge colours — consistent with Browse / ListingDetail
const KIND_COLORS: Record<string, { bg: string; text: string }> = {
  trip:     { bg: "rgba(147,197,253,0.1)",  text: "#93c5fd" },
  request:  { bg: "rgba(134,239,172,0.1)",  text: "#86efac" },
  delivery: { bg: "rgba(216,180,254,0.1)",  text: "#d8b4fe" },
}

function kindStyle(kind: string) {
  return KIND_COLORS[kind?.toLowerCase()] ?? { bg: "rgba(255,255,255,0.05)", text: "var(--text-muted)" }
}

function RatingDots({ rating, max = 5 }: { rating: number; max?: number }) {
  return (
    <div className="flex gap-1.5 items-center">
      {Array.from({ length: max }).map((_, i) => (
        <div
          key={i}
          className="w-2 h-2 rounded-full transition-colors"
          style={{ background: i < rating ? "var(--accent)" : "var(--border)" }}
        />
      ))}
    </div>
  )
}

function RatingInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex gap-2.5 items-center" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((i) => {
        const active = i <= (hover || value)
        return (
          <motion.button
            key={i}
            type="button"
            aria-label={`Rate ${i}`}
            onMouseEnter={() => setHover(i)}
            onClick={() => onChange(i)}
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.9 }}
            className="p-0.5 cursor-pointer"
          >
            <div
              className="rounded-full transition-all"
              style={{
                width: active ? 18 : 14,
                height: active ? 18 : 14,
                background: active ? "var(--accent)" : "var(--border)",
              }}
            />
          </motion.button>
        )
      })}
    </div>
  )
}

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-sm ${className}`}
      style={{ background: "var(--surface-raised)" }}
    />
  )
}

function ReviewerAvatar({ name, url }: { name: string; url?: string | null }) {
  return (
    <div
      className="w-7 h-7 rounded-sm overflow-hidden flex items-center justify-center shrink-0"
      style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}
    >
      {url ? (
        <img src={url} alt={name} className="w-full h-full object-cover" />
      ) : (
        <span
          className="text-[11px] font-bold"
          style={{ color: "var(--accent)", fontFamily: "'DM Sans', sans-serif" }}
        >
          {name.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  )
}

// ─── Rate-this-person panel ──────────────────────────────────────────────────
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
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [focused, setFocused] = useState(false)
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

  async function handleSubmit() {
    if (rating === 0) { setError("Please select a rating"); return }
    setError(null)
    mutation.mutate()
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden"
    >
      <div
        className="mt-4 p-5 rounded-sm"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3
            className="text-[11px] tracking-[0.2em]"
            style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--accent)" }}
          >
            RATE {partnerName.toUpperCase()}
          </h3>
          <button
            onClick={onClose}
            className="text-xs transition-colors"
            style={{ color: "var(--text-faint)" }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--text-muted)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--text-faint)")}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {deal.origin_city && deal.dest_city && (
          <p
            className="text-[10px] tracking-wider mb-4"
            style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--text-faint)" }}
          >
            {deal.kind?.toUpperCase()} · {deal.origin_city} → {deal.dest_city}
          </p>
        )}

        <div className="mb-4">
          <RatingInput value={rating} onChange={setRating} />
        </div>

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Share your experience (optional)…"
          rows={3}
          maxLength={MAX_REVIEW_COMMENT}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="w-full rounded-sm px-4 py-2.5 text-[13px] resize-none focus:outline-none transition-colors"
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            background: "var(--surface-raised)",
            border: `1px solid ${focused ? "var(--accent)" : "var(--border)"}`,
            color: "var(--text)",
            caretColor: "var(--accent)",
          }}
        />
        <div className="flex items-center justify-between mt-1.5">
          <span
            className="text-[9px] tabular-nums"
            style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--text-faint)" }}
          >
            {comment.length}/{MAX_REVIEW_COMMENT}
          </span>
          {error && (
            <span
              className="text-[10px]"
              style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--destructive)" }}
            >
              {error.toUpperCase()}
            </span>
          )}
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={handleSubmit}
            disabled={mutation.isPending || rating === 0}
            className="flex-1 px-4 py-2.5 text-[11px] font-bold tracking-widest rounded-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              background: "var(--accent)",
              color: "#ffffff",
            }}
            onMouseEnter={e => { if (!mutation.isPending && rating > 0) e.currentTarget.style.background = "var(--accent-dim)" }}
            onMouseLeave={e => { e.currentTarget.style.background = "var(--accent)" }}
          >
            {mutation.isPending ? "…" : "SUBMIT REVIEW"}
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-[11px] tracking-widest rounded-sm transition-colors"
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              border: "1px solid var(--border)",
              color: "var(--text-muted)",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = "var(--accent)"
              e.currentTarget.style.color = "var(--text)"
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = "var(--border)"
              e.currentTarget.style.color = "var(--text-muted)"
            }}
          >
            CANCEL
          </button>
        </div>
      </div>
    </motion.div>
  )
}

export function ProfilePage({ userId }: { userId: string }) {
  const { user } = useAuth()
  const isOwnProfile = user?.id === userId
  const [rateOpen, setRateOpen] = useState(false)

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

  const { data: history } = useQuery({
    queryKey: ["profile-history", userId],
    queryFn: async () => {
      const res = await fetch(`/api/profiles/${userId}/history`)
      if (!res.ok) return []
      return res.json() as Promise<HistoryDeal[]>
    },
    enabled: !!profile,
  })

  const avgRating =
    reviews && reviews.length > 0
      ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
      : null

  const initial = ((profile?.display_name ?? "P").charAt(0)).toUpperCase()

  const memberSince = profile
    ? new Date(profile.created_at).toLocaleDateString("en-GB", {
        month: "long",
        year: "numeric",
      })
    : ""

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      {/* ── Hero ── */}
      <section className="relative pt-24 pb-12 px-6 md:px-12 xl:px-20 max-w-[1100px] mx-auto">
        {/* Ambient top glow */}
        <div
          className="absolute top-0 left-0 right-0 h-64 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 30% 0%, rgba(37,99,235,0.07) 0%, transparent 70%)",
          }}
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="relative flex flex-col md:flex-row items-start md:items-end gap-8 md:gap-12"
        >
          {/* Avatar */}
          <div className="relative shrink-0">
            {profileLoading ? (
              <Skeleton className="w-32 h-32 md:w-40 md:h-40 rounded-sm" />
            ) : profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.display_name ?? ""}
                className="w-32 h-32 md:w-40 md:h-40 rounded-sm object-cover"
                style={{ border: "1px solid var(--border)" }}
              />
            ) : (
              <div
                className="w-32 h-32 md:w-40 md:h-40 rounded-sm flex items-center justify-center"
                style={{
                  background: "var(--surface-raised)",
                  border: "1px solid var(--border)",
                }}
              >
                <span
                  className="text-6xl md:text-7xl font-bold leading-none"
                  style={{ color: "var(--accent)", fontFamily: "'DM Sans', sans-serif" }}
                >
                  {initial}
                </span>
              </div>
            )}
            {/* Online indicator */}
            <div
              className="absolute bottom-2 right-2 w-3.5 h-3.5 rounded-sm flex items-center justify-center"
              style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
            >
              <div
                className="w-2 h-2 rounded-sm"
                style={{ background: "var(--success)", opacity: 0.8 }}
              />
            </div>
          </div>

          {/* Identity */}
          <div className="flex-1 pb-1">
            {profileLoading ? (
              <>
                <Skeleton className="h-10 w-48 mb-3" />
                <Skeleton className="h-3 w-32 mb-4" />
              </>
            ) : (
              <>
                <div className="flex flex-wrap items-start justify-between gap-4 mb-2">
                  <h1
                    className="text-4xl md:text-5xl font-bold leading-tight"
                    style={{ color: "var(--text)", fontFamily: "'DM Sans', sans-serif" }}
                  >
                    {profile?.display_name ?? "Traveler"}
                  </h1>
                  {isOwnProfile ? (
                    <Link to="/settings">
                      <motion.button
                        className="px-5 py-2 text-[10px] rounded-sm tracking-[0.15em] transition-colors"
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          border: "1px solid var(--border)",
                          color: "var(--accent)",
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.borderColor = "var(--accent)"
                          e.currentTarget.style.background = "rgba(37,99,235,0.06)"
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.borderColor = "var(--border)"
                          e.currentTarget.style.background = "transparent"
                        }}
                      >
                        EDIT PROFILE
                      </motion.button>
                    </Link>
                  ) : eligibleDeal ? (
                    <motion.button
                      onClick={() => setRateOpen((v) => !v)}
                      className="px-5 py-2 text-[10px] rounded-sm tracking-[0.15em] transition-colors"
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        border: "1px solid rgba(37,99,235,0.4)",
                        background: "rgba(37,99,235,0.06)",
                        color: "var(--accent)",
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = "rgba(37,99,235,0.12)"
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = "rgba(37,99,235,0.06)"
                      }}
                    >
                      RATE {profile?.display_name?.toUpperCase() ?? "USER"}
                    </motion.button>
                  ) : null}
                </div>

                <div
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] tracking-widest mb-3"
                  style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--text-muted)" }}
                >
                  {(profile?.city || profile?.country) && (
                    <>
                      <span>
                        {[profile.city, profile.country].filter(Boolean).join(", ")}
                      </span>
                      <span style={{ color: "var(--text-faint)" }}>·</span>
                    </>
                  )}
                  <span>MEMBER SINCE {memberSince.toUpperCase()}</span>
                </div>

                {avgRating !== null && (
                  <div className="flex items-center gap-3 mb-3">
                    <RatingDots rating={Math.round(avgRating)} />
                    <span
                      className="text-[10px] tracking-wider"
                      style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--text-muted)" }}
                    >
                      {avgRating.toFixed(1)} · {reviews!.length} REVIEW
                      {reviews!.length !== 1 ? "S" : ""}
                    </span>
                  </div>
                )}

                {profile?.bio && (
                  <p
                    className="text-sm leading-relaxed max-w-[50ch] mt-4"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {profile.bio}
                  </p>
                )}

                {eligibleDeal && (
                  <AnimatePresence initial={false}>
                    {rateOpen && (
                      <RatePanel
                        key="rate-panel"
                        partnerName={profile?.display_name ?? "User"}
                        deal={eligibleDeal}
                        onClose={() => setRateOpen(false)}
                        onSubmitted={() => setRateOpen(false)}
                      />
                    )}
                  </AnimatePresence>
                )}
              </>
            )}
          </div>
        </motion.div>
      </section>

      <div className="h-px mx-6 md:mx-12 xl:mx-20 max-w-[1100px] md:mx-auto" style={{ background: "var(--border)" }} />

      {/* ── Listings ── */}
      <section className="px-6 md:px-12 xl:px-20 max-w-[1100px] mx-auto py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-4 rounded-sm" style={{ background: "rgba(37,99,235,0.4)" }} />
            <h2
              className="text-[10px] tracking-[0.22em]"
              style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--text-muted)" }}
            >
              ACTIVE LISTINGS
            </h2>
            {listings && listings.length > 0 && (
              <span
                className="text-[10px] tabular-nums"
                style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--text-faint)" }}
              >
                {listings.length}
              </span>
            )}
          </div>

          {!listings ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : listings.length === 0 ? (
            <p
              className="text-[11px] tracking-wider"
              style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--text-faint)" }}
            >
              No active listings.
            </p>
          ) : (
            <div className="space-y-1.5">
              {listings.slice(0, 10).map((l, i) => {
                const ks = kindStyle(l.kind)
                return (
                  <motion.div
                    key={l.id}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: i * 0.04, ease: "easeOut" }}
                    className="flex items-center justify-between px-4 py-3.5 rounded-sm transition-colors"
                    style={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--text-faint)")}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}
                  >
                    <div className="flex items-center gap-5">
                      <span
                        className="text-[9px] tracking-widest px-1.5 py-0.5 rounded-sm w-16 shrink-0 text-center"
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          background: ks.bg,
                          color: ks.text,
                        }}
                      >
                        {l.kind?.toUpperCase()}
                      </span>
                      <span className="text-sm" style={{ color: "var(--text)" }}>
                        {l.origin_city}
                        <span className="mx-2" style={{ color: "var(--text-faint)" }}>→</span>
                        {l.dest_city}
                      </span>
                    </div>
                    <span
                      className="text-[9px] tracking-[0.15em]"
                      style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--success)" }}
                    >
                      OPEN
                    </span>
                  </motion.div>
                )
              })}
            </div>
          )}
        </motion.div>
      </section>

      {/* ── History ── */}
      <section className="px-6 md:px-12 xl:px-20 max-w-[1100px] mx-auto py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-4 rounded-sm" style={{ background: "rgba(37,99,235,0.4)" }} />
            <h2
              className="text-[10px] tracking-[0.22em]"
              style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--text-muted)" }}
            >
              HISTORY
            </h2>
            {history && history.length > 0 && (
              <span
                className="text-[10px] tabular-nums"
                style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--text-faint)" }}
              >
                {history.length}
              </span>
            )}
          </div>

          {!history ? (
            <div className="space-y-2">
              {[1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : history.length === 0 ? (
            <p
              className="text-[11px] tracking-wider"
              style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--text-faint)" }}
            >
              No completed deals yet.
            </p>
          ) : (
            <div className="space-y-1.5">
              {history.map((deal, i) => {
                const partnerName = deal.partner?.display_name ?? "Anonymous"
                const ks = kindStyle(deal.kind)
                return (
                  <motion.div
                    key={deal.id}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: i * 0.04, ease: "easeOut" }}
                    className="flex items-center justify-between px-4 py-3.5 rounded-sm transition-colors"
                    style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--text-faint)")}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}
                  >
                    <div className="flex items-center gap-5 min-w-0">
                      <span
                        className="text-[9px] tracking-widest px-1.5 py-0.5 rounded-sm w-16 shrink-0 text-center"
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          background: ks.bg,
                          color: ks.text,
                        }}
                      >
                        {deal.kind?.toUpperCase()}
                      </span>
                      <span className="text-sm truncate" style={{ color: "var(--text)" }}>
                        {deal.origin_city}
                        <span className="mx-2" style={{ color: "var(--text-faint)" }}>→</span>
                        {deal.dest_city}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex items-center gap-1.5">
                        <ReviewerAvatar name={partnerName} url={deal.partner?.avatar_url} />
                        <span
                          className="text-[11px]"
                          style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--text-muted)" }}
                        >
                          {partnerName}
                        </span>
                      </div>
                      <span
                        className="text-[9px] tracking-widest"
                        style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--text-faint)" }}
                      >
                        {new Date(deal.completed_at)
                          .toLocaleDateString("en-GB", { month: "short", year: "numeric" })
                          .toUpperCase()}
                      </span>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </motion.div>
      </section>

      {/* ── Reviews ── */}
      <section className="px-6 md:px-12 xl:px-20 max-w-[1100px] mx-auto pb-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-4 rounded-sm" style={{ background: "rgba(37,99,235,0.4)" }} />
            <h2
              className="text-[10px] tracking-[0.22em]"
              style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--text-muted)" }}
            >
              REVIEWS
            </h2>
            {reviews && reviews.length > 0 && (
              <span
                className="text-[10px] tabular-nums"
                style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--text-faint)" }}
              >
                {reviews.length}
              </span>
            )}
          </div>

          {!reviews ? (
            <div className="space-y-3">
              {[1, 2].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
            </div>
          ) : reviews.length === 0 ? (
            <p
              className="text-[11px] tracking-wider"
              style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--text-faint)" }}
            >
              No reviews yet.
            </p>
          ) : (
            <div className="space-y-3">
              {reviews.map((review, i) => {
                const reviewerName = review.reviewer?.display_name ?? "Traveler"
                return (
                  <motion.div
                    key={review.id}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.35, delay: i * 0.05, ease: "easeOut" }}
                    className="p-5 rounded-sm"
                    style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {review.reviewer?.id ? (
                          <Link to="/profile/$userId" params={{ userId: review.reviewer.id }}>
                            <ReviewerAvatar name={reviewerName} url={review.reviewer?.avatar_url} />
                          </Link>
                        ) : (
                          <ReviewerAvatar name={reviewerName} url={review.reviewer?.avatar_url} />
                        )}
                        <div className="flex flex-col gap-1">
                          {review.reviewer?.id ? (
                            <Link
                              to="/profile/$userId"
                              params={{ userId: review.reviewer.id }}
                              className="text-[11px] transition-colors"
                              style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--text-muted)" }}
                              onMouseEnter={e => (e.currentTarget.style.color = "var(--text)")}
                              onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}
                            >
                              {reviewerName}
                            </Link>
                          ) : (
                            <span
                              className="text-[11px]"
                              style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--text-muted)" }}
                            >
                              {reviewerName}
                            </span>
                          )}
                          <RatingDots rating={review.rating} />
                        </div>
                      </div>
                      <span
                        className="text-[9px] tracking-widest"
                        style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--text-faint)" }}
                      >
                        {new Date(review.created_at)
                          .toLocaleDateString("en-GB", { month: "short", year: "numeric" })
                          .toUpperCase()}
                      </span>
                    </div>
                    {review.comment && (
                      <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
                        {review.comment}
                      </p>
                    )}
                  </motion.div>
                )
              })}
            </div>
          )}
        </motion.div>
      </section>
    </div>
  )
}
