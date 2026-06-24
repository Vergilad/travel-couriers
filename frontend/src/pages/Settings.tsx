import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { supabase } from "@/lib/supabase"
import { authedFetch } from "@/lib/api"
import { useAuth } from "@/lib/auth"

const MAX_BIO = 300

type Section = "profile" | "account" | "danger"

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label
      className="block text-[10px] tracking-[0.2em] text-[#8C7B68] mb-2 uppercase"
      style={{ fontFamily: "'JetBrains Mono', monospace" }}
    >
      {children}
    </label>
  )
}

function Input({
  value,
  onChange,
  placeholder,
  disabled,
  type = "text",
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  disabled?: boolean
  type?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full bg-[#0E0B08] border border-[#2E2418] focus:border-[#C8956A]/50 focus:outline-none text-[#F4EDE4] placeholder-[#3A2E20] rounded-sm py-3 px-4 text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      style={{ fontFamily: "'JetBrains Mono', monospace" }}
    />
  )
}

function Textarea({
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
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      rows={4}
      className="w-full bg-[#0E0B08] border border-[#2E2418] focus:border-[#C8956A]/50 focus:outline-none text-[#F4EDE4] placeholder-[#3A2E20] rounded-sm py-3 px-4 text-sm transition-colors resize-none"
      style={{ fontFamily: "'JetBrains Mono', monospace" }}
    />
  )
}

function Spinner() {
  return (
    <div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
  )
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="w-1 h-4 bg-[#C8956A]/40 rounded-full" />
      <h2
        className="text-[10px] tracking-[0.22em] text-[#8C7B68]"
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
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
      className="flex items-center gap-3 px-4 py-3 rounded-sm border border-[#7EB89A]/30 bg-[#7EB89A]/08 text-[#7EB89A] text-xs tracking-wider"
      style={{ fontFamily: "'JetBrains Mono', monospace" }}
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
      className="px-4 py-3 rounded-sm border border-[#C47B6B]/30 bg-[#C47B6B]/08 text-[#E8A090] text-xs tracking-wider"
      style={{ fontFamily: "'JetBrains Mono', monospace" }}
    >
      {message}
    </motion.div>
  )
}

