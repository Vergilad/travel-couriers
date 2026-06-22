import { motion } from "framer-motion"

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
    <section id="how-it-works" className="px-6 py-24 md:py-32">
      <div className="mx-auto max-w-[1200px]">
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.25 }}
          className="mb-16 font-heading text-[clamp(2rem,4vw,2.5rem)] text-text"
        >
          How it works
        </motion.h2>

        <div className="grid gap-16 md:grid-cols-3 md:gap-8">
          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.25, delay: index * 0.15 }}
              className="relative"
            >
              <div
                aria-hidden
                className="pointer-events-none mb-4 font-heading text-[8rem] leading-none text-border"
              >
                {step.number}
              </div>
              <h3 className="mb-3 font-heading text-[1.5rem] text-text">{step.title}</h3>
              <p className="max-w-[28ch] text-[15px] font-light leading-[1.7] text-text-muted">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
