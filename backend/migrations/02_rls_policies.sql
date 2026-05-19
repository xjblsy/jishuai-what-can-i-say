-- ============================================================
-- 集英社 Row Level Security 策略
-- 确保每个用户只能访问自己的数据
-- ============================================================

-- 启用所有表的 RLS
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- characters 表策略
-- ============================================================

-- 查看自己的所有人物
CREATE POLICY "characters_select_own" ON characters
  FOR SELECT
  USING (auth.uid() = user_id);

-- 创建属于自己的人物
CREATE POLICY "characters_insert_own" ON characters
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 更新属于自己的人物
CREATE POLICY "characters_update_own" ON characters
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 删除属于自己的人物
CREATE POLICY "characters_delete_own" ON characters
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- contents 表策略
-- ============================================================

CREATE POLICY "contents_select_own" ON contents
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "contents_insert_own" ON contents
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "contents_update_own" ON contents
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "contents_delete_own" ON contents
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- app_settings 表策略
-- ============================================================

CREATE POLICY "settings_select_own" ON app_settings
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "settings_insert_own" ON app_settings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "settings_update_own" ON app_settings
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "settings_delete_own" ON app_settings
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- activity_log 表策略 - 仅允许用户查看自己的日志
-- ============================================================

CREATE POLICY "activity_select_own" ON activity_log
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "activity_insert_own" ON activity_log
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 移除 public 的默认访问权限
-- ============================================================
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated, public;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated, public;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated, public;

-- 授予 authenticated 用户必要的权限
GRANT SELECT, INSERT, UPDATE, DELETE ON characters TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON contents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON app_settings TO authenticated;
GRANT SELECT, INSERT ON activity_log TO authenticated;

GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;