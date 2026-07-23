import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { motion, AnimatePresence } from "framer-motion"
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

const KIND_COLORS: Record<string, { bg: string; text: string }> = {
  trip:     { bg: "rgba(147,197,253,0.1)",  text: "#93c5fd" },
  request:  { bg: "rgba(134,239,172,0.1)",  text: "#86efac" },
  delivery: { bg: "rgba(216,180,254,0.1)",  text: "#d8b4fe" },
}

function kindStyle(kind: string) {
  return KIND_COLORS[kind?.toLowerCase()] ?? { bg: "rgba(255,255,255,0.05)", text: "var(--text-muted)" }
}

const RATING_LABELS = ["", "POOR", "BELOW AVG", "ALRIGHT", "GOOD", "EXCELLENT"]

function pentaVerts(cx: number, cy: number, r: number) {
  return Array.from({ length: 5 }, (_, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }
  })
}

function edgeLen(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2)
}

const PENTA_EDGES: [number, number][] = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0]]

function isEdgeActive(f: number, t: number, active: number) {
  return active > Math.max(f, t)
}

function GraphRating({
  value,
  onChange,
  size = "lg",
}: {
  value: number
  onChange?: (v: number) => void
  size?: "sm" | "lg"
}) {
  const { t } = useTranslation()
  const [hovered, setHovered] = useState(0)
  const active = hovered || value
  const interactive = Boolean(onChange)

  const dim = size === "lg" ? 200 : 46
  const r   = size === "lg" ? 76  : 16
  const cx  = dim / 2
  const cy  = dim / 2
  const nodeR  = size === "lg" ? 10  : 3
  const strokeW = size === "lg" ? 2   : 1
  const hitR = size === "lg" ? 22 : 0

  const verts = pentaVerts(cx, cy, r)
  const labelR = r + (size === "lg" ? 22 : 0)
  const labelVerts = pentaVerts(cx, cy, labelR)

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: size === "lg" ? 10 : 4 }}>
      <svg
        width={dim}
        height={dim}
        style={{ overflow: "visible" }}
        onMouseLeave={interactive ? () => setHovered(0) : undefined}
      >
        {PENTA_EDGES.map(([f, t], i) => (
          <line
            key={`bg-${i}`}
            x1={verts[f].x} y1={verts[f].y}
            x2={verts[t].x} y2={verts[t].y}
            stroke="var(--border)"
            strokeWidth={strokeW}
          />
        ))}

        {PENTA_EDGES.map(([f, t], i) => {
          const len = edgeLen(verts[f], verts[t])
          const active_ = isEdgeActive(f, t, active)
          return (
            <motion.line
              key={`fg-${i}`}
              x1={verts[f].x} y1={verts[f].y}
              x2={verts[t].x} y2={verts[t].y}
              stroke="var(--accent)"
              strokeWidth={strokeW + (size === "lg" ? 1 : 0)}
              style={{ strokeDasharray: len }}
              animate={{ strokeDashoffset: active_ ? 0 : len, opacity: active_ ? 1 : 0 }}
              initial={false}
              transition={{ duration: 0.25, ease: "easeOut" }}
            />
          )
        })}

        {verts.map((v, i) => (
          <motion.circle
            key={`glow-${i}`}
            cx={v.x} cy={v.y}
            fill="var(--accent)"
            animate={{ r: i < active ? nodeR * 3.2 : 0, opacity: i < active ? 0.15 : 0 }}
            initial={false}
            transition={{ duration: 0.2 }}
          />
        ))}

        {verts.map((v, i) => {
          const vActive = i < active
          return (
            <motion.circle
              key={`node-${i}`}
              cx={v.x} cy={v.y}
              fill={vActive ? "var(--accent)" : "var(--surface-raised)"}
              stroke={vActive ? "var(--accent)" : "var(--border)"}
              strokeWidth={strokeW}
              animate={{ r: vActive ? nodeR * 1.35 : nodeR }}
              initial={false}
              transition={{ type: "spring", stiffness: 420, damping: 22 }}
              style={{ cursor: interactive ? "pointer" : "default" }}
              onMouseEnter={interactive ? () => setHovered(i + 1) : undefined}
              onClick={interactive && onChange ? () => onChange(i + 1) : undefined}
            />
          )
        })}

        {interactive && size === "lg" && verts.map((v, i) => (
          <circle
            key={`hit-${i}`}
            cx={v.x} cy={v.y} r={hitR}
            fill="transparent"
            style={{ cursor: "pointer" }}
            onMouseEnter={() => setHovered(i + 1)}
            onClick={() => onChange?.(i + 1)}
          />
        ))}

        {size === "lg" && labelVerts.map((v, i) => (
          <text
            key={`lbl-${i}`}
            x={v.x} y={v.y}
            textAnchor="middle"
            dominantBaseline="central"
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              letterSpacing: "0.05em",
              fill: i < active ? "var(--accent)" : "var(--text-faint)",
              userSelect: "none",
              transition: "fill 0.2s",
            }}
          >
            {i + 1}
          </text>
        ))}
      </svg>

      {size === "lg" && (
        <div style={{ height: 20, display: "flex", alignItems: "center" }}>
          <AnimatePresence mode="wait">
            {active > 0 ? (
              <motion.span
                key={active}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.14 }}
                style={{
                  display: "block",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10,
                  letterSpacing: "0.2em",
                  color: "var(--accent)",
                }}
              >
                {RATING_LABELS[active]}
              </motion.span>
            ) : (
              <motion.span
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.14 }}
                style={{
                  display: "block",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10,
                  letterSpacing: "0.2em",
                  color: "var(--text-faint)",
                }}
              >
                {interactive ? t('profile.hover_to_rate') : ""}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-sm ${className}`} style={{ background: "var(--surface-raised)" }} />
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
        <span className="text-[11px] font-bold" style={{ color: "var(--accent)", fontFamily: "'DM Sans', sans-serif" }}>
          {name.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  )
}

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
          <h3 className="text-[11px] tracking-[0.2em]" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--accent)" }}>
            {t('profile.rate_user_label')} {partnerName.toUpperCase()}
          </h3>
          <button
            onClick={onClose}
            className="text-xs transition-colors"
            style={{ color: "var(--text-faint)" }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--text-muted)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--text-faint)")}
          >
            ✕
          </button>
        </div>

        {deal.origin_city && deal.dest_city && (
          <p className="text-[10px] tracking-wider mb-5" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--text-faint)" }}>
            {deal.kind?.toUpperCase()} · {deal.origin_city} → {deal.dest_city}
          </p>
        )}

        <div className="flex justify-center mb-5">
          <GraphRating value={rating} onChange={setRating} size="lg" />
        </div>

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={t('profile.share_experience')}
          rows={3}
          maxLength={MAX_REVIEW_COMMENT}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="w-full rounded-sm px-4 py-2.5 text-[13px] resize-none focus:outline-none"
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            background: "var(--surface-raised)",
            border: `1px solid ${focused ? "var(--accent)" : "var(--border)"}`,
            color: "var(--text)",
            caretColor: "var(--accent)",
          }}
        />
        <div className="flex items-center justify-between mt-1.5 mb-4">
          <span className="text-[9px] tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--text-faint)" }}>
            {comment.length}/{MAX_REVIEW_COMMENT}
          </span>
          {error && (
            <span className="text-[10px]" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--destructive)" }}>
              {error.toUpperCase()}
            </span>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => { if (rating === 0) { setError(t('profile.select_rating_first')); return }; setError(null); mutation.mutate() }}
            disabled={mutation.isPending || rating === 0}
            className="flex-1 px-4 py-2.5 text-[11px] font-bold tracking-widest rounded-sm disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ fontFamily: "'JetBrains Mono', monospace", background: "var(--accent)", color: "#ffffff" }}
            onMouseEnter={e => { if (!mutation.isPending && rating > 0) e.currentTarget.style.background = "var(--accent-dim)" }}
            onMouseLeave={e => { e.currentTarget.style.background = "var(--accent)" }}
          >
            {mutation.isPending ? "…" : t('profile.submit_review')}
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-[11px] tracking-widest rounded-sm"
            style={{ fontFamily: "'JetBrains Mono', monospace", border: "1px solid var(--border)", color: "var(--text-muted)" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--text)" }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-muted)" }}
          >
            {t('profile.cancel_btn')}
          </button>
        </div>
      </div>
    </motion.div>
  )
}

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
  const [focused, setFocused] = useState(false)
  const [reasonFocused, setReasonFocused] = useState(false)

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
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden"
    >
      <div className="mt-4 p-5 rounded-sm" style={{ background: "var(--surface)", border: "1px solid rgba(239,68,68,0.2)" }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[11px] tracking-[0.2em]" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--destructive)" }}>
            {t('profile.report_panel_title')} {targetName.toUpperCase()}
          </h3>
          <button onClick={onClose} className="text-xs" style={{ color: "var(--text-faint)" }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--text-muted)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--text-faint)")}>
            ✕
          </button>
        </div>

        <p className="text-[11px] leading-relaxed mb-4" style={{ color: "var(--text-muted)" }}>
          Reports are reviewed by the Peregri team. We do not mediate financial disputes or
          guarantee refunds — please only transact with people you trust.
        </p>

        <div className="mb-3">
          <label className="block text-[9px] tracking-widest mb-2" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--text-faint)" }}>
            {t('profile.reason')}
          </label>
          <select
            value={reason}
            onChange={e => setReason(e.target.value)}
            onFocus={() => setReasonFocused(true)}
            onBlur={() => setReasonFocused(false)}
            className="w-full rounded-sm px-3 py-2.5 text-[12px] focus:outline-none appearance-none"
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              background: "var(--surface-raised)",
              border: `1px solid ${reasonFocused ? "var(--accent)" : "var(--border)"}`,
              color: reason ? "var(--text)" : "var(--text-faint)",
              caretColor: "var(--accent)",
            }}
          >
            <option value="" disabled>{t('profile.select_reason')}</option>
            {REPORT_REASONS.map(r => (
              <option key={r} value={r} style={{ background: "var(--surface-raised)", color: "var(--text)" }}>{r}</option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <label className="block text-[9px] tracking-widest mb-2" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--text-faint)" }}>
            {t('profile.details_optional')}
          </label>
          <textarea
            value={details}
            onChange={e => setDetails(e.target.value)}
            placeholder={t('profile.describe_what_happened')}
            rows={3}
            maxLength={MAX_REPORT_DETAILS}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            className="w-full rounded-sm px-4 py-2.5 text-[12px] resize-none focus:outline-none"
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              background: "var(--surface-raised)",
              border: `1px solid ${focused ? "var(--accent)" : "var(--border)"}`,
              color: "var(--text)",
              caretColor: "var(--accent)",
            }}
          />
          <div className="flex items-center justify-between mt-1">
            <span className="text-[9px] tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--text-faint)" }}>
              {details.length}/{MAX_REPORT_DETAILS}
            </span>
            {error && (
              <span className="text-[10px]" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--destructive)" }}>
                {error.toUpperCase()}
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => { if (!reason) { setError(t('profile.select_reason_first')); return }; setError(null); mutation.mutate() }}
            disabled={mutation.isPending || !reason}
            className="flex-1 px-4 py-2.5 text-[11px] font-bold tracking-widest rounded-sm disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ fontFamily: "'JetBrains Mono', monospace", background: "var(--destructive)", color: "#ffffff" }}
            onMouseEnter={e => { if (!mutation.isPending && reason) e.currentTarget.style.opacity = "0.85" }}
            onMouseLeave={e => { e.currentTarget.style.opacity = "1" }}
          >
            {mutation.isPending ? "…" : t('profile.submit_report')}
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-[11px] tracking-widest rounded-sm"
            style={{ fontFamily: "'JetBrains Mono', monospace", border: "1px solid var(--border)", color: "var(--text-muted)" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--text)" }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-muted)" }}
          >
            {t('profile.cancel_btn')}
          </button>
        </div>
      </div>
    </motion.div>
  )
}

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
    ? new Date(profile.created_at).toLocaleDateString("en-GB", { month: "long", year: "numeric" })
    : ""

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <section className="relative pt-24 pb-12 px-6 md:px-12 xl:px-20 max-w-[1100px] mx-auto">
        <div className="absolute top-0 left-0 right-0 h-64 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 30% 0%, rgba(37,99,235,0.07) 0%, transparent 70%)" }} />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="relative flex flex-col md:flex-row items-start md:items-end gap-8 md:gap-12"
        >
          <div className="relative shrink-0">
            {profileLoading ? (
              <Skeleton className="w-32 h-32 md:w-40 md:h-40 rounded-sm" />
            ) : profile?.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.display_name ?? ""}
                className="w-32 h-32 md:w-40 md:h-40 rounded-sm object-cover"
                style={{ border: "1px solid var(--border)" }} />
            ) : (
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-sm flex items-center justify-center"
                style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}>
                <span className="text-6xl md:text-7xl font-bold leading-none"
                  style={{ color: "var(--accent)", fontFamily: "'DM Sans', sans-serif" }}>{initial}</span>
              </div>
            )}
            <div className="absolute bottom-2 right-2 w-3.5 h-3.5 rounded-sm flex items-center justify-center"
              style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
              <div className="w-2 h-2 rounded-sm" style={{ background: "var(--success)", opacity: 0.8 }} />
            </div>
          </div>

          <div className="flex-1 pb-1">
            {profileLoading ? (
              <>
                <Skeleton className="h-10 w-48 mb-3" />
                <Skeleton className="h-3 w-32 mb-4" />
              </>
            ) : (
              <>
                <div className="flex flex-wrap items-start justify-between gap-4 mb-2">
                  <h1 className="text-4xl md:text-5xl font-bold leading-tight"
                    style={{ color: "var(--text)", fontFamily: "'DM Sans', sans-serif" }}>
                    {profile?.display_name ?? t('profile.traveler_default')}
                  </h1>
                  <div className="flex items-center gap-2 flex-wrap">
                    {isOwnProfile ? (
                      <Link to="/settings">
                        <motion.button
                          className="px-5 py-2 text-[10px] rounded-sm tracking-[0.15em]"
                          style={{ fontFamily: "'JetBrains Mono', monospace", border: "1px solid var(--border)", color: "var(--accent)" }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.background = "rgba(37,99,235,0.06)" }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "transparent" }}>
                          {t('profile.edit_profile_btn')}
                        </motion.button>
                      </Link>
                    ) : (
                      <>
                        {eligibleDeal && (
                          <motion.button
                            onClick={() => { setRateOpen(v => !v); setReportOpen(false) }}
                            className="px-5 py-2 text-[10px] rounded-sm tracking-[0.15em]"
                            style={{ fontFamily: "'JetBrains Mono', monospace", border: "1px solid rgba(37,99,235,0.4)", background: rateOpen ? "rgba(37,99,235,0.1)" : "rgba(37,99,235,0.05)", color: "var(--accent)" }}
                            onMouseEnter={e => { e.currentTarget.style.background = "rgba(37,99,235,0.12)" }}
                            onMouseLeave={e => { e.currentTarget.style.background = rateOpen ? "rgba(37,99,235,0.1)" : "rgba(37,99,235,0.05)" }}>
                            {t('profile.rate_user_label')} {profile?.display_name?.toUpperCase() ?? t('profile.traveler_default').toUpperCase()}
                          </motion.button>
                        )}
                        {user && (
                          <motion.button
                            onClick={() => { setReportOpen(v => !v); setRateOpen(false) }}
                            className="px-5 py-2 text-[10px] rounded-sm tracking-[0.15em]"
                            style={{ fontFamily: "'JetBrains Mono', monospace", border: `1px solid ${reportOpen ? "rgba(239,68,68,0.4)" : "var(--border)"}`, background: reportOpen ? "rgba(239,68,68,0.06)" : "transparent", color: reportOpen ? "var(--destructive)" : "var(--text-faint)" }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(239,68,68,0.4)"; e.currentTarget.style.color = "var(--destructive)" }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = reportOpen ? "rgba(239,68,68,0.4)" : "var(--border)"; e.currentTarget.style.color = reportOpen ? "var(--destructive)" : "var(--text-faint)" }}>
                            {t('profile.report')}
                          </motion.button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 mb-3 mt-1">
                  {profile?.identity_verified ? <VerifiedBadge /> : <UnverifiedBadge />}
                  {isOwnProfile && !profile?.identity_verified && (
                    <Link to="/verify">
                      <button className="text-[10px] tracking-widest transition-colors"
                        style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--accent)" }}
                        onMouseEnter={e => (e.currentTarget.style.opacity = "0.7")}
                        onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
                        {t('profile.verify_now')}
                      </button>
                    </Link>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] tracking-widest mb-3"
                  style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--text-muted)" }}>
                  {(profile?.city || profile?.country) && (
                    <><span>{[profile.city, profile.country].filter(Boolean).join(", ")}</span>
                      <span style={{ color: "var(--text-faint)" }}>·</span></>
                  )}
                  <span>{t('profile.member_since')} {memberSince.toUpperCase()}</span>
                </div>

                {avgRating !== null && (
                  <div className="flex items-center gap-3 mb-3">
                    <GraphRating value={Math.round(avgRating)} size="sm" />
                    <span className="text-[10px] tracking-wider"
                      style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--text-muted)" }}>
                      {avgRating.toFixed(1)} · {reviews!.length} {t('profile.reviews')}
                    </span>
                  </div>
                )}

                {profile?.bio && (
                  <p className="text-sm leading-relaxed max-w-[50ch] mt-4" style={{ color: "var(--text-muted)" }}>
                    {profile.bio}
                  </p>
                )}

                <AnimatePresence initial={false}>
                  {rateOpen && eligibleDeal && (
                    <RatePanel
                      partnerName={profile?.display_name ?? "User"}
                      deal={eligibleDeal}
                      onClose={() => setRateOpen(false)}
                      onSubmitted={() => setRateOpen(false)} />
                  )}
                  {reportOpen && !isOwnProfile && user && (
                    <ReportPanel
                      targetUserId={userId}
                      targetName={profile?.display_name ?? "this user"}
                      onClose={() => setReportOpen(false)}
                      onSubmitted={() => setReportOpen(false)} />
                  )}
                </AnimatePresence>
              </>
            )}
          </div>
        </motion.div>
      </section>

      <div className="h-px mx-6 md:mx-12 xl:mx-20 max-w-[1100px] md:mx-auto" style={{ background: "var(--border)" }} />

      <section className="px-6 md:px-12 xl:px-20 max-w-[1100px] mx-auto py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-4 rounded-sm" style={{ background: "rgba(37,99,235,0.4)" }} />
            <h2 className="text-[10px] tracking-[0.22em]"
              style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--text-muted)" }}>
              {t('profile.active_listings_section')}
            </h2>
            {listings && listings.length > 0 && (
              <span className="text-[10px] tabular-nums"
                style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--text-faint)" }}>
                {listings.length}
              </span>
            )}
          </div>

          {!listings ? (
            <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : listings.length === 0 ? (
            <p className="text-[11px] tracking-wider"
              style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--text-faint)" }}>
              {t('profile.no_active_listings')}
            </p>
          ) : (
            <div className="space-y-1.5">
              {listings.slice(0, 10).map((l, i) => {
                const ks = kindStyle(l.kind)
                return (
                  <motion.div key={l.id} initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: i * 0.04, ease: "easeOut" }}
                    className="flex items-center justify-between px-4 py-3.5 rounded-sm"
                    style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--text-faint)")}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}>
                    <div className="flex items-center gap-5">
                      <span className="text-[9px] tracking-widest px-1.5 py-0.5 rounded-sm w-16 shrink-0 text-center"
                        style={{ fontFamily: "'JetBrains Mono', monospace", background: ks.bg, color: ks.text }}>
                        {l.kind?.toUpperCase()}
                      </span>
                      <span className="text-sm" style={{ color: "var(--text)" }}>
                        {l.origin_city}<span className="mx-2" style={{ color: "var(--text-faint)" }}>→</span>{l.dest_city}
                      </span>
                    </div>
                    <span className="text-[9px] tracking-[0.15em]"
                      style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--success)" }}>
                      {t('listings.open')}
                    </span>
                  </motion.div>
                )
              })}
            </div>
          )}
        </motion.div>
      </section>

      <section className="px-6 md:px-12 xl:px-20 max-w-[1100px] mx-auto py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-4 rounded-sm" style={{ background: "rgba(37,99,235,0.4)" }} />
            <h2 className="text-[10px] tracking-[0.22em]"
              style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--text-muted)" }}>
              {t('profile.history')}
            </h2>
            {history && history.length > 0 && (
              <span className="text-[10px] tabular-nums"
                style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--text-faint)" }}>
                {history.length}
              </span>
            )}
          </div>

          {!history ? (
            <div className="space-y-2">{[1, 2].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : history.length === 0 ? (
            <p className="text-[11px] tracking-wider"
              style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--text-faint)" }}>
              {t('profile.no_history')}
            </p>
          ) : (
            <div className="space-y-1.5">
              {history.map((deal, i) => {
                const partnerName = deal.partner?.display_name ?? "Anonymous"
                const ks = kindStyle(deal.kind)
                return (
                  <motion.div key={deal.id} initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: i * 0.04, ease: "easeOut" }}
                    className="flex items-center justify-between px-4 py-3.5 rounded-sm"
                    style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--text-faint)")}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}>
                    <div className="flex items-center gap-5 min-w-0">
                      <span className="text-[9px] tracking-widest px-1.5 py-0.5 rounded-sm w-16 shrink-0 text-center"
                        style={{ fontFamily: "'JetBrains Mono', monospace", background: ks.bg, color: ks.text }}>
                        {deal.kind?.toUpperCase()}
                      </span>
                      <span className="text-sm truncate" style={{ color: "var(--text)" }}>
                        {deal.origin_city}<span className="mx-2" style={{ color: "var(--text-faint)" }}>→</span>{deal.dest_city}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex items-center gap-1.5">
                        <ReviewerAvatar name={partnerName} url={deal.partner?.avatar_url} />
                        <span className="text-[11px]"
                          style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--text-muted)" }}>
                          {partnerName}
                        </span>
                      </div>
                      <span className="text-[9px] tracking-widest"
                        style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--text-faint)" }}>
                        {new Date(deal.completed_at).toLocaleDateString("en-GB", { month: "short", year: "numeric" }).toUpperCase()}
                      </span>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </motion.div>
      </section>

      <section className="px-6 md:px-12 xl:px-20 max-w-[1100px] mx-auto pb-24">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-4 rounded-sm" style={{ background: "rgba(37,99,235,0.4)" }} />
            <h2 className="text-[10px] tracking-[0.22em]"
              style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--text-muted)" }}>
              {t('profile.reviews')}
            </h2>
            {reviews && reviews.length > 0 && (
              <span className="text-[10px] tabular-nums"
                style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--text-faint)" }}>
                {reviews.length}
              </span>
            )}
          </div>

          {!reviews ? (
            <div className="space-y-3">{[1, 2].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div>
          ) : reviews.length === 0 ? (
            <p className="text-[11px] tracking-wider"
              style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--text-faint)" }}>
              {t('profile.no_reviews_yet')}
            </p>
          ) : (
            <div className="space-y-3">
              {reviews.map((review, i) => {
                const reviewerName = review.reviewer?.display_name ?? "Traveler"
                return (
                  <motion.div key={review.id} initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                    transition={{ duration: 0.35, delay: i * 0.05, ease: "easeOut" }}
                    className="p-5 rounded-sm"
                    style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {review.reviewer?.id ? (
                          <Link to="/profile/$userId" params={{ userId: review.reviewer.id }}>
                            <ReviewerAvatar name={reviewerName} url={review.reviewer?.avatar_url} />
                          </Link>
                        ) : (
                          <ReviewerAvatar name={reviewerName} url={review.reviewer?.avatar_url} />
                        )}
                        <div className="flex flex-col gap-2">
                          {review.reviewer?.id ? (
                            <Link to="/profile/$userId" params={{ userId: review.reviewer.id }}
                              className="text-[11px]"
                              style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--text-muted)" }}
                              onMouseEnter={e => (e.currentTarget.style.color = "var(--text)")}
                              onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}>
                              {reviewerName}
                            </Link>
                          ) : (
                            <span className="text-[11px]"
                              style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--text-muted)" }}>
                              {reviewerName}
                            </span>
                          )}
                          <GraphRating value={review.rating} size="sm" />
                        </div>
                      </div>
                      <span className="text-[9px] tracking-widest"
                        style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--text-faint)" }}>
                        {new Date(review.created_at).toLocaleDateString("en-GB", { month: "short", year: "numeric" }).toUpperCase()}
                      </span>
                    </div>
                    {review.comment && (
                      <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>{review.comment}</p>
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