/**
 * Which in-page section the reader is currently looking at, for the nav to
 * mark. Without this, the marketing nav offers three anchors and never says
 * which one you are standing on.
 *
 * Deliberately an IntersectionObserver and not a scroll listener: a `scroll`
 * handler runs on the main thread on every frame of every scroll, and this
 * needs to know about three elements crossing one line.
 *
 * That line is the middle of the viewport. A section counts as current while
 * it straddles the midpoint, which is why the observer's root is inset 45% at
 * the top and bottom: it collapses the root to a horizontal band, and the id
 * reported is whichever section is in that band.
 *
 * The band can hold nothing at all (the top of the page is above the first
 * section), so the set of straddling sections is tracked rather than the last
 * one seen. Reporting the last one seen would leave the first anchor marked
 * current while the reader is still looking at the hero.
 */
import { useEffect, useState } from "react";

export function useActiveSection(ids: readonly string[]): string | null {
  const [active, setActive] = useState<string | null>(null);

  // `ids` is a literal array at every call site, so a new array identity each
  // render would re-subscribe forever. The joined string is the real dependency.
  const key = ids.join(",");

  useEffect(() => {
    const sections = key
      .split(",")
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => element !== null);

    if (sections.length === 0) return;

    const order = sections.map((section) => section.id);
    const straddling = new Set<string>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) straddling.add(entry.target.id);
          else straddling.delete(entry.target.id);
        }
        // Document order, so two sections meeting in the band resolve upward
        // instead of to whichever one the observer happened to report last.
        setActive(order.find((id) => straddling.has(id)) ?? null);
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );

    for (const section of sections) observer.observe(section);
    return () => observer.disconnect();
  }, [key]);

  return active;
}
