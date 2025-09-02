-- Simple rate limit storage
PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  reset_at INTEGER NOT NULL               -- unix epoch seconds
);

