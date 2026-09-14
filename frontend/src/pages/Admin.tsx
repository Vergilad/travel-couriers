/**
 * Admin review queue: pending ID checks, oldest first. Pick a request, look
 * at both photos, approve or reject with an optional reason. Photos are
 * fetched as blobs (the endpoint is admin-only; no bare <img> URLs leak)
 * and die with the decision on the server.
 *
 * Blind by design: the queue carries request IDs, never accounts.
 * Not linked from any nav. Admins know the address.
 */
import * as React from "react"
import { Link, useNavigate } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/lib/auth"
import { authedFetch } from "@/lib/api"
import { useTranslation } from "@/i18n/I18nContext"

interface QueueItem {
  id: string
  verified_name: string | null
  submitted_at: string
  duplicates: number
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" }).toUpperCase()
}

function usePhotos(requestId: string | null) {
  const [photos, setPhotos] = React.useState<{ id: string; selfie: string } | null>(null)
  const [failed, setFailed] = React.useState(false)
  React.useEffect(() => {
    if (!requestId) {
      setPhotos(null)
      setFailed(false)
      return
    }
    let alive = true
    const urls: string[] = []
    setPhotos(null)
    setFailed(false)
    ;(async () => {
      const out = {} as { id: string; selfie: string }
      for (const kind of ["id", "selfie"] as const) {
        const res = await authedFetch(`/api/verification/requests/${requestId}/photo?kind=${kind}`)
        if (!res.ok) throw new Error("photo")
        const url = URL.createObjectURL(await res.blob())
        urls.push(url)
        out[kind] = url
      }
      if (alive) setPhotos(out)
    })().catch(() => {
      if (alive) setFailed(true)
    })
    return () => {
      alive = false
      urls.forEach((u) => URL.revokeObjectURL(u))
    }
  }, [requestId])
  return { photos, failed }
}

