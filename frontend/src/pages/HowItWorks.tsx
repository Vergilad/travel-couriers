/**
 * The How it works page, as a second sheet of the same paperwork.
 *
 * This content used to live in one four-column field on the landing sheet.
 * It moved here so the landing can stay a first impression and the mechanics
 * can have the room they need: the two kinds of listing, the two paths, the
 * steps both sides share, and what the two of them set rather than a tariff.
 *
 * Grid discipline: the four columns pack exactly on every row.
 *
 *   row 1   head (4)
 *   row 2   the two kinds (2)   the fee (2)
 *   row 3   the two paths (4)
 *   row 4   shared steps (4)
 *   row 5   closing call (4)
 */
import { Link } from "@tanstack/react-router";
import { IconArrowNarrowRight } from "@tabler/icons-react";

import { useTranslation } from "@/i18n/I18nContext";
import { SheetGrid, SheetTile, FieldLabel } from "@/components/ui/sheet-grid";
import { MarketingChrome } from "@/components/landing/viactor/MarketingChrome";

export function HowItWorksPage() {
  const { t } = useTranslation();

  const path = (label: string, steps: readonly string[]) => (
    <div>
      <p className="field-caption" style={{ marginBottom: 14 }}>
        {label}
      </p>
      <ol className="path-steps">
        {steps.map((step) => (
          <li
            key={step}
            className="font-display"
            style={{ fontSize: "var(--t-h3)", fontWeight: 500, lineHeight: 1.25 }}
          >
            {step}
          </li>
        ))}
      </ol>
    </div>
  );

  return (
    <MarketingChrome>
      <SheetGrid className="sheet-grid--apart">
        <SheetTile span={4} tone="teal">
          <h1 className="field-caption">{t("marketing.how.title")}</h1>
          <p
            className="font-display"
            style={{ fontSize: "var(--t-h2)", margin: 0, maxWidth: "28ch" }}
          >
            {t("marketing.how_page.intro")}
          </p>
        </SheetTile>

        <SheetTile span={2}>
          <h2 className="field-caption">{t("marketing.how_page.kinds_title")}</h2>
          <div style={{ display: "grid", gap: 18 }}>
            <div>
              <FieldLabel>{t("marketing.how_page.carry_label")}</FieldLabel>
              <p className="copy" style={{ marginTop: 8 }}>
                {t("marketing.how_page.carry_body")}
              </p>
            </div>
            <div>
              <FieldLabel>{t("marketing.how_page.need_label")}</FieldLabel>
              <p className="copy" style={{ marginTop: 8 }}>
                {t("marketing.how_page.need_body")}
              </p>
              <p className="copy" style={{ marginTop: 10, color: "var(--text-muted)" }}>
                {t("marketing.how_page.purchase_body")}
              </p>
            </div>
          </div>
        </SheetTile>

        <SheetTile span={2} tone="orange" style={{ justifyContent: "center" }}>
          <h2 className="field-caption" style={{ marginBottom: 6 }}>
            {t("marketing.price.title")}
          </h2>
          <p
            className="font-display tabular"
            style={{
              fontSize: "var(--t-mega)",
              margin: 0,
              lineHeight: 0.82,
              letterSpacing: "-0.04em",
            }}
          >
            &euro;18
          </p>
          <FieldLabel className="ink-dim" style={{ color: "inherit", marginTop: 14 }}>
            {t("marketing.price.route")} &middot; {t("marketing.price.example")}
          </FieldLabel>
          <p className="copy" style={{ maxWidth: "42ch", marginTop: 14 }}>
            {t("marketing.price.body")}
          </p>
        </SheetTile>

        <SheetTile span={4} tone="teal">
          <h2 className="field-caption">{t("marketing.how.title")}</h2>
          <div className="path-split">
            {path(t("marketing.how.send_label"), [
              t("marketing.how.send_1"),
              t("marketing.how.send_2"),
            ])}
            {path(t("marketing.how.fly_label"), [
              t("marketing.how.fly_1"),
              t("marketing.how.fly_2"),
            ])}
          </div>
        </SheetTile>

        <SheetTile span={4}>
          <p className="field-caption" style={{ marginBottom: 14 }}>
            {t("marketing.how.join_label")}
          </p>
          <ol className="path-join-rows">
            <li className="copy">{t("marketing.how_page.step1")}</li>
            <li className="copy">{t("marketing.how_page.step2")}</li>
            <li className="copy">{t("marketing.how_page.step3")}</li>
            <li className="copy">{t("marketing.how_page.step4")}</li>
          </ol>
        </SheetTile>

        <SheetTile span={4} tone="orange" style={{ justifyContent: "center" }}>
          <div
            aria-hidden="true"
            className="airmail"
            style={{ position: "absolute", inset: "0 0 auto 0", height: 10 }}
          />
          <div className="closing-row">
            <h2 className="font-display" style={{ fontSize: "var(--t-h2)", margin: 0, maxWidth: "22ch" }}>
              {t("marketing.how_page.cta_title")}
            </h2>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              <Link to="/need/new" className="btn btn--plain press">
                {t("marketing.cta.primary")}
                <IconArrowNarrowRight size={18} stroke={2} aria-hidden="true" />
              </Link>
              <Link to="/carry/new" className="btn btn--ghost">
                {t("marketing.cta.secondary")}
              </Link>
            </div>
          </div>
        </SheetTile>
      </SheetGrid>
    </MarketingChrome>
  );
}

export default HowItWorksPage;
