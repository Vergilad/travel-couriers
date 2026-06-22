import { Outlet } from "@tanstack/react-router"

import { Footer } from "@/components/layout/Footer"
import { Nav } from "@/components/layout/Nav"

export function Layout() {
  return (
    <div className="min-h-screen bg-bg text-text">
      <Nav />
      <Outlet />
      <Footer />
    </div>
  )
}
