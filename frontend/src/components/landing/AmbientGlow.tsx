import { motion } from "framer-motion"

interface AmbientGlowProps {
  className?: string
  delay?: number
}

/** Vercel-style breathing gradient orb. */
export function AmbientGlow({ className, delay = 0 }: AmbientGlowProps) {
  return (
    <motion.div
      aria-hidden
      className={className}
      animate={{
        scale: [1, 1.12, 1],
        opacity: [0.35, 0.55, 0.35],
      }}
      transition={{
        duration: 7,
        repeat: Infinity,
        ease: "easeInOut",
        delay,
      }}
      style={{
        background: "color-mix(in srgb, var(--accent) 20%, transparent)",
        filter: "blur(80px)",
      }}
    />
  )
}
