-- Enable API access for tenant_sessions table
ALTER TABLE public.tenant_sessions REPLICA IDENTITY FULL;

-- Grant all permissions explicitly
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_sessions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_sessions TO service_role;

-- Ensure schema permissions
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;