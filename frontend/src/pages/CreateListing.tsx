/**
 * Create listing as transit paperwork: the form is a manifest of fields,
 * each named in small print with its value in large print. Same flow and
 * validation as before; only the reading surface changed.
 *
 * Two routes share this form: /carry/new (travel dates + flexibility)
 * and /need/new (needed-by date + buy-it-for-me tickbox).
 */
import * as React from "react"
import { useNavigate, Link } from "@tanstack/react-router"
import { useAuth } from "@/lib/auth"
import { authedFetch } from "@/lib/api"
import { CityAutocomplete } from "@/components/CityAutocomplete"
import { FieldLabel } from "@/components/ui/sheet-grid"
import { useTranslation } from "@/i18n/I18nContext"

type Kind = "carry" | "need"
type DateFlexibility = "exact" | "week" | "month"

interface FormData {
  title: string
  description: string
  origin_city: string
  origin_country: string
  dest_city: string
  dest_country: string
  depart_date: string
  arrive_date: string
  price: string
  currency: string
  needs_purchase: boolean
  date_flexibility: DateFlexibility
  no_date: boolean
  no_price: boolean
}

const MAX_PRICE = 10_000
const MAX_TITLE = 80
const MAX_DESCRIPTION = 500

// ── Form controls in the sheet voice ──────────────────────────────────────────

function ViactorInput({
  type = "text", value, onChange, placeholder, min, max, step, maxLength, disabled,
  autoComplete,
}: {
  type?: string; value: string; onChange: (v: string) => void;
  placeholder?: string; min?: number; max?: number; step?: string; maxLength?: number;
  disabled?: boolean; autoComplete?: string;
}) {
  const isNumeric = type === "number"
  return (
    <input
      type={type}
      inputMode={isNumeric ? "decimal" : undefined}
      value={value}
      onChange={(e) => {
        let v = e.target.value
        if (isNumeric) {
          const cleaned = v.replace(/[^0-9.]/g, "")
          const firstDot = cleaned.indexOf(".")
          v = firstDot === -1 ? cleaned : cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, "")
        }
        onChange(maxLength ? v.slice(0, maxLength) : v)
      }}
      onKeyDown={isNumeric ? (e) => { if (["e", "E", "+", "-"].includes(e.key)) e.preventDefault() } : undefined}
      placeholder={placeholder}
      disabled={disabled}
      min={min}
      max={max}
      step={step}
      maxLength={maxLength}
      autoComplete={autoComplete}
      className="route-input"
      style={disabled ? { opacity: 0.4 } : undefined}
    />
  )
}

function ViactorTextarea({ value, onChange, placeholder, maxLength }: {
  value: string; onChange: (v: string) => void; placeholder?: string; maxLength?: number
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(maxLength ? e.target.value.slice(0, maxLength) : e.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      rows={4}
      className="route-input"
      style={{ resize: "none", lineHeight: 1.6 }}
    />
  )
}

/** A tickbox row: the sheet's own "this one is done" vocabulary, used here
 *  as the form's only toggle. Keeps the all-sharp shape lock. */
function CheckRow({ checked, onChange, label, sublabel }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; sublabel?: string
}) {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
      className="field-row"
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 14,
        width: "100%",
        padding: "14px",
        border: "var(--bw) solid var(--line)",
        borderRadius: "var(--radius-base)",
        background: "var(--sheet)",
        color: "var(--text)",
        cursor: "pointer",
        textAlign: "left",
      }}
    >
      <span className="tickbox" aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }}>
        {checked && (
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth={3.5}>
            <path strokeLinecap="square" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        )}
      </span>
      <span>
        <span className="copy" style={{ display: "block", fontWeight: 500 }}>{label}</span>
        {sublabel && (
          <span className="copy ink-dim" style={{ display: "block", marginTop: 4 }}>
            {sublabel}
          </span>
        )}
        <span className="font-label field-dim" style={{ display: "block", marginTop: 6 }}>
          {checked ? t("create.tick_on") : t("create.tick_off")}
        </span>
      </span>
    </button>
  )
}

// ── Page meta ─────────────────────────────────────────────────────────────────
const FLEXIBILITY_OPTIONS: { value: DateFlexibility; label: string; desc: string }[] = [
  { value: "exact", label: "EXACT", desc: "Specific date only" },
  { value: "week", label: "±1 WEEK", desc: "Roughly that week" },
  { value: "month", label: "±1 MONTH", desc: "Approximate month" },
]

const KIND_META: Record<Kind, { headline: string; sub: string; gate: string }> = {
  carry: {
    headline: "Offer carrying",
    sub: "You're traveling anyway. Plane, train, car or ferry. Offer your spare space and earn by carrying things along your route.",
    gate: "GATE: CARRY MANIFEST",
  },
  need: {
    headline: "Need something moved",
    sub: "Have an item that must reach another city, or want something bought and brought to you? Post it once and carriers come to you.",
    gate: "GATE: NEED",
  },
}

