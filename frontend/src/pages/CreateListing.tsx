import * as React from "react"
import { useNavigate, Link } from "@tanstack/react-router"
import { motion, AnimatePresence } from "framer-motion"
import { useAuth } from "@/lib/auth"
import { authedFetch } from "@/lib/api"
import { CityAutocomplete } from "@/components/CityAutocomplete"

type Kind = "trip" | "request" | "delivery"
type DateFlexibility = "exact" | "week" | "month"

interface FormData {
  title: string
  description: string
  origin_city: string
  origin_country: string
  dest_city: string
  dest_country: string
  depart_date: string
  arrive_date: string
  price: string
  currency: string
  capacity_kg: string
  date_flexibility: DateFlexibility
  no_date: boolean
  no_price: boolean
}

const MAX_PRICE = 10_000
const MAX_CAPACITY_KG = 3_000
const MAX_TITLE = 80
const MAX_DESCRIPTION = 500

// ── Shared input style ────────────────────────────────────────────────────────
const baseInputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: "2px",
  color: "var(--text)",
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: "12px",
  outline: "none",
  transition: "border-color 0.15s",
  colorScheme: "dark",
}

function onFocusBlue(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
  e.target.style.borderColor = "var(--accent)"
}
function onBlurBorder(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
  e.target.style.borderColor = "var(--border)"
}

// ── Form field components ─────────────────────────────────────────────────────
function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label
      className="block font-mono text-[10px] tracking-[0.18em] mb-1.5 uppercase"
      style={{ color: "var(--text-muted)" }}
    >
      {children}
      {required && <span className="ml-1" style={{ color: "var(--destructive)" }}>*</span>}
    </label>
  )
}

// Keys that HTML5 <input type="number"> otherwise accepts even though they're
// letters/symbols, not digits (e.g. "1e5" scientific notation, "-", "+").
const BLOCKED_NUMERIC_KEYS = new Set(["e", "E", "+", "-"])

function onKeyDownNumeric(e: React.KeyboardEvent<HTMLInputElement>) {
  if (BLOCKED_NUMERIC_KEYS.has(e.key)) e.preventDefault()
}

// Strip anything that isn't a digit or a single decimal point — guards against
// pasted text like "12abc" or "1e5" slipping past the keydown guard.
function sanitizeNumeric(raw: string): string {
  const cleaned = raw.replace(/[^0-9.]/g, "")
  const firstDot = cleaned.indexOf(".")
  if (firstDot === -1) return cleaned
  return cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, "")
}

function TerminalInput({
  label, type = "text", value, onChange, placeholder, required, min, max, step, maxLength, disabled,
}: {
  label: string; type?: string; value: string; onChange: (v: string) => void;
  placeholder?: string; required?: boolean; min?: number; max?: number; step?: string; maxLength?: number;
  disabled?: boolean;
}) {
  const atLimit = !!(maxLength && value.length >= maxLength)
  const isNumeric = type === "number"
  return (
    <div>
      <FieldLabel required={required}>{label}</FieldLabel>
      <div className="relative">
        <span
          className="absolute left-3 top-1/2 -translate-y-1/2 select-none pointer-events-none font-mono text-[11px]"
          style={{ color: "var(--text-faint)" }}
        >
          ›
        </span>
        <input
          type={type}
          inputMode={isNumeric ? "decimal" : undefined}
          value={value}
          onChange={e => {
            let v = e.target.value
            if (isNumeric) v = sanitizeNumeric(v)
            onChange(maxLength ? v.slice(0, maxLength) : v)
          }}
          onKeyDown={isNumeric ? onKeyDownNumeric : undefined}
          onPaste={isNumeric ? e => {
            e.preventDefault()
            const text = sanitizeNumeric(e.clipboardData.getData("text"))
            onChange(text)
          } : undefined}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          min={min}
          max={max}
          step={step}
          maxLength={maxLength}
          onFocus={onFocusBlue}
          onBlur={e => {
            e.target.style.borderColor = atLimit ? "var(--destructive)" : "var(--border)"
          }}
          style={{
            ...baseInputStyle,
            padding: "10px 12px 10px 28px",
            paddingRight: maxLength ? "52px" : "12px",
            borderColor: atLimit ? "var(--destructive)" : "var(--border)",
            opacity: disabled ? 0.4 : 1,
            cursor: disabled ? "not-allowed" : "text",
          }}
        />
        {maxLength && (
          <span
            className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[9px] tracking-wider tabular-nums pointer-events-none"
            style={{ color: atLimit ? "var(--destructive)" : "var(--text-faint)" }}
          >
            {value.length}/{maxLength}
          </span>
        )}
      </div>
    </div>
  )
}

