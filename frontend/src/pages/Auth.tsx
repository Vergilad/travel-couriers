/**
 * Auth as a Viactor ticket: one narrow manifest, not a marketing split.
 * Header field names the gate, seg picks signin/join, route inputs take
 * email and password, perforation tears off the stub with the mode switch.
 * On success it navigates straight to the redirect. The VERIFIED stamp
 * lives on the verification page, not here. Same auth contract as before,
 * only the surface changed.
 */
import * as React from "react"
import { Link } from "@tanstack/react-router"
import { saveSession } from "@/lib/session"
import { useAuth } from "@/lib/auth"
import { router } from "@/router"
import { useTranslation } from "@/i18n/I18nContext"

type Mode = "signin" | "signup"

interface AuthPageProps {
  mode?: Mode
  redirect?: string
}

export function AuthPage({ mode: initialMode = "signin", redirect }: AuthPageProps) {
  const { t } = useTranslation()
  const { refreshSession } = useAuth()
  const [mode, setMode] = React.useState<Mode>(initialMode)
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  function switchMode(m: Mode) {
    setMode(m)
    setError(null)
  }

  async function postAuth(path: string) {
    const res = await fetch(`/api/auth/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(typeof data.detail === "string" ? data.detail : t("auth.something_went_wrong"))
    }
    return res.json()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      // No email confirmation step: signup signs straight in.
      // refreshSession pulls the fresh tokens into the auth context so the
      // redirect lands already signed in (no page refresh needed).
      const data = await postAuth(mode === "signin" ? "signin" : "signup")
      saveSession({ access_token: data.access_token, refresh_token: data.refresh_token })
      await refreshSession()
      router.navigate({ to: redirect ?? "/browse" })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("auth.something_went_wrong"))
    } finally {
      setLoading(false)
    }
  }

  const busy = loading

  return (
    <div className="manifest ticket">
      {/* Header field */}
      <section className="manifest-field">
        <h2 className="field-caption">{t("auth.gate")}</h2>
        <h1 className="font-display" style={{ fontSize: "var(--t-h2)", margin: 0 }}>
          {mode === "signin" ? t("auth.headline_signin") : t("auth.headline_signup")}
        </h1>
        <p className="copy ink-dim" style={{ marginTop: 12, maxWidth: "46ch" }}>
          {mode === "signin" ? t("auth.sub_signin") : t("auth.sub_signup")}
        </p>
        <div className="seg" role="tablist" aria-label={t("auth.gate")} style={{ marginTop: 18 }}>
          {(["signin", "signup"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              aria-pressed={mode === m}
              data-active={mode === m || undefined}
              onClick={() => switchMode(m)}
              disabled={busy}
              className="seg-btn"
            >
              {m === "signin" ? t("auth.submit_signin") : t("auth.submit_signup")}
            </button>
          ))}
        </div>
      </section>

      {/* Form field */}
      <section className="manifest-field">
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>
          <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
            <span className="font-label field-dim">{t("auth.email_label")}</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              disabled={busy}
              className="route-input"
            />
          </label>
          <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
            <span className="font-label field-dim">
              {mode === "signin" ? t("auth.password_label") : t("auth.new_password_label")}
            </span>
            <input
              type="password"
              required
              minLength={mode === "signup" ? 8 : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="········"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              disabled={busy}
              className="route-input"
            />
          </label>

          {error && (
            <p role="alert" className="copy" style={{ margin: 0, color: "var(--destructive)" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy || !email || !password}
            className="btn btn--primary press"
            style={{ width: "100%" }}
          >
            {mode === "signin" ? (loading ? t("auth.signing_in") : t("auth.submit_signin")) : loading ? t("auth.joining") : t("auth.submit_signup")}
          </button>
        </form>
      </section>

      {/* Stub field */}
      <section className="manifest-field">
        <div className="perforation" aria-hidden="true" style={{ marginBottom: 18 }} />
        <p className="copy ink-dim" style={{ margin: 0 }}>
          {mode === "signin" ? t("auth.switch_to_signup_q") : t("auth.switch_to_signin_q")}{" "}
          <button
            type="button"
            onClick={() => switchMode(mode === "signin" ? "signup" : "signin")}
            disabled={busy}
            className="font-label"
            style={{
              cursor: "pointer",
              background: "none",
              border: 0,
              padding: 0,
              color: "var(--text)",
              textDecoration: "underline",
              textUnderlineOffset: 3,
            }}
          >
            {mode === "signin" ? t("auth.submit_signup") : t("auth.submit_signin")}
          </button>
        </p>
        <p style={{ margin: "14px 0 0" }}>
          <Link
            to="/browse"
            className="font-label"
            style={{ color: "var(--text-muted)", textDecoration: "none" }}
          >
            {t("listings.back_to_browse")}
          </Link>
        </p>
      </section>
    </div>
  )
}
