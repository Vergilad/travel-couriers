import { Link } from "@tanstack/react-router"

// ─── Not Found (404) ────────────────────────────────────────────────────────
// Peregri motif: a route on the network map that goes nowhere — a waypoint
// dot with a dashed line trailing off into static. Matches the "GATE: ..."
// breadcrumb + JetBrains Mono numerics used across Create Listing / errors.

export function NotFoundPage() {
  return (
    <div
      className="min-h-screen pt-16 flex flex-col items-center justify-center text-center px-6"
      style={{ background: "var(--bg)" }}
    >
      <div
        className="flex items-center gap-1.5 mb-6 font-mono text-[11px] tracking-[0.2em]"
        style={{ color: "var(--accent)" }}
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--accent)" }} />
        GATE: UNKNOWN ROUTE
      </div>

      <svg width="180" height="72" viewBox="0 0 180 72" fill="none" className="mb-8">
        <line x1="8" y1="36" x2="86" y2="36" stroke="var(--border)" strokeWidth="1.5" />
        <line
          x1="94" y1="36" x2="172" y2="36"
          stroke="var(--accent)" strokeWidth="1.5" strokeDasharray="4 5" opacity="0.5"
        />
        <circle cx="8" cy="36" r="4" stroke="var(--text-faint)" strokeWidth="1.5" fill="var(--bg)" />
        <circle cx="90" cy="36" r="6" stroke="var(--accent)" strokeWidth="2" fill="var(--bg)">
          <animate attributeName="r" values="6;9;6" dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="1;0.4;1" dur="2s" repeatCount="indefinite" />
        </circle>
        <circle cx="90" cy="36" r="2.5" fill="var(--accent)" />
        <circle cx="172" cy="36" r="3.5" stroke="var(--destructive)" strokeWidth="1.5" fill="var(--bg)" strokeDasharray="2 2" />
        <line x1="166" y1="30" x2="178" y2="42" stroke="var(--destructive)" strokeWidth="1.5" />
        <line x1="178" y1="30" x2="166" y2="42" stroke="var(--destructive)" strokeWidth="1.5" />
      </svg>

      <div
        className="font-mono font-bold mb-4"
        style={{ fontSize: 72, color: "var(--text-faint)", letterSpacing: "-0.02em" }}
      >
        404
      </div>
      <h2 className="text-2xl font-bold mb-3" style={{ color: "var(--text)" }}>
        This waypoint doesn&apos;t exist
      </h2>
      <p className="text-sm mb-8 max-w-sm" style={{ color: "var(--text-muted)" }}>
        The route you&apos;re looking for isn&apos;t on the network — it may have been moved, or never existed.
      </p>

      <div className="flex items-center gap-3">
        <Link to="/browse">
          <button
            className="font-mono text-[11px] tracking-widest rounded-sm px-6 py-2.5 transition-colors"
            style={{ background: "var(--accent)", color: "#ffffff" }}
            onMouseEnter={e => { e.currentTarget.style.background = "var(--accent-dim)" }}
            onMouseLeave={e => { e.currentTarget.style.background = "var(--accent)" }}
          >
            BROWSE ROUTES →
          </button>
        </Link>
        <Link to="/">
          <button
            className="font-mono text-[11px] tracking-widest rounded-sm px-6 py-2.5 transition-colors"
            style={{ border: "1px solid var(--border)", color: "var(--text-muted)" }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = "rgba(37,99,235,0.4)"
              e.currentTarget.style.color = "var(--text)"
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = "var(--border)"
              e.currentTarget.style.color = "var(--text-muted)"
            }}
          >
            ← HOME
          </button>
        </Link>
      </div>
    </div>
  )
}
