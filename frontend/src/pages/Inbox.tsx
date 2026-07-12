import * as React from "react"
import { useNavigate, Link } from "@tanstack/react-router"
import { motion, AnimatePresence } from "framer-motion"
import { useAuth } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import { getInitial } from "@/lib/db_constants"

// ─── Types ────────────────────────────────────────────────────────────────────

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
}

// ─── API helpers ──────────────────────────────────────────────────────────────

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
}

async function apiFetchThreads(token: string): Promise<ThreadSummary[]> {
  const res = await fetch("/api/threads", { headers: authHeaders(token) })
  if (!res.ok) throw new Error("Failed to load conversations")
  return res.json()
}

async function apiFetchThread(threadId: string, token: string): Promise<ThreadDetail> {
  const res = await fetch(`/api/threads/${threadId}`, { headers: authHeaders(token) })
  if (!res.ok) throw new Error("Failed to load conversation")
  return res.json()
}

async function apiSend(threadId: string, body: string, token: string): Promise<Message> {
  const res = await fetch("/api/messages", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ thread_id: threadId, body }),
  })
  if (!res.ok) throw new Error("Failed to send message")
  return res.json()
}

async function apiMarkRead(threadId: string, token: string): Promise<void> {
  await fetch(`/api/messages/thread/${threadId}/read`, {
    method: "PATCH",
    headers: authHeaders(token),
  })
}

async function apiGetMatchState(threadId: string, token: string): Promise<MatchState> {
  const res = await fetch(`/api/matches?thread_id=${threadId}`, { headers: authHeaders(token) })
  if (!res.ok) throw new Error("Failed to load match state")
  return res.json()
}

async function apiConfirmMatch(threadId: string, token: string): Promise<{ both_confirmed: boolean }> {
  const res = await fetch(`/api/matches/confirm?thread_id=${threadId}`, {
    method: "POST",
    headers: authHeaders(token),
  })
  if (!res.ok) {
    const d = await res.json().catch(() => ({}))
    throw new Error(d.detail ?? "Failed to confirm")
  }
  return res.json()
}

async function apiHandover(threadId: string, token: string): Promise<void> {
  const res = await fetch(`/api/matches/handover?thread_id=${threadId}`, {
    method: "POST",
    headers: authHeaders(token),
  })
  if (!res.ok) {
    const d = await res.json().catch(() => ({}))
    throw new Error(d.detail ?? "Failed to mark as delivered")
  }
}

async function apiReceived(threadId: string, token: string): Promise<void> {
  const res = await fetch(`/api/matches/received?thread_id=${threadId}`, {
    method: "POST",
    headers: authHeaders(token),
  })
  if (!res.ok) {
    const d = await res.json().catch(() => ({}))
    throw new Error(d.detail ?? "Failed to confirm receipt")
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  const date = new Date(iso)
  const diff = Date.now() - date.getTime()
  if (diff < 60_000) return "just now"
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  if (diff < 604_800_000) return date.toLocaleDateString([], { weekday: "short" })
  return date.toLocaleDateString([], { month: "short", day: "numeric" })
}

// Kind colours consistent with Browse / Profile
const KIND_COLOR: Record<string, string> = {
  trip: "#93c5fd",
  request: "#86efac",
  delivery: "#d8b4fe",
}

function kindColor(kind: string | null | undefined) {
  return KIND_COLOR[(kind ?? "").toLowerCase()] ?? "var(--text-faint)"
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function UserAvatar({ name, url, size }: { name: string | null; url?: string | null; size: number }) {
  return (
    <div
      className="rounded-sm flex items-center justify-center shrink-0 overflow-hidden"
      style={{
        width: size,
        height: size,
        background: "var(--surface-raised)",
        border: "1px solid var(--border)",
      }}
    >
      {url ? (
        <img src={url} alt={name ?? ""} className="w-full h-full object-cover" />
      ) : (
        <span
          className="font-bold"
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: size * 0.42,
            color: "var(--accent)",
          }}
        >
          {getInitial(name ?? "?")}
        </span>
      )}
    </div>
  )
}

// ─── Thread list item ─────────────────────────────────────────────────────────