export function AdminPage() {
  const { t } = useTranslation()
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [reason, setReason] = React.useState("")
  const [acting, setActing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const { data: queue, isLoading, refetch } = useQuery({
    queryKey: ["admin-queue"],
    queryFn: async () => {
      const res = await authedFetch("/api/verification/requests")
      if (res.status === 403) throw new Error("forbidden")
      if (!res.ok) throw new Error("queue")
      return res.json() as Promise<QueueItem[]>
    },
    enabled: !!user && user.isAdmin,
  })

  const selected = queue?.find((q) => q.id === selectedId) ?? null
  const { photos, failed: photosFailed } = usePhotos(selected?.id ?? null)

  React.useEffect(() => {
    if (!loading && user && !user.isAdmin) navigate({ to: "/browse" })
  }, [loading, user, navigate])

  async function decide(action: "approve" | "reject") {
    if (!selected || acting) return
    setActing(true)
    setError(null)
    try {
      const res = await authedFetch(`/api/verification/requests/${selected.id}/${action}`, {
        method: "POST",
        body: JSON.stringify(action === "reject" ? { reason } : {}),
      })
      if (!res.ok) throw new Error("decision")
      setSelectedId(null)
      setReason("")
      await refetch()
    } catch {
      setError(t("auth.something_went_wrong"))
    } finally {
      setActing(false)
    }
  }

  if (loading || !user) {
    return (
      <div className="manifest">
        <div className="manifest-field" aria-hidden="true">
          <div className="skel" style={{ height: 120 }} />
        </div>
      </div>
    )
  }
  if (!user.isAdmin) return null

  return (
    <div className="manifest">
      <section className="manifest-field">
        <h2 className="field-caption">{t("admin.gate")}</h2>
        <h1 className="font-display" style={{ fontSize: "var(--t-h2)", margin: 0 }}>
          {t("admin.title")}
        </h1>
        <p className="copy ink-dim" style={{ marginTop: 12, maxWidth: "58ch" }}>
          {t("admin.sub")}
        </p>
      </section>

      <section className="manifest-field">
        {isLoading || !queue ? (
          <div aria-hidden="true">
            <div className="skel" style={{ height: 60 }} />
          </div>
        ) : queue.length === 0 ? (
          <p className="copy ink-dim" style={{ margin: 0 }}>
            {t("admin.empty")}
          </p>
        ) : (
          <div style={{ display: "grid", gap: "var(--bw)", background: "var(--line)" }}>
            {queue.map((q) => (
              <button
                key={q.id}
                type="button"
                onClick={() => { setSelectedId(q.id); setReason(""); setError(null) }}
                aria-pressed={selectedId === q.id}
                className="dossier-row field-row"
                style={{ cursor: "pointer", width: "100%", textAlign: "left", border: 0 }}
              >
                <span className="font-label" style={{ whiteSpace: "nowrap" }}>
                  {q.verified_name ?? q.id.slice(0, 8)}
                </span>
                <span className="font-label field-dim tabular" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {q.id.slice(0, 8).toUpperCase()}
                </span>
                <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                  {q.duplicates > 0 && (
                    <span className="stencil-chip" style={{ borderColor: "var(--destructive)", color: "var(--destructive)" }}>
                      {t("admin.dup_flag")} x{q.duplicates}
                    </span>
                  )}
                  <span className="font-label field-dim tabular" style={{ whiteSpace: "nowrap" }}>
                    {shortDate(q.submitted_at)}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      {selected && (
        <section className="manifest-field">
          <h2 className="field-caption">
            {selected.verified_name ?? selected.id.slice(0, 8).toUpperCase()}
          </h2>
          <p className="font-label field-dim" style={{ margin: "0 0 16px" }}>
            {selected.id.slice(0, 8).toUpperCase()}
            {selected.duplicates > 0 && ` - ${t("admin.dup_flag")} x${selected.duplicates}`}
          </p>

          {photosFailed ? (
            <p role="alert" className="copy" style={{ color: "var(--destructive)" }}>
              {t("auth.something_went_wrong")}
            </p>
          ) : !photos ? (
            <div className="detail-split" aria-hidden="true">
              <div className="skel" style={{ height: 220 }} />
              <div className="skel" style={{ height: 220 }} />
            </div>
          ) : (
            <div className="detail-split">
              <figure style={{ margin: 0, background: "var(--sheet)" }}>
                <img src={photos.id} alt={t("admin.id_photo")} style={{ width: "100%", display: "block" }} />
                <figcaption className="font-label field-dim" style={{ padding: "10px 0 0" }}>
                  {t("admin.id_photo")}
                </figcaption>
              </figure>
              <figure style={{ margin: 0, background: "var(--sheet)" }}>
                <img src={photos.selfie} alt={t("admin.selfie")} style={{ width: "100%", display: "block" }} />
                <figcaption className="font-label field-dim" style={{ padding: "10px 0 0" }}>
                  {t("admin.selfie")}
                </figcaption>
              </figure>
            </div>
          )}

          <label style={{ display: "grid", gap: 6, marginTop: 16 }}>
            <span className="font-label field-dim">{t("admin.reason_label")}</span>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t("admin.reason_ph")}
              maxLength={200}
              className="route-input"
            />
          </label>

          {error && (
            <p role="alert" className="copy" style={{ margin: "12px 0 0", color: "var(--destructive)" }}>
              {error}
            </p>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => void decide("approve")}
              disabled={acting || !photos}
              className="btn btn--primary press"
              style={{ flex: 1, minWidth: 160 }}
            >
              {t("admin.approve")}
            </button>
            <button
              type="button"
              onClick={() => void decide("reject")}
              disabled={acting || !photos}
              className="btn btn--plain press"
              style={{ flex: 1, minWidth: 160, borderColor: "var(--destructive)", color: "var(--destructive)" }}
            >
              {t("admin.reject")}
            </button>
          </div>
        </section>
      )}

      <section className="manifest-field">
        <Link to="/browse" className="font-label" style={{ color: "var(--text-muted)", textDecoration: "none" }}>
          {t("listings.back_to_browse")}
        </Link>
      </section>
    </div>
  )
}
