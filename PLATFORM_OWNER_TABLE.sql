-- PLATFORM OWNER TABLE - Run this in Supabase SQL Editor
-- Creates platform owner authentication table

CREATE TABLE IF NOT EXISTS platform_owners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'platform-owner',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns if they don't exist
ALTER TABLE platform_owners ADD COLUMN IF NOT EXISTS name TEXT DEFAULT 'Platform Owner';
ALTER TABLE platform_owners ADD COLUMN IF NOT EXISTS password TEXT;
ALTER TABLE platform_owners ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'platform-owner';

-- Insert default platform owner with strong password
INSERT INTO platform_owners (username, email, password, password_hash, name, role) 
VALUES ('platform_owner', 'owner@enjoybingo.bet', 'Bng0#Plat$2024!Sec9X&Admin*Enjoy7Z', 'Bng0#Plat$2024!Sec9X&Admin*Enjoy7Z', 'Platform Owner', 'platform-owner')
ON CONFLICT (email) DO UPDATE SET 
    username = EXCLUDED.username,
    password = EXCLUDED.password,
    password_hash = EXCLUDED.password_hash,
    name = EXCLUDED.name,
    role = EXCLUDED.role;

-- Grant permissions
GRANT ALL ON platform_owners TO anon, authenticated;

-- Enable RLS
ALTER TABLE platform_owners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to platform_owners" ON platform_owners;
CREATE POLICY "Allow all access to platform_owners" ON platform_owners FOR ALL USING (true);

SELECT 'Platform owner table created successfully!' as status;