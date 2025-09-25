-- CREATE TENANT SESSIONS TABLE - Run this in Supabase SQL Editor
-- Creates the missing tenant_sessions table for proper session management

CREATE TABLE IF NOT EXISTS tenant_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_email TEXT NOT NULL,
    tenant_name TEXT NOT NULL,
    session_token TEXT NOT NULL,
    device_info TEXT,
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, user_email)
);

-- Grant permissions
GRANT ALL ON tenant_sessions TO anon, authenticated;

-- Enable RLS
ALTER TABLE tenant_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to tenant_sessions" ON tenant_sessions;
CREATE POLICY "Allow all access to tenant_sessions" ON tenant_sessions FOR ALL USING (true);

-- Create update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_tenant_sessions_updated_at ON tenant_sessions;
CREATE TRIGGER update_tenant_sessions_updated_at
    BEFORE UPDATE ON tenant_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

SELECT 'Tenant sessions table created successfully!' as status;