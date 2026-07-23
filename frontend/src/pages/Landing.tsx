import { useEffect, useRef, useState } from "react"
import { Link, useNavigate } from "@tanstack/react-router"
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
  useSpring,
  useVelocity,
} from "framer-motion"
import { ArrowRight, Waypoints, Star, Flag, Ban } from "lucide-react"

import { CityAutocomplete } from "@/components/CityAutocomplete"

// ─── Domain semantics (single source of truth for the landing) ───────────────
// trip     → the traveler.  "I'm going A→B (fly, drive, train, ferry — any mode,
//            home or abroad). I have spare capacity — bring stuff with me."
// delivery → the sender who stays put. "I have an item that needs to move A→B.
//            I need a courier to carry it."
// request  → a buy-and-bring. "Buy item X in another city and bring it to me."

// ─── Route/graph motif primitives ────────────────────────────────────────────
const springConfig = { type: "spring" as const, stiffness: 400, damping: 30 }
const elasticConfig = { type: "spring" as const, stiffness: 300, damping: 15 }

function Logomark({ className = "w-6 h-6" }: { className?: string }) {
  return <Waypoints className={className} />
}

// Renders as the styled child of a router `Link` (never its own interactive
// element) so the anchor stays the single focusable/clickable control.
function GraphButton({
  children,
  variant = "primary",
  className = "",
}: {
  children: React.ReactNode
  variant?: "primary" | "secondary"
  className?: string
}) {
  const base =
    "inline-flex items-center justify-center text-sm font-medium transition-colors rounded-sm h-11 px-6 gap-2"
  const variants = {
    primary:
      "bg-blue-600 text-white group-hover:bg-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.2)] group-hover:shadow-[0_0_25px_rgba(37,99,235,0.4)]",
    secondary:
      "bg-zinc-900 text-zinc-100 border border-zinc-800 group-hover:border-zinc-600 group-hover:bg-zinc-800",
  }
  return (
    <motion.span
      whileHover={{ scale: 1.02, y: -1 }}
      whileTap={{ scale: 0.98, y: 1 }}
      transition={springConfig}
      className={`${base} ${variants[variant]} ${className}`}
    >
      {children}
    </motion.span>
  )
}

function SectionDivider() {
  return (
    <div className="w-full flex items-center justify-center py-8 relative z-10">
      <div className="absolute w-full h-[1px] bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
      <div className="bg-[#09090b] px-4 relative">
        <Logomark className="w-4 h-4 text-zinc-800" />
      </div>
    </div>
  )
}

