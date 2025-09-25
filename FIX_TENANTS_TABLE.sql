-- FIX TENANTS TABLE ACCESS - Run this immediately
-- This fixes the 406 error when accessing tenants table

-- Create tenants table with data from platform_subscriptions
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_name TEXT NOT NULL,
    admin_email TEXT NOT NULL UNIQUE,
    subscription_status TEXT DEFAULT 'active',
    subscription_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    subscription_end_date TIMESTAMP WITH TIME ZONE,
    monthly_fee DECIMAL(10,2) DEFAULT 100.00,
    default_platform_fee_percent INTEGER DEFAULT 20,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Populate tenants table from existing platform_subscriptions (skip if exists)
INSERT INTO tenants (id, tenant_name, admin_email, subscription_status, subscription_start_date, subscription_end_date)
SELECT 
    tenant_id,
    tenant_name,
    admin_email,
    subscription_status,
    start_date,
    end_date
FROM platform_subscriptions
WHERE admin_email NOT IN (SELECT admin_email FROM tenants)
ON CONFLICT (admin_email) DO NOTHING;

-- Grant full access to tenants table
GRANT ALL ON tenants TO anon, authenticated;

-- Enable RLS but allow all access for now
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to tenants" ON tenants;
CREATE POLICY "Allow all access to tenants" ON tenants FOR ALL USING (true);

SELECT 'Tenants table fixed successfully!' as status;