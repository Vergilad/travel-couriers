import * as React from "react"
import { motion, useInView } from "framer-motion"

import { fadeUpBlur, staggerContainer } from "@/components/landing/motion"

const stats = [
  { value: 1200, suffix: "+", label: "Active couriers" },
  { value: 48, suffix: "", label: "Countries covered" },
  { value: 4.9, suffix: "★", label: "Average rating", decimals: 1 },
  { value: 3400, suffix: "+", label: "Deliveries completed" },
]

function useCountUp(
  target: number,
  active: boolean,
  duration = 1400,
  decimals = 0
) {
  const [value, setValue] = React.useState(0)

  React.useEffect(() => {
    if (!active) return

    let frame = 0
    const start = performance.now()

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const next = target * eased
      setValue(decimals > 0 ? Number(next.toFixed(decimals)) : Math.round(next))
      if (progress < 1) frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [active, target, duration, decimals])

  return value
}

function StatItem({
  value,
  suffix,
  label,
  decimals = 0,
}: {
  value: number
  suffix: string
  label: string
  decimals?: number
}) {
  const ref = React.useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: "-80px" })
  const count = useCountUp(value, inView, 1400, decimals)

  return (
    <motion.div ref={ref} variants={fadeUpBlur} className="text-center md:text-left">
      <div className="font-heading text-[3rem] leading-none text-text">
        {decimals > 0 ? count.toFixed(decimals) : count.toLocaleString()}
        <span className="text-accent">{suffix}</span>
      </div>
      <p className="mt-2 font-label text-[13px] text-text-muted">{label}</p>
    </motion.div>
  )
}

export function Stats() {
  return (
    <section className="px-6 py-24 md:py-32">
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
        className="mx-auto grid max-w-[1200px] gap-12 sm:grid-cols-2 lg:grid-cols-4"
      >
        {stats.map((stat) => (
          <StatItem key={stat.label} {...stat} />
        ))}
      </motion.div>
    </section>
  )
}
