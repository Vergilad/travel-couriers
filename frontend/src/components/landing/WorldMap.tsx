import { useEffect, useRef, useState, useMemo } from "react"
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
  frankfurt: [50.1109, 8.6821],
  zurich: [47.3769, 8.5417],
  vienna: [48.2082, 16.3738],
  warsaw: [52.2297, 21.0122],
  stockholm: [59.3293, 18.0686],
  oslo: [59.9139, 10.7522],
  copenhagen: [55.6761, 12.5683],
  lisbon: [38.7223, -9.1393],
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

// ── Equirectangular projection ────────────────────────────────────────────────
const W = 1000
const H = 480

function project(lat: number, lon: number): [number, number] {
  const x = ((lon + 180) / 360) * W
  const y = ((90 - lat) / 180) * H
  return [x, y]
}

// ── Curved arc path between two projected points ─────────────────────────────
function arcPath(from: [number, number], to: [number, number]): string {
  const mx = (from[0] + to[0]) / 2
  const my = (from[1] + to[1]) / 2 - 40 // control point lifted upward
  return `M ${from[0]} ${from[1]} Q ${mx} ${my} ${to[0]} ${to[1]}`
}

// ── Graticule lines (lat/lon grid) ────────────────────────────────────────────
function GraticulePaths() {
  const lines: string[] = []
  // Longitude lines every 30°
  for (let lon = -180; lon <= 180; lon += 30) {
    const [x1] = project(90, lon)
    const [x2] = project(-90, lon)
    const [, y1] = project(90, lon)
    const [, y2] = project(-90, lon)
    lines.push(`M ${x1} ${y1} L ${x2} ${y2}`)
  }
  // Latitude lines every 30°
  for (let lat = -60; lat <= 60; lat += 30) {
    const [x1, y1] = project(lat, -180)
    const [x2, y2] = project(lat, 180)
    lines.push(`M ${x1} ${y1} L ${x2} ${y2}`)
  }
  return (
    <g>
      {lines.map((d, i) => (
        <path key={i} d={d} stroke="#2E2418" strokeWidth={0.5} fill="none" />
      ))}
    </g>
  )
}

