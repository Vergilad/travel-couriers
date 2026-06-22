import { Link } from "@tanstack/react-router"
import { motion } from "framer-motion"
import { ChevronDown } from "lucide-react"

import { Button } from "@/components/ui/button"

const headlineWords = ["Your", "next", "trip", "carries", "more", "than", "luggage."]

export function Hero() {
  const wordCount = headlineWords.length
  const subtitleDelay = 0.1 + wordCount * 0.08 + 0.4
  const buttonsDelay = subtitleDelay + 0.3

  return (
    <section className="relative min-h-screen overflow-hidden">
      <img
        src="/images/hero.jpg"
        alt=""
        className="absolute inset-0 size-full object-cover object-center saturate-[0.6]"
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to right, rgba(14,11,8,0.85) 0%, rgba(14,11,8,0.4) 60%, rgba(14,11,8,0.1) 100%)",
        }}
      />
      <div className="relative mx-auto flex min-h-screen max-w-[1200px] items-center px-6 pb-16 pt-24 md:pl-[8%]">
        <div className="max-w-[600px]">
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0 }}
            className="font-label mb-6 text-[13px] tracking-[0.08em] text-text-muted"
          >
            Peer-to-peer courier network
          </motion.p>

          <h1 className="mb-6 font-heading text-[clamp(3.5rem,7vw,6rem)] leading-[1] text-text">
            {headlineWords.map((word, index) => (
              <motion.span
                key={`${word}-${index}`}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 260,
                  damping: 24,
                  delay: 0.1 + index * 0.08,
                }}
                className="mr-[0.28em] inline-block"
              >
                {word}
              </motion.span>
            ))}
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: subtitleDelay }}
            className="mb-10 max-w-[420px] text-[17px] font-light leading-[1.7] text-text-muted"
          >
            Connect with travelers going your way. Send anything, earn on every trip.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: buttonsDelay }}
            className="flex flex-wrap gap-4"
          >
            <Link to="/browse">
              <Button size="lg">Explore listings</Button>
            </Link>
            <Link to="/trips/new">
              <Button size="lg" variant="outline">
                Post a trip
              </Button>
            </Link>
          </motion.div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: buttonsDelay + 0.4, duration: 0.4 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-text-muted"
        aria-hidden
      >
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        >
          <ChevronDown className="size-5" />
        </motion.div>
      </motion.div>
    </section>
  )
}
