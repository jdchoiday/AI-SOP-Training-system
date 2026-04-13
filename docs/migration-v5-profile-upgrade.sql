-- ============================================
-- Migration v5: 프로필 업그레이드 (게임 캐릭터 스타일)
-- ============================================
-- Supabase Dashboard → SQL Editor → 전체 복사-붙여넣기 → Run
-- ============================================

-- employee_profiles 테이블에 새 컬럼 추가
ALTER TABLE employee_profiles ADD COLUMN IF NOT EXISTS birthday DATE;
ALTER TABLE employee_profiles ADD COLUMN IF NOT EXISTS join_date DATE;
ALTER TABLE employee_profiles ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '';
ALTER TABLE employee_profiles ADD COLUMN IF NOT EXISTS stats JSONB DEFAULT '{"comm":5,"focus":5,"team":5,"creative":5,"speed":5,"service":5}'::jsonb;
ALTER TABLE employee_profiles ADD COLUMN IF NOT EXISTS strengths JSONB DEFAULT '[]'::jsonb;
ALTER TABLE employee_profiles ADD COLUMN IF NOT EXISTS weaknesses JSONB DEFAULT '[]'::jsonb;
ALTER TABLE employee_profiles ADD COLUMN IF NOT EXISTS work_styles JSONB DEFAULT '[]'::jsonb;
ALTER TABLE employee_profiles ADD COLUMN IF NOT EXISTS goal TEXT DEFAULT '';
ALTER TABLE employee_profiles ADD COLUMN IF NOT EXISTS special_ability TEXT DEFAULT '';
ALTER TABLE employee_profiles ADD COLUMN IF NOT EXISTS theme_color TEXT DEFAULT '#2563eb';

-- ============================================
-- 완료!
-- ============================================
