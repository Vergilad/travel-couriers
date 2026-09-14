import { LandingSheet } from "@/components/landing/viactor/LandingSheet";
import { ViactorFooter } from "@/components/landing/viactor/ViactorFooter";
import { ViactorNav } from "@/components/landing/viactor/ViactorNav";
import { useColorMode } from "@/hooks/use-color-mode";

/**
 * The public landing page.
 *
 * `data-theme="viactor"` opts this subtree into the design system in
 * `styles/viactor.css`, and `data-mode` selects light or dark within it. The
 * rest of the app still renders on the old tokens until it is migrated too,
 * which is why the theme is scoped here rather than set on `:root`.
 *
 * `Layout` skips its global nav and footer on this route, so the marketing
 * chrome is the only chrome.
 */
export function LandingPage() {
  const { mode, toggle } = useColorMode();

  return (
    <div
      data-theme="viactor"
      data-mode={mode}
      style={{ minHeight: "100dvh", overflowX: "hidden" }}
    >
      {/* Airmail edge, instance one of two on the page. */}
      <div aria-hidden="true" className="airmail" style={{ height: 10 }} />

      <ViactorNav mode={mode} onToggleMode={toggle} />

      <main
        style={{
          maxWidth: 1400,
          margin: "0 auto",
          padding:
            "clamp(1.25rem, 3vw, 2.5rem) clamp(1rem, 3vw, 1.75rem) clamp(3rem, 6vw, 5rem)",
        }}
      >
        <LandingSheet />
      </main>

      <ViactorFooter />
    </div>
  );
}

export default LandingPage;
