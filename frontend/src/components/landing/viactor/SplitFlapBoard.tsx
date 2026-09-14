/**
 * A split-flap departures board, used for the destination in the hero.
 *
 * Adapted from React Bits' `SplitFlapText`. The flap mechanics and prop names
 * are theirs; three things are deliberately different:
 *
 * 1. The original drives the flip from a `requestAnimationFrame` loop that
 *    calls `setState` on every step, which re-renders the whole board roughly
 *    sixty times a second, forever. This version keeps the character data in
 *    refs and writes it straight to the DOM, and runs the flap itself through
 *    the Web Animations API so nothing reads layout mid-flip.
 * 2. `role="text"` is not a real ARIA role. Here the tiles are `aria-hidden`
 *    and the current word is mirrored into a visually hidden span, so a screen
 *    reader gets the headline as one ordinary sentence.
 * 3. The skin is flat: square tiles, hard rules, no gloss or gradients, type
 *    inherited from the page. The board has to look like the rest of the page.
 *
 * The board pauses while off-screen, so it is not animating under the fold.
 */
import { useEffect, useMemo, useRef, useState } from "react";

import "./SplitFlapBoard.css";

const CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/**
 * The four layers of one tile. Each layer holds a full-height glyph that is
 * clipped to the layer's half, so a character lines up across the seam instead
 * of being drawn twice at half size.
 */
type Tile = {
  /** Static top half: the outgoing glyph. */
  top: HTMLElement;
  /** Static bottom half: the incoming glyph, revealed as the leaf falls. */
  bottom: HTMLElement;
  /** Falling leaf, upper face. */
  leafFront: HTMLElement;
  /** Rising leaf, lower face. */
  leafBack: HTMLElement;
};

function readTile(root: HTMLElement): Tile | null {
  const top = root.querySelector<HTMLElement>('[data-part="top"]');
  const bottom = root.querySelector<HTMLElement>('[data-part="bottom"]');
  const leafFront = root.querySelector<HTMLElement>('[data-part="leaf-front"]');
  const leafBack = root.querySelector<HTMLElement>('[data-part="leaf-back"]');
  if (!top || !bottom || !leafFront || !leafBack) return null;
  return { top, bottom, leafFront, leafBack };
}

const setGlyph = (layer: HTMLElement, glyph: string) => {
  const target = layer.firstElementChild ?? layer;
  target.textContent = glyph === " " ? "\u00A0" : glyph;
};

const pad = (word: string, width: number) =>
  word.toUpperCase().padEnd(width, " ").slice(0, width);

const randomGlyph = () =>
  CHARSET.charAt(Math.floor(Math.random() * CHARSET.length));

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);
  return reduced;
}

