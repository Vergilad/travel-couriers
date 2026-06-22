import { Link } from "@tanstack/react-router"
import { motion } from "framer-motion"
import { ChevronDown } from "lucide-react"

import { DotGrid } from "@/components/landing/DotGrid"
import { HeroRoutePanel } from "@/components/landing/HeroRoutePanel"
import { fadeUpBlur, springSnappy, staggerContainer } from "@/components/landing/motion"
import { RouteLineAnimation } from "@/components/landing/RouteLineAnimation"
import { Button } from "@/components/ui/button"

const headlineWords = ["Your", "next", "trip", "carries", "more", "than", "luggage."]

export function Hero() {
  const wordCount = headlineWords.length
  const subtitleDelay = 0.1 + wordCount * 0.08 + 0.4
  const buttonsDelay = subtitleDelay + 0.3

  return (
    <section className="relative min-h-screen overflow-hidden">
      <motion.img
        src="/images/hero.jpg"
        alt=""
        initial={{ scale: 1.12, opacity: 0.6 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 2.2, ease: [0.22, 1, 0.36, 1] }}
        className="absolute inset-0 size-full object-cover object-[center_30%] saturate-[0.55]"
      />

      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to right, rgba(14,11,8,0.88) 0%, rgba(14,11,8,0.55) 50%, rgba(14,11,8,0.25) 100%)",
        }}
      />

      <DotGrid />

      {/* Warm accent glow — Railway-style, terracotta not purple */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 1.4 }}
        className="pointer-events-none absolute -right-24 top-1/3 h-[420px] w-[420px] rounded-full blur-[120px]"
        style={{ background: "color-mix(in srgb, var(--accent) 18%, transparent)" }}
      />

      <div className="relative mx-auto grid min-h-screen max-w-[1200px] items-center gap-12 px-6 pb-16 pt-24 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-16 lg:pl-[6%]">
        <div className="max-w-[600px]">
          <motion.p
            initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.5, delay: 0 }}
            className="font-label mb-6 text-[13px] tracking-[0.08em] text-text-muted"
          >
            Peer-to-peer courier network
          </motion.p>

          <motion.h1
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="mb-6 font-heading text-[clamp(3.5rem,7vw,6rem)] leading-[0.95] text-text"
          >
            {headlineWords.map((word, index) => (
              <motion.span
                key={`${word}-${index}`}
                variants={fadeUpBlur}
                className="mr-[0.26em] inline-block"
                style={
                  index >= 4
                    ? { color: "var(--accent)" }
                    : undefined
                }
              >
                {word}
              </motion.span>
            ))}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.45, delay: subtitleDelay }}
            className="mb-10 max-w-[420px] text-[17px] font-light leading-[1.7] text-text-muted"
          >
            Connect with travelers going your way. Send anything, earn on every trip.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springSnappy, delay: buttonsDelay }}
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

        <div className="relative hidden flex-col items-end gap-6 lg:flex">
          <RouteLineAnimation />
          <HeroRoutePanel />
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: buttonsDelay + 0.5, duration: 0.4 }}
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
