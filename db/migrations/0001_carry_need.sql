-- 0001_carry_need.sql — collapse request/delivery into need + purchase flag.
--
-- Pre-launch: the only rows in the database are dev test rows, so the
-- tables are wiped rather than migrated. Run with:
--   psql "$DATABASE_URL" -f db/migrations/0001_carry_need.sql

-- Test rows only (dev). Cascades through threads, messages,
-- confirmations, payments; completed_deals goes explicitly (no FK).
TRUNCATE users, listings, threads, completed_deals CASCADE;

-- Weight is gone from the product (no UI, no matching, no fee math).
ALTER TABLE listings DROP COLUMN capacity_kg;

-- Two sides: carry (I travel, I carry) vs need (move something for me).
ALTER TABLE listings DROP CONSTRAINT listings_kind_check;
ALTER TABLE listings ADD CONSTRAINT listings_kind_check
    CHECK (kind IN ('carry', 'need'));

-- Sender-side detail, settled in chat: must the carrier buy the item?
ALTER TABLE listings
    ADD COLUMN needs_purchase BOOLEAN NOT NULL DEFAULT FALSE;
