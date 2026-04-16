-- ============================================
-- Migration v9: Employee Streaks (연속 접속일 시스템)
-- ============================================
-- 실행: Supabase SQL Editor에서 실행

-- 1) 스트릭 테이블
CREATE TABLE IF NOT EXISTS employee_streaks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  current_streak INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  last_date DATE,
  total_days INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(employee_id)
);

-- 2) RLS 정책
ALTER TABLE employee_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "streaks_public_read" ON employee_streaks FOR SELECT USING (true);
CREATE POLICY "streaks_public_write" ON employee_streaks FOR INSERT WITH CHECK (true);
CREATE POLICY "streaks_public_update" ON employee_streaks FOR UPDATE USING (true);

-- 3) 인덱스
CREATE INDEX IF NOT EXISTS idx_streaks_employee ON employee_streaks(employee_id);

-- 완료!
-- 앱에서 자동으로 매일 접속 시 upsert 됩니다.
