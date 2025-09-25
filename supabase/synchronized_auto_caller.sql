-- Synchronized Auto Caller Function
-- This function handles automatic number calling with database-level timing control

CREATE OR REPLACE FUNCTION auto_call_next_number(game_uuid UUID)
RETURNS JSON AS $$
DECLARE
    last_call_time TIMESTAMP;
    time_diff INTERVAL;
    call_interval INTERVAL := INTERVAL '6 seconds';
    result JSON;
    lock_key BIGINT;
BEGIN
    lock_key := hashtext(game_uuid::text || '_auto_caller');
    
    IF NOT pg_try_advisory_lock(lock_key) THEN
        RETURN json_build_object('success', false, 'error', 'Auto caller already running');
    END IF;
    
    SELECT MAX(called_at) INTO last_call_time FROM called_numbers WHERE game_id = game_uuid;
    
    IF last_call_time IS NULL THEN
        SELECT call_next_number(game_uuid) INTO result;
        PERFORM pg_advisory_unlock(lock_key);
        RETURN result;
    END IF;
    
    time_diff := NOW() - last_call_time;
    
    IF time_diff < call_interval THEN
        PERFORM pg_advisory_unlock(lock_key);
        RETURN json_build_object(
            'success', false,
            'error', 'Call interval not met',
            'wait_seconds', EXTRACT(EPOCH FROM (call_interval - time_diff))::INTEGER
        );
    END IF;
    
    SELECT call_next_number(game_uuid) INTO result;
    PERFORM pg_advisory_unlock(lock_key);
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get auto caller status
CREATE OR REPLACE FUNCTION get_auto_caller_status(game_uuid UUID)
RETURNS JSON AS $$
DECLARE
    last_call_time TIMESTAMP;
    time_diff INTERVAL;
    call_interval INTERVAL := INTERVAL '6 seconds';
    next_call_in INTEGER;
    game_status TEXT;
BEGIN
    SELECT status INTO game_status FROM games WHERE id = game_uuid;
    
    IF game_status != 'active' THEN
        RETURN json_build_object('active', false, 'reason', 'Game not active');
    END IF;
    
    SELECT MAX(called_at) INTO last_call_time FROM called_numbers WHERE game_id = game_uuid;
    
    IF last_call_time IS NULL THEN
        RETURN json_build_object('active', true, 'ready_to_call', true, 'next_call_in', 0);
    END IF;
    
    time_diff := NOW() - last_call_time;
    
    IF time_diff >= call_interval THEN
        next_call_in := 0;
    ELSE
        next_call_in := EXTRACT(EPOCH FROM (call_interval - time_diff))::INTEGER;
    END IF;
    
    RETURN json_build_object(
        'active', true,
        'ready_to_call', next_call_in = 0,
        'next_call_in', next_call_in
    );
END;
$$ LANGUAGE plpgsql STABLE;