function TerminalTextarea({ label, value, onChange, placeholder, maxLength }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; maxLength?: number
}) {
  const atLimit = !!(maxLength && value.length >= maxLength)
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <textarea
        value={value}
        onChange={e => onChange(maxLength ? e.target.value.slice(0, maxLength) : e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        rows={4}
        onFocus={onFocusBlue}
        onBlur={onBlurBorder}
        style={{
          ...baseInputStyle,
          padding: "10px 12px",
          resize: "none",
          lineHeight: "1.6",
          borderColor: atLimit ? "var(--destructive)" : "var(--border)",
        }}
      />
      {maxLength && (
        <p
          className="mt-1.5 text-right font-mono text-[9px] tracking-wider tabular-nums"
          style={{ color: atLimit ? "var(--destructive)" : "var(--text-faint)" }}
        >
          {value.length}/{maxLength}
        </p>
      )}
    </div>
  )
}

// ── Toggle ────────────────────────────────────────────────────────────────────
function Toggle({ checked, onChange, label, sublabel }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; sublabel?: string
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-4 w-full p-4 rounded-sm text-left transition-all"
      style={{
        border: `1px solid ${checked ? "rgba(37,99,235,0.4)" : "var(--border)"}`,
        background: checked ? "rgba(37,99,235,0.06)" : "transparent",
      }}
    >
      {/* Track */}
      <div
        className="flex items-center shrink-0 transition-all"
        style={{
          width: 36, height: 20, borderRadius: 10,
          background: checked ? "var(--accent)" : "var(--surface-raised)",
          border: checked ? "none" : "1px solid var(--border)",
        }}
      >
        <div
          className="rounded-full bg-white shadow transition-transform"
          style={{
            width: 14, height: 14, margin: "0 3px",
            transform: checked ? "translateX(16px)" : "translateX(0)",
          }}
        />
      </div>
      <div>
        <p className="font-mono text-[12px]" style={{ color: "var(--text)" }}>{label}</p>
        {sublabel && <p className="font-mono text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>{sublabel}</p>}
      </div>
    </button>
  )
}

// ── Section heading ───────────────────────────────────────────────────────────
function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="font-mono text-[10px] tracking-[0.2em] mb-5 uppercase flex items-center gap-2"
      style={{ color: "var(--accent)" }}
    >
      <span className="opacity-50">—</span> {children}
    </h2>
  )
}

// ── Page meta ─────────────────────────────────────────────────────────────────
const FLEXIBILITY_OPTIONS: { value: DateFlexibility; label: string; desc: string }[] = [
  { value: "exact", label: "EXACT", desc: "Specific date only" },
  { value: "week", label: "±1 WEEK", desc: "Roughly that week" },
  { value: "month", label: "±1 MONTH", desc: "Approximate month" },
]

const KIND_META: Record<Kind, { headline: string; sub: string; gate: string }> = {
  trip: {
    headline: "Post a Trip",
    sub: "You're traveling somewhere — by plane, train, car or ferry. Offer your spare capacity and earn by carrying things along your route.",
    gate: "GATE: TRAVELER MANIFEST",
  },
  delivery: {
    headline: "Send a Delivery",
    sub: "You have an item that needs to reach another city. Post it for a courier already going that way to carry.",
    gate: "GATE: DELIVERY REQUEST",
  },
  request: {
    headline: "Request a Pickup",
    sub: "Want something bought in another city and brought to you? Ask a traveler passing through to pick it up.",
    gate: "GATE: BUY-AND-BRING",
  },
}

