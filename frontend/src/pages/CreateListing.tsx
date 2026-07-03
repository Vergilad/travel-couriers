import * as React from "react"
import { useNavigate, Link } from "@tanstack/react-router"
import { motion, AnimatePresence } from "framer-motion"
import { useAuth } from "@/lib/auth"
import { authedFetch } from "@/lib/api"
import { CityAutocomplete } from "@/components/CityAutocomplete"

type Kind = "trip" | "request" | "delivery"
type DateFlexibility = "exact" | "3days" | "1week" | "2weeks"

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
}

const MAX_PRICE = 10_000
const MAX_KG = 3_000

function TerminalInput({
  label, type = "text", value, onChange, placeholder, required, min, max, step,
}: {
  label: string; type?: string; value: string; onChange: (v: string) => void;
  placeholder?: string; required?: boolean; min?: number; max?: number; step?: string;
}) {
  return (
    <div>
      <label className="block text-[10px] tracking-[0.18em] text-[#8C7B68] mb-1.5 uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
        {label}{required && <span className="text-[#C8956A] ml-1">*</span>}
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#C8956A]/40 select-none pointer-events-none text-[11px]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>›</span>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          min={min}
          max={max}
          step={step}
          className="w-full bg-[#111008] border border-[#2E2418] focus:border-[#C8956A]/60 focus:outline-none text-[#F4EDE4] placeholder-[#3A2E20] rounded-sm py-3 pl-8 pr-4 text-[12px] transition-colors"
          style={{ fontFamily: "'JetBrains Mono', monospace", colorScheme: "dark" }}
        />
      </div>
    </div>
  )
}

function TerminalTextarea({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <div>
      <label className="block text-[10px] tracking-[0.18em] text-[#8C7B68] mb-1.5 uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={4}
        className="w-full bg-[#111008] border border-[#2E2418] focus:border-[#C8956A]/60 focus:outline-none text-[#F4EDE4] placeholder-[#3A2E20] rounded-sm py-3 px-4 text-[12px] transition-colors resize-none leading-relaxed"
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      />
    </div>
  )
}

