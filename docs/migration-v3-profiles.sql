-- ============================================
-- Migration V3: 직원 프로필 테이블
-- ============================================
-- Supabase Dashboard → SQL Editor → 복사-붙여넣기 → Run
-- ============================================

CREATE TABLE IF NOT EXISTS employee_profiles (
  employee_id TEXT PRIMARY KEY,
  avatar TEXT DEFAULT '',           -- base64 photo (max ~100KB)
  avatar_type TEXT DEFAULT 'initial', -- 'initial', 'emoji', 'photo'
  avatar_emoji TEXT DEFAULT '',
  intro TEXT DEFAULT '',            -- 한 줄 소개 (60자)
  bio TEXT DEFAULT '',              -- 상세 소개 (300자)
  mbti TEXT DEFAULT '',
  personality TEXT DEFAULT '',
  hobbies JSONB DEFAULT '[]'::jsonb,
  likes JSONB DEFAULT '[]'::jsonb,
  motto TEXT DEFAULT '',
  skills TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE employee_profiles ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'employee_profiles' AND policyname = 'Allow all for anon'
  ) THEN
    CREATE POLICY "Allow all for anon" ON employee_profiles FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ============================================
-- 완료!
-- ============================================
