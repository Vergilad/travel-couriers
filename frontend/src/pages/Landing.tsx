import { useState, useEffect, useRef } from "react"
import { Link } from "@tanstack/react-router"
import { motion, useInView } from "framer-motion"
import { useQuery } from "@tanstack/react-query"

import { Magnetic } from "@/components/landing/Magnetic"
import { WorldMap } from "@/components/landing/WorldMap"
import { fetchOpenListings } from "@/lib/api"
import type { Listing } from "@/types/listing"

// ─── Solari split-flap alphabet ─────────────────────────────────────────────
const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ·→$-"

function SplitFlapChar({
  targetChar,
  size = "large",
}: {
  targetChar: string
  size?: "large" | "small"
}) {
  const [currentChar, setCurrentChar] = useState(targetChar)
  const [isFlipping, setIsFlipping] = useState(false)
  const prevTarget = useRef(targetChar)

  useEffect(() => {
    if (prevTarget.current === targetChar) return
    prevTarget.current = targetChar
    setIsFlipping(true)
    let iterations = 0
    const maxIterations = 10 + Math.floor(Math.random() * 5)
    const interval = setInterval(() => {
      iterations++
      if (iterations >= maxIterations) {
        setCurrentChar(targetChar)
        setIsFlipping(false)
        clearInterval(interval)
      } else {
        setCurrentChar(CHARS[Math.floor(Math.random() * CHARS.length)])
      }
    }, 50)
    return () => clearInterval(interval)
  }, [targetChar])

  const isSpace = currentChar === " " && !isFlipping
  const w = size === "large" ? "w-8" : "w-5 sm:w-6"
  const h = size === "large" ? "h-11" : "h-7 sm:h-8"
  const text = size === "large" ? "text-xl" : "text-xs sm:text-sm"

  return (
    <div
      className={`relative flex items-center justify-center ${w} ${h} rounded-[2px] overflow-hidden ${
        isSpace ? "bg-transparent" : "bg-[#1A1200] shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)]"
      }`}
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        color: "#D4A855",
        boxShadow: isSpace
          ? "none"
          : "inset 0 1px 2px rgba(255,255,255,0.05), inset 0 -1px 2px rgba(0,0,0,0.5)",
      }}
    >
      {!isSpace && (
        <>
          <div
            className="absolute inset-0 pointer-events-none opacity-20"
            style={{
              backgroundImage: "linear-gradient(rgba(212, 168, 85, 0.1) 1px, transparent 1px)",
              backgroundSize: "100% 2px",
            }}
          />
          <div className="absolute top-1/2 left-0 w-full h-[1px] bg-[#D4A855] opacity-20 -translate-y-1/2 z-10" />
          <span className={`relative z-0 leading-none ${text} ${isFlipping ? "blur-[0.5px]" : ""}`}>
            {currentChar}
          </span>
        </>
      )}
    </div>
  )
}

function SplitFlapWord({
  text,
  size = "large",
}: {
  text: string
  size?: "large" | "small"
}) {
  return (
    <div className="flex gap-[2px]">
      {text.split("").map((char, i) => (
        <SplitFlapChar key={i} targetChar={char.toUpperCase()} size={size} />
      ))}
    </div>
  )
}

// ─── Data helpers ────────────────────────────────────────────────────────────
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]

function fmtRoute(l: Listing) {
  const from = l.origin_city.toUpperCase().slice(0, 5).padEnd(5)
  const to = l.dest_city.toUpperCase().slice(0, 5).padEnd(5)
  return `${from} → ${to}`.padEnd(15, " ").slice(0, 15)
}

function fmtDate(l: Listing) {
  const d = new Date(l.depart_date)
  return `${MONTHS[d.getMonth()]} ${String(d.getDate()).padStart(2, "0")}`
}

function fmtKind(l: Listing) {
  const map: Record<string, string> = { trip: "TRIP   ", request: "REQUEST", delivery: "DELIVER" }
  return map[l.kind] ?? "TRIP   "
}

function fmtStatus(l: Listing) {
  const map: Record<string, string> = {
    open: "OPEN    ",
    matched: "MATCHED ",
    completed: "DONE    ",
    cancelled: "CLOSED  ",
  }
  return map[l.status] ?? "OPEN    "
}

type BoardRow = { id: string; route: string; date: string; kind: string; status: string }

