import { motion } from "framer-motion"

import { Hero } from "@/components/landing/Hero"
import { HowItWorks } from "@/components/landing/HowItWorks"
import { LiveListings } from "@/components/landing/LiveListings"
import { Stats } from "@/components/landing/Stats"

export function LandingPage() {
  return (
    <motion.main
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <Hero />
      <Stats />
      <LiveListings />
      <HowItWorks />
    </motion.main>
  )
}
