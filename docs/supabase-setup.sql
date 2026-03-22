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
-- 완료! 이제 앱에서 Supabase 연동이 작동합니다
-- ============================================
