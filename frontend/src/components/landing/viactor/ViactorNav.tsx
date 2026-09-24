/**
 * Marketing nav. One line at desktop, 64px tall, collapsing to a disclosure
 * below 900px. The wordmark is Geologica at maximum Sharpness, the same family
 * as every heading, so there is no second typeface on the page.
 *
 * Links go to the marketing pages (Browse, How it works, Safety) as routes.
 * They used to be in-page anchors with a scroll-spy; once How it works and
 * Safety moved onto their own routes the anchors had nothing to point at.
 */
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { IconMenu2, IconMoon, IconSun, IconX } from "@tabler/icons-react";

import { useTranslation } from "@/i18n/I18nContext";
import { useLanguage } from "@/i18n/useLanguage";
import { useAuth } from "@/lib/auth";
import { AccountMenu } from "@/components/landing/viactor/AccountMenu";
import type { ColorMode } from "@/hooks/use-color-mode";

/**
 * How it works and Safety are their own pages now, so the nav links are
 * routes rather than in-page anchors, and there is nothing to scroll-spy.
 */
function LangToggle() {
  const { currentLanguage, changeLanguage } = useLanguage();

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      {(["en", "ru"] as const).map((code, index) => (
        <span key={code} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          {index === 1 && <span aria-hidden="true" style={{ opacity: 0.4 }}>/</span>}
          <button
            type="button"
            className="font-label"
            onClick={() => changeLanguage(code)}
            aria-pressed={currentLanguage === code}
            style={{
              cursor: "pointer",
              background: "none",
              border: 0,
              padding: 0,
              color: currentLanguage === code ? "var(--text)" : "var(--text-muted)",
            }}
          >
            {code.toUpperCase()}
          </button>
        </span>
      ))}
    </div>
  );
}

export function ViactorNav({
  mode,
  onToggleMode,
}: {
  mode: ColorMode;
  onToggleMode: () => void;
}) {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  const ModeIcon = mode === "dark" ? IconSun : IconMoon;

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "var(--ground)",
        borderBottom: "var(--bw) solid var(--line)",
      }}
    >
      <div
        style={{
          maxWidth: 1400,
          margin: "0 auto",
          height: 64,
          padding: "0 clamp(1rem, 3vw, 1.75rem)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          minWidth: 0,
        }}
      >
        <Link
          to="/"
          className="font-wordmark"
          style={{ fontSize: 27, color: "var(--text)", textDecoration: "none" }}
        >
          viactor
        </Link>

        <nav className="nav-desktop" style={{ alignItems: "center", gap: 24, minWidth: 0 }}>
          <Link
            to="/browse"
            className="font-label nav-link"
            style={{ color: "var(--text-muted)" }}
          >
            {t("marketing.nav.browse")}
          </Link>
          <a href="/#how-it-works" className="font-label nav-link" style={{ color: "var(--text-muted)" }}>
            {t("marketing.nav.how")}
          </a>
          <a href="/#safety" className="font-label nav-link" style={{ color: "var(--text-muted)" }}>
            {t("marketing.nav.trust")}
          </a>
          <LangToggle />
          <button
            type="button"
            onClick={onToggleMode}
            aria-label={t(`marketing.nav.mode_${mode === "dark" ? "light" : "dark"}`)}
            style={{
              display: "inline-flex",
              cursor: "pointer",
              background: "none",
              border: 0,
              padding: 2,
              color: "var(--text)",
            }}
          >
            <ModeIcon size={19} stroke={2} aria-hidden="true" />
          </button>
          {user ? (
            <AccountMenu />
          ) : (
            <>
              <Link
                to="/auth"
                search={{ mode: "signin", redirect: undefined }}
                className="font-label"
                style={{ color: "var(--text)", textDecoration: "none" }}
              >
                {t("marketing.nav.signin")}
              </Link>
              <Link
                to="/auth"
                search={{ mode: "signup", redirect: undefined }}
                className="btn btn--primary"
                style={{ padding: "9px 18px", fontSize: "0.88rem" }}
              >
                {t("marketing.nav.cta")}
              </Link>
            </>
          )}
        </nav>

        <button
          type="button"
          className="nav-toggle font-label"
          onClick={() => setOpen((previous) => !previous)}
          aria-expanded={open}
          aria-controls="viactor-nav-panel"
          style={{
            alignItems: "center",
            gap: 8,
            cursor: "pointer",
            background: "var(--sheet)",
            border: "var(--bw) solid var(--line)",
            padding: "8px 12px",
            color: "var(--text)",
          }}
        >
          {open ? (
            <IconX size={16} stroke={2} aria-hidden="true" />
          ) : (
            <IconMenu2 size={16} stroke={2} aria-hidden="true" />
          )}
          {open ? t("marketing.nav.close") : t("marketing.nav.menu")}
        </button>
      </div>

      {open && (
        <div className="nav-panel" id="viactor-nav-panel">
          <Link to="/browse" className="font-label" onClick={() => setOpen(false)}>
            {t("marketing.nav.browse")}
          </Link>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
            }}
          >
            <LangToggle />
            <button
              type="button"
              className="font-label"
              onClick={onToggleMode}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
                background: "none",
                border: 0,
                padding: 0,
                color: "var(--text)",
              }}
            >
              <ModeIcon size={17} stroke={2} aria-hidden="true" />
              {t(`marketing.nav.mode_${mode === "dark" ? "light" : "dark"}`)}
            </button>
          </div>
          {user ? (
            <>
              <Link
                to="/profile/$userId"
                params={{ userId: user.id }}
                className="font-label"
                onClick={() => setOpen(false)}
              >
                {t("navigation.profile")}
              </Link>
              <Link to="/my-listings" className="font-label" onClick={() => setOpen(false)}>
                {t("myroutes.menu")}
              </Link>
              <Link to="/messages" className="font-label" onClick={() => setOpen(false)}>
                {t("navigation.messages")}
              </Link>
              <Link to="/settings" className="font-label" onClick={() => setOpen(false)}>
                {t("navigation.settings")}
              </Link>
              <button
                type="button"
                className="font-label"
                onClick={() => {
                  setOpen(false);
                  void signOut();
                }}
                style={{
                  cursor: "pointer",
                  background: "none",
                  border: 0,
                  padding: "14px 20px",
                  color: "var(--text)",
                  textAlign: "left",
                }}
              >
                {t("marketing.nav.signout")}
              </button>
            </>
          ) : (
            <>
              <Link
                to="/auth"
                search={{ mode: "signin", redirect: undefined }}
                className="font-label"
                onClick={() => setOpen(false)}
              >
                {t("marketing.nav.signin")}
              </Link>
              <Link
                to="/auth"
                search={{ mode: "signup", redirect: undefined }}
                onClick={() => setOpen(false)}
                style={{
                  background: "var(--orange)",
                  color: "var(--on-fill)",
                  fontWeight: 600,
                  textAlign: "center",
                }}
              >
                {t("marketing.nav.cta")}
              </Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}

export default ViactorNav;