function ThreadItem({
  thread,
  selected,
  currentUserId,
  onClick,
}: {
  thread: ThreadSummary
  selected: boolean
  currentUserId: string
  onClick: () => void
}) {
  const other = thread.other_participant
  const name = other.display_name ?? "Anonymous"
  const lastMsg = thread.last_message
  const preview = lastMsg
    ? lastMsg.sender_id === null
      ? lastMsg.body
      : lastMsg.sender_id === currentUserId
        ? `You: ${lastMsg.body}`
        : lastMsg.body
    : "No messages yet"

  return (
    <button
      onClick={onClick}
      className="w-full text-left flex items-center gap-3 px-4 py-3.5 transition-colors relative"
      style={{
        background: selected ? "var(--surface-raised)" : "transparent",
        borderBottom: "1px solid var(--border)",
        ...(selected ? { borderLeft: "2px solid var(--accent)", paddingLeft: 14 } : {}),
      }}
      onMouseEnter={e => { if (!selected) e.currentTarget.style.background = "var(--surface)" }}
      onMouseLeave={e => { if (!selected) e.currentTarget.style.background = "transparent" }}
    >
      <UserAvatar name={name} url={other.avatar_url} size={40} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <span
            className="text-[13px] truncate font-medium"
            style={{ color: selected ? "var(--text)" : "var(--text-muted)" }}
          >
            {name}
          </span>
          <span
            className="text-[10px] ml-2 shrink-0"
            style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--text-faint)" }}
          >
            {lastMsg ? formatTime(lastMsg.created_at) : ""}
          </span>
        </div>
        <div
          className="text-[10px] truncate mb-0.5"
          style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--accent)" }}
        >
          {thread.listing_title}
        </div>
        <div className="flex items-center justify-between gap-2">
          <span
            className="text-[12px] truncate"
            style={{ color: "var(--text-faint)" }}
          >
            {preview}
          </span>
          {thread.unread_count > 0 && (
            <span
              className="shrink-0 flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold"
              style={{ background: "var(--accent)", color: "#ffffff" }}
            >
              {thread.unread_count > 9 ? "9+" : thread.unread_count}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function MessageRow({ msg, isOwn }: { msg: Message; isOwn: boolean }) {
  if (msg.is_system) {
    return (
      <div className="flex justify-center my-4">
        <div
          className="px-4 py-1.5 rounded-sm text-[11px] tracking-wider text-center max-w-[85%]"
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            color: "var(--accent)",
            background: "rgba(37,99,235,0.08)",
            border: "1px solid rgba(37,99,235,0.2)",
          }}
        >
          {msg.body}
        </div>
      </div>
    )
  }

  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-3`}>
      <div className={`max-w-[72%] ${isOwn ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
        <div
          className="px-3.5 py-2 rounded-sm text-[14px] leading-relaxed"
          style={
            isOwn
              ? {
                  background: "rgba(37,99,235,0.18)",
                  color: "var(--text)",
                  border: "1px solid rgba(37,99,235,0.25)",
                }
              : {
                  background: "var(--surface-raised)",
                  color: "var(--text)",
                  border: "1px solid var(--border)",
                }
          }
        >
          {msg.body}
        </div>
        <span
          className="text-[10px] px-1"
          style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--text-faint)" }}
        >
          {formatTime(msg.created_at)}
        </span>
      </div>
    </div>
  )
}

// ─── Progress pip ─────────────────────────────────────────────────────────────
// Small two-step visual used in the in_transit and handed_over bars.

function DeliveryProgress({ step }: { step: 1 | 2 }) {
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      {/* Step 1: courier handover */}
      <div
        className="w-2 h-2 rounded-sm transition-all"
        style={{ background: step >= 1 ? "var(--success)" : "var(--border)" }}
        title="Courier marks delivered"
      />
      <div className="w-4 h-px" style={{ background: "var(--border)" }} />
      {/* Step 2: recipient receipt */}
      <div
        className="w-2 h-2 rounded-sm transition-all"
        style={{ background: step >= 2 ? "var(--success)" : "var(--border)" }}
        title="Recipient confirms receipt"
      />
    </div>
  )
}

