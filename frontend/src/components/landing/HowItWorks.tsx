import { motion } from "framer-motion"

import { scrollReveal } from "@/components/landing/motion"

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
  return (
    <div id="how-it-works" className="relative px-6 py-24 md:py-32">
      <div className="mx-auto max-w-[1200px]">
        <motion.h2
          variants={scrollReveal}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="mb-16 font-heading text-[clamp(2rem,4vw,2.5rem)] text-text"
        >
          How it works
        </motion.h2>

        <div className="relative">
          {/* Monograph-style connector line — draws on scroll */}
          <motion.div
            aria-hidden
            className="absolute left-[16.666%] right-[16.666%] top-[4.5rem] hidden h-px origin-left bg-border md:block"
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
          />

          <div className="grid gap-16 md:grid-cols-3 md:gap-8">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
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
                  transition={{
                    type: "spring",
                    stiffness: 120,
                    damping: 16,
                    delay: index * 0.12,
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
