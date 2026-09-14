/**
 * Verified / Unverified rubber stamps.
 *
 * A stamp, not a chip: rotated ink text, double rule, transparent middle.
 * Fully inline styles on purpose: these render in Viactor pages and in the
 * old-chrome inbox alike, and only --success / --destructive exist in both
 * token scopes. VERIFIED stamps green, UNVERIFIED stamps red and slants the
 * other way so the two never read as the same mark at a glance.
 */

import type { CSSProperties } from "react"

interface BadgeProps {
  /** "md" for profile headers; "sm" (default) for standard spots; "xs" for inline/compact spots */
  size?: "sm" | "xs" | "md"
}

function stamp(color: string, tilt: string, size: "sm" | "xs" | "md"): CSSProperties {
  const xs = size === "xs"
  const md = size === "md"
  return {
    display: "inline-block",
    fontFamily: "var(--font-mono)",
    fontSize: xs ? 9 : md ? 13 : 11,
    fontWeight: 700,
    letterSpacing: "0.2em",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
    color,
    background: "transparent",
    border: xs ? `2px solid ${color}` : `3px double ${color}`,
    borderRadius: 0,
    padding: xs ? "1px 5px" : md ? "4px 12px 4px 14px" : "3px 10px 3px 12px",
    transform: `rotate(${tilt})`,
  }
}

export function VerifiedBadge({ size = "sm" }: BadgeProps) {
  return <span style={stamp("var(--success)", "-4deg", size)}>VERIFIED</span>
}

export function UnverifiedBadge({ size = "sm" }: BadgeProps) {
  return <span style={stamp("var(--destructive)", "3deg", size)}>! UNVERIFIED</span>
}