export function SplitFlapBoard({
  words,
  /** Duration of a single flap, in ms. */
  flipDuration = 110,
  /** Delay between neighbouring tiles starting their cascade, in ms. */
  stagger = 55,
  /** How long a word is held before the board cycles, in ms. */
  cycleDelay = 2600,
  /** Intermediate glyphs a changed tile churns through. */
  flipsPerChar = 5,
  className = "",
}: {
  words: string[];
  flipDuration?: number;
  stagger?: number;
  cycleDelay?: number;
  flipsPerChar?: number;
  className?: string;
}) {
  const reduceMotion = usePrefersReducedMotion();
  const rootRef = useRef<HTMLSpanElement>(null);
  const liveRef = useRef<HTMLSpanElement>(null);

  const width = useMemo(
    () => words.reduce((max, word) => Math.max(max, word.length), 1),
    [words],
  );
  const initial = useMemo(() => pad(words[0] ?? "", width), [words, width]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const tiles = Array.from(root.querySelectorAll<HTMLElement>(".flap"))
      .map(readTile)
      .filter((tile): tile is Tile => tile !== null);

    let current = initial;
    let wordIndex = 0;
    let cancelled = false;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const animations = new Set<Animation>();

    const after = (ms: number, run: () => void) => {
      const id = setTimeout(() => {
        timers.delete(id);
        if (!cancelled) run();
      }, ms);
      timers.add(id);
    };

    /** Paints a tile's settled state, with no leaf showing. */
    const settle = (tile: Tile, glyph: string) => {
      setGlyph(tile.top, glyph);
      setGlyph(tile.bottom, glyph);
      tile.leafFront.style.visibility = "hidden";
      tile.leafBack.style.visibility = "hidden";
    };

    /** Runs one flap: `from` falls away, `to` drops into place. */
    const flap = (tile: Tile, from: string, to: string) => {
      setGlyph(tile.top, from);
      setGlyph(tile.bottom, to);
      setGlyph(tile.leafFront, from);
      setGlyph(tile.leafBack, to);

      // Premium curve: this board is the page's one signature moment.
      const easing = "cubic-bezier(0.4, 0, 0.2, 1)";
      const half = flipDuration / 2;

      tile.leafFront.style.visibility = "visible";
      tile.leafBack.style.visibility = "visible";

      animations.add(
        tile.leafFront.animate(
          [{ transform: "rotateX(0deg)" }, { transform: "rotateX(-90deg)" }],
          { duration: half, easing, fill: "forwards" },
        ),
      );
      animations.add(
        tile.leafBack.animate(
          [{ transform: "rotateX(90deg)" }, { transform: "rotateX(0deg)" }],
          { duration: half, delay: half, easing, fill: "forwards" },
        ),
      );
    };

    /** Churns one tile from `from` to `target` through random glyphs. */
    const churn = (index: number, from: string, target: string) => {
      const tile = tiles[index];
      if (!tile) return;

      const sequence = Array.from({ length: flipsPerChar }, randomGlyph);
      sequence.push(target);

      let previous = from;
      sequence.forEach((glyph, step) => {
        after(index * stagger + step * flipDuration, () => {
          flap(tile, previous, glyph);
          previous = glyph;
          if (step === sequence.length - 1) {
            after(flipDuration, () => settle(tile, glyph));
          }
        });
      });
    };

    const showWord = (word: string) => {
      const next = pad(word, width);
      for (let i = 0; i < width; i += 1) {
        if (current[i] !== next[i]) churn(i, current[i], next[i]);
      }
      current = next;
      if (liveRef.current) liveRef.current.textContent = word;
    };

    // Reduced motion, or a single destination: paint it and stop.
    if (reduceMotion || words.length < 2) {
      tiles.forEach((tile, i) => settle(tile, initial[i] ?? " "));
      return;
    }

    // Only animate while the board is on screen.
    let running = false;
    const tick = () => {
      if (cancelled || !running) return;
      wordIndex = (wordIndex + 1) % words.length;
      showWord(words[wordIndex]);
      after(cycleDelay + width * stagger + flipsPerChar * flipDuration, tick);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !running) {
          running = true;
          after(cycleDelay, tick);
        } else if (!entry.isIntersecting) {
          running = false;
          timers.forEach(clearTimeout);
          timers.clear();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(root);

    return () => {
      cancelled = true;
      observer.disconnect();
      timers.forEach(clearTimeout);
      timers.clear();
      animations.forEach((animation) => animation.cancel());
      animations.clear();
    };
  }, [
    words,
    initial,
    width,
    flipDuration,
    stagger,
    cycleDelay,
    flipsPerChar,
    reduceMotion,
  ]);

  return (
    <span className={`flap-board ${className}`.trim()} ref={rootRef}>
      <span className="flap-board__sr" ref={liveRef}>
        {words[0]}
      </span>
      {Array.from({ length: width }, (_, i) => {
        const glyph = initial[i] === " " ? "\u00A0" : initial[i];
        return (
          <span className="flap" key={i} aria-hidden="true">
            <span className="flap__half flap__half--top" data-part="top">
              <span className="flap__glyph">{glyph}</span>
            </span>
            <span className="flap__half flap__half--bottom" data-part="bottom">
              <span className="flap__glyph">{glyph}</span>
            </span>
            <span className="flap__leaf flap__leaf--front" data-part="leaf-front">
              <span className="flap__glyph">{glyph}</span>
            </span>
            <span className="flap__leaf flap__leaf--back" data-part="leaf-back">
              <span className="flap__glyph">{glyph}</span>
            </span>
          </span>
        );
      })}
    </span>
  );
}

export default SplitFlapBoard;
