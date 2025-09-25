-- TENANT CUSTOM PLATFORM FEES
-- Run this in Supabase SQL Editor

-- Add custom platform fee column to tenants table
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS default_platform_fee_percent INTEGER DEFAULT 20;

-- Update create_tenant_game_isolated to use tenant's custom platform fee
CREATE OR REPLACE FUNCTION create_tenant_game_isolated(
    p_tenant_id UUID,
    p_admin_email TEXT,
    p_device_id TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    new_game_id UUID;
    new_session_id UUID;
    tenant_record RECORD;
BEGIN
    -- Get tenant with custom platform fee
    SELECT * INTO tenant_record 
    FROM tenants 
    WHERE id = p_tenant_id 
    AND subscription_status = 'active';
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false, 
            'error', 'Tenant not found or subscription inactive'
        );
    END IF;
    
    -- End existing active games for this tenant user
    UPDATE games 
    SET status = 'finished', 
        finished_at = NOW()
    WHERE tenant_id = p_tenant_id 
    AND admin_id = p_admin_email
    AND status IN ('waiting', 'active', 'paused');
    
    -- Generate new session ID
    new_session_id := gen_random_uuid();
    
    -- Create new game with tenant's custom platform fee
    INSERT INTO games (
        admin_id, 
        status, 
        entry_fee, 
        platform_fee_percent,
        tenant_id,
        session_id,
        admin_device_id
    )
    VALUES (
        p_admin_email, 
        'waiting', 
        20, 
        COALESCE(tenant_record.default_platform_fee_percent, 20),
        p_tenant_id,
        new_session_id,
        p_device_id
    )
    RETURNING id INTO new_game_id;
    
    RETURN json_build_object(
        'success', true,
        'game_id', new_game_id,
        'session_id', new_session_id,
        'tenant_id', p_tenant_id,
        'platform_fee_percent', COALESCE(tenant_record.default_platform_fee_percent, 20)
    );
END;
$$ LANGUAGE plpgsql;

-- Function to update tenant platform fee
CREATE OR REPLACE FUNCTION update_tenant_platform_fee(
    p_tenant_id UUID,
    p_platform_fee_percent INTEGER
)
RETURNS JSON AS $$
BEGIN
    -- Validate fee percentage (0-50%)
    IF p_platform_fee_percent < 0 OR p_platform_fee_percent > 50 THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Platform fee must be between 0% and 50%'
        );
    END IF;
    
    -- Update tenant platform fee
    UPDATE tenants 
    SET default_platform_fee_percent = p_platform_fee_percent,
        updated_at = NOW()
    WHERE id = p_tenant_id;
    
    RETURN json_build_object(
        'success', true,
        'platform_fee_percent', p_platform_fee_percent,
        'message', 'Platform fee updated successfully'
    );
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION update_tenant_platform_fee(UUID, INTEGER) TO anon, authenticated;

SELECT 'Tenant custom platform fees enabled!' as status;