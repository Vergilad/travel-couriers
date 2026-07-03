import * as React from "react"
import { useNavigate, Link } from "@tanstack/react-router"
import { motion } from "framer-motion"
import { useAuth } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import { getInitial } from "@/lib/db_constants"

// ─── Types ───────────────────────────────────────────────────────────────────

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
  stage: "none" | "matched" | "done"
  me_confirmed: boolean
  other_confirmed: boolean
  both_confirmed: boolean
  listing_kind: string | null
  listing_status: string | null
}

// ─── API helpers ─────────────────────────────────────────────────────────────

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
  const res = await fetch(`/api/matches/confirm?thread_id=${threadId}`, { method: "POST", headers: authHeaders(token) })
  if (!res.ok) {
    const d = await res.json().catch(() => ({}))
    throw new Error(d.detail ?? "Failed to confirm")
  }
  return res.json()
}

async function apiCloseDeal(threadId: string, token: string): Promise<void> {
  const res = await fetch(`/api/matches/close-deal?thread_id=${threadId}`, { method: "POST", headers: authHeaders(token) })
  if (!res.ok) {
    const d = await res.json().catch(() => ({}))
    throw new Error(d.detail ?? "Failed to close deal")
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  const date = new Date(iso)
  const diff = Date.now() - date.getTime()
  if (diff < 60_000) return "just now"
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  if (diff < 604_800_000) return date.toLocaleDateString([], { weekday: "short" })
  return date.toLocaleDateString([], { month: "short", day: "numeric" })
}

function UserAvatar({ name, url, size }: { name: string | null; url?: string | null; size: number }) {
  return (
    <div
      className="rounded-full bg-[#1A1208] border border-[#2E2418] flex items-center justify-center shrink-0 overflow-hidden"
      style={{ width: size, height: size }}
    >
      {url ? (
        <img src={url} alt={name ?? ""} className="w-full h-full object-cover" />
      ) : (
        <span
          className="text-[#C8956A]"
          style={{ fontFamily: "'DM Serif Display', serif", fontSize: size * 0.45 }}
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
  const preview = thread.last_message
    ? thread.last_message.sender_id === currentUserId
      ? `You: ${thread.last_message.body}`
      : thread.last_message.body
    : "No messages yet"

  return (
    <button
      onClick={onClick}
      className={`w-full text-left flex items-center gap-3 px-4 py-3.5 border-b border-[#1A1208] transition-colors ${
        selected ? "bg-[#1A1208]" : "hover:bg-[#111008]"
      }`}
    >
      <UserAvatar name={name} url={other.avatar_url} size={40} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <span className={`text-[13px] truncate ${selected ? "text-[#F4EDE4]" : "text-[#D4C9BC]"}`}>
            {name}
          </span>
          <span className="text-[10px] text-[#8C7B68] ml-2 shrink-0" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            {thread.last_message ? formatTime(thread.last_message.created_at) : ""}
          </span>
        </div>
        <div className="text-[10px] text-[#C8956A] truncate mb-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          {thread.listing_title}
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[12px] text-[#8C7B68] truncate">{preview}</span>
          {thread.unread_count > 0 && (
            <span className="shrink-0 flex items-center justify-center w-4 h-4 rounded-full bg-[#C8956A] text-[#0E0B08] text-[9px] font-bold">
              {thread.unread_count}
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
      <div className="flex justify-center mb-3">
        <div
          className="px-4 py-1.5 rounded-full text-[11px] tracking-wider text-[#C8956A] bg-[#C8956A]/08 border border-[#C8956A]/20 text-center max-w-[85%]"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
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
          className={`px-3.5 py-2 rounded-md text-[14px] leading-relaxed ${
            isOwn
              ? "bg-[#C8956A]/20 text-[#F4EDE4] border border-[#C8956A]/20"
              : "bg-[#1A1208] text-[#D4C9BC] border border-[#2E2418]"
          }`}
        >
          {msg.body}
        </div>
        <span className="text-[10px] text-[#8C7B68] px-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          {formatTime(msg.created_at)}
        </span>
      </div>
    </div>
  )
}

// ─── Match bar (Stage 1 confirm + Stage 2 close-the-deal) ─────────────────────

function MatchBar({
  match,
  otherName,
  onConfirm,
  onDeal,
  busy,
  justMatched,
}: {
  match: MatchState
  otherName: string
  onConfirm: () => void
  onDeal: () => void
  busy: boolean
  justMatched: boolean
}) {
  if (match.stage === "done") {
    return (
      <div
        className="px-5 py-2.5 border-b border-[#1E1810] text-center text-[11px] tracking-widest text-[#7EB89A] bg-[#7EB89A]/05"
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        ✓ DEAL ARCHIVED
      </div>
    )
  }

  if (match.both_confirmed) {
    return (
      <div className="px-5 py-2.5 border-b border-[#1E1810] bg-[#1A1208] flex flex-col sm:flex-row items-center justify-between gap-2">
        <span
          className="text-[11px] tracking-wider text-[#7EB89A] flex items-center gap-2"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          <motion.span
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-block"
          >
            ✓
          </motion.span>
          MATCHED — agree on the details, then close the deal
        </span>
        <button
          onClick={onDeal}
          disabled={busy}
          className="px-4 py-1.5 bg-[#C8956A] hover:bg-[#D4A855] disabled:opacity-60 text-[#0E0B08] text-[10px] font-bold tracking-widest rounded-full transition-colors shrink-0"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          {busy ? "…" : "CLOSE THE DEAL"}
        </button>
      </div>
    )
  }

  if (match.me_confirmed && !match.both_confirmed) {
    return (
      <div
        className="px-5 py-2.5 border-b border-[#1E1810] text-center text-[11px] tracking-wider text-[#8C7B68]"
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        WAITING FOR {otherName.toUpperCase()} TO CONFIRM…
      </div>
    )
  }

  return (
    <motion.div
      initial={justMatched ? { scale: [1, 1.02, 1], boxShadow: ["0 0 0px rgba(200,149,106,0)", "0 0 24px rgba(200,149,106,0.35)", "0 0 0px rgba(200,149,106,0)"] } : false}
      transition={{ duration: 0.9 }}
      className="px-5 py-2.5 border-b border-[#1E1810] bg-[#1A1208] flex items-center justify-between gap-3"
    >
      <span className="text-[11px] tracking-wider text-[#8C7B68]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
        CONFIRM TO CONNECT
      </span>
      <button
        onClick={onConfirm}
        disabled={busy}
        className="px-4 py-1.5 border border-[#C8956A]/40 hover:bg-[#C8956A]/10 text-[#C8956A] text-[10px] font-bold tracking-widest rounded-full transition-colors shrink-0 disabled:opacity-60"
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        {busy ? "…" : "CONFIRM MATCH"}
      </button>
    </motion.div>
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
  onDeal,
  onBack,
}: {
  thread: ThreadDetail
  messages: Message[]
  currentUserId: string
  match: MatchState | null
  onSend: (body: string) => Promise<void>
  onConfirm: () => Promise<void>
  onDeal: () => Promise<void>
  onBack: () => void
}) {
  const [input, setInput] = React.useState("")
  const [sending, setSending] = React.useState(false)
  const [matchBusy, setMatchBusy] = React.useState(false)
  const [justMatched, setJustMatched] = React.useState(false)
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

  // Fire the "just matched" glow once when both_confirmed flips true.
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

  async function handleDeal() {
    setMatchBusy(true)
    try { await onDeal() } finally { setMatchBusy(false) }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const dealDone = match?.stage === "done"

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[#1E1810] shrink-0">
        <button
          onClick={onBack}
          className="lg:hidden text-[#8C7B68] hover:text-[#F4EDE4] mr-1 text-[11px] tracking-widest transition-colors"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          ←
        </button>
        <Link to="/profile/$userId" params={{ userId: other.id }} className="shrink-0">
          <UserAvatar name={other.display_name} url={other.avatar_url} size={36} />
        </Link>
        <div className="flex-1 min-w-0">
          <Link to="/profile/$userId" params={{ userId: other.id }} className="text-[14px] text-[#F4EDE4] hover:text-[#C8956A] transition-colors">
            {other.display_name ?? "Anonymous"}
          </Link>
          {listingLabel && (
            <div
              className="text-[10px] text-[#C8956A] truncate"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {listingLabel}
            </div>
          )}
        </div>
      </div>

      {/* Match bar (hidden once deal is archived) */}
      {match && !dealDone && (
        <MatchBar
          match={match}
          otherName={other.display_name ?? "the other party"}
          onConfirm={handleConfirm}
          onDeal={handleDeal}
          busy={matchBusy}
          justMatched={justMatched}
        />
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-5">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p
              className="text-[11px] text-[#3A2E20] tracking-widest"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              NO MESSAGES YET — SAY HELLO
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageRow key={msg.id} msg={msg} isOwn={msg.sender_id === currentUserId} />
          ))
        )}
      </div>

      {/* Input — disabled once deal is done */}
      <div className="shrink-0 px-5 py-4 border-t border-[#1E1810] flex gap-3 items-end">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder={dealDone ? "This conversation is closed." : "Type a message…"}
          disabled={dealDone}
          rows={1}
          className="flex-1 bg-[#111008] border border-[#2E2418] rounded-md px-4 py-2.5 text-[14px] text-[#F4EDE4] placeholder-[#3A2E20] resize-none focus:outline-none focus:border-[#C8956A]/40 transition-colors disabled:opacity-50"
          style={{ minHeight: 42, maxHeight: 120 }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || sending || dealDone}
          className="px-5 py-2.5 bg-[#C8956A] hover:bg-[#D4A855] disabled:opacity-40 disabled:cursor-not-allowed text-[#0E0B08] text-[11px] font-bold tracking-widest rounded-full transition-colors shrink-0"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          SEND
        </button>
      </div>
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ noThreads }: { noThreads: boolean }) {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 px-8 text-center">
      {noThreads ? (
        <>
          <div
            className="text-5xl text-[#2E2418]"
            style={{ fontFamily: "'DM Serif Display', serif" }}
          >
            ✉
          </div>
          <p className="text-[#F4EDE4] text-lg" style={{ fontFamily: "'DM Serif Display', serif" }}>
            No conversations yet
          </p>
          <p className="text-[#8C7B68] text-sm">
            Browse listings and contact someone to start messaging.
          </p>
          <button
            onClick={() => navigate({ to: "/browse" })}
            className="mt-2 px-6 py-2.5 border border-[#2E2418] hover:border-[#C8956A]/40 text-[#8C7B68] hover:text-[#F4EDE4] text-[11px] tracking-widest rounded-full transition-colors"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            BROWSE LISTINGS
          </button>
        </>
      ) : (
        <p
          className="text-[11px] text-[#3A2E20] tracking-widest"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          SELECT A CONVERSATION
        </p>
      )}
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

  // Load thread list
  React.useEffect(() => {
    if (!token) return
    setThreadsLoading(true)
    apiFetchThreads(token)
      .then(setThreads)
      .catch(() => {})
      .finally(() => setThreadsLoading(false))
  }, [token])

  // Load selected thread
  React.useEffect(() => {
    if (!selectedId || !token) return
    setDetailLoading(true)
    setMatch(null)
    apiFetchThread(selectedId, token)
      .then((detail) => {
        setThreadDetail(detail)
        setMessages(detail.messages)
        // Mark as read
        apiMarkRead(selectedId, token).then(() => {
          setThreads((prev) =>
            prev.map((t) => (t.id === selectedId ? { ...t, unread_count: 0 } : t))
          )
        })
        // Load match state for this thread
        apiGetMatchState(selectedId, token).then(setMatch).catch(() => setMatch(null))
      })
      .catch(() => {})
      .finally(() => setDetailLoading(false))
  }, [selectedId, token])

  // Supabase realtime — subscribe to new messages in selected thread
  React.useEffect(() => {
    if (!selectedId || !supabase) return
    const channel = supabase
      .channel(`messages:${selectedId}`)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .on("postgres_changes" as any, { event: "INSERT", schema: "public", table: "messages", filter: `thread_id=eq.${selectedId}` }, (payload: { new: Message }) => {
          const msg = payload.new
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev
            return [...prev, msg]
          })
          // If message is from other user, mark as read immediately
          if (msg.sender_id !== user?.id && token) {
            apiMarkRead(selectedId, token)
          }
          // Update thread list last message
          setThreads((prev) =>
            prev.map((t) =>
              t.id === selectedId
                ? { ...t, last_message: { id: msg.id, body: msg.body, created_at: msg.created_at, sender_id: msg.sender_id }, unread_count: 0 }
                : t
            )
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedId, token, user?.id])

  // Realtime — refresh match state when a confirmation is inserted in this thread
  React.useEffect(() => {
    if (!selectedId || !supabase || !token) return
    const channel = supabase
      .channel(`matches:${selectedId}`)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .on("postgres_changes" as any, { event: "INSERT", schema: "public", table: "match_confirmations", filter: `thread_id=eq.${selectedId}` }, () => {
        apiGetMatchState(selectedId, token).then(setMatch).catch(() => {})
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedId, token])

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
    // Refresh full match state (the system message arrives via the messages
    // realtime channel and renders as a system bubble automatically).
    const updated = await apiGetMatchState(selectedId, token).catch(() => null)
    if (updated) setMatch(updated)
    if (res.both_confirmed) {
      // Both confirmed: pull the system message the backend just inserted.
      apiFetchThread(selectedId, token)
        .then((detail) => setMessages(detail.messages))
        .catch(() => {})
    }
  }

  async function handleDeal() {
    if (!selectedId || !token) return
    await apiCloseDeal(selectedId, token)
    setMatch({ stage: "done", me_confirmed: true, other_confirmed: true, both_confirmed: true, listing_kind: null, listing_status: "completed" })
    // For non-trip deals the listing/thread is deleted server-side; drop it
    // from the list after a short beat so the user sees the "archived" state.
    setTimeout(() => {
      setThreads((prev) => prev.filter((t) => t.id !== selectedId))
    }, 2500)
  }

  const showConversation = !!selectedId && !!threadDetail
  const showMobileList = !selectedId

  return (
    <div className="h-screen bg-[#0E0B08] pt-16 flex flex-col overflow-hidden">
      <div className="flex flex-1 overflow-hidden">
        {/* Thread list — hidden on mobile when thread selected */}
        <div
          className={`${showMobileList ? "flex" : "hidden"} lg:flex flex-col w-full lg:w-[320px] shrink-0 border-r border-[#1E1810] overflow-y-auto`}
        >
          <div className="px-5 py-4 border-b border-[#1E1810] shrink-0">
            <h1
              className="text-[11px] tracking-[0.2em] text-[#8C7B68]"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              MESSAGES
            </h1>
          </div>

          {threadsLoading ? (
            <div className="flex items-center justify-center flex-1 gap-2">
              <div className="w-4 h-4 rounded-full border border-[#C8956A]/20 border-t-[#C8956A] animate-spin" />
            </div>
          ) : threads.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 gap-3 px-6 text-center">
              <p
                className="text-[11px] text-[#3A2E20] tracking-widest"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                NO CONVERSATIONS YET
              </p>
              <button
                onClick={() => navigate({ to: "/browse" })}
                className="text-[11px] text-[#C8956A] hover:text-[#D4A855] tracking-widest transition-colors"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
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

        {/* Conversation panel */}
        <div className={`${showMobileList ? "hidden" : "flex"} lg:flex flex-col flex-1 overflow-hidden`}>
          {detailLoading ? (
            <div className="flex items-center justify-center flex-1 gap-2">
              <div className="w-5 h-5 rounded-full border border-[#C8956A]/20 border-t-[#C8956A] animate-spin" />
            </div>
          ) : showConversation ? (
            <ConversationPanel
              thread={threadDetail}
              messages={messages}
              currentUserId={user?.id ?? ""}
              match={match}
              onSend={handleSend}
              onConfirm={handleConfirm}
              onDeal={handleDeal}
              onBack={handleBack}
            />
          ) : (
            <EmptyState noThreads={threads.length === 0} />
          )}
        </div>
      </div>
    </div>
  )
}
