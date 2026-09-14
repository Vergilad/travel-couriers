-- 0002: in-app admin review replaces the Telegram bot.
-- The bot never stored anything; the queue needs the photos until decision.
-- reviewed_by names the human (was: anonymous Telegram tap).
-- id_photo_sha256 catches one document verifying many accounts (photo itself
-- is deleted on decision; the hash stays).
ALTER TABLE verification_requests
    ADD COLUMN reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN id_photo_sha256 TEXT;
