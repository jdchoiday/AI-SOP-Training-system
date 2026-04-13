-- ============================================
-- Migration v4: 기본 성과제 + 포인트(P) 시스템
-- ============================================
-- Supabase Dashboard → SQL Editor → 전체 복사-붙여넣기 → Run
-- ============================================

-- 1. 기본 성과제 정의 테이블 (관리자가 등록하는 업무 템플릿)
CREATE TABLE IF NOT EXISTS basic_task_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,                    -- 업무명 (예: 정시 출근)
  title_en TEXT DEFAULT '',
  title_vi TEXT DEFAULT '',
  category TEXT NOT NULL DEFAULT 'daily', -- daily / weekly / monthly
  xp_reward INTEGER NOT NULL DEFAULT 10,  -- 완료 시 XP
  point_reward INTEGER NOT NULL DEFAULT 5, -- 완료 시 포인트(P)
  icon TEXT DEFAULT '📋',                 -- 표시 아이콘
  sort_order INTEGER DEFAULT 0,           -- 정렬 순서
  is_active BOOLEAN DEFAULT true,         -- 활성/비활성
  branch TEXT DEFAULT '',                 -- 특정 지점 전용 (빈값=전체)
  created_by UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 기본 성과제 완료 기록 (직원이 체크한 기록)
CREATE TABLE IF NOT EXISTS basic_task_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES employees(id),
  template_id UUID NOT NULL REFERENCES basic_task_templates(id),
  completed_date DATE NOT NULL DEFAULT CURRENT_DATE,  -- 완료 날짜
  xp_granted INTEGER DEFAULT 0,
  points_granted INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  -- 같은 날 같은 업무 중복 체크 방지
  UNIQUE(employee_id, template_id, completed_date)
);

-- 3. employees 테이블에 포인트(P) 컬럼 추가
ALTER TABLE employees ADD COLUMN IF NOT EXISTS quarter_points INTEGER DEFAULT 0;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS total_points INTEGER DEFAULT 0;

-- 4. 포인트 트랜잭션 기록 (감사 로그)
CREATE TABLE IF NOT EXISTS point_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES employees(id),
  amount INTEGER NOT NULL,
  source TEXT NOT NULL,        -- 'basic_task' / 'special_task' / 'admin_adjust'
  source_id TEXT DEFAULT '',   -- 관련 ID
  reason TEXT DEFAULT '',      -- 사유
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ===== 인덱스 =====
CREATE INDEX IF NOT EXISTS idx_basic_task_logs_emp ON basic_task_logs(employee_id);
CREATE INDEX IF NOT EXISTS idx_basic_task_logs_date ON basic_task_logs(completed_date);
CREATE INDEX IF NOT EXISTS idx_basic_task_logs_emp_date ON basic_task_logs(employee_id, completed_date);
CREATE INDEX IF NOT EXISTS idx_point_transactions_emp ON point_transactions(employee_id);

-- ===== RLS 정책 =====
ALTER TABLE basic_task_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for anon" ON basic_task_templates FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE basic_task_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for anon" ON basic_task_logs FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE point_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for anon" ON point_transactions FOR ALL USING (true) WITH CHECK (true);

-- ===== 기본 성과제 템플릿 초기 데이터 =====
INSERT INTO basic_task_templates (title, title_en, title_vi, category, xp_reward, point_reward, icon, sort_order) VALUES
  ('정시 출근', 'On-time Arrival', 'Đến đúng giờ', 'daily', 10, 5, '⏰', 1),
  ('정시 퇴근', 'On-time Departure', 'Về đúng giờ', 'daily', 5, 3, '🏠', 2),
  ('일일 업무 보고', 'Daily Report', 'Báo cáo hàng ngày', 'daily', 20, 10, '📝', 3),
  ('매장 청결 점검', 'Store Cleanliness Check', 'Kiểm tra vệ sinh', 'daily', 15, 8, '🧹', 4),
  ('고객 응대 우수', 'Excellent Customer Service', 'Dịch vụ khách hàng xuất sắc', 'daily', 20, 10, '😊', 5),
  ('SOP 학습 완료', 'SOP Training Complete', 'Hoàn thành đào tạo SOP', 'weekly', 50, 20, '📚', 10),
  ('팀 미팅 참여', 'Team Meeting Attendance', 'Tham dự họp nhóm', 'weekly', 15, 8, '👥', 11),
  ('월간 KPI 달성', 'Monthly KPI Achievement', 'Đạt KPI hàng tháng', 'monthly', 100, 50, '🎯', 20)
ON CONFLICT DO NOTHING;
