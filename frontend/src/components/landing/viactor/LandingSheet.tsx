/**
 * The Viactor landing page as one sheet of transit paperwork.
 *
 * Grid discipline: ten fields, and the four columns pack exactly with no empty
 * cell anywhere.
 *
 *   row 1-2   hero (2x2)      routes (1x2)         in-transit photo (1x2)
 *   row 3     the two paths (4)
 *   row 4     the fee (2)     handover photo (2)
 *   row 5     spare-space band (4, thin)
 *   row 6     safety (2)      founders (2)
 *   row 7     closing call (4)
 *
 * BOTH SIDES, ONE PAGE. This is a two-sided marketplace and the page is
 * written for both sides at once: whoever is reading, the sentence is about
 * them. Earlier drafts were sender-only in eleven of seventeen strings and all
 * four in the hero, which meant a traveller landing here read a page about
 * somebody else's parcel.
 *
 * There is exactly one field that divides by side, and it is `PathsTile`,
 * because the product genuinely divides there: one person is sending, the
 * other is flying, and they do different things right up until the handover.
 * Splitting the rest of the page by side would be partitioning something that
 * is not partitioned, and a toggle would hide half the product from whoever
 * did not notice it.
 *
 * Field forms are deliberately unequal. A form names its fields in small print
 * and puts the value in large print, so a field's heading is a mono caption
 * (`.field-caption`) and its content is what you read first. One field is a
 * single figure at `--t-mega` in otherwise empty space, one is a thin
 * panoramic band, one is the page's only block of prose. Ten fields at the
 * same size, the same density and the same composition is what made the sheet
 * read as a wall.
 *
 * Colour carries meaning rather than decoration: teal is "where you are
 * going" (routes, the two paths), orange is "money and action" (the fee, the
 * closing call). Three fields are photographs, so the sheet is never
 * white-on-white.
 *
 * Copy rule: Viactor has not launched. There are no usage numbers, no
 * testimonials and no trust badges on this page. Anything that looks like data
 * is either a shipped product feature or is labelled as an example. And no
 * em-dashes, anywhere.
 */
import { Link } from "@tanstack/react-router";
import { IconArrowNarrowRight, IconCheck } from "@tabler/icons-react";

import { useTranslation } from "@/i18n/I18nContext";
import { SheetGrid, SheetTile, FieldLabel } from "@/components/ui/sheet-grid";
import { PhotoTile } from "@/components/landing/viactor/PhotoTile";
import { HeroTile } from "@/components/landing/viactor/HeroTile";

/**
 * The corridors we open first, taken from the launch routes in
 * CONTEXT/project-context.md: Mexico-US, EU-UK, Turkey-Germany,
 * Poland-Ukraine, Azerbaijan-Russia, Kazakhstan-Russia. Density over
 * geography, so this list is six dense pairs rather than a world map. These
 * are targets, not traffic we already have, and the field says so.
 */
const CORRIDORS = [
  { from: "Berlin", to: "Istanbul", code: "BER / IST" },
  { from: "Warszawa", to: "Kyiv", code: "WAW / IEV" },
  { from: "London", to: "Krak\u00f3w", code: "LON / KRK" },
  { from: "Almaty", to: "Moscow", code: "ALA / MOW" },
  { from: "Moscow", to: "Baku", code: "MOW / GYD" },
  { from: "Los Angeles", to: "M\u00e9xico", code: "LAX / MEX" },
];

/** Where we open first. Six chips in two columns, never six stacked rows. */
function RoutesTile() {
  const { t } = useTranslation();

  return (
    <SheetTile span={1} rows={2} tone="teal" id="routes">
      <h2 className="field-caption">{t("marketing.routes.title")}</h2>

      <ul className="route-chips">
        {CORRIDORS.map((corridor) => (
          <li key={corridor.code} style={{ display: "grid" }}>
            <Link to="/browse" className="route-chip field-row">
              <span style={{ fontSize: "0.98rem", fontWeight: 500 }}>
                {corridor.from} &rarr; {corridor.to}
              </span>
              <span className="font-label field-dim ink-dim">{corridor.code}</span>
            </Link>
          </li>
        ))}
      </ul>

      <p className="copy ink-dim" style={{ marginTop: "auto", paddingTop: 22 }}>
        {t("marketing.routes.note")}
      </p>
    </SheetTile>
  );
}

/**
 * The one field that divides by side, and the page's centre.
 *
 * Two short paths run side by side, separated by the sheet's own rule, and
 * then a rule crosses both and one shared list runs underneath. You read your
 * own column and watch it join the other one, which is the product in one
 * picture: two people doing different things until the moment they meet.
 *
 * Two steps per side, not four in sequence. The old version was four stacked
 * steps written entirely from the sender's seat, sixty words of it, and a
 * traveller reading it learned what somebody else was going to do.
 */
function PathsTile() {
  const { t } = useTranslation();

  const path = (label: string, steps: readonly string[]) => (
    <div>
      <p className="field-caption" style={{ marginBottom: 14 }}>
        {label}
      </p>
      {/* Set at heading size, not body size. These four phrases are the
          product, they sit in the widest field on the sheet, and at body size
          they left most of that field empty for no reason. */}
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
    <SheetTile span={4} tone="teal" id="how">
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

      <div className="path-join">
        <p className="field-caption" style={{ marginBottom: 14 }}>
          {t("marketing.how.join_label")}
        </p>
        <ol className="path-join-rows">
          <li className="copy">{t("marketing.how.join_1")}</li>
          <li className="copy">{t("marketing.how.join_2")}</li>
        </ol>
      </div>
    </SheetTile>
  );
}

