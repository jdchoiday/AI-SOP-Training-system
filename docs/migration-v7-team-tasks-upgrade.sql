-- ============================================
-- V7: Team Tasks Upgrade - Photo, Time, Manager Review
-- Run in Supabase SQL Editor
-- ============================================

-- 1) 사진 첨부 (전/후 비교) - Base64 극소 압축 저장
ALTER TABLE team_tasks ADD COLUMN IF NOT EXISTS photo_before_url TEXT DEFAULT '';
ALTER TABLE team_tasks ADD COLUMN IF NOT EXISTS photo_after_url TEXT DEFAULT '';

-- 2) 예상 vs 실제 소요시간
ALTER TABLE team_tasks ADD COLUMN IF NOT EXISTS estimated_hours NUMERIC(6,2) DEFAULT NULL;
ALTER TABLE team_tasks ADD COLUMN IF NOT EXISTS actual_hours NUMERIC(6,2) DEFAULT NULL;

-- 3) 매니저 검토/승인
ALTER TABLE team_tasks ADD COLUMN IF NOT EXISTS reviewer_id TEXT DEFAULT NULL;
ALTER TABLE team_tasks ADD COLUMN IF NOT EXISTS review_notes TEXT DEFAULT '';
ALTER TABLE team_tasks ADD COLUMN IF NOT EXISTS review_score INTEGER DEFAULT NULL;
ALTER TABLE team_tasks ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ DEFAULT NULL;

-- 4) 인덱스
CREATE INDEX IF NOT EXISTS idx_team_tasks_reviewer ON team_tasks(reviewer_id);

-- 5) team_task_activities type CHECK 업데이트
-- 기존: comment, status_change, praise, member_join, member_leave, complete
-- 추가: review_request, review_approve, review_reject
ALTER TABLE team_task_activities DROP CONSTRAINT IF EXISTS team_task_activities_type_check;
ALTER TABLE team_task_activities ADD CONSTRAINT team_task_activities_type_check
  CHECK (type IN ('comment', 'status_change', 'praise', 'member_join', 'member_leave', 'complete', 'review_request', 'review_approve', 'review_reject'));

-- 6) RLS (기존 anon allow all 유지)
-- 프로덕션 전 반드시 수정 필요
