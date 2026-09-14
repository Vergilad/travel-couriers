/**
 * Marketing footer, built as one more form sheet so it belongs to the page
 * rather than being a different kind of object bolted underneath it.
 */
import { Link } from "@tanstack/react-router";

import { useTranslation } from "@/i18n/I18nContext";

const linkStyle = {
  color: "var(--text)",
  textDecoration: "none",
  fontSize: "0.95rem",
} as const;

export function ViactorFooter() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <footer style={{ borderTop: "var(--bw) solid var(--line)" }}>
      <div
        style={{
          maxWidth: 1400,
          margin: "0 auto",
          padding: "clamp(2rem, 5vw, 3.5rem) clamp(1rem, 3vw, 1.75rem)",
        }}
      >
        <div className="footer-grid">
          <div>
            <p className="font-wordmark" style={{ fontSize: 30, margin: 0 }}>
              viactor
            </p>
            <p
              style={{
                margin: "12px 0 0",
                color: "var(--text-muted)",
                fontSize: "0.95rem",
                lineHeight: 1.5,
                maxWidth: "30ch",
              }}
            >
              {t("marketing.footer.madeby")}
            </p>
          </div>

          <nav style={{ display: "grid", gap: 10, alignContent: "start" }}>
            <p className="font-label" style={{ margin: 0, color: "var(--text-muted)" }}>
              {t("marketing.footer.product")}
            </p>
            <a href="#how" style={linkStyle}>
              {t("marketing.nav.how")}
            </a>
            <Link to="/browse" style={linkStyle}>
              {t("marketing.nav.browse")}
            </Link>
            <a href="#trust" style={linkStyle}>
              {t("marketing.nav.trust")}
            </a>
          </nav>

          <nav style={{ display: "grid", gap: 10, alignContent: "start" }}>
            <p className="font-label" style={{ margin: 0, color: "var(--text-muted)" }}>
              {t("marketing.footer.account")}
            </p>
            <Link to="/auth" search={{ mode: "signin", redirect: undefined }} style={linkStyle}>
              {t("marketing.nav.signin")}
            </Link>
            <Link to="/auth" search={{ mode: "signup", redirect: undefined }} style={linkStyle}>
              {t("marketing.nav.cta")}
            </Link>
          </nav>

          <div style={{ display: "grid", gap: 10, alignContent: "start" }}>
            <p className="font-label" style={{ margin: 0, color: "var(--text-muted)" }}>
              {t("marketing.footer.contact")}
            </p>
            <a href="mailto:hello@viactor.net" style={linkStyle}>
              hello@viactor.net
            </a>
          </div>
        </div>

        <p
          className="font-label"
          style={{ margin: "22px 0 0", color: "var(--text-muted)" }}
        >
          &copy; {year} Viactor. {t("marketing.footer.rights")}
        </p>
      </div>
    </footer>
  );
}

export default ViactorFooter;