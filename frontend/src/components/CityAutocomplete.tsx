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
  // Strict mode (default) requires the user to pick a result from the list;
  // unconfirmed text is reverted on blur/Enter, matching a "must select a
  // real city" form field (e.g. Create Listing). Non-strict mode is for
  // free-text search filters (e.g. Landing/Browse) where typed text is a
  // valid value on its own and should never be reverted or flagged.
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
  // `confirmed` is true ONLY after the user picks a real result from the list.
  // Typing (which only filters) sets it false, invalidating any stale selection
  // in the parent so gibberish can never be submitted. Irrelevant when
  // `strict` is false.
  const [confirmed, setConfirmed] = React.useState(!!value)
  const [touched, setTouched] = React.useState(false)
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  // Tracks the last value *this component* pushed to the parent (via
  // onSelect/onChange/onClear). When the `value` prop changes to something
  // else, that change originated externally (e.g. a parent-driven reset or
  // URL-state sync) and the input must resync to it; when it matches, the
  // prop update is just the parent echoing our own change back down, so we
  // must NOT stomp on what the user is actively typing.
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
        if (value) {
          setInputValue(value)
        } else {
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

  const py = compact ? "py-2" : "py-3"

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="block font-mono text-[10px] tracking-[0.18em] text-text-muted mb-1.5 uppercase">
          {label}{required && <span className="text-[var(--destructive)] ml-1">*</span>}
        </label>
      )}
      <div className="relative group">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted select-none pointer-events-none font-mono text-[11px]">›</span>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={e => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          onFocus={() => { if (results.length > 0) setOpen(true) }}
          placeholder={placeholder}
          required={required}
          aria-label={label ?? placeholder}
          autoComplete="off"
          spellCheck={false}
          className={`w-full bg-[var(--surface)] border border-[var(--border)] focus:border-[var(--accent-dim)] focus:outline-none text-text placeholder:text-[var(--text-faint)] font-mono ${py} pl-8 pr-8 text-[12px] transition-colors rounded-sm ${strict && touched && !confirmed ? "border-[var(--destructive)]/60" : ""}`}
        />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2">
            <svg className="animate-spin h-3 w-3 text-text-muted" viewBox="0 0 24 24" fill="none">
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
            className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-text-muted hover:text-text opacity-0 group-focus-within:opacity-100 hover:opacity-100 transition-opacity"
            tabIndex={-1}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3 h-3">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>

      {strict && touched && !confirmed && inputValue && (
        <p className="mt-1.5 font-mono text-[10px] text-[var(--destructive)] tracking-wider">
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
            className="absolute z-[100] left-0 right-0 mt-1 bg-[var(--surface)] border border-[var(--border)] rounded-sm shadow-xl overflow-hidden"
          >
            {results.map((r, i) => (
              <button
                key={`${r.city}-${r.countryCode}-${i}`}
                type="button"
                onMouseDown={e => { e.preventDefault(); handleSelect(r) }}
                className={`w-full text-left px-4 py-2.5 flex items-center justify-between gap-3 transition-colors border-b border-[var(--border)] last:border-0 ${
                  i === activeIndex ? "bg-[var(--surface-raised)]" : "hover:bg-[var(--surface-raised)]"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[13px] text-text truncate">{r.city}</span>
                  <span className="text-[11px] text-text-muted shrink-0">{r.country}</span>
                </div>
                <span className="font-mono text-[10px] text-text-muted shrink-0 tracking-widest">
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
