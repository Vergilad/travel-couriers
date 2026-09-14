-- 0003: handover code carries receipt until Yookassa arrives.
--
-- Minted at both-confirm, shown only to the needer (parcel-owner side:
-- non-owner on carry, owner on need), entered by the courier as the
-- binding completion event (replaces the recipient Confirm Receipt click).
--
-- Plaintext by choice (MVP): the database is backend-only, the code is
-- single use and cleared on completion. Five wrong tries lock the code;
-- the needer regenerates to unlock (old code dies on regenerate).
--
-- No backfill: pre-launch, no live threads carry delivery rows yet.
-- Run with: psql "$DATABASE_URL" -f db/migrations/0003_handover_code.sql
ALTER TABLE delivery_confirmations
    ADD COLUMN handover_code TEXT,
    ADD COLUMN code_attempts INTEGER NOT NULL DEFAULT 0;
