import { motion } from "framer-motion"

/** Stripe-inspired single hero motion: a route arc draws itself once on mount. */
export function RouteLineAnimation() {
  const path =
    "M 40 220 C 120 80, 200 320, 280 140 S 400 60, 460 180"

  return (
    <motion.svg
      viewBox="0 0 500 320"
      className="pointer-events-none h-[min(42vh,320px)] w-full max-w-[480px] text-accent"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.6, duration: 0.8 }}
      aria-hidden
    >
      <defs>
        <linearGradient id="routeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="var(--accent-dim)" />
          <stop offset="100%" stopColor="var(--accent)" />
        </linearGradient>
      </defs>

      <motion.path
        d={path}
        fill="none"
        stroke="url(#routeGrad)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="6 8"
        initial={{ pathLength: 0, opacity: 0.3 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1.8, delay: 0.9, ease: [0.22, 1, 0.36, 1] }}
      />

      <motion.circle
        r="6"
        fill="var(--accent)"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.3 }}
      >
        <animateMotion
          dur="2.4s"
          begin="1.1s"
          fill="freeze"
          calcMode="spline"
          keyTimes="0;1"
          keySplines="0.4 0 0.2 1"
        >
          <mpath href="#routeMotionPath" />
        </animateMotion>
      </motion.circle>

      <path id="routeMotionPath" d={path} fill="none" stroke="none" />

      <motion.text
        x="36"
        y="248"
        className="fill-[var(--text-muted)] font-mono text-[11px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4 }}
      >
        BAKU
      </motion.text>
      <motion.text
        x="420"
        y="168"
        className="fill-[var(--text-muted)] font-mono text-[11px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.2 }}
      >
        ISTANBUL
      </motion.text>
    </motion.svg>
  )
}
