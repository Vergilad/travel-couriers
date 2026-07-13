import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { supabase } from "@/lib/supabase"
import { authedFetch } from "@/lib/api"
import { useAuth } from "@/lib/auth"

const MAX_BIO = 300
const MAX_DISPLAY_NAME = 40
const MAX_RAW_SIZE = 10 * 1024 * 1024 // 10 MB raw limit before compression
const COMPRESS_MAX_PX = 800            // long-edge cap in pixels
const COMPRESS_QUALITY = 0.82          // JPEG quality

type Section = "profile" | "account" | "danger"

// ─── Canvas-based image compression ─────────────────────────────────────────
// Resizes to ≤800px on the long edge, exports as JPEG at 0.82 quality.
// Typical result: 60–150 KB regardless of source size.
// No external dependencies — uses browser Canvas API.
function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      const scale = Math.min(1, COMPRESS_MAX_PX / Math.max(img.width, img.height))
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement("canvas")
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext("2d")
      if (!ctx) { reject(new Error("Canvas unavailable")); return }
      ctx.drawImage(img, 0, 0, w, h)
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob)
          else reject(new Error("Compression failed"))
        },
        "image/jpeg",
        COMPRESS_QUALITY
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error("Failed to load image"))
    }

    img.src = objectUrl
  })
}

// ─── Shared primitives ───────────────────────────────────────────────────────
function Label({ children }: { children: React.ReactNode }) {
  return (
    <label
      className="block text-[10px] tracking-[0.2em] mb-2 uppercase"
      style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--text-muted)" }}
    >
      {children}
    </label>
  )
}

function TerminalInput({
  value,
  onChange,
  placeholder,
  disabled,
  type = "text",
  maxLength,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  disabled?: boolean
  type?: string
  maxLength?: number
}) {
  const [focused, setFocused] = React.useState(false)
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(maxLength ? e.target.value.slice(0, maxLength) : e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      maxLength={maxLength}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      className="w-full rounded-sm py-3 px-4 text-sm focus:outline-none transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        background: "var(--surface-raised)",
        border: `1px solid ${focused ? "var(--accent)" : "var(--border)"}`,
        color: "var(--text)",
        caretColor: "var(--accent)",
      }}
    />
  )
}

function TerminalTextarea({
  value,
  onChange,
  placeholder,
  maxLength,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  maxLength?: number
}) {
  const [focused, setFocused] = React.useState(false)
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      rows={4}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      className="w-full rounded-sm py-3 px-4 text-sm focus:outline-none transition-colors resize-none"
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        background: "var(--surface-raised)",
        border: `1px solid ${focused ? "var(--accent)" : "var(--border)"}`,
        color: "var(--text)",
        caretColor: "var(--accent)",
      }}
    />
  )
}

function Spinner() {
  return (
    <div
      className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
      style={{ borderColor: "currentColor", borderTopColor: "transparent" }}
    />
  )
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="w-1 h-4 rounded-sm" style={{ background: "rgba(37,99,235,0.4)" }} />
      <h2
        className="text-[10px] tracking-[0.22em]"
        style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--text-muted)" }}
      >
        {children}
      </h2>
    </div>
  )
}

function SuccessBanner({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="flex items-center gap-3 px-4 py-3 rounded-sm text-xs tracking-wider"
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        border: "1px solid rgba(34,197,94,0.25)",
        background: "rgba(34,197,94,0.07)",
        color: "var(--success)",
      }}
    >
      <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
      </svg>
      {message}
    </motion.div>
  )
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="px-4 py-3 rounded-sm text-xs tracking-wider"
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        border: "1px solid rgba(239,68,68,0.25)",
        background: "rgba(239,68,68,0.07)",
        color: "var(--destructive)",
      }}
    >
      {message}
    </motion.div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────
