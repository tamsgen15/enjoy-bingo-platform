-- Fix Authentication Schema
-- Run this to fix the users table

-- Drop existing users table if it exists
DROP TABLE IF EXISTS users CASCADE;

-- Modify admin_users table to support all roles
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'admin' CHECK (role IN ('player', 'admin', 'owner'));

-- Update existing admin users with roles
UPDATE admin_users SET role = 'admin' WHERE username = 'admin';
UPDATE admin_users SET role = 'owner' WHERE username = 'Admin';

-- Insert a sample player
INSERT INTO admin_users (username, password, role) VALUES 
('player1', 'player123', 'player')
ON CONFLICT (username) DO NOTHING;

-- Create view for unified access
CREATE OR REPLACE VIEW users AS 
SELECT 
  id,
  username,
  password,
  role,
  is_active,
  created_at
FROM admin_users;