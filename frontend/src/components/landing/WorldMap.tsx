import { useEffect, useState, useMemo } from "react"
import { motion } from "framer-motion"
import type { Listing } from "@/types/listing"

// ── City coordinate lookup (lat, lon) ────────────────────────────────────────
const CITY_COORDS: Record<string, [number, number]> = {
  london: [51.5074, -0.1278],
  paris: [48.8566, 2.3522],
  istanbul: [41.0082, 28.9784],
  dubai: [25.2048, 55.2708],
  tokyo: [35.6762, 139.6503],
  singapore: [1.3521, 103.8198],
  sydney: [-33.8688, 151.2093],
  "new york": [40.7128, -74.006],
  toronto: [43.6532, -79.3832],
  baku: [40.4093, 49.8671],
  tbilisi: [41.6938, 44.8015],
  lagos: [6.5244, 3.3792],
  nairobi: [-1.2921, 36.8219],
  cairo: [30.0444, 31.2357],
  amsterdam: [52.3676, 4.9041],
  barcelona: [41.3851, 2.1734],
  seoul: [37.5665, 126.978],
  mumbai: [19.076, 72.8777],
  "los angeles": [34.0522, -118.2437],
  "mexico city": [19.4326, -99.1332],
  "sao paulo": [-23.5505, -46.6333],
  "buenos aires": [-34.6037, -58.3816],
  johannesburg: [-26.2041, 28.0473],
  casablanca: [33.5731, -7.5898],
  athens: [37.9838, 23.7275],
  berlin: [52.52, 13.405],
  moscow: [55.7558, 37.6173],
  delhi: [28.6139, 77.209],
  beijing: [39.9042, 116.4074],
  shanghai: [31.2304, 121.4737],
  "hong kong": [22.3193, 114.1694],
  bangkok: [13.7563, 100.5018],
  jakarta: [-6.2088, 106.8456],
  karachi: [24.8607, 67.0011],
  "cape town": [-33.9249, 18.4241],
  miami: [25.7617, -80.1918],
  chicago: [41.8781, -87.6298],
  madrid: [40.4168, -3.7038],
  rome: [41.9028, 12.4964],
  doha: [25.2854, 51.531],
  riyadh: [24.7136, 46.6753],
  tehran: [35.6892, 51.389],
  "kuala lumpur": [3.139, 101.6869],
  manila: [14.5995, 120.9842],
  lima: [-12.0464, -77.0428],
  bogota: [4.711, -74.0721],
  "addis ababa": [9.032, 38.7469],
  accra: [5.6037, -0.187],
  vancouver: [49.2827, -123.1207],
  montreal: [45.5017, -73.5673],
}

function lookupCoords(city: string): [number, number] | null {
  return CITY_COORDS[city.toLowerCase().trim()] ?? null
}

// ── Projection (equirectangular) ──────────────────────────────────────────────
const W = 1000
const H = 480

function project(lat: number, lon: number): [number, number] {
  return [((lon + 180) / 360) * W, ((90 - lat) / 180) * H]
}

// ── Very subtle graticule ─────────────────────────────────────────────────────
function Graticule() {
  const lines: string[] = []
  for (let lon = -180; lon <= 180; lon += 30) {
    const [x] = project(0, lon)
    lines.push(`M ${x.toFixed(0)} 0 L ${x.toFixed(0)} ${H}`)
  }
  for (let lat = -60; lat <= 60; lat += 30) {
    const [, y] = project(lat, 0)
    lines.push(`M 0 ${y.toFixed(0)} L ${W} ${y.toFixed(0)}`)
  }
  return (
    <g>
      {lines.map((d, i) => (
        <path key={i} d={d} stroke="#16100A" strokeWidth={0.6} fill="none" />
      ))}
    </g>
  )
}

// ── TopoJSON decoder ──────────────────────────────────────────────────────────
interface TopoJSON {
  transform: { scale: [number, number]; translate: [number, number] }
  arcs: [number, number][][]
  objects: {
    land: {
      type: string
      geometries: Array<{
        type: "Polygon" | "MultiPolygon"
        arcs: number[][] | number[][][]
      }>
    }
  }
}

function decodeArcs(topo: TopoJSON): [number, number][][] {
  const { scale, translate } = topo.transform
  return topo.arcs.map((arc) => {
    let x = 0, y = 0
    return arc.map(([dx, dy]) => {
      x += dx; y += dy
      return [x * scale[0] + translate[0], y * scale[1] + translate[1]] as [number, number]
    })
  })
}

function getArc(decoded: [number, number][][], i: number): [number, number][] {
  return i < 0 ? [...decoded[~i]].reverse() : decoded[i]
}

