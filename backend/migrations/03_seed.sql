-- ============================================================
-- 集英社 初始化配置脚本
-- 仅在首次部署时执行
-- ============================================================

-- 1. 创建函数：清理过期会话
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM activity_log
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. 创建视图：用户活动概览
CREATE OR REPLACE VIEW user_activity_summary AS
SELECT
  user_id,
  COUNT(*) FILTER (WHERE action = 'login') AS total_logins,
  COUNT(*) FILTER (WHERE action = 'login_failed') AS total_failed_logins,
  MAX(created_at) AS last_activity,
  MIN(created_at) AS first_activity
FROM activity_log
GROUP BY user_id;

-- 3. 创建视图：存储使用统计
CREATE OR REPLACE VIEW storage_stats AS
SELECT
  c.user_id,
  COUNT(DISTINCT c.id) AS character_count,
  COUNT(DISTINCT ct.id) AS content_count,
  COUNT(DISTINCT ct.id) FILTER (WHERE ct.is_favorite = true) AS favorite_count,
  pg_size_pretty(
    pg_total_relation_size('characters')::bigint +
    pg_total_relation_size('contents')::bigint +
    pg_total_relation_size('app_settings')::bigint +
    pg_total_relation_size('activity_log')::bigint
  ) AS total_table_size
FROM characters c
LEFT JOIN contents ct ON ct.user_id = c.user_id
GROUP BY c.user_id;

-- 4. 创建函数：检查密码是否过期
CREATE OR REPLACE FUNCTION is_password_expired(target_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  pw_updated TIMESTAMPTZ;
BEGIN
  SELECT password_updated_at INTO pw_updated
  FROM app_settings
  WHERE user_id = target_user_id;

  IF pw_updated IS NULL THEN
    RETURN true;
  END IF;

  RETURN pw_updated < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql STABLE;

-- 5. 创建函数：获取异常登录统计
CREATE OR REPLACE FUNCTION get_login_anomalies(
  target_user_id UUID,
  lookback_hours INTEGER DEFAULT 24
)
RETURNS TABLE(
  action_type VARCHAR,
  attempt_time TIMESTAMPTZ,
  details JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    al.action,
    al.created_at,
    al.details
  FROM activity_log al
  WHERE al.user_id = target_user_id
    AND al.created_at > NOW() - (lookback_hours || ' hours')::INTERVAL
    AND al.action IN ('login', 'login_failed', 'register')
  ORDER BY al.created_at DESC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql STABLE;

-- 6. 设置定时任务（需 pg_cron 扩展，如不可用则忽略）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    PERFORM cron.schedule(
      'cleanup-activity-log',
      '0 3 * * 0',
      'SELECT cleanup_expired_sessions();'
    );
  END IF;
END $$;