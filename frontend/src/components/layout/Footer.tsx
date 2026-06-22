import { Link } from "@tanstack/react-router"
import { motion } from "framer-motion"

const links = [
  { to: "/browse" as const, label: "Browse" },
  { to: "/auth" as const, label: "Sign in" },
  { to: "/trips/new" as const, label: "Post a trip" },
  { href: "/#how-it-works", label: "How it works" },
]

export function Footer() {
  return (
    <motion.footer
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5 }}
      className="border-t border-border bg-surface px-6 py-12"
    >
      <div className="mx-auto max-w-[1200px]">
        <motion.p
          className="mb-6 text-[15px] text-text-muted"
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 5, repeat: Infinity }}
        >
          Travel Couriers — Move things across borders.
        </motion.p>
        <div className="mb-8 flex flex-wrap gap-x-6 gap-y-2">
          {links.map((link, index) => (
            <motion.div
              key={link.label}
              initial={{ opacity: 0, x: -8 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.06 }}
              whileHover={{ x: 4 }}
            >
              {"href" in link ? (
                <a
                  href={link.href}
                  className="group relative text-[14px] text-text-muted transition-colors hover:text-accent"
                >
                  {link.label}
                  <span className="absolute -bottom-0.5 left-0 h-px w-0 bg-accent transition-all duration-200 group-hover:w-full" />
                </a>
              ) : (
                <Link
                  to={link.to}
                  className="group relative text-[14px] text-text-muted transition-colors hover:text-accent"
                >
                  {link.label}
                  <span className="absolute -bottom-0.5 left-0 h-px w-0 bg-accent transition-all duration-200 group-hover:w-full" />
                </Link>
              )}
            </motion.div>
          ))}
        </div>
        <p className="text-[13px] text-text-faint">© 2026 Travel Couriers</p>
      </div>
    </motion.footer>
  )
}
