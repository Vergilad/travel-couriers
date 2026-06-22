import { motion } from "framer-motion"

import { LivePulse } from "@/components/landing/LivePulse"

const routes = [
  "BAKU → ISTANBUL",
  "LONDON → PARIS",
  "DUBAI → TBILISI",
  "AMSTERDAM → BERLIN",
  "TORONTO → LAGOS",
  "SINGAPORE → SYDNEY",
]

const doubled = [...routes, ...routes]

export function RouteTicker() {
  return (
    <div className="relative overflow-hidden border-y border-border bg-surface/40 py-3.5 backdrop-blur-sm">
      <motion.div
        className="flex w-max gap-12"
        animate={{ x: ["0%", "-50%"] }}
        transition={{
          duration: 28,
          repeat: Infinity,
          ease: "linear",
          repeatType: "loop",
        }}
      >
        {doubled.map((route, index) => (
          <motion.span
            key={`${route}-${index}`}
            className="whitespace-nowrap font-data text-[12px] text-text-muted"
            whileHover={{ color: "var(--accent)", scale: 1.05 }}
          >
            {route}
            <span className="mx-12 text-text-faint">·</span>
          </motion.span>
        ))}
      </motion.div>

      <div className="absolute right-6 top-1/2 hidden -translate-y-1/2 md:block">
        <LivePulse />
      </div>
    </div>
  )
}
