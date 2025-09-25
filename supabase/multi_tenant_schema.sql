-- Multi-Tenant Platform Schema
-- Allows multiple admins to rent the platform independently

-- Platform subscriptions table
CREATE TABLE IF NOT EXISTS platform_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    tenant_name VARCHAR(255) NOT NULL,
    admin_email VARCHAR(255) NOT NULL,
    admin_phone VARCHAR(50),
    subscription_status VARCHAR(20) DEFAULT 'pending' CHECK (subscription_status IN ('pending', 'active', 'expired', 'suspended')),
    monthly_fee DECIMAL(10,2) DEFAULT 20000.00,
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    country VARCHAR(100),
    currency VARCHAR(10) DEFAULT 'ETB',
    total_revenue DECIMAL(15,2) DEFAULT 0,
    games_hosted INTEGER DEFAULT 0
);

-- Platform owner revenue tracking
CREATE TABLE IF NOT EXISTS platform_revenue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES platform_subscriptions(tenant_id),
    payment_amount DECIMAL(10,2) NOT NULL,
    payment_date TIMESTAMP DEFAULT NOW(),
    payment_method VARCHAR(50) DEFAULT 'manual',
    payment_status VARCHAR(20) DEFAULT 'confirmed',
    subscription_period_start TIMESTAMP,
    subscription_period_end TIMESTAMP,
    notes TEXT
);

-- Add tenant_id to existing tables
ALTER TABLE games ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE players ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE called_numbers ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- Create indexes for tenant isolation
CREATE INDEX IF NOT EXISTS idx_games_tenant_id ON games(tenant_id);
CREATE INDEX IF NOT EXISTS idx_players_tenant_id ON players(tenant_id);
CREATE INDEX IF NOT EXISTS idx_called_numbers_tenant_id ON called_numbers(tenant_id);

-- Function to create new tenant
CREATE OR REPLACE FUNCTION create_tenant(
    p_tenant_name VARCHAR(255),
    p_admin_email VARCHAR(255),
    p_admin_phone VARCHAR(50) DEFAULT NULL,
    p_country VARCHAR(100) DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    new_tenant_id UUID;
    result JSON;
BEGIN
    -- Check if email already exists
    IF EXISTS (SELECT 1 FROM platform_subscriptions WHERE admin_email = p_admin_email) THEN
        RETURN json_build_object('success', false, 'error', 'Email already registered');
    END IF;
    
    -- Create new tenant
    INSERT INTO platform_subscriptions (
        tenant_name, admin_email, admin_phone, country, subscription_status
    ) VALUES (
        p_tenant_name, p_admin_email, p_admin_phone, p_country, 'pending'
    ) RETURNING tenant_id INTO new_tenant_id;
    
    RETURN json_build_object(
        'success', true,
        'tenant_id', new_tenant_id,
        'message', 'Tenant created successfully'
    );
END;
$$ LANGUAGE plpgsql;

-- Function to activate tenant subscription
CREATE OR REPLACE FUNCTION activate_tenant_subscription(
    p_tenant_id UUID,
    p_payment_amount DECIMAL(10,2) DEFAULT 20000.00
)
RETURNS JSON AS $$
DECLARE
    subscription_end TIMESTAMP;
BEGIN
    -- Calculate subscription period (1 month)
    subscription_end := NOW() + INTERVAL '1 month';
    
    -- Update subscription status
    UPDATE platform_subscriptions 
    SET 
        subscription_status = 'active',
        start_date = NOW(),
        end_date = subscription_end,
        updated_at = NOW()
    WHERE tenant_id = p_tenant_id;
    
    -- Record payment
    INSERT INTO platform_revenue (
        tenant_id, payment_amount, subscription_period_start, subscription_period_end
    ) VALUES (
        p_tenant_id, p_payment_amount, NOW(), subscription_end
    );
    
    RETURN json_build_object(
        'success', true,
        'message', 'Subscription activated',
        'end_date', subscription_end
    );
END;
$$ LANGUAGE plpgsql;

-- Function to check tenant subscription status
CREATE OR REPLACE FUNCTION check_tenant_status(p_tenant_id UUID)
RETURNS JSON AS $$
DECLARE
    tenant_record RECORD;
BEGIN
    SELECT * INTO tenant_record 
    FROM platform_subscriptions 
    WHERE tenant_id = p_tenant_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Tenant not found');
    END IF;
    
    -- Check if subscription expired
    IF tenant_record.end_date < NOW() AND tenant_record.subscription_status = 'active' THEN
        UPDATE platform_subscriptions 
        SET subscription_status = 'expired' 
        WHERE tenant_id = p_tenant_id;
        
        tenant_record.subscription_status := 'expired';
    END IF;
    
    RETURN json_build_object(
        'success', true,
        'tenant_id', tenant_record.tenant_id,
        'status', tenant_record.subscription_status,
        'end_date', tenant_record.end_date,
        'days_remaining', CASE 
            WHEN tenant_record.end_date > NOW() 
            THEN EXTRACT(DAYS FROM (tenant_record.end_date - NOW()))::INTEGER
            ELSE 0 
        END
    );
END;
$$ LANGUAGE plpgsql;

-- Update existing functions to be tenant-aware
CREATE OR REPLACE FUNCTION call_next_number_tenant(game_uuid UUID, p_tenant_id UUID)
RETURNS JSON AS $$
DECLARE
    next_num INTEGER;
    called_count INTEGER;
    result JSON;
    lock_key BIGINT;
BEGIN
    lock_key := hashtext(game_uuid::text || p_tenant_id::text);
    
    IF NOT pg_try_advisory_lock(lock_key) THEN
        RETURN json_build_object('success', false, 'error', 'Another call in progress');
    END IF;
    
    -- Validate game exists and belongs to tenant
    IF NOT EXISTS (
        SELECT 1 FROM games 
        WHERE id = game_uuid AND tenant_id = p_tenant_id AND status = 'active'
    ) THEN
        PERFORM pg_advisory_unlock(lock_key);
        RETURN json_build_object('success', false, 'error', 'Game not found or not active');
    END IF;
    
    SELECT COUNT(*) INTO called_count
    FROM called_numbers 
    WHERE game_id = game_uuid AND tenant_id = p_tenant_id;
    
    IF called_count >= 75 THEN
        PERFORM pg_advisory_unlock(lock_key);
        RETURN json_build_object('success', false, 'error', 'All numbers called');
    END IF;
    
    WITH available_numbers AS (
        SELECT generate_series(1, 75) AS num
        EXCEPT
        SELECT number FROM called_numbers WHERE game_id = game_uuid AND tenant_id = p_tenant_id
    )
    SELECT num INTO next_num FROM available_numbers ORDER BY random() LIMIT 1;
    
    IF next_num IS NULL THEN
        PERFORM pg_advisory_unlock(lock_key);
        RETURN json_build_object('success', false, 'error', 'No available numbers');
    END IF;
    
    INSERT INTO called_numbers (game_id, number, called_at, tenant_id)
    VALUES (game_uuid, next_num, NOW(), p_tenant_id);
    
    UPDATE games 
    SET current_number = next_num,
        called_numbers = array_append(COALESCE(called_numbers, '{}'), next_num)
    WHERE id = game_uuid AND tenant_id = p_tenant_id;
    
    PERFORM pg_advisory_unlock(lock_key);
    
    RETURN json_build_object(
        'success', true,
        'number', next_num,
        'total_called', called_count + 1,
        'remaining', 75 - (called_count + 1)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;