// ── Continent outlines (simplified polygon points in lat/lon) ─────────────────
// Coordinates as [lat, lon] pairs, simplified to ~110m resolution silhouettes
const LAND_POLYGONS: [number, number][][] = [
  // North America
  [
    [71, -141], [60, -141], [60, -134], [55, -130], [50, -124], [48, -124],
    [47, -124], [42, -124], [37, -122], [32, -117], [30, -110], [25, -110],
    [23, -106], [20, -105], [18, -104], [15, -90], [8, -83], [8, -77],
    [10, -75], [10, -62], [12, -62], [15, -61], [18, -67], [20, -74],
    [23, -82], [25, -80], [27, -80], [30, -81], [32, -81], [35, -75],
    [40, -74], [41, -70], [43, -70], [45, -67], [47, -53], [50, -56],
    [52, -55], [55, -60], [58, -65], [60, -65], [62, -78], [63, -83],
    [60, -85], [62, -90], [68, -96], [70, -100], [72, -100], [72, -80],
    [73, -70], [75, -75], [78, -90], [82, -90], [83, -60], [80, -65],
    [72, -65], [68, -60], [63, -65], [62, -68], [58, -68], [55, -60],
    [53, -57], [52, -56], [52, -60], [55, -60], [60, -65], [65, -68],
    [68, -68], [71, -141],
  ],
  // Greenland (simplified)
  [
    [60, -45], [65, -52], [70, -55], [75, -60], [80, -65], [83, -45],
    [83, -25], [80, -18], [76, -18], [72, -22], [68, -30], [65, -38],
    [60, -45],
  ],
  // South America
  [
    [12, -72], [10, -62], [8, -60], [5, -55], [4, -52], [3, -51],
    [0, -50], [-5, -35], [-10, -38], [-15, -39], [-20, -41], [-23, -43],
    [-30, -50], [-33, -53], [-35, -58], [-40, -62], [-42, -65], [-45, -65],
    [-50, -69], [-53, -70], [-55, -68], [-55, -65], [-52, -58], [-48, -56],
    [-40, -55], [-35, -52], [-27, -50], [-22, -42], [-15, -39], [-10, -37],
    [-5, -35], [0, -50], [3, -52], [6, -60], [6, -63], [8, -63],
    [10, -62], [10, -72], [12, -72],
  ],
  // Europe (simplified)
  [
    [71, 28], [70, 20], [68, 15], [65, 14], [63, 8], [60, 5], [58, 5],
    [55, 8], [53, 9], [52, 5], [51, 2], [51, 3], [50, 5], [50, 8],
    [47, 8], [46, 10], [44, 12], [41, 14], [38, 15], [37, 15], [36, 13],
    [36, 15], [37, 22], [37, 25], [38, 26], [40, 26], [41, 28], [41, 29],
    [42, 28], [43, 25], [44, 25], [46, 22], [47, 18], [48, 18], [50, 18],
    [52, 23], [54, 18], [55, 21], [56, 21], [57, 24], [58, 25], [59, 26],
    [60, 25], [60, 22], [62, 22], [63, 25], [65, 25], [68, 25], [70, 28],
    [71, 28],
  ],
  // Africa (simplified)
  [
    [37, 42], [37, 36], [35, 33], [30, 32], [27, 34], [22, 37], [18, 39],
    [15, 42], [12, 44], [12, 42], [15, 40], [15, 38], [10, 40], [8, 39],
    [4, 40], [0, 42], [-5, 40], [-8, 35], [-10, 28], [-12, 18], [-15, 12],
    [-15, 8], [-12, 2], [-8, -5], [-5, -10], [-5, -15], [-8, -20],
    [-12, -22], [-18, -22], [-20, -25], [-22, -28], [-27, -33], [-30, -30],
    [-32, -28], [-33, -28], [-32, -18], [-28, -16], [-22, -14], [-18, -12],
    [-13, -15], [-8, -14], [-5, -10], [0, -7], [2, -2], [4, 2], [3, 9],
    [3, 10], [5, 10], [5, 15], [8, 15], [10, 15], [12, 14], [14, 13],
    [15, 15], [18, 15], [22, 15], [22, 22], [22, 37], [30, 32], [35, 36],
    [37, 42],
  ],
  // Russia/Central Asia (simplified)
  [
    [72, 28], [72, 40], [70, 50], [68, 58], [68, 70], [70, 80], [72, 90],
    [72, 100], [70, 110], [68, 120], [68, 140], [65, 160], [62, 165],
    [60, 162], [58, 162], [55, 160], [52, 142], [50, 142], [48, 138],
    [46, 136], [43, 132], [42, 130], [40, 126], [42, 126], [42, 120],
    [40, 116], [40, 110], [42, 104], [42, 96], [40, 96], [38, 90],
    [38, 84], [40, 78], [38, 73], [36, 72], [36, 64], [38, 56], [40, 52],
    [40, 50], [42, 50], [42, 44], [44, 42], [48, 38], [50, 36], [54, 38],
    [55, 38], [55, 40], [58, 46], [60, 60], [60, 70], [60, 80], [62, 86],
    [60, 90], [60, 100], [62, 106], [62, 110], [65, 110], [65, 90],
    [65, 80], [65, 70], [68, 60], [68, 50], [68, 40], [68, 32], [70, 28],
    [72, 28],
  ],
  // Asia (India, Southeast Asia simplified)
  [
    [38, 56], [36, 64], [38, 73], [38, 78], [36, 78], [34, 76], [32, 77],
    [28, 88], [26, 92], [24, 92], [22, 92], [20, 93], [18, 94], [16, 98],
    [14, 98], [10, 100], [5, 103], [1, 103], [-1, 104], [-4, 105],
    [-8, 115], [-8, 125], [-8, 130], [-5, 134], [-2, 132], [0, 128],
    [2, 125], [5, 118], [8, 114], [10, 108], [14, 108], [16, 108],
    [18, 108], [20, 110], [22, 114], [22, 120], [24, 120], [26, 120],
    [28, 122], [30, 122], [32, 120], [35, 120], [35, 116], [38, 110],
    [40, 104], [42, 96], [40, 96], [40, 88], [38, 80], [36, 78],
    [32, 77], [28, 72], [26, 68], [24, 68], [22, 70], [20, 73],
    [18, 74], [16, 74], [14, 74], [10, 76], [8, 78], [8, 80],
    [10, 80], [12, 78], [14, 80], [10, 80], [8, 78], [8, 76],
    [10, 76], [14, 74], [18, 72], [20, 73], [22, 72], [24, 68],
    [26, 64], [28, 62], [30, 62], [32, 62], [34, 60], [36, 56], [38, 56],
  ],
  // Australia (simplified)
  [
    [-15, 130], [-15, 136], [-12, 136], [-12, 142], [-18, 148], [-22, 150],
    [-28, 154], [-34, 152], [-38, 148], [-38, 142], [-36, 140], [-38, 138],
    [-40, 148], [-42, 148], [-43, 146], [-43, 144], [-38, 140], [-34, 136],
    [-32, 132], [-32, 126], [-30, 122], [-26, 114], [-22, 114], [-20, 116],
    [-18, 122], [-16, 122], [-15, 130],
  ],
]

