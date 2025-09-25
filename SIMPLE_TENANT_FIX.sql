-- SIMPLE TENANT FIX - Just grant permissions
-- Run this to fix the 406 error

-- Grant full access to tenants table
GRANT ALL ON tenants TO anon, authenticated;

-- Enable RLS but allow all access
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to tenants" ON tenants;
CREATE POLICY "Allow all access to tenants" ON tenants FOR ALL USING (true);

SELECT 'Tenants table permissions fixed!' as status;