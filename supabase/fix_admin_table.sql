-- Drop existing table if it has password_hash constraint
DROP TABLE IF EXISTS admin_users CASCADE;

-- Create new admin table without password_hash
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(50) UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default admin
INSERT INTO admin_users (username) VALUES ('admin');

-- Enable RLS
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations on admin_users" ON admin_users FOR ALL USING (true);