// ─── Match bar ────────────────────────────────────────────────────────────────

function MatchBar({
  match,
  listing,
  otherName,
  otherId,
  onConfirm,
  onHandover,
  onReceived,
  busy,
  justMatched,
}: {
  match: MatchState
  listing: ThreadDetail["listing"]
  otherName: string
  otherId: string
  onConfirm: () => void
  onHandover: () => void
  onReceived: () => void
  busy: boolean
  justMatched: boolean
}) {
  const kind = match.listing_kind ?? listing?.kind ?? null
  const kColor = kindColor(kind)

  const barBase: React.CSSProperties = {
    borderBottom: "1px solid var(--border)",
    background: "var(--surface)",
  }

  const monoSm: React.CSSProperties = {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 11,
    letterSpacing: "0.1em",
  }

  function KindBadge() {
    if (!kind) return null
    return (
      <span
        className="text-[9px] px-1.5 py-0.5 rounded-sm"
        style={{ fontFamily: "'JetBrains Mono', monospace", color: kColor, background: `${kColor}18`, border: `1px solid ${kColor}30` }}
      >
        {kind.toUpperCase()}
      </span>
    )
  }

  function ActionBtn({
    onClick,
    disabled,
    variant = "primary",
    children,
  }: {
    onClick: () => void
    disabled?: boolean
    variant?: "primary" | "ghost" | "success"
    children: React.ReactNode
  }) {
    const [hov, setHov] = React.useState(false)
    const base: React.CSSProperties = {
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: "0.15em",
      borderRadius: 2,
      padding: "6px 14px",
      transition: "background 0.15s, opacity 0.15s",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.5 : 1,
    }
    const variants: Record<string, React.CSSProperties> = {
      primary: {
        background: hov && !disabled ? "var(--accent-dim)" : "var(--accent)",
        color: "#fff",
        border: "none",
      },
      ghost: {
        background: hov && !disabled ? "rgba(37,99,235,0.14)" : "rgba(37,99,235,0.07)",
        color: "var(--accent)",
        border: "1px solid rgba(37,99,235,0.35)",
      },
      success: {
        background: hov && !disabled ? "rgba(34,197,94,0.85)" : "var(--success)",
        color: "#000",
        border: "none",
      },
    }
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        style={{ ...base, ...variants[variant] }}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
      >
        {children}
      </button>
    )
  }

  // ── Completed ───────────────────────────────────────────────────────────────
  if (match.stage === "completed") {
    return (
      <div
        className="px-5 py-2.5 shrink-0 flex items-center justify-between gap-3"
        style={{ ...barBase, background: "rgba(34,197,94,0.04)" }}
      >
        <div className="flex items-center gap-2.5">
          <DeliveryProgress step={2} />
          <span style={{ ...monoSm, color: "var(--success)" }}>
            ✓ DELIVERY CONFIRMED
          </span>
          <KindBadge />
        </div>
        <Link
          to="/profile/$userId"
          params={{ userId: otherId }}
          className="text-[10px] tracking-widest transition-colors shrink-0"
          style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--accent)" }}
          onMouseEnter={e => (e.currentTarget.style.opacity = "0.7")}
          onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
        >
          LEAVE A REVIEW →
        </Link>
      </div>
    )
  }

  // ── Handed over — recipient's turn ──────────────────────────────────────────
  if (match.stage === "handed_over") {
    if (!match.is_me_courier) {
      // Recipient: big call-to-action
      return (
        <motion.div
          initial={{ boxShadow: "0 0 0px rgba(34,197,94,0)" }}
          animate={{ boxShadow: ["0 0 0px rgba(34,197,94,0)", "0 0 18px rgba(34,197,94,0.25)", "0 0 0px rgba(34,197,94,0)"] }}
          transition={{ duration: 1.1, delay: 0.2 }}
          className="px-5 py-2.5 shrink-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2"
          style={barBase}
        >
          <div className="flex items-center gap-2.5">
            <DeliveryProgress step={1} />
            <span style={{ ...monoSm, color: "var(--text-muted)" }}>
              {otherName.toUpperCase()} MARKED AS DELIVERED
            </span>
            <KindBadge />
          </div>
          <ActionBtn onClick={onReceived} disabled={busy} variant="success">
            {busy ? "…" : "CONFIRM RECEIPT ✓"}
          </ActionBtn>
        </motion.div>
      )
    }
    // Courier: waiting
    return (
      <div className="px-5 py-2.5 shrink-0 flex items-center gap-3" style={barBase}>
        <DeliveryProgress step={1} />
        <span style={{ ...monoSm, color: "var(--text-muted)" }}>
          <span className="animate-pulse">●</span>
          {" "}MARKED AS DELIVERED — WAITING FOR RECEIPT CONFIRMATION
        </span>
      </div>
    )
  }

  // ── In transit (both agreed, nothing handed over yet) ───────────────────────
  if (match.stage === "in_transit") {
    return (
      <motion.div
        initial={justMatched ? { boxShadow: "0 0 0px rgba(37,99,235,0)" } : false}
        animate={justMatched ? { boxShadow: ["0 0 0px rgba(37,99,235,0)", "0 0 20px rgba(37,99,235,0.3)", "0 0 0px rgba(37,99,235,0)"] } : {}}
        transition={{ duration: 0.9 }}
        className="px-5 py-2.5 shrink-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2"
        style={barBase}
      >
        <div className="flex items-center gap-2.5 flex-wrap">
          <DeliveryProgress step={0 as never} />
          <span style={{ ...monoSm, color: "var(--text-muted)" }}>
            {match.is_me_courier ? "ARRANGE PICKUP — MARK DELIVERED WHEN DONE" : "ARRANGEMENT CONFIRMED — AWAITING HANDOVER"}
          </span>
          <KindBadge />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {match.is_me_courier ? (
            <ActionBtn onClick={onHandover} disabled={busy} variant="ghost">
              {busy ? "…" : "MARK AS DELIVERED"}
            </ActionBtn>
          ) : (
            // Recipient can also confirm receipt directly (e.g. courier is present)
            <ActionBtn onClick={onReceived} disabled={busy} variant="ghost">
              {busy ? "…" : "CONFIRM RECEIPT"}
            </ActionBtn>
          )}
        </div>
      </motion.div>
    )
  }

  // ── Waiting for other to confirm ────────────────────────────────────────────
  if (match.me_confirmed && !match.both_confirmed) {
    return (
      <div
        className="px-5 py-2.5 shrink-0 text-center text-[11px] tracking-wider"
        style={{ ...barBase, color: "var(--text-muted)" }}
      >
        <span style={monoSm}>
          <span className="animate-pulse">●</span>
          {" "}WAITING FOR {otherName.toUpperCase()} TO CONFIRM…
        </span>
      </div>
    )
  }

  // ── None — invite to confirm ─────────────────────────────────────────────
  return (
    <div
      className="px-5 py-2.5 shrink-0 flex items-center justify-between gap-3"
      style={barBase}
    >
      <div className="flex items-center gap-3">
        <span style={{ ...monoSm, color: "var(--text-muted)" }}>
          CONFIRM ARRANGEMENT
        </span>
        <KindBadge />
      </div>
      <ActionBtn onClick={onConfirm} disabled={busy} variant="ghost">
        {busy ? "…" : "CONFIRM"}
      </ActionBtn>
    </div>
  )
}

