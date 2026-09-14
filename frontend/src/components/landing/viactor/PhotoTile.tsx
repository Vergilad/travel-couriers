/**
 * A photo field on the sheet.
 *
 * The caption sits in its own strip below the image, cut off by a hard rule,
 * never printed on top of the photograph. Labels overlaid on images are one of
 * the AI tells the taste rules call out, and on a photo they also cost a scrim
 * that flattens whatever made the picture worth using.
 *
 * The photographs are shown untreated. A teal duotone read as "processed
 * luxury brand", which is the opposite of what this product is.
 *
 * A photo never sets its own height from the image file. The frame is an
 * absolutely-positioned window, so the fields of the form decide the grid's
 * row heights and the pictures fill whatever they are given. Letting the
 * images size themselves was what left three hundred pixels of empty teal
 * beside the handover photograph. The frame's `aspect-ratio` also reserves the
 * space before the file lands, so a photo arriving never shifts the page.
 *
 * Bytes: a photo field is at most half of a 1400px sheet, so the largest
 * useful file is 1600px wide, and on a phone it is 800. The originals are
 * 3-6k pixels across and several megabytes each, which is the single worst
 * performance defect a page like this can have. `scripts/optimize-images.py`
 * emits AVIF, WebP and JPEG at both widths under a slug, and this component
 * declares them so the browser takes the smallest format it understands at
 * the width it actually needs.
 */
import { SheetTile, type TileSpan } from "@/components/ui/sheet-grid";

/** Widths emitted by the image pipeline. Keep in step with WIDTHS there. */
const WIDTHS = [800, 1600] as const;

const srcSet = (slug: string, ext: string) =>
  WIDTHS.map((w) => `/images/${slug}-${w}.${ext} ${w}w`).join(", ");

export function PhotoTile({
  slug,
  alt,
  caption,
  span = 1,
  rows = 1,
  /** CSS object-position, to keep the subject in frame as the tile reflows. */
  focal = "50% 50%",
  /**
   * Renders the field as a wide strip instead of a block. The page needs one
   * field that is a band, and a photograph is what a band can honestly hold.
   */
  band = false,
  /** Above-the-fold photos must not be lazy, or they arrive after the paint. */
  priority = false,
}: {
  /** Basename written by the image pipeline, e.g. "handover". */
  slug: string;
  alt: string;
  /** One functional line in the mono voice. Usually a route or a plain fact. */
  caption?: string;
  span?: TileSpan;
  rows?: 1 | 2;
  focal?: string;
  band?: boolean;
  priority?: boolean;
}) {
  // Below 1024px every photo field is the full column width; above it, the
  // field is its share of the 1400px sheet. A four-column field is the whole
  // sheet, so telling the browser 700px there would have it pick the 800w file
  // and upscale it across 1344 real pixels.
  const sizes =
    span === 4
      ? "(max-width: 1439px) 100vw, 1400px"
      : span >= 2
        ? "(max-width: 1023px) 100vw, 700px"
        : "(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 350px";

  return (
    <SheetTile span={span} rows={rows} flush>
      <span className={band ? "photo-frame photo-frame--band" : "photo-frame"}>
        <picture>
          <source type="image/avif" srcSet={srcSet(slug, "avif")} sizes={sizes} />
          <source type="image/webp" srcSet={srcSet(slug, "webp")} sizes={sizes} />
          <img
            src={`/images/${slug}-1600.jpg`}
            srcSet={srcSet(slug, "jpg")}
            sizes={sizes}
            alt={alt}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            decoding="async"
            style={{ objectPosition: focal }}
          />
        </picture>
      </span>

      {caption && (
        <p
          className="font-label"
          style={{
            margin: 0,
            flexShrink: 0,
            padding: "10px var(--tile-pad)",
            borderTop: "var(--bw) solid var(--line)",
            background: "var(--sheet)",
            color: "var(--text-muted)",
          }}
        >
          {caption}
        </p>
      )}
    </SheetTile>
  );
}

export default PhotoTile;
