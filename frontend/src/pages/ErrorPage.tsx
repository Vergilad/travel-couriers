import { Link } from "@tanstack/react-router";

import { useTranslation } from "@/i18n/I18nContext";
import { MarketingChrome } from "@/components/landing/viactor/MarketingChrome";
import { SheetGrid, SheetTile } from "@/components/ui/sheet-grid";

function getStatus(error: unknown): number {
  if (error && typeof error === "object") {
    const value = error as { status?: unknown; statusCode?: unknown };
    if (typeof value.status === "number") return value.status;
    if (typeof value.statusCode === "number") return value.statusCode;
  }
  return 404;
}

function errorCopy(status: number) {
  if (status === 400) return ["400_title", "400_body"] as const;
  if (status === 401) return ["401_title", "401_body"] as const;
  if (status === 403) return ["403_title", "403_body"] as const;
  if (status === 500) return ["500_title", "500_body"] as const;
  if (status === 404) return ["404_title", "404_body"] as const;
  return ["default_title", "default_body"] as const;
}

/** Shared error surface for router errors, unknown routes and failed requests. */
export function ErrorPage(props: { error?: unknown; reset?: () => void; [key: string]: unknown } = {}) {
  const { t } = useTranslation();
  const { error, reset } = props;
  const status = getStatus(error);
  const [titleKey, bodyKey] = errorCopy(status);

  return (
    <MarketingChrome>
      <SheetGrid className="sheet-grid--apart">
        <SheetTile span={4} tone="teal">
          <p className="field-caption">{t("errors.technical")} / {status}</p>
          <h1 className="font-display" style={{ fontSize: "clamp(3rem, 9vw, 7rem)", lineHeight: 0.9, margin: "18px 0 0", letterSpacing: "-0.05em" }}>
            {status}
          </h1>
        </SheetTile>

        <SheetTile span={3} tone="orange">
          <h2 className="font-display" style={{ fontSize: "var(--t-h2)", margin: 0, maxWidth: "18ch" }}>
            {t(`errors.${titleKey}`)}
          </h2>
          <p className="copy" style={{ marginTop: 18, maxWidth: "42ch" }}>
            {t(`errors.${bodyKey}`)}
          </p>
        </SheetTile>

        <SheetTile span={1} tone="ground" style={{ justifyContent: "space-between" }}>
          <p className="font-mono" style={{ margin: 0, color: "var(--text-muted)", fontSize: 12 }}>
            viactor
          </p>
          <div style={{ display: "grid", gap: 10 }}>
            {reset && (
              <button type="button" className="btn btn--primary" onClick={reset}>
                {t("errors.try_again")}
              </button>
            )}
            <Link to="/" className="btn btn--plain">
              {t("errors.back_home")}
            </Link>
          </div>
        </SheetTile>
      </SheetGrid>
    </MarketingChrome>
  );
}
