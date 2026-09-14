import * as React from "react"
import { Link, useLocation } from "@tanstack/react-router"
import { IconMenu2, IconRouteSquare2, IconX } from "@tabler/icons-react"
import {
  animate,
  motion,
  AnimatePresence,
  useMotionValue,
  useScroll,
  useMotionValueEvent,
} from "framer-motion"

import { useAuth } from "@/lib/auth"
import { getInitial } from "@/lib/db_constants"
import { LanguageSwitcher } from "@/components/LanguageSwitcher"
import { useTranslation } from "@/i18n/I18nContext"

const springConfig = { type: "spring" as const, stiffness: 400, damping: 30 }

// ─── Logomark ─────────────────────────────────────────────────────────────────
function Logomark({ className = "w-5 h-5" }: { className?: string }) {
  return <IconRouteSquare2 className={className} stroke={2} />
}

// ─── Slide-in user drawer ─────────────────────────────────────────────────────
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
  const { t } = useTranslation()
  const navItems = [
    { to: "/browse", label: t('navigation.browse') },
    { to: "/my-listings", label: t('navigation.my_listings') },
    { to: "/matches", label: t('navigation.matches') },
    { to: "/messages", label: t('navigation.messages'), badge: unreadCount },
    { to: "/settings", label: t('navigation.settings') },
  ] as const

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            key="drawer"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.22, ease: "easeOut" }}
            className="fixed top-0 right-0 bottom-0 z-[70] w-[270px] flex flex-col shadow-2xl"
            style={{
              background: "var(--surface)",
              borderLeft: "1px solid var(--border)",
            }}
          >
            {/* Close */}
            <div
              className="flex items-center justify-end px-5 py-4"
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              <button
                onClick={onClose}
                className="flex size-8 items-center justify-center rounded-sm transition-colors"
                style={{ color: "var(--text-muted)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text)"; (e.currentTarget as HTMLElement).style.background = "var(--surface-raised)" }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; (e.currentTarget as HTMLElement).style.background = "transparent" }}
              >
                <IconX size={16} stroke={2} />
              </button>
            </div>

            {/* User info */}
            <div
              className="px-6 py-5 flex items-center gap-3"
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              <div
                className="w-9 h-9 rounded-sm flex items-center justify-center shrink-0 overflow-hidden"
                style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}
              >
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.displayName} className="w-full h-full object-cover" />
                ) : (
                  <span
                    className="text-sm font-bold"
                    style={{ color: "var(--accent)", fontFamily: "var(--font-mono)" }}
                  >
                    {getInitial(user.displayName)}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-[14px] truncate" style={{ color: "var(--text)" }}>
                  {user.displayName}
                </p>
                <p
                  className="text-[10px] tracking-widest mt-0.5"
                  style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}
                >
                  {t('common.traveler')}
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
                  className="flex items-center justify-between px-6 py-3.5 text-[14px] transition-colors"
                  style={{ color: "var(--text-muted)" }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLElement
                    el.style.color = "var(--text)"
                    el.style.background = "var(--surface-raised)"
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLElement
                    el.style.color = "var(--text-muted)"
                    el.style.background = "transparent"
                  }}
                >
                  {item.label}
                  {"badge" in item && item.badge > 0 && (
                    <span
                      className="flex size-5 items-center justify-center rounded-full text-[10px] font-bold"
                      style={{ background: "var(--accent)", color: "#fff" }}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              ))}
            </nav>

            {/* Sign out */}
            <div className="px-6 py-5" style={{ borderTop: "1px solid var(--border)" }}>
              <button
                onClick={() => { onClose(); signOut() }}
                className="w-full text-left text-[14px] transition-colors"
                style={{ color: "var(--destructive)" }}
              >
                {t('common.sign_out')}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ─── Nav ──────────────────────────────────────────────────────────────────────
