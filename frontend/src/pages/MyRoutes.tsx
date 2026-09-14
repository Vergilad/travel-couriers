/**
 * My routes: one manifest for your stuff and who's waiting for it. Matches
 * grouped under your listings on top, your listings with close/delete below.
 * Two GETs, same endpoints as the two pages this replaces; no tabs, because
 * nobody holds that many active listings at once.
 */
import * as React from "react"
import { Link, useNavigate } from "@tanstack/react-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/lib/auth"
import { authedFetch } from "@/lib/api"
import type { Listing } from "@/types/listing"
import { formatPrice } from "@/lib/listings"
import { useTranslation } from "@/i18n/I18nContext"

interface MatchGroup {
  listing: Listing
  matches: Listing[]
}

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

export function MyRoutes() {
  const { t } = useTranslation()
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [confirm, setConfirm] = React.useState<{ id: string; action: "close" | "delete" } | null>(null)

  React.useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: "/auth", search: { mode: "signin", redirect: "/my-listings" } })
    }
  }, [authLoading, user, navigate])

  const { data: mine, isLoading: mineLoading, isError: mineError } = useQuery({
    queryKey: ["my-listings"],
    queryFn: async () => {
      const res = await authedFetch("/api/listings/mine")
      if (!res.ok) throw new Error("mine")
      return res.json() as Promise<Listing[]>
    },
    enabled: !!user,
  })

  const { data: groups } = useQuery({
    queryKey: ["matches"],
    queryFn: async () => {
      const res = await authedFetch("/api/listings/matches")
      if (!res.ok) throw new Error("matches")
      return res.json() as Promise<MatchGroup[]>
    },
    enabled: !!user,
  })

  const closeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await authedFetch(`/api/listings/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "cancelled" }),
      })
      if (!res.ok) throw new Error("close")
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-listings"] })
      qc.invalidateQueries({ queryKey: ["matches"] })
      setConfirm(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await authedFetch(`/api/listings/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("delete")
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-listings"] })
      qc.invalidateQueries({ queryKey: ["matches"] })
      setConfirm(null)
    },
  })

  if (authLoading || !user) {
    return (
      <div className="manifest">
        <div className="manifest-field" aria-hidden="true">
          <div className="skel" style={{ height: 120 }} />
        </div>
      </div>
    )
  }

  const listings = mine ?? []
  const liveGroups = (groups ?? []).filter((g) => g.matches.length > 0)
  const openFirst = [...listings].sort((a, b) =>
    a.status === b.status ? 0 : a.status === "open" ? -1 : 1,
  )
  const busy = closeMutation.isPending || deleteMutation.isPending

  return (
    <div className="manifest">
      {/* ── Header ── */}
      <section className="manifest-field">
        <div className="closing-row" style={{ marginTop: 0 }}>
          <div>
            <h2 className="field-caption" style={{ marginBottom: 8 }}>{t("myroutes.menu")}</h2>
            <h1 className="font-display" style={{ fontSize: "var(--t-h2)", margin: 0 }}>
              {t("myroutes.title")}
            </h1>
            <p className="copy ink-dim" style={{ marginTop: 10, maxWidth: "52ch" }}>
              {t("myroutes.sub")}
            </p>
          </div>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            <Link to="/carry/new" className="btn btn--primary press">
              {t("listings.post_carry")}
            </Link>
            <Link to="/need/new" className="btn btn--teal press">
              {t("listings.post_need")}
            </Link>
          </div>
        </div>
      </section>

      {/* ── Your listings ── */}
      <section className="manifest-field">
        <h2 className="field-caption">
          {t("listings.my_listings")}
          {listings.length > 0 && <span className="tabular"> · {listings.length}</span>}
        </h2>
        {mineLoading ? (
          <div aria-hidden="true">
            {[0, 1].map((i) => (
              <div key={i} className="skel" style={{ height: 60, marginBottom: i < 1 ? 12 : 0 }} />
            ))}
          </div>
        ) : mineError ? (
          <p role="alert" className="copy" style={{ margin: 0, color: "var(--destructive)" }}>
            {t("listings.failed_load")}
          </p>
        ) : listings.length === 0 ? (
          <p className="copy ink-dim" style={{ margin: 0 }}>
            {t("listings.no_listings_yet")}
          </p>
        ) : (
          <div style={{ display: "grid", gap: "var(--bw)", background: "var(--line)" }}>
            {openFirst.map((l) => {
              const armed = confirm?.id === l.id
              return (
                <div key={l.id} className="dossier-row" style={{ rowGap: 10 }}>
                  <KindChip kind={l.kind} />
                  <span style={{ minWidth: 0 }}>
                    <Link
                      to="/listings/$id"
                      params={{ id: l.id }}
                      className="font-display"
                      style={{ fontSize: "1rem", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text)", textDecoration: "none" }}
                    >
                      {l.title || `${l.origin_city} → ${l.dest_city}`}
                    </Link>
                    <span className="font-label field-dim" style={{ display: "block", marginTop: 4 }}>
                      {l.origin_city} → {l.dest_city} · {l.status.toUpperCase()}
                    </span>
                    {armed ? (
                      <span style={{ display: "flex", gap: 12, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
                        <span className="font-label">
                          {confirm.action === "close" ? t("listings.close_this_listing") : t("listings.delete_this_listing")}
                        </span>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            confirm.action === "close"
                              ? closeMutation.mutate(l.id)
                              : deleteMutation.mutate(l.id)
                          }
                          className="font-label"
                          style={{ cursor: "pointer", background: "none", border: 0, padding: 0, color: "var(--destructive)" }}
                        >
                          {confirm.action === "close" ? t("listings.confirm_close") : t("listings.confirm_deleting")}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirm(null)}
                          className="font-label"
                          style={{ cursor: "pointer", background: "none", border: 0, padding: 0, color: "var(--text-muted)" }}
                        >
                          {t("listings.cancel")}
                        </button>
                      </span>
                    ) : (
                      <span style={{ display: "flex", gap: 12, marginTop: 8, flexWrap: "wrap" }}>
                        {l.status === "open" && (
                          <button
                            type="button"
                            onClick={() => setConfirm({ id: l.id, action: "close" })}
                            className="font-label field-dim"
                            style={{ cursor: "pointer", background: "none", border: 0, padding: 0 }}
                          >
                            {t("listings.close_listing")}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setConfirm({ id: l.id, action: "delete" })}
                          className="font-label"
                          style={{ cursor: "pointer", background: "none", border: 0, padding: 0, color: "var(--text-muted)" }}
                        >
                          {t("listings.delete")}
                        </button>
                      </span>
                    )}
                  </span>
                  <span
                    className="font-label tabular"
                    style={{ whiteSpace: "nowrap", color: l.status === "open" ? "var(--success)" : "var(--text-muted)" }}
                  >
                    {l.status.toUpperCase()}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ── Waiting for you ── */}
      <section className="manifest-field">
        <h2 className="field-caption">
          {t("matches.title")}
          {liveGroups.length > 0 && (
            <span className="tabular">
              {" "}· {liveGroups.reduce((n, g) => n + g.matches.length, 0)}
            </span>
          )}
        </h2>
        {mineLoading || !groups ? (
          <div aria-hidden="true">
            <div className="skel" style={{ height: 60 }} />
          </div>
        ) : listings.length === 0 ? (
          <>
            <p className="copy" style={{ margin: 0 }}>
              {t("listings.no_listings_yet")}
            </p>
            <p className="copy ink-dim" style={{ marginTop: 8 }}>
              {t("matches.hint_no_listings")}
            </p>
          </>
        ) : liveGroups.length === 0 ? (
          <>
            <p className="copy" style={{ margin: 0 }}>
              {t("matches.no_matches_found")}
            </p>
            <p className="copy ink-dim" style={{ marginTop: 8 }}>
              {t("matches.hint_has_listings")}
            </p>
          </>
        ) : (
          <div style={{ display: "grid", gap: 20 }}>
            {liveGroups.map((group) => (
              <div key={group.listing.id}>
                <p className="font-label field-dim" style={{ margin: "0 0 8px", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <KindChip kind={group.listing.kind} />
                  {group.listing.origin_city} → {group.listing.dest_city}
                  <span className="tabular">
                    · {group.matches.length}{" "}
                    {group.matches.length === 1 ? t("matches.match_singular") : t("matches.match_plural")}
                  </span>
                </p>
                <nav style={{ display: "grid", gap: "var(--bw)", background: "var(--line)" }}>
                  {group.matches.map((m) => (
                    <Link key={m.id} to="/listings/$id" params={{ id: m.id }} className="dossier-row field-row">
                      <KindChip kind={m.kind} />
                      <span
                        className="font-display"
                        style={{ fontSize: "1rem", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                      >
                        {m.title || `${m.origin_city} → ${m.dest_city}`}
                      </span>
                      <span className="font-label" style={{ whiteSpace: "nowrap" }}>
                        {m.price ? formatPrice(m.price, m.currency) : t("listings.negotiate")}
                      </span>
                    </Link>
                  ))}
                </nav>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
