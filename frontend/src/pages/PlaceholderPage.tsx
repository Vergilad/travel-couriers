import * as React from "react"
import { motion } from "framer-motion"
import { Link } from "@tanstack/react-router"
import { useTranslation } from "@/i18n/I18nContext"

// ─── Route graph geometry ────────────────────────────────────────────────────

interface Node {
  id: string
  x: number
  y: number
  label: string
  mapped: boolean
}

interface Edge {
  from: string
  to: string
  dashed: boolean
}

const NODES: Node[] = [
  { id: "a", x: 18,  y: 22,  label: "LHR", mapped: true  },
  { id: "b", x: 52,  y: 11,  label: "CDG", mapped: true  },
  { id: "c", x: 80,  y: 28,  label: "BER", mapped: false },
  { id: "d", x: 34,  y: 47,  label: "MAD", mapped: true  },
  { id: "e", x: 65,  y: 55,  label: "FCO", mapped: false },
  { id: "f", x: 20,  y: 70,  label: "LIS", mapped: false },
  { id: "g", x: 82,  y: 72,  label: "ATH", mapped: false },
  { id: "h", x: 48,  y: 80,  label: "???" , mapped: false },
]

const EDGES: Edge[] = [
  { from: "a", to: "b", dashed: false },
  { from: "b", to: "c", dashed: true  },
  { from: "a", to: "d", dashed: false },
  { from: "b", to: "d", dashed: false },
  { from: "d", to: "e", dashed: true  },
  { from: "c", to: "e", dashed: true  },
  { from: "d", to: "f", dashed: true  },
  { from: "e", to: "g", dashed: true  },
  { from: "f", to: "h", dashed: true  },
  { from: "e", to: "h", dashed: true  },
  { from: "g", to: "h", dashed: true  },
]

function nodeById(id: string) {
  return NODES.find(n => n.id === id)!
}

function px(n: Node) { return { x: n.x, y: n.y } }

interface PlaceholderPageProps {
  title: string
}

export function PlaceholderPage({ title }: PlaceholderPageProps) {
  const { t } = useTranslation()
  const [tick, setTick] = React.useState(0)

  React.useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1800)
    return () => clearInterval(id)
  }, [])

  const section = title.split("—")[0].trim()
  const subtitle = title.includes("—") ? title.split("—")[1].trim() : t('placeholder.coming_soon')

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-6 pt-20 pb-24 relative overflow-hidden"
      style={{ background: "var(--bg)" }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 60% 40% at 50% 40%, rgba(37,99,235,0.06) 0%, transparent 70%)",
        }}
      />

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full max-w-2xl opacity-[0.22]"
          style={{ maxHeight: "70vh" }}
        >
          {EDGES.map((edge, i) => {
            const a = px(nodeById(edge.from))
            const b = px(nodeById(edge.to))
            const len = Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2)
            return (
              <motion.line
                key={i}
                x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                stroke={edge.dashed ? "var(--text-faint)" : "var(--accent)"}
                strokeWidth={0.4}
                strokeDasharray={edge.dashed ? "1.5 1" : "none"}
                style={!edge.dashed ? { strokeDasharray: len } : undefined}
                initial={!edge.dashed ? { strokeDashoffset: len } : {}}
                animate={!edge.dashed ? { strokeDashoffset: 0 } : {}}
                transition={{ duration: 1.2, delay: i * 0.15, ease: "easeOut" }}
              />
            )
          })}

          {NODES.filter(n => n.mapped).map((n, i) => (
            <motion.circle
              key={`glow-${n.id}`}
              cx={n.x} cy={n.y}
              fill="var(--accent)"
              initial={{ r: 0, opacity: 0 }}
              animate={{ r: [0, 2.5, 0], opacity: [0, 0.3, 0] }}
              transition={{
                duration: 2,
                delay: i * 0.4 + (tick * 0.1 % 0.4),
                repeat: Infinity,
                repeatDelay: 3,
              }}
            />
          ))}

          {NODES.map((n, i) => (
            <motion.g key={n.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
            >
              <circle
                cx={n.x} cy={n.y} r={1.4}
                fill={n.mapped ? "var(--accent)" : "var(--surface-raised)"}
                stroke={n.mapped ? "var(--accent)" : "var(--border)"}
                strokeWidth={0.3}
              />
              <text
                x={n.x} y={n.y - 2.4}
                textAnchor="middle"
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "2.5px",
                  fill: n.mapped ? "var(--accent)" : "var(--text-faint)",
                  letterSpacing: "0.3px",
                }}
              >
                {n.label}
              </text>
            </motion.g>
          ))}
        </svg>
      </div>

      <motion.div
        className="relative z-10 flex flex-col items-center text-center gap-6"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <div className="mb-2">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <motion.line
              x1="4" y1="24" x2="20" y2="24"
              stroke="var(--accent)"
              strokeWidth="1.5"
              strokeDasharray="3 2"
              initial={{ strokeDashoffset: 20 }}
              animate={{ strokeDashoffset: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
            <motion.circle
              cx="24" cy="24" r="5"
              fill="var(--surface-raised)"
              stroke="var(--accent)"
              strokeWidth="1.5"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.3, type: "spring", stiffness: 300 }}
            />
            <motion.circle
              cx="24" cy="24" r="5"
              fill="none"
              stroke="var(--accent)"
              strokeWidth="1"
              initial={{ r: 5, opacity: 0.6 }}
              animate={{ r: 14, opacity: 0 }}
              transition={{ duration: 1.6, delay: 0.8, repeat: Infinity, repeatDelay: 1.2 }}
            />
            <motion.line
              x1="29" y1="24" x2="44" y2="24"
              stroke="var(--text-faint)"
              strokeWidth="1"
              strokeDasharray="3 2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.7 }}
            />
            <motion.text
              x="44" y="28"
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "8px",
                fill: "var(--text-faint)",
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 1.0 }}
            >
              ?
            </motion.text>
          </svg>
        </div>

        <div
          className="text-[9px] tracking-[0.35em] px-3 py-1 rounded-sm"
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            color: "var(--accent)",
            background: "rgba(37,99,235,0.08)",
            border: "1px solid rgba(37,99,235,0.2)",
          }}
        >
          {section.toUpperCase()}
        </div>

        <h1
          className="text-3xl md:text-4xl font-bold leading-tight"
          style={{ color: "var(--text)", fontFamily: "'DM Sans', sans-serif" }}
        >
          {t('placeholder.route_not_yet')}
        </h1>

        <p
          className="text-[13px] max-w-[36ch] leading-relaxed"
          style={{ color: "var(--text-muted)" }}
        >
          {t('placeholder.this_leg_mapping')}{" "}
          <span style={{ color: "var(--text-faint)" }}>
            ({subtitle})
          </span>
        </p>

        <Link
          to="/browse"
          className="mt-2 text-[10px] tracking-widest transition-opacity"
          style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--accent)" }}
          onMouseEnter={e => (e.currentTarget.style.opacity = "0.65")}
          onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
        >
          {t('placeholder.back_to_browse')}
        </Link>
      </motion.div>
    </main>
  )
}