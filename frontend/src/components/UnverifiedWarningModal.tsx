import { Link } from "@tanstack/react-router"
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: "color-mix(in srgb, var(--ground) 82%, transparent)" }}
      onClick={onCancel}
    >
      <div
        className="w-full"
        style={{
          maxWidth: 440,
          background: "var(--sheet)",
          border: "var(--bw) solid var(--line)",
          boxShadow: "var(--shadow)",
          padding: "var(--tile-pad)",
        }}
        onClick={e => e.stopPropagation()}
      >
        <p className="field-caption" style={{ margin: 0, color: "var(--destructive)" }}>
          {heading}
        </p>

        <div style={{ marginTop: 12 }}>
          {body.map((line, i) => (
            <p
              key={i}
              className="copy ink-dim"
              style={{ margin: i === 0 ? 0 : "8px 0 0" }}
            >
              {line}
            </p>
          ))}
          <p className="copy ink-dim" style={{ margin: "8px 0 0" }}>
            {t('unverified_warning.not_verified_yourself')}{" "}
            <Link
              to="/verify"
              className="underline underline-offset-2"
              style={{ color: "var(--text)" }}
              onClick={onCancel}
            >
              {t('unverified_warning.verify_your_identity')}
            </Link>{" "}
            {t('unverified_warning.build_trust')}
          </p>
        </div>

        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 20 }}>
          <button
            onClick={onCancel}
            className="btn btn--ghost"
          >
            {t('unverified_warning.cancel')}
          </button>
          <button
            onClick={onProceed}
            className="btn btn--plain press"
            style={{ borderColor: "var(--destructive)", color: "var(--destructive)" }}
          >
            {t('unverified_warning.i_understand_risk')}
          </button>
        </div>
      </div>
    </div>
  )
}