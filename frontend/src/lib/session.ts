/** Session tokens for the self-hosted backend (replaces supabase-js auth).
 *
 * Access token: short-lived JWT, sent as `Authorization: Bearer`.
 * Refresh token: opaque, rotated by POST /api/auth/refresh.
 * authedFetch attaches the token and retries once after a refresh.
 */
const API_BASE = import.meta.env.VITE_API_URL ?? ""

export interface SessionTokens {
  access_token: string
  refresh_token: string
}

const KEY = "viactor.session"

export function loadSession(): SessionTokens | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (typeof parsed?.access_token !== "string" || typeof parsed?.refresh_token !== "string") {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function saveSession(tokens: SessionTokens) {
  localStorage.setItem(KEY, JSON.stringify(tokens))
}

export function clearSession() {
  localStorage.removeItem(KEY)
}

async function doRefresh(): Promise<string | null> {
  const current = loadSession()
  if (!current) return null
  let res: Response
  try {
    res = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: current.refresh_token }),
    })
  } catch {
    // Backend unreachable (restart, network): keep the session, retry later.
    // Clearing here is what used to log people out on every restart.
    return null
  }
  if (res.status === 401) {
    // Refresh truly dead (rotated, expired, account deleted): let go.
    clearSession()
    return null
  }
  if (!res.ok) return null
  try {
    const pair = (await res.json()) as SessionTokens
    saveSession(pair)
    return pair.access_token
  } catch {
    return null
  }
}

// Single-flight: parallel polls must not burn the single-use refresh token
// against each other. Losers used to wipe the session mid-use.
let inflight: Promise<string | null> | null = null

async function refreshTokens(): Promise<string | null> {
  if (!inflight) {
    inflight = doRefresh().finally(() => {
      inflight = null
    })
  }
  return inflight
}

export async function getAccessToken(): Promise<string | null> {
  return loadSession()?.access_token ?? null
}

export async function authedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  // FormData sets its own multipart Content-Type (with boundary). A forced
  // application/json header would corrupt the upload.
  const isForm = typeof FormData !== "undefined" && options.body instanceof FormData
  const attempt = (token?: string) =>
    fetch(`${API_BASE}${url}`, {
      ...options,
      headers: {
        ...(isForm ? {} : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers ?? {}),
      },
    })

  const response = await attempt(loadSession()?.access_token ?? undefined)
  if (response.status !== 401) return response
  const token = await refreshTokens()
  if (!token) return response
  return attempt(token)
}
