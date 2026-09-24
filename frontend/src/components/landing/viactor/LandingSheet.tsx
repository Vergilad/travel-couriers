/**
 * The Viactor landing page as one sheet of transit paperwork.
 *
 * Grid discipline: eight fields, and the four columns pack exactly with no
 * empty cell anywhere.
 *
 *   row 1-2   hero (2x2)      routes (1x2)         in-transit photo (1x2)
 *   row 3     status (2)      handover photo (2)
 *   row 4     spare-space band (4, thin)
 *   row 5     how teaser (2)  safety teaser (2)
 *   row 6     what viactor is (2)  founders (2)
 *   row 7     closing call (4)
 *
 * The full "how it works" walk-through and the safety mechanics stay on this
 * first-impression page. The listing page carries a focused version of the
 * same guidance next to the concrete listing, but the landing must explain
 * the product before someone clicks into a route.
 *
 * The grid carries the `--apart` modifier: tiles render as separate cards
 * with air between them, so the page reads as fields on a desk rather than
 * one merged wall of paperwork.
 *
 * BOTH SIDES, ONE PAGE. This is a two-sided marketplace and the page is
 * written for both sides at once: whoever is reading, the sentence is about
 * them. Earlier drafts were sender-only in eleven of seventeen strings and all
 * four in the hero, which meant a traveller landing here read a page about
 * somebody else's parcel.
 *
 * The two teaser fields name the sides (send / fly) in one line each; the
 * full split lives on /how. Splitting the rest of the page by side would be
 * partitioning something that is not partitioned, and a toggle would hide
 * half the product from whoever did not notice it.
 *
 * Field forms are deliberately unequal. A form names its fields in small print
 * and puts the value in large print, so a field's heading is a mono caption
 * (`.field-caption`) and its content is what you read first. One field is a
 * thin panoramic band, one is the page's only block of prose. Fields at the
 * same size, the same density and the same composition is what made the sheet
 * read as a wall.
 *
 * Colour carries meaning rather than decoration: teal is "where you are
 * going" (routes, the how teaser), orange is "action" (the closing call).
 * Three fields are photographs, so the sheet is never white-on-white.
 *
 * Copy rule: Viactor has not launched. There are no usage numbers, no
 * testimonials and no trust badges on this page. Anything that looks like data
 * is either a shipped product feature or is labelled as an example. And no
 * em-dashes, anywhere.
 */
import { Link } from "@tanstack/react-router";
import { IconArrowNarrowRight } from "@tabler/icons-react";

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
 * What Viactor is, in four sentences, taken from the project's own context:
 * the platform creates no transportation, it matches trips that already
 * exist; couriers are independent users, never employees; the platform
 * handles matching, chat and payment; the fee lands only on completed deals.
 * This is the page's one field of facts, and it sits beside the founders
 * field because the two answer different questions: what this is, who this is.
 */
function AboutTile() {
  const { t } = useTranslation();

  return (
    <SheetTile span={2}>
      <h2 className="field-caption">{t("marketing.about.title")}</h2>
      <p className="copy" style={{ maxWidth: "46ch" }}>
        {t("marketing.about.body")}
      </p>
    </SheetTile>
  );
}


/**
 * Where the project stands, stated plainly.
 *
 * General information about Viactor itself, taken from the project context:
 * the full loop works end to end, the platform is self-hosted, and it is
 * pre-launch. The copy rule demands honesty about the stage, so the field
 * names the stage instead of inventing numbers. The fee example this field
 * replaced lives on /how now; saying it here too would say it twice.
 *
 * Centred vertically: this field shares its row with a photograph taller
 * than four lines of copy, and the slack goes evenly above and below.
 */
