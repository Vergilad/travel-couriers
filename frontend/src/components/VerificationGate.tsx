/**
 * VerificationGate — modal shown when a user tries to confirm a match
 * before completing identity verification.
 *
 * Single path: manual review (ID photo + selfie forwarded to admin via Telegram bot).
 */
import * as React from "react"
import { supabase } from "@/lib/supabase"

type Step = "manual_form" | "manual_submitted" | "other_only"

interface VerificationGateProps {
  token: string
  youNeedVerify: boolean
  otherNeedVerify: boolean
  onClose: () => void
  onVerified: () => void
}

const mono: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" }
const monoSm: React.CSSProperties = { ...mono, fontSize: 11, letterSpacing: "0.15em" }

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] tracking-[0.15em] uppercase" style={{ ...mono, color: "var(--text-muted)" }}>
      {children}
    </p>
  )
}

function PrimaryBtn({
  children,
  onClick,
  disabled,
  type = "button",
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  type?: "button" | "submit"
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="px-5 py-2.5 rounded-full text-[11px] font-bold tracking-widest transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      style={{
        ...monoSm,
        background: disabled ? "var(--surface-raised)" : "var(--accent)",
        color: disabled ? "var(--text-muted)" : "#ffffff",
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = "var(--accent-dim)" }}
      onMouseLeave={e => { if (!disabled) e.currentTarget.style.background = "var(--accent)" }}
    >
      {children}
    </button>
  )
}

function GhostBtn({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-4 py-2 rounded-full text-[11px] tracking-widest transition-colors"
      style={{ ...monoSm, color: "var(--text-muted)", border: "1px solid var(--border)" }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = "var(--accent)"
        e.currentTarget.style.color = "var(--accent)"
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = "var(--border)"
        e.currentTarget.style.color = "var(--text-muted)"
      }}
    >
      {children}
    </button>
  )
}

function FileInput({
  label,
  accept,
  file,
  onChange,
}: {
  label: string
  accept: string
  file: File | null
  onChange: (f: File) => void
}) {
  const ref = React.useRef<HTMLInputElement>(null)
  return (
    <div>
      <p className="text-[11px] mb-1.5" style={{ ...monoSm, color: "var(--text-muted)" }}>{label}</p>
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className="w-full px-4 py-3 rounded-sm text-left text-[13px] transition-colors"
        style={{
          background: "var(--surface-raised)",
          border: `1px solid ${file ? "var(--accent)" : "var(--border)"}`,
          color: file ? "var(--text)" : "var(--text-faint)",
        }}
      >
        {file ? `✓ ${file.name}` : "Click to choose file"}
      </button>
      <input
        ref={ref}
        type="file"
        accept={accept}
        className="hidden"
        onChange={e => e.target.files?.[0] && onChange(e.target.files[0])}
      />
    </div>
  )
}

