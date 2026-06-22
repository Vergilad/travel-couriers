import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"

import { slideInRight, staggerContainer } from "@/components/landing/motion"

const routes = [
  { from: "BAKU", to: "ISTANBUL", date: "Jul 15", price: "$25" },
  { from: "LONDON", to: "PARIS", date: "Jul 20", price: "€40" },
  { from: "DUBAI", to: "TBILISI", date: "Aug 01", price: "$35" },
]

export function HeroRoutePanel() {
  const [active, setActive] = React.useState(0)

  React.useEffect(() => {
    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % routes.length)
    }, 2800)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 32, rotateX: 8 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ type: "spring", stiffness: 70, damping: 18, delay: 1.1 }}
      style={{ perspective: 1200, transformStyle: "preserve-3d" }}
      className="hidden w-full max-w-[380px] lg:block"
    >
      <motion.div
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        className="border border-border bg-surface/80 backdrop-blur-md"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="font-label text-[11px] text-text-muted">Live departures</p>
          <motion.span
            className="size-1.5 rounded-full bg-accent"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          />
        </div>
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="relative divide-y divide-border"
        >
          {routes.map((route, index) => (
            <motion.div
              key={`${route.from}-${route.to}`}
              variants={slideInRight}
              className="relative grid grid-cols-[1fr_auto_auto] items-center gap-3 px-4 py-3"
            >
              <AnimatePresence>
                {active === index && (
                  <motion.span
                    layoutId="departure-highlight"
                    className="absolute inset-0 bg-accent/10"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.35 }}
                  />
                )}
              </AnimatePresence>
              <span className="relative font-data text-[12px] text-text">
                {route.from} → {route.to}
              </span>
              <span className="relative font-data text-[11px]">{route.date}</span>
              <span className="relative font-data text-[11px] text-accent">{route.price}</span>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </motion.div>
  )
}
