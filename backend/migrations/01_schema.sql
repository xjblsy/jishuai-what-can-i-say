-- ============================================================
-- 集英社 (JYS) 数据库架构
-- 部署目标: Supabase PostgreSQL
-- 版本: v2.0.0 (后端版)
-- ============================================================

-- 启用必要的扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. 人物表 (characters)
-- ============================================================
CREATE TABLE IF NOT EXISTS characters (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL,
  name        VARCHAR(20) NOT NULL,
  nickname    VARCHAR(20) DEFAULT '',
  remark      VARCHAR(200) DEFAULT '',
  avatar      TEXT DEFAULT '',
  content_count INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_characters_user
    FOREIGN KEY (user_id)
    REFERENCES auth.users(id)
    ON DELETE CASCADE
);

CREATE INDEX idx_characters_user_id ON characters(user_id);
CREATE INDEX idx_characters_name ON characters(user_id, name);
CREATE INDEX idx_characters_updated ON characters(user_id, updated_at DESC);

-- ============================================================
-- 2. 语录内容表 (contents)
-- ============================================================
CREATE TABLE IF NOT EXISTS contents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL,
  character_id  UUID NOT NULL,
  text          TEXT DEFAULT '',
  images        JSONB DEFAULT '[]'::jsonb,
  tags          JSONB DEFAULT '[]'::jsonb,
  is_favorite   BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_contents_user
    FOREIGN KEY (user_id)
    REFERENCES auth.users(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_contents_character
    FOREIGN KEY (character_id)
    REFERENCES characters(id)
    ON DELETE CASCADE
);

CREATE INDEX idx_contents_user_id ON contents(user_id);
CREATE INDEX idx_contents_character_id ON contents(character_id);
CREATE INDEX idx_contents_user_char ON contents(user_id, character_id);
CREATE INDEX idx_contents_fav ON contents(user_id, is_favorite) WHERE is_favorite = true;
CREATE INDEX idx_contents_tags ON contents USING GIN (tags);
CREATE INDEX idx_contents_created ON contents(user_id, created_at DESC);
CREATE INDEX idx_contents_text_search ON contents USING GIN (to_tsvector('simple', COALESCE(text, '')));

-- ============================================================
-- 3. 应用设置表 (app_settings)
-- ============================================================
CREATE TABLE IF NOT EXISTS app_settings (
  user_id             UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  password_hash       VARCHAR(256) NOT NULL,
  password_salt       VARCHAR(128) NOT NULL,
  password_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  login_attempts      INTEGER DEFAULT 0,
  lock_until          TIMESTAMPTZ,
  preferences         JSONB DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 4. 活动日志表 (activity_log) - 安全审计
-- ============================================================
CREATE TABLE IF NOT EXISTS activity_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action      VARCHAR(50) NOT NULL,
  details     JSONB DEFAULT '{}'::jsonb,
  ip_address  INET,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activity_log_user ON activity_log(user_id, created_at DESC);
CREATE INDEX idx_activity_log_action ON activity_log(action, created_at DESC);

-- ============================================================
-- 自动更新 updated_at 触发器
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_characters_updated') THEN
    CREATE TRIGGER trg_characters_updated
      BEFORE UPDATE ON characters
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_contents_updated') THEN
    CREATE TRIGGER trg_contents_updated
      BEFORE UPDATE ON contents
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_settings_updated') THEN
    CREATE TRIGGER trg_settings_updated
      BEFORE UPDATE ON app_settings
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

-- ============================================================
-- 自动维护 content_count 触发器
-- ============================================================
CREATE OR REPLACE FUNCTION update_character_content_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE characters SET content_count = content_count + 1 WHERE id = NEW.character_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE characters SET content_count = GREATEST(content_count - 1, 0) WHERE id = OLD.character_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_contents_count_insert') THEN
    CREATE TRIGGER trg_contents_count_insert
      AFTER INSERT ON contents
      FOR EACH ROW EXECUTE FUNCTION update_character_content_count();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_contents_count_delete') THEN
    CREATE TRIGGER trg_contents_count_delete
      AFTER DELETE ON contents
      FOR EACH ROW EXECUTE FUNCTION update_character_content_count();
  END IF;
END $$;