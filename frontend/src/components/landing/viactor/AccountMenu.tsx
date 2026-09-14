/**
 * The account slot at the very right of the nav: a 32px square avatar that
 * opens a miniature menu (Profile, My listings, Settings, Sign out). One
 * component shared by the app nav and the marketing nav so the two never
 * drift. The name stays out of the bar entirely: a 20-char name used to
 * obliterate the row, a fixed square cannot.
 *
 * Desktop only (both navs hide this row below ~1080px and show their panel
 * instead), so the 32px target is a pointer control. No scroll listeners.
 */
import { useEffect, useRef, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";

import { useTranslation } from "@/i18n/I18nContext";
import { useAuth } from "@/lib/auth";

function initialOf(name: string): string {
  const first = name.trim().charAt(0);
  return first ? first.toUpperCase() : "?";
}

export function AccountMenu() {
  const { t } = useTranslation();
  const { user, unreadCount, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // The menu is a moment, not a place: route change closes it.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    function onPointer(e: PointerEvent) {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open ]);

  if (!user) return null;

  return (
    <div ref={box} style={{ position: "relative", display: "inline-flex" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={user.displayName}
        title={user.displayName}
        style={{
          width: 32,
          height: 32,
          padding: 0,
          cursor: "pointer",
          overflow: "hidden",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--face)",
          border: "var(--bw) solid var(--line)",
          borderRadius: "var(--radius-base)",
          color: "var(--face-ink)",
        }}
      >
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : (
          <span
            aria-hidden="true"
            style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 14 }}
          >
            {initialOf(user.displayName)}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 8px)",
            minWidth: 200,
            display: "grid",
            background: "var(--sheet)",
            border: "var(--bw) solid var(--line)",
            boxShadow: "var(--shadow)",
            zIndex: 60,
          }}
        >
          <Link
            to="/profile/$userId"
            params={{ userId: user.id }}
            role="menuitem"
            className="font-label field-row"
            style={{ padding: "12px 16px", textDecoration: "none", color: "var(--text)" }}
          >
            {t("navigation.profile")}
          </Link>
          <Link
            to="/messages"
            role="menuitem"
            className="font-label field-row"
            style={{
              padding: "12px 16px",
              textDecoration: "none",
              color: "var(--text)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            {t("navigation.messages")}
            {unreadCount > 0 && (
              <span
                aria-label={`${unreadCount} unread`}
                style={{
                  display: "inline-grid",
                  placeItems: "center",
                  minWidth: 20,
                  height: 20,
                  padding: "0 5px",
                  background: "var(--orange)",
                  color: "var(--on-fill)",
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                }}
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </Link>
          <Link
            to="/my-listings"
            role="menuitem"
            className="font-label field-row"
            style={{ padding: "12px 16px", textDecoration: "none", color: "var(--text)" }}
          >
            {t("myroutes.menu")}
          </Link>
          <Link
            to="/settings"
            role="menuitem"
            className="font-label field-row"
            style={{ padding: "12px 16px", textDecoration: "none", color: "var(--text)" }}
          >
            {t("navigation.settings")}
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => void signOut()}
            className="font-label field-row"
            style={{
              padding: "12px 16px",
              cursor: "pointer",
              background: "none",
              border: 0,
              textAlign: "left",
              color: "var(--text-muted)",
            }}
          >
            {t("marketing.nav.signout")}
          </button>
        </div>
      )}
    </div>
  );
}

export default AccountMenu;
