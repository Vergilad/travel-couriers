/**
 * The Safety page, as a third sheet of the same paperwork.
 *
 * Moved off the landing so trust mechanics can be explained in full rather
 * than squeezed into three one-liners. Copy rule from the project context:
 * verification is optional and means deterrence, never a promise, and the
 * user always decides. Nothing here claims more than the shipped product
 * does, and nothing is automatic.
 *
 * Grid discipline: the four columns pack exactly on every row.
 *
 *   row 1   head (4)
 *   row 2   ID verification (2)   held payment (2)
 *   row 3   reviews (2)           nothing automatic (2)
 *   row 4   closing call (4)
 */
import { Link } from "@tanstack/react-router";
import { IconCheck, IconArrowNarrowRight } from "@tabler/icons-react";

import { useTranslation } from "@/i18n/I18nContext";
import { SheetGrid, SheetTile } from "@/components/ui/sheet-grid";
import { MarketingChrome } from "@/components/landing/viactor/MarketingChrome";

/** The ticked box the landing's safety field uses, reused here. */
function Tick() {
  return (
    <span className="tickbox" aria-hidden="true">
      <IconCheck size={15} stroke={3} />
    </span>
  );
}

export function SafetyPage() {
  const { t } = useTranslation();

  return (
    <MarketingChrome>
      <SheetGrid className="sheet-grid--apart">
        <SheetTile span={4} tone="teal">
          <h1 className="field-caption">{t("marketing.trust.title")}</h1>
          <p
            className="font-display"
            style={{ fontSize: "var(--t-h2)", margin: 0, maxWidth: "28ch" }}
          >
            {t("marketing.safety_page.intro")}
          </p>
        </SheetTile>

        <SheetTile span={2}>
          <Tick />
          <h2
            className="font-display"
            style={{ fontSize: "var(--t-h3)", margin: "10px 0 0" }}
          >
            {t("marketing.safety_page.id_title")}
          </h2>
          <p className="copy" style={{ marginTop: 12, maxWidth: "46ch" }}>
            {t("marketing.safety_page.id_body")}
          </p>
        </SheetTile>

        <SheetTile span={2} tone="orange">
          <Tick />
          <h2
            className="font-display"
            style={{ fontSize: "var(--t-h3)", margin: "10px 0 0" }}
          >
            {t("marketing.trust.escrow")}
          </h2>
          <p className="copy" style={{ marginTop: 12, maxWidth: "46ch" }}>
            {t("marketing.safety_page.escrow_body")}
          </p>
        </SheetTile>

        <SheetTile span={2}>
          <Tick />
          <h2
            className="font-display"
            style={{ fontSize: "var(--t-h3)", margin: "10px 0 0" }}
          >
            {t("marketing.safety_page.reviews_title")}
          </h2>
          <p className="copy" style={{ marginTop: 12, maxWidth: "46ch" }}>
            {t("marketing.safety_page.reviews_body")}
          </p>
        </SheetTile>

        <SheetTile span={2} tone="ground" style={{ justifyContent: "center" }}>
          <h2
            className="font-display"
            style={{ fontSize: "var(--t-h3)", margin: 0 }}
          >
            {t("marketing.safety_page.decide_title")}
          </h2>
          <p
            className="copy"
            style={{ marginTop: 12, maxWidth: "46ch", color: "var(--text-muted)" }}
          >
            {t("marketing.safety_page.decide_body")}
          </p>
        </SheetTile>

        <SheetTile span={4} tone="orange" style={{ justifyContent: "center" }}>
          <div
            aria-hidden="true"
            className="airmail"
            style={{ position: "absolute", inset: "0 0 auto 0", height: 10 }}
          />
          <div className="closing-row">
            <h2 className="font-display" style={{ fontSize: "var(--t-h2)", margin: 0, maxWidth: "22ch" }}>
              {t("marketing.safety_page.cta_title")}
            </h2>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              <Link to="/browse" className="btn btn--plain press">
                {t("marketing.nav.browse")}
                <IconArrowNarrowRight size={18} stroke={2} aria-hidden="true" />
              </Link>
              <Link to="/auth" search={{ mode: "signup", redirect: undefined }} className="btn btn--ghost">
                {t("marketing.nav.cta")}
              </Link>
            </div>
          </div>
        </SheetTile>
      </SheetGrid>
    </MarketingChrome>
  );
}

export default SafetyPage;