export function SettingsPage() {
  const { user, signOut, refreshProfile } = useAuth()
  const [activeSection, setActiveSection] = React.useState<Section>("profile")

  // Profile fields
  const [displayName, setDisplayName] = React.useState("")
  const [bio, setBio] = React.useState("")
  const [avatarUrl, setAvatarUrl] = React.useState<string | undefined>()
  const [avatarUploading, setAvatarUploading] = React.useState(false)
  const [profileSaving, setProfileSaving] = React.useState(false)
  const [profileSuccess, setProfileSuccess] = React.useState(false)
  const [profileError, setProfileError] = React.useState<string | null>(null)
  const avatarInputRef = React.useRef<HTMLInputElement>(null)

  // Account fields
  const [newPassword, setNewPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [passwordSaving, setPasswordSaving] = React.useState(false)
  const [passwordSuccess, setPasswordSuccess] = React.useState(false)
  const [passwordError, setPasswordError] = React.useState<string | null>(null)

  // Danger zone
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false)
  const [deleteError, setDeleteError] = React.useState<string | null>(null)

  // Load existing profile data
  React.useEffect(() => {
    if (!user) return
    async function loadProfile() {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, bio, avatar_url")
        .eq("id", user!.id)
        .single()
      if (data) {
        setDisplayName(data.display_name ?? "")
        setBio(data.bio ?? "")
        setAvatarUrl(data.avatar_url ?? undefined)
      }
    }
    loadProfile()
  }, [user])

  // ─── Avatar upload with compression ───────────────────────────────────────
  // 1. Validate raw file (type + max 10 MB)
  // 2. Compress to ≤800px JPEG via canvas (typically 60–150 KB)
  // 3. Upload to fixed path avatars/{uid}/avatar.jpg — upsert overwrites the
  //    old file so the bucket never accumulates stale copies per user.
  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return
    e.target.value = "" // allow re-selecting the same file

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
      const compressed = await compressImage(file)

      // Fixed path → upsert overwrites instead of appending timestamped files
      const path = `avatars/${user.id}/avatar.jpg`

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, compressed, {
          contentType: "image/jpeg",
          upsert: true,
        })
      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path)
      // Bust CDN cache by appending a timestamp query param
      const publicUrl = `${urlData.publicUrl}?v=${Date.now()}`
      setAvatarUrl(publicUrl)

      await authedFetch("/api/profiles/me", {
        method: "PATCH",
        body: JSON.stringify({ avatar_url: urlData.publicUrl }),
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
        body: JSON.stringify({
          display_name: displayName || undefined,
          bio: bio || undefined,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail ?? "Failed to save")
      }
      await refreshProfile()
      setProfileSuccess(true)
      setTimeout(() => setProfileSuccess(false), 4000)
    } catch (err: unknown) {
      setProfileError(err instanceof Error ? err.message : "Failed to save")
    } finally {
      setProfileSaving(false)
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword !== confirmPassword) { setPasswordError("Passwords do not match"); return }
    if (newPassword.length < 8) { setPasswordError("Password must be at least 8 characters"); return }
    setPasswordSaving(true)
    setPasswordError(null)
    setPasswordSuccess(false)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      setPasswordSuccess(true)
      setNewPassword("")
      setConfirmPassword("")
      setTimeout(() => setPasswordSuccess(false), 4000)
    } catch (err: unknown) {
      setPasswordError(err instanceof Error ? err.message : "Failed to update password")
    } finally {
      setPasswordSaving(false)
    }
  }

  const initial = (user?.email ?? "P").charAt(0).toUpperCase()
  const passwordsMatch = newPassword === confirmPassword
  const passwordValid = newPassword.length >= 8 && passwordsMatch

  const navItems: { id: Section; label: string }[] = [
    { id: "profile", label: "PROFILE" },
    { id: "account", label: "ACCOUNT" },
    { id: "danger", label: "DANGER ZONE" },
  ]

  return (
    <div
      className="min-h-screen pt-20 pb-24 px-6 md:px-12 xl:px-20 max-w-[1000px] mx-auto"
      style={{ background: "var(--bg)" }}
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="mb-10"
      >
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-1.5 h-1.5 rounded-sm animate-pulse"
            style={{ background: "var(--accent)" }}
          />
          <span
            className="text-[10px] tracking-[0.2em]"
            style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--text-muted)" }}
          >
            SETTINGS
          </span>
        </div>
        <h1
          className="text-4xl font-bold"
          style={{ color: "var(--text)", fontFamily: "'DM Sans', sans-serif" }}
        >
          Your Account
        </h1>
      </motion.div>

      <div className="flex flex-col md:flex-row gap-10">
        {/* Sidebar nav */}
        <motion.nav
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
          className="md:w-44 shrink-0 flex md:flex-col gap-1"
        >
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className="text-left px-3 py-2.5 rounded-sm text-[10px] tracking-[0.15em] transition-all"
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                ...(activeSection === item.id
                  ? {
                      background: "rgba(37,99,235,0.08)",
                      color: "var(--accent)",
                      borderLeft: "2px solid var(--accent)",
                      paddingLeft: "10px",
                    }
                  : {
                      color: "var(--text-muted)",
                    }),
              }}
              onMouseEnter={e => {
                if (activeSection !== item.id) {
                  e.currentTarget.style.color = "var(--text)"
                  e.currentTarget.style.background = "var(--surface-raised)"
                }
              }}
              onMouseLeave={e => {
                if (activeSection !== item.id) {
                  e.currentTarget.style.color = "var(--text-muted)"
                  e.currentTarget.style.background = "transparent"
                }
              }}
            >
              {item.label}
            </button>
          ))}
        </motion.nav>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15, ease: "easeOut" }}
          className="flex-1 min-w-0"
        >
          <AnimatePresence mode="wait">
            {/* ── PROFILE ── */}
            {activeSection === "profile" && (
              <motion.div
                key="profile"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
              >
                <SectionHeading>PROFILE</SectionHeading>
                <form onSubmit={handleProfileSave} className="space-y-6">
                  {/* Avatar upload */}
                  <div>
                    <Label>Profile picture</Label>
                    <div className="flex items-center gap-5">
                      <button
                        type="button"
                        onClick={() => avatarInputRef.current?.click()}
                        disabled={avatarUploading}
                        className="relative w-20 h-20 rounded-sm overflow-hidden group transition-all focus:outline-none disabled:opacity-50"
                        style={{ border: "1px solid var(--border)" }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--accent)")}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}
                      >
                        {avatarUploading ? (
                          <div
                            className="w-full h-full flex items-center justify-center"
                            style={{ background: "var(--surface-raised)", color: "var(--accent)" }}
                          >
                            <Spinner />
                          </div>
                        ) : avatarUrl ? (
                          <>
                            <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center" style={{ background: "rgba(0,0,0,0.55)" }}>
                              <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                              </svg>
                            </div>
                          </>
                        ) : (
                          <div
                            className="w-full h-full flex items-center justify-center group-hover:opacity-80 transition-opacity"
                            style={{ background: "var(--surface-raised)" }}
                          >
                            <span
                              className="text-3xl font-bold"
                              style={{ color: "var(--accent)", fontFamily: "'DM Sans', sans-serif" }}
                            >
                              {initial}
                            </span>
                          </div>
                        )}
                      </button>

                      <div className="space-y-1.5">
                        <p
                          className="text-[10px] tracking-wider leading-relaxed"
                          style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--text-faint)" }}
                        >
                          CLICK TO UPLOAD<br />
                          JPG · PNG · WEBP
                        </p>
                        <p
                          className="text-[9px] tracking-wider"
                          style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--text-faint)" }}
                        >
                          AUTO-COMPRESSED TO ~100 KB
                        </p>
                      </div>

                      <input
                        ref={avatarInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarUpload}
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Display name</Label>
                    <TerminalInput
                      value={displayName}
                      onChange={setDisplayName}
                      placeholder="Your name"
                      maxLength={MAX_DISPLAY_NAME}
                    />
                    <p
                      className="mt-1.5 text-right text-[9px] tracking-wider tabular-nums"
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        color: displayName.length >= MAX_DISPLAY_NAME - 5
                          ? "var(--destructive)"
                          : "var(--text-faint)",
                      }}
                    >
                      {displayName.length}/{MAX_DISPLAY_NAME}
                    </p>
                  </div>

                  <div>
                    <Label>Bio</Label>
                    <TerminalTextarea
                      value={bio}
                      onChange={setBio}
                      placeholder="A few words about you…"
                      maxLength={MAX_BIO}
                    />
                    <p
                      className="mt-1.5 text-right text-[9px] tracking-wider"
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        color: bio.length >= MAX_BIO - 20
                          ? "var(--destructive)"
                          : "var(--text-faint)",
                      }}
                    >
                      {bio.length}/{MAX_BIO}
                    </p>
                  </div>

                  <AnimatePresence>
                    {profileSuccess && <SuccessBanner message="PROFILE SAVED" />}
                    {profileError && <ErrorBanner message={profileError} />}
                  </AnimatePresence>

                  <button
                    type="submit"
                    disabled={profileSaving}
                    className="flex items-center gap-2 px-6 py-3 font-bold text-[11px] tracking-[0.15em] rounded-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      background: "var(--accent)",
                      color: "#ffffff",
                    }}
                    onMouseEnter={e => { if (!profileSaving) e.currentTarget.style.background = "var(--accent-dim)" }}
                    onMouseLeave={e => { e.currentTarget.style.background = "var(--accent)" }}
                  >
                    {profileSaving && <Spinner />}
                    SAVE PROFILE
                  </button>
                </form>
              </motion.div>
            )}

            {/* ── ACCOUNT ── */}
            {activeSection === "account" && (
              <motion.div
                key="account"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className="space-y-10"
              >
                <div>
                  <SectionHeading>ACCOUNT</SectionHeading>
                  <div className="space-y-4">
                    <div>
                      <Label>Email address</Label>
                      <TerminalInput
                        value={user?.email ?? ""}
                        onChange={() => {}}
                        disabled
                        placeholder=""
                      />
                      <p
                        className="mt-1.5 text-[9px] tracking-wider"
                        style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--text-faint)" }}
                      >
                        EMAIL CANNOT BE CHANGED HERE
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={signOut}
                      className="flex items-center gap-2 px-5 py-2.5 text-[10px] tracking-[0.15em] rounded-sm transition-colors"
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        border: "1px solid var(--border)",
                        color: "var(--text-muted)",
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.color = "var(--text)"
                        e.currentTarget.style.borderColor = "var(--text-faint)"
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.color = "var(--text-muted)"
                        e.currentTarget.style.borderColor = "var(--border)"
                      }}
                    >
                      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                      </svg>
                      SIGN OUT
                    </button>
                  </div>
                </div>

                <div className="h-px" style={{ background: "var(--border)" }} />

                <div>
                  <SectionHeading>CHANGE PASSWORD</SectionHeading>
                  <form onSubmit={handlePasswordChange} className="space-y-4">
                    <div>
                      <Label>New password</Label>
                      <TerminalInput
                        type="password"
                        value={newPassword}
                        onChange={setNewPassword}
                        placeholder="········"
                      />
                    </div>
                    <div>
                      <Label>Confirm new password</Label>
                      <TerminalInput
                        type="password"
                        value={confirmPassword}
                        onChange={setConfirmPassword}
                        placeholder="········"
                      />
                      {confirmPassword && !passwordsMatch && (
                        <p
                          className="mt-1.5 text-[9px] tracking-wider"
                          style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--destructive)" }}
                        >
                          PASSWORDS DO NOT MATCH
                        </p>
                      )}
                    </div>

                    <AnimatePresence>
                      {passwordSuccess && <SuccessBanner message="PASSWORD UPDATED" />}
                      {passwordError && <ErrorBanner message={passwordError} />}
                    </AnimatePresence>

                    <button
                      type="submit"
                      disabled={passwordSaving || !passwordValid}
                      className="flex items-center gap-2 px-6 py-3 font-bold text-[11px] tracking-[0.15em] rounded-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        background: "var(--accent)",
                        color: "#ffffff",
                      }}
                      onMouseEnter={e => { if (!passwordSaving && passwordValid) e.currentTarget.style.background = "var(--accent-dim)" }}
                      onMouseLeave={e => { e.currentTarget.style.background = "var(--accent)" }}
                    >
                      {passwordSaving && <Spinner />}
                      UPDATE PASSWORD
                    </button>
                  </form>
                </div>
              </motion.div>
            )}

            {/* ── DANGER ── */}
            {activeSection === "danger" && (
              <motion.div
                key="danger"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
              >
                <SectionHeading>DANGER ZONE</SectionHeading>

                <div
                  className="p-6 rounded-sm"
                  style={{
                    border: "1px solid rgba(239,68,68,0.2)",
                    background: "rgba(239,68,68,0.03)",
                  }}
                >
                  <h3
                    className="text-sm mb-2 tracking-wider"
                    style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--destructive)" }}
                  >
                    DELETE ACCOUNT
                  </h3>
                  <p className="text-sm mb-5 leading-relaxed" style={{ color: "var(--text-muted)" }}>
                    Permanently delete your account and all associated data. This action cannot be undone.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-5 py-2.5 text-[10px] tracking-[0.15em] rounded-sm transition-colors"
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      border: "1px solid rgba(239,68,68,0.3)",
                      color: "var(--destructive)",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(239,68,68,0.08)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    DELETE ACCOUNT
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Delete confirm modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
            style={{ background: "rgba(9,9,11,0.88)", backdropFilter: "blur(4px)" }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="rounded-sm p-8 max-w-sm w-full"
              style={{
                background: "var(--surface-raised)",
                border: "1px solid var(--border)",
              }}
            >
              <h3
                className="text-lg font-bold mb-3"
                style={{ color: "var(--text)", fontFamily: "'DM Sans', sans-serif" }}
              >
                Are you sure?
              </h3>
              <p className="text-sm mb-6 leading-relaxed" style={{ color: "var(--text-muted)" }}>
                This will permanently delete your account. All your listings, messages and reviews will be lost.
              </p>
              {deleteError && (
                <p className="text-sm mb-4" style={{ color: "var(--destructive)" }}>{deleteError}</p>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setDeleteError("Account deletion isn't available yet — contact support to close your account.")
                  }}
                  className="flex-1 py-2.5 text-white text-[10px] tracking-[0.15em] rounded-sm transition-colors"
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    background: "rgba(239,68,68,0.75)",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(239,68,68,1)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "rgba(239,68,68,0.75)")}
                >
                  DELETE
                </button>
                <button
                  type="button"
                  onClick={() => { setShowDeleteConfirm(false); setDeleteError(null) }}
                  className="flex-1 py-2.5 text-[10px] tracking-[0.15em] rounded-sm transition-colors"
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    border: "1px solid var(--border)",
                    color: "var(--text-muted)",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.color = "var(--text)"
                    e.currentTarget.style.borderColor = "var(--text-faint)"
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.color = "var(--text-muted)"
                    e.currentTarget.style.borderColor = "var(--border)"
                  }}
                >
                  CANCEL
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