// ─── Conversation panel ───────────────────────────────────────────────────────

function ConversationPanel({
  thread,
  messages,
  currentUserId,
  match,
  onSend,
  onConfirm,
  onHandover,
  onReceived,
  onBack,
}: {
  thread: ThreadDetail
  messages: Message[]
  currentUserId: string
  match: MatchState | null
  onSend: (body: string) => Promise<void>
  onConfirm: () => Promise<void>
  onHandover: () => Promise<void>
  onReceived: () => Promise<void>
  onBack: () => void
}) {
  const [input, setInput] = React.useState("")
  const [sending, setSending] = React.useState(false)
  const [matchBusy, setMatchBusy] = React.useState(false)
  const [justMatched, setJustMatched] = React.useState(false)
  const [inputFocused, setInputFocused] = React.useState(false)
  const prevBoth = React.useRef<boolean>(match?.both_confirmed ?? false)
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const other = thread.other_participant
  const listing = thread.listing
  const listingLabel = listing?.title || (listing ? `${listing.origin_city} → ${listing.dest_city}` : "")

  React.useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages.length])

  React.useEffect(() => {
    const nowBoth = match?.both_confirmed ?? false
    if (nowBoth && !prevBoth.current) setJustMatched(true)
    prevBoth.current = nowBoth
  }, [match?.both_confirmed])

  async function handleSend() {
    const text = input.trim()
    if (!text || sending) return
    setInput("")
    setSending(true)
    try {
      await onSend(text)
    } finally {
      setSending(false)
    }
  }

  async function handleConfirm() {
    setMatchBusy(true)
    try { await onConfirm() } finally { setMatchBusy(false) }
  }

  async function handleHandover() {
    setMatchBusy(true)
    try { await onHandover() } finally { setMatchBusy(false) }
  }

  async function handleReceived() {
    setMatchBusy(true)
    try { await onReceived() } finally { setMatchBusy(false) }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const isCompleted = match?.stage === "completed"

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--bg)" }}>
      {/* Header */}
      <div
        className="flex items-center gap-3 px-5 py-3.5 shrink-0"
        style={{ borderBottom: "1px solid var(--border)", background: "var(--surface)" }}
      >
        <button
          onClick={onBack}
          className="lg:hidden mr-1 text-[11px] tracking-widest transition-colors"
          style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--text-muted)" }}
          onMouseEnter={e => (e.currentTarget.style.color = "var(--text)")}
          onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}
        >
          ←
        </button>
        <Link to="/profile/$userId" params={{ userId: other.id }} className="shrink-0">
          <UserAvatar name={other.display_name} url={other.avatar_url} size={36} />
        </Link>
        <div className="flex-1 min-w-0">
          <Link
            to="/profile/$userId"
            params={{ userId: other.id }}
            className="text-[14px] font-medium transition-colors"
            style={{ color: "var(--text)" }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--accent)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--text)")}
          >
            {other.display_name ?? "Anonymous"}
          </Link>
          {listingLabel && (
            <div
              className="text-[10px] truncate"
              style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--accent)" }}
            >
              {listingLabel}
            </div>
          )}
        </div>
        {listing?.kind && (
          <span
            className="text-[9px] px-2 py-0.5 rounded-sm shrink-0"
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              color: kindColor(listing.kind),
              background: `${kindColor(listing.kind)}18`,
              border: `1px solid ${kindColor(listing.kind)}30`,
            }}
          >
            {listing.kind.toUpperCase()}
          </span>
        )}
      </div>

      {/* Match bar */}
      {match && (
        <MatchBar
          match={match}
          listing={listing}
          otherName={other.display_name ?? "the other party"}
          otherId={other.id}
          onConfirm={handleConfirm}
          onHandover={handleHandover}
          onReceived={handleReceived}
          busy={matchBusy}
          justMatched={justMatched}
        />
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-5">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p
              className="text-[11px] tracking-widest"
              style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--text-faint)" }}
            >
              NO MESSAGES YET — SAY HELLO
            </p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                <MessageRow msg={msg} isOwn={msg.sender_id === currentUserId} />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Input */}
      <div
        className="shrink-0 px-5 py-4 flex gap-3 items-end"
        style={{ borderTop: "1px solid var(--border)", background: "var(--surface)" }}
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          onFocus={() => setInputFocused(true)}
          onBlur={() => setInputFocused(false)}
          placeholder={isCompleted ? "This conversation is archived — read only." : "Type a message… (Enter to send)"}
          disabled={isCompleted}
          rows={1}
          className="flex-1 rounded-sm px-4 py-2.5 text-[14px] resize-none focus:outline-none transition-colors disabled:opacity-50"
          style={{
            minHeight: 42,
            maxHeight: 120,
            background: "var(--surface-raised)",
            border: `1px solid ${inputFocused ? "var(--accent)" : "var(--border)"}`,
            color: "var(--text)",
            caretColor: "var(--accent)",
          }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || sending || isCompleted}
          className="px-5 py-2.5 text-[11px] font-bold tracking-widest rounded-sm transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            background: "var(--accent)",
            color: "#ffffff",
          }}
          onMouseEnter={e => { if (input.trim() && !sending && !isCompleted) e.currentTarget.style.background = "var(--accent-dim)" }}
          onMouseLeave={e => { e.currentTarget.style.background = "var(--accent)" }}
        >
          {sending ? "…" : "SEND"}
        </button>
      </div>
    </div>
  )
}

