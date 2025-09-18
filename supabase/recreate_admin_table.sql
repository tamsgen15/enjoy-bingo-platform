-- Drop and recreate admin table
DROP TABLE IF EXISTS admin_users CASCADE;

-- Create new admin table with password column
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert admin account
INSERT INTO admin_users (username, password) 
VALUES ('Admin', 'Enjoy@1501');

-- Enable RLS
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations on admin_users" ON admin_users FOR ALL USING (true);