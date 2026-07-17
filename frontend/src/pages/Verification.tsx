/**
 * Standalone verification page at /verify
 * Users land here after returning from Telegram Passport,
 * or can navigate here directly to complete verification.
 */
import * as React from "react"
import { useNavigate } from "@tanstack/react-router"
import { useAuth } from "@/lib/auth"
import { VerificationGate } from "@/components/VerificationGate"

export function VerificationPage() {
  const { session, user, loading } = useAuth()
  const navigate = useNavigate()
  const token = session?.access_token ?? ""

  const [verified, setVerified] = React.useState(false)
  const [checking, setChecking] = React.useState(true)
  const [isVerified, setIsVerified] = React.useState(false)

  React.useEffect(() => {
    if (loading) return
    if (!user) {
      navigate({ to: "/auth", search: { mode: "signin", redirect: "/verify" } })
      return
    }
    // Check current status
    fetch("/api/verification/status", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => {
        setIsVerified(!!d.verified)
        setChecking(false)
      })
      .catch(() => setChecking(false))
  }, [loading, user, token])

  if (loading || checking) {
    return (
      <div
        className="flex items-center justify-center min-h-screen"
        style={{ background: "var(--bg)" }}
      >
        <div
          className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: "var(--border)", borderTopColor: "var(--accent)" }}
        />
      </div>
    )
  }

  if (isVerified || verified) {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-screen gap-6 px-6 text-center"
        style={{ background: "var(--bg)" }}
      >
        <div className="text-[32px]">✓</div>
        <div>
          <p
            className="text-[11px] tracking-[0.2em] mb-2"
            style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--success)" }}
          >
            IDENTITY VERIFIED
          </p>
          <p className="text-[14px]" style={{ color: "var(--text-muted)" }}>
            Your identity has been verified. You can now confirm matches on Peregri.
          </p>
        </div>
        <button
          onClick={() => navigate({ to: "/messages" })}
          className="px-6 py-2.5 rounded-full text-[11px] tracking-widest transition-colors"
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            background: "var(--accent)",
            color: "#ffffff",
          }}
          onMouseEnter={e => (e.currentTarget.style.background = "var(--accent-dim)")}
          onMouseLeave={e => (e.currentTarget.style.background = "var(--accent)")}
        >
          GO TO MESSAGES →
        </button>
      </div>
    )
  }

  // Show the gate inline (not as an overlay) for the standalone page
  return (
    <div
      className="flex items-center justify-center min-h-screen p-4"
      style={{ background: "var(--bg)" }}
    >
      <VerificationGate
        token={token}
        youNeedVerify={true}
        otherNeedVerify={false}
        onClose={() => navigate({ to: "/" })}
        onVerified={() => setVerified(true)}
      />
    </div>
  )
}
