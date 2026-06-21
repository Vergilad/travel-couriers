import { Button } from "./components/ui/button"
import { Input } from "./components/ui/input"

export default function App() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-border backdrop-blur bg-background/80">
        <nav className="flex items-center justify-between px-6 py-4">
          <h1 className="font-heading text-lg">Travel-Couriers</h1>
          <div className="flex gap-4">
            <Button variant="outline" size="sm">Sign in</Button>
            <Button size="sm">Browse</Button>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative px-6 py-24 lg:py-32">
        <div className="max-w-2xl">
          <h1 className="font-heading text-4xl lg:text-5xl mb-4">
            Ship anything, anywhere.
          </h1>
          <p className="text-text-muted text-lg mb-8 leading-relaxed">
            A peer-to-peer marketplace where travelers carry what people need,
            and senders get items delivered affordably.
          </p>
          <Button size="lg">Explore listings</Button>
        </div>
      </section>

      {/* Design tokens showcase */}
      <section className="border-t border-border px-6 py-16 bg-surface">
        <div className="max-w-4xl">
          <h2 className="font-heading text-2xl mb-8">Design System</h2>

          {/* Colors */}
          <div className="mb-12">
            <h3 className="font-label text-sm mb-4">Palette</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg bg-bg border border-border p-4">
                <div className="text-xs font-data mb-2">--bg</div>
                <div className="text-xs text-text-muted">#0D0B09</div>
              </div>
              <div className="rounded-lg bg-surface border border-border p-4">
                <div className="text-xs font-data mb-2">--surface</div>
                <div className="text-xs text-text-muted">#151210</div>
              </div>
              <div className="rounded-lg bg-accent border border-border p-4">
                <div className="text-xs font-data mb-2">--accent</div>
                <div className="text-xs text-bg">#C47B22</div>
              </div>
              <div className="rounded-lg bg-success border border-border p-4">
                <div className="text-xs font-data mb-2">--success</div>
                <div className="text-xs text-bg">#4E8A5E</div>
              </div>
            </div>
          </div>

          {/* Typography */}
          <div className="mb-12">
            <h3 className="font-label text-sm mb-4">Typography</h3>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-data mb-2">Fraunces Display (Headlines)</p>
                <h2 className="font-heading text-2xl">Plan your next journey</h2>
              </div>
              <div>
                <p className="text-xs font-data mb-2">Inter Body (15px)</p>
                <p>Every trip is an opportunity to deliver something meaningful for someone else.</p>
              </div>
              <div>
                <p className="text-xs font-data mb-2">JetBrains Mono (Data)</p>
                <p className="font-data">LONDON → ISTANBUL · 24 MAY · 40 KG</p>
              </div>
            </div>
          </div>

          {/* Components */}
          <div className="space-y-4">
            <h3 className="font-label text-sm">Components</h3>
            <div className="flex flex-wrap gap-2">
              <Button>Primary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
            </div>
            <Input placeholder="Placeholder text" />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-8 text-text-muted text-sm">
        <p>Travel-Couriers · Step 4 complete</p>
      </footer>
    </div>
  )
}