// ── Component ─────────────────────────────────────────────────────────────────
export function CreateListing({ kind }: { kind: Kind }) {
  const { t } = useTranslation()
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const meta = KIND_META[kind]
  const newPath = kind === "carry" ? "/carry/new" : "/need/new"

  const [form, setForm] = React.useState<FormData>({
    title: "", description: "", origin_city: "", origin_country: "",
    dest_city: "", dest_country: "", depart_date: "", arrive_date: "",
    price: "", currency: "USD", needs_purchase: false,
    date_flexibility: "exact", no_date: false, no_price: false,
  })
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [clientError, setClientError] = React.useState<string | null>(null)
  const [originConfirmed, setOriginConfirmed] = React.useState(false)
  const [destConfirmed, setDestConfirmed] = React.useState(false)

  function set(field: keyof FormData) {
    return (value: string | boolean) => setForm(prev => ({ ...prev, [field]: value }))
  }

  function validateClient(): string | null {
    if (!originConfirmed || !destConfirmed) return t("create.pick_cities")
    if (!form.no_price && form.price && Number(form.price) > MAX_PRICE) return t("create.price_too_high")
    if (!form.no_price && form.price && Number(form.price) < 0) return t("create.price_negative")
    if (form.depart_date && form.arrive_date && form.arrive_date < form.depart_date) return t("create.dates_reversed")
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const ce = validateClient()
    if (ce) { setClientError(ce); return }
    setClientError(null)
    if (!user) {
      navigate({ to: "/auth", search: { mode: "signin", redirect: newPath } })
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const body: Record<string, unknown> = {
        kind,
        title: form.title,
        origin_city: form.origin_city,
        origin_country: form.origin_country,
        dest_city: form.dest_city,
        dest_country: form.dest_country,
        currency: form.currency || "USD",
        date_flexibility: form.no_date ? "exact" : form.date_flexibility,
      }
      if (form.description) body.description = form.description
      if (!form.no_date && form.depart_date) body.depart_date = form.depart_date
      if (!form.no_date && form.arrive_date) body.arrive_date = form.arrive_date
      if (!form.no_price && form.price) body.price = Math.min(Number(form.price), MAX_PRICE)
      if (kind === "need" && form.needs_purchase) body.needs_purchase = true
      const res = await authedFetch("/api/listings", { method: "POST", body: JSON.stringify(body) })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.detail ?? data.error ?? `Server error ${res.status}`)
      }
      const listing = await res.json()
      navigate({ to: "/listings/$id", params: { id: listing.id } })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("create.failed"))
    } finally {
      setSubmitting(false)
    }
  }

  // ── Auth guards ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="manifest">
        <div className="manifest-field" aria-hidden="true">
          <div className="skel" style={{ height: 120 }} />
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="manifest">
        <div className="manifest-field" style={{ textAlign: "left" }}>
          <h1 className="font-display" style={{ fontSize: "var(--t-h2)", margin: 0 }}>
            {t("create.signin_title")}
          </h1>
          <p className="copy ink-dim" style={{ marginTop: 12, maxWidth: "46ch" }}>
            {t("create.signin_body")}
          </p>
          <Link to="/auth" search={{ mode: "signin", redirect: newPath }} className="btn btn--primary press" style={{ marginTop: 20 }}>
            {t("create.signin_cta")}
          </Link>
        </div>
      </div>
    )
  }

  const hasDateFlexibility = kind === "carry" && !form.no_date && form.depart_date

  return (
    <div className="manifest">
      {/* ── Header field ── */}
      <div className="manifest-field">
        <h2 className="field-caption">{meta.gate}</h2>
        <h1 className="font-display" style={{ fontSize: "var(--t-h2)", margin: 0 }}>
          {meta.headline}
        </h1>
        <p className="copy ink-dim" style={{ marginTop: 12, maxWidth: "62ch" }}>
          {meta.sub}
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: "var(--bw)", background: "var(--line)" }}>
        {/* Route */}
        <div className="manifest-field">
          <h2 className="field-caption">{t("create.route_title")}</h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: 14,
            }}
          >
            <CityAutocomplete
              label={t("listings.from_city")}
              value={form.origin_city}
              onSelect={(city, country) => { setForm(p => ({ ...p, origin_city: city, origin_country: country })); setOriginConfirmed(true) }}
              onClear={() => { setForm(p => ({ ...p, origin_city: "", origin_country: "" })); setOriginConfirmed(false) }}
              placeholder={t("listings.from_placeholder")}
              required
            />
            <CityAutocomplete
              label={t("listings.to_city")}
              value={form.dest_city}
              onSelect={(city, country) => { setForm(p => ({ ...p, dest_city: city, dest_country: country })); setDestConfirmed(true) }}
              onClear={() => { setForm(p => ({ ...p, dest_city: "", dest_country: "" })); setDestConfirmed(false) }}
              placeholder={t("listings.to_placeholder")}
              required
            />
          </div>
          {form.origin_country && form.dest_country && (
            <p className="font-label field-dim" style={{ margin: "12px 0 0" }}>
              {form.origin_country} &rarr; {form.dest_country}
            </p>
          )}
        </div>

        {/* Timing */}
        <div className="manifest-field">
          <h2 className="field-caption">{t("create.timing_title")}</h2>
          <CheckRow
            checked={form.no_date}
            onChange={v => setForm(p => ({ ...p, no_date: v, depart_date: v ? "" : p.depart_date, arrive_date: v ? "" : p.arrive_date }))}
            label={t("create.no_date")}
            sublabel={t("create.no_date_sub")}
          />
          {!form.no_date && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: 14,
                marginTop: 14,
              }}
            >
              {kind === "carry" ? (
                <>
                  <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
                    <FieldLabel>{t("create.depart_date")}</FieldLabel>
                    <ViactorInput type="date" value={form.depart_date} onChange={set("depart_date")} />
                  </label>
                  <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
                    <FieldLabel>{t("create.arrive_date")}</FieldLabel>
                    <ViactorInput type="date" value={form.arrive_date} onChange={set("arrive_date")} />
                  </label>
                </>
              ) : (
                <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
                  <FieldLabel>{t("create.needed_by")}</FieldLabel>
                  <ViactorInput type="date" value={form.arrive_date} onChange={set("arrive_date")} />
                </label>
              )}
            </div>
          )}
          {hasDateFlexibility && (
            <div style={{ marginTop: 14 }}>
              <FieldLabel>{t("create.flex_title")}</FieldLabel>
              <div className="seg" role="group" aria-label={t("create.flex_title")}>
                {FLEXIBILITY_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    className="seg-btn font-label"
                    aria-pressed={form.date_flexibility === opt.value}
                    data-active={form.date_flexibility === opt.value || undefined}
                    onClick={() => set("date_flexibility")(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {kind === "carry" && (
            <p className="copy ink-dim" style={{ marginTop: 12, maxWidth: "62ch" }}>
              {t("create.carry_hint")}
            </p>
          )}
          {kind === "need" && !form.no_date && (
            <p className="copy ink-dim" style={{ marginTop: 12, maxWidth: "62ch" }}>
              {t("create.need_hint")}
            </p>
          )}
        </div>

        {/* Details */}
        <div className="manifest-field">
          <h2 className="field-caption">{t("create.details_title")}</h2>
          <div style={{ display: "grid", gap: 16 }}>
            <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
              <FieldLabel>{kind === "carry" ? t("create.carry_summary") : t("create.need_summary")}</FieldLabel>
              <ViactorInput
                value={form.title}
                onChange={set("title")}
                placeholder={kind === "carry" ? t("create.carry_title_ph") : t("create.need_title_ph")}
                maxLength={MAX_TITLE}
              />
            </label>
            <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
              <FieldLabel>{t("create.details_label")}</FieldLabel>
              <ViactorTextarea
                value={form.description}
                onChange={set("description")}
                placeholder={t("create.details_ph")}
                maxLength={MAX_DESCRIPTION}
              />
            </label>
            {kind === "need" && (
              <CheckRow
                checked={form.needs_purchase}
                onChange={v => setForm(p => ({ ...p, needs_purchase: v }))}
                label={t("create.buy_label")}
                sublabel={t("create.buy_sub")}
              />
            )}
            <CheckRow
              checked={form.no_price}
              onChange={v => setForm(p => ({ ...p, no_price: v, price: v ? "" : p.price }))}
              label={t("create.no_price")}
              sublabel={t("create.no_price_sub")}
            />
            {!form.no_price && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                  gap: 14,
                }}
              >
                <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
                  <FieldLabel>{kind === "carry" ? t("create.carry_fee") : t("create.need_offer")}</FieldLabel>
                  <ViactorInput
                    type="number"
                    value={form.price}
                    onChange={set("price")}
                    placeholder="0"
                    min={0}
                    max={MAX_PRICE}
                    step="0.01"
                  />
                </label>
                <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
                  <FieldLabel>{t("create.currency")}</FieldLabel>
                  <select
                    value={form.currency}
                    onChange={e => set("currency")(e.target.value)}
                    className="route-input"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="AED">AED</option>
                    <option value="RUB">RUB</option>
                    <option value="CNY">CNY</option>
                    <option value="TRY">TRY</option>
                  </select>
                </label>
              </div>
            )}
            {!form.no_price && form.price && Number(form.price) > MAX_PRICE && (
              <p className="copy" style={{ color: "var(--destructive)" }}>
                {t("create.price_too_high")}
              </p>
            )}
          </div>
        </div>

        {/* Error */}
        {(clientError || error) && (
          <div className="manifest-field">
            <p className="copy" style={{ color: "var(--destructive)" }}>
              {clientError ?? error}
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="manifest-field">
          <div className="closing-row" style={{ marginTop: 0 }}>
            <Link to="/browse" className="font-label" style={{ color: "var(--text-muted)", textDecoration: "none" }}>
              &larr; {t("create.cancel")}
            </Link>
            <button type="submit" disabled={submitting} className="btn btn--primary press">
              {submitting ? t("create.posting") : t("create.post_cta")}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
