import { motion } from "framer-motion"

export function DotGrid() {
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute inset-0"
      initial={{ opacity: 0 }}
      animate={{
        opacity: 1,
        backgroundPosition: ["0px 0px", "28px 28px"],
      }}
      transition={{
        opacity: { duration: 1.2, delay: 0.3 },
        backgroundPosition: { duration: 18, repeat: Infinity, ease: "linear" },
      }}
      style={{
        backgroundImage:
          "radial-gradient(circle, color-mix(in srgb, var(--border) 80%, transparent) 1px, transparent 1px)",
        backgroundSize: "28px 28px",
        maskImage:
          "linear-gradient(to right, black 0%, black 45%, transparent 85%)",
      }}
    />
  )
}
