-- Fix permissions for existing table
ALTER TABLE public.tenant_sessions DISABLE ROW LEVEL SECURITY;
GRANT ALL ON public.tenant_sessions TO anon;
GRANT ALL ON public.tenant_sessions TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;