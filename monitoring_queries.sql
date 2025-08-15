-- ========================================
-- MONITORING QUERIES FOR API TRACKING
-- ========================================

-- 1. Recent API activity (last 24 hours)
SELECT 
  ip_address,
  endpoint,
  COUNT(*) as request_count,
  COUNT(DISTINCT user_id) as unique_users,
  MIN(created_at) as first_request,
  MAX(created_at) as last_request,
  AVG(response_time_ms) as avg_response_time
FROM api_requests 
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY ip_address, endpoint
ORDER BY request_count DESC
LIMIT 20;

-- 2. Suspicious IPs (high activity)
SELECT 
  ip_address,
  COUNT(*) as total_requests,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT endpoint) as endpoints_used,
  detect_suspicious_activity(ip_address) as suspicious_score,
  MIN(created_at) as first_seen,
  MAX(created_at) as last_seen
FROM api_requests 
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY ip_address
HAVING COUNT(*) > 10 OR COUNT(DISTINCT user_id) > 5
ORDER BY total_requests DESC;

-- 3. Currently blocked IPs
SELECT 
  ip_address,
  reason,
  blocked_at,
  expires_at,
  is_permanent,
  CASE 
    WHEN expires_at IS NULL THEN 'PERMANENT'
    WHEN expires_at > NOW() THEN 'ACTIVE'
    ELSE 'EXPIRED'
  END as status
FROM blocked_ips
WHERE expires_at IS NULL OR expires_at > NOW()
ORDER BY blocked_at DESC;

-- 4. Score submission patterns (potential spam detection)
SELECT 
  ip_address,
  COUNT(*) as submissions,
  array_agg(DISTINCT name) as names_used,
  array_agg(DISTINCT score) as scores,
  array_agg(DISTINCT user_id) as user_ids,
  MIN(created_at) as first_submission,
  MAX(created_at) as last_submission,
  EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at)))/60 as minutes_between
FROM api_requests 
WHERE endpoint = 'submit_daily_score'
AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY ip_address
HAVING COUNT(*) > 1
ORDER BY submissions DESC;

-- 5. User agents analysis (identify bots/scripts)
SELECT 
  user_agent,
  COUNT(*) as request_count,
  COUNT(DISTINCT ip_address) as unique_ips,
  COUNT(DISTINCT user_id) as unique_users
FROM api_requests 
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY user_agent
ORDER BY request_count DESC
LIMIT 20;

-- 6. Manual IP blocking commands
-- To block an IP for 24 hours:
-- SELECT block_ip('IP_ADDRESS_HERE', 'Manual block: suspicious activity', 24, false);

-- To permanently block an IP:
-- SELECT block_ip('IP_ADDRESS_HERE', 'Manual block: permanent ban', 0, true);

-- To unblock an IP:
-- DELETE FROM blocked_ips WHERE ip_address = 'IP_ADDRESS_HERE';

-- 7. Auto-block suspicious IPs
-- SELECT auto_block_suspicious_ips();

-- 8. Clean up old data
-- SELECT cleanup_old_api_requests();
-- SELECT cleanup_expired_blocks();

-- 9. Real-time monitoring (run this to see live activity)
SELECT 
  ip_address,
  endpoint,
  user_id,
  created_at,
  response_status,
  response_time_ms
FROM api_requests 
WHERE created_at > NOW() - INTERVAL '5 minutes'
ORDER BY created_at DESC
LIMIT 50;
