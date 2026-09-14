/**
 * The form-sheet grid: Viactor's bento primitive.
 *
 * Shape, colour and rule width all come from the `[data-theme="viactor"]`
 * tokens, and the separators come from the grid's own background showing
 * through its gaps (see `viactor-layout.css`), so this file never does border
 * arithmetic and a token change never needs a code change.
 *
 * Motion: the ink animates, never the paper. A tile's fill is painted with no
 * animation at all, and a wrapper inside it fades the contents in when the
 * tile enters the viewport. Fading the tile itself was wrong twice over: an
 * element at `opacity: 0` lets the grid's own background (the rule colour)
 * show through, so every tile flashed as a near-black rectangle on its way in,
 * and any tile that never got its reveal stayed black. Painting the sheet
 * immediately and letting only the printing appear is both the safer failure
 * mode and the more honest one for a page built as a form.
 *
 * There is deliberately no container-level `staggerChildren`. The sheet is
 * around three thousand pixels tall, so a single stagger driven from the
 * container would run the whole cascade the moment the top of the grid
 * appeared, and the tiles near the bottom would finish animating long before
 * anyone scrolled to them.
 */
import type { CSSProperties, ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";

const SPAN_CLASS = { 1: "", 2: "span-2", 3: "span-3", 4: "span-4" } as const;

export type TileSpan = keyof typeof SPAN_CLASS;

/**
 * Tile fills. `sheet` is the default white field; `ground` recesses a field
 * into the page colour; `teal` and `orange` are the solid colour blocks that
 * keep the sheet from being white-on-white.
 */
export type TileTone = "sheet" | "ground" | "teal" | "orange";

/**
 * A tone is not just a fill. It also names the two colours that depend on what
 * a thing is sitting on: the colour a `.field-row` lights up with, and the
 * colour of a focus ring. Both are invisible if they are fixed globally, so
 * the tone carries them and the rules in CSS stay single.
 *
 * Teal highlights a white field; on a field that is already a colour block the
 * highlight has to be the sheet instead. Likewise a teal focus ring measures
 * 1.0:1 on the teal field, so there the ring is the field's own foreground.
 */
const TONE_STYLE: Record<TileTone, CSSProperties> = {
  sheet: {
    background: "var(--sheet)",
    color: "var(--text)",
    "--field-hi": "var(--teal)",
    "--field-hi-fg": "var(--on-fill)",
    "--focus-ring": "var(--line)",
  } as CSSProperties,
  ground: {
    background: "var(--ground)",
    color: "var(--text)",
    "--field-hi": "var(--teal)",
    "--field-hi-fg": "var(--on-fill)",
    "--focus-ring": "var(--line)",
  } as CSSProperties,
  teal: {
    background: "var(--teal)",
    color: "var(--on-fill)",
    "--field-hi": "var(--sheet)",
    "--field-hi-fg": "var(--text)",
    "--focus-ring": "var(--on-fill)",
  } as CSSProperties,
  orange: {
    background: "var(--orange)",
    color: "var(--on-fill)",
    "--field-hi": "var(--sheet)",
    "--field-hi-fg": "var(--text)",
    "--focus-ring": "var(--on-fill)",
  } as CSSProperties,
};

export function SheetGrid({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("sheet-grid", className)}>{children}</div>;
}

export function SheetTile({
  children,
  className,
  /** Anchor target for the nav's in-page links. */
  id,
  span = 1,
  rows = 1,
  tone = "sheet",
  /** Photo tiles bleed to their edges and drop the padding. */
  flush = false,
  /**
   * Layout of the contents inside the field. This lands on the ink layer,
   * which is the flex parent of `children`, not on the tile itself.
   */
  style,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
  span?: TileSpan;
  rows?: 1 | 2;
  tone?: TileTone;
  flush?: boolean;
  style?: CSSProperties;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <section
      id={id}
      className={cn(
        "sheet-tile",
        SPAN_CLASS[span],
        rows === 2 && "rows-2",
        flush && "sheet-tile--flush",
        className,
      )}
      style={TONE_STYLE[tone]}
    >
      <motion.div
        className="sheet-ink"
        style={style}
        /*
         * A small rise, not a fade alone: 10px over 320ms is the "subtle"
         * reveal, far enough to read as arriving and close enough that it
         * still reads as a fade. Flush photo fields get the fade only, since
         * a translated photo would show a strip of bare tile at the top on
         * its way in.
         */
        initial={reduceMotion ? false : { opacity: 0, y: flush ? 0 : 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.32, ease: [0.2, 0, 0, 1] }}
      >
        {children}
      </motion.div>
    </section>
  );
}

/**
 * The machine-printed field label. Used sparingly: the taste rules cap these
 * at roughly one per three sections, so most tiles open with their heading.
 */
export function FieldLabel({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <p
      className={cn("font-label field-dim", className)}
      style={{ margin: 0, color: "var(--text-muted)", ...style }}
    >
      {children}
    </p>
  );
}
