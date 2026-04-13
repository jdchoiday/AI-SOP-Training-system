-- ============================================
-- SOP Training System - Supabase 테이블 생성
-- ============================================
-- 사용법: Supabase Dashboard → SQL Editor → 아래 전체 복사-붙여넣기 → Run
-- ============================================

-- 1. 직원 테이블
CREATE TABLE IF NOT EXISTS employees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL DEFAULT '1234',
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'staff')),
  branch TEXT DEFAULT '',
  team TEXT DEFAULT '',
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. SOP 문서 테이블
CREATE TABLE IF NOT EXISTS sop_documents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  title_en TEXT,
  title_vn TEXT,
  category TEXT DEFAULT '',
  content TEXT DEFAULT '',
  content_vn TEXT DEFAULT '',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  order_num INTEGER DEFAULT 0,
  script JSONB DEFAULT '[]'::jsonb,
  quizzes JSONB DEFAULT '[]'::jsonb,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. 학습 진행 (영상 시청) 테이블
CREATE TABLE IF NOT EXISTS training_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  video_id TEXT NOT NULL,
  chapter_id TEXT NOT NULL,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(employee_id, video_id)
);

-- 4. 챕터 테스트 결과 테이블
CREATE TABLE IF NOT EXISTS chapter_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  chapter_id TEXT NOT NULL,
  score INTEGER DEFAULT 0,
  passed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(employee_id, chapter_id)
);

-- 5. 초대 링크 테이블
CREATE TABLE IF NOT EXISTS invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  branch TEXT DEFAULT '',
  team TEXT DEFAULT '',
  max_uses INTEGER DEFAULT 10,
  used_count INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. 학습 마감일 테이블
CREATE TABLE IF NOT EXISTS deadlines (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sop_id TEXT REFERENCES sop_documents(id) ON DELETE CASCADE,
  branch TEXT DEFAULT '',
  deadline_at TIMESTAMPTZ NOT NULL,
  reminder_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 기본 데이터 삽입
-- ============================================

-- 관리자 계정
INSERT INTO employees (name, email, password_hash, role, branch)
VALUES ('관리자', 'admin@test.com', '1234', 'admin', '본사')
ON CONFLICT (email) DO NOTHING;

-- 직원 테스트 계정
INSERT INTO employees (name, email, password_hash, role, branch)
VALUES ('직원1', 'staff@test.com', '1234', 'staff', '강남점')
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- RLS (Row Level Security) 정책
-- ============================================
-- 보안을 위해 RLS를 활성화합니다.
-- anon 키로 접근 시 모든 데이터를 읽고 쓸 수 있도록 설정 (데모용)
-- 프로덕션에서는 더 엄격한 정책 필요

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapter_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE deadlines ENABLE ROW LEVEL SECURITY;

-- 모든 테이블에 대해 anon 사용자 읽기/쓰기 허용 (데모용)
CREATE POLICY "Allow all for anon" ON employees FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON sop_documents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON training_progress FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON chapter_results FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON invitations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON deadlines FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 7. XP 트랜잭션 테이블 (게이미피케이션)
-- ============================================
CREATE TABLE IF NOT EXISTS xp_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  source TEXT NOT NULL,
  source_id TEXT NOT NULL,
  reason TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(employee_id, source, source_id)
);

-- 8. 게이미피케이션 캐시 테이블
CREATE TABLE IF NOT EXISTS user_gamification (
  employee_id TEXT PRIMARY KEY,
  total_xp INTEGER DEFAULT 0,
  tier_index INTEGER DEFAULT 0,
  sub_level INTEGER DEFAULT 4,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_xp_emp ON xp_transactions(employee_id);

ALTER TABLE xp_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_gamification ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for anon" ON xp_transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON user_gamification FOR ALL USING (true) WITH CHECK (true);

-- 9. 칭찬 로그 테이블
CREATE TABLE IF NOT EXISTS praise_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_employee_id TEXT NOT NULL,
  to_employee_id TEXT NOT NULL,
  category TEXT NOT NULL,
  reason TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_praise_to ON praise_logs(to_employee_id);
CREATE INDEX IF NOT EXISTS idx_praise_from ON praise_logs(from_employee_id);
CREATE INDEX IF NOT EXISTS idx_praise_date ON praise_logs(created_at);

ALTER TABLE praise_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for anon" ON praise_logs FOR ALL USING (true) WITH CHECK (true);

-- 10. 지점/팀 관리 테이블
CREATE TABLE IF NOT EXISTS branch_teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  branch TEXT NOT NULL,
  team TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_branch_teams_branch ON branch_teams(branch);

ALTER TABLE branch_teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for anon" ON branch_teams FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 11. 칭찬 서버사이드 남용 방지 트리거
-- ============================================

CREATE OR REPLACE FUNCTION check_praise_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
  daily_count INTEGER;
  same_person_count INTEGER;
  daily_limit INTEGER := 2;
  same_limit INTEGER := 1;
BEGIN
  IF NEW.from_employee_id = NEW.to_employee_id THEN
    RAISE EXCEPTION 'Cannot praise yourself';
  END IF;

  SELECT COUNT(*) INTO daily_count
  FROM praise_logs
  WHERE from_employee_id = NEW.from_employee_id
    AND created_at >= CURRENT_DATE;

  IF daily_count >= daily_limit THEN
    RAISE EXCEPTION 'Daily praise limit (%) exceeded', daily_limit;
  END IF;

  SELECT COUNT(*) INTO same_person_count
  FROM praise_logs
  WHERE from_employee_id = NEW.from_employee_id
    AND to_employee_id = NEW.to_employee_id
    AND created_at >= CURRENT_DATE;

  IF same_person_count >= same_limit THEN
    RAISE EXCEPTION 'Same person daily limit (%) exceeded', same_limit;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_praise_rate_limit ON praise_logs;
CREATE TRIGGER trg_praise_rate_limit
  BEFORE INSERT ON praise_logs
  FOR EACH ROW
  EXECUTE FUNCTION check_praise_rate_limit();

-- ============================================
-- 완료! 이제 앱에서 Supabase 연동이 작동합니다
-- ============================================
