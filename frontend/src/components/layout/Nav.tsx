import * as React from "react"
import { Link, useLocation } from "@tanstack/react-router"
import { Menu, X } from "lucide-react"
import {
  animate,
  motion,
  useMotionValue,
  useScroll,
  useMotionValueEvent,
} from "framer-motion"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth"

export function Nav() {
  const { user, unreadCount } = useAuth()
  const location = useLocation()
  const isLanding = location.pathname === "/"
  const [scrolled, setScrolled] = React.useState(false)
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const { scrollY } = useScroll()
  const navBg = useMotionValue("rgba(14, 11, 8, 0)")

  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > 80)
  })

  const solid = !isLanding || scrolled

  React.useEffect(() => {
    animate(navBg, solid ? "rgba(14, 11, 8, 0.7)" : "rgba(14, 11, 8, 0)", {
      duration: 0.3,
    })
  }, [solid, navBg])

  React.useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  return (
    <>
      <motion.header
        style={{
          backgroundColor: navBg,
          backdropFilter: solid ? "blur(16px)" : "none",
          WebkitBackdropFilter: solid ? "blur(16px)" : "none",
          borderBottom: solid ? "1px solid rgba(46, 36, 24, 0.6)" : "1px solid transparent",
        }}
        className="fixed inset-x-0 top-0 z-50 h-16"
      >
        <nav className="mx-auto flex h-full max-w-[1200px] items-center justify-between px-6">
          <Link to="/" className="font-heading text-[18px] leading-none text-text">
            Travel Couriers
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            <Link
              to="/browse"
              className="text-[14px] font-normal text-text-muted transition-opacity hover:opacity-85"
            >
              Browse
            </Link>
            <a
              href="/#how-it-works"
              className="text-[14px] font-normal text-text-muted transition-opacity hover:opacity-85"
            >
              How it works
            </a>
          </div>

          <div className="hidden items-center gap-3 md:flex">
            {user ? (
              <Link to="/messages" className="relative">
                <span className="flex size-9 items-center justify-center rounded-full bg-surface-raised text-sm text-text">
                  {user.displayName.charAt(0).toUpperCase()}
                </span>
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-accent text-[10px] text-bg">
                    {unreadCount}
                  </span>
                )}
              </Link>
            ) : (
              <>
                <Link to="/auth">
                  <Button variant="ghost">Sign in</Button>
                </Link>
                <Link to="/trips/new">
                  <Button>Post a trip</Button>
                </Link>
              </>
            )}
          </div>

          <button
            type="button"
            className="flex size-10 items-center justify-center text-text md:hidden"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileOpen((open) => !open)}
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </nav>
      </motion.header>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-bg/95 backdrop-blur-sm md:hidden">
          <div className="flex min-h-screen flex-col gap-6 px-6 pb-8 pt-24">
            <Link to="/browse" className="text-[18px] text-text">
              Browse
            </Link>
            <a href="/#how-it-works" className="text-[18px] text-text">
              How it works
            </a>
            <div className="mt-auto flex flex-col gap-3">
              <Link to="/auth">
                <Button variant="ghost" className="w-full">
                  Sign in
                </Button>
              </Link>
              <Link to="/trips/new">
                <Button className="w-full">Post a trip</Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
