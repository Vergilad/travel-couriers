import { useQuery } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { Link } from "@tanstack/react-router"
import { useAuth } from "@/lib/auth"

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

interface Review {
  id: string
  reviewer_id: string
  rating: number
  comment: string | null
  created_at: string
}

function RatingDots({ rating, max = 5 }: { rating: number; max?: number }) {
  return (
    <div className="flex gap-1.5 items-center">
      {Array.from({ length: max }).map((_, i) => (
        <div
          key={i}
          className="w-2 h-2 rounded-full transition-colors"
          style={{ background: i < rating ? "#C8956A" : "#2E2418" }}
        />
      ))}
    </div>
  )
}

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-[#1A1208] rounded-sm ${className}`} />
}

export function ProfilePage({ userId }: { userId: string }) {
  const { user } = useAuth()
  const isOwnProfile = user?.id === userId

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const res = await fetch(`/api/profiles/${userId}`)
      if (!res.ok) throw new Error("Profile not found")
      return res.json() as Promise<PublicProfile>
    },
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

  const initial = ((profile?.display_name ?? "T").charAt(0)).toUpperCase()

  const memberSince = profile
    ? new Date(profile.created_at).toLocaleDateString("en-GB", {
        month: "long",
        year: "numeric",
      })
    : ""

  return (
    <div className="min-h-screen">
      {/* ── Hero ── */}
      <section className="relative pt-24 pb-12 px-6 md:px-12 xl:px-20 max-w-[1100px] mx-auto">
        {/* Ambient top glow */}
        <div
          className="absolute top-0 left-0 right-0 h-64 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 30% 0%, rgba(200,149,106,0.07) 0%, transparent 70%)",
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
              <Skeleton className="w-32 h-32 md:w-40 md:h-40 rounded-full" />
            ) : profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.display_name ?? ""}
                className="w-32 h-32 md:w-40 md:h-40 rounded-full object-cover border border-[#2E2418]"
              />
            ) : (
              <div
                className="w-32 h-32 md:w-40 md:h-40 rounded-full border border-[#2E2418] flex items-center justify-center"
                style={{
                  background:
                    "radial-gradient(circle at 30% 30%, #1E1608 0%, #0E0B08 100%)",
                }}
              >
                <span
                  className="text-6xl md:text-7xl text-[#C8956A] leading-none"
                  style={{ fontFamily: "'DM Serif Display', serif" }}
                >
                  {initial}
                </span>
              </div>
            )}
            <div className="absolute bottom-2 right-2 w-4 h-4 rounded-full bg-[#0E0B08] border border-[#1E1608] flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-[#7EB89A] opacity-80" />
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
                    className="text-4xl md:text-5xl text-[#F4EDE4] italic leading-tight"
                    style={{ fontFamily: "'DM Serif Display', serif" }}
                  >
                    {profile?.display_name ?? "Traveler"}
                  </h1>
                  {isOwnProfile && (
                    <Link to="/settings">
                      <motion.button
                        whileHover={{ borderColor: "rgba(200,149,106,0.6)" }}
                        className="px-5 py-2 text-[10px] border border-[#2E2418] text-[#C8956A] hover:bg-[#C8956A]/5 rounded-sm transition-colors tracking-[0.15em]"
                        style={{ fontFamily: "'JetBrains Mono', monospace" }}
                      >
                        EDIT PROFILE
                      </motion.button>
                    </Link>
                  )}
                </div>

                <div
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-[#8C7B68] tracking-widest mb-3"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {(profile?.city || profile?.country) && (
                    <>
                      <span>
                        {[profile.city, profile.country].filter(Boolean).join(", ")}
                      </span>
                      <span className="text-[#2E2418]">·</span>
                    </>
                  )}
                  <span>MEMBER SINCE {memberSince.toUpperCase()}</span>
                </div>

                {avgRating !== null && (
                  <div className="flex items-center gap-3 mb-3">
                    <RatingDots rating={Math.round(avgRating)} />
                    <span
                      className="text-[10px] text-[#8C7B68] tracking-wider"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      {avgRating.toFixed(1)} · {reviews!.length} REVIEW
                      {reviews!.length !== 1 ? "S" : ""}
                    </span>
                  </div>
                )}

                {profile?.bio && (
                  <p className="text-[#8C7B68] text-sm leading-relaxed max-w-[50ch] mt-4">
                    {profile.bio}
                  </p>
                )}
              </>
            )}
          </div>
        </motion.div>
      </section>

      <div className="h-px bg-[#1A1208] mx-6 md:mx-12 xl:mx-20 max-w-[1100px] md:mx-auto" />

      {/* ── Listings ── */}
      <section className="px-6 md:px-12 xl:px-20 max-w-[1100px] mx-auto py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-4 bg-[#C8956A]/40 rounded-full" />
            <h2
              className="text-[10px] tracking-[0.22em] text-[#8C7B68]"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              ACTIVE LISTINGS
            </h2>
            {listings && listings.length > 0 && (
              <span
                className="text-[10px] text-[#3A2E20] tabular-nums"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {listings.length}
              </span>
            )}
          </div>

          {!listings ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : listings.length === 0 ? (
            <p
              className="text-[#3A2E20] text-[11px] tracking-wider"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              No active listings.
            </p>
          ) : (
            <div className="space-y-1.5">
              {listings.slice(0, 10).map((l, i) => (
                <motion.div
                  key={l.id}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: i * 0.04, ease: "easeOut" }}
                  className="flex items-center justify-between px-4 py-3.5 bg-[#0E0B08] border border-[#1A1208] hover:border-[#2E2418] rounded-sm transition-colors"
                >
                  <div className="flex items-center gap-5">
                    <span
                      className="text-[9px] text-[#C8956A]/50 tracking-widest w-14 shrink-0"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      {l.kind?.toUpperCase()}
                    </span>
                    <span className="text-sm text-[#F4EDE4]">
                      {l.origin_city}
                      <span className="text-[#C8956A]/50 mx-2">→</span>
                      {l.dest_city}
                    </span>
                  </div>
                  <span
                    className="text-[9px] text-[#7EB89A] tracking-[0.15em]"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    OPEN
                  </span>
                </motion.div>
              ))}
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
            <div className="w-1 h-4 bg-[#C8956A]/40 rounded-full" />
            <h2
              className="text-[10px] tracking-[0.22em] text-[#8C7B68]"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              REVIEWS
            </h2>
          </div>

          {!reviews ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : reviews.length === 0 ? (
            <p
              className="text-[#3A2E20] text-[11px] tracking-wider"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              No reviews yet.
            </p>
          ) : (
            <div className="space-y-3">
              {reviews.map((review, i) => (
                <motion.div
                  key={review.id}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35, delay: i * 0.05, ease: "easeOut" }}
                  className="p-5 bg-[#0E0B08] border border-[#1A1208] rounded-sm"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-7 h-7 rounded-full bg-[#1A1208] border border-[#2E2418] flex items-center justify-center"
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: "11px",
                          color: "#C8956A",
                        }}
                      >
                        {review.reviewer_id.charAt(0).toUpperCase()}
                      </div>
                      <RatingDots rating={review.rating} />
                    </div>
                    <span
                      className="text-[9px] text-[#3A2E20] tracking-widest"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      {new Date(review.created_at)
                        .toLocaleDateString("en-GB", { month: "short", year: "numeric" })
                        .toUpperCase()}
                    </span>
                  </div>
                  {review.comment && (
                    <p className="text-[#8C7B68] text-sm leading-relaxed">{review.comment}</p>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </section>
    </div>
  )
}
