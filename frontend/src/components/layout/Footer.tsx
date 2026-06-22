import { Link } from "@tanstack/react-router"

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface px-6 py-12">
      <div className="mx-auto max-w-[1200px]">
        <p className="mb-6 text-[15px] text-text-muted">
          Travel Couriers — Move things across borders.
        </p>
        <div className="mb-8 flex flex-wrap gap-x-6 gap-y-2 text-[14px] text-text-muted">
          <Link to="/browse" className="transition-opacity hover:opacity-85">
            Browse
          </Link>
          <Link to="/auth" className="transition-opacity hover:opacity-85">
            Sign in
          </Link>
          <Link to="/trips/new" className="transition-opacity hover:opacity-85">
            Post a trip
          </Link>
          <a href="/#how-it-works" className="transition-opacity hover:opacity-85">
            How it works
          </a>
        </div>
        <p className="text-[13px] text-text-faint">© 2026 Travel Couriers</p>
      </div>
    </footer>
  )
}
