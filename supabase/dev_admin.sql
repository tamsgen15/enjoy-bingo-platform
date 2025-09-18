-- Create dev admin user for testing
INSERT INTO users (id, username, email, role, created_at)
VALUES (
  'dev-admin-001',
  'admin',
  'admin@enjoybingo.com',
  'admin',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(50) PRIMARY KEY,
  username VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(20) DEFAULT 'player' CHECK (role IN ('admin', 'player')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);