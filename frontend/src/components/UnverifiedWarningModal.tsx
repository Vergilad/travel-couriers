/**
 * UnverifiedWarningModal — shown before Contact or Confirm when the OTHER
 * party has not verified their identity. Always suggests the current user
 * also verify, since trust is mutual.
 *
 * Never hard-blocks. Requires active acknowledgment each time.
 */
import { Link } from "@tanstack/react-router"
import { motion } from "framer-motion"

export interface UnverifiedWarningModalProps {
  /** Which action triggered the modal */
  variant: "contact" | "confirm"
  otherName: string
  onProceed: () => void
  onCancel: () => void
}

export function UnverifiedWarningModal({
  variant,
  otherName,
  onProceed,
  onCancel,
}: UnverifiedWarningModalProps) {
  const isConfirm = variant === "confirm"

  const heading = `${otherName} has not verified their identity`

  const body = isConfirm
    ? [
        "This person's real identity is unknown to Peregri.",
        "Confirming arrangements with unverified users increases the risk of fraud, dangerous items, and no-shows.",
        "Peregri strongly advises against confirming arrangements with unverified users.",
      ]
    : [
        "This person's real identity is unknown to Peregri.",
        "Contacting unverified users significantly increases the risk of fraud, dangerous items, or wasted time.",
        "We strongly recommend only engaging with verified users.",
      ]

  const mono: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: "rgba(9,9,11,0.88)", backdropFilter: "blur(8px)" }}
      onClick={onCancel}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.18 }}
        className="w-full max-w-md rounded-sm overflow-hidden"
        style={{ background: "var(--surface)", border: "1px solid rgba(239,68,68,0.35)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div
          className="px-6 py-4 flex items-center gap-3"
          style={{ background: "rgba(239,68,68,0.07)", borderBottom: "1px solid rgba(239,68,68,0.2)" }}
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
            <path
              d="M8 2L14.5 13.5H1.5L8 2Z"
              stroke="var(--destructive)" strokeWidth="1.5" strokeLinejoin="round"
            />
            <line x1="8" y1="6.5" x2="8" y2="10" stroke="var(--destructive)" strokeWidth="1.4" strokeLinecap="round"/>
            <circle cx="8" cy="12" r="0.75" fill="var(--destructive)"/>
          </svg>
          <p
            className="text-[11px] font-bold tracking-[0.12em]"
            style={{ ...mono, color: "var(--destructive)" }}
          >
            {heading.toUpperCase()}
          </p>
        </div>

        {/* ── Body ── */}
        <div className="px-6 py-5 space-y-2.5">
          {body.map((line, i) => (
            <p
              key={i}
              className="text-[13px] leading-relaxed"
              style={{ color: i === 0 ? "var(--text)" : "var(--text-muted)" }}
            >
              {line}
            </p>
          ))}
          {/* Always nudge the current user to verify too */}
          <p className="text-[12px] leading-relaxed pt-1" style={{ color: "var(--text-muted)" }}>
            Not verified yourself?{" "}
            <Link
              to="/verify"
              className="underline underline-offset-2 transition-colors"
              style={{ color: "var(--accent)" }}
              onClick={onCancel}
            >
              Verify your identity
            </Link>{" "}
            to build trust with others.
          </p>
        </div>

        {/* ── Actions ── */}
        <div
          className="px-6 py-4 flex items-center justify-end gap-2"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <button
            onClick={onCancel}
            className="px-4 py-2.5 rounded-full text-[10px] tracking-widest transition-colors"
            style={{ ...mono, color: "var(--text-muted)", border: "1px solid var(--border)" }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = "var(--accent)"
              e.currentTarget.style.color = "var(--accent)"
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = "var(--border)"
              e.currentTarget.style.color = "var(--text-muted)"
            }}
          >
            CANCEL
          </button>
          <button
            onClick={onProceed}
            className="px-4 py-2.5 rounded-full text-[10px] tracking-widest transition-colors"
            style={{ ...mono, color: "var(--text-muted)", border: "1px solid rgba(239,68,68,0.35)" }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = "rgba(239,68,68,0.6)"
              e.currentTarget.style.color = "var(--destructive)"
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = "rgba(239,68,68,0.35)"
              e.currentTarget.style.color = "var(--text-muted)"
            }}
          >
            I UNDERSTAND THE RISK
          </button>
        </div>
      </motion.div>
    </div>
  )
}
