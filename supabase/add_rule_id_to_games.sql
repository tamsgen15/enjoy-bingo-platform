-- Add rule_id column to games table
ALTER TABLE games ADD COLUMN IF NOT EXISTS rule_id UUID REFERENCES game_rules(id);