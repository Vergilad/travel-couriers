import * as React from "react"
import { Link, useLocation } from "@tanstack/react-router"
import { Menu, X } from "lucide-react"
import {
  animate,
  motion,
  AnimatePresence,
  useMotionValue,
  useScroll,
  useMotionValueEvent,
} from "framer-motion"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth"
import { getInitial } from "@/lib/db_constants"

// ─── Slide-in user drawer ────────────────────────────────────────────────────

function UserDrawer({
  user,
  unreadCount,
  signOut,
  open,
  onClose,
}: {
  user: { displayName: string; avatarUrl?: string }
  unreadCount: number
  signOut: () => void
  open: boolean
  onClose: () => void
}) {
  const navItems = [
    { to: "/browse", label: "Browse" },
    { to: "/my-listings", label: "My Listings" },
    { to: "/messages", label: "Messages", badge: unreadCount },
    { to: "/settings", label: "Settings" },
  ] as const

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Drawer panel */}
          <motion.div
            key="drawer"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.22, ease: "easeOut" }}
            className="fixed top-0 right-0 bottom-0 z-[70] w-[270px] bg-[#100D08] border-l border-[#2E2418] flex flex-col shadow-2xl"
          >
            {/* Close button */}
            <div className="flex items-center justify-end px-5 py-4 border-b border-[#1E1810]">
              <button
                onClick={onClose}
                className="flex size-8 items-center justify-center rounded-full text-[#8C7B68] hover:text-[#F4EDE4] hover:bg-[#1F1810] transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* User info */}
            <div className="px-6 py-5 border-b border-[#1E1810] flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#1A1208] border border-[#2E2418] flex items-center justify-center shrink-0 overflow-hidden">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.displayName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[#C8956A] text-base" style={{ fontFamily: "'DM Serif Display', serif" }}>
                    {getInitial(user.displayName)}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-[14px] text-[#F4EDE4] truncate">{user.displayName}</p>
                <p
                  className="text-[10px] text-[#8C7B68] tracking-widest mt-0.5"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  TRAVELER
                </p>
              </div>
            </div>

            {/* Nav links */}
            <nav className="flex-1 py-2 overflow-y-auto">
              {navItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className="flex items-center justify-between px-6 py-3.5 text-[14px] text-[#8C7B68] hover:text-[#F4EDE4] hover:bg-[#1A1208] transition-colors"
                >
                  {item.label}
                  {"badge" in item && item.badge > 0 && (
                    <span className="flex size-5 items-center justify-center rounded-full bg-[#C8956A] text-[#0E0B08] text-[10px] font-bold">
                      {item.badge}
                    </span>
                  )}
                </Link>
              ))}
            </nav>

            {/* Sign out */}
            <div className="px-6 py-5 border-t border-[#1E1810]">
              <button
                onClick={() => { onClose(); signOut() }}
                className="w-full text-left text-[14px] text-[#C47B6B] hover:text-[#E08070] transition-colors"
              >
                Sign out
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ─── Nav ─────────────────────────────────────────────────────────────────────

export function Nav() {
  const { user, unreadCount, loading, signOut } = useAuth()
  const location = useLocation()
  const isLanding = location.pathname === "/"
  const [scrolled, setScrolled] = React.useState(false)
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const [drawerOpen, setDrawerOpen] = React.useState(false)
  const { scrollY } = useScroll()
  const navBg = useMotionValue("rgba(14, 11, 8, 0)")

  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > 80)
  })

  const solid = !isLanding || scrolled

  React.useEffect(() => {
    animate(navBg, solid ? "rgba(14, 11, 8, 0.7)" : "rgba(14, 11, 8, 0)", { duration: 0.3 })
  }, [solid, navBg])

  React.useEffect(() => {
    setMobileOpen(false)
    setDrawerOpen(false)
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
            {[
              { to: "/browse", label: "Browse" },
              { href: "/#how-it-works", label: "How it works" },
            ].map((link) =>
              "href" in link ? (
                <motion.a
                  key={link.label}
                  href={link.href}
                  className="group relative text-[14px] font-normal text-text-muted"
                  whileHover={{ y: -1 }}
                >
                  {link.label}
                  <span className="absolute -bottom-1 left-0 h-px w-0 bg-accent transition-all duration-200 group-hover:w-full" />
                </motion.a>
              ) : (
                <motion.div key={link.label} whileHover={{ y: -1 }}>
                  <Link to={link.to} className="group relative text-[14px] font-normal text-text-muted">
                    {link.label}
                    <span className="absolute -bottom-1 left-0 h-px w-0 bg-accent transition-all duration-200 group-hover:w-full" />
                  </Link>
                </motion.div>
              )
            )}
          </div>

          <div className="hidden items-center gap-3 md:flex">
            {!loading && (
              user ? (
                <button
                  onClick={() => setDrawerOpen(true)}
                  className="relative flex size-9 items-center justify-center rounded-full bg-surface-raised text-sm text-text hover:bg-[#2E2418] transition-colors"
                >
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.displayName} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <span>{getInitial(user.displayName)}</span>
                  )}
                  {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-[#C8956A] text-[10px] font-bold text-[#0E0B08]">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>
              ) : (
                <>
                  <Link
                    to="/auth"
                    search={{
                      redirect: window.location.pathname,
                      mode: "signin",
                    }}
                  >
                    <Button variant="ghost">Sign in</Button>
                  </Link>
                  <Link to="/trips/new">
                    <Button>Post a trip</Button>
                  </Link>
                </>
              )
            )}
          </div>

          <button
            type="button"
            className="flex size-10 items-center justify-center text-text md:hidden"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileOpen((o) => !o)}
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </nav>
      </motion.header>

      {/* User drawer (desktop) */}
      {user && (
        <UserDrawer
          user={user}
          unreadCount={unreadCount}
          signOut={signOut}
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
        />
      )}

      {/* Mobile full-screen menu */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-bg/95 backdrop-blur-sm md:hidden">
          <div className="flex min-h-screen flex-col gap-6 px-6 pb-8 pt-24">
            <Link to="/browse" className="text-[18px] text-text">Browse</Link>
            <a href="/#how-it-works" className="text-[18px] text-text">How it works</a>
            {user && (
              <>
                <Link to="/my-listings" className="text-[18px] text-text">My Listings</Link>
                <div className="flex items-center gap-3">
                  <Link to="/messages" className="text-[18px] text-text">Messages</Link>
                  {unreadCount > 0 && (
                    <span className="flex size-5 items-center justify-center rounded-full bg-[#C8956A] text-[#0E0B08] text-[10px] font-bold">
                      {unreadCount}
                    </span>
                  )}
                </div>
                <Link to="/settings" className="text-[18px] text-text">Settings</Link>
              </>
            )}
            <div className="mt-auto flex flex-col gap-3">
              {user ? (
                <button onClick={signOut} className="text-left text-[#C47B6B] text-[14px]">Sign out</button>
              ) : (
                <>
                  <Link
                    to="/auth"
                    search={{
                      redirect: window.location.pathname,
                      mode: "signin",
                    }}
                  >
                    <Button variant="ghost" className="w-full">Sign in</Button>
                  </Link>
                  <Link to="/trips/new">
                    <Button className="w-full">Post a trip</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