function LandPaths() {
  return (
    <g>
      {LAND_POLYGONS.map((poly, i) => {
        const pts = poly.map(([lat, lon]) => project(lat, lon))
        const d = `M ${pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" L ")} Z`
        return (
          <path
            key={i}
            d={d}
            fill="#1E1608"
            stroke="#2E2418"
            strokeWidth={0.8}
            strokeLinejoin="round"
          />
        )
      })}
    </g>
  )
}

// ── Animated arc + moving courier dot ────────────────────────────────────────
function AnimatedArc({
  from,
  to,
  arcId,
  delay,
}: {
  from: [number, number]
  to: [number, number]
  arcId: string
  delay: number
}) {
  const pathRef = useRef<SVGPathElement>(null)
  const [pathLength, setPathLength] = useState(0)
  const d = arcPath(from, to)
  const pathElemId = `arc-path-${arcId}`

  useEffect(() => {
    if (pathRef.current) setPathLength(pathRef.current.getTotalLength())
  }, [d])

  // Vary travel speed slightly per arc so dots feel independent
  const travelDur = (3.5 + (delay * 7) % 2.5).toFixed(1)

  return (
    <g>
      {/* The arc line */}
      <motion.path
        ref={pathRef}
        id={pathElemId}
        d={d}
        fill="none"
        stroke="#C8956A"
        strokeWidth={1.2}
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 0.5 }}
        transition={{ duration: 1.5, delay, ease: "easeInOut" }}
        style={{ strokeDasharray: pathLength, strokeDashoffset: 0 }}
      />

      {/* Outer glow ring — travels with the dot */}
      <circle r={5} fill="none" stroke="#D4A855" strokeWidth={0.8} opacity={0.35} filter="url(#courier-glow)">
        <animateMotion
          dur={`${travelDur}s`}
          repeatCount="indefinite"
          begin={`${(delay + 1.6).toFixed(1)}s`}
        >
          <mpath href={`#${pathElemId}`} />
        </animateMotion>
      </circle>

      {/* Bright core dot */}
      <circle r={2.8} fill="#F4EDE4" opacity={0.95} filter="url(#courier-glow)">
        <animateMotion
          dur={`${travelDur}s`}
          repeatCount="indefinite"
          begin={`${(delay + 1.6).toFixed(1)}s`}
        >
          <mpath href={`#${pathElemId}`} />
        </animateMotion>
      </circle>
    </g>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
// Default demo routes shown when no real listings are available
const DEMO_ROUTES: Array<{ from: string; to: string }> = [
  { from: "baku", to: "istanbul" },
  { from: "london", to: "paris" },
  { from: "dubai", to: "tbilisi" },
  { from: "toronto", to: "lagos" },
  { from: "amsterdam", to: "barcelona" },
  { from: "singapore", to: "sydney" },
  { from: "tokyo", to: "seoul" },
  { from: "nairobi", to: "cairo" },
]

