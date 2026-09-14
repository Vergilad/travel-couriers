import { Link } from "@tanstack/react-router"
import { motion } from "framer-motion"
import { IconRouteSquare2 } from "@tabler/icons-react"

const links = [
  { to: "/browse" as const, label: "Browse" },
  { to: "/auth" as const, label: "Sign in" },
  { href: "/#how-it-works", label: "How it works" },
]

export function Footer() {
  return (
    <motion.footer
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4 }}
      className="px-6 py-12"
      style={{
        background: "var(--surface)",
        borderTop: "1px solid var(--border)",
      }}
    >
      <div className="mx-auto max-w-[1200px]">
        {/* Brand */}
        <div className="flex items-center gap-2.5 mb-6">
          <IconRouteSquare2 size={16} stroke={2} style={{ color: "var(--accent)" }} />
          <span
            className="text-[13px] font-bold tracking-[0.12em]"
            style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}
          >
            PEREGRI
          </span>
        </div>

        <p
          className="mb-6 text-[13px] leading-relaxed max-w-sm"
          style={{ color: "var(--text-muted)" }}
        >
          Move things across borders. A peer-to-peer logistics marketplace connecting travelers with deliveries.
        </p>

        {/* Links */}
        <div className="mb-8 flex flex-wrap gap-x-6 gap-y-2">
          {links.map((link, index) => (
            <motion.div
              key={link.label}
              initial={{ opacity: 0, x: -6 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ x: 3 }}
            >
              {"href" in link ? (
                <a
                  href={link.href}
                  className="text-[13px] transition-colors"
                  style={{ color: "var(--text-faint)" }}
                  onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"}
                  onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.color = "var(--text-faint)"}
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  to={link.to}
                  className="text-[13px] transition-colors"
                  style={{ color: "var(--text-faint)" }}
                  onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"}
                  onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.color = "var(--text-faint)"}
                >
                  {link.label}
                </Link>
              )}
            </motion.div>
          ))}
        </div>

        {/* Divider */}
        <div className="w-full h-px mb-6" style={{ background: "var(--border)" }} />

        <p
          className="text-[11px] tracking-widest"
          style={{ fontFamily: "var(--font-mono)", color: "var(--text-faint)" }}
        >
          © 2026 PEREGRI
        </p>
      </div>
    </motion.footer>
  )
}
