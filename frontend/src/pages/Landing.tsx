import { Hero } from "@/components/landing/Hero"
import { HowItWorks } from "@/components/landing/HowItWorks"
import { LiveListings } from "@/components/landing/LiveListings"
import { Stats } from "@/components/landing/Stats"

export function LandingPage() {
  return (
    <main>
      <Hero />
      <Stats />
      <LiveListings />
      <HowItWorks />
    </main>
  )
}
