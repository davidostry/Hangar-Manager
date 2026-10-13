
-- Add account activation status to users.
-- Existing users remain active by default.

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS is_active
BOOLEAN NOT NULL DEFAULT TRUE;