// ── Component ─────────────────────────────────────────────────────────────────
export function CreateListing({ kind }: { kind: Kind }) {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const meta = KIND_META[kind]

  const [form, setForm] = React.useState<FormData>({
    title: "", description: "", origin_city: "", origin_country: "",
    dest_city: "", dest_country: "", depart_date: "", arrive_date: "",
    price: "", currency: "USD", capacity_kg: "",
    date_flexibility: "exact", no_date: false, no_price: false,
  })
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [clientError, setClientError] = React.useState<string | null>(null)
  const [originConfirmed, setOriginConfirmed] = React.useState(false)
  const [destConfirmed, setDestConfirmed] = React.useState(false)

  function set(field: keyof FormData) {
    return (value: string | boolean) => setForm(prev => ({ ...prev, [field]: value }))
  }

  function validateClient(): string | null {
    if (!originConfirmed || !destConfirmed) return "Please pick both cities from the list."
    if (!form.no_price && form.price && Number(form.price) > MAX_PRICE) return `Price cannot exceed ${MAX_PRICE.toLocaleString()}`
    if (form.capacity_kg && Number(form.capacity_kg) > MAX_KG) return `Capacity cannot exceed ${MAX_KG.toLocaleString()} kg`
    if (!form.no_price && form.price && Number(form.price) < 0) return "Price cannot be negative"
    if (form.capacity_kg && Number(form.capacity_kg) <= 0) return "Capacity must be greater than 0"
    if (form.depart_date && form.arrive_date && form.arrive_date < form.depart_date) return "Arrival date cannot be before departure date"
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const ce = validateClient()
    if (ce) { setClientError(ce); return }
    setClientError(null)
    if (!user) {
      navigate({ to: "/auth", search: { mode: "signin", redirect: `/${kind}s/new` } })
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const body: Record<string, unknown> = {
        kind,
        title: form.title,
        origin_city: form.origin_city,
        origin_country: form.origin_country,
        dest_city: form.dest_city,
        dest_country: form.dest_country,
        currency: form.currency || "USD",
        date_flexibility: form.no_date ? "exact" : form.date_flexibility,
      }
      if (form.description) body.description = form.description
      if (!form.no_date && form.depart_date) body.depart_date = form.depart_date
      if (!form.no_date && form.arrive_date) body.arrive_date = form.arrive_date
      if (!form.no_price && form.price) body.price = Math.min(Number(form.price), MAX_PRICE)
      if (form.capacity_kg) body.capacity_kg = Math.min(Number(form.capacity_kg), MAX_KG)
      const res = await authedFetch("/api/listings", { method: "POST", body: JSON.stringify(body) })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.detail ?? data.error ?? `Server error ${res.status}`)
      }
      const listing = await res.json()
      navigate({ to: "/listings/$id", params: { id: listing.id } })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setSubmitting(false)
    }
  }

  // ── Auth guards ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <motion.div
          className="w-5 h-5 rounded-full"
          style={{ border: "2px solid rgba(37,99,235,0.15)", borderTopColor: "var(--accent)" }}
          animate={{ rotate: 360 }}
          transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
        />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "var(--bg)" }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-md">
          <div
            className="w-16 h-16 rounded-sm flex items-center justify-center mx-auto mb-6"
            style={{ background: "rgba(37,99,235,0.08)", border: "1px solid rgba(37,99,235,0.25)" }}
          >
            <svg className="w-7 h-7" style={{ color: "var(--accent)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-3" style={{ color: "var(--text)" }}>Sign in required</h2>
          <p className="text-sm leading-relaxed mb-8" style={{ color: "var(--text-muted)" }}>
            You must be signed in to post a {kind}.
          </p>
          <Link to="/auth" search={{ mode: "signin", redirect: `/${kind}s/new` }}>
            <button
              className="px-8 py-3 font-mono font-bold tracking-widest text-xs rounded-sm transition-colors"
              style={{ background: "var(--accent)", color: "#fff" }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--accent-dim)")}
              onMouseLeave={e => (e.currentTarget.style.background = "var(--accent)")}
            >
              SIGN IN TO CONTINUE
            </button>
          </Link>
        </motion.div>
      </div>
    )
  }

  const hasDateFlexibility = kind === "trip" && !form.no_date && form.depart_date

  return (
    <div className="min-h-screen pt-16" style={{ background: "var(--bg)" }}>

      {/* ── Header ── */}
      <div style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="max-w-[860px] mx-auto px-6 py-8">
          <div className="flex items-center gap-2 mb-2">
            <motion.div
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: "var(--accent)" }}
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.6, repeat: Infinity }}
            />
            <span className="font-mono text-[10px] tracking-[0.2em]" style={{ color: "var(--text-muted)" }}>
              {meta.gate}
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2" style={{ color: "var(--text)", letterSpacing: "-0.03em" }}>
            {meta.headline}
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>{meta.sub}</p>
        </div>
      </div>

      {/* ── Form ── */}
      <div className="max-w-[860px] mx-auto px-6 py-10">
        <form onSubmit={handleSubmit} className="space-y-10">

          {/* Route */}
          <div>
            <SectionHeading>Route</SectionHeading>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <CityAutocomplete
                label="Origin city"
                value={form.origin_city}
                onSelect={(city, country) => { setForm(p => ({ ...p, origin_city: city, origin_country: country })); setOriginConfirmed(true) }}
                onClear={() => { setForm(p => ({ ...p, origin_city: "", origin_country: "" })); setOriginConfirmed(false) }}
                placeholder="Moscow, Istanbul…"
                required
              />
              <CityAutocomplete
                label="Destination city"
                value={form.dest_city}
                onSelect={(city, country) => { setForm(p => ({ ...p, dest_city: city, dest_country: country })); setDestConfirmed(true) }}
                onClear={() => { setForm(p => ({ ...p, dest_city: "", dest_country: "" })); setDestConfirmed(false) }}
                placeholder="Dubai, London…"
                required
              />
            </div>
            {form.origin_country && form.dest_country && (
              <p className="mt-2 font-mono text-[11px]" style={{ color: "var(--text-muted)", opacity: 0.7 }}>
                {form.origin_country} → {form.dest_country}
              </p>
            )}
          </div>

          {/* Travel dates (trip) */}
          {kind === "trip" && (
            <div>
              <SectionHeading>Travel dates</SectionHeading>
              <div className="mb-5">
                <Toggle
                  checked={form.no_date}
                  onChange={v => setForm(p => ({ ...p, no_date: v, depart_date: v ? "" : p.depart_date, arrive_date: v ? "" : p.arrive_date }))}
                  label="No specific date"
                  sublabel="Show this listing under every time filter."
                />
              </div>
              {!form.no_date && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
                    <TerminalInput label="Departure date" type="date" value={form.depart_date} onChange={set("depart_date")} />
                    <TerminalInput label="Arrival date" type="date" value={form.arrive_date} onChange={set("arrive_date")} />
                  </div>
                  {hasDateFlexibility && (
                    <div>
                      <FieldLabel>Date flexibility</FieldLabel>
                      <div className="grid grid-cols-3 gap-2">
                        {FLEXIBILITY_OPTIONS.map(opt => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => set("date_flexibility")(opt.value)}
                            className="py-2.5 px-3 rounded-sm text-center transition-all"
                            style={{
                              border: `1px solid ${form.date_flexibility === opt.value ? "rgba(37,99,235,0.5)" : "var(--border)"}`,
                              background: form.date_flexibility === opt.value ? "rgba(37,99,235,0.08)" : "transparent",
                              color: form.date_flexibility === opt.value ? "var(--accent)" : "var(--text-muted)",
                            }}
                          >
                            <p className="font-mono text-[10px] tracking-widest font-bold">{opt.label}</p>
                            <p className="font-mono text-[10px] mt-0.5 opacity-70">{opt.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Timing (delivery / request) */}
          {(kind === "delivery" || kind === "request") && (
            <div>
              <SectionHeading>Timing</SectionHeading>
              <div className="mb-5">
                <Toggle
                  checked={form.no_date}
                  onChange={v => setForm(p => ({ ...p, no_date: v, arrive_date: v ? "" : p.arrive_date }))}
                  label="No specific date"
                  sublabel="Show this listing under every time filter."
                />
              </div>
              {!form.no_date && (
                <>
                  <TerminalInput
                    label={kind === "delivery" ? "Needed by (latest delivery)" : "Needed by (latest pickup)"}
                    type="date"
                    value={form.arrive_date}
                    onChange={set("arrive_date")}
                  />
                  <p className="mt-2 font-mono text-[11px]" style={{ color: "var(--text-muted)", opacity: 0.7 }}>
                    Couriers whose trip arrives before this date will match your {kind}.
                  </p>
                </>
              )}
            </div>
          )}

          {/* Listing details */}
          <div>
            <SectionHeading>Listing details</SectionHeading>
            <div className="space-y-5">
              <TerminalInput
                label={kind === "trip" ? "Trip summary" : kind === "request" ? "What do you want bought?" : "What needs delivering?"}
                value={form.title}
                onChange={set("title")}
                placeholder={
                  kind === "trip" ? "e.g. Driving to Glasgow, room for a few kilos"
                  : kind === "request" ? "e.g. A specific tea from a Lisbon shop"
                  : "e.g. Box of books, ~3kg, well packed"
                }
                maxLength={MAX_TITLE}
                required
              />
              <TerminalTextarea
                label="Additional details (optional)"
                value={form.description}
                onChange={set("description")}
                placeholder="Size restrictions, handling instructions, meeting preferences…"
                maxLength={MAX_DESCRIPTION}
              />
              <div className="mb-1">
                <Toggle
                  checked={form.no_price}
                  onChange={v => setForm(p => ({ ...p, no_price: v, price: v ? "" : p.price }))}
                  label="No price set"
                  sublabel="Leave it open — you'll agree on a price in messages."
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                {!form.no_price && (
                  <>
                    <TerminalInput
                      label={kind === "trip" ? "Your fee ($)" : "Offering to pay ($)"}
                      type="number"
                      value={form.price}
                      onChange={set("price")}
                      placeholder="0"
                      min={0}
                      max={MAX_PRICE}
                      step="0.01"
                    />
                    <div>
                      <FieldLabel>Currency</FieldLabel>
                      <select
                        value={form.currency}
                        onChange={e => set("currency")(e.target.value)}
                        onFocus={onFocusBlue}
                        onBlur={onBlurBorder}
                        style={{ ...baseInputStyle, padding: "10px 12px" }}
                      >
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                        <option value="AED">AED</option>
                        <option value="RUB">RUB</option>
                        <option value="CNY">CNY</option>
                        <option value="TRY">TRY</option>
                      </select>
                    </div>
                  </>
                )}
                {kind === "trip" && (
                  <TerminalInput
                    label={`Spare capacity (kg, max ${MAX_KG.toLocaleString()})`}
                    type="number"
                    value={form.capacity_kg}
                    onChange={set("capacity_kg")}
                    placeholder="e.g. 5"
                    min={0.1}
                    max={MAX_KG}
                    step="0.1"
                  />
                )}
              </div>
              {!form.no_price && form.price && Number(form.price) > MAX_PRICE && (
                <p className="font-mono text-[11px]" style={{ color: "var(--destructive)" }}>! Max price is ${MAX_PRICE.toLocaleString()}</p>
              )}
              {form.capacity_kg && Number(form.capacity_kg) > MAX_KG && (
                <p className="font-mono text-[11px]" style={{ color: "var(--destructive)" }}>! Max capacity is {MAX_KG.toLocaleString()} kg</p>
              )}
            </div>
          </div>

          {/* Error banner */}
          <AnimatePresence>
            {(clientError || error) && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-start gap-2 rounded-sm px-4 py-3 font-mono text-[12px]"
                style={{
                  border: "1px solid rgba(239,68,68,0.35)",
                  background: "rgba(239,68,68,0.08)",
                  color: "var(--destructive)",
                }}
              >
                <span className="mt-0.5 shrink-0">!</span>
                <span>{clientError ?? error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer */}
          <div
            className="flex items-center justify-between pt-6"
            style={{ borderTop: "1px solid var(--border)" }}
          >
            <Link to="/browse">
              <button
                type="button"
                className="font-mono text-[11px] tracking-widest transition-colors"
                style={{ color: "var(--text-muted)" }}
                onMouseEnter={e => (e.currentTarget.style.color = "var(--text)")}
                onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}
              >
                ← CANCEL
              </button>
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 font-mono font-bold tracking-widest text-[11px] rounded-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: "var(--accent)",
                color: "#fff",
                padding: "12px 32px",
              }}
              onMouseEnter={e => { if (!submitting) e.currentTarget.style.background = "var(--accent-dim)" }}
              onMouseLeave={e => (e.currentTarget.style.background = "var(--accent)")}
            >
              {submitting && (
                <motion.div
                  className="w-3.5 h-3.5 rounded-full"
                  style={{ border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff" }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
                />
              )}
              {submitting ? "POSTING..." : "POST LISTING"}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}
