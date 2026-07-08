-- 20260705000000_reviews_anchor_completed_deals.sql
--
-- Re-anchor reviews on completed_deals — the archive snapshot that survives
-- deal closure. Previously reviews.listing_id referenced listings(id), but
-- close_deal hard-deletes the listing for non-trip deals (and cascade-deletes
-- the payments row), so the old FK + payments-based eligibility gate could
-- never let a review be written. completed_deals is explicitly designed to
-- outlive the listing/thread (see 20260629000000 migration, lines 84-102).

-- ─── 1. New anchor column ───────────────────────────────────────────────────
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS completed_deal_id UUID REFERENCES completed_deals(id);

-- listing_id is now informational (the listing may be deleted). Allow NULL
-- and stop blocking listing deletion.
ALTER TABLE reviews ALTER COLUMN listing_id DROP NOT NULL;
ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_listing_id_fkey;
ALTER TABLE reviews ADD CONSTRAINT reviews_listing_id_fkey
    FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE SET NULL;

-- ─── 2. One review per (closed deal, reviewer) ──────────────────────────────
ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_listing_id_reviewer_id_key;
ALTER TABLE reviews ADD CONSTRAINT reviews_completed_deal_reviewer_unique
    UNIQUE (completed_deal_id, reviewer_id);

-- ─── 3. Eligibility gate: reviewer + reviewee are the two parties of the deal
-- The backend uses the service role (bypasses RLS), so this policy is the
-- frontend-side guard; the backend re-validates the same rules in Python.
DROP POLICY IF EXISTS "Users can write reviews after payment completion." ON reviews;
CREATE POLICY "Users can review their completed deals." ON reviews
    FOR INSERT WITH CHECK (
        completed_deal_id IS NOT NULL
        AND auth.uid() = reviewer_id
        AND auth.uid() <> reviewee_id
        AND EXISTS (
            SELECT 1 FROM completed_deals cd
             WHERE cd.id = reviews.completed_deal_id
               AND (cd.user_a = auth.uid() OR cd.user_b = auth.uid())
               AND (cd.user_a = reviews.reviewee_id OR cd.user_b = reviews.reviewee_id)
        )
    );
