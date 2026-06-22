import { Hero } from "@/components/landing/Hero"
import { HowItWorks } from "@/components/landing/HowItWorks"
import { LiveListings } from "@/components/landing/LiveListings"
import { RouteTicker } from "@/components/landing/RouteTicker"
import { SectionReveal } from "@/components/landing/SectionReveal"
import { Stats } from "@/components/landing/Stats"

export function LandingPage() {
  return (
    <main>
      <Hero />
      <RouteTicker />
      <SectionReveal>
        <Stats />
      </SectionReveal>
      <SectionReveal>
        <LiveListings />
      </SectionReveal>
      <SectionReveal>
        <HowItWorks />
      </SectionReveal>
    </main>
  )
}