function StatusTile() {
  const { t } = useTranslation();

  return (
    <SheetTile span={2} tone="orange" style={{ justifyContent: "center" }}>
      <h2 className="field-caption" style={{ marginBottom: 6 }}>
        {t("marketing.status.title")}
      </h2>
      <p className="copy" style={{ maxWidth: "44ch" }}>
        {t("marketing.status.body")}
      </p>
      <FieldLabel className="ink-dim" style={{ color: "inherit", marginTop: 14 }}>
        {t("marketing.status.note")}
      </FieldLabel>
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

/** Full how-it-works field, kept on the landing so the product is understandable before a route is opened. */
function HowItWorksTile() {
  const { t } = useTranslation();
  const steps = [t("marketing.how_page.step1"), t("marketing.how_page.step2"), t("marketing.how_page.step3"), t("marketing.how_page.step4")];

  return (
    <SheetTile span={4} id="how-it-works" style={{ gap: 20 }}>
      <div className="landing-guide-heading">
        <div>
          <p className="field-caption" style={{ margin: 0 }}>{t("marketing.nav.how")}</p>
          <h2 className="font-display" style={{ fontSize: "var(--t-h2)", margin: "8px 0 0" }}>{t("marketing.how.title")}</h2>
          <p className="copy ink-dim" style={{ margin: "10px 0 0", maxWidth: "56ch" }}>{t("marketing.how_page.intro")}</p>
        </div>
        <span className="stencil-chip" data-side="carry">{t("marketing.how_page.carry_label")}</span>
      </div>
      <div className="landing-guide-grid">
        <div className="landing-guide-kind">
          <p className="field-caption" style={{ margin: 0 }}>{t("marketing.how.send_label")}</p>
          <p className="copy" style={{ margin: "12px 0 0" }}>{t("marketing.how.send_1")}</p>
          <p className="copy ink-dim" style={{ margin: "6px 0 0" }}>{t("marketing.how.send_2")}</p>
        </div>
        <div className="landing-guide-kind">
          <p className="field-caption" style={{ margin: 0 }}>{t("marketing.how.fly_label")}</p>
          <p className="copy" style={{ margin: "12px 0 0" }}>{t("marketing.how.fly_1")}</p>
          <p className="copy ink-dim" style={{ margin: "6px 0 0" }}>{t("marketing.how.fly_2")}</p>
        </div>
        <div className="landing-guide-kind">
          <p className="field-caption" style={{ margin: 0 }}>{t("marketing.price.title")}</p>
          <p className="copy" style={{ margin: "12px 0 0" }}>
            <span className="font-display" style={{ fontSize: "var(--t-h3)" }}>{t("marketing.price.amount")}</span>
            <span className="font-label" style={{ marginLeft: 8 }}>{t("marketing.price.route")}</span>
          </p>
          <p className="copy ink-dim" style={{ margin: "6px 0 0" }}>{t("marketing.price.body")}</p>
          <p className="font-label ink-dim" style={{ margin: "8px 0 0" }}>{t("marketing.price.example")}</p>
        </div>
        <div className="landing-guide-kind landing-guide-kind--wide">
          <p className="field-caption" style={{ margin: 0 }}>{t("marketing.how.join_label")}</p>
          <div className="landing-guide-steps">
            {steps.map((step, index) => <span key={step}><b>{String(index + 1).padStart(2, "0")}</b>{step}</span>)}
          </div>
        </div>
      </div>
    </SheetTile>
  );
}

/** Full safety field. The language stays deliberately bounded: mechanisms first, no guarantees. */
function SafetyTile() {
  const { t } = useTranslation();
  const items = [
    { title: t("marketing.safety_page.id_title"), body: t("marketing.safety_page.id_body") },
    { title: t("marketing.safety_page.escrow_title"), body: t("marketing.safety_page.escrow_body") },
    { title: t("marketing.safety_page.reviews_title"), body: t("marketing.safety_page.reviews_body") },
    { title: t("marketing.safety_page.decide_title"), body: t("marketing.safety_page.decide_body") },
  ];

  return (
    <SheetTile span={4} tone="teal" id="safety" style={{ gap: 20 }}>
      <div className="landing-guide-heading">
        <div>
          <p className="field-caption" style={{ margin: 0 }}>{t("marketing.nav.trust")}</p>
          <h2 className="font-display" style={{ fontSize: "var(--t-h2)", margin: "8px 0 0" }}>{t("marketing.safety_page.intro")}</h2>
        </div>
        <span className="stencil-chip" data-side="need">{t("marketing.safety_page.decide_title")}</span>
      </div>
      <div className="landing-guide-grid landing-guide-grid--safety">
        {items.map((item, index) => (
          <article className="landing-guide-card" key={item.title}>
            <span className="font-label" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
            <h3 className="font-display" style={{ fontSize: "var(--t-h3)", margin: "12px 0 0" }}>{item.title}</h3>
            <p className="copy" style={{ margin: "10px 0 0" }}>{item.body}</p>
          </article>
        ))}
      </div>
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
    <SheetGrid className="sheet-grid--apart">
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

      <StatusTile />
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

      <AboutTile />
      <FoundersTile />

      <HowItWorksTile />
      <SafetyTile />

      <ClosingTile />
    </SheetGrid>
  );
}

export default LandingSheet;