// ─── Background: node/route network texture ──────────────────────────────────
function NetworkBackground() {
  const { scrollY } = useScroll()
  const y1 = useTransform(scrollY, [0, 1000], [0, 200])
  const y2 = useTransform(scrollY, [0, 1000], [0, -200])

  const lines = [
    { x1: "10%", y1: "20%", x2: "40%", y2: "50%", delay: 0, dur: 3 },
    { x1: "40%", y1: "50%", x2: "80%", y2: "30%", delay: 1, dur: 4 },
    { x1: "80%", y1: "30%", x2: "90%", y2: "70%", delay: 0.5, dur: 3.5 },
    { x1: "40%", y1: "50%", x2: "30%", y2: "80%", delay: 2, dur: 2.5 },
    { x1: "30%", y1: "80%", x2: "60%", y2: "90%", delay: 1.5, dur: 3 },
    { x1: "60%", y1: "90%", x2: "90%", y2: "70%", delay: 0.2, dur: 4 },
  ]

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div
        className="absolute top-0 left-0 w-full h-full opacity-[0.02]"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
          backgroundSize: "32px 32px",
        }}
      />
      <motion.div
        style={{ y: y1 }}
        className="absolute -top-1/4 -right-1/4 w-[800px] h-[800px] bg-blue-600/10 blur-[120px] rounded-full mix-blend-screen"
      />
      <motion.div
        style={{ y: y2 }}
        className="absolute top-1/2 -left-1/4 w-[600px] h-[600px] bg-indigo-600/5 blur-[100px] rounded-full mix-blend-screen"
      />
      <svg className="absolute w-full h-full opacity-30">
        {lines.map((line, i) => (
          <g key={i}>
            <circle cx={line.x1} cy={line.y1} r="3" fill="#27272A" />
            <circle cx={line.x2} cy={line.y2} r="3" fill="#27272A" />
            <line x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} stroke="#18181B" strokeWidth="1.5" strokeDasharray="4 4" />
            <motion.circle
              r="2.5"
              fill="#3b82f6"
              initial={{ cx: line.x1, cy: line.y1, opacity: 0 }}
              animate={{ cx: [line.x1, line.x2], cy: [line.y1, line.y2], opacity: [0, 1, 1, 0] }}
              transition={{ duration: line.dur, repeat: Infinity, ease: "easeInOut", delay: line.delay, times: [0, 0.1, 0.9, 1] }}
              style={{ filter: "drop-shadow(0 0 4px #3b82f6)" }}
            />
          </g>
        ))}
      </svg>
    </div>
  )
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="relative pt-40 pb-28 overflow-hidden bg-[#09090b]">
      <NetworkBackground />
      <div className="max-w-7xl mx-auto px-6 relative z-10 flex flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={elasticConfig}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-sm border border-zinc-800 bg-zinc-900/50 mb-8 backdrop-blur-sm"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
          <span className="font-mono text-[10px] text-zinc-300 tracking-widest font-bold">
            PEER-TO-PEER LOGISTICS MARKETPLACE
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ ...elasticConfig, delay: 0.1 }}
          className="text-5xl md:text-7xl font-bold text-zinc-100 tracking-tighter max-w-4xl mb-6 leading-[1.05]"
        >
          MATCHING TRAVELERS <br className="hidden md:block" />
          <span className="text-zinc-600">WITH DELIVERIES.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...elasticConfig, delay: 0.2 }}
          className="text-lg md:text-xl text-zinc-400 max-w-2xl mb-10 leading-relaxed"
        >
          Put your spare luggage capacity to use. Connect directly with people who need items
          moved along your route—whether by flight, train, bus, or road.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...elasticConfig, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto"
        >
          <Link to="/browse" className="group w-full sm:w-auto focus-visible:outline-none">
            <GraphButton variant="primary" className="h-12 px-8 font-mono w-full sm:w-auto text-xs group-focus-visible:ring-2 group-focus-visible:ring-blue-400">
              BROWSE <ArrowRight className="w-4 h-4" />
            </GraphButton>
          </Link>
          <Link
            to="/trips/new"
            className="group w-full sm:w-auto focus-visible:outline-none"
          >
            <GraphButton variant="secondary" className="h-12 px-8 font-mono w-full sm:w-auto text-xs group-focus-visible:ring-2 group-focus-visible:ring-blue-400">
              POST A TRIP
            </GraphButton>
          </Link>
        </motion.div>
      </div>
    </section>
  )
}