function Toggle({ checked, onChange, label, sublabel }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; sublabel?: string
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex items-center gap-4 w-full p-4 rounded-sm border transition-all text-left ${checked ? "border-[#C8956A]/40 bg-[#C8956A]/5" : "border-[#2E2418] hover:border-[#2E2418]/80"}`}
    >
      <div className={`w-9 h-5 rounded-full flex items-center transition-all shrink-0 ${checked ? "bg-[#C8956A]" : "bg-[#1F1810] border border-[#2E2418]"}`}>
        <div className={`w-3.5 h-3.5 rounded-full bg-white shadow transition-transform mx-0.5 ${checked ? "translate-x-4" : "translate-x-0"}`} />
      </div>
      <div>
        <p className="text-[12px] text-[#F4EDE4]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{label}</p>
        {sublabel && <p className="text-[11px] text-[#8C7B68] mt-0.5">{sublabel}</p>}
      </div>
    </button>
  )
}

const FLEXIBILITY_OPTIONS: { value: DateFlexibility; label: string; desc: string }[] = [
  { value: "exact", label: "EXACT", desc: "Specific dates only" },
  { value: "3days", label: "±3 DAYS", desc: "Give or take a few days" },
  { value: "1week", label: "±1 WEEK", desc: "Roughly that week" },
  { value: "2weeks", label: "±2 WEEKS", desc: "Approximate window" },
]

const KIND_META: Record<Kind, { headline: string; sub: string; gate: string }> = {
  trip: {
    headline: "Post a Trip",
    sub: "You're traveling somewhere — by plane, train, car or ferry. Offer your spare capacity and earn by carrying things along your route.",
    gate: "GATE: TRAVELER MANIFEST",
  },
  delivery: {
    headline: "Send a Delivery",
    sub: "You have an item that needs to reach another city and you're not traveling. Post it for a courier already going that way to carry.",
    gate: "GATE: DELIVERY REQUEST",
  },
  request: {
    headline: "Request a Pickup",
    sub: "Want something bought in another city and brought to you? Ask a traveler passing through to pick it up for you.",
    gate: "GATE: BUY-AND-BRING",
  },
}

export function CreateListing({ kind }: { kind: Kind }) {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const meta = KIND_META[kind]

  const [form, setForm] = React.useState<FormData>({
    title: "", description: "", origin_city: "", origin_country: "",
    dest_city: "", dest_country: "", depart_date: "", arrive_date: "",
    price: "", currency: "USD", capacity_kg: "",
    date_flexibility: "exact",
  })
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [clientError, setClientError] = React.useState<string | null>(null)
  // Cities must be picked from the autocomplete list, not free-typed.
  const [originConfirmed, setOriginConfirmed] = React.useState(false)
  const [destConfirmed, setDestConfirmed] = React.useState(false)

  function set(field: keyof FormData) {
    return (value: string | boolean) => setForm((prev) => ({ ...prev, [field]: value }))
  }

  function validateClient(): string | null {
    if (!originConfirmed || !destConfirmed) return "Please pick both cities from the list."
    if (form.price && Number(form.price) > MAX_PRICE) return `Price cannot exceed $${MAX_PRICE.toLocaleString()}`
    if (form.capacity_kg && Number(form.capacity_kg) > MAX_KG) return `Capacity cannot exceed ${MAX_KG.toLocaleString()} kg`
    if (form.price && Number(form.price) < 0) return "Price cannot be negative"
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
        date_flexibility: form.date_flexibility,
      }
      if (form.description) body.description = form.description
      if (form.depart_date) body.depart_date = form.depart_date
      if (form.arrive_date) body.arrive_date = form.arrive_date
      if (form.price) body.price = Math.min(Number(form.price), MAX_PRICE)
      if (form.capacity_kg) body.capacity_kg = Math.min(Number(form.capacity_kg), MAX_KG)

      const res = await authedFetch("/api/listings", {
        method: "POST",
        body: JSON.stringify(body),
      })
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0E0B08] flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-[#C8956A]/20 border-t-[#C8956A] animate-spin" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0E0B08] flex items-center justify-center px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full border border-[#C8956A]/30 bg-[#C8956A]/10 flex items-center justify-center mx-auto mb-6">
            <svg className="w-7 h-7 text-[#C8956A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
          <h2 className="text-[#F4EDE4] text-2xl mb-3" style={{ fontFamily: "'DM Serif Display', serif" }}>Sign in required</h2>
          <p className="text-[#8C7B68] text-sm leading-relaxed mb-8">You must be signed in to post a {kind}.</p>
          <Link to="/auth" search={{ mode: "signin", redirect: `/${kind}s/new` }}>
            <button className="px-8 py-3 bg-[#C8956A] hover:bg-[#D4A855] text-[#0E0B08] font-bold tracking-widest text-xs rounded-full transition-colors" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              SIGN IN TO CONTINUE
            </button>
          </Link>
        </motion.div>
      </div>
    )
  }

  const hasDateFlexibility = kind === "trip" && form.depart_date

  return (
    <div className="min-h-screen bg-[#0E0B08] pt-16">
      <div className="border-b border-[#1E1810]">
        <div className="max-w-[860px] mx-auto px-6 py-8">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#D4A855] animate-pulse" />
            <span className="text-[10px] tracking-[0.2em] text-[#8C7B68]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{meta.gate}</span>
          </div>
          <h1 className="text-3xl md:text-4xl text-[#F4EDE4] mb-2" style={{ fontFamily: "'DM Serif Display', serif" }}>{meta.headline}</h1>
          <p className="text-[#8C7B68] text-sm leading-relaxed">{meta.sub}</p>
        </div>
      </div>

      <div className="max-w-[860px] mx-auto px-6 py-10">
        <form onSubmit={handleSubmit} className="space-y-10">

          <div>
            <h2 className="text-[10px] tracking-[0.2em] text-[#C8956A] mb-5 uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>— Route</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <CityAutocomplete
                label="Origin city"
                value={form.origin_city}
                onSelect={(city, country) => { setForm(p => ({ ...p, origin_city: city, origin_country: country })); setOriginConfirmed(true) }}
                onClear={() => { setForm(p => ({ ...p, origin_city: "", origin_country: "" })); setOriginConfirmed(false) }}
                placeholder="London, Tokyo…"
                required
              />
              <CityAutocomplete
                label="Destination city"
                value={form.dest_city}
                onSelect={(city, country) => { setForm(p => ({ ...p, dest_city: city, dest_country: country })); setDestConfirmed(true) }}
                onClear={() => { setForm(p => ({ ...p, dest_city: "", dest_country: "" })); setDestConfirmed(false) }}
                placeholder="Dubai, New York…"
                required
              />
            </div>
            {form.origin_country && form.dest_country && (
              <p className="mt-2 text-[11px] text-[#8C7B68]/70" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {form.origin_country} → {form.dest_country}
              </p>
            )}
          </div>

          {kind === "trip" && (
            <div>
              <h2 className="text-[10px] tracking-[0.2em] text-[#C8956A] mb-5 uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>— Travel dates</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
                <TerminalInput
                  label="Departure date"
                  type="date"
                  value={form.depart_date}
                  onChange={set("depart_date")}
                />
                <TerminalInput
                  label="Arrival date"
                  type="date"
                  value={form.arrive_date}
                  onChange={set("arrive_date")}
                />
              </div>
              {hasDateFlexibility && (
                <div>
                  <label className="block text-[10px] tracking-[0.18em] text-[#8C7B68] mb-2 uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    Date flexibility
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {FLEXIBILITY_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => set("date_flexibility")(opt.value)}
                        className={`py-2.5 px-3 rounded-sm border text-center transition-all ${form.date_flexibility === opt.value
                          ? "border-[#C8956A]/50 bg-[#C8956A]/10 text-[#C8956A]"
                          : "border-[#2E2418] text-[#8C7B68] hover:border-[#2E2418]/80 hover:text-[#F4EDE4]"}`}
                      >
                        <p className="text-[10px] tracking-widest font-bold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{opt.label}</p>
                        <p className="text-[10px] mt-0.5 opacity-70">{opt.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {(kind === "delivery" || kind === "request") && (
            <div>
              <h2 className="text-[10px] tracking-[0.2em] text-[#C8956A] mb-5 uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>— Timing</h2>
              <TerminalInput
                label={kind === "delivery" ? "Needed by (latest delivery)" : "Needed by (latest pickup)"}
                type="date"
                value={form.arrive_date}
                onChange={set("arrive_date")}
              />
              <p className="mt-2 text-[11px] text-[#8C7B68]/70" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                Couriers whose trip arrives before this date will match your {kind === "delivery" ? "delivery" : "request"}.
              </p>
            </div>
          )}

          <div>
            <h2 className="text-[10px] tracking-[0.2em] text-[#C8956A] mb-5 uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>— Listing Details</h2>
            <div className="space-y-5">
              <TerminalInput
                label={
                  kind === "trip" ? "Trip summary"
                  : kind === "request" ? "What do you want bought?"
                  : "What needs delivering?"
                }
                value={form.title}
                onChange={set("title")}
                placeholder={
                  kind === "trip" ? "e.g. Driving to Glasgow, room for a few kilos"
                  : kind === "request" ? "e.g. A specific tea from a Lisbon shop"
                  : "e.g. Box of books, ~3kg, well packed"
                }
                required
              />
              <TerminalTextarea
                label="Additional details (optional)"
                value={form.description}
                onChange={set("description")}
                placeholder="Size restrictions, handling instructions, meeting preferences…"
              />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
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
                  <label className="block text-[10px] tracking-[0.18em] text-[#8C7B68] mb-1.5 uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Currency</label>
                  <select
                    value={form.currency}
                    onChange={(e) => set("currency")(e.target.value)}
                    className="w-full bg-[#111008] border border-[#2E2418] focus:border-[#C8956A]/60 focus:outline-none text-[#F4EDE4] rounded-sm py-3 px-4 text-[12px] transition-colors"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="AED">AED</option>
                    <option value="JPY">JPY</option>
                  </select>
                </div>
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
              {form.price && Number(form.price) > MAX_PRICE && (
                <p className="text-[11px] text-[#C47B6B]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>! Max price is ${MAX_PRICE.toLocaleString()}</p>
              )}
              {form.capacity_kg && Number(form.capacity_kg) > MAX_KG && (
                <p className="text-[11px] text-[#C47B6B]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>! Max capacity is {MAX_KG.toLocaleString()} kg</p>
              )}
            </div>
          </div>

          <AnimatePresence>
            {(clientError || error) && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-start gap-2 rounded-sm border border-[#C47B6B]/40 bg-[#C47B6B]/10 px-4 py-3 text-[12px] text-[#E8A090]"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                <span className="mt-0.5 shrink-0">!</span>
                <span>{clientError ?? error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center justify-between pt-6 border-t border-[#1E1810]">
            <Link to="/browse">
              <button type="button" className="text-[11px] text-[#8C7B68] hover:text-[#F4EDE4] tracking-widest transition-colors" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                ← CANCEL
              </button>
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="px-8 py-3.5 bg-[#C8956A] hover:bg-[#D4A855] text-[#0E0B08] font-bold tracking-widest text-[11px] rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {submitting && (
                <div className="w-3.5 h-3.5 rounded-full border-2 border-[#0E0B08]/30 border-t-[#0E0B08] animate-spin" />
              )}
              {submitting ? "POSTING..." : "POST LISTING"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
