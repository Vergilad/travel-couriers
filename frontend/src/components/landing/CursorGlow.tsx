import { motion, useMotionTemplate, useMotionValue } from "framer-motion"
import * as React from "react"

import { usePointerPosition } from "@/hooks/use-pointer-position"

/** Cursor-following warm spotlight — hero only, desktop. */
export function CursorGlow() {
  const { x, y } = usePointerPosition(true)
  const glowX = useMotionValue(x)
  const glowY = useMotionValue(y)

  React.useEffect(() => {
    glowX.set(x)
    glowY.set(y)
  }, [x, y, glowX, glowY])

  const background = useMotionTemplate`radial-gradient(420px circle at ${glowX}px ${glowY}px, color-mix(in srgb, var(--accent) 14%, transparent), transparent 65%)`

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-[1] hidden md:block"
      style={{ background }}
    />
  )
}