function makeRing(decoded: [number, number][][], refs: number[]): [number, number][] {
  const pts: [number, number][] = []
  for (const ref of refs) {
    const arc = getArc(decoded, ref)
    pts.push(...(pts.length ? arc.slice(1) : arc))
  }
  return pts
}

/**
 * Build land SVG path, aggressively skipping nearby points.
 * minDist=10 keeps recognisable continents but tosses fine coastline detail.
 */
function buildLandPath(topo: TopoJSON, minDist = 10): string {
  const decoded = decodeArcs(topo)
  const parts: string[] = []

  for (const geom of topo.objects.land.geometries) {
    const polygons =
      geom.type === "Polygon"
        ? [geom.arcs as number[][]]
        : (geom.arcs as number[][][])

    for (const polygon of polygons) {
      for (const ring of polygon) {
        const raw = makeRing(decoded, ring)
        const pts: [number, number][] = []

        for (const [lon, lat] of raw) {
          const pt = project(lat, lon)
          if (!pts.length || Math.hypot(pt[0] - pts[pts.length - 1][0], pt[1] - pts[pts.length - 1][1]) >= minDist) {
            pts.push(pt)
          }
        }
        if (pts.length < 3) continue
        parts.push("M " + pts.map(([x, y]) => `${x.toFixed(0)},${y.toFixed(0)}`).join(" L ") + " Z")
      }
    }
  }

  return parts.join(" ")
}

// ── Arc geometry ──────────────────────────────────────────────────────────────
function arcPath(from: [number, number], to: [number, number]): string {
  const mx = (from[0] + to[0]) / 2
  const dist = Math.hypot(to[0] - from[0], to[1] - from[1])
  const lift = Math.min(72, dist * 0.42)
  const my = (from[1] + to[1]) / 2 - lift
  return `M ${from[0]} ${from[1]} Q ${mx} ${my} ${to[0]} ${to[1]}`
}

// ── Animated arc ─────────────────────────────────────────────────────────────
// Key insight: the STATIC path (no Framer Motion) is the mpath reference,
// so animateMotion never sees stroke-dasharray mutations → zero jitter.
function AnimatedArc({
  from, to, arcId, delay,
}: {
  from: [number, number]; to: [number, number]; arcId: string; delay: number
}) {
  const d = arcPath(from, to)
  const refId = `ar-${arcId}`           // stable, static path for mpath
  const dur = `${(3.8 + (delay * 9) % 2.8).toFixed(1)}s`
  const begin = `${(delay + 1.8).toFixed(1)}s`

  return (
    <g>
      {/* ① Static invisible path — only used as <mpath> geometry reference */}
      <path id={refId} d={d} fill="none" stroke="none" />

      {/* ② Framer Motion animates ONLY this visual path — separate from ref */}
      <motion.path
        d={d}
        fill="none"
        stroke="#C8956A"
        strokeWidth={0.9}
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 0.38 }}
        transition={{ duration: 2, delay, ease: [0.4, 0, 0.6, 1] }}
      />

      {/* ③ Moving glow halo — travels on static ref path, no filters */}
      <circle r={4.5} fill="none" stroke="#D4A855" strokeWidth={0.7} opacity={0}>
        <animate attributeName="opacity" values="0.35;0.35" dur={dur} repeatCount="indefinite" begin={begin} />
        <animateMotion dur={dur} repeatCount="indefinite" begin={begin} calcMode="linear">
          <mpath href={`#${refId}`} />
        </animateMotion>
      </circle>

      {/* ④ Moving core dot — no filters → no repaint glitches */}
      <circle r={2.2} fill="#F4EDE4" opacity={0.9}>
        <animateMotion dur={dur} repeatCount="indefinite" begin={begin} calcMode="linear">
          <mpath href={`#${refId}`} />
        </animateMotion>
      </circle>
    </g>
  )
}

// ── Default demo routes ────────────────────────────────────────────────────────
const DEMO_ROUTES = [
  { from: "baku", to: "istanbul" },
  { from: "london", to: "paris" },
  { from: "dubai", to: "tbilisi" },
  { from: "toronto", to: "lagos" },
  { from: "amsterdam", to: "barcelona" },
  { from: "singapore", to: "sydney" },
  { from: "tokyo", to: "seoul" },
  { from: "nairobi", to: "cairo" },
]

interface RouteArc { id: string; fromPt: [number, number]; toPt: [number, number] }
interface CityDot { name: string; x: number; y: number }