interface RouteArc {
  id: string
  fromPt: [number, number]
  toPt: [number, number]
}

interface CityDot {
  name: string
  x: number
  y: number
}

export function WorldMap({ listings }: { listings: Listing[] }) {
  const { arcs, cities } = useMemo<{ arcs: RouteArc[]; cities: CityDot[] }>(() => {
    const arcList: RouteArc[] = []
    const cityMap = new Map<string, [number, number]>()

    const routes =
      listings.length > 0
        ? listings.map((l) => ({ from: l.origin_city, to: l.dest_city, id: l.id }))
        : DEMO_ROUTES.map((r, i) => ({ from: r.from, to: r.to, id: String(i) }))

    for (const route of routes) {
      const fromCoords = lookupCoords(route.from)
      const toCoords = lookupCoords(route.to)
      if (fromCoords && toCoords) {
        const fromPt = project(fromCoords[0], fromCoords[1])
        const toPt = project(toCoords[0], toCoords[1])
        arcList.push({ id: route.id, fromPt, toPt })
        cityMap.set(route.from, fromPt)
        cityMap.set(route.to, toPt)
      }
    }

    const cityList: CityDot[] = Array.from(cityMap.entries()).map(([name, [x, y]]) => ({
      name,
      x,
      y,
    }))
    return { arcs: arcList, cities: cityList }
  }, [listings])

  return (
    <section className="relative z-[2] py-16 px-6 md:px-12">
      <div className="max-w-[1400px] mx-auto">
        {/* Header */}
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
          className="relative rounded-md overflow-hidden border border-[#2E2418]"
          style={{ background: "#0A0806" }}
        >
          {/* Edge vignette */}
          <div
            className="absolute inset-0 pointer-events-none z-10 rounded-md"
            style={{
              background:
                "radial-gradient(ellipse at center, transparent 55%, rgba(10,8,6,0.85) 100%)",
            }}
          />

          {/* Scan line overlay */}
          <div
            className="absolute inset-0 pointer-events-none z-[11] opacity-[0.025]"
            style={{
              backgroundImage: "linear-gradient(rgba(212,168,85,1) 1px, transparent 1px)",
              backgroundSize: "100% 3px",
            }}
          />

          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full h-auto"
            style={{ display: "block" }}
          >
            <defs>
              <filter id="courier-glow" x="-80%" y="-80%" width="260%" height="260%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Ocean background */}
            <rect width={W} height={H} fill="#0A0806" />

            {/* Graticule */}
            <GraticulePaths />

            {/* Land */}
            <LandPaths />

            {/* Equator emphasis */}
            <line
              x1={0}
              y1={H / 2}
              x2={W}
              y2={H / 2}
              stroke="#2E2418"
              strokeWidth={1}
            />

            {/* Animated route arcs + courier dots */}
            {arcs.map((arc, idx) => (
              <AnimatedArc
                key={arc.id}
                arcId={arc.id}
                from={arc.fromPt}
                to={arc.toPt}
                delay={idx * 0.18}
              />
            ))}

            {/* City pulse rings */}
            {cities.map((city) => (
              <g key={city.name}>
                <motion.circle
                  cx={city.x}
                  cy={city.y}
                  r={6}
                  fill="none"
                  stroke="#C8956A"
                  strokeWidth={0.6}
                  initial={{ opacity: 0.4, scale: 1 }}
                  animate={{ opacity: 0, scale: 2.5 }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 1.5 }}
                  style={{ transformOrigin: `${city.x}px ${city.y}px` }}
                />
                <circle
                  cx={city.x}
                  cy={city.y}
                  r={2.5}
                  fill="#C8956A"
                />
              </g>
            ))}
          </svg>
        </div>

        {/* Footer label */}
        <p
          className="text-center mt-4 text-[10px] text-[#3A2E20] tracking-widest"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          EQUIRECTANGULAR PROJECTION · SOLARI-TRX ROUTE INTELLIGENCE
        </p>
      </div>
    </section>
  )
}
