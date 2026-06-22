import { motion, type HTMLMotionProps } from "framer-motion"
import type { ReactNode } from "react"

interface SectionRevealProps extends HTMLMotionProps<"section"> {
  children: ReactNode
}

export function SectionReveal({ children, className, ...props }: SectionRevealProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{
        duration: 0.6,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.section>
  )
}
