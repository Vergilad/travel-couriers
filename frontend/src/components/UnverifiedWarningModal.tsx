import { Link } from "@tanstack/react-router"
import { motion } from "framer-motion"
import { useTranslation } from "@/i18n/I18nContext"

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
  const { t } = useTranslation()
  const isConfirm = variant === "confirm"

  const heading = `${otherName} ${t('unverified_warning.not_verified_heading')}`

  const body = isConfirm
    ? [
        t('unverified_warning.identity_unknown'),
        t('unverified_warning.confirm_risk'),
        t('unverified_warning.advise_against_confirm'),
      ]
    : [
        t('unverified_warning.identity_unknown'),
        t('unverified_warning.contact_risk'),
        t('unverified_warning.recommend_verified_only'),
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
          <p className="text-[12px] leading-relaxed pt-1" style={{ color: "var(--text-muted)" }}>
            {t('unverified_warning.not_verified_yourself')}{" "}
            <Link
              to="/verify"
              className="underline underline-offset-2 transition-colors"
              style={{ color: "var(--accent)" }}
              onClick={onCancel}
            >
              {t('unverified_warning.verify_your_identity')}
            </Link>{" "}
            {t('unverified_warning.build_trust')}
          </p>
        </div>

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
            {t('unverified_warning.cancel')}
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
            {t('unverified_warning.i_understand_risk')}
          </button>
        </div>
      </motion.div>
    </div>
  )
}