export function SettingsPage() {
  const { user, session, signOut, refreshProfile } = useAuth()
  const [activeSection, setActiveSection] = React.useState<Section>("profile")

  // Profile fields
  const [displayName, setDisplayName] = React.useState("")
  const [bio, setBio] = React.useState("")
  const [city, setCity] = React.useState("")
  const [country, setCountry] = React.useState("")
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

  // Load existing profile data
  React.useEffect(() => {
    if (!user) return
    async function loadProfile() {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, bio, city, country, avatar_url")
        .eq("id", user!.id)
        .single()
      if (data) {
        setDisplayName(data.display_name ?? "")
        setBio(data.bio ?? "")
        setCity(data.city ?? "")
        setCountry(data.country ?? "")
        setAvatarUrl(data.avatar_url ?? undefined)
      }
    }
    loadProfile()
  }, [user])

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return
    if (!file.type.startsWith("image/")) {
      setProfileError("Please select an image file")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setProfileError("Image must be under 5MB")
      return
    }
    setAvatarUploading(true)
    setProfileError(null)
    try {
      const ext = file.name.split(".").pop()
      const path = `avatars/${user.id}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true })
      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path)
      const publicUrl = urlData.publicUrl
      setAvatarUrl(publicUrl)

      // Save immediately
      await authedFetch("/api/profiles/me", {
        method: "PATCH",
        body: JSON.stringify({ avatar_url: publicUrl }),
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
          city: city || undefined,
          country: country || undefined,
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
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match")
      return
    }
    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters")
      return
    }
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

  const initial = (user?.displayName ?? "T").charAt(0).toUpperCase()
  const passwordsMatch = newPassword === confirmPassword
  const passwordValid = newPassword.length >= 8 && passwordsMatch

  const navItems: { id: Section; label: string }[] = [
    { id: "profile", label: "PROFILE" },
    { id: "account", label: "ACCOUNT" },
    { id: "danger", label: "DANGER ZONE" },
  ]

  return (
    <div className="min-h-screen pt-20 pb-24 px-6 md:px-12 xl:px-20 max-w-[1000px] mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="mb-10"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="w-1 h-1 rounded-full bg-[#C8956A] animate-pulse" />
          <span
            className="text-[10px] tracking-[0.2em] text-[#8C7B68]"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            SETTINGS
          </span>
        </div>
        <h1
          className="text-4xl text-[#F4EDE4]"
          style={{ fontFamily: "'DM Serif Display', serif" }}
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
              className={`text-left px-3 py-2.5 rounded-sm text-[10px] tracking-[0.15em] transition-all ${
                activeSection === item.id
                  ? "bg-[#C8956A]/10 text-[#C8956A] border-l-2 border-[#C8956A] pl-[10px]"
                  : "text-[#8C7B68] hover:text-[#F4EDE4] hover:bg-[#111008]"
              }`}
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
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
                    <Label>Avatar</Label>
                    <div className="flex items-center gap-5">
                      <button
                        type="button"
                        onClick={() => avatarInputRef.current?.click()}
                        disabled={avatarUploading}
                        className="relative w-20 h-20 rounded-full border border-[#2E2418] overflow-hidden group transition-all hover:border-[#C8956A]/40 focus:outline-none disabled:opacity-50"
                      >
                        {avatarUploading ? (
                          <div className="w-full h-full flex items-center justify-center bg-[#111008]">
                            <Spinner />
                          </div>
                        ) : avatarUrl ? (
                          <>
                            <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                              </svg>
                            </div>
                          </>
                        ) : (
                          <div className="w-full h-full bg-[#111008] flex items-center justify-center group-hover:bg-[#1A1208] transition-colors">
                            <span
                              className="text-3xl text-[#C8956A]"
                              style={{ fontFamily: "'DM Serif Display', serif" }}
                            >
                              {initial}
                            </span>
                          </div>
                        )}
                      </button>
                      <p
                        className="text-[10px] text-[#3A2E20] tracking-wider leading-relaxed"
                        style={{ fontFamily: "'JetBrains Mono', monospace" }}
                      >
                        CLICK TO UPLOAD<br />
                        JPG, PNG, WEBP · MAX 5MB
                      </p>
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
                    <Input
                      value={displayName}
                      onChange={setDisplayName}
                      placeholder="Your name"
                    />
                  </div>

                  <div>
                    <Label>Bio</Label>
                    <Textarea
                      value={bio}
                      onChange={setBio}
                      placeholder="A few words about you…"
                      maxLength={MAX_BIO}
                    />
                    <p
                      className="mt-1.5 text-right text-[9px] tracking-wider"
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        color: bio.length >= MAX_BIO - 20 ? "#C47B6B" : "#3A2E20",
                      }}
                    >
                      {bio.length}/{MAX_BIO}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>City</Label>
                      <Input value={city} onChange={setCity} placeholder="Istanbul" />
                    </div>
                    <div>
                      <Label>Country</Label>
                      <Input value={country} onChange={setCountry} placeholder="Turkey" />
                    </div>
                  </div>

                  <AnimatePresence>
                    {profileSuccess && <SuccessBanner message="PROFILE SAVED" />}
                    {profileError && <ErrorBanner message={profileError} />}
                  </AnimatePresence>

                  <button
                    type="submit"
                    disabled={profileSaving}
                    className="flex items-center gap-2 px-6 py-3 bg-[#C8956A] hover:bg-[#D4A855] text-[#0E0B08] font-bold text-[11px] tracking-[0.15em] rounded-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
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
                      <Input
                        value={user?.email ?? ""}
                        onChange={() => {}}
                        disabled
                        placeholder=""
                      />
                      <p
                        className="mt-1.5 text-[9px] text-[#3A2E20] tracking-wider"
                        style={{ fontFamily: "'JetBrains Mono', monospace" }}
                      >
                        EMAIL CANNOT BE CHANGED HERE
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={signOut}
                      className="flex items-center gap-2 px-5 py-2.5 border border-[#2E2418] text-[#8C7B68] hover:text-[#F4EDE4] hover:border-[#3A2E20] text-[10px] tracking-[0.15em] rounded-sm transition-colors"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                      </svg>
                      SIGN OUT
                    </button>
                  </div>
                </div>

                <div className="h-px bg-[#1A1208]" />

                <div>
                  <SectionHeading>CHANGE PASSWORD</SectionHeading>
                  <form onSubmit={handlePasswordChange} className="space-y-4">
                    <div>
                      <Label>New password</Label>
                      <Input
                        type="password"
                        value={newPassword}
                        onChange={setNewPassword}
                        placeholder="········"
                      />
                    </div>
                    <div>
                      <Label>Confirm new password</Label>
                      <Input
                        type="password"
                        value={confirmPassword}
                        onChange={setConfirmPassword}
                        placeholder="········"
                      />
                      {confirmPassword && !passwordsMatch && (
                        <p
                          className="mt-1.5 text-[9px] text-[#C47B6B] tracking-wider"
                          style={{ fontFamily: "'JetBrains Mono', monospace" }}
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
                      className="flex items-center gap-2 px-6 py-3 bg-[#C8956A] hover:bg-[#D4A855] text-[#0E0B08] font-bold text-[11px] tracking-[0.15em] rounded-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
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

                <div className="p-6 border border-[#C47B6B]/20 rounded-sm bg-[#C47B6B]/03">
                  <h3
                    className="text-sm text-[#E8A090] mb-2 tracking-wider"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    DELETE ACCOUNT
                  </h3>
                  <p className="text-[#8C7B68] text-sm mb-5 leading-relaxed">
                    Permanently delete your account and all associated data. This action cannot be undone.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-5 py-2.5 border border-[#C47B6B]/30 text-[#E8A090] hover:bg-[#C47B6B]/10 text-[10px] tracking-[0.15em] rounded-sm transition-colors"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
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
            style={{ background: "rgba(14,11,8,0.85)", backdropFilter: "blur(4px)" }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-[#111008] border border-[#2E2418] rounded-sm p-8 max-w-sm w-full"
            >
              <h3
                className="text-lg text-[#F4EDE4] mb-3"
                style={{ fontFamily: "'DM Serif Display', serif" }}
              >
                Are you sure?
              </h3>
              <p className="text-[#8C7B68] text-sm mb-6 leading-relaxed">
                This will permanently delete your account. All your listings, messages and reviews will be lost.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    // TODO: implement account deletion via Supabase admin API
                    console.log("TODO: delete account for user", user?.id)
                    setShowDeleteConfirm(false)
                  }}
                  className="flex-1 py-2.5 bg-[#C47B6B]/80 hover:bg-[#C47B6B] text-white text-[10px] tracking-[0.15em] rounded-sm transition-colors"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  DELETE
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2.5 border border-[#2E2418] text-[#8C7B68] hover:text-[#F4EDE4] text-[10px] tracking-[0.15em] rounded-sm transition-colors"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
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
