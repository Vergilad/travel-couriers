/**
 * Inbox as Viactor paperwork: a thread ledger beside the open letter. Thread
 * rows read like manifest lines (face, name, route, preview, unread stamp);
 * the conversation is one field with a deal strip on top, messages in the
 * middle, composer at the bottom. Same endpoints, same polling (15s list,
 * 5s open thread), same deal stages; only the surface changed.
 */
import * as React from "react"
import { useNavigate, Link } from "@tanstack/react-router"
import { useAuth } from "@/lib/auth"
import { authedFetch } from "@/lib/api"
import { VerifiedBadge, UnverifiedBadge } from "@/components/VerifiedBadge"
import { UnverifiedWarningModal } from "@/components/UnverifiedWarningModal"
import { useTranslation } from "@/i18n/I18nContext"

interface ThreadSummary {
  id: string
  listing_id: string
  listing_title: string
  created_at: string
  other_participant: { id: string; display_name: string | null; avatar_url: string | null }
  last_message: { id: string; body: string; created_at: string; sender_id: string | null } | null
  unread_count: number
}

interface Message {
  id: string
  thread_id: string
  sender_id: string | null
  body: string
  read_at: string | null
  created_at: string
  is_system?: boolean
}

interface ThreadDetail {
  id: string
  listing_id: string
  listing: { id: string; title: string | null; origin_city: string; dest_city: string; kind: string; status?: string } | null
  other_participant: { id: string; display_name: string | null; avatar_url: string | null }
  messages: Message[]
  created_at: string
}

interface MatchState {
  stage: "none" | "waiting" | "in_transit" | "handed_over" | "completed"
  me_confirmed: boolean
  other_confirmed: boolean
  both_confirmed: boolean
  listing_kind: string | null
  listing_status: string | null
  courier_id: string | null
  recipient_id: string | null
  is_me_courier: boolean
  handed_over: boolean
  received: boolean
  handover_code: string | null
  is_me_needer: boolean
  code_locked: boolean
}