/**
 * The fee. One figure at the top of the type scale in a field that is
 * otherwise almost empty.
 *
 * This is the page's macro-typography beat, and it is here because the fee is
 * the one number that means something to both sides at once: the sender's cost
 * and the traveller's earnings are the same figure. So the field states the
 * figure and then says, in as few words as possible, that the two of them set
 * it. It does not claim what either side nets, because the platform fee is not
 * set yet and inventing one would be a fake-precise number.
 *
 * Centred vertically: this field shares its row with a photograph taller than
 * one figure and one line, and the slack goes evenly above and below rather
 * than collecting in an unexplained gap at the bottom.
 */
function PriceTile() {
  const { t } = useTranslation();

  return (
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
  );
}

/**
 * The three safety mechanics that actually exist in the product.
 *
 * Each one is marked with a ticked box rather than a subject icon. A shield, a
 * padlock and a speech bubble would have been this page's only pictograms, and
 * three lone glyphs on a form read as decoration; the box is drawn with the
 * same 2px rule as the sheet itself and says the one thing that matters here,
 * which is that these are shipped, not planned.
 */
function SafetyTile() {
  const { t } = useTranslation();
  const items = ["id", "escrow", "reviews"] as const;

  return (
    <SheetTile span={2} id="trust">
      <h2 className="field-caption">{t("marketing.trust.title")}</h2>
      {/* Three across or a stack; see .trust-grid. */}
      <ul
        className="trust-grid"
        style={{ listStyle: "none", gap: 18, margin: 0, padding: 0 }}
      >
        {items.map((key) => (
          <li key={key}>
            <span className="tickbox" aria-hidden="true">
              <IconCheck size={15} stroke={3} />
            </span>
            <p className="copy" style={{ marginTop: 10 }}>
              {t(`marketing.trust.${key}`)}
            </p>
          </li>
        ))}
      </ul>
    </SheetTile>
  );
}

/**
 * Who is behind this, and honest about the stage.
 *
 * The only block of prose on the page, and it keeps its display heading rather
 * than a mono caption. Every other field is captioned small and read fast;
 * this one is meant to be read, so it is the one field that looks like
 * writing. One reading moment is a change of pace. Seven was an essay.
 */
function FoundersTile() {
  const { t } = useTranslation();

  return (
    <SheetTile span={2} tone="ground" style={{ justifyContent: "center" }}>
      <h2
        className="font-display"
        style={{ fontSize: "var(--t-h2)", margin: 0 }}
      >
        {t("marketing.founders.title")}
      </h2>
      <p
        className="copy"
        style={{ color: "var(--text-muted)", maxWidth: "46ch", marginTop: 14 }}
      >
        {t("marketing.founders.body")}
      </p>
    </SheetTile>
  );
}

/** The closing call, wearing the airmail edge. */
function ClosingTile() {
  const { t } = useTranslation();

  return (
    <SheetTile span={4} tone="orange" style={{ justifyContent: "center" }}>
      <div
        aria-hidden="true"
        className="airmail"
        style={{ position: "absolute", inset: "0 0 auto 0", height: 10 }}
      />
      {/*
        Ask on the left, answers on the right, on one line where there is room:
        a full-width band with its heading and buttons stacked dead-centre is
        the single most recognisable closing section on the web, and this tile
        is four columns wide, so centring also strands the content in a lake of
        orange. `.closing-row` wraps to a stack on narrow screens, where the
        two halves end up left-aligned like every other field on the sheet.
      */}
      <div className="closing-row">
        <h2 className="font-display" style={{ fontSize: "var(--t-h2)", margin: 0, maxWidth: "22ch" }}>
          {t("marketing.cta.title")}
        </h2>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          {/*
            The two actions are the two sides of the marketplace, not one action
            worded twice. "Join" already lives in the nav; repeating it here as
            "Create an account" would be the same intent in different words,
            which is the duplicate-CTA tell. Both routes are behind the auth
            guard, so a visitor who is not signed in gets the sign-up screen and
            is returned to the form they asked for.
          */}
          <Link to="/need/new" className="btn btn--plain press">
            {t("marketing.cta.primary")}
            <IconArrowNarrowRight size={18} stroke={2} aria-hidden="true" />
          </Link>
          {/* Ghost, not filled: the tile is already the accent colour. */}
          <Link to="/carry/new" className="btn btn--ghost">
            {t("marketing.cta.secondary")}
          </Link>
        </div>
      </div>
    </SheetTile>
  );
}

export function LandingSheet() {
  const { t } = useTranslation();

  return (
    <SheetGrid>
      <HeroTile />
      <RoutesTile />
      <PhotoTile
        slug="in-transit"
        alt={t("marketing.photo.in_transit_alt")}
        caption={t("marketing.photo.in_transit_caption")}
        span={1}
        rows={2}
        // Portrait traveller in a tall field: keep the window and the bag
        // in frame, centre holds both.
        priority
      />

      <PathsTile />

      <PriceTile />
      <PhotoTile
        slug="handover"
        alt={t("marketing.photo.handover_alt")}
        caption={t("marketing.photo.handover_caption")}
        span={2}
      />

      {/* The thin row. Four columns wide and a sixth as tall, so the page has
          one field that is a band rather than a block. */}
      <PhotoTile
        slug="spare-space"
        alt={t("marketing.photo.spare_space_alt")}
        caption={t("marketing.photo.spare_space_caption")}
        span={4}
        band
        focal="50% 42%"
      />

      <SafetyTile />
      <FoundersTile />

      <ClosingTile />
    </SheetGrid>
  );
}

export default LandingSheet;