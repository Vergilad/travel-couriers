import * as React from "react"
import { Link, useNavigate } from "@tanstack/react-router"
import { motion } from "framer-motion"
import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/lib/auth"
import { authedFetch } from "@/lib/api"
import type { Listing } from "@/types/listing"
import { formatListingDate, formatRoute, kindLabel } from "@/lib/listings"
import { ListingRow } from "@/components/ui/listing-row"
import { Badge } from "@/components/ui/badge"
import { useTranslation } from "@/i18n/I18nContext"

// ─── Types ────────────────────────────────────────────────────────────────────
interface MatchGroup {
  listing: Listing
  matches: Listing[]
}

// ─── Data ─────────────────────────────────────────────────────────────────────
async function fetchMatches(): Promise<MatchGroup[]> {
  const res = await authedFetch("/api/listings/matches")
  if (!res.ok) throw new Error("Failed to load matches")
  return res.json()
}

// ─── Spinner ──────────────────────────────────────────────────────────────────
function Spinner() {
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

// ─── Group header ─────────────────────────────────────────────────────────────
function YourListingHeader({ listing, matchCount }: { listing: Listing; matchCount: number }) {
  const { t } = useTranslation()
  return (
    <div
      className="mb-3 px-4 py-3 rounded-sm flex items-center gap-3 flex-wrap"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <span
        className="text-[10px] tracking-widest"
        style={{ fontFamily: "var(--font-mono)", color: "var(--text-faint)" }}
      >
        {t('matches.your_listing')}
      </span>
      <Badge variant={listing.kind}>{kindLabel(listing.kind)}</Badge>
      <span
        className="text-[12px]"
        style={{ fontFamily: "var(--font-mono)", color: "var(--text)" }}
      >
        {formatRoute(listing)}
      </span>
      {listing.depart_date && (
        <span className="text-[12px]" style={{ color: "var(--text-muted)" }}>
          {formatListingDate(listing.depart_date)}
        </span>
      )}
      <span
        className="ml-auto text-[11px]"
        style={{ fontFamily: "var(--font-mono)", color: "var(--text-faint)" }}
      >
        {matchCount} {matchCount === 1 ? t('matches.match_singular') : t('matches.match_plural')}
      </span>
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState({ hasListings }: { hasListings: boolean }) {
  const { t } = useTranslation()
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: 0.05 }}
      className="py-20 text-center"
    >
      <p className="text-[14px] mb-2" style={{ color: "var(--text)" }}>
        {hasListings ? t('matches.no_matches_found') : t('matches.no_open_listings')}
      </p>
      <p
        className="text-[13px] mb-8 mx-auto max-w-[340px] leading-relaxed"
        style={{ color: "var(--text-muted)" }}
      >
        {hasListings
          ? t('matches.hint_has_listings')
          : t('matches.hint_no_listings')}
      </p>
      <div className="flex items-center justify-center gap-3">
        <Link
          to="/browse"
          className="text-[11px] font-bold tracking-widest px-5 py-2 rounded-sm transition-colors"
          style={{
            fontFamily: "var(--font-mono)",
            border: "1px solid var(--border)",
            color: "var(--text-muted)",
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text)")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-muted)")}
        >
          {t('matches.browse')}
        </Link>
        <Link
          to="/trips/new"
          className="text-[11px] font-bold tracking-widest px-5 py-2 rounded-sm transition-colors"
          style={{ fontFamily: "var(--font-mono)", background: "var(--accent)", color: "#fff" }}
        >
          {t('matches.post_a_trip')}
        </Link>
      </div>
    </motion.div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export function MatchesPage() {
  const { t } = useTranslation()
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  React.useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: "/auth", search: { mode: "signin", redirect: "/matches" } as never })
    }
  }, [authLoading, user, navigate])

  const { data: groups, isLoading, isError } = useQuery({
    queryKey: ["matches"],
    queryFn: fetchMatches,
    enabled: !!user,
  })

  if (authLoading || !user || isLoading) return <Spinner />

  const hasGroups = (groups ?? []).length > 0

  return (
    <div className="min-h-screen pt-24 pb-16" style={{ background: "var(--bg)" }}>
      <div className="mx-auto max-w-[720px] px-6">

        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="mb-10"
        >
          <h1 className="text-[22px] font-bold mb-1.5" style={{ color: "var(--text)" }}>
            {t('matches.title')}
          </h1>
          <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
            {t('matches.subtitle')}
          </p>
        </motion.div>

        {/* ── Error ── */}
        {isError && (
          <p className="text-[13px]" style={{ color: "var(--destructive)" }}>
            {t('matches.load_error')}
          </p>
        )}

        {/* ── Empty ── */}
        {!isError && !hasGroups && <EmptyState hasListings={false} />}

        {/* ── Groups ── */}
        {!isError && hasGroups && (
          <div className="flex flex-col gap-10">
            {groups!.map((group, gi) => (
              <motion.section
                key={group.listing.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, delay: gi * 0.07 }}
              >
                <YourListingHeader listing={group.listing} matchCount={group.matches.length} />
                <div style={{ borderTop: "1px solid var(--border)" }}>
                  {group.matches.map((match) => (
                    <ListingRow key={match.id} listing={match} />
                  ))}
                </div>
              </motion.section>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}
