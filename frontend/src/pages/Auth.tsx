import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Waypoints } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { router } from "@/router"
import { useTranslation } from "@/i18n/I18nContext"

type Mode = "signin" | "signup"

interface AuthPageProps {
  mode?: Mode
  redirect?: string
}

const springConfig = { type: "spring" as const, stiffness: 380, damping: 28 }

// ── Network graph data ────────────────────────────────────────────────────────
// Fixed node positions (% of SVG viewport). Entry node is the user — center.
const NODES = [
  { id: "a", cx: 16,  cy: 20,  label: "LONDON"       },
  { id: "b", cx: 84,  cy: 16,  label: "MOSCOW"       },
  { id: "c", cx: 10,  cy: 70,  label: "ISTANBUL"     },
  { id: "d", cx: 86,  cy: 74,  label: "BEIJING"      },
  { id: "e", cx: 52,  cy: 88,  label: "DUBAI"        },
  { id: "entry", cx: 50, cy: 44, label: null         }, // the user
]

const EDGES = [
  { from: "a", to: "entry", delay: 0,    dur: 2.8 },
  { from: "b", to: "entry", delay: 0.9,  dur: 3.2 },
  { from: "c", to: "entry", delay: 1.6,  dur: 2.5 },
  { from: "d", to: "entry", delay: 0.4,  dur: 3.6 },
  { from: "e", to: "entry", delay: 1.2,  dur: 2.9 },
  { from: "a", to: "b",     delay: 2.1,  dur: 4.0 },
  { from: "c", to: "e",     delay: 0.7,  dur: 3.4 },
]

function getNode(id: string) {
  return NODES.find((n) => n.id === id)!
}