export function Nav() {
  const { t } = useTranslation()
  const { user, unreadCount, loading, signOut } = useAuth()
  const location = useLocation()
  const isLanding = location.pathname === "/"
  const [scrolled, setScrolled] = React.useState(false)
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const [drawerOpen, setDrawerOpen] = React.useState(false)
  const { scrollY } = useScroll()
  const navBg = useMotionValue("rgba(9, 9, 11, 0)")

  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > 60)
  })

  const solid = !isLanding || scrolled

  React.useEffect(() => {
    animate(navBg, solid ? "rgba(9, 9, 11, 0.85)" : "rgba(9, 9, 11, 0)", { duration: 0.3 })
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
          borderBottom: solid ? "1px solid rgba(39, 39, 42, 0.6)" : "1px solid transparent",
        }}
        className="fixed inset-x-0 top-0 z-50 h-16"
      >
        <nav className="mx-auto flex h-full max-w-[1200px] items-center justify-between px-6">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded-sm">
            <Logomark className="w-5 h-5 text-[var(--accent)]" />
            <span
              className="text-[15px] font-bold tracking-[0.12em]"
              style={{ fontFamily: "var(--font-mono)", color: "var(--text)" }}
            >
              PEREGRI
            </span>
          </Link>

          {/* Desktop right */}
          <div className="hidden items-center gap-2 md:flex">
            <LanguageSwitcher />
            {!loading && (
              user ? (
                <button
                  onClick={() => setDrawerOpen(true)}
                  className="relative flex size-9 items-center justify-center rounded-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                  style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}
                >
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.displayName} className="w-full h-full rounded-sm object-cover" />
                  ) : (
                    <span
                      className="text-xs font-bold"
                      style={{ fontFamily: "var(--font-mono)", color: "var(--text)" }}
                    >
                      {getInitial(user.displayName)}
                    </span>
                  )}
                  {unreadCount > 0 && (
                    <span
                      className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full text-[10px] font-bold"
                      style={{ background: "var(--accent)", color: "#fff" }}
                    >
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>
              ) : (
                <>
                  <Link
                    to="/browse"
                    className="px-4 py-2 text-[12px] font-bold tracking-widest transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                    style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}
                    onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.color = "var(--text)"}
                    onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"}
                  >
                    {t('common.browse')}
                  </Link>
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} transition={springConfig}>
                    <Link
                      to="/auth"
                      search={{ redirect: "/", mode: "signup" as any }}
                      className="inline-flex items-center px-5 py-2 text-[11px] font-bold tracking-widest rounded-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-dim)]"
                      style={{
                        fontFamily: "var(--font-mono)",
                        background: "var(--accent)",
                        color: "#fff",
                        boxShadow: "0 0 16px rgba(59,130,246,0.25)",
                      }}
                      onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.boxShadow = "0 0 24px rgba(59,130,246,0.45)"}
                      onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.boxShadow = "0 0 16px rgba(59,130,246,0.25)"}
                    >
                      {t('common.sign_up')}
                    </Link>
                  </motion.div>
                </>
              )
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            type="button"
            className="flex size-10 items-center justify-center rounded-sm md:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            style={{ color: "var(--text)" }}
            aria-label={mobileOpen ? t('common.close_menu') : t('common.open_menu')}
            onClick={() => setMobileOpen((o) => !o)}
          >
            {mobileOpen ? <IconX size={20} stroke={2} /> : <IconMenu2 size={20} stroke={2} />}
          </button>
        </nav>
      </motion.header>

      {/* User drawer */}
      {user && (
        <UserDrawer
          user={user}
          unreadCount={unreadCount}
          signOut={signOut}
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
        />
      )}

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-x-0 top-16 z-40 md:hidden"
            style={{
              background: "rgba(9, 9, 11, 0.97)",
              backdropFilter: "blur(16px)",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <div className="flex flex-col gap-0 px-6 py-4">
              <Link
                to="/browse"
                className="py-4 text-[15px] transition-colors"
                style={{ color: "var(--text)", borderBottom: "1px solid var(--border)" }}
                onClick={() => setMobileOpen(false)}
              >
                {t('navigation.browse')}
              </Link>
              {user ? (
                <>
                  <Link
                    to="/my-listings"
                    className="py-4 text-[15px] transition-colors"
                    style={{ color: "var(--text)", borderBottom: "1px solid var(--border)" }}
                    onClick={() => setMobileOpen(false)}
                  >
                    {t('navigation.my_listings')}
                  </Link>
                  <Link
                    to="/messages"
                    className="py-4 text-[15px] flex items-center gap-3 transition-colors"
                    style={{ color: "var(--text)", borderBottom: "1px solid var(--border)" }}
                    onClick={() => setMobileOpen(false)}
                  >
                    {t('navigation.messages')}
                    {unreadCount > 0 && (
                      <span
                        className="flex size-5 items-center justify-center rounded-full text-[10px] font-bold"
                        style={{ background: "var(--accent)", color: "#fff" }}
                      >
                        {unreadCount}
                      </span>
                    )}
                  </Link>
                  <Link
                    to="/matches"
                    className="py-4 text-[15px] transition-colors"
                    style={{ color: "var(--text)", borderBottom: "1px solid var(--border)" }}
                    onClick={() => setMobileOpen(false)}
                  >
                    Matches
                  </Link>
                  <Link
                    to="/settings"
                    className="py-4 text-[15px] transition-colors"
                    style={{ color: "var(--text)", borderBottom: "1px solid var(--border)" }}
                    onClick={() => setMobileOpen(false)}
                  >
                    {t('navigation.settings')}
                  </Link>
                  <button
                    onClick={() => { setMobileOpen(false); signOut() }}
                    className="py-4 text-left text-[15px] transition-colors"
                    style={{ color: "var(--destructive)" }}
                  >
                    {t('common.sign_out')}
                  </button>
                </>
              ) : (
                <div className="flex flex-col gap-3 pt-4">
                  <Link
                    to="/auth"
                    search={{ redirect: "/", mode: "signin" as any }}
                    className="py-3 text-center text-[12px] font-bold tracking-widest rounded-sm border transition-colors"
                    style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)", borderColor: "var(--border)" }}
                    onClick={() => setMobileOpen(false)}
                  >
                    {t('common.sign_in')}
                  </Link>
                  <Link
                    to="/auth"
                    search={{ redirect: "/", mode: "signup" as any }}
                    className="py-3 text-center text-[12px] font-bold tracking-widest rounded-sm transition-colors"
                    style={{ fontFamily: "var(--font-mono)", background: "var(--accent)", color: "#fff" }}
                    onClick={() => setMobileOpen(false)}
                  >
                    {t('common.sign_up')}
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
