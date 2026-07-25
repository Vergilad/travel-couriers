import { useState, useRef, useEffect } from "react"
import { useTranslation } from "@/i18n/I18nContext"

const LANGUAGES = [
  { code: "en" as const, label: "EN", name: "English" },
  { code: "ru" as const, label: "RU", name: "Русский" },
]

export function LanguageSwitcher() {
  const { language, setLanguage } = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const current = LANGUAGES.find((l) => l.code === language) ?? LANGUAGES[0]

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-bold tracking-widest rounded-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        style={{
          fontFamily: "var(--font-mono)",
          color: open ? "var(--text)" : "var(--text-muted)",
          border: `1px solid ${open ? "var(--text-faint)" : "var(--border)"}`,
        }}
        onMouseEnter={(e) => {
          if (!open) {
            (e.currentTarget as HTMLElement).style.color = "var(--text)"
            ;(e.currentTarget as HTMLElement).style.borderColor = "var(--text-faint)"
          }
        }}
        onMouseLeave={(e) => {
          if (!open) {
            (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"
            ;(e.currentTarget as HTMLElement).style.borderColor = "var(--border)"
          }
        }}
        aria-label="Switch language"
        aria-expanded={open}
      >
        {current.label}
        <svg
          className={`w-2.5 h-2.5 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1.5 min-w-[120px] rounded-sm overflow-hidden shadow-xl z-[100]"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
          }}
        >
          {LANGUAGES.map((lang) => {
            const isActive = language === lang.code
            return (
              <button
                key={lang.code}
                onClick={() => {
                  setLanguage(lang.code)
                  setOpen(false)
                }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-[11px] transition-colors"
                style={{
                  fontFamily: "var(--font-mono)",
                  color: isActive ? "var(--accent)" : "var(--text-muted)",
                  background: isActive ? "rgba(37,99,235,0.08)" : "transparent",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = "var(--surface-raised)"
                    e.currentTarget.style.color = "var(--text)"
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = "transparent"
                    e.currentTarget.style.color = "var(--text-muted)"
                  }
                }}
              >
                <span className="font-bold tracking-widest">{lang.label}</span>
                <span style={{ color: "var(--text-faint)", fontSize: 10 }}>{lang.name}</span>
                {isActive && (
                  <svg className="w-3 h-3 ml-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}