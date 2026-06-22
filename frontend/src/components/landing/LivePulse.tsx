import { motion } from "framer-motion"

export function LivePulse({ label = "Live" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="relative flex size-2">
        <motion.span
          aria-hidden
          className="absolute inline-flex size-full rounded-full bg-accent"
          animate={{ scale: [1, 2.2], opacity: [0.6, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
        />
        <span className="relative inline-flex size-2 rounded-full bg-accent" />
      </span>
      <span className="font-label text-[11px] text-accent">{label}</span>
    </span>
  )
}
