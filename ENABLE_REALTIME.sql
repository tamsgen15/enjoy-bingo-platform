-- ENABLE REALTIME - Run this in Supabase SQL Editor
-- This enables real-time subscriptions for all required tables

-- Enable real-time for games table
ALTER PUBLICATION supabase_realtime ADD TABLE games;

-- Enable real-time for players table  
ALTER PUBLICATION supabase_realtime ADD TABLE players;

-- Enable real-time for called_numbers table
ALTER PUBLICATION supabase_realtime ADD TABLE called_numbers;

-- Enable real-time for tenants table
ALTER PUBLICATION supabase_realtime ADD TABLE tenants;

-- Enable real-time for user_activity table (if exists)
ALTER PUBLICATION supabase_realtime ADD TABLE user_activity;

SELECT 'Real-time enabled for all tables!' as status;