const FALLBACK_ROWS: BoardRow[] = [
  { id: "1", route: "BAKU  → ISTAN", date: "JUL 15", kind: "TRIP   ", status: "BOARDING" },
  { id: "2", route: "LONDN → PARIS", date: "JUL 18", kind: "TRIP   ", status: "ON TIME " },
  { id: "3", route: "DUBAI → TBILI", date: "AUG 01", kind: "REQUEST", status: "OPEN    " },
  { id: "4", route: "TORON → LAGOS", date: "AUG 05", kind: "TRIP   ", status: "OPEN    " },
  { id: "5", route: "AMSTR → BARCE", date: "AUG 12", kind: "DELIVER", status: "OPEN    " },
]

const BLANK_ROWS: BoardRow[] = FALLBACK_ROWS.map((r) => ({
  ...r,
  route: " ".repeat(r.route.length),
  date: " ".repeat(r.date.length),
  kind: " ".repeat(r.kind.length),
  status: " ".repeat(r.status.length),
}))

const ROTATING_STATUSES = ["ON TIME ", "BOARDING", "DELAYED ", "OPEN    ", "CLOSED  ", "DEPARTED"]

// ─── Cycling headline phrases ────────────────────────────────────────────────
const PHRASES = ["ANYTHING.  ", "EVERYTHING.", "YOUR WORLD."]

// ─── Step card (own hover state so animate works correctly) ───────────────────
interface Step { n: string; title: string; body: string; accent: boolean }

