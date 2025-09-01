-- D1 schema: users and diagrams
PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,            -- provider subject (e.g., Google sub)
  provider TEXT NOT NULL,         -- e.g., 'google'
  email TEXT,
  name TEXT,
  picture TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

CREATE TABLE IF NOT EXISTS diagrams (
  id TEXT PRIMARY KEY,            -- uuid
  user_id TEXT,                   -- nullable for public/anonymous
  title TEXT,
  mode TEXT NOT NULL,             -- 'html' | 'jsx'
  code TEXT NOT NULL,             -- original HTML/JSX
  is_private INTEGER NOT NULL DEFAULT 0,
  image_key TEXT,                 -- R2 object key
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_diagrams_created_at ON diagrams(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_diagrams_user_id ON diagrams(user_id);
CREATE INDEX IF NOT EXISTS idx_diagrams_is_private ON diagrams(is_private);

