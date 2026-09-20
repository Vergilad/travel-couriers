/**
 * Shared chrome for the marketing pages that are not the landing itself.
 *
 * The landing owns its chrome inline because it is the only marketing page
 * there was. Once How it works and Safety moved onto their own routes, three
 * pages needed the same shell: one airmail edge, ViactorNav, the 1400px
 * sheet column, ViactorFooter. This component is that shell, so the pages
 * cannot drift into three different paddings.
 */
import type { ReactNode } from "react";

import { useColorMode } from "@/hooks/use-color-mode";
import { ViactorNav } from "@/components/landing/viactor/ViactorNav";
import { ViactorFooter } from "@/components/landing/viactor/ViactorFooter";

export function MarketingChrome({ children }: { children: ReactNode }) {
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
        {children}
      </main>

      <ViactorFooter />
    </div>
  );
}

export default MarketingChrome;
