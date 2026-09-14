import { Outlet, useRouterState } from "@tanstack/react-router"

import { Footer } from "@/components/layout/Footer"
import { Nav } from "@/components/layout/Nav"
import { ScrollProgress } from "@/components/landing/ScrollProgress"
import { ViactorAppShell } from "@/components/landing/viactor/ViactorAppShell"

// Routes already speaking Viactor. Everything else keeps the old app
// chrome until its turn; the marketing landing brings its own.
const VIACTOR_PATHS = ["/browse", "/carry/new", "/need/new", "/listings", "/auth", "/profile", "/settings", "/verify", "/admin", "/my-listings", "/matches", "/messages"]

export function Layout() {
  // The marketing landing page brings its own nav and footer (and its own
  // light theme), so the app chrome would collide with it.
  const pathname = useRouterState({
    select: (s) => s.location.pathname,
  })
  const isMarketing = pathname === "/"

  if (isMarketing) {
    return <Outlet />
  }

  if (VIACTOR_PATHS.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return <ViactorAppShell />
  }

  return (
    <div className="min-h-dvh bg-bg text-text">
      <ScrollProgress />
      <Nav />
      <Outlet />
      <Footer />
    </div>
  )
}
