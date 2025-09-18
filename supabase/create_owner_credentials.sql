-- Create unified user table with roles
CREATE TABLE IF NOT EXISTS app_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100),
  role VARCHAR(20) NOT NULL DEFAULT 'player',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default users with different roles
INSERT INTO app_users (username, email, role) VALUES
('admin', 'admin@enjoybingo.com', 'admin'),
('owner', 'owner@enjoybingo.com', 'owner'),
('Enjoyowner@1501', 'platform@enjoybingo.com', 'platform_owner')
ON CONFLICT (username) DO NOTHING;

-- Enable RLS
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;

-- Create policy for all users
CREATE POLICY "Allow all operations on app_users" ON app_users 
FOR ALL USING (true);

-- Add to realtime
ALTER PUBLICATION supabase_realtime ADD TABLE app_users;