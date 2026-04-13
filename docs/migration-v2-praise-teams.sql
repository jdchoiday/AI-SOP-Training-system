-- ============================================
-- Migration V2: 칭찬 시스템 + 지점/팀 관리
-- ============================================
-- Supabase Dashboard → SQL Editor → 아래 전체 복사-붙여넣기 → Run
-- ============================================

-- 1. employees 테이블에 team 컬럼 추가
ALTER TABLE employees ADD COLUMN IF NOT EXISTS team TEXT DEFAULT '';

-- 2. invitations 테이블에 team 컬럼 추가
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS team TEXT DEFAULT '';

-- 3. praise_logs 테이블에 reason 컬럼 추가
ALTER TABLE praise_logs ADD COLUMN IF NOT EXISTS reason TEXT DEFAULT '';

-- 4. branch_teams 테이블 생성 (이미 있으면 스킵)
CREATE TABLE IF NOT EXISTS branch_teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  branch TEXT NOT NULL,
  team TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_branch_teams_branch ON branch_teams(branch);

-- RLS
ALTER TABLE branch_teams ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'branch_teams' AND policyname = 'Allow all for anon'
  ) THEN
    CREATE POLICY "Allow all for anon" ON branch_teams FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ============================================
-- 5. 칭찬 서버사이드 남용 방지 트리거
-- ============================================
-- 클라이언트 JS 체크만으로는 조작 가능 → DB 레벨에서 강제

-- 트리거 함수: 칭찬 삽입 전 남용 체크
CREATE OR REPLACE FUNCTION check_praise_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
  daily_count INTEGER;
  same_person_count INTEGER;
  daily_limit INTEGER := 2;       -- PRAISE_DAILY_LIMIT
  same_limit INTEGER := 1;        -- PRAISE_SAME_PERSON_DAILY
BEGIN
  -- 자기 자신에게 칭찬 차단
  IF NEW.from_employee_id = NEW.to_employee_id THEN
    RAISE EXCEPTION 'Cannot praise yourself';
  END IF;

  -- 오늘 전체 보낸 수 체크
  SELECT COUNT(*) INTO daily_count
  FROM praise_logs
  WHERE from_employee_id = NEW.from_employee_id
    AND created_at >= CURRENT_DATE;

  IF daily_count >= daily_limit THEN
    RAISE EXCEPTION 'Daily praise limit (%) exceeded', daily_limit;
  END IF;

  -- 오늘 같은 사람에게 보낸 수 체크
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

-- 기존 트리거 삭제 후 재생성
DROP TRIGGER IF EXISTS trg_praise_rate_limit ON praise_logs;
CREATE TRIGGER trg_praise_rate_limit
  BEFORE INSERT ON praise_logs
  FOR EACH ROW
  EXECUTE FUNCTION check_praise_rate_limit();

-- ============================================
-- 6. 앱 설정 테이블 (칭찬 설정 등 서버 동기화용)
-- ============================================
CREATE TABLE IF NOT EXISTS app_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'app_config' AND policyname = 'Allow all for anon'
  ) THEN
    CREATE POLICY "Allow all for anon" ON app_config FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ============================================
-- 완료! 칭찬 남용 방지가 DB 레벨에서 강제됩니다.
-- ============================================
