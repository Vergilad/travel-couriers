-- 20260629000000_match_and_history.sql
--
-- Two-stage match & deal-completion flow.
--   Stage 1: mutual "confirm match"  -> connected (delivery/request auto-close, trip stays open)
--   Stage 2: mutual "close the deal" -> archive to completed_deals, remove listing + messages
--
-- Reworks the previous trigger (which set EVERY matched listing to 'matched'
-- and auto-created a payment row) to respect trip multi-match semantics and
-- to stop creating premature payments.

-- ─── 1. Add 'dealing' listing status (stage-2 in progress) ───────────────────
ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_status_check;
ALTER TABLE listings ADD CONSTRAINT listings_status_check
    CHECK (status IN ('open', 'matched', 'dealing', 'completed', 'cancelled'));

-- ─── 2. System messages: nullable sender + is_system flag ────────────────────
-- System messages announce match/deal events. They are authored by the system,
-- not a user, so sender_id must be allowed to be NULL.
ALTER TABLE messages ALTER COLUMN sender_id DROP NOT NULL;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_system BOOLEAN NOT NULL DEFAULT FALSE;

-- System messages bypass the "sender must be participant & sender_id = user" rule.
-- They are only ever inserted by the backend (service role), which ignores RLS,
-- so we additionally allow them to be read like any other message (existing SELECT
-- policy already lets participants read all messages in their thread).

-- ─── 3. Rework the match-confirmation trigger ────────────────────────────────
DROP TRIGGER IF EXISTS on_match_confirmation_insert ON match_confirmations;
DROP FUNCTION IF EXISTS handle_match_confirmation();

-- New trigger: on the 2nd confirmation, mark non-trip listings 'matched'.
-- Trip listings stay 'open' (a courier can carry for multiple senders).
-- No payment row is created here — payments belong to a later phase.
CREATE OR REPLACE FUNCTION handle_match_confirmation() RETURNS TRIGGER AS $$
DECLARE
    v_listing_id UUID;
    v_kind TEXT;
BEGIN
    IF (SELECT COUNT(*) FROM match_confirmations WHERE thread_id = NEW.thread_id) >= 2 THEN
        SELECT t.listing_id, l.kind
          INTO v_listing_id, v_kind
          FROM threads t
          JOIN listings l ON l.id = t.listing_id
         WHERE t.id = NEW.thread_id;

        IF v_kind IS NOT NULL AND v_kind <> 'trip' THEN
            UPDATE listings SET status = 'matched' WHERE id = v_listing_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_match_confirmation_insert
AFTER INSERT ON match_confirmations
FOR EACH ROW EXECUTE FUNCTION handle_match_confirmation();

-- ─── 4. FK cleanup: cascade deletes so hard-deleting a listing is safe ───────
ALTER TABLE threads            DROP CONSTRAINT IF EXISTS threads_listing_id_fkey;
ALTER TABLE threads            ADD CONSTRAINT threads_listing_id_fkey
    FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE;

ALTER TABLE thread_participants DROP CONSTRAINT IF EXISTS thread_participants_thread_id_fkey;
ALTER TABLE thread_participants ADD CONSTRAINT thread_participants_thread_id_fkey
    FOREIGN KEY (thread_id) REFERENCES threads(id) ON DELETE CASCADE;

ALTER TABLE messages           DROP CONSTRAINT IF EXISTS messages_thread_id_fkey;
ALTER TABLE messages           ADD CONSTRAINT messages_thread_id_fkey
    FOREIGN KEY (thread_id) REFERENCES threads(id) ON DELETE CASCADE;

ALTER TABLE match_confirmations DROP CONSTRAINT IF EXISTS match_confirmations_thread_id_fkey;
ALTER TABLE match_confirmations ADD CONSTRAINT match_confirmations_thread_id_fkey
    FOREIGN KEY (thread_id) REFERENCES threads(id) ON DELETE CASCADE;

ALTER TABLE payments           DROP CONSTRAINT IF EXISTS payments_thread_id_fkey;
ALTER TABLE payments           ADD CONSTRAINT payments_thread_id_fkey
    FOREIGN KEY (thread_id) REFERENCES threads(id) ON DELETE CASCADE;

ALTER TABLE payments           DROP CONSTRAINT IF EXISTS payments_listing_id_fkey;
ALTER TABLE payments           ADD CONSTRAINT payments_listing_id_fkey
    FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE;

-- ─── 5. History archive table ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS completed_deals (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id      UUID,                       -- not FK'd: the listing is deleted at archive time
    kind            TEXT NOT NULL,
    origin_city     TEXT,
    origin_country  TEXT,
    dest_city       TEXT,
    dest_country    TEXT,
    depart_date     DATE,
    arrive_date     DATE,
    completed_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Denormalized snapshot of both parties so history survives listing/thread deletion.
    user_a          UUID REFERENCES auth.users(id),
    user_b          UUID REFERENCES auth.users(id),
    user_a_name     TEXT,
    user_a_avatar   TEXT,
    user_b_name     TEXT,
    user_b_avatar   TEXT
);

ALTER TABLE completed_deals ENABLE ROW LEVEL SECURITY;
-- History is intentionally public (visible on both profiles).
CREATE POLICY "Completed deals are public." ON completed_deals FOR SELECT USING (true);
-- Inserts only via service-role backend (which bypasses RLS).

GRANT SELECT ON completed_deals TO anon, authenticated, service_role;
