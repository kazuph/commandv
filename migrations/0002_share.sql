-- Add share link support on diagrams
PRAGMA foreign_keys=ON;

ALTER TABLE diagrams ADD COLUMN share_enabled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE diagrams ADD COLUMN share_token TEXT;            -- unguessable token
ALTER TABLE diagrams ADD COLUMN share_expires_at INTEGER;    -- unix epoch seconds, nullable

-- fast lookup by token
CREATE UNIQUE INDEX IF NOT EXISTS idx_diagrams_share_token ON diagrams(share_token);

