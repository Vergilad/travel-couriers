/**
 * VerificationGate - manual review form (ID photo + selfie forwarded to the
 * admin via Telegram bot). Same submit contract as before; only the surface
 * changed: route inputs, seg-free buttons, full EN+RU wiring (the old form
 * hardcoded English and cut one sentence in half).
 *
 * Two framings, one form: `bare` renders inline for the /verify page,
 * the default wraps in a modal overlay for the inbox confirm flow.
 */
import * as React from "react"
import { authedFetch } from "@/lib/api"
import { compressDocument } from "@/lib/images"
import { useTranslation } from "@/i18n/I18nContext"
import { useColorMode } from "@/hooks/use-color-mode"

type Step = "manual_form" | "manual_submitted" | "other_only"

interface VerificationGateProps {
  token: string
  youNeedVerify: boolean
  otherNeedVerify: boolean
  onClose: () => void
  onVerified: () => void
  /** Inline (page) instead of modal overlay (inbox). */
  bare?: boolean
}

function FilePicker({
  label,
  file,
  onChange,
}: {
  label: string
  file: File | null
  onChange: (f: File) => void
}) {
  const { t } = useTranslation()
  const ref = React.useRef<HTMLInputElement>(null)
  return (
    <div>
      <p className="font-label field-dim" style={{ margin: "0 0 6px" }}>{label}</p>
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className="route-input field-row"
        style={{ textAlign: "left", cursor: "pointer", color: file ? "var(--text)" : "var(--text-muted)" }}
      >
        {file ? `✓ ${file.name}` : t("verification.click_choose_file")}
      </button>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => e.target.files?.[0] && onChange(e.target.files[0])}
      />
    </div>
  )
}

export function VerificationGate({
  token: _token,
  youNeedVerify,
  otherNeedVerify,
  onClose,
  onVerified: _onVerified,
  bare = false,
}: VerificationGateProps) {
  const { t } = useTranslation()
  const { mode } = useColorMode()
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
      const form = new FormData()
      form.append("full_name", fullName.trim())
      // Compacted like avatars (roomier: a human reads fine print off
      // these). JPEG output, so fixed .jpg names for the backend check.
      form.append("id_photo", await compressDocument(idPhoto), "id.jpg")
      form.append("selfie_photo", await compressDocument(selfiePhoto), "selfie.jpg")
      // authedFetch: refreshes the 15-minute token when needed, and leaves
      // the multipart boundary alone (see session.ts).
      const res = await authedFetch("/api/verification/start-manual", {
        method: "POST",
        body: form,
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(typeof d.detail === "string" ? d.detail : t("verification.submit_failed"))
      }
      setStep("manual_submitted")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("verification.submit_failed"))
    } finally {
      setBusy(false)
    }
  }

  const body = (
    <>
      {step === "other_only" && (
        <>
          <p className="copy" style={{ margin: 0, maxWidth: "52ch" }}>
            {t("verification.other_not_verified")}
          </p>
          <p className="copy ink-dim" style={{ marginTop: 10 }}>
            {t("verification.ask_them_verify")}
          </p>
          <div style={{ marginTop: 16 }}>
            <button type="button" onClick={onClose} className="btn btn--plain press">
              {t("verification.close")}
            </button>
          </div>
        </>
      )}

      {step === "manual_form" && (
        <form onSubmit={submitManual} style={{ display: "grid", gap: 16 }}>
          <div>
            <h3 className="font-display" style={{ fontSize: "var(--t-h3)", margin: 0 }}>
              {t("verification.one_last_step")}
            </h3>
            <p className="copy ink-dim" style={{ marginTop: 10, maxWidth: "58ch" }}>
              {t("verification.protect_message")}
            </p>
            <ul className="copy" style={{ margin: "12px 0 0", paddingLeft: 18, display: "grid", gap: 6, maxWidth: "58ch" }}>
              <li>{t("verification.encrypted_photos")}</li>
              <li>{t("verification.human_review")}</li>
              <li>{t("verification.no_storage")}</li>
              <li>{t("verification.no_sharing")}</li>
            </ul>
            {otherNeedVerify && (
              <p className="copy ink-dim" style={{ marginTop: 10 }}>
                {t("verification.recommend_other_verify")}
              </p>
            )}
          </div>

          <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
            <span className="font-label field-dim">{t("verification.full_name_label")}</span>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              placeholder={t("verification.full_name_placeholder")}
              autoComplete="name"
              className="route-input"
            />
          </label>

          <FilePicker label={t("verification.id_document_label")} file={idPhoto} onChange={setIdPhoto} />
          <FilePicker label={t("verification.selfie_label")} file={selfiePhoto} onChange={setSelfiePhoto} />

          {error && (
            <p role="alert" className="copy" style={{ margin: 0, color: "var(--destructive)" }}>
              {error}
            </p>
          )}

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="submit"
              disabled={busy || !fullName.trim() || !idPhoto || !selfiePhoto}
              className="btn btn--primary press"
              style={{ flex: 1, minWidth: 180 }}
            >
              {busy ? t("verification.submitting") : t("verification.submit_for_review")}
            </button>
            <button type="button" onClick={onClose} className="btn btn--plain press">
              {t("verification.cancel")}
            </button>
          </div>
        </form>
      )}

      {step === "manual_submitted" && (
        <>
          <p className="font-label" style={{ margin: 0, color: "var(--success)" }}>
            {t("verification.documents_submitted")}
          </p>
          <p className="copy ink-dim" style={{ marginTop: 10, maxWidth: "58ch" }}>
            {t("verification.documents_sent")}
          </p>
          <div style={{ marginTop: 16 }}>
            <button type="button" onClick={onClose} className="btn btn--primary press">
              {t("verification.close")}
            </button>
          </div>
        </>
      )}
    </>
  )

  if (bare) return <>{body}</>

  // A Viactor island: the inbox still wears old chrome, so the modal brings
  // its own theme scope instead of inheriting unstyled class names.
  return (
    <div
      role="dialog"
      aria-modal="true"
      data-theme="viactor"
      data-mode={mode}
      aria-label={t("verification.identity_verification")}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        background: "rgba(9,9,11,0.85)",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 560,
          maxHeight: "calc(100dvh - 32px)",
          overflowY: "auto",
          background: "var(--sheet)",
          border: "var(--bw) solid var(--line)",
          boxShadow: "var(--shadow)",
          padding: "var(--tile-pad)",
          color: "var(--text)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
          <h2 className="field-caption" style={{ margin: 0 }}>
            {t("verification.identity_verification")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("verification.close")}
            className="font-label"
            style={{ cursor: "pointer", background: "none", border: 0, padding: 4, color: "var(--text-muted)" }}
          >
            ✕
          </button>
        </div>
        {body}
      </div>
    </div>
  )
}
