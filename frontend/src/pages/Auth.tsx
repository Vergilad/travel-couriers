import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { supabase } from "@/lib/supabase"
import { router } from "@/router"

type Mode = "signin" | "signup"

interface AuthPageProps {
  mode?: Mode
  redirect?: string
}

// ── Spinner ──────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <svg
      className="animate-spin h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  )
}

// ── Styled input ─────────────────────────────────────────────────────────────
function TerminalInput({
  label,
  type,
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  label: string
  type: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  autoComplete?: string
}) {
  return (
    <div className="group">
      <label
        className="block text-[10px] tracking-[0.2em] text-[#8C7B68] mb-2 uppercase"
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        {label}
      </label>
      <div className="relative">
        <span
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[#C8956A]/60 select-none pointer-events-none"
          style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px" }}
        >
          ›
        </span>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="w-full bg-[#111008] border border-[#2E2418] focus:border-[#C8956A]/60 focus:outline-none text-[#F4EDE4] placeholder-[#3A2E20] rounded-sm py-3 pl-8 pr-4 text-sm transition-colors"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        />
      </div>
    </div>
  )
}

// ── Error block ───────────────────────────────────────────────────────────────
function ErrorBlock({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      className="flex items-start gap-2 rounded-sm border border-[#C47B6B]/40 bg-[#C47B6B]/10 px-4 py-3 text-sm text-[#E8A090]"
      style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "12px" }}
    >
      <span className="mt-0.5 shrink-0">!</span>
      <span>{message}</span>
    </motion.div>
  )
}

