import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function App() {
  return (
    <div className="min-h-screen bg-bg text-text">
      <header className="h-16 border-b border-border bg-surface">
        <nav className="mx-auto flex h-full max-w-5xl items-center justify-between px-6">
          <span className="font-heading text-[32px] leading-none">Travel-Couriers</span>
          <div className="flex items-center gap-6">
            <a href="#" className="font-label text-text-muted hover:opacity-85">
              Browse
            </a>
            <Button size="sm">Sign in</Button>
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-16">
        <p className="font-label mb-4 text-text-muted">Design system · step 4</p>
        <h1 className="mb-6 max-w-2xl">Carry something worth bringing home.</h1>
        <p className="mb-10 max-w-xl text-text-muted">
          Warm dark palette, editorial headlines, monospace route data — no card grids.
        </p>

        <section className="mb-16 border border-border bg-surface p-6">
          <div className="mb-4 grid grid-cols-[48px_1fr_96px_80px_64px] gap-4 border-b border-border pb-3 font-label text-text-muted">
            <span>#</span>
            <span>Route</span>
            <span>Date</span>
            <span>Price</span>
            <span>Kg</span>
          </div>
          <ul className="divide-y divide-border">
            {[
              { route: "BAKU → DUBAI", date: "12 Jul", price: "€45", kg: "5" },
              { route: "LONDON → PARIS", date: "18 Jul", price: "£30", kg: "3" },
              { route: "TOKYO → SEOUL", date: "02 Aug", price: "¥4000", kg: "8" },
            ].map((row, i) => (
              <li
                key={row.route}
                className="grid grid-cols-[48px_1fr_96px_80px_64px] items-center gap-4 py-4"
              >
                <span className="font-data text-text-faint">{String(i + 1).padStart(2, "0")}</span>
                <span className="font-data">{row.route}</span>
                <span className="font-data">{row.date}</span>
                <span className="font-data">{row.price}</span>
                <span className="font-data">{row.kg}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="flex flex-wrap items-end gap-4">
          <div className="min-w-[240px] flex-1">
            <label className="font-label mb-2 block text-text-muted" htmlFor="search">
              Search route
            </label>
            <Input id="search" placeholder="Origin or destination" />
          </div>
          <Button>Primary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
        </section>
      </main>
    </div>
  )
}
