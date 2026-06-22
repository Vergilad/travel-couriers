import { Link } from "@tanstack/react-router"
import { motion, useScroll, useTransform } from "framer-motion"
import { ChevronDown } from "lucide-react"

import { AmbientGlow } from "@/components/landing/AmbientGlow"
import { CursorGlow } from "@/components/landing/CursorGlow"
import { DotGrid } from "@/components/landing/DotGrid"
import { FloatingRoutes } from "@/components/landing/FloatingRoutes"
import { HeroRoutePanel } from "@/components/landing/HeroRoutePanel"
import { Magnetic } from "@/components/landing/Magnetic"
import { RouteLineAnimation } from "@/components/landing/RouteLineAnimation"
import { Button } from "@/components/ui/button"

const headlineWords = ["Your", "next", "trip", "carries", "more", "than", "luggage."]
const headlineEndDelay = 0.09 * (headlineWords.length - 1) + 0.7

export function Hero() {
  const { scrollY } = useScroll()
  const contentY = useTransform(scrollY, [0, 500], [0, 80])
  const contentOpacity = useTransform(scrollY, [0, 420], [1, 0])
  const imageScale = useTransform(scrollY, [0, 600], [1, 1.08])

  return (
    <section className="relative min-h-screen overflow-hidden">
      <motion.div className="absolute inset-0 overflow-hidden" style={{ scale: imageScale }}>
        <motion.img
          src="/images/hero.jpg"
          alt=""
          initial={{ scale: 1.12, opacity: 0.6 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 2.2, ease: [0.22, 1, 0.36, 1] }}
          className="size-full object-cover object-[center_30%] saturate-[0.7]"
        />
      </motion.div>

      <div
        className="absolute inset-0 z-[1]"
        style={{
          background:
            "linear-gradient(105deg, rgba(14, 11, 8, 0.92) 0%, rgba(14, 11, 8, 0.75) 35%, rgba(14, 11, 8, 0.3) 65%, rgba(14, 11, 8, 0.05) 100%)",
        }}
      />

      <div
        className="absolute inset-x-0 bottom-0 z-[1] h-[45%]"
        style={{
          background:
            "linear-gradient(to top, rgba(14, 11, 8, 1) 0%, rgba(14, 11, 8, 0) 40%)",
        }}
      />

      <DotGrid />
      <FloatingRoutes />
      <CursorGlow />

      <AmbientGlow
        className="pointer-events-none absolute -right-32 top-1/4 h-[480px] w-[480px] rounded-full"
        delay={0}
      />
      <AmbientGlow
        className="pointer-events-none absolute -left-20 bottom-1/4 h-[320px] w-[320px] rounded-full"
        delay={2.5}
      />

      <motion.div
        style={{ y: contentY, opacity: contentOpacity }}
        className="relative z-[2] mx-auto grid min-h-screen max-w-[1200px] items-center gap-12 px-6 pb-16 pt-24 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-16 lg:pl-[6%]"
      >
        <div className="max-w-[600px]">
          <motion.p
            initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.5, delay: 0 }}
            className="font-label mb-6 text-[13px] tracking-[0.08em] text-text-muted"
          >
            Peer-to-peer courier network
          </motion.p>

          <h1 className="mb-6 font-heading text-[clamp(3.5rem,7vw,6rem)] leading-[0.95] text-text">
            {headlineWords.map((word, index) => (
              <motion.span
                key={`${word}-${index}`}
                initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                whileHover={{
                  y: -3,
                  color: index >= 4 ? "var(--accent)" : "var(--text)",
                  transition: { type: "spring", stiffness: 400, damping: 18 },
                }}
                transition={{
                  duration: 0.7,
                  delay: index * 0.09,
                  ease: [0.25, 0.46, 0.45, 0.94],
                }}
                className="mr-[0.26em] inline-block cursor-default"
                style={index >= 4 ? { color: "var(--accent)" } : undefined}
              >
                {word}
              </motion.span>
            ))}
          </h1>

          <motion.p
            initial={{ clipPath: "inset(0 100% 0 0)", opacity: 0.3 }}
            animate={{ clipPath: "inset(0 0% 0 0)", opacity: 1 }}
            transition={{
              duration: 0.9,
              delay: headlineEndDelay,
              ease: [0.76, 0, 0.24, 1],
            }}
            className="mb-10 max-w-[420px] text-[17px] font-light leading-[1.7] text-text-muted"
          >
            Connect with travelers going your way. Send anything, earn on every trip.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.5,
              delay: headlineEndDelay + 0.35,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
            className="flex flex-wrap gap-4"
          >
            <Magnetic>
              <Link to="/browse">
                <Button size="lg">Explore listings</Button>
              </Link>
            </Magnetic>
            <Magnetic strength={0.18}>
              <Link to="/trips/new">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-[rgba(244,237,228,0.25)] bg-[rgba(244,237,228,0.05)] text-text backdrop-blur-[8px] hover:bg-[rgba(244,237,228,0.08)]"
                >
                  Post a trip
                </Button>
              </Link>
            </Magnetic>
          </motion.div>
        </div>

        <div className="relative hidden flex-col items-end gap-6 lg:flex">
          <RouteLineAnimation />
          <HeroRoutePanel />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: headlineEndDelay + 0.8, duration: 0.4 }}
        className="absolute bottom-8 left-1/2 z-[2] -translate-x-1/2 text-text-muted"
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
