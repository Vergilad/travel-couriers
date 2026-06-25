import * as React from "react"
import { useLocation, Link } from "wouter"
import { motion, AnimatePresence } from "framer-motion"
import { useAuth, authedFetch } from "@/lib/auth"

type Kind = "trip" | "request" | "delivery"

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
}

function TerminalInput({ label, type = "text", value, onChange, placeholder, required }: {
  label: string; type?: string; value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean
}) {
  return (
    <div>
      <label className="block text-[10px] tracking-[0.18em] text-[#8C7B68] mb-1.5 uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
        {label}{required && <span className="text-[#C8956A] ml-1">*</span>}
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#C8956A]/50 select-none pointer-events-none text-[11px]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>›</span>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          className="w-full bg-[#111008] border border-[#2E2418] focus:border-[#C8956A]/60 focus:outline-none text-[#F4EDE4] placeholder-[#3A2E20] rounded-sm py-3 pl-8 pr-4 text-sm transition-colors"
          style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "12px" }}
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
        className="w-full bg-[#111008] border border-[#2E2418] focus:border-[#C8956A]/60 focus:outline-none text-[#F4EDE4] placeholder-[#3A2E20] rounded-sm py-3 px-4 text-sm transition-colors resize-none leading-relaxed"
        style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "12px" }}
      />
    </div>
  )
}

const KIND_META: Record<Kind, { headline: string; sub: string; gate: string }> = {
  trip: {
    headline: "Post a Trip",
    sub: "Share your travel plans and earn by carrying items along your route.",
    gate: "GATE: TRAVELER MANIFEST",
  },
  request: {
    headline: "Make a Request",
    sub: "Need something from abroad? Post a request for a traveler to bring it to you.",
    gate: "GATE: ITEM REQUEST",
  },
  delivery: {
    headline: "Offer Delivery",
    sub: "Already have an item you're willing to transport? List the delivery offer here.",
    gate: "GATE: DELIVERY OFFER",
  },
}

