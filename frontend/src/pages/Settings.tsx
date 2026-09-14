/**
 * Settings as a Viactor manifest: three fields stacked on one sheet.
 * Profile (avatar picker, name, bio), account (email, sign out, password),
 * danger zone (delete). Same endpoints and validation as before; the tab
 * nav, the modal and the motion are gone. Success and error are inline
 * copy under the form that caused them.
 */
import * as React from "react"
import { authedFetch } from "@/lib/api"
import { compressAvatar } from "@/lib/images"
import { useAuth } from "@/lib/auth"
import { useTranslation } from "@/i18n/I18nContext"

const MAX_BIO = 300
const MAX_DISPLAY_NAME = 40
const MAX_RAW_SIZE = 10 * 1024 * 1024

export function SettingsPage() {
  const { t } = useTranslation()
  const { user, signOut, refreshProfile } = useAuth()
  const [section, setSection] = React.useState<"profile" | "account" | "danger">("profile")

  const [displayName, setDisplayName] = React.useState("")
  const [bio, setBio] = React.useState("")
  const [avatarUrl, setAvatarUrl] = React.useState<string | undefined>()
  const [avatarUploading, setAvatarUploading] = React.useState(false)
  const [profileSaving, setProfileSaving] = React.useState(false)
  const [profileSuccess, setProfileSuccess] = React.useState(false)
  const [profileError, setProfileError] = React.useState<string | null>(null)
  const avatarInputRef = React.useRef<HTMLInputElement>(null)

  const [currentPassword, setCurrentPassword] = React.useState("")
  const [newPassword, setNewPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [passwordSaving, setPasswordSaving] = React.useState(false)
  const [passwordSuccess, setPasswordSuccess] = React.useState(false)
  const [passwordError, setPasswordError] = React.useState<string | null>(null)

  const [confirmingDelete, setConfirmingDelete] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)
  const [deleteError, setDeleteError] = React.useState<string | null>(null)

  async function handleDeleteAccount() {
    if (deleting) return
    setDeleting(true)
    setDeleteError(null)
    try {
      const res = await authedFetch("/api/auth/account", { method: "DELETE" })
      if (!res.ok) throw new Error("delete failed")
      await signOut()
    } catch {
      setDeleteError("Deletion failed. Try again later.")
    } finally {
      setDeleting(false)
    }
  }

  React.useEffect(() => {
    if (!user) return
    async function loadProfile() {
      const res = await authedFetch("/api/profiles/me")
      if (!res.ok) return
      const data = await res.json()
      setDisplayName(data.display_name ?? "")
      setBio(data.bio ?? "")
      setAvatarUrl(data.avatar_url ?? undefined)
    }
    loadProfile()
  }, [user])

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return
    e.target.value = ""
    if (!file.type.startsWith("image/")) {
      setProfileError("Please select an image file")
      return
    }
    if (file.size > MAX_RAW_SIZE) {
      setProfileError("Image must be under 10 MB")
      return
    }
    setAvatarUploading(true)
    setProfileError(null)
    try {
      const compressed = await compressAvatar(file)
      const form = new FormData()
      form.append("file", compressed, "avatar.jpg")
      // authedFetch (not raw fetch): refreshes the 15-minute token when
      // needed, so uploads keep working on long-lived settings sessions.
      const uploadRes = await authedFetch("/api/files/avatars", {
        method: "POST",
        body: form,
      })
      if (!uploadRes.ok) {
        const err = await uploadRes.json().catch(() => ({}))
        throw new Error(typeof err.detail === "string" ? err.detail : "Upload failed")
      }
      const { avatar_url } = await uploadRes.json()
      const publicUrl = `${avatar_url}?v=${Date.now()}`
      setAvatarUrl(publicUrl)
      await authedFetch("/api/profiles/me", {
        method: "PATCH",
        body: JSON.stringify({ avatar_url }),
      })
      await refreshProfile()
    } catch (err: unknown) {
      setProfileError(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setAvatarUploading(false)
    }
  }

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault()
    setProfileSaving(true)
    setProfileError(null)
    setProfileSuccess(false)
    try {
      const res = await authedFetch("/api/profiles/me", {
        method: "PATCH",
        body: JSON.stringify({ display_name: displayName || undefined, bio: bio || undefined }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail ?? "Failed to save")
      }
      await refreshProfile()
      setProfileSuccess(true)
    } catch (err: unknown) {
      setProfileError(err instanceof Error ? err.message : "Failed to save")
    } finally {
      setProfileSaving(false)
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword !== confirmPassword) { setPasswordError(t("settings.passwords_do_not_match")); return }
    if (newPassword.length < 8) { setPasswordError(t("settings.password_min_length")); return }
    setPasswordSaving(true)
    setPasswordError(null)
    setPasswordSuccess(false)
    try {
      const res = await authedFetch("/api/auth/password", {
        method: "PATCH",
        body: JSON.stringify({ old_password: currentPassword, new_password: newPassword }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(typeof err.detail === "string" ? err.detail : "Failed to update password")
      }
      setPasswordSuccess(true)
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (err: unknown) {
      setPasswordError(err instanceof Error ? err.message : "Failed to update password")
    } finally {
      setPasswordSaving(false)
    }
  }

  const initial = (displayName || user?.email || "P").charAt(0).toUpperCase()
  const passwordsMatch = newPassword === confirmPassword
  const passwordValid = newPassword.length >= 8 && passwordsMatch && currentPassword.length > 0

  return (
    <div className="manifest">
      {/* ── Header ── */}
      <section className="manifest-field">
        <h2 className="field-caption">{t("settings.settings_title")}</h2>
        <h1 className="font-display" style={{ fontSize: "var(--t-h2)", margin: 0 }}>
          {t("settings.your_account")}
        </h1>
        <div className="seg" role="tablist" aria-label={t("settings.settings_title")} style={{ marginTop: 18 }}>
          {(
            [
              { id: "profile", label: t("settings.profile") },
              { id: "account", label: t("settings.account_section") },
              { id: "danger", label: t("settings.danger_zone") },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={section === item.id}
              aria-pressed={section === item.id}
              data-active={section === item.id || undefined}
              onClick={() => setSection(item.id)}
              className="seg-btn"
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      {/* ── Profile field ── */}
      {section === "profile" && (
      <section className="manifest-field">
        <h2 className="field-caption">{t("settings.profile")}</h2>
        <form onSubmit={handleProfileSave} style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              disabled={avatarUploading}
              aria-label={t("settings.profile_picture")}
              style={{
                width: 80,
                height: 80,
                padding: 0,
                cursor: "pointer",
                overflow: "hidden",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                background: "var(--face)",
                border: "var(--bw) solid var(--line)",
                borderRadius: "var(--radius-base)",
                boxShadow: "var(--shadow)",
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
                fontSize: 30,
                color: "var(--face-ink)",
                opacity: avatarUploading ? 0.5 : 1,
              }}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              ) : (
                initial
              )}
            </button>
            <p className="font-label field-dim" style={{ margin: 0, maxWidth: "30ch" }}>
              {avatarUploading ? t("verification.submitting") : t("settings.click_to_upload")}
              <br />
              JPG, PNG, WEBP
            </p>
            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" style={{ display: "none" }} onChange={handleAvatarUpload} />
          </div>

          <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
            <span className="font-label field-dim">{t("settings.display_name")}</span>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value.slice(0, MAX_DISPLAY_NAME))}
              maxLength={MAX_DISPLAY_NAME}
              className="route-input"
            />
          </label>
          <p className="font-label field-dim tabular" style={{ margin: "-8px 0 0", textAlign: "right" }}>
            {displayName.length}/{MAX_DISPLAY_NAME}
          </p>

          <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
            <span className="font-label field-dim">{t("settings.bio_label")}</span>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, MAX_BIO))}
              maxLength={MAX_BIO}
              rows={4}
              className="route-input"
              style={{ resize: "none", lineHeight: 1.6 }}
            />
          </label>
          <p className="font-label field-dim tabular" style={{ margin: "-8px 0 0", textAlign: "right" }}>
            {bio.length}/{MAX_BIO}
          </p>

          {profileSuccess && (
            <p role="status" className="copy" style={{ margin: 0, color: "var(--success)" }}>
              {t("settings.profile_saved")}
            </p>
          )}
          {profileError && (
            <p role="alert" className="copy" style={{ margin: 0, color: "var(--destructive)" }}>
              {profileError}
            </p>
          )}

          <div>
            <button type="submit" disabled={profileSaving} className="btn btn--primary press">
              {t("settings.save_profile")}
            </button>
          </div>
        </form>
      </section>
      )}

      {/* ── Account field ── */}
      {section === "account" && (
      <section className="manifest-field">
        <h2 className="field-caption">{t("settings.account_section")}</h2>
        <div style={{ display: "grid", gap: 16 }}>
          <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
            <span className="font-label field-dim">{t("profile.email")}</span>
            <input value={user?.email ?? ""} disabled className="route-input" style={{ opacity: 0.5 }} />
          </label>
          <p className="font-label field-dim" style={{ margin: "-8px 0 0" }}>
            {t("settings.email_cannot_be_changed")}
          </p>
          <div>
            <button type="button" onClick={() => void signOut()} className="btn btn--plain press">
              {t("settings.sign_out_btn")}
            </button>
          </div>
        </div>

        <div className="field-rule" aria-hidden="true" style={{ marginTop: 20, marginBottom: 20 }} />

        <h3 className="font-label" style={{ margin: "0 0 16px" }}>
          {t("settings.change_password")}
        </h3>
        <form onSubmit={handlePasswordChange} style={{ display: "grid", gap: 16 }}>
          <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
            <span className="font-label field-dim">{t("settings.current_password")}</span>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="········"
              autoComplete="current-password"
              className="route-input"
            />
          </label>
          <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
            <span className="font-label field-dim">{t("settings.new_password")}</span>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="········"
              autoComplete="new-password"
              className="route-input"
            />
          </label>
          <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
            <span className="font-label field-dim">{t("settings.confirm_new_password")}</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="········"
              autoComplete="new-password"
              className="route-input"
            />
          </label>
          {confirmPassword && !passwordsMatch && (
            <p role="alert" className="copy" style={{ margin: 0, color: "var(--destructive)" }}>
              {t("settings.passwords_do_not_match")}
            </p>
          )}
          {passwordSuccess && (
            <p role="status" className="copy" style={{ margin: 0, color: "var(--success)" }}>
              {t("settings.password_updated")}
            </p>
          )}
          {passwordError && (
            <p role="alert" className="copy" style={{ margin: 0, color: "var(--destructive)" }}>
              {passwordError}
            </p>
          )}
          <div>
            <button type="submit" disabled={passwordSaving || !passwordValid} className="btn btn--primary press">
              {t("settings.update_password")}
            </button>
          </div>
        </form>
      </section>
      )}

      {/* ── Danger field ── */}
      {section === "danger" && (
      <section className="manifest-field">
        <h2 className="field-caption" style={{ color: "var(--destructive)", opacity: 1 }}>
          {t("settings.danger_zone")}
        </h2>
        <p className="copy" style={{ margin: 0, maxWidth: "62ch" }}>
          {t("settings.delete_account_confirm")}
        </p>
        {!confirmingDelete ? (
          <div style={{ marginTop: 16 }}>
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="btn btn--plain press"
              style={{ borderColor: "var(--destructive)", color: "var(--destructive)" }}
            >
              {t("settings.delete_account_btn")}
            </button>
          </div>
        ) : (
          <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
            <p className="copy" style={{ margin: 0 }}>
              {t("settings.are_you_sure")} {t("settings.delete_cannot_undone")}
            </p>
            {deleteError && (
              <p role="alert" className="copy" style={{ margin: 0, color: "var(--destructive)" }}>
                {deleteError}
              </p>
            )}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => void handleDeleteAccount()}
                disabled={deleting}
                className="btn btn--plain press"
                style={{ borderColor: "var(--destructive)", color: "var(--destructive)", opacity: deleting ? 0.5 : 1 }}
              >
                {t("settings.delete_confirm")}
              </button>
              <button
                type="button"
                onClick={() => { setConfirmingDelete(false); setDeleteError(null) }}
                className="btn btn--plain press"
              >
                {t("settings.cancel")}
              </button>
            </div>
          </div>
        )}
      </section>
      )}
    </div>
  )
}
