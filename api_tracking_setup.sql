-- Create API tracking table
CREATE TABLE IF NOT EXISTS api_requests (
  id SERIAL PRIMARY KEY,
  ip_address TEXT NOT NULL,
  user_agent TEXT,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  user_id UUID,
  request_body JSONB,
  response_status INTEGER,
  response_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Add indexes for efficient querying
  CONSTRAINT idx_api_requests_ip_created UNIQUE (ip_address, created_at)
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_api_requests_ip ON api_requests(ip_address);
CREATE INDEX IF NOT EXISTS idx_api_requests_created_at ON api_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_api_requests_endpoint ON api_requests(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_requests_user_id ON api_requests(user_id);

-- Create blocked IPs table
CREATE TABLE IF NOT EXISTS blocked_ips (
  id SERIAL PRIMARY KEY,
  ip_address TEXT UNIQUE NOT NULL,
  reason TEXT NOT NULL,
  blocked_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_permanent BOOLEAN DEFAULT FALSE
);

-- Create index for blocked IPs
CREATE INDEX IF NOT EXISTS idx_blocked_ips_ip ON blocked_ips(ip_address);
CREATE INDEX IF NOT EXISTS idx_blocked_ips_expires ON blocked_ips(expires_at);

-- Function to log API request
CREATE OR REPLACE FUNCTION log_api_request(
  p_ip_address TEXT,
  p_user_agent TEXT,
  p_endpoint TEXT,
  p_method TEXT,
  p_user_id UUID DEFAULT NULL,
  p_request_body JSONB DEFAULT NULL,
  p_response_status INTEGER DEFAULT NULL,
  p_response_time_ms INTEGER DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  INSERT INTO api_requests (
    ip_address, user_agent, endpoint, method, user_id, 
    request_body, response_status, response_time_ms
  ) VALUES (
    p_ip_address, p_user_agent, p_endpoint, p_method, p_user_id,
    p_request_body, p_response_status, p_response_time_ms
  );
END;
$$ LANGUAGE plpgsql;

-- Function to check if IP is blocked
CREATE OR REPLACE FUNCTION is_ip_blocked(p_ip_address TEXT) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM blocked_ips 
    WHERE ip_address = p_ip_address 
    AND (expires_at IS NULL OR expires_at > NOW())
  );
END;
$$ LANGUAGE plpgsql;

-- Function to block an IP
CREATE OR REPLACE FUNCTION block_ip(
  p_ip_address TEXT,
  p_reason TEXT,
  p_duration_hours INTEGER DEFAULT 24,
  p_permanent BOOLEAN DEFAULT FALSE
) RETURNS VOID AS $$
BEGIN
  INSERT INTO blocked_ips (ip_address, reason, expires_at, is_permanent)
  VALUES (
    p_ip_address, 
    p_reason, 
    CASE 
      WHEN p_permanent THEN NULL 
      ELSE NOW() + (p_duration_hours || ' hours')::INTERVAL 
    END,
    p_permanent
  )
  ON CONFLICT (ip_address) 
  DO UPDATE SET 
    reason = p_reason,
    expires_at = CASE 
      WHEN p_permanent THEN NULL 
      ELSE NOW() + (p_duration_hours || ' hours')::INTERVAL 
    END,
    is_permanent = p_permanent;
END;
$$ LANGUAGE plpgsql;

-- Function to detect suspicious activity
CREATE OR REPLACE FUNCTION detect_suspicious_activity(p_ip_address TEXT) RETURNS TEXT AS $$
DECLARE
  recent_requests INTEGER;
  unique_users INTEGER;
  suspicious_score INTEGER := 0;
  result TEXT := '';
BEGIN
  -- Count requests in last hour
  SELECT COUNT(*) INTO recent_requests
  FROM api_requests 
  WHERE ip_address = p_ip_address 
  AND created_at > NOW() - INTERVAL '1 hour';
  
  -- Count unique users in last hour
  SELECT COUNT(DISTINCT user_id) INTO unique_users
  FROM api_requests 
  WHERE ip_address = p_ip_address 
  AND created_at > NOW() - INTERVAL '1 hour'
  AND user_id IS NOT NULL;
  
  -- Calculate suspicious score
  IF recent_requests > 50 THEN
    suspicious_score := suspicious_score + 30;
    result := result || 'High request volume (' || recent_requests || ' requests/hour). ';
  END IF;
  
  IF unique_users > 10 THEN
    suspicious_score := suspicious_score + 25;
    result := result || 'Multiple users from same IP (' || unique_users || ' users). ';
  END IF;
  
  -- Check for rapid submissions (multiple submissions within 1 minute)
  SELECT COUNT(*) INTO recent_requests
  FROM api_requests 
  WHERE ip_address = p_ip_address 
  AND endpoint = 'submit_daily_score'
  AND created_at > NOW() - INTERVAL '1 minute';
  
  IF recent_requests > 3 THEN
    suspicious_score := suspicious_score + 40;
    result := result || 'Rapid score submissions (' || recent_requests || ' in 1 minute). ';
  END IF;
  
  -- Return result
  IF suspicious_score > 50 THEN
    RETURN 'SUSPICIOUS: ' || result || 'Score: ' || suspicious_score;
  ELSIF suspicious_score > 20 THEN
    RETURN 'WATCH: ' || result || 'Score: ' || suspicious_score;
  ELSE
    RETURN 'NORMAL: Score ' || suspicious_score;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-block suspicious IPs
CREATE OR REPLACE FUNCTION auto_block_suspicious_ips() RETURNS INTEGER AS $$
DECLARE
  suspicious_ip RECORD;
  blocked_count INTEGER := 0;
BEGIN
  -- Find IPs with high suspicious scores
  FOR suspicious_ip IN 
    SELECT DISTINCT ip_address
    FROM api_requests 
    WHERE created_at > NOW() - INTERVAL '1 hour'
    AND NOT EXISTS (
      SELECT 1 FROM blocked_ips 
      WHERE ip_address = api_requests.ip_address
    )
  LOOP
    -- Check if this IP is suspicious
    IF detect_suspicious_activity(suspicious_ip.ip_address) LIKE 'SUSPICIOUS:%' THEN
      PERFORM block_ip(
        suspicious_ip.ip_address, 
        'Auto-blocked: ' || detect_suspicious_activity(suspicious_ip.ip_address),
        24, -- 24 hours
        FALSE
      );
      blocked_count := blocked_count + 1;
    END IF;
  END LOOP;
  
  RETURN blocked_count;
END;
$$ LANGUAGE plpgsql;

-- Clean up old records (keep last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_api_requests() RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM api_requests 
  WHERE created_at < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Clean up expired blocks
CREATE OR REPLACE FUNCTION cleanup_expired_blocks() RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM blocked_ips 
  WHERE expires_at IS NOT NULL 
  AND expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Run initial cleanup
SELECT cleanup_old_api_requests();
SELECT cleanup_expired_blocks();
