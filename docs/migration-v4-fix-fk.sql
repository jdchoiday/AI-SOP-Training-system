-- ============================================
-- Migration v4 Fix: FK 제약 완화
-- ============================================
-- 자유 가입 사용자도 성과제를 사용할 수 있도록
-- employee_id FK를 제거합니다.
-- Supabase Dashboard → SQL Editor → Run
-- ============================================

-- basic_task_logs에서 FK 제거
ALTER TABLE basic_task_logs DROP CONSTRAINT IF EXISTS basic_task_logs_employee_id_fkey;

-- point_transactions에서 FK 제거
ALTER TABLE point_transactions DROP CONSTRAINT IF EXISTS point_transactions_employee_id_fkey;

-- employee_id를 TEXT로 변경 (UUID와 TEXT 모두 수용)
ALTER TABLE basic_task_logs ALTER COLUMN employee_id TYPE TEXT;
ALTER TABLE point_transactions ALTER COLUMN employee_id TYPE TEXT;

-- basic_task_templates의 created_by FK도 제거 (옵션)
ALTER TABLE basic_task_templates DROP CONSTRAINT IF EXISTS basic_task_templates_created_by_fkey;

-- ============================================
-- 완료!
-- ============================================
