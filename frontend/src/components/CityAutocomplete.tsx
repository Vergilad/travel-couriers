import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"

interface CityResult {
  city: string
  country: string
  countryCode: string
}

async function searchCities(query: string): Promise<CityResult[]> {
  if (query.length < 2) return []
  try {
    const res = await fetch(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=7&layer=city`
    )
    if (!res.ok) return []
    const data = await res.json()
    const seen = new Set<string>()
    const results: CityResult[] = []
    for (const f of data.features ?? []) {
      const p = f.properties
      const city: string = p.name ?? p.city ?? ""
      const country: string = p.country ?? ""
      const countryCode: string = p.countrycode?.toUpperCase() ?? ""
      if (!city || !country) continue
      const key = `${city}|${countryCode}`
      if (seen.has(key)) continue
      seen.add(key)
      results.push({ city, country, countryCode })
    }
    return results
  } catch {
    return []
  }
}

interface CityAutocompleteProps {
  label?: string
  value: string
  onSelect: (city: string, country: string) => void
  onChange?: (raw: string) => void
  onClear?: () => void
  placeholder?: string
  required?: boolean
  compact?: boolean
}

export function CityAutocomplete({
  label, value, onSelect, onChange, onClear, placeholder, required, compact,
}: CityAutocompleteProps) {
  const [inputValue, setInputValue] = React.useState(value)
  const [results, setResults] = React.useState<CityResult[]>([])
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [activeIndex, setActiveIndex] = React.useState(-1)
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    setInputValue(value)
  }, [value])

  React.useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (inputValue.length < 2) { setResults([]); setOpen(false); return }
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      const r = await searchCities(inputValue)
      setResults(r)
      setOpen(r.length > 0)
      setActiveIndex(-1)
      setLoading(false)
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [inputValue])

  React.useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", onClickOutside)
    return () => document.removeEventListener("mousedown", onClickOutside)
  }, [])

  function handleChange(raw: string) {
    setInputValue(raw)
    onChange?.(raw)
    if (!raw && onClear) onClear()
  }

  function handleSelect(r: CityResult) {
    setInputValue(r.city)
    onSelect(r.city, r.country)
    onChange?.(r.city)
    setOpen(false)
    setResults([])
    inputRef.current?.blur()
  }

  function handleClear() {
    setInputValue("")
    onChange?.("")
    onClear?.()
    setResults([])
    setOpen(false)
    inputRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) return
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, results.length - 1)) }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)) }
    else if (e.key === "Enter" && activeIndex >= 0) { e.preventDefault(); handleSelect(results[activeIndex]) }
    else if (e.key === "Escape") { setOpen(false); inputRef.current?.blur() }
  }

  const py = compact ? "py-2" : "py-3"

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="block text-[10px] tracking-[0.18em] text-[#8C7B68] mb-1.5 uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          {label}{required && <span className="text-[#C8956A] ml-1">*</span>}
        </label>
      )}
      <div className="relative group">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#C8956A]/50 select-none pointer-events-none text-[11px]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>›</span>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={e => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (results.length > 0) setOpen(true) }}
          placeholder={placeholder}
          required={required}
          autoComplete="off"
          spellCheck={false}
          className={`w-full bg-[#111008] border border-[#2E2418] focus:border-[#C8956A]/60 focus:outline-none text-[#F4EDE4] placeholder-[#3A2E20] rounded-sm ${py} pl-8 pr-8 text-[12px] transition-colors`}
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2">
            <svg className="animate-spin h-3 w-3 text-[#C8956A]/60" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          </span>
        )}
        {!loading && inputValue && (
          <button
            type="button"
            onMouseDown={e => { e.preventDefault(); handleClear() }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-[#8C7B68] hover:text-[#F4EDE4] opacity-0 group-focus-within:opacity-100 hover:opacity-100 transition-opacity"
            tabIndex={-1}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3 h-3">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>

      <AnimatePresence>
        {open && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.1 }}
            className="absolute z-[100] left-0 right-0 mt-1 bg-[#171109] border border-[#2E2418] rounded-sm shadow-xl overflow-hidden"
          >
            {results.map((r, i) => (
              <button
                key={`${r.city}-${r.countryCode}-${i}`}
                type="button"
                onMouseDown={() => handleSelect(r)}
                className={`w-full text-left px-4 py-2.5 flex items-center justify-between gap-3 transition-colors border-b border-[#1A1208] last:border-0 ${i === activeIndex ? "bg-[#C8956A]/10" : "hover:bg-[#1F1810]"}`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[13px] text-[#F4EDE4] truncate">{r.city}</span>
                  <span className="text-[11px] text-[#8C7B68] shrink-0">{r.country}</span>
                </div>
                <span className="text-[10px] text-[#C8956A]/60 shrink-0 tracking-widest" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  {r.countryCode}
                </span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
