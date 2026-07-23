/**
 * VerifiedBadge / UnverifiedBadge — identity status pills.
 *
 * VerifiedBadge:   green ✓ VERIFIED  — identity_verified is true
 * UnverifiedBadge: red   ! UNVERIFIED — identity_verified is false
 *
 * Both use JetBrains Mono and Peregri design tokens.
 */

interface BadgeProps {
  /** "sm" (default) for profile headers; "xs" for inline/compact spots */
  size?: "sm" | "xs"
}

export function VerifiedBadge({ size = "sm" }: BadgeProps) {
  const xs = size === "xs"
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: xs ? 3 : 4,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: xs ? 9 : 10,
        letterSpacing: "0.15em",
        fontWeight: 600,
        color: "var(--success)",
        background: "rgba(34,197,94,0.10)",
        border: "1px solid rgba(34,197,94,0.22)",
        borderRadius: 2,
        padding: xs ? "1px 5px" : "2px 7px",
        whiteSpace: "nowrap",
      }}
    >
      <svg
        width={xs ? 8 : 9}
        height={xs ? 8 : 9}
        viewBox="0 0 9 9"
        fill="none"
        style={{ flexShrink: 0 }}
      >
        <polyline
          points="1.5,4.5 3.5,6.5 7.5,2.5"
          stroke="var(--success)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      VERIFIED
    </span>
  )
}

export function UnverifiedBadge({ size = "sm" }: BadgeProps) {
  const xs = size === "xs"
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: xs ? 3 : 4,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: xs ? 9 : 10,
        letterSpacing: "0.15em",
        fontWeight: 600,
        color: "var(--destructive)",
        background: "rgba(239,68,68,0.09)",
        border: "1px solid rgba(239,68,68,0.22)",
        borderRadius: 2,
        padding: xs ? "1px 5px" : "2px 7px",
        whiteSpace: "nowrap",
      }}
    >
      ! UNVERIFIED
    </span>
  )
}
