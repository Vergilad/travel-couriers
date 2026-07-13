CREATE TABLE IF NOT EXISTS delivery_confirmations (
    thread_id       UUID PRIMARY KEY REFERENCES threads(id) ON DELETE CASCADE,
    courier_id      UUID REFERENCES auth.users(id),
    recipient_id    UUID REFERENCES auth.users(id),
    handed_over_at  TIMESTAMP WITH TIME ZONE,
    received_at     TIMESTAMP WITH TIME ZONE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE delivery_confirmations ENABLE ROW LEVEL SECURITY;

-- Participants can read their own delivery state (for realtime)
CREATE POLICY "Participants can view delivery confirmations."
    ON delivery_confirmations FOR SELECT
    USING (auth.uid() = courier_id OR auth.uid() = recipient_id);

-- Backend uses service role (bypasses RLS) for INSERT/UPDATE — no extra policy needed.
-- completed_deals already has its own table; no schema changes needed there.