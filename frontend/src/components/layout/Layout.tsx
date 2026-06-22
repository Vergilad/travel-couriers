import { Outlet } from "@tanstack/react-router"

import { Footer } from "@/components/layout/Footer"
import { Nav } from "@/components/layout/Nav"
import { ScrollProgress } from "@/components/landing/ScrollProgress"

export function Layout() {
  return (
    <div className="min-h-screen bg-bg text-text">
      <ScrollProgress />
      <Nav />
      <Outlet />
      <Footer />
    </div>
  )
}
