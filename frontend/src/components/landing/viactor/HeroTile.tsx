/**
 * The 2x2 anchor field of the sheet: what this is, where you want to go, and
 * the one input that matters.
 *
 * The headline ends on a preposition and hands off to a split-flap board on
 * the line below it, which is where the sentence finishes. That is the page's
 * single signature motion: a departures board is the object this product lives
 * inside, and a destination changing in front of you says "somebody is always
 * going somewhere" without a word of copy. Everything else only fades in.
 *
 * The board sits on its own line rather than inline in the sentence, because a
 * real board is a horizontal strip and because inline panels at headline size
 * have to shrink so far to keep the baseline that they stop reading as panels.
 *
 * This tile is shorter than the two stacked tiles beside it, so it has slack to
 * spend, and how much depends on the width: the neighbouring routes list is far
 * taller at 1080px than at 1440px. It spends the slack on a rule -- the divider
 * between what the field says and what it asks you to do -- and splits it in
 * two, half above the rule and half under the form, using the two `auto`
 * margins below. Flexbox shares leftover space equally between auto margins.
 *
 * One gap took all of it before, which put a hole in the middle of the page's
 * largest field. Half of it as breathing room under the pitch and half as the
 * form's bottom margin are both things a printed form actually has.
 */
import { useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";

import { useTranslation } from "@/i18n/I18nContext";
import { SheetTile, FieldLabel } from "@/components/ui/sheet-grid";
import { SplitFlapBoard } from "@/components/landing/viactor/SplitFlapBoard";

// The destinations the board cycles. Latin script in both locales: the board's
// charset is Latin, and these names are read the same either way.
const DESTINATIONS = [
  "ISTANBUL",
  "BERLIN",
  "WARSZAWA",
  "NEW YORK",
  "ALMATY",
  "TBILISI",
  "YEREVAN",
];

export function HeroTile() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  function handleSearch(event: FormEvent) {
    event.preventDefault();
    // Filter wiring lands when Browse is redesigned; for now, open the board.
    navigate({ to: "/browse" });
  }

  return (
    <SheetTile span={2} rows={2} style={{ gap: 28 }}>
      <div>
        <h1 className="font-display" style={{ fontSize: "var(--t-hero)", margin: 0 }}>
          {t("marketing.hero.headline")}
          <SplitFlapBoard words={DESTINATIONS} />
        </h1>

        <p
          className="copy"
          style={{
            fontSize: "var(--t-body-lg)",
            color: "var(--text-muted)",
            // Short measure on purpose. A wide hero tile would set this in two
            // long lines and leave the field with nothing but slack under it;
            // three short lines fill the field and are faster to read.
            maxWidth: "34ch",
            marginTop: 20,
          }}
        >
          {t("marketing.hero.subhead")}
        </p>
      </div>

      <div className="field-rule" aria-hidden="true" />

      {/* The second of the two auto margins; see the note at the top. */}
      <form onSubmit={handleSearch} style={{ marginBottom: "auto" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: 14,
          }}
        >
          <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
            <FieldLabel>{t("marketing.hero.from")}</FieldLabel>
            <input
              className="route-input"
              name="from"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              placeholder="Berlin"
              autoComplete="address-level2"
              enterKeyHint="next"
            />
          </label>
          <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
            <FieldLabel>{t("marketing.hero.to")}</FieldLabel>
            <input
              className="route-input"
              name="to"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              placeholder="Istanbul"
              autoComplete="address-level2"
              enterKeyHint="search"
            />
          </label>
        </div>

        <button type="submit" className="btn btn--primary press" style={{ marginTop: 18 }}>
          {t("marketing.hero.search_cta")}
        </button>
      </form>
    </SheetTile>
  );
}

export default HeroTile;