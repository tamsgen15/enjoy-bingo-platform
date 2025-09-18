-- Owner Dashboard Schema
CREATE TABLE platform_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE revenue_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID REFERENCES games(id),
  player_id UUID REFERENCES players(id),
  entry_fee DECIMAL(10,2) DEFAULT 20.00,
  platform_fee_percentage DECIMAL(5,2) DEFAULT 20.00,
  platform_fee_amount DECIMAL(10,2),
  transaction_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO platform_settings (setting_key, setting_value) VALUES
('platform_fee_percentage', '20'),
('entry_fee_per_card', '20'),
('max_players_per_game', '100'),
('auto_call_interval', '5')
ON CONFLICT (setting_key) DO NOTHING;

CREATE INDEX idx_revenue_tracking_game_id ON revenue_tracking(game_id);
CREATE INDEX idx_revenue_tracking_date ON revenue_tracking(transaction_date);

ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on platform_settings" ON platform_settings FOR ALL USING (true);
CREATE POLICY "Allow all on revenue_tracking" ON revenue_tracking FOR ALL USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE platform_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE revenue_tracking;