// ── Animated route network ────────────────────────────────────────────────────
function RouteNetwork({ mode }: { mode: Mode }) {
  return (
    <div className="absolute inset-0 w-full h-full">
      {/* Dot grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.06) 1px, transparent 0)",
          backgroundSize: "28px 28px",
        }}
      />

      {/* Ambient glow — shifts between modes */}
      <motion.div
        key={mode}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="absolute pointer-events-none"
        style={{
          inset: 0,
          background:
            mode === "signup"
              ? "radial-gradient(ellipse at 50% 44%, rgba(59,130,246,0.12) 0%, transparent 65%)"
              : "radial-gradient(ellipse at 50% 44%, rgba(59,130,246,0.07) 0%, transparent 60%)",
        }}
      />

      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid meet"
        className="absolute inset-0 w-full h-full"
        style={{ overflow: "visible" }}
      >
        {/* Edges */}
        {EDGES.map((edge) => {
          const from = getNode(edge.from)
          const to   = getNode(edge.to)
          const isSpoke = edge.to === "entry" || edge.from === "entry"
          return (
            <g key={`${edge.from}-${edge.to}`}>
              {/* Static dashed line */}
              <line
                x1={`${from.cx}%`} y1={`${from.cy}%`}
                x2={`${to.cx}%`}   y2={`${to.cy}%`}
                stroke={isSpoke ? "#27272a" : "#1c1c1e"}
                strokeWidth={isSpoke ? "0.4" : "0.25"}
                strokeDasharray="1.2 1.8"
              />

              {/* Traveling dot */}
              <motion.circle
                r="0.9"
                fill="#3b82f6"
                style={{ filter: "drop-shadow(0 0 2px #3b82f6)" }}
                initial={{
                  cx: `${from.cx}%`,
                  cy: `${from.cy}%`,
                  opacity: 0,
                }}
                animate={{
                  cx: [`${from.cx}%`, `${to.cx}%`],
                  cy: [`${from.cy}%`, `${to.cy}%`],
                  opacity: [0, 1, 1, 0],
                }}
                transition={{
                  duration: edge.dur,
                  delay: edge.delay,
                  repeat: Infinity,
                  ease: "easeInOut",
                  times: [0, 0.08, 0.92, 1],
                }}
              />
            </g>
          )
        })}

        {/* Peripheral nodes */}
        {NODES.filter((n) => n.id !== "entry").map((node) => (
          <g key={node.id}>
            <circle
              cx={`${node.cx}%`}
              cy={`${node.cy}%`}
              r="1.4"
              fill="#111113"
              stroke="#3f3f46"
              strokeWidth="0.35"
            />
            <circle
              cx={`${node.cx}%`}
              cy={`${node.cy}%`}
              r="0.6"
              fill="#52525b"
            />
            {node.label && (
              <text
                x={`${node.cx}%`}
                y={`${node.cy + 3.5}%`}
                textAnchor="middle"
                fontSize="2.2"
                fill="#3f3f46"
                fontFamily="'JetBrains Mono', monospace"
                letterSpacing="0.08em"
              >
                {node.label}
              </text>
            )}
          </g>
        ))}

        {/* Entry node — the user */}
        {(() => {
          const n = getNode("entry")
          return (
            <g>
              {/* Outer pulse ring */}
              <motion.circle
                cx={`${n.cx}%`}
                cy={`${n.cy}%`}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="0.3"
                initial={{ r: 4, opacity: 0.6 }}
                animate={{ r: [4, 7], opacity: [0.6, 0] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut" }}
              />
              {/* Mid ring */}
              <motion.circle
                cx={`${n.cx}%`}
                cy={`${n.cy}%`}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="0.4"
                initial={{ r: 3, opacity: 0.5 }}
                animate={{ r: [3, 5.5], opacity: [0.5, 0] }}
                transition={{ duration: 2.4, delay: 0.5, repeat: Infinity, ease: "easeOut" }}
              />
              {/* Solid filled circle */}
              <circle
                cx={`${n.cx}%`}
                cy={`${n.cy}%`}
                r="2.4"
                fill="#1d4ed8"
                stroke="#3b82f6"
                strokeWidth="0.4"
              />
              {/* Inner bright dot */}
              <motion.circle
                cx={`${n.cx}%`}
                cy={`${n.cy}%`}
                r="0.9"
                fill="#93c5fd"
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
            </g>
          )
        })()}
      </svg>
    </div>
  )
}

// ── Input field ───────────────────────────────────────────────────────────────
function Field({
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
  const [focused, setFocused] = React.useState(false)
  return (
    <div>
      <label
        className="block mb-2 text-[10px] tracking-[0.18em] uppercase"
        style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}
      >
        {label}
      </label>
      <div
        className="relative flex items-center rounded-sm transition-all duration-150"
        style={{
          background: "var(--surface-raised)",
          border: `1px solid ${focused ? "var(--accent)" : "var(--border)"}`,
          boxShadow: focused ? "0 0 0 3px rgba(59,130,246,0.1)" : "none",
        }}
      >
        <span
          className="absolute left-3.5 select-none pointer-events-none text-[11px]"
          style={{
            fontFamily: "var(--font-mono)",
            color: focused ? "var(--accent)" : "var(--text-faint)",
            transition: "color 0.15s",
          }}
        >
          ›
        </span>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="w-full bg-transparent py-3 pl-8 pr-4 text-sm outline-none"
          style={{
            fontFamily: "var(--font-mono)",
            color: "var(--text)",
          }}
        />
      </div>
    </div>
  )
}

// ── Error block ───────────────────────────────────────────────────────────────
function ErrorBlock({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex items-start gap-2.5 rounded-sm px-4 py-3 text-[12px]"
      style={{
        fontFamily: "var(--font-mono)",
        border: "1px solid rgba(239,68,68,0.3)",
        background: "rgba(239,68,68,0.07)",
        color: "#fca5a5",
      }}
    >
      <span className="shrink-0 mt-px">!</span>
      <span>{message}</span>
    </motion.div>
  )
}

// ── Spinner ───────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  )
}

// ── Google button ─────────────────────────────────────────────────────────────
function GoogleButton({ loading, onClick }: { loading: boolean; onClick: () => void }) {
  const { t } = useTranslation()
  const [hovered, setHovered] = React.useState(false)
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="w-full flex items-center justify-center gap-3 py-3 rounded-sm text-[11px] tracking-widest transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
      style={{
        fontFamily: "var(--font-mono)",
        background: hovered ? "var(--surface-raised)" : "transparent",
        border: `1px solid ${hovered ? "var(--text-faint)" : "var(--border)"}`,
        color: "var(--text-muted)",
      }}
    >
      {loading ? (
        <Spinner />
      ) : (
        <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" aria-hidden>
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
      )}
      {t('auth.continue_with_google')}
    </button>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export function AuthPage({ mode: initialMode = "signin", redirect }: AuthPageProps) {
  const { t } = useTranslation()
  const [mode, setMode]               = React.useState<Mode>(initialMode)
  const [email, setEmail]             = React.useState("")
  const [password, setPassword]       = React.useState("")
  const [loading, setLoading]         = React.useState(false)
  const [googleLoading, setGoogleLoading] = React.useState(false)
  const [error, setError]             = React.useState<string | null>(null)
  const [success, setSuccess]         = React.useState(false)

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
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('auth.something_went_wrong'))
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
      setError(err instanceof Error ? err.message : t('auth.google_sign_in_failed'))
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
      setError(err instanceof Error ? err.message : t('auth.resend_failed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex"
      style={{ background: "var(--bg)" }}
    >
      {/* ── LEFT — animated network ── */}
      <div
        className="hidden lg:flex lg:w-[52%] xl:w-[55%] relative flex-col overflow-hidden"
        style={{ borderRight: "1px solid var(--border)" }}
      >
        <RouteNetwork mode={mode} />

        {/* Top-left brand mark */}
        <div className="relative z-10 p-10 xl:p-14 flex items-center gap-2.5">
          <Waypoints className="w-4 h-4" style={{ color: "var(--accent)" }} />
          <span
            className="text-[12px] font-bold tracking-[0.14em]"
            style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}
          >
            PEREGRI
          </span>
        </div>

        {/* Bottom context copy */}
        <div className="relative z-10 mt-auto p-10 xl:p-14">
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={springConfig}
            >
              <p
                className="text-[10px] tracking-[0.22em] mb-4"
                style={{ fontFamily: "var(--font-mono)", color: "var(--text-faint)" }}
              >
                {mode === "signin" ? t('auth.returning_node') : t('auth.joining_network')}
              </p>
              <h2
                className="text-4xl xl:text-5xl font-bold tracking-tighter mb-4 leading-[1.0]"
                style={{ color: "var(--text)" }}
              >
                {mode === "signin" ? (
                  <>
                    WELCOME<br />
                    <span style={{ color: "var(--accent)" }}>BACK.</span>
                  </>
                ) : (
                  <>
                    JOIN THE<br />
                    <span style={{ color: "var(--accent)" }}>NETWORK.</span>
                  </>
                )}
              </h2>
              <p
                className="text-sm leading-relaxed max-w-[34ch]"
                style={{ color: "var(--text-muted)" }}
              >
                {mode === "signin"
                  ? t('auth.routes_waiting')
                  : t('auth.become_node')}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Live connection indicator */}
          <div
            className="flex items-center gap-2 mt-8"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            <motion.div
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: "var(--accent)" }}
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <span
              className="text-[10px] tracking-widest"
              style={{ color: "var(--text-faint)" }}
            >
              {t('auth.network_active')}
            </span>
          </div>
        </div>
      </div>

      {/* ── RIGHT — form ── */}
      <div
        className="w-full lg:w-[48%] xl:w-[45%] flex flex-col justify-center px-8 py-16 sm:px-12 xl:px-16 relative"
      >
        {/* Top accent line */}
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{ background: "linear-gradient(90deg, transparent, var(--accent), transparent)", opacity: 0.3 }}
        />

        <div className="max-w-[380px] w-full mx-auto">

          {/* Mobile brand */}
          <div className="flex items-center gap-2 mb-10 lg:hidden">
            <Waypoints className="w-4 h-4" style={{ color: "var(--accent)" }} />
            <span
              className="text-[12px] font-bold tracking-[0.14em]"
              style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}
            >
              PEREGRI
            </span>
          </div>

          {/* Mode tabs */}
          <div
            className="flex rounded-sm mb-8 p-0.5"
            style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}
            role="tablist"
          >
            {(["signin", "signup"] as Mode[]).map((m) => (
              <motion.button
                key={m}
                role="tab"
                aria-selected={mode === m}
                onClick={() => switchMode(m)}
                className="flex-1 py-2.5 text-[11px] tracking-[0.14em] rounded-sm transition-colors relative"
                style={{
                  fontFamily: "var(--font-mono)",
                  color: mode === m ? "#fff" : "var(--text-muted)",
                  background: mode === m ? "var(--accent)" : "transparent",
                  fontWeight: mode === m ? 700 : 400,
                }}
                whileTap={{ scale: 0.98 }}
                transition={springConfig}
              >
                {m === "signin" ? t('auth.sign_in_tab') : t('auth.sign_up_tab')}
              </motion.button>
            ))}
          </div>

          {/* Form / success */}
          <AnimatePresence mode="wait">
            {success ? (
              /* ── Success state ── */
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={springConfig}
                className="text-center py-8"
              >
                {/* Animated node check */}
                <div className="relative w-16 h-16 mx-auto mb-6">
                  <motion.div
                    className="absolute inset-0 rounded-full"
                    style={{ border: "1px solid var(--accent)", opacity: 0.3 }}
                    animate={{ scale: [1, 1.5], opacity: [0.3, 0] }}
                    transition={{ duration: 1.8, repeat: Infinity }}
                  />
                  <div
                    className="absolute inset-0 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.3)" }}
                  >
                    <motion.svg
                      viewBox="0 0 24 24"
                      className="w-6 h-6"
                      fill="none"
                      stroke="var(--accent)"
                      strokeWidth={2.5}
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.5, delay: 0.1 }}
                    >
                      <motion.path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.5 12.75l6 6 9-13.5"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                      />
                    </motion.svg>
                  </div>
                </div>

                <h3
                  className="text-xl font-bold tracking-tight mb-3"
                  style={{ color: "var(--text)" }}
                >
                  {t('auth.node_created')}
                </h3>
                <p className="text-sm leading-relaxed mb-8" style={{ color: "var(--text-muted)" }}>
                  {t('auth.check_inbox')}<br />
                  <span style={{ color: "var(--text-faint)" }}>{email}</span>
                </p>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleResend}
                    disabled={loading}
                    className="w-full py-3 text-[11px] tracking-widest rounded-sm transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                    style={{
                      fontFamily: "var(--font-mono)",
                      border: "1px solid var(--border)",
                      color: "var(--text-muted)",
                    }}
                  >
                    {loading ? <Spinner /> : null}
                    {t('auth.resend_email')}
                  </button>
                  <button
                    onClick={() => { setSuccess(false); switchMode("signin") }}
                    className="text-[11px] tracking-wider transition-colors"
                    style={{ fontFamily: "var(--font-mono)", color: "var(--text-faint)" }}
                    onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.color = "var(--accent)"}
                    onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.color = "var(--text-faint)"}
                  >
                    {t('auth.back_to_sign_in')}
                  </button>
                </div>

                <AnimatePresence>
                  {error && <div className="mt-4"><ErrorBlock message={error} /></div>}
                </AnimatePresence>
              </motion.div>

            ) : (
              /* ── Form ── */
              <motion.form
                key={mode}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.18 }}
                onSubmit={handleSubmit}
                className="flex flex-col gap-5"
              >
                <Field
                  label={t('auth.email_address')}
                  type="email"
                  value={email}
                  onChange={setEmail}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
                <Field
                  label={mode === "signin" ? t('auth.password') : t('auth.create_password')}
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
                <motion.button
                  type="submit"
                  disabled={loading || !email || !password}
                  className="w-full py-3.5 text-[11px] font-bold tracking-widest rounded-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  style={{
                    fontFamily: "var(--font-mono)",
                    background: "var(--accent)",
                    color: "#fff",
                    boxShadow: "0 0 20px rgba(59,130,246,0.2)",
                  }}
                  whileHover={{ boxShadow: "0 0 28px rgba(59,130,246,0.4)" }}
                  whileTap={{ scale: 0.99 }}
                  transition={springConfig}
                >
                  {loading && <Spinner />}
                  {mode === "signin" ? t('auth.sign_in_tab') : t('auth.join_network_btn')}
                </motion.button>

                {/* OR divider */}
                <div className="relative flex items-center gap-3">
                  <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
                  <span
                    className="text-[10px] tracking-widest"
                    style={{ fontFamily: "var(--font-mono)", color: "var(--text-faint)" }}
                  >
                    {t('auth.or')}
                  </span>
                  <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
                </div>

                {/* Google */}
                <GoogleButton loading={googleLoading} onClick={handleGoogle} />

                {/* Switch mode */}
                <p
                  className="text-center text-[11px] tracking-wide mt-1"
                  style={{ fontFamily: "var(--font-mono)", color: "var(--text-faint)" }}
                >
                  {mode === "signin" ? (
                    <>
                      {t('auth.no_account_question')}{" "}
                      <button
                        type="button"
                        onClick={() => switchMode("signup")}
                        className="transition-colors"
                        style={{ color: "var(--accent)" }}
                        onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.textDecoration = "underline"}
                        onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.textDecoration = "none"}
                      >
                        {t('auth.sign_up_free')}
                      </button>
                    </>
                  ) : (
                    <>
                      {t('auth.have_account_question')}{" "}
                      <button
                        type="button"
                        onClick={() => switchMode("signin")}
                        className="transition-colors"
                        style={{ color: "var(--accent)" }}
                        onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.textDecoration = "underline"}
                        onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.textDecoration = "none"}
                      >
                        {t('auth.sign_in_link')}
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