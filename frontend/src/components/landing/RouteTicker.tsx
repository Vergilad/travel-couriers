import { motion } from "framer-motion"

const routes = [
  "BAKU → ISTANBUL",
  "LONDON → PARIS",
  "DUBAI → TBILISI",
  "AMSTERDAM → BERLIN",
  "TORONTO → LAGOS",
  "SINGAPORE → SYDNEY",
]

const doubled = [...routes, ...routes]

/** Live marketplace strip — sits between hero and stats. */
export function RouteTicker() {
  return (
    <div className="overflow-hidden border-y border-border py-3.5">
      <motion.div
        className="flex w-max gap-12"
        animate={{ x: ["0%", "-50%"] }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "linear",
          repeatType: "loop",
        }}
      >
        {doubled.map((route, index) => (
          <span
            key={`${route}-${index}`}
            className="whitespace-nowrap font-data text-[12px] text-text-muted"
          >
            {route}
            <span className="mx-12 text-text-faint">·</span>
          </span>
        ))}
      </motion.div>
    </div>
  )
}
