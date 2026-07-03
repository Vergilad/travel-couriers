import { useState } from "react"
import { Link, useNavigate } from "@tanstack/react-router"
import { motion } from "framer-motion"

import { Magnetic } from "@/components/landing/Magnetic"
import { CityAutocomplete } from "@/components/CityAutocomplete"

// ─── Domain semantics (single source of truth for the landing) ───────────────
// trip     → the traveler.  "I'm going A→B (fly, drive, train, ferry — any mode,
//            home or abroad). I have spare capacity — bring stuff with me."
// delivery → the sender who stays put. "I have an item that needs to move A→B.
//            I need a courier to carry it."
// request  → a buy-and-bring. "Buy item X in another city and bring it to me."
type Role = "trip" | "delivery" | "request"

interface Step {
  n: string
  title: string
  body: string
  accent?: boolean
}

interface RoleCopy {
  tab: string
  label: string
  headline: string
  intro: string
  steps: Step[]
}

const HOW: Record<Role, RoleCopy> = {
  trip: {
    tab: "TRIP",
    label: "I'm traveling",
    headline: "Fill your empty space — and your wallet",
    intro:
      "You're already going somewhere. By plane, car, train or ferry, at home or abroad. List the route and let people pay you to ride along with their things.",
    steps: [
      {
        n: "01",
        title: "List your route",
        body: "Where from, where to, when, and how much room you can spare. Set your price or leave it open. Your trip — your terms.",
      },
      {
        n: "02",
        title: "Choose who you carry for",
        body: "Senders message you. Read their profile, agree on the item and the handoff, and confirm when you're both happy. You decide who rides with you.",
      },
      {
        n: "03",
        title: "Deliver and earn",
        body: "Hand it over at your destination. Close the deal and it's saved to your travel history — your listing stays open for more senders.",
        accent: true,
      },
    ],
  },
  delivery: {
    tab: "DELIVERY",
    label: "I need it delivered",
    headline: "Send anything, with someone already going",
    intro:
      "You have an item that needs to reach another city — and you're not traveling. Post it and let a courier who's already headed that way carry it for you.",
    steps: [
      {
        n: "01",
        title: "Post your item",
        body: "Describe what needs to move, the origin and destination, your deadline and what you'll pay. You stay exactly where you are.",
      },
      {
        n: "02",
        title: "Match with a courier",
        body: "Travelers already going your way will reach out. Agree on the item, pickup and drop-off, and confirm the match — your request then closes to other couriers.",
      },
      {
        n: "03",
        title: "Receive it, done",
        body: "The courier delivers it at the destination. Close the deal and it's archived to your history — no logistics, no chasing.",
        accent: true,
      },
    ],
  },
  request: {
    tab: "REQUEST",
    label: "Buy it for me",
    headline: "Get something from another city",
    intro:
      "Saw it abroad — or just two cities over — and can't get there? Ask a traveler passing through to pick it up and bring it to you.",
    steps: [
      {
        n: "01",
        title: "Describe what you want",
        body: "What it is, where it's sold, and where you'd like it brought. Name the reward you're willing to offer for the favor.",
      },
      {
        n: "02",
        title: "Find a shopper on the way",
        body: "Travelers heading to that city will see it. Chat, agree on the price and handoff, and confirm the match with your courier.",
      },
      {
        n: "03",
        title: "It arrives with them",
        body: "They buy it, bring it back, and hand it over. Close the deal and it's added to your history.",
        accent: true,
      },
    ],
  },
}

const ROLES: Role[] = ["trip", "delivery", "request"]

function StepCard({ step, index }: { step: Step; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay: index * 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="flex flex-col relative cursor-default"
    >
      <motion.div
        className="text-[120px] leading-none mb-6 select-none"
        style={{
          fontFamily: "'DM Serif Display', serif",
          WebkitTextStroke: `1px rgba(200, 149, 106, ${step.accent ? 1 : 0.4})`,
          color: "transparent",
        }}
      >
        {step.n}
      </motion.div>

      <h3
        className={`font-bold text-2xl mb-4 ${step.accent ? "text-[#C8956A]" : "text-[#F4EDE4]"}`}
      >
        {step.title}
      </h3>

      <p className="text-[#8C7B68] leading-relaxed">{step.body}</p>

      <div
        className="mt-6 h-px"
        style={{ background: `rgba(200,149,106,${step.accent ? 0.6 : 0.2})` }}
      />
    </motion.div>
  )
}