// ─── Live routes ticker (real, non-fabricated city pairs — no invented status) ─
function LiveRoutes() {
  const routes = [
    "SÃO PAULO ↔ LISBON",
    "TORONTO ↔ MANILA",
    "PARIS ↔ DAKAR",
    "DUBAI ↔ NAIROBI",
    "SEOUL ↔ HO CHI MINH CITY",
    "MADRID ↔ BOGOTÁ",
  ]
  const duplicatedRoutes = [...routes, ...routes, ...routes]

  const { scrollY } = useScroll()
  const scrollVelocity = useVelocity(scrollY)
  const skew = useTransform(scrollVelocity, [-1000, 1000], [-5, 5])
  const smoothSkew = useSpring(skew, { stiffness: 100, damping: 30 })

  return (
    <div className="w-full border-y border-zinc-800/80 bg-[#0a0a0c] overflow-hidden py-4 flex items-center relative">
      <div className="absolute left-0 w-32 h-full bg-gradient-to-r from-[#0a0a0c] to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 w-32 h-full bg-gradient-to-l from-[#0a0a0c] to-transparent z-10 pointer-events-none" />
      <motion.div
        className="flex whitespace-nowrap items-center gap-12 px-4"
        animate={{ x: ["0%", "-33.33%"] }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        style={{ skewX: smoothSkew }}
      >
        {duplicatedRoutes.map((pair, i) => (
          <div key={i} className="flex items-center gap-4 font-mono text-xs">
            <span className="text-zinc-400 font-bold tracking-wide">{pair}</span>
            <Logomark className="w-3 h-3 text-zinc-800 mx-6" />
          </div>
        ))}
      </motion.div>
    </div>
  )
}

// ─── How it works: interactive node graph ────────────────────────────────────
const GRAPH_STEPS = [
  {
    id: "post/browse",
    label: "post/browse",
    x: 10,
    y: 50,
    title: "POST A LISTING or BROWSE",
    content:
      "You're going somewhere? Post a Trip. You need something delivered to you? Post a Delivery. You want something bought and brought to you? Post a Purchase Request. Don't have time to post? Browse the listings and reach out to a matching Trip, Delivery or Purchase Request.",
  },
  {
    id: "match",
    label: "match",
    x: 36,
    y: 25,
    title: "SOMEONE REACHES OUT",
    content:
      "Someone sees the listing and contacts. Users read each other's profiles, check reviews and whether they are verified, and message each other to confirm the details. If both sides agree, the match is confirmed. After the deals are confirmed, the listing is closed.",
  },
  {
    id: "move",
    label: "move",
    x: 64,
    y: 75,
    title: "THE DEAL HAPPENS",
    content:
      "The traveler carries the item along their route. The requester receives it. The listing is automatically deleted and stored in the user's history.",
  },
  {
    id: "leave a review",
    label: "leave a review",
    x: 90,
    y: 50,
    title: "LEAVE A PUBLIC REVIEW",
    content:
      "Both sides leave a public review. Reviews are visible on the user's profile and help build trust for future deals. Verified users are more likely to get confirmed and build a stronger reputation over time.",
  },
]

function HowItWorks() {
  const [activeIndex, setActiveIndex] = useState(0)
  const graphRef = useRef<HTMLDivElement>(null)
  const nodeRefs = useRef<(HTMLDivElement | null)[]>([])
  const [centers, setCenters] = useState<{ x: number; y: number }[]>([])

  useEffect(() => {
    const measure = () => {
      const container = graphRef.current
      if (!container) return
      const containerRect = container.getBoundingClientRect()
      const next = nodeRefs.current
        .map((el) => {
          if (!el) return null
          const r = el.getBoundingClientRect()
          return { x: r.left + r.width / 2 - containerRect.left, y: r.top + r.height / 2 - containerRect.top }
        })
        .filter((c): c is { x: number; y: number } => c !== null)
      setCenters(next)
    }
    measure()
    window.addEventListener("resize", measure)
    return () => window.removeEventListener("resize", measure)
  }, [])

  return (
    <section id="how-it-works" className="pt-32 pb-16 relative bg-[#09090b] overflow-hidden">
      <Logomark className="absolute -right-40 top-0 w-[800px] h-[800px] text-zinc-800/[0.03] rotate-45 pointer-events-none" />

      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <div className="mb-24 text-center flex flex-col items-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Logomark className="w-4 h-4 text-blue-500" />
            <h2 className="font-mono text-xs font-bold tracking-widest text-blue-500">MARKETPLACE LOGIC</h2>
          </div>
          <h3 className="text-4xl md:text-5xl font-bold text-zinc-100 tracking-tighter max-w-2xl">
            HOW PEREGRI CONNECTS THE DOTS.
          </h3>
        </div>

        <div className="w-full flex flex-col items-center">
          <div ref={graphRef} className="relative w-full max-w-4xl h-[240px] md:h-[320px] mb-16 select-none">
            <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
              {GRAPH_STEPS.map((_node, i) => {
                if (i === 0 || !centers[i] || !centers[i - 1]) return null
                const prev = centers[i - 1]
                const curr = centers[i]
                return (
                  <g key={`line-${i}`}>
                    <line x1={prev.x} y1={prev.y} x2={curr.x} y2={curr.y} stroke="#27272A" strokeWidth="2" strokeDasharray="6 6" />
                    <motion.line
                      x1={prev.x}
                      y1={prev.y}
                      x2={curr.x}
                      y2={curr.y}
                      stroke="#3b82f6"
                      strokeWidth="2"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ opacity: activeIndex >= i ? 1 : 0, pathLength: activeIndex >= i ? 1 : 0 }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                      style={{ filter: "drop-shadow(0 0 6px rgba(37,99,235,0.4))" }}
                    />
                    <motion.circle
                      r="3.5"
                      fill="#3b82f6"
                      initial={{ cx: prev.x, cy: prev.y, opacity: 0 }}
                      animate={{ cx: [prev.x, curr.x], cy: [prev.y, curr.y], opacity: [0, 1, 1, 0] }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: i * 0.6 }}
                      style={{ filter: "drop-shadow(0 0 8px #3b82f6)" }}
                    />
                  </g>
                )
              })}
            </svg>

            {GRAPH_STEPS.map((node, i) => {
              const isActive = activeIndex === i
              return (
                <motion.button
                  key={node.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-controls="how-it-works-panel"
                  className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center cursor-pointer group z-10 focus-visible:outline-none focus-visible:[&_>div]:ring-2 focus-visible:[&_>div]:ring-blue-400"
                  style={{ left: `${node.x}%`, top: `${node.y}%` }}
                  onClick={() => setActiveIndex(i)}
                  whileHover={{ scale: 1.15, y: -2 }}
                  transition={springConfig}
                >
                  <div className="absolute inset-0 w-24 h-24 -left-12 -top-12 bg-transparent" />
                  <motion.div
                    ref={(el) => {
                      nodeRefs.current[i] = el
                    }}
                    className={`w-10 h-10 rounded-full flex items-center justify-center relative backdrop-blur-md transition-colors duration-500 ${
                      isActive ? "bg-blue-600" : "bg-zinc-900 border-2 border-zinc-800"
                    }`}
                    animate={{
                      scale: isActive ? 1.2 : 1,
                      boxShadow: isActive ? "0 0 30px rgba(37,99,235,0.6)" : "0 0 0px rgba(37,99,235,0)",
                    }}
                    whileHover={{ boxShadow: !isActive ? "0 0 20px rgba(37,99,235,0.3)" : "0 0 30px rgba(37,99,235,0.6)" }}
                    transition={springConfig}
                  >
                    {isActive ? (
                      <div className="w-3 h-3 bg-white rounded-full shadow-[0_0_10px_white]" />
                    ) : (
                      <div className="w-2.5 h-2.5 bg-zinc-600 rounded-full group-hover:bg-zinc-400 transition-colors" />
                    )}
                    {isActive && (
                      <motion.div
                        className="absolute inset-0 rounded-full border border-blue-400"
                        animate={{ scale: [1, 2.5], opacity: [0.8, 0] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                      />
                    )}
                  </motion.div>
                  <motion.span
                    className={`mt-6 font-mono text-sm font-bold tracking-widest transition-colors duration-300 ${
                      isActive ? "text-zinc-100" : "text-zinc-500 group-hover:text-zinc-300"
                    }`}
                  >
                    {node.label}
                  </motion.span>
                </motion.button>
              )
            })}
          </div>

          <div className="w-full max-w-3xl relative min-h-[220px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeIndex}
                id="how-it-works-panel"
                role="tabpanel"
                initial={{ opacity: 0, y: 15, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -15, scale: 0.98 }}
                transition={springConfig}
                className="absolute inset-0 bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 p-8 md:p-12 rounded-sm text-center flex flex-col items-center justify-center shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)]"
              >
                <div className="text-blue-500 font-mono text-[10px] font-bold tracking-widest mb-4 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  STEP 0{activeIndex + 1} // {GRAPH_STEPS[activeIndex].id.toUpperCase()}
                </div>
                <h4 className="text-2xl md:text-3xl font-bold text-zinc-100 tracking-tighter mb-6">
                  {GRAPH_STEPS[activeIndex].title}
                </h4>
                <p className="text-zinc-400 text-sm md:text-base leading-relaxed max-w-2xl">
                  {GRAPH_STEPS[activeIndex].content}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Trust & safety ───────────────────────────────────────────────────────────
function TrustSafety() {
  const facts = [
    {
      label: "VERIFIED IDENTITY, TRUSTED DEALS",
      value:
        "Users can verify their identity through with a legal ID. Verifications are handled anonimously and securely by humans. Verified users build stronger trust — unverified status is shown on profiles and listings so you always know who you're dealing with.",
    },
    {
      label: "LEGAL GOODS ONLY — ZERO EXCEPTIONS",
      value:
        "Peregri is strictly for lawful items. Anyone attempting to ship drugs, weapons, counterfeit goods, or any prohibited contraband is permanently banned on the spot and may be reported to the relevant authorities.",
    },
    {
      label: "REVIEWS BUILD YOUR REPUTATION",
      value:
        "After every closed deal, both sides leave a public review. A courier's track record is visible before you ever message them — honesty compounds over time.",
    },
    {
      label: "SCAMS GET YOU BANNED PERMANENTLY",
      value:
        "Ghosting after confirmation, fake listings, or demanding payment outside the platform are treated as fraud. Reports are reviewed privately by our team; serious or repeat offenders lose access for good.",
    },
  ]

  return (
    <section id="trust" className="pb-24 pt-4 bg-[#0a0a0c] relative">
      <SectionDivider />

      <div className="max-w-7xl mx-auto px-6 mt-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={springConfig}
            className="order-2 lg:order-1 relative aspect-square md:aspect-[4/3] rounded-sm overflow-hidden border border-zinc-800 bg-[#0c0c0e] group flex items-center justify-center"
          >
            <div
              className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
                backgroundSize: "24px 24px",
              }}
            />
            <div className="absolute inset-0 flex flex-col justify-center gap-4 px-6 py-8 z-10">
              <div className="font-mono text-[10px] font-bold tracking-widest text-zinc-600 mb-1 flex items-center gap-2">
                <Logomark className="w-3.5 h-3.5 text-blue-500" />
                THREE LAYERS OF TRUST
              </div>

              <motion.div
                initial={{ opacity: 0, x: -12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={springConfig}
                className="bg-[#09090b]/70 border border-zinc-800 rounded-sm p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-base">🪪</span>
                  <span className="text-zinc-200 text-xs font-bold tracking-widest">IDENTITY · VERIFIED</span>
                </div>
                <p className="text-zinc-500 text-[11px] leading-relaxed">
                  Verified users show a badge on their profile and listings. Unverified status is clearly flagged — so you always know who you're dealing with before you confirm.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ ...springConfig, delay: 0.08 }}
                className="bg-[#09090b]/70 border border-zinc-800 rounded-sm p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Star className="w-4 h-4 text-yellow-500 fill-current" />
                  <span className="text-zinc-200 text-xs font-bold tracking-widest">REVIEWS · PUBLIC RECORD</span>
                </div>
                <p className="text-zinc-500 text-[11px] leading-relaxed mb-3">
                  Left by both sides after every handover. Visible on profiles permanently.
                </p>
                <div className="flex items-center gap-2 bg-zinc-900/60 border border-zinc-800 rounded-sm px-3 py-2">
                  <div className="flex gap-0.5 text-yellow-500">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="w-3 h-3 fill-current" />
                    ))}
                  </div>
                  <span className="text-zinc-400 text-[11px]">"Smooth handover, right on time."</span>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ ...springConfig, delay: 0.16 }}
                className="bg-[#09090b]/70 border border-zinc-800 rounded-sm p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Ban className="w-4 h-4 text-red-400" />
                  <span className="text-zinc-200 text-xs font-bold tracking-widest">ILLEGAL ACTIVITIES · ZERO TOLERANCE</span>
                </div>
                <p className="text-zinc-500 text-[11px] leading-relaxed">
                  Scamming, ghosting, or attempting to ship illegal goods results in a permanent ban. Reports are reviewed by our team and serious or repeat offenders lose access for good.
                </p>
              </motion.div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={springConfig}
            className="order-1 lg:order-2"
          >
            <div className="flex items-center gap-2 mb-3">
              <h2 className="font-mono text-xs font-bold tracking-widest text-blue-500">TRUST & SAFETY</h2>
            </div>
            <h3 className="text-4xl font-bold text-zinc-100 tracking-tighter mb-6">BUILT SO YOU CAN TRUST A STRANGER.</h3>
            <p className="text-zinc-400 text-lg mb-10 leading-relaxed">
              People are more likely to trust a stranger when they know the stranger is verified. Peregri strongly recommends that all users verify their identity and stay alert for unverified users.
            </p>

            <div className="space-y-6">
              {facts.map((item, i) => (
                <div key={i} className="flex gap-4">
                  <div className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                  <div>
                    <div className="font-mono text-sm font-bold text-zinc-100 mb-1.5">{item.label}</div>
                    <div className="text-sm text-zinc-500 leading-relaxed">{item.value}</div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

// ─── Route search (real, functional — wired to /browse) ──────────────────────
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
    <section id="corridors" className="relative py-24 px-6 bg-[#09090b] border-t border-zinc-800/80">
      <div className="max-w-[900px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={springConfig}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-2 mb-4">
            <Logomark className="w-4 h-4 text-blue-500" />
            <span className="font-mono text-xs font-bold tracking-widest text-blue-500">FIND A ROUTE</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-zinc-100 tracking-tighter mb-4">
            WHERE TO, AND WHERE FROM?
          </h2>
          <p className="text-zinc-400 text-base">
            Find couriers already going your way — across an ocean or across town.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ ...springConfig, delay: 0.1 }}
          className="bg-zinc-900/40 border border-zinc-800 rounded-sm p-6"
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
              <span className="text-blue-500 text-xl px-1 font-mono">→</span>
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
              className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] font-mono tracking-widest rounded-sm transition-colors shadow-[0_0_15px_rgba(37,99,235,0.2)] hover:shadow-[0_0_25px_rgba(37,99,235,0.4)] whitespace-nowrap"
            >
              FIND COURIERS
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

// ─── Closing CTA ──────────────────────────────────────────────────────────────
function FooterCTA() {
  return (
    <section className="py-32 relative overflow-hidden flex flex-col items-center justify-center text-center bg-[#0a0a0c]">
      <div className="absolute inset-0 bg-blue-600/[0.02]" />
      <div className="max-w-3xl mx-auto px-6 relative z-10">
        <h2 className="text-5xl md:text-6xl font-bold text-zinc-100 tracking-tighter mb-8">START MOVING.</h2>
        <p className="text-zinc-400 mb-10 max-w-xl mx-auto text-lg leading-relaxed">
          Join the peer-to-peer logistics network. List your upcoming trip to help move items
          along your way, or post a delivery to get an item carried across borders.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/browse" className="group w-full sm:w-auto focus-visible:outline-none">
            <GraphButton variant="primary" className="h-12 px-8 font-mono w-full sm:w-auto text-xs group-focus-visible:ring-2 group-focus-visible:ring-blue-400">
              BROWSE <ArrowRight className="w-4 h-4" />
            </GraphButton>
          </Link>
          <Link
            to="/trips/new"
            className="group w-full sm:w-auto focus-visible:outline-none"
          >
            <GraphButton variant="secondary" className="h-12 px-8 font-mono w-full sm:w-auto text-xs group-focus-visible:ring-2 group-focus-visible:ring-blue-400">
              POST A TRIP
            </GraphButton>
          </Link>
        </div>
      </div>
    </section>
  )
}

// ─── Main page ───────────────────────────────────────────────────────────────
export function LandingPage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-300 font-sans selection:bg-blue-900 selection:text-white overflow-x-hidden">
      <Hero />
      <LiveRoutes />
      <HowItWorks />
      <TrustSafety />
      <RouteSearch />
      <FooterCTA />
    </div>
  )
}