// ── Main component ────────────────────────────────────────────────────────────
export function WorldMap({ listings }: { listings: Listing[] }) {
  const [landPath, setLandPath] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/land-110m.json")
      .then(r => r.json())
      .then((topo: TopoJSON) => {
        if (!cancelled) setLandPath(buildLandPath(topo, 10))
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const { arcs, cities } = useMemo<{ arcs: RouteArc[]; cities: CityDot[] }>(() => {
    const arcList: RouteArc[] = []
    const cityMap = new Map<string, [number, number]>()

    const routes = listings.length > 0
      ? listings.map(l => ({ from: l.origin_city, to: l.dest_city, id: l.id }))
      : DEMO_ROUTES.map((r, i) => ({ ...r, id: String(i) }))

    for (const route of routes) {
      const fc = lookupCoords(route.from)
      const tc = lookupCoords(route.to)
      if (fc && tc) {
        const fromPt = project(fc[0], fc[1])
        const toPt = project(tc[0], tc[1])
        arcList.push({ id: route.id, fromPt, toPt })
        cityMap.set(route.from, fromPt)
        cityMap.set(route.to, toPt)
      }
    }

    return {
      arcs: arcList,
      cities: Array.from(cityMap.entries()).map(([name, [x, y]]) => ({ name, x, y })),
    }
  }, [listings])

  return (
    <section className="relative z-[2] py-16 px-6 md:px-12">
      <div className="max-w-[1400px] mx-auto">
        {/* Label */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-1.5 h-1.5 rounded-full bg-[#D4A855] animate-pulse" />
          <span
            className="text-[11px] tracking-[0.2em] text-[#8C7B68]"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            LIVE ROUTE NETWORK · {arcs.length} ACTIVE CORRIDORS · {cities.length} CITIES
          </span>
        </div>

        {/* Map */}
        <div
          className="relative rounded-lg overflow-hidden"
          style={{ background: "#060504", boxShadow: "0 0 0 1px rgba(46,36,24,0.5)" }}
        >
          {/* Vignette */}
          <div
            className="absolute inset-0 pointer-events-none z-10 rounded-lg"
            style={{
              background: "radial-gradient(ellipse at center, transparent 35%, rgba(6,5,4,0.92) 100%)",
            }}
          />

          <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto block">
            <defs>
              {/*
               * Land glow: two-pass — blurred copy behind for soft glow,
               * sharp(er) copy in front. Gives the "illuminated from within" feel.
               */}
              <filter id="land-glow" x="-8%" y="-8%" width="116%" height="116%">
                <feGaussianBlur stdDeviation="5" />
              </filter>
            </defs>

            {/* Ocean */}
            <rect width={W} height={H} fill="#060504" />

            {/* Graticule */}
            <Graticule />

            {landPath && (
              <>
                {/* Glow bloom under continents */}
                <path
                  d={landPath}
                  fill="rgba(200,149,106,0.12)"
                  stroke="none"
                  filter="url(#land-glow)"
                />
                {/* Main landmass — simplified + softened with a touch of blur in CSS */}
                <path
                  d={landPath}
                  fill="#1A1208"
                  stroke="#251B0A"
                  strokeWidth={0.7}
                  strokeLinejoin="round"
                  style={{ filter: "blur(0.8px)" }}
                />
              </>
            )}

            {/* Equator */}
            <line x1={0} y1={H / 2} x2={W} y2={H / 2} stroke="#1E1408" strokeWidth={0.8} />

            {/* Arcs + courier dots */}
            {arcs.map((arc, idx) => (
              <AnimatedArc
                key={arc.id}
                arcId={arc.id}
                from={arc.fromPt}
                to={arc.toPt}
                delay={idx * 0.2}
              />
            ))}

            {/* City dots — pure SMIL, no Framer Motion, no filters */}
            {cities.map(city => (
              <g key={city.name}>
                {/* Pulse ring */}
                <circle cx={city.x} cy={city.y} r={2} fill="none" stroke="#C8956A" strokeWidth={0.8}>
                  <animate
                    attributeName="r"
                    from="2" to="16"
                    dur="2.6s"
                    repeatCount="indefinite"
                    calcMode="spline"
                    keyTimes="0;1"
                    keySplines="0.15 0 0.85 1"
                  />
                  <animate
                    attributeName="opacity"
                    from="0.55" to="0"
                    dur="2.6s"
                    repeatCount="indefinite"
                    calcMode="spline"
                    keyTimes="0;1"
                    keySplines="0.15 0 0.85 1"
                  />
                </circle>
                {/* Core */}
                <circle cx={city.x} cy={city.y} r={2} fill="#C8956A" opacity={0.8} />
                <circle cx={city.x} cy={city.y} r={1} fill="#F4EDE4" opacity={0.95} />
              </g>
            ))}
          </svg>
        </div>

        <p
          className="text-center mt-4 text-[10px] text-[#1E1408] tracking-widest"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          NATURAL EARTH · SOLARI-TRX ROUTE NETWORK
        </p>
      </div>
    </section>
  )
}