// ─── Empty / placeholder states ───────────────────────────────────────────────

function EmptyConversation({ noThreads }: { noThreads: boolean }) {
  const navigate = useNavigate()
  return (
    <div
      className="flex flex-col items-center justify-center h-full gap-5 px-8 text-center"
      style={{ background: "var(--bg)" }}
    >
      {noThreads ? (
        <>
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style={{ opacity: 0.15 }}>
            <circle cx="8" cy="24" r="4" stroke="var(--accent)" strokeWidth="1.5" />
            <circle cx="40" cy="24" r="4" stroke="var(--accent)" strokeWidth="1.5" />
            <circle cx="24" cy="8" r="4" stroke="var(--accent)" strokeWidth="1.5" />
            <line x1="12" y1="24" x2="36" y2="24" stroke="var(--accent)" strokeWidth="1" strokeDasharray="3 2" />
            <line x1="24" y1="12" x2="24" y2="20" stroke="var(--accent)" strokeWidth="1" strokeDasharray="3 2" />
            <line x1="8" y1="20" x2="24" y2="12" stroke="var(--accent)" strokeWidth="1" strokeDasharray="3 2" />
          </svg>
          <div>
            <p
              className="text-[11px] tracking-[0.2em] mb-2"
              style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--text-faint)" }}
            >
              NO CONVERSATIONS YET
            </p>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Browse listings and contact someone to start a thread.
            </p>
          </div>
          <button
            onClick={() => navigate({ to: "/browse" })}
            className="mt-1 px-6 py-2.5 text-[11px] tracking-widest rounded-sm transition-colors"
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              border: "1px solid var(--border)",
              color: "var(--text-muted)",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = "var(--accent)"
              e.currentTarget.style.color = "var(--accent)"
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = "var(--border)"
              e.currentTarget.style.color = "var(--text-muted)"
            }}
          >
            BROWSE LISTINGS →
          </button>
        </>
      ) : (
        <p
          className="text-[11px] tracking-widest"
          style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--text-faint)" }}
        >
          SELECT A CONVERSATION
        </p>
      )}
    </div>
  )
}