function HowItWorksTabs() {
  const [role, setRole] = useState<Role>("trip")
  const copy = HOW[role]

  return (
    <section id="how-it-works" className="relative z-[2] py-32 px-6 md:px-12 xl:px-20 max-w-[1800px] mx-auto">
      <div className="text-center mb-16">
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-5xl md:text-6xl text-[#F4EDE4] mb-6"
          style={{ fontFamily: "'DM Serif Display', serif" }}
        >
          How It Works
        </motion.h2>
        <p className="text-[#8C7B68] max-w-2xl mx-auto text-lg">
          Three ways to use the network — pick the one that fits you.
        </p>
      </div>

      {/* Role tabs */}
      <div className="flex justify-center mb-16">
        <div className="flex gap-1.5 flex-wrap justify-center">
          {ROLES.map((r) => (
            <button
              key={r}
              onClick={() => setRole(r)}
              className={`px-6 py-2.5 text-[11px] tracking-[0.15em] rounded-full border transition-all ${
                role === r
                  ? "bg-[#C8956A] border-[#C8956A] text-[#0E0B08] font-bold"
                  : "border-[#2E2418] text-[#8C7B68] hover:border-[#C8956A]/40 hover:text-[#F4EDE4]"
              }`}
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {HOW[r].tab}
            </button>
          ))}
        </div>
      </div>

      {/* Active role panel */}
      <motion.div
        key={role}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="max-w-3xl mx-auto mb-24 text-center"
      >
        <p className="text-[11px] tracking-[0.2em] text-[#C8956A] mb-3" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          {copy.label.toUpperCase()}
        </p>
        <h3 className="text-3xl md:text-4xl text-[#F4EDE4] mb-4" style={{ fontFamily: "'DM Serif Display', serif" }}>
          {copy.headline}
        </h3>
        <p className="text-[#8C7B68] text-base leading-relaxed max-w-2xl mx-auto">{copy.intro}</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-16 md:gap-8 xl:gap-16">
        {copy.steps.map((step, index) => (
          <StepCard key={step.n} step={step} index={index} />
        ))}
      </div>
    </section>
  )
}

// ─── Route search ────────────────────────────────────────────────────────────
function RouteSearch() {
  const navigate = useNavigate()
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")

  function handleSearch() {
    const q: Record<string, string> = {}
    if (from) q.origin_city = from
    if (to) q.dest_city = to
    navigate({ to: "/browse", search: q as any })
  }

  return (
    <section className="relative z-[2] py-24 px-6 md:px-12 xl:px-20 border-t border-[#1E1810]">
      <div className="max-w-[900px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-1.5 h-1.5 rounded-full bg-[#D4A855] animate-pulse" />
            <span className="text-[11px] tracking-[0.2em] text-[#8C7B68]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              FIND A ROUTE
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl text-[#F4EDE4] mb-4" style={{ fontFamily: "'DM Serif Display', serif" }}>
            Where to, and where from?
          </h2>
          <p className="text-[#8C7B68] text-base">
            Find couriers already going your way — across an ocean or across town.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.6, delay: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="bg-[#0D0B08] border border-[#2E2418] rounded-md p-6"
        >
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr_auto] gap-3 items-end">
            <CityAutocomplete
              label="From"
              value={from}
              placeholder="Any city…"
              onSelect={(city) => setFrom(city)}
              onChange={(raw) => setFrom(raw)}
              onClear={() => setFrom("")}
            />

            <div className="hidden sm:flex items-end pb-3">
              <span className="text-[#C8956A] text-xl px-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>→</span>
            </div>

            <CityAutocomplete
              label="To"
              value={to}
              placeholder="Any city…"
              onSelect={(city) => setTo(city)}
              onChange={(raw) => setTo(raw)}
              onClear={() => setTo("")}
            />

            <button
              onClick={handleSearch}
              className="px-8 py-3 bg-[#C8956A] hover:bg-[#D4A855] text-[#0E0B08] font-bold text-[11px] tracking-widest rounded-full transition-colors shadow-[0_0_20px_rgba(200,149,106,0.15)] hover:shadow-[0_0_30px_rgba(200,149,106,0.3)] whitespace-nowrap"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              FIND COURIERS
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

// ─── Main page ───────────────────────────────────────────────────────────────
export function LandingPage() {
  return (
    <div className="overflow-x-hidden selection:bg-[#C8956A] selection:text-[#0E0B08]">
      {/* ── Hero — centered ────────────────────────────────────────────────── */}
      <section className="relative z-[2] min-h-screen flex flex-col items-center justify-center text-center px-6 max-w-[1100px] mx-auto pt-28 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-2 mb-10"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-[#D4A855] animate-pulse" />
          <p
            className="text-[11px] tracking-[0.22em] text-[#8C7B68]"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            PEER-TO-PEER COURIER NETWORK
          </p>
        </motion.div>

        <h1
          className="leading-[0.92] tracking-tight mb-8"
          style={{ fontFamily: "'DM Serif Display', serif" }}
        >
          <motion.span
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="block text-[clamp(3rem,8vw,7rem)] text-[#F4EDE4]"
          >
            Your route
          </motion.span>
          <motion.span
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.12, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="block text-[clamp(3rem,8vw,7rem)] italic text-[#C8956A]"
          >
            carries more.
          </motion.span>
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-[#8C7B68] text-lg leading-relaxed max-w-xl mb-12"
        >
          People are already going where you need — by plane, train, car or ferry,
          at home or across borders. Send with them, or carry and earn.
        </motion.p>

        {/* Buttons keep the magnetic effect */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.42 }}
          className="flex flex-wrap items-center justify-center gap-4 mb-14"
        >
          <Magnetic>
            <Link to="/browse">
              <button className="px-8 py-4 bg-[#C8956A] text-[#0E0B08] font-bold tracking-widest text-sm hover:bg-[#D4A855] transition-colors rounded-full shadow-[0_0_24px_rgba(200,149,106,0.25)] hover:shadow-[0_0_36px_rgba(200,149,106,0.45)] cursor-pointer" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                EXPLORE ROUTES
              </button>
            </Link>
          </Magnetic>
          <Magnetic>
            <Link to="/trips/new">
              <button className="px-8 py-4 bg-transparent border border-[#C8956A]/50 text-[#C8956A] font-bold tracking-widest text-sm hover:bg-[#C8956A]/10 transition-colors rounded-full cursor-pointer" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                POST A TRIP
              </button>
            </Link>
          </Magnetic>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[11px] text-[#3A2E20] tracking-[0.2em]"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          <span>ANY MODE</span>
          <span className="text-[#C8956A]/60">·</span>
          <span>ANY DISTANCE</span>
          <span className="text-[#C8956A]/60">·</span>
          <span>PEER-TO-PEER</span>
        </motion.div>
      </section>

      {/* ── How it works (role tabs) ───────────────────────────────────────── */}
      <HowItWorksTabs />

      {/* ── Route search ───────────────────────────────────────────────────── */}
      <RouteSearch />
    </div>
  )
}