function formatTime(iso: string, justNow: string, minutesAgo: string): string {
  const date = new Date(iso)
  const diff = Date.now() - date.getTime()
  if (diff < 60_000) return justNow
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}${minutesAgo}`
  if (diff < 86_400_000) return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  if (diff < 604_800_000) return date.toLocaleDateString([], { weekday: "short" })
  return date.toLocaleDateString([], { month: "short", day: "numeric" })
}

function KindChip({ kind }: { kind: string | null | undefined }) {
  const { t } = useTranslation()
  if (!kind) return null
  const k = kind.toLowerCase()
  if (k === "carry" || k === "need") {
    return (
      <span className="stencil-chip" data-side={k}>
        {t(`kinds.${k}`)}
      </span>
    )
  }
  return <span className="stencil-chip">{kind.toUpperCase()}</span>
}

function Face({ name, url, size = 36 }: { name: string; url?: string | null; size?: number }) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        background: "var(--face)",
        border: "var(--bw) solid var(--line)",
        borderRadius: "var(--radius-base)",
        fontFamily: "var(--font-mono)",
        fontWeight: 700,
        fontSize: Math.max(11, Math.round(size * 0.4)),
        color: "var(--face-ink)",
      }}
    >
      {url ? (
        <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      ) : (
        name.charAt(0).toUpperCase()
      )}
    </span>
  )
}

/** Two delivery ticks: handover, receipt. Real state, square like everything. */
function DeliveryTicks({ step }: { step: 0 | 1 | 2 }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }} aria-hidden="true">
      <span style={{ width: 10, height: 10, background: step >= 1 ? "var(--success)" : "transparent", border: "var(--bw) solid var(--line)" }} />
      <span style={{ width: 16, height: 2, background: "var(--line)" }} />
      <span style={{ width: 10, height: 10, background: step >= 2 ? "var(--success)" : "transparent", border: "var(--bw) solid var(--line)" }} />
    </span>
  )
}

// ── Thread ledger row ───────────────────────────────────────────────────────

function ThreadRow({ thread, selected, currentUserId, onClick }: {
  thread: ThreadSummary; selected: boolean; currentUserId: string; onClick: () => void
}) {
  const { t } = useTranslation()
  const other = thread.other_participant
  const name = other.display_name ?? t("inbox.anonymous")
  const lastMsg = thread.last_message
  const preview = lastMsg
    ? lastMsg.sender_id === null
      ? lastMsg.body
      : lastMsg.sender_id === currentUserId
        ? `${t("inbox.you")}${lastMsg.body}`
        : lastMsg.body
    : t("messages.no_messages")

  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={selected || undefined}
      className="dossier-row field-row"
      style={{ cursor: "pointer", width: "100%", textAlign: "left", border: 0 }}
    >
      <Face name={name} url={other.avatar_url} size={36} />
      <span style={{ minWidth: 0 }}>
        <span className="font-display" style={{ fontSize: "1rem", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {name}
        </span>
        <span className="font-label field-dim" style={{ display: "block", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {thread.listing_title}
        </span>
        <span className="copy ink-dim" style={{ display: "block", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "0.85rem" }}>
          {preview}
        </span>
      </span>
      <span style={{ display: "grid", gap: 6, justifyItems: "end" }}>
        <span className="font-label field-dim tabular" style={{ whiteSpace: "nowrap" }}>
          {lastMsg ? formatTime(lastMsg.created_at, t("messages.just_now"), t("messages.minutes_ago")) : ""}
        </span>
        {thread.unread_count > 0 && (
          <span
            aria-label={`${thread.unread_count} unread`}
            style={{
              display: "inline-grid",
              placeItems: "center",
              minWidth: 20,
              height: 20,
              padding: "0 5px",
              background: "var(--orange)",
              color: "var(--on-fill)",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
            }}
          >
            {thread.unread_count > 9 ? "9+" : thread.unread_count}
          </span>
        )}
      </span>
    </button>
  )
}

// ── Message bubble ──────────────────────────────────────────────────────────

function MessageRow({ msg, isOwn, justNow, minutesAgo }: { msg: Message; isOwn: boolean; justNow: string; minutesAgo: string }) {
  if (msg.is_system) {
    return (
      <div style={{ display: "flex", justifyContent: "center", margin: "14px 0" }}>
        <p className="font-label" style={{ margin: 0, textAlign: "center", maxWidth: "85%", color: "var(--text-muted)" }}>
          {msg.body}
        </p>
      </div>
    )
  }
  return (
    <div style={{ display: "flex", justifyContent: isOwn ? "flex-end" : "flex-start", marginBottom: 12 }}>
      <div style={{ maxWidth: "75%", display: "flex", flexDirection: "column", gap: 4, alignItems: isOwn ? "flex-end" : "flex-start" }}>
        <div
          className="copy"
          style={{
            margin: 0,
            padding: "10px 14px",
            background: isOwn ? "var(--teal)" : "var(--sheet)",
            color: isOwn ? "var(--on-fill)" : "var(--text)",
            border: "var(--bw) solid var(--line)",
            borderRadius: "var(--radius-base)",
            overflowWrap: "anywhere",
          }}
        >
          {msg.body}
        </div>
        <span className="font-label field-dim tabular">
          {formatTime(msg.created_at, justNow, minutesAgo)}
        </span>
      </div>
    </div>
  )
}

// ── Handover code: needer reads it, courier types it ────────────────────────
// The code is minted at both-confirm and shown only to the needer
// (parcel owner side). The courier entering it IS the receipt event.

function CodeDisplay({ code, locked, onRegenerate, busy }: {
  code: string | null; locked: boolean; onRegenerate: () => void; busy: boolean
}) {
  const { t } = useTranslation()
  return (
    <div style={{ marginTop: 12, padding: 14, background: "var(--ground)", border: "var(--bw) solid var(--line)" }}>
      <p className="font-label field-dim" style={{ margin: 0 }}>{t("inbox.handover_code_title")}</p>
      {locked ? (
        <>
          <p className="copy" style={{ margin: "8px 0 0" }}>{t("inbox.code_locked_needer")}</p>
          <button type="button" onClick={onRegenerate} disabled={busy} className="btn btn--plain press" style={{ marginTop: 12, padding: "10px 18px" }}>
            {t("inbox.new_code")}
          </button>
        </>
      ) : (
        <>
          <p className="font-display tabular" style={{ margin: "8px 0 0", fontSize: "2rem", letterSpacing: "0.35em" }}>
            {code ?? ""}
          </p>
          <p className="copy ink-dim" style={{ margin: "8px 0 0", fontSize: "0.85rem" }}>
            {t("inbox.code_needer_hint")}
          </p>
        </>
      )}
    </div>
  )
}

function CodeEntry({ onSubmit, busy }: {
  onSubmit: (code: string) => Promise<void>; busy: boolean
}) {
  const { t } = useTranslation()
  const [value, setValue] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [sending, setSending] = React.useState(false)

  async function submit() {
    const code = value.trim()
    if (!code || sending) return
    setSending(true)
    setError(null)
    try {
      await onSubmit(code)
      setValue("")
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("inbox.code_wrong_default"))
    } finally {
      setSending(false)
    }
  }

  return (
    <div style={{ marginTop: 12, padding: 14, background: "var(--ground)", border: "var(--bw) solid var(--line)" }}>
      <p className="font-label field-dim" style={{ margin: 0 }}>{t("inbox.handover_code_title")}</p>
      <p className="copy ink-dim" style={{ margin: "8px 0 0", fontSize: "0.85rem" }}>
        {t("inbox.code_courier_hint")}
      </p>
      <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") void submit() }}
          placeholder={t("inbox.code_placeholder")}
          aria-label={t("inbox.handover_code_title")}
          inputMode="numeric"
          autoComplete="off"
          maxLength={6}
          className="route-input"
          style={{ flex: 1, minWidth: 0, letterSpacing: "0.3em" }}
        />
        <button
          type="button"
          onClick={() => void submit()}
          disabled={!value.trim() || sending || busy}
          className="btn btn--primary press"
        >
          {t("inbox.complete_delivery")}
        </button>
      </div>
      {error && (
        <p className="copy" style={{ margin: "8px 0 0", color: "var(--destructive)" }}>{error}</p>
      )}
    </div>
  )
}

// ── Deal strip: one line of state, one action ───────────────────────────────

function DealStrip({ match, listing, otherName, otherId, onConfirm, onHandover, onCompleteWithCode, onRegenerateCode, busy, otherVerified }: {
  match: MatchState; listing: ThreadDetail["listing"]; otherName: string; otherId: string
  onConfirm: () => void; onHandover: () => void
  onCompleteWithCode: (code: string) => Promise<void>; onRegenerateCode: () => void
  busy: boolean
  otherVerified?: boolean | null
}) {
  const { t } = useTranslation()
  const kind = match.listing_kind ?? listing?.kind ?? null

  if (match.stage === "completed") {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", padding: "12px 0", borderTop: "var(--bw) solid var(--line)" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
          <DeliveryTicks step={2} />
          <span className="font-label" style={{ color: "var(--success)" }}>{t("inbox.delivery_confirmed")}</span>
          <KindChip kind={kind} />
        </span>
        <Link to="/profile/$userId" params={{ userId: otherId }} className="font-label" style={{ color: "var(--text)" }}>
          {t("inbox.leave_review")}
        </Link>
      </div>
    )
  }

  if (match.stage === "handed_over") {
    if (!match.is_me_courier) {
      return (
        <div style={{ padding: "12px 0", borderTop: "var(--bw) solid var(--line)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <DeliveryTicks step={1} />
            <span className="font-label field-dim">{otherName.toUpperCase()} {t("inbox.marked_as_delivered")}</span>
            <KindChip kind={kind} />
          </div>
          {match.is_me_needer && (
            <CodeDisplay code={match.handover_code} locked={match.code_locked} onRegenerate={onRegenerateCode} busy={busy} />
          )}
        </div>
      )
    }
    return (
      <div style={{ padding: "12px 0", borderTop: "var(--bw) solid var(--line)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <DeliveryTicks step={1} />
          <span className="font-label field-dim">{t("inbox.waiting_receipt")}</span>
        </div>
        <CodeEntry onSubmit={onCompleteWithCode} busy={busy} />
      </div>
    )
  }

  if (match.stage === "in_transit") {
    return (
      <div style={{ padding: "12px 0", borderTop: "var(--bw) solid var(--line)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
            <DeliveryTicks step={0} />
            <span className="font-label field-dim">
              {match.is_me_courier ? t("inbox.arrange_pickup") : t("inbox.awaiting_handover")}
            </span>
            <KindChip kind={kind} />
          </span>
          {match.is_me_courier && (
            <button type="button" onClick={onHandover} disabled={busy} className="btn btn--plain press" style={{ padding: "10px 18px" }}>
              {t("inbox.mark_delivered")}
            </button>
          )}
        </div>
        {match.is_me_needer
          ? <CodeDisplay code={match.handover_code} locked={match.code_locked} onRegenerate={onRegenerateCode} busy={busy} />
          : <CodeEntry onSubmit={onCompleteWithCode} busy={busy} />}
      </div>
    )
  }

  if (match.me_confirmed && !match.both_confirmed) {
    return (
      <div style={{ padding: "12px 0", borderTop: "var(--bw) solid var(--line)", textAlign: "center" }}>
        <span className="font-label field-dim">
          {t("inbox.waiting_for")} {otherName.toUpperCase()} {t("inbox.to_confirm")}
        </span>
      </div>
    )
  }

  return (
    <div style={{ padding: "12px 0", borderTop: "var(--bw) solid var(--line)" }}>
      {otherVerified === false && (
        <p className="font-label" style={{ margin: "0 0 10px", color: "var(--destructive)" }}>
          {otherName.toUpperCase()} {t("messages.not_verified_warning")}
        </p>
      )}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
          <span className="font-label field-dim">{t("inbox.confirm_title")}</span>
          <KindChip kind={kind} />
        </span>
        <button type="button" onClick={onConfirm} disabled={busy} className="btn btn--plain press" style={{ padding: "10px 18px" }}>
          {t("inbox.confirm")}
        </button>
      </div>
    </div>
  )
}

// ── Conversation ────────────────────────────────────────────────────────────

function Conversation({ thread, messages, currentUserId, match, otherVerified, onSend, onConfirm, onHandover, onCompleteWithCode, onRegenerateCode, onBack }: {
  thread: ThreadDetail; messages: Message[]; currentUserId: string; match: MatchState | null
  otherVerified?: boolean | null
  onSend: (body: string) => Promise<void>; onConfirm: () => Promise<void>; onHandover: () => Promise<void>
  onCompleteWithCode: (code: string) => Promise<void>; onRegenerateCode: () => Promise<void>; onBack: () => void
}) {
  const { t } = useTranslation()
  const [input, setInput] = React.useState("")
  const [sending, setSending] = React.useState(false)
  const [matchBusy, setMatchBusy] = React.useState(false)
  const [showUnverifiedWarning, setShowUnverifiedWarning] = React.useState(false)
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const other = thread.other_participant
  const listing = thread.listing
  const listingLabel = listing?.title || (listing ? `${listing.origin_city} → ${listing.dest_city}` : "")
  const otherName = other.display_name ?? t("inbox.anonymous")

  React.useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages.length])

  async function handleSend() {
    const text = input.trim()
    if (!text || sending) return
    setInput("")
    setSending(true)
    try { await onSend(text) } finally { setSending(false) }
  }

  async function runBusy(fn: () => Promise<void>) {
    setMatchBusy(true)
    try { await fn() } finally { setMatchBusy(false) }
  }

  function handleConfirm() {
    if (otherVerified === false) { setShowUnverifiedWarning(true); return }
    void runBusy(onConfirm)
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void handleSend() }
  }

  const isCompleted = match?.stage === "completed"

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, paddingBottom: 12 }}>
        <button
          type="button"
          onClick={onBack}
          className="font-label field-dim nav-toggle"
          style={{ cursor: "pointer", background: "none", border: 0, padding: 4 }}
        >
          ←
        </button>
        <Link to="/profile/$userId" params={{ userId: other.id }} style={{ display: "inline-flex" }}>
          <Face name={otherName} url={other.avatar_url} size={36} />
        </Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <Link
              to="/profile/$userId"
              params={{ userId: other.id }}
              className="font-display"
              style={{ fontSize: "1.1rem", color: "var(--text)", textDecoration: "none" }}
            >
              {otherName}
            </Link>
            {otherVerified === true && <VerifiedBadge size="xs" />}
            {otherVerified === false && <UnverifiedBadge size="xs" />}
          </p>
          {listingLabel && (
            <p className="font-label field-dim" style={{ margin: "4px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {listingLabel}
            </p>
          )}
        </div>
        <KindChip kind={listing?.kind} />
      </div>

      {match && (
        <DealStrip
          match={match} listing={listing} otherName={otherName} otherId={other.id}
          onConfirm={handleConfirm} onHandover={() => void runBusy(onHandover)}
          onCompleteWithCode={onCompleteWithCode} onRegenerateCode={() => void runBusy(onRegenerateCode)}
          busy={matchBusy} otherVerified={otherVerified}
        />
      )}

      <div ref={scrollRef} style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "16px 0" }}>
        {messages.length === 0 ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
            <p className="font-label field-dim" style={{ margin: 0 }}>
              {t("inbox.no_messages_placeholder")}
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageRow key={msg.id} msg={msg} isOwn={msg.sender_id === currentUserId} justNow={t("messages.just_now")} minutesAgo={t("messages.minutes_ago")} />
          ))
        )}
      </div>

      <div style={{ display: "flex", gap: 10, paddingTop: 12, borderTop: "var(--bw) solid var(--line)" }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder={isCompleted ? t("inbox.archived_placeholder") : t("inbox.type_message")}
          disabled={isCompleted}
          aria-label={t("inbox.type_message")}
          className="route-input"
          style={{ flex: 1, minWidth: 0, opacity: isCompleted ? 0.5 : 1 }}
        />
        <button
          type="button"
          onClick={() => void handleSend()}
          disabled={!input.trim() || sending || isCompleted}
          className="btn btn--primary press"
        >
          {t("inbox.send")}
        </button>
      </div>

      {showUnverifiedWarning && (
        <UnverifiedWarningModal
          variant="confirm"
          otherName={otherName}
          onProceed={() => { setShowUnverifiedWarning(false); void runBusy(onConfirm) }}
          onCancel={() => setShowUnverifiedWarning(false)}
        />
      )}
    </div>
  )
}

// ── Page ────────────────────────────────────────────────────────────────────

export function Inbox({ initialThreadId }: { initialThreadId?: string }) {
  const { t } = useTranslation()
  const { session, user } = useAuth()
  const token = session?.access_token ?? ""

  const [threads, setThreads] = React.useState<ThreadSummary[]>([])
  const [threadsLoading, setThreadsLoading] = React.useState(true)
  const [selectedId, setSelectedId] = React.useState<string | null>(initialThreadId ?? null)
  const [threadDetail, setThreadDetail] = React.useState<ThreadDetail | null>(null)
  const [messages, setMessages] = React.useState<Message[]>([])
  const [match, setMatch] = React.useState<MatchState | null>(null)
  const [detailLoading, setDetailLoading] = React.useState(false)
  const [otherVerified, setOtherVerified] = React.useState<boolean | null>(null)
  const navigate = useNavigate()

  React.useEffect(() => {
    if (!token) return
    setThreadsLoading(true)
    authedFetch("/api/threads", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json()).then(setThreads).catch(() => {})
      .finally(() => setThreadsLoading(false))
  }, [token])

  // Polling replaces the Supabase Realtime channels removed with the
  // backend move: thread list every 15s.
  React.useEffect(() => {
    if (!token) return
    const id = setInterval(() => {
      authedFetch("/api/threads", { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json()).then(setThreads).catch(() => {})
    }, 15_000)
    return () => clearInterval(id)
  }, [token])

  React.useEffect(() => {
    if (!selectedId || !token) return
    setDetailLoading(true)
    setMatch(null)
    const headers = { Authorization: `Bearer ${token}` }
    authedFetch(`/api/threads/${selectedId}`, { headers }).then((r) => r.json()).then((detail: ThreadDetail) => {
      setThreadDetail(detail)
      setMessages(detail.messages)
      authedFetch(`/api/messages/thread/${selectedId}/read`, { method: "PATCH", headers }).then(() => {
        setThreads((prev) => prev.map((th) => (th.id === selectedId ? { ...th, unread_count: 0 } : th)))
      }).catch(() => {})
      authedFetch(`/api/matches?thread_id=${selectedId}`, { headers }).then((r) => r.json()).then(setMatch).catch(() => setMatch(null))
      authedFetch(`/api/profiles/${detail.other_participant.id}`, { headers }).then((r) => r.json()).then((d) =>
        setOtherVerified(d.identity_verified === true ? true : d.identity_verified === false ? false : null),
      ).catch(() => setOtherVerified(null))
    }).catch(() => {}).finally(() => setDetailLoading(false))
  }, [selectedId, token])

  // Open thread: messages + match state every 5s, plus mark-read.
  React.useEffect(() => {
    if (!selectedId || !token) return
    const headers = { Authorization: `Bearer ${token}` }
    const tick = () => {
      authedFetch(`/api/threads/${selectedId}`, { headers }).then((r) => r.json()).then((detail: ThreadDetail) => {
        setMessages(detail.messages)
        setThreads((prev) => prev.map((th) => th.id === selectedId
          ? { ...th, last_message: detail.messages[detail.messages.length - 1] ?? th.last_message, unread_count: 0 }
          : th))
      }).catch(() => {})
      authedFetch(`/api/matches?thread_id=${selectedId}`, { headers }).then((r) => r.json()).then(setMatch).catch(() => {})
      authedFetch(`/api/messages/thread/${selectedId}/read`, { method: "PATCH", headers }).catch(() => {})
    }
    const id = setInterval(tick, 5_000)
    return () => clearInterval(id)
  }, [selectedId, token])

  function selectThread(id: string) {
    setSelectedId(id); setThreadDetail(null); setMessages([])
    navigate({ to: "/messages/$threadId", params: { threadId: id } })
  }

  function handleBack() {
    setSelectedId(null); setThreadDetail(null)
    navigate({ to: "/messages" })
  }

  async function refreshMatch() {
    if (!selectedId || !token) return
    const headers = { Authorization: `Bearer ${token}` }
    const updated = await authedFetch(`/api/matches?thread_id=${selectedId}`, { headers }).then((r) => r.json()).catch(() => null)
    if (updated) setMatch(updated)
  }

  async function refreshMessages() {
    if (!selectedId || !token) return
    const headers = { Authorization: `Bearer ${token}` }
    await authedFetch(`/api/threads/${selectedId}`, { headers }).then((r) => r.json()).then((detail: ThreadDetail) => {
      setMessages(detail.messages)
    }).catch(() => {})
  }

  async function handleSend(body: string) {
    if (!selectedId || !token) return
    const msg: Message = await authedFetch("/api/messages", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ thread_id: selectedId, body }),
    }).then((r) => r.json())
    setMessages((prev) => [...prev, msg])
    setThreads((prev) => prev.map((th) => th.id === selectedId
      ? { ...th, last_message: { id: msg.id, body: msg.body, created_at: msg.created_at, sender_id: msg.sender_id } }
      : th))
  }

  async function handleConfirm() {
    if (!selectedId || !token) return
    await authedFetch(`/api/matches/confirm?thread_id=${selectedId}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }).then((r) => r.json()).then((res) => {
      if (res.both_confirmed) void refreshMessages()
    }).catch(() => {})
    await refreshMatch()
  }

  async function handleHandover() {
    if (!selectedId || !token) return
    await authedFetch(`/api/matches/handover?thread_id=${selectedId}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {})
    await refreshMatch()
    await refreshMessages()
  }

  async function handleCompleteWithCode(code: string) {
    if (!selectedId || !token) return
    const res = await authedFetch("/api/matches/complete-with-code", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ thread_id: selectedId, code }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.detail ?? "Wrong code.")
    if (data.completed) await refreshMessages()
    await refreshMatch()
  }

  async function handleRegenerateCode() {
    if (!selectedId || !token) return
    await authedFetch(`/api/matches/regenerate-code?thread_id=${selectedId}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {})
    await refreshMatch()
  }

  const showConversation = !!selectedId && !!threadDetail
  const totalUnread = threads.reduce((s, th) => s + th.unread_count, 0)

  return (
    <div className="manifest">
      <section className="manifest-field">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <h2 className="field-caption" style={{ margin: 0 }}>{t("messages.messages_title")}</h2>
          {totalUnread > 0 && (
            <span
              aria-label={`${totalUnread} unread`}
              style={{
                display: "inline-grid",
                placeItems: "center",
                minWidth: 20,
                height: 20,
                padding: "0 5px",
                background: "var(--orange)",
                color: "var(--on-fill)",
                fontFamily: "var(--font-mono)",
                fontSize: 11,
              }}
            >
              {totalUnread > 99 ? "99+" : totalUnread}
            </span>
          )}
        </div>

        <div className="inbox-split" style={{ marginTop: 16, height: "max(480px, min(660px, 72dvh))" }}>
          {/* Thread ledger */}
          <div
            className={selectedId ? "inbox-pane-hide" : undefined}
            style={{ background: "var(--sheet)", overflowY: "auto", minHeight: 0 }}
          >
            {threadsLoading ? (
              <div aria-hidden="true" style={{ padding: 12 }}>
                {[0, 1].map((i) => (
                  <div key={i} className="skel" style={{ height: 64, marginBottom: i < 1 ? 12 : 0 }} />
                ))}
              </div>
            ) : threads.length === 0 ? (
              <div style={{ padding: 20, textAlign: "left" }}>
                <p className="font-label field-dim" style={{ margin: 0 }}>
                  {t("inbox.no_threads_yet")}
                </p>
                <p className="copy ink-dim" style={{ marginTop: 8 }}>
                  {t("messages.browse_listings")}
                </p>
                <button
                  type="button"
                  onClick={() => navigate({ to: "/browse" })}
                  className="btn btn--plain press"
                  style={{ marginTop: 14 }}
                >
                  {t("inbox.browse_listings")}
                </button>
              </div>
            ) : (
              <div style={{ display: "grid", gap: "var(--bw)", background: "var(--line)" }}>
                {threads.map((thread) => (
                  <ThreadRow
                    key={thread.id}
                    thread={thread}
                    selected={thread.id === selectedId}
                    currentUserId={user?.id ?? ""}
                    onClick={() => selectThread(thread.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Open letter */}
          <div
            className={selectedId ? undefined : "inbox-pane-hide"}
            style={{ background: "var(--sheet)", padding: "var(--tile-pad)", overflowY: "auto", minHeight: 0 }}
          >
            {detailLoading ? (
              <div aria-hidden="true">
                <div className="skel" style={{ height: 40, marginBottom: 12 }} />
                <div className="skel" style={{ height: 200 }} />
              </div>
            ) : showConversation ? (
              <Conversation
                thread={threadDetail} messages={messages} currentUserId={user?.id ?? ""}
                match={match} otherVerified={otherVerified}
                onSend={handleSend} onConfirm={handleConfirm} onHandover={handleHandover}
                onCompleteWithCode={handleCompleteWithCode} onRegenerateCode={handleRegenerateCode} onBack={handleBack}
              />
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
                <p className="font-label field-dim" style={{ margin: 0 }}>
                  {t("inbox.select_thread")}
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