function PanelSpinner() {
  return (
    <div className="flex items-center justify-center h-full" style={{ background: "var(--bg)" }}>
      <div
        className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: "var(--border)", borderTopColor: "var(--accent)" }}
      />
    </div>
  )
}

// ─── Main Inbox ───────────────────────────────────────────────────────────────

export function Inbox({ initialThreadId }: { initialThreadId?: string }) {
  const { session, user } = useAuth()
  const token = session?.access_token ?? ""

  const [threads, setThreads] = React.useState<ThreadSummary[]>([])
  const [threadsLoading, setThreadsLoading] = React.useState(true)
  const [selectedId, setSelectedId] = React.useState<string | null>(initialThreadId ?? null)
  const [threadDetail, setThreadDetail] = React.useState<ThreadDetail | null>(null)
  const [messages, setMessages] = React.useState<Message[]>([])
  const [match, setMatch] = React.useState<MatchState | null>(null)
  const [detailLoading, setDetailLoading] = React.useState(false)
  const navigate = useNavigate()

  // ── Load thread list ────────────────────────────────────────────────────────
  function loadThreads() {
    if (!token) return
    apiFetchThreads(token).then(setThreads).catch(() => {})
  }

  React.useEffect(() => {
    if (!token) return
    setThreadsLoading(true)
    apiFetchThreads(token)
      .then(setThreads)
      .catch(() => {})
      .finally(() => setThreadsLoading(false))
  }, [token])

  React.useEffect(() => {
    if (!token) return
    const id = setInterval(loadThreads, 60_000)
    return () => clearInterval(id)
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load selected thread ────────────────────────────────────────────────────
  React.useEffect(() => {
    if (!selectedId || !token) return
    setDetailLoading(true)
    setMatch(null)
    apiFetchThread(selectedId, token)
      .then((detail) => {
        setThreadDetail(detail)
        setMessages(detail.messages)
        apiMarkRead(selectedId, token).then(() => {
          setThreads((prev) =>
            prev.map((t) => (t.id === selectedId ? { ...t, unread_count: 0 } : t))
          )
        })
        apiGetMatchState(selectedId, token).then(setMatch).catch(() => setMatch(null))
      })
      .catch(() => {})
      .finally(() => setDetailLoading(false))
  }, [selectedId, token])

  // ── Realtime: new messages ──────────────────────────────────────────────────
  React.useEffect(() => {
    if (!selectedId || !supabase) return
    const channel = supabase
      .channel(`messages:${selectedId}`)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .on("postgres_changes" as any, {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `thread_id=eq.${selectedId}`,
      }, (payload: { new: Message }) => {
        const msg = payload.new
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev
          return [...prev, msg]
        })
        if (msg.sender_id !== user?.id && token) {
          apiMarkRead(selectedId, token)
        }
        setThreads((prev) =>
          prev.map((t) =>
            t.id === selectedId
              ? {
                  ...t,
                  last_message: { id: msg.id, body: msg.body, created_at: msg.created_at, sender_id: msg.sender_id },
                  unread_count: 0,
                }
              : t
          )
        )
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [selectedId, token, user?.id])

  // ── Realtime: match confirmation updates ────────────────────────────────────
  React.useEffect(() => {
    if (!selectedId || !supabase || !token) return
    const channel = supabase
      .channel(`matches:${selectedId}`)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .on("postgres_changes" as any, {
        event: "INSERT",
        schema: "public",
        table: "match_confirmations",
        filter: `thread_id=eq.${selectedId}`,
      }, () => {
        apiGetMatchState(selectedId, token).then(setMatch).catch(() => {})
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [selectedId, token])

  // ── Realtime: delivery_confirmations updates ────────────────────────────────
  React.useEffect(() => {
    if (!selectedId || !supabase || !token) return
    const channel = supabase
      .channel(`delivery:${selectedId}`)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .on("postgres_changes" as any, {
        event: "UPDATE",
        schema: "public",
        table: "delivery_confirmations",
        filter: `thread_id=eq.${selectedId}`,
      }, () => {
        apiGetMatchState(selectedId, token).then(setMatch).catch(() => {})
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [selectedId, token])

  // ── Realtime: new threads ───────────────────────────────────────────────────
  React.useEffect(() => {
    if (!user?.id || !supabase || !token) return
    const channel = supabase
      .channel(`new-threads:${user.id}`)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .on("postgres_changes" as any, {
        event: "INSERT",
        schema: "public",
        table: "thread_participants",
        filter: `user_id=eq.${user.id}`,
      }, () => {
        setTimeout(loadThreads, 400)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user?.id, token]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Actions ─────────────────────────────────────────────────────────────────

  function selectThread(id: string) {
    setSelectedId(id)
    setThreadDetail(null)
    setMessages([])
    navigate({ to: "/messages/$threadId", params: { threadId: id } })
  }

  function handleBack() {
    setSelectedId(null)
    setThreadDetail(null)
    navigate({ to: "/messages" })
  }

  async function handleSend(body: string) {
    if (!selectedId || !token) return
    const msg = await apiSend(selectedId, body, token)
    setMessages((prev) => [...prev, msg])
    setThreads((prev) =>
      prev.map((t) =>
        t.id === selectedId
          ? { ...t, last_message: { id: msg.id, body: msg.body, created_at: msg.created_at, sender_id: msg.sender_id } }
          : t
      )
    )
  }

  async function handleConfirm() {
    if (!selectedId || !token) return
    const res = await apiConfirmMatch(selectedId, token)
    const updated = await apiGetMatchState(selectedId, token).catch(() => null)
    if (updated) setMatch(updated)
    if (res.both_confirmed) {
      apiFetchThread(selectedId, token)
        .then((detail) => setMessages(detail.messages))
        .catch(() => {})
    }
  }

  async function handleHandover() {
    if (!selectedId || !token) return
    await apiHandover(selectedId, token)
    const updated = await apiGetMatchState(selectedId, token).catch(() => null)
    if (updated) setMatch(updated)
    // Pull the new system message
    apiFetchThread(selectedId, token)
      .then((detail) => setMessages(detail.messages))
      .catch(() => {})
  }

  async function handleReceived() {
    if (!selectedId || !token) return
    await apiReceived(selectedId, token)
    const updated = await apiGetMatchState(selectedId, token).catch(() => null)
    if (updated) setMatch(updated)
    // Pull the completion system message — thread stays visible
    apiFetchThread(selectedId, token)
      .then((detail) => setMessages(detail.messages))
      .catch(() => {})
  }

  // ── Layout ──────────────────────────────────────────────────────────────────

  const showMobileList = !selectedId
  const showConversation = !!selectedId && !!threadDetail
  const totalUnread = threads.reduce((s, t) => s + t.unread_count, 0)

  return (
    <div
      className="h-screen pt-16 flex flex-col overflow-hidden"
      style={{ background: "var(--bg)" }}
    >
      <div className="flex flex-1 overflow-hidden">
        {/* ── Thread list ─────────────────────────────────────────────────── */}
        <div
          className={`${showMobileList ? "flex" : "hidden"} lg:flex flex-col w-full lg:w-[300px] shrink-0 overflow-y-auto`}
          style={{ borderRight: "1px solid var(--border)", background: "var(--surface)" }}
        >
          <div
            className="px-5 py-4 shrink-0 flex items-center justify-between"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 rounded-sm" style={{ background: "rgba(37,99,235,0.4)" }} />
              <h1
                className="text-[11px] tracking-[0.2em]"
                style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--text-muted)" }}
              >
                MESSAGES
              </h1>
            </div>
            {totalUnread > 0 && (
              <span
                className="flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-bold"
                style={{ background: "var(--accent)", color: "#fff" }}
              >
                {totalUnread > 99 ? "99+" : totalUnread}
              </span>
            )}
          </div>

          {threadsLoading ? (
            <div className="flex items-center justify-center flex-1">
              <div
                className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: "var(--border)", borderTopColor: "var(--accent)" }}
              />
            </div>
          ) : threads.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 gap-3 px-6 text-center">
              <p
                className="text-[11px] tracking-widest"
                style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--text-faint)" }}
              >
                NO CONVERSATIONS YET
              </p>
              <button
                onClick={() => navigate({ to: "/browse" })}
                className="text-[11px] tracking-widest transition-colors"
                style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--accent)" }}
                onMouseEnter={e => (e.currentTarget.style.opacity = "0.7")}
                onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
              >
                BROWSE LISTINGS →
              </button>
            </div>
          ) : (
            threads.map((thread) => (
              <ThreadItem
                key={thread.id}
                thread={thread}
                selected={thread.id === selectedId}
                currentUserId={user?.id ?? ""}
                onClick={() => selectThread(thread.id)}
              />
            ))
          )}
        </div>

        {/* ── Conversation panel ──────────────────────────────────────────── */}
        <div className={`${showMobileList ? "hidden" : "flex"} lg:flex flex-col flex-1 overflow-hidden`}>
          {detailLoading ? (
            <PanelSpinner />
          ) : showConversation ? (
            <ConversationPanel
              thread={threadDetail}
              messages={messages}
              currentUserId={user?.id ?? ""}
              match={match}
              onSend={handleSend}
              onConfirm={handleConfirm}
              onHandover={handleHandover}
              onReceived={handleReceived}
              onBack={handleBack}
            />
          ) : (
            <EmptyConversation noThreads={threads.length === 0} />
          )}
        </div>
      </div>
    </div>
  )
}
