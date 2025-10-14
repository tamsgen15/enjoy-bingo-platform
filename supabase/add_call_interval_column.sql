-- Add call_interval_seconds column to games table
ALTER TABLE games ADD COLUMN IF NOT EXISTS call_interval_seconds INTEGER DEFAULT 6;

-- Update existing games to have default 6 seconds
UPDATE games SET call_interval_seconds = 6 WHERE call_interval_seconds IS NULL;