function StepCard({ step, index }: { step: Step; index: number }) {
  const [hovered, setHovered] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay: index * 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      className="flex flex-col relative cursor-default"
    >
      {/* Big number — animates independently via animate prop */}
      <motion.div
        animate={{ y: hovered ? -18 : 0 }}
        transition={{ type: "spring", stiffness: 340, damping: 26, mass: 0.8 }}
        className="text-[120px] leading-none mb-6 select-none"
        style={{
          fontFamily: "'DM Serif Display', serif",
          WebkitTextStroke: `1px rgba(200, 149, 106, ${step.accent ? 1 : 0.4})`,
          color: "transparent",
          willChange: "transform",
        }}
      >
        {step.n}
      </motion.div>

      {/* Title — slight lift too */}
      <motion.h3
        animate={{ y: hovered ? -4 : 0 }}
        transition={{ type: "spring", stiffness: 340, damping: 30, mass: 0.8, delay: 0.03 }}
        className={`font-bold text-2xl mb-4 ${step.accent ? "text-[#C8956A]" : "text-[#F4EDE4]"}`}
      >
        {step.title}
      </motion.h3>

      <p className="text-[#8C7B68] leading-relaxed">{step.body}</p>

      {/* Subtle bottom accent line on hover */}
      <motion.div
        animate={{ scaleX: hovered ? 1 : 0, opacity: hovered ? 1 : 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="mt-6 h-px origin-left"
        style={{ background: `rgba(200,149,106,${step.accent ? 0.6 : 0.3})` }}
      />
    </motion.div>
  )
}

// ─── Main page component ─────────────────────────────────────────────────────
export function LandingPage() {
  const cursorRef = useRef<HTMLDivElement>(null)
  const boardRef = useRef<HTMLDivElement>(null)
  const [phraseIndex, setPhraseIndex] = useState(0)
  const [boardRows, setBoardRows] = useState<BoardRow[]>(FALLBACK_ROWS)
  const [displayRows, setDisplayRows] = useState<BoardRow[]>(BLANK_ROWS)

  // Trigger SplitFlap ONLY when board enters viewport
  const isBoardInView = useInView(boardRef, { once: true, amount: 0.4 })

  const { data: listings } = useQuery({
    queryKey: ["listings", "open", 6],
    queryFn: () => fetchOpenListings(6),
  })

  // Populate board with real data when available
  useEffect(() => {
    if (listings && listings.length > 0) {
      const rows = listings.slice(0, 6).map((l) => ({
        id: l.id,
        route: fmtRoute(l),
        date: fmtDate(l),
        kind: fmtKind(l),
        status: fmtStatus(l),
      }))
      setBoardRows(rows.length >= 5 ? rows : [...rows, ...FALLBACK_ROWS.slice(rows.length)])
    }
  }, [listings])

  // Activate SplitFlap animation only once board is visible — 600ms delay so the
  // page visually settles before the letters start flipping.
  useEffect(() => {
    if (!isBoardInView) return
    const timer = setTimeout(() => setDisplayRows(boardRows), 600)
    return () => clearTimeout(timer)
  }, [isBoardInView]) // eslint-disable-line react-hooks/exhaustive-deps

  // Once activated, keep in sync with live boardRows updates (status rotation)
  useEffect(() => {
    if (isBoardInView) setDisplayRows((prev) => prev.map((row, i) => boardRows[i] ?? row))
  }, [boardRows]) // eslint-disable-line react-hooks/exhaustive-deps

  // Phrase cycling
  useEffect(() => {
    const interval = setInterval(() => {
      setPhraseIndex((prev) => (prev + 1) % PHRASES.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  // Random board status updates (visual drama)
  useEffect(() => {
    const interval = setInterval(() => {
      setBoardRows((current) => {
        const next = [...current]
        const randomRow = Math.floor(Math.random() * next.length)
        next[randomRow] = {
          ...next[randomRow],
          status: ROTATING_STATUSES[Math.floor(Math.random() * ROTATING_STATUSES.length)],
        }
        return next
      })
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  // Aurora cursor glow
  useEffect(() => {
    const updateCursor = (e: MouseEvent) => {
      requestAnimationFrame(() => {
        if (cursorRef.current) {
          cursorRef.current.style.transform = `translate(${e.clientX - 300}px, ${e.clientY - 300}px)`
        }
      })
    }
    window.addEventListener("mousemove", updateCursor)
    return () => window.removeEventListener("mousemove", updateCursor)
  }, [])

  const STEPS: Step[] = [
    {
      n: "01",
      title: "Post a Route",
      body: "Traveling soon? List your flight details, available space, and your fee. Or request an item you need brought to you.",
      accent: false,
    },
    {
      n: "02",
      title: "Match & Meet",
      body: "Connect safely. Agree on terms, verify identities through our platform, and hand off the item before departure.",
      accent: false,
    },
    {
      n: "03",
      title: "Deliver & Earn",
      body: "Hand over the package at the destination. Payment is released from escrow automatically upon successful delivery.",
      accent: true,
    },
  ]

  return (
    <div className="overflow-x-hidden selection:bg-[#C8956A] selection:text-[#0E0B08]">
      {/* Aurora Cursor */}
      <div
        ref={cursorRef}
        className="fixed top-0 left-0 w-[600px] h-[600px] pointer-events-none z-[1] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(200, 149, 106, 0.08) 0%, transparent 60%)",
          willChange: "transform",
        }}
      />

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="relative z-[2] min-h-screen flex flex-col xl:flex-row items-center pt-28 pb-20 px-6 md:px-12 xl:px-20 gap-16 xl:gap-8 max-w-[1800px] mx-auto">
        {/* Left: copy */}
        <div className="w-full xl:w-[55%] flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-1.5 h-1.5 rounded-full bg-[#D4A855] animate-pulse" />
            <p
              className="text-[11px] tracking-[0.2em] text-[#8C7B68]"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              PEER-TO-PEER COURIER NETWORK
            </p>
          </div>

          <h1
            className="leading-[0.9] tracking-tight mb-8"
            style={{ fontFamily: "'DM Serif Display', serif" }}
          >
            <Magnetic>
              <div className="text-[clamp(4rem,8vw,10rem)] text-[#F4EDE4]">YOUR NEXT TRIP</div>
            </Magnetic>
            <Magnetic>
              <div
                className="text-[clamp(4rem,8vw,10rem)]"
                style={{ WebkitTextStroke: "1px #C8956A", color: "transparent" }}
              >
                CARRIES
              </div>
            </Magnetic>
            <Magnetic>
              <div className="text-[clamp(4rem,8vw,10rem)] text-[#C8956A]">MORE.</div>
            </Magnetic>
          </h1>

          <div className="h-16 mb-12 flex items-center">
            <SplitFlapWord text={PHRASES[phraseIndex]} size="large" />
          </div>

          <div className="flex flex-wrap items-center gap-6 mb-16">
            <Magnetic>
              <Link to="/browse">
                <button className="px-8 py-4 bg-[#C8956A] text-[#0E0B08] font-bold tracking-widest text-sm hover:bg-[#D4A855] transition-colors rounded-sm shadow-[0_0_20px_rgba(200,149,106,0.2)] hover:shadow-[0_0_30px_rgba(200,149,106,0.4)] cursor-pointer" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  EXPLORE ROUTES
                </button>
              </Link>
            </Magnetic>
            <Magnetic>
              <Link to="/trips/new">
                <button className="px-8 py-4 bg-transparent border border-[#C8956A]/50 text-[#C8956A] font-bold tracking-widest text-sm hover:bg-[#C8956A]/10 transition-colors rounded-sm cursor-pointer" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  POST A TRIP
                </button>
              </Link>
            </Magnetic>
          </div>

          <div
            className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[#8C7B68] tracking-wider"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            <span>1,240 ACTIVE COURIERS</span>
            <span className="text-[#C8956A]">·</span>
            <span>86 COUNTRIES</span>
            <span className="text-[#C8956A]">·</span>
            <span>$2.4M DELIVERED</span>
          </div>
        </div>

        {/* Right: Solari departure board */}
        <div ref={boardRef} className="w-full xl:w-[45%] flex justify-center xl:justify-end">
          {/* CSS float — runs on compositor thread, no React involvement */}
          <div
            className="w-full max-w-[700px] bg-[#111008] border border-[#D4A855]/20 p-6 md:p-8 rounded-md relative overflow-hidden"
            style={{
              boxShadow: "0 20px 50px rgba(0,0,0,0.5), inset 0 1px 3px rgba(255,255,255,0.05)",
              backgroundImage: "linear-gradient(180deg, rgba(255,255,255,0.02) 0%, transparent 100%)",
              animation: "boardFloat 7s ease-in-out infinite",
              willChange: "transform",
            }}
          >
            {/* Glass sheen */}
            <div className="absolute top-0 left-0 w-full h-[40%] bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none rounded-t-md" />

            <div className="flex justify-between items-end border-b border-[#D4A855]/20 pb-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)] animate-pulse" />
                <h2
                  className="text-lg text-[#F4EDE4] tracking-widest"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  DEPARTURES
                </h2>
              </div>
              <span
                className="text-xs text-[#8C7B68] tracking-widest hidden sm:block"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                LIVE STATUS
              </span>
            </div>

            {/* Column headers */}
            <div
              className="grid grid-cols-12 gap-2 mb-2 px-2 text-[10px] text-[#8C7B68] tracking-widest"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              <div className="col-span-5">ROUTE</div>
              <div className="col-span-2">DATE</div>
              <div className="col-span-2">KIND</div>
              <div className="col-span-3">STATUS</div>
            </div>

            {/* Board rows — only animate when in view */}
            <div className="space-y-3">
              {displayRows.map((row) => (
                <div
                  key={row.id}
                  className="grid grid-cols-12 gap-2 bg-black/20 p-2 rounded-sm border border-white/5"
                >
                  <div className="col-span-12 sm:col-span-5 overflow-hidden">
                    <SplitFlapWord text={row.route} size="small" />
                  </div>
                  <div className="col-span-2 hidden sm:block">
                    <SplitFlapWord text={row.date} size="small" />
                  </div>
                  <div className="col-span-2 hidden sm:block">
                    <SplitFlapWord text={row.kind} size="small" />
                  </div>
                  <div className="col-span-12 sm:col-span-3">
                    <SplitFlapWord text={row.status} size="small" />
                  </div>
                </div>
              ))}
            </div>

            <div
              className="mt-6 flex justify-between items-center text-[10px] text-[#8C7B68]"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              <span>SOLARI-TRX SYS. V2.4</span>
              <span>SYNC: OK</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── World map ────────────────────────────────────────────────────────── */}
      <WorldMap listings={listings ?? []} />

      {/* ── Marquee strip ─────────────────────────────────────────────────────── */}
      <div className="relative z-[2] w-full bg-[#111008] border-y border-[#D4A855]/20 py-4 overflow-hidden flex items-center">
        <div
          className="absolute inset-0 pointer-events-none opacity-10 z-10"
          style={{
            backgroundImage: "linear-gradient(rgba(212, 168, 85, 1) 1px, transparent 1px)",
            backgroundSize: "100% 3px",
          }}
        />
        <motion.div
          animate={{ x: ["0%", "-50%"] }}
          transition={{ repeat: Infinity, ease: "linear", duration: 30 }}
          className="flex whitespace-nowrap text-[#C8956A] text-lg tracking-[0.2em]"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          <span className="pr-8">
            BAKU → ISTANBUL · LONDON → PARIS · DUBAI → TBILISI · AMSTERDAM → BARCELONA · TORONTO → LAGOS · SINGAPORE → SYDNEY · NAIROBI → CAIRO · TOKYO → SEOUL ·
          </span>
          <span className="pr-8">
            BAKU → ISTANBUL · LONDON → PARIS · DUBAI → TBILISI · AMSTERDAM → BARCELONA · TORONTO → LAGOS · SINGAPORE → SYDNEY · NAIROBI → CAIRO · TOKYO → SEOUL ·
          </span>
        </motion.div>
      </div>

      {/* ── How it works ──────────────────────────────────────────────────────── */}
      <section id="how-it-works" className="relative z-[2] py-32 px-6 md:px-12 xl:px-20 max-w-[1800px] mx-auto">
        <div className="text-center mb-24">
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
            A trusted network of travelers turning empty luggage space into a global logistics solution.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-16 md:gap-8 xl:gap-16">
          {STEPS.map((step, index) => (
            <StepCard key={step.n} step={step} index={index} />
          ))}
        </div>
      </section>
    </div>
  )
}