export function CreateListing({ kind }: { kind: Kind }) {
  const { user, session, loading } = useAuth()
  const [, navigate] = useLocation()
  const meta = KIND_META[kind]

  const [form, setForm] = React.useState<FormData>({
    title: "", description: "", origin_city: "", origin_country: "",
    dest_city: "", dest_country: "", depart_date: "", arrive_date: "",
    price: "", currency: "USD", capacity_kg: "",
  })
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  function set(field: keyof FormData) {
    return (value: string) => setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) { navigate("/auth"); return }
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
      }
      if (form.description) body.description = form.description
      if (form.depart_date) body.depart_date = form.depart_date
      if (form.arrive_date) body.arrive_date = form.arrive_date
      if (form.price) body.price = Number(form.price)
      if (form.capacity_kg) body.capacity_kg = Number(form.capacity_kg)

      const fetch = authedFetch(session)
      const res = await fetch("/api/listings", {
        method: "POST",
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? `Server error ${res.status}`)
      }
      const listing = await res.json()
      navigate(`/listings/${listing.id}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0E0B08] flex items-center justify-center">
        <svg className="animate-spin h-8 w-8 text-[#C8956A]" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
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
          <p className="text-[#8C7B68] text-sm leading-relaxed mb-8">You must be signed in to post a {kind}. Join the network to list your routes and requests.</p>
          <Link href={`/auth?redirect=/${kind}s/new`}>
            <button className="px-8 py-3 bg-[#C8956A] hover:bg-[#D4A855] text-[#0E0B08] font-bold tracking-widest text-xs rounded-sm transition-colors" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              SIGN IN TO CONTINUE
            </button>
          </Link>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0E0B08] pt-16">
      {/* Header */}
      <div className="border-b border-[#1E1810]">
        <div className="max-w-[900px] mx-auto px-6 py-8">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#D4A855] animate-pulse" />
            <span className="text-[10px] tracking-[0.2em] text-[#8C7B68]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{meta.gate}</span>
          </div>
          <h1 className="text-3xl md:text-4xl text-[#F4EDE4] mb-2" style={{ fontFamily: "'DM Serif Display', serif" }}>{meta.headline}</h1>
          <p className="text-[#8C7B68] text-sm leading-relaxed">{meta.sub}</p>
        </div>
      </div>

      <div className="max-w-[900px] mx-auto px-6 py-10">
        <form onSubmit={handleSubmit} className="space-y-10">
          {/* Route section */}
          <div>
            <h2 className="text-[10px] tracking-[0.2em] text-[#C8956A] mb-5 uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              — Route Information
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <TerminalInput label="Origin city" value={form.origin_city} onChange={set("origin_city")} placeholder="e.g. London" required />
              <TerminalInput label="Origin country" value={form.origin_country} onChange={set("origin_country")} placeholder="e.g. UK" required />
              <TerminalInput label="Destination city" value={form.dest_city} onChange={set("dest_city")} placeholder="e.g. Tokyo" required />
              <TerminalInput label="Destination country" value={form.dest_country} onChange={set("dest_country")} placeholder="e.g. Japan" required />
              {kind === "trip" && (
                <>
                  <TerminalInput label="Departure date" type="date" value={form.depart_date} onChange={set("depart_date")} />
                  <TerminalInput label="Arrival date" type="date" value={form.arrive_date} onChange={set("arrive_date")} />
                </>
              )}
            </div>
          </div>

          {/* Details section */}
          <div>
            <h2 className="text-[10px] tracking-[0.2em] text-[#C8956A] mb-5 uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              — Listing Details
            </h2>
            <div className="space-y-5">
              <TerminalInput
                label={kind === "trip" ? "Trip summary" : kind === "request" ? "What do you need?" : "Item title"}
                value={form.title}
                onChange={set("title")}
                placeholder={kind === "trip" ? "e.g. Flying light, can take small items" : kind === "request" ? "e.g. Japanese skincare products" : "e.g. Small electronics package"}
                required
              />
              <TerminalTextarea
                label="Description (optional)"
                value={form.description}
                onChange={set("description")}
                placeholder="Add any additional details, restrictions, or instructions..."
              />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <TerminalInput
                  label={kind === "request" ? "Offered reward" : "Base price"}
                  type="number"
                  value={form.price}
                  onChange={set("price")}
                  placeholder="0.00"
                />
                <div>
                  <label className="block text-[10px] tracking-[0.18em] text-[#8C7B68] mb-1.5 uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Currency</label>
                  <select
                    value={form.currency}
                    onChange={(e) => set("currency")(e.target.value)}
                    className="w-full bg-[#111008] border border-[#2E2418] focus:border-[#C8956A]/60 focus:outline-none text-[#F4EDE4] rounded-sm py-3 px-4 text-sm transition-colors"
                    style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "12px" }}
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>
                {kind === "trip" && (
                  <TerminalInput label="Capacity (kg)" type="number" value={form.capacity_kg} onChange={set("capacity_kg")} placeholder="e.g. 5" />
                )}
              </div>
            </div>
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex items-start gap-2 rounded-sm border border-[#C47B6B]/40 bg-[#C47B6B]/10 px-4 py-3 text-[12px] text-[#E8A090]"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                <span className="mt-0.5 shrink-0">!</span>
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit */}
          <div className="flex items-center justify-between pt-6 border-t border-[#1E1810]">
            <Link href="/browse">
              <button type="button" className="text-[11px] text-[#8C7B68] hover:text-[#F4EDE4] tracking-widest transition-colors" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                ← CANCEL
              </button>
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="px-8 py-3.5 bg-[#C8956A] hover:bg-[#D4A855] text-[#0E0B08] font-bold tracking-widest text-xs rounded-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {submitting && (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              )}
              {submitting ? "POSTING..." : "POST LISTING"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
