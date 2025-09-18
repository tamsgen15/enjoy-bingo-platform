-- Enable real-time for tables
ALTER PUBLICATION supabase_realtime ADD TABLE games;
ALTER PUBLICATION supabase_realtime ADD TABLE players;
ALTER PUBLICATION supabase_realtime ADD TABLE called_numbers;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON games TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON players TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON called_numbers TO anon, authenticated;