import { motion } from "framer-motion"

import { slideInRight, staggerContainer } from "@/components/landing/motion"

const routes = [
  { from: "BAKU", to: "ISTANBUL", date: "Jul 15", price: "$25" },
  { from: "LONDON", to: "PARIS", date: "Jul 20", price: "€40" },
  { from: "DUBAI", to: "TBILISI", date: "Aug 01", price: "$35" },
]

/** Linear-inspired floating departure board — lives in the hero right column. */
export function HeroRoutePanel() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 32, rotateX: 8 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ type: "spring", stiffness: 70, damping: 18, delay: 1.1 }}
      style={{ perspective: 1200, transformStyle: "preserve-3d" }}
      className="hidden w-full max-w-[380px] lg:block"
    >
      <div className="border border-border bg-surface/80 backdrop-blur-md">
        <div className="border-b border-border px-4 py-3">
          <p className="font-label text-[11px] text-text-muted">Live departures</p>
        </div>
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="divide-y divide-border"
        >
          {routes.map((route) => (
            <motion.div
              key={`${route.from}-${route.to}`}
              variants={slideInRight}
              className="grid grid-cols-[1fr_auto_auto] items-center gap-3 px-4 py-3"
            >
              <span className="font-data text-[12px] text-text">
                {route.from} → {route.to}
              </span>
              <span className="font-data text-[11px]">{route.date}</span>
              <span className="font-data text-[11px] text-accent">{route.price}</span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.div>
  )
}
