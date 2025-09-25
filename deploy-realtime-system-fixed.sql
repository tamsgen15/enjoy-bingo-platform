-- Deploy Real-time Bingo System (Fixed)
-- Run this script in your Supabase SQL editor

-- Add missing columns if they don't exist
ALTER TABLE games ADD COLUMN IF NOT EXISTS current_number INTEGER;
ALTER TABLE games ADD COLUMN IF NOT EXISTS entry_fee INTEGER DEFAULT 20;
ALTER TABLE games ADD COLUMN IF NOT EXISTS platform_fee_percent INTEGER DEFAULT 20;
ALTER TABLE games ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE games ADD COLUMN IF NOT EXISTS finished_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE players ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE called_numbers ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE called_numbers ADD COLUMN IF NOT EXISTS called_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Real-time function to call next number
CREATE OR REPLACE FUNCTION call_next_number_realtime(game_uuid UUID, p_tenant_id UUID DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
    next_num INTEGER;
    game_record RECORD;
    last_call_time TIMESTAMP;
    time_diff INTEGER;
    total_called_count INTEGER;
BEGIN
    SELECT * INTO game_record FROM games WHERE id = game_uuid;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Game not found');
    END IF;
    
    IF game_record.status != 'active' THEN
        RETURN json_build_object('success', false, 'error', 'Game not active');
    END IF;
    
    SELECT called_at INTO last_call_time 
    FROM called_numbers 
    WHERE game_id = game_uuid 
    AND (p_tenant_id IS NULL OR tenant_id = p_tenant_id)
    ORDER BY called_at DESC 
    LIMIT 1;
    
    IF last_call_time IS NOT NULL THEN
        time_diff := EXTRACT(EPOCH FROM (NOW() - last_call_time));
        IF time_diff < 6 THEN
            RETURN json_build_object(
                'success', false, 
                'wait_seconds', 6 - time_diff,
                'message', 'Please wait before calling next number'
            );
        END IF;
    END IF;
    
    WITH available_numbers AS (
        SELECT generate_series(1, 75) AS num
        EXCEPT
        SELECT number FROM called_numbers 
        WHERE game_id = game_uuid 
        AND (p_tenant_id IS NULL OR tenant_id = p_tenant_id)
    )
    SELECT num INTO next_num 
    FROM available_numbers 
    ORDER BY RANDOM() 
    LIMIT 1;
    
    IF next_num IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'All numbers called');
    END IF;
    
    INSERT INTO called_numbers (game_id, number, tenant_id, called_at)
    VALUES (game_uuid, next_num, p_tenant_id, NOW());
    
    UPDATE games 
    SET current_number = next_num 
    WHERE id = game_uuid;
    
    SELECT COUNT(*) INTO total_called_count
    FROM called_numbers 
    WHERE game_id = game_uuid 
    AND (p_tenant_id IS NULL OR tenant_id = p_tenant_id);
    
    RETURN json_build_object(
        'success', true,
        'number', next_num,
        'letter', CASE 
            WHEN next_num <= 15 THEN 'B'
            WHEN next_num <= 30 THEN 'I'
            WHEN next_num <= 45 THEN 'N'
            WHEN next_num <= 60 THEN 'G'
            ELSE 'O'
        END,
        'total_called', total_called_count,
        'remaining', 75 - total_called_count
    );
END;
$$ LANGUAGE plpgsql;

-- Function to reset game with real-time cleanup
CREATE OR REPLACE FUNCTION reset_game_realtime(game_uuid UUID, p_tenant_id UUID DEFAULT NULL)
RETURNS JSON AS $$
BEGIN
    -- Clear called numbers for specific tenant/game
    DELETE FROM called_numbers 
    WHERE game_id = game_uuid 
    AND (p_tenant_id IS NULL OR tenant_id = p_tenant_id);
    
    -- Clear players for specific tenant/game
    DELETE FROM players 
    WHERE game_id = game_uuid 
    AND (p_tenant_id IS NULL OR tenant_id = p_tenant_id);
    
    -- Reset game status only if no other tenants are using it
    UPDATE games 
    SET status = 'waiting', 
        current_number = NULL,
        started_at = NULL,
        finished_at = NULL
    WHERE id = game_uuid
    AND (p_tenant_id IS NULL OR NOT EXISTS (
        SELECT 1 FROM players 
        WHERE game_id = game_uuid 
        AND tenant_id != p_tenant_id
    ));
    
    RETURN json_build_object('success', true, 'message', 'Game reset successfully');
END;
$$ LANGUAGE plpgsql;

-- Function to get real-time game status
CREATE OR REPLACE FUNCTION get_realtime_game_status(game_uuid UUID, p_tenant_id UUID DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
    game_record RECORD;
    players_count INTEGER;
    numbers_called INTEGER;
    total_pot INTEGER;
    winner_prize INTEGER;
BEGIN
    -- Get game info
    SELECT * INTO game_record FROM games WHERE id = game_uuid;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Game not found');
    END IF;
    
    -- Get players count
    SELECT COUNT(*) INTO players_count 
    FROM players 
    WHERE game_id = game_uuid 
    AND (p_tenant_id IS NULL OR tenant_id = p_tenant_id);
    
    -- Get called numbers count
    SELECT COUNT(*) INTO numbers_called 
    FROM called_numbers 
    WHERE game_id = game_uuid 
    AND (p_tenant_id IS NULL OR tenant_id = p_tenant_id);
    
    -- Calculate pot and prize
    total_pot := players_count * COALESCE(game_record.entry_fee, 20);
    winner_prize := total_pot - (total_pot * COALESCE(game_record.platform_fee_percent, 0) / 100);
    
    RETURN json_build_object(
        'success', true,
        'status', game_record.status,
        'players_count', players_count,
        'numbers_called', numbers_called,
        'total_pot', total_pot,
        'platform_fee_percent', COALESCE(game_record.platform_fee_percent, 0),
        'winner_prize', winner_prize,
        'current_number', game_record.current_number,
        'entry_fee', COALESCE(game_record.entry_fee, 20)
    );
END;
$$ LANGUAGE plpgsql;

-- Function to create fresh game session
CREATE OR REPLACE FUNCTION create_fresh_game_session(p_tenant_id UUID DEFAULT NULL, admin_user_id TEXT DEFAULT 'admin')
RETURNS JSON AS $$
DECLARE
    new_game_id UUID;
BEGIN
    -- Create new game
    INSERT INTO games (admin_id, status, entry_fee, platform_fee_percent)
    VALUES (admin_user_id, 'waiting', 20, CASE WHEN p_tenant_id IS NOT NULL THEN 0 ELSE 20 END)
    RETURNING id INTO new_game_id;
    
    RETURN json_build_object(
        'success', true, 
        'game_id', new_game_id,
        'message', 'Fresh game session created'
    );
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION call_next_number_realtime(UUID, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_realtime_game_status(UUID, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION reset_game_realtime(UUID, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION create_fresh_game_session(UUID, TEXT) TO anon, authenticated;

SELECT 'Real-time system deployed successfully!' as status;