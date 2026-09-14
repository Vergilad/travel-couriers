-- Peregri canonical schema — self-hosted Postgres, no Supabase.
--
-- Fresh build: load into an empty database and you are done.
--   psql "$DATABASE_URL" -f db/schema.sql
-- Future changes go in numbered files under db/migrations/ (same tool).
--
-- Conventions (from CONTEXT/database design):
--   * Backend is the only database user. No RLS, no anon key: the
--     whole RLS hole class (direct client writes) cannot exist.
--   * Business logic lives in FastAPI, not here. No triggers:
--     signup inserts users+profiles in one transaction, and the
--     confirm/received multi-writes are single Python transactions.
--   * completed_deals is a denormalized snapshot on purpose: history
--     and review eligibility must survive later deletes.

CREATE EXTENSION IF NOT EXISTS citext;

-- ─── Auth (owned by FastAPI; replaces GoTrue) ─────────────────────────

CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         CITEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE refresh_tokens (
    token_sha256 TEXT PRIMARY KEY,
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at   TIMESTAMPTZ NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX refresh_tokens_user_idx ON refresh_tokens (user_id);

-- ─── Marketplace ─────────────────────────────────────────────────────

CREATE TABLE profiles (
    id                  UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    display_name        TEXT,
    avatar_url          TEXT,
    bio                 TEXT,
    city                TEXT,
    country             TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_banned           BOOLEAN NOT NULL DEFAULT FALSE,
    identity_verified   BOOLEAN NOT NULL DEFAULT FALSE,
    verification_method TEXT
);

CREATE TABLE user_roles (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role    TEXT NOT NULL CHECK (role IN ('user', 'moderator', 'admin')),
    PRIMARY KEY (user_id, role)
);

CREATE TABLE listings (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind             TEXT NOT NULL CHECK (kind IN ('carry', 'need')),
    -- Sender-side detail, settled in chat: must the carrier buy the item?
    -- Always FALSE for carry listings.
    needs_purchase   BOOLEAN NOT NULL DEFAULT FALSE,
    origin_city      TEXT NOT NULL,
    origin_country   TEXT NOT NULL,
    dest_city        TEXT NOT NULL,
    dest_country     TEXT NOT NULL,
    depart_date      DATE,
    arrive_date      DATE,
    date_flexibility TEXT NOT NULL DEFAULT 'exact'
                     CHECK (date_flexibility IN ('exact', 'week', 'month')),
    title            TEXT NOT NULL,
    description      TEXT,
    price            NUMERIC,
    currency         TEXT NOT NULL DEFAULT 'USD',
    status           TEXT NOT NULL DEFAULT 'open'
                     CHECK (status IN ('open', 'matched', 'dealing',
                                       'completed', 'cancelled')),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX listings_browse_idx
    ON listings (status, kind, origin_city, dest_city);
CREATE INDEX listings_owner_idx ON listings (owner_id);

CREATE TABLE threads (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE thread_participants (
    thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
    user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (thread_id, user_id)
);
CREATE INDEX thread_participants_user_idx ON thread_participants (user_id);

CREATE TABLE messages (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id  UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
    sender_id  UUID REFERENCES users(id) ON DELETE SET NULL,
    body       TEXT NOT NULL,
    is_system  BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    read_at    TIMESTAMPTZ
);
CREATE INDEX messages_thread_idx ON messages (thread_id, created_at);

CREATE TABLE match_confirmations (
    thread_id    UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    confirmed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (thread_id, user_id)
);

CREATE TABLE delivery_confirmations (
    thread_id     UUID PRIMARY KEY REFERENCES threads(id) ON DELETE CASCADE,
    courier_id    UUID REFERENCES users(id),
    recipient_id  UUID REFERENCES users(id),
    handed_over_at TIMESTAMPTZ,
    received_at    TIMESTAMPTZ,
    -- Handover code (MVP, pre-Yookassa): minted at both-confirm, shown to
    -- the needer only, entered by the courier as the binding completion
    -- event. Plaintext by choice, single use, cleared on completion.
    handover_code  TEXT,
    code_attempts  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE completed_deals (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id   UUID,
    kind         TEXT,
    origin_city  TEXT,
    origin_country TEXT,
    dest_city    TEXT,
    dest_country TEXT,
    depart_date  DATE,
    arrive_date  DATE,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_a       UUID,
    user_b       UUID,
    user_a_name   TEXT,
    user_a_avatar TEXT,
    user_b_name   TEXT,
    user_b_avatar TEXT
);
CREATE INDEX completed_deals_parties_idx ON completed_deals (user_a, user_b);

CREATE TABLE payments (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id               UUID REFERENCES threads(id) ON DELETE CASCADE,
    listing_id              UUID REFERENCES listings(id) ON DELETE SET NULL,
    payer_id                UUID REFERENCES users(id),
    payee_id                UUID REFERENCES users(id),
    amount                  NUMERIC NOT NULL,
    currency                TEXT NOT NULL DEFAULT 'USD',
    stripe_payment_intent_id TEXT,
    stripe_session_id        TEXT,
    status                  TEXT NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'processing', 'completed')),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at            TIMESTAMPTZ
);

CREATE TABLE reviews (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    completed_deal_id UUID NOT NULL REFERENCES completed_deals(id)
                      ON DELETE CASCADE,
    reviewer_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reviewee_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating            INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment           TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (completed_deal_id, reviewer_id)
);
CREATE INDEX reviews_reviewee_idx ON reviews (reviewee_id);

CREATE TABLE reports (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
    target_listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
    reason            TEXT NOT NULL,
    details           TEXT,
    status            TEXT NOT NULL DEFAULT 'open'
                      CHECK (status IN ('open', 'reviewed', 'dismissed')),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE verification_requests (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    method           TEXT NOT NULL DEFAULT 'manual' CHECK (method = 'manual'),
    status           TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'approved', 'rejected')),
    verified_name    TEXT,
    rejection_reason TEXT,
    submitted_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at      TIMESTAMPTZ,
    reviewed_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    id_photo_sha256  TEXT
);
CREATE INDEX verification_requests_user_idx
    ON verification_requests (user_id, submitted_at DESC);

CREATE TABLE notification_log (
    id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id  UUID REFERENCES users(id) ON DELETE CASCADE,
    kind     TEXT NOT NULL,
    payload  JSONB,
    sent_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
