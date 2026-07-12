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
  strict?: boolean
}

export function CityAutocomplete({
  label, value, onSelect, onChange, onClear, placeholder, required, compact, strict = true,
}: CityAutocompleteProps) {
  const [inputValue, setInputValue] = React.useState(value)
  const [results, setResults] = React.useState<CityResult[]>([])
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [activeIndex, setActiveIndex] = React.useState(-1)
  const [confirmed, setConfirmed] = React.useState(!!value)
  const [touched, setTouched] = React.useState(false)
  const [focused, setFocused] = React.useState(false)
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const lastEmittedRef = React.useRef(value)

  React.useEffect(() => {
    if (value === lastEmittedRef.current) return
    lastEmittedRef.current = value
    setInputValue(value)
    setConfirmed(!!value)
  }, [value])

  React.useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (inputValue.length < 2) { setResults([]); setOpen(false); return }
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      const r = await searchCities(inputValue)
      setResults(r)
      setOpen(r.length > 0)
      setActiveIndex(r.length > 0 ? 0 : -1)
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
    setConfirmed(false)
    lastEmittedRef.current = raw
    onChange?.(raw)
    if (!raw && onClear) onClear()
  }

  function handleSelect(r: CityResult) {
    setInputValue(r.city)
    setConfirmed(true)
    setTouched(false)
    setOpen(false)
    setResults([])
    lastEmittedRef.current = r.city
    onSelect(r.city, r.country)
    onChange?.(r.city)
  }

  function handleBlur() {
    setFocused(false)
    setTouched(true)
    if (!strict) return
    if (!confirmed) {
      if (value) {
        setInputValue(value)
      } else {
        setInputValue("")
        lastEmittedRef.current = ""
        onClear?.()
      }
    }
  }

  function handleClear() {
    setInputValue("")
    setConfirmed(false)
    lastEmittedRef.current = ""
    onChange?.("")
    onClear?.()
    setResults([])
    setOpen(false)
    inputRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown" && open) {
      e.preventDefault(); setActiveIndex(i => Math.min(i + 1, results.length - 1))
    } else if (e.key === "ArrowUp" && open) {
      e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0))
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (open && activeIndex >= 0 && results[activeIndex]) {
        handleSelect(results[activeIndex])
      } else if (strict && !confirmed) {
        if (value) { setInputValue(value) } else {
          setInputValue("")
          lastEmittedRef.current = ""
          onClear?.()
        }
        setOpen(false)
      } else {
        setOpen(false)
      }
    } else if (e.key === "Escape") {
      setOpen(false); inputRef.current?.blur()
    }
  }

  const isInvalid = strict && touched && !confirmed
  const py = compact ? "py-2" : "py-3"

  // Derive border color based on state
  const borderColor = isInvalid
    ? "var(--destructive)"
    : focused
    ? "var(--accent)"
    : "var(--border)"

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="block font-mono text-[10px] tracking-[0.18em] mb-1.5 uppercase" style={{ color: "var(--text-muted)" }}>
          {label}{required && <span style={{ color: "var(--destructive)" }} className="ml-1">*</span>}
        </label>
      )}
      <div className="relative group">
        <span
          className="absolute left-3 top-1/2 -translate-y-1/2 select-none pointer-events-none font-mono text-[11px]"
          style={{ color: "var(--text-muted)" }}
        >
          ›
        </span>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={e => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            setFocused(true)
            if (results.length > 0) setOpen(true)
          }}
          onBlur={handleBlur}
          placeholder={placeholder}
          required={required}
          aria-label={label ?? placeholder}
          autoComplete="off"
          spellCheck={false}
          className={`w-full font-mono ${py} pl-8 pr-8 text-[12px] transition-all duration-150 rounded-sm outline-none`}
          style={{
            background: "var(--surface)",
            border: `1px solid ${borderColor}`,
            color: "var(--text)",
            caretColor: "var(--accent)",
          }}
        />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2">
            <svg className="animate-spin h-3 w-3" style={{ color: "var(--text-muted)" }} viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          </span>
        )}
        {!loading && inputValue && (
          <button
            type="button"
            aria-label="Clear city"
            onMouseDown={e => { e.preventDefault(); handleClear() }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center opacity-0 group-focus-within:opacity-100 hover:opacity-100 transition-opacity"
            style={{ color: "var(--text-muted)" }}
            tabIndex={-1}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3 h-3">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>

      {isInvalid && inputValue && (
        <p className="mt-1.5 font-mono text-[10px] tracking-wider" style={{ color: "var(--destructive)" }}>
          PICK A CITY FROM THE LIST
        </p>
      )}

      <AnimatePresence>
        {open && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.1 }}
            className="absolute z-[100] left-0 right-0 mt-1 rounded-sm shadow-xl overflow-hidden"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
            }}
          >
            {results.map((r, i) => (
              <button
                key={`${r.city}-${r.countryCode}-${i}`}
                type="button"
                onMouseDown={e => { e.preventDefault(); handleSelect(r) }}
                className="w-full text-left px-4 py-2.5 flex items-center justify-between gap-3 transition-colors"
                style={{
                  background: i === activeIndex ? "var(--surface-raised)" : "transparent",
                  borderBottom: "1px solid var(--border)",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--surface-raised)")}
                onMouseLeave={e => (e.currentTarget.style.background = i === activeIndex ? "var(--surface-raised)" : "transparent")}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[13px] truncate" style={{ color: "var(--text)" }}>{r.city}</span>
                  <span className="text-[11px] shrink-0" style={{ color: "var(--text-muted)" }}>{r.country}</span>
                </div>
                <span className="font-mono text-[10px] shrink-0 tracking-widest" style={{ color: "var(--text-muted)" }}>
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
