import { motion, useInView } from "framer-motion"
import * as React from "react"

const steps = [
  {
    number: "01",
    title: "Post your journey",
    description: "Going somewhere? List your route, dates, and how much you can carry.",
  },
  {
    number: "02",
    title: "Connect and agree",
    description: "Chat with senders. Confirm the deal. Both parties lock it in.",
  },
  {
    number: "03",
    title: "Carry, deliver, earn",
    description: "Make the trip. Get paid. Leave a review.",
  },
]

export function HowItWorks() {
  const lineRef = React.useRef<HTMLDivElement>(null)
  const inView = useInView(lineRef, { margin: "-80px" })

  return (
    <div id="how-it-works" className="relative px-6 py-24 md:py-32">
      <div className="mx-auto max-w-[1200px]">
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          className="mb-16 font-heading text-[clamp(2rem,4vw,2.5rem)] text-text"
        >
          How it works
        </motion.h2>

        <div ref={lineRef} className="relative">
          <motion.div
            aria-hidden
            className="absolute left-[16.666%] right-[16.666%] top-[4.5rem] hidden h-px origin-left bg-border md:block"
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
          />

          {inView && (
            <motion.div
              aria-hidden
              className="absolute top-[4.47rem] hidden size-2 rounded-full bg-accent md:block"
              style={{ left: "16.666%" }}
              animate={{ left: ["16.666%", "50%", "83.333%"] }}
              transition={{
                duration: 5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          )}

          <div className="grid gap-16 md:grid-cols-3 md:gap-8">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                whileHover={{ y: -6 }}
                transition={{
                  type: "spring",
                  stiffness: 80,
                  damping: 20,
                  delay: index * 0.15,
                }}
                className="relative"
              >
                <motion.div
                  aria-hidden
                  initial={{ scale: 0.85, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  animate={
                    inView
                      ? {
                          opacity: [0.35, 0.55, 0.35],
                        }
                      : undefined
                  }
                  transition={{
                    scale: {
                      type: "spring",
                      stiffness: 120,
                      damping: 16,
                      delay: index * 0.12,
                    },
                    opacity: { duration: 4, repeat: Infinity, delay: index * 0.6 },
                  }}
                  className="pointer-events-none mb-4 origin-left font-heading text-[8rem] leading-none text-border"
                >
                  {step.number}
                </motion.div>
                <h3 className="mb-3 font-heading text-[1.5rem] text-text">{step.title}</h3>
                <p className="max-w-[28ch] text-[15px] font-light leading-[1.7] text-text-muted">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
