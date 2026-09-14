/**
 * Verify as a Viactor ticket: narrow manifest, same gate form inline.
 * Checking shows skeletons; verified shows the VERIFIED stamp (this is its
 * moment, not the auth page's) with a way onward; otherwise the form.
 * Same status contract as before; only the surface changed.
 */
import * as React from "react"
import { useNavigate } from "@tanstack/react-router"
import { useAuth } from "@/lib/auth"
import { VerificationGate } from "@/components/VerificationGate"
import { useTranslation } from "@/i18n/I18nContext"

export function VerificationPage() {
  const { t } = useTranslation()
  const { session, user, loading } = useAuth()
  const navigate = useNavigate()
  const token = session?.access_token ?? ""

  const [checking, setChecking] = React.useState(true)
  const [isVerified, setIsVerified] = React.useState(false)

  React.useEffect(() => {
    if (loading) return
    if (!user) {
      navigate({ to: "/auth", search: { mode: "signin", redirect: "/verify" } })
      return
    }
    fetch("/api/verification/status", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        setIsVerified(!!d.verified)
        setChecking(false)
      })
      .catch(() => setChecking(false))
  }, [loading, user, token, navigate])

  if (loading || checking) {
    return (
      <div className="manifest ticket" aria-hidden="true">
        <div className="manifest-field">
          <div className="skel" style={{ height: 32, maxWidth: 280, marginBottom: 12 }} />
          <div className="skel" style={{ height: 14, maxWidth: 200 }} />
        </div>
        <div className="manifest-field">
          <div className="skel" style={{ height: 180 }} />
        </div>
      </div>
    )
  }

  if (isVerified) {
    return (
      <div className="manifest ticket">
        <section className="manifest-field" style={{ textAlign: "center", paddingTop: 32, paddingBottom: 32 }}>
          <span className="stamp" style={{ fontSize: "1rem" }}>
            {t("verification.identity_verified")}
          </span>
          <p className="copy ink-dim" style={{ margin: "20px auto 0", maxWidth: "42ch" }}>
            {t("verification.verified_message")}
          </p>
          <div style={{ marginTop: 20 }}>
            <button
              type="button"
              onClick={() => navigate({ to: "/messages" })}
              className="btn btn--primary press"
            >
              {t("verification.go_to_messages")}
            </button>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="manifest ticket">
      <section className="manifest-field">
        <h2 className="field-caption">{t("verification.identity_verification")}</h2>
        <VerificationGate
          token={token}
          youNeedVerify
          otherNeedVerify={false}
          onClose={() => navigate({ to: "/" })}
          onVerified={() => navigate({ to: "/messages" })}
          bare
        />
      </section>
    </div>
  )
}