export function VerificationGate({
  token,
  youNeedVerify,
  otherNeedVerify,
  onClose,
  onVerified,
}: VerificationGateProps) {
  const [step, setStep] = React.useState<Step>(youNeedVerify ? "manual_form" : "other_only")
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const [fullName, setFullName] = React.useState("")
  const [idPhoto, setIdPhoto] = React.useState<File | null>(null)
  const [selfiePhoto, setSelfiePhoto] = React.useState<File | null>(null)

  async function submitManual(e: React.FormEvent) {
    e.preventDefault()
    if (!idPhoto || !selfiePhoto || !fullName.trim()) return
    setBusy(true)
    setError(null)
    try {
      const { data: { session } } = await supabase!.auth.getSession()
      const form = new FormData()
      form.append("full_name", fullName.trim())
      form.append("id_photo", idPhoto)
      form.append("selfie_photo", selfiePhoto)

      const res = await fetch("/api/verification/start-manual", {
        method: "POST",
        headers: { Authorization: `Bearer ${session?.access_token}` },
        body: form,
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(typeof d.detail === "string" ? d.detail : "Submission failed")
      }
      setStep("manual_submitted")
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(9,9,11,0.85)", backdropFilter: "blur(6px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-md rounded-sm overflow-hidden"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        {/* Header */}
        <div
          className="px-6 py-4 flex items-center justify-between"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-3">
            <div className="w-1 h-4 rounded-sm" style={{ background: "var(--accent)" }} />
            <Label>Identity Verification</Label>
          </div>
          <button
            onClick={onClose}
            className="text-[18px] leading-none transition-colors"
            style={{ color: "var(--text-faint)" }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--text)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--text-faint)")}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">

          {/* Other party only */}
          {step === "other_only" && (
            <>
              <p className="text-[14px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
                The other party hasn't verified their identity yet. Both participants must be verified before confirming a match.
              </p>
              <p className="text-[13px]" style={{ color: "var(--text-faint)" }}>
                Please ask them to complete identity verification and try again.
              </p>
              <div className="flex justify-end pt-1">
                <GhostBtn onClick={onClose}>CLOSE</GhostBtn>
              </div>
            </>
          )}

          {/* Manual form */}
          {step === "manual_form" && (
            <form onSubmit={submitManual} className="space-y-4">
              <div>
                <p className="text-[15px] font-medium mb-1" style={{ color: "var(--text)" }}>
                  One last step before confirming
                </p>
                <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
                  To protect everyone on Peregri, both parties must verify their identity before a match is confirmed. Here's exactly what happens with your documents:
                </p>
                <ul className="text-[12px] leading-relaxed space-y-1.5 mt-3" style={{ color: "var(--text-faint)" }}>
                  <li>→ Photos are sent over an encrypted connection directly to our team</li>
                  <li>→ A real person reviews them — no automated processing</li>
                  <li>→ Documents are permanently deleted the moment review is complete</li>
                  <li>→ We never store, share, or use them for anything else</li>
                </ul>
                {otherNeedVerify && (
                  <p className="text-[12px] mt-3" style={{ color: "var(--text-faint)" }}>
                    The other party also needs to verify before the match can go through.
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <p className="text-[11px] tracking-[0.15em]" style={{ ...monoSm, color: "var(--text-muted)" }}>
                  FULL NAME (as on your ID)
                </p>
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  required
                  placeholder="e.g. Maria García"
                  className="w-full px-4 py-2.5 rounded-sm text-[14px] focus:outline-none transition-colors"
                  style={{
                    background: "var(--surface-raised)",
                    border: "1px solid var(--border)",
                    color: "var(--text)",
                    caretColor: "var(--accent)",
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = "var(--accent)")}
                  onBlur={e => (e.currentTarget.style.borderColor = "var(--border)")}
                />
              </div>

              <FileInput
                label="ID DOCUMENT (passport, national ID, driver's licence)"
                accept="image/*"
                file={idPhoto}
                onChange={setIdPhoto}
              />
              <FileInput
                label="SELFIE HOLDING YOUR ID"
                accept="image/*"
                file={selfiePhoto}
                onChange={setSelfiePhoto}
              />

              {error && (
                <p className="text-[12px]" style={{ color: "var(--destructive)" }}>{error}</p>
              )}

              <div className="flex items-center gap-3 pt-1">
                <PrimaryBtn
                  type="submit"
                  disabled={busy || !fullName.trim() || !idPhoto || !selfiePhoto}
                >
                  {busy ? "SUBMITTING…" : "SUBMIT FOR REVIEW"}
                </PrimaryBtn>
                <GhostBtn onClick={onClose}>CANCEL</GhostBtn>
              </div>
            </form>
          )}

          {/* Submitted */}
          {step === "manual_submitted" && (
            <>
              <div className="flex items-center gap-3">
                <span className="text-[20px]">✓</span>
                <p className="text-[14px] font-medium" style={{ color: "var(--success)" }}>
                  Documents submitted
                </p>
              </div>
              <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
                Your documents have been sent for review. You'll be able to confirm the match once approved — this usually takes a few hours. You can close this and come back later.
              </p>
              <div className="flex justify-end pt-1">
                <PrimaryBtn onClick={onClose}>CLOSE</PrimaryBtn>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  )
}
