-- Check and fix authentication table
-- Run this in Supabase SQL Editor

-- Check if role column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'admin_users';

-- Add role column if it doesn't exist
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'admin' CHECK (role IN ('player', 'admin', 'owner'));

-- Check current users
SELECT * FROM admin_users;

-- Update existing users with roles
UPDATE admin_users SET role = 'admin' WHERE username = 'admin';
UPDATE admin_users SET role = 'owner' WHERE username = 'Admin';

-- Insert test users if they don't exist
INSERT INTO admin_users (username, password, role) VALUES 
('admin', 'admin123', 'admin'),
('Admin', 'Enjoy@1501', 'owner'),
('player1', 'player123', 'player')
ON CONFLICT (username) DO UPDATE SET 
  password = EXCLUDED.password,
  role = EXCLUDED.role;

-- Verify the data
SELECT id, username, password, role, is_active FROM admin_users;