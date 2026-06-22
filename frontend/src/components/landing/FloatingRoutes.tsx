import { motion } from "framer-motion"

const GHOST_ROUTES = [
  "TYO → SEL",
  "BER → AMS",
  "LAG → LON",
  "SIN → DXB",
  "PAR → ROM",
  "NYC → MEX",
]

/** Drifting mono route codes in hero background. */
export function FloatingRoutes() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {GHOST_ROUTES.map((route, index) => (
        <motion.span
          key={route}
          className="absolute font-data text-[11px] text-text-faint/40"
          style={{
            left: `${8 + index * 14}%`,
            top: `${12 + (index % 3) * 28}%`,
          }}
          animate={{
            y: [0, -18, 0],
            opacity: [0.15, 0.35, 0.15],
          }}
          transition={{
            duration: 6 + index * 0.8,
            repeat: Infinity,
            ease: "easeInOut",
            delay: index * 0.5,
          }}
        >
          {route}
        </motion.span>
      ))}
    </div>
  )
}
