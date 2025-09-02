-- Add description support for OGP/unfurl
PRAGMA foreign_keys=ON;

ALTER TABLE diagrams ADD COLUMN description TEXT;