// ── Google button ─────────────────────────────────────────────────────────────
function GoogleButton({ loading, onClick }: { loading: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="w-full flex items-center justify-center gap-3 py-3 rounded-sm border border-[#2E2418] hover:border-[#C8956A]/40 bg-[#111008] hover:bg-[#1A1208] text-[#F4EDE4] text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "12px" }}
    >
      {loading ? (
        <Spinner />
      ) : (
        <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden>
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
      )}
      CONTINUE WITH GOOGLE
    </button>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export function AuthPage({ mode: initialMode = "signin", redirect }: AuthPageProps) {
  const [mode, setMode] = React.useState<Mode>(initialMode)
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [googleLoading, setGoogleLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState(false)

  function clearForm() {
    setError(null)
    setEmail("")
    setPassword("")
  }

  function switchMode(m: Mode) {
    setMode(m)
    setError(null)
    setSuccess(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        router.navigate({ to: redirect ?? "/browse" })
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setSuccess(true)
        clearForm()
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    setError(null)
    setGoogleLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin + "/browse" },
      })
      if (error) throw error
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Google sign-in failed")
      setGoogleLoading(false)
    }
  }

  async function handleResend() {
    if (!email) return
    setLoading(true)
    setError(null)
    try {
      const { error } = await supabase.auth.resend({ type: "signup", email })
      if (error) throw error
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Resend failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0E0B08] flex">
      {/* ── Left panel — decorative departure board ── */}
      <div className="hidden lg:flex lg:w-[52%] xl:w-[58%] relative flex-col justify-between overflow-hidden border-r border-[#1E1810]">
        {/* Background gradient */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 30% 40%, rgba(200,149,106,0.07) 0%, transparent 60%), #0A0806",
          }}
        />

        {/* Decorative grid lines */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(200,149,106,1) 1px, transparent 1px), linear-gradient(90deg, rgba(200,149,106,1) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        {/* Scanlines */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{
            backgroundImage: "linear-gradient(rgba(212,168,85,1) 1px, transparent 1px)",
            backgroundSize: "100% 2px",
          }}
        />

        {/* Content */}
        <div className="relative z-10 p-12 xl:p-16 flex flex-col h-full">
          {/* Logo / brand */}
          <div
            className="flex items-center gap-3 text-[#C8956A] text-sm tracking-widest"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            <div className="w-2 h-2 rounded-full bg-[#C8956A] animate-pulse" />
            TRAVEL COURIERS
          </div>

          {/* Big headline */}
          <div className="flex-1 flex flex-col justify-center">
            <p
              className="text-[10px] tracking-[0.25em] text-[#8C7B68] mb-6"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {mode === "signin" ? "GATE: RETURNING TRAVELER" : "GATE: NEW PASSENGER"}
            </p>
            <h1
              className="leading-[0.88] text-[#F4EDE4] mb-8"
              style={{
                fontFamily: "'DM Serif Display', serif",
                fontSize: "clamp(3.5rem, 5.5vw, 6.5rem)",
              }}
            >
              {mode === "signin" ? (
                <>
                  WELCOME
                  <br />
                  <span style={{ WebkitTextStroke: "1px #C8956A", color: "transparent" }}>
                    BACK.
                  </span>
                </>
              ) : (
                <>
                  BOARD
                  <br />
                  <span style={{ WebkitTextStroke: "1px #C8956A", color: "transparent" }}>
                    THE
                  </span>
                  <br />
                  NETWORK.
                </>
              )}
            </h1>

            <p className="text-[#8C7B68] text-sm leading-relaxed max-w-[36ch]">
              {mode === "signin"
                ? "Your routes, earnings and messages are waiting. Sign in to continue."
                : "Join thousands of travelers already turning their trips into deliveries."}
            </p>
          </div>

          {/* Bottom strip */}
          <div
            className="text-[10px] text-[#3A2E20] tracking-widest"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            SOLARI-TRX AUTHENTICATION TERMINAL · SECURE CONNECTION
          </div>
        </div>
      </div>

      {/* ── Right panel — form ── */}
      <div className="w-full lg:w-[48%] xl:w-[42%] flex flex-col justify-center px-8 py-16 md:px-12 xl:px-16 relative">
        {/* Subtle top accent line */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#C8956A]/30 to-transparent" />

        <div className="max-w-[400px] w-full mx-auto">
          {/* Mobile logo */}
          <div
            className="flex items-center gap-2 text-[#C8956A] text-xs tracking-widest mb-10 lg:hidden"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-[#C8956A] animate-pulse" />
            TRAVEL COURIERS
          </div>

          {/* Mode toggle tabs */}
          <div
            className="flex border border-[#2E2418] rounded-sm mb-8 overflow-hidden"
            role="tablist"
          >
            {(["signin", "signup"] as Mode[]).map((m) => (
              <button
                key={m}
                role="tab"
                aria-selected={mode === m}
                onClick={() => switchMode(m)}
                className={`flex-1 py-2.5 text-[11px] tracking-[0.15em] transition-all ${
                  mode === m
                    ? "bg-[#C8956A] text-[#0E0B08] font-bold"
                    : "text-[#8C7B68] hover:text-[#F4EDE4] hover:bg-[#1A1208]"
                }`}
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {m === "signin" ? "SIGN IN" : "SIGN UP"}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {success ? (
              /* ── Success state ── */
              <motion.div
                key="success"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="text-center py-8"
              >
                <div className="w-16 h-16 rounded-full border border-[#7EB89A]/40 bg-[#7EB89A]/10 flex items-center justify-center mx-auto mb-6">
                  <svg viewBox="0 0 24 24" className="w-7 h-7 text-[#7EB89A]" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
                <h2
                  className="text-[#F4EDE4] text-xl mb-3"
                  style={{ fontFamily: "'DM Serif Display', serif" }}
                >
                  Check your email
                </h2>
                <p className="text-[#8C7B68] text-sm leading-relaxed mb-8">
                  We sent a confirmation link to{" "}
                  <span className="text-[#C8956A]">{email || "your email"}</span>. Click it to
                  activate your account.
                </p>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleResend}
                    disabled={loading}
                    className="w-full py-3 border border-[#2E2418] hover:border-[#C8956A]/40 text-[#8C7B68] hover:text-[#F4EDE4] text-xs tracking-widest rounded-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {loading ? <Spinner /> : null}
                    RESEND EMAIL
                  </button>
                  <button
                    onClick={() => { setSuccess(false); switchMode("signin") }}
                    className="text-[#8C7B68] hover:text-[#C8956A] text-xs tracking-wider transition-colors"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    ← BACK TO SIGN IN
                  </button>
                </div>
                <AnimatePresence>
                  {error && (
                    <div className="mt-4">
                      <ErrorBlock message={error} />
                    </div>
                  )}
                </AnimatePresence>
              </motion.div>
            ) : (
              /* ── Form state ── */
              <motion.form
                key={mode}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.22 }}
                onSubmit={handleSubmit}
                className="flex flex-col gap-5"
              >
                <TerminalInput
                  label="Email address"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  placeholder="you@example.com"
                  autoComplete={mode === "signin" ? "email" : "email"}
                />
                <TerminalInput
                  label={mode === "signin" ? "Password" : "Create a password"}
                  type="password"
                  value={password}
                  onChange={setPassword}
                  placeholder="········"
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                />

                <AnimatePresence>
                  {error && <ErrorBlock message={error} />}
                </AnimatePresence>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading || !email || !password}
                  className="w-full py-3.5 bg-[#C8956A] hover:bg-[#D4A855] text-[#0E0B08] font-bold tracking-widest text-xs rounded-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {loading ? <Spinner /> : null}
                  {mode === "signin" ? "SIGN IN" : "CREATE ACCOUNT"}
                </button>

                {/* Divider */}
                <div className="relative flex items-center gap-3 my-1">
                  <div className="flex-1 h-px bg-[#2E2418]" />
                  <span
                    className="text-[10px] text-[#3A2E20] tracking-widest"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    OR
                  </span>
                  <div className="flex-1 h-px bg-[#2E2418]" />
                </div>

                {/* Google */}
                <GoogleButton loading={googleLoading} onClick={handleGoogle} />

                {/* Switch mode link */}
                <p
                  className="text-center text-[11px] text-[#8C7B68] tracking-wider mt-2"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {mode === "signin" ? (
                    <>
                      No account?{" "}
                      <button
                        type="button"
                        onClick={() => switchMode("signup")}
                        className="text-[#C8956A] hover:text-[#D4A855] transition-colors underline-offset-2 hover:underline"
                      >
                        SIGN UP FREE
                      </button>
                    </>
                  ) : (
                    <>
                      Have an account?{" "}
                      <button
                        type="button"
                        onClick={() => switchMode("signin")}
                        className="text-[#C8956A] hover:text-[#D4A855] transition-colors underline-offset-2 hover:underline"
                      >
                        SIGN IN
                      </button>
                    </>
                  )}
                </p>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
