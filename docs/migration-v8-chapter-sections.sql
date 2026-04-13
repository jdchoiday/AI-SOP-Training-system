-- ============================================
-- Migration v8: Chapter ↔ Section 계층 구조
-- ============================================
-- 실행: Supabase Dashboard → SQL Editor → 전체 복사-붙여넣기 → Run
--
-- 변경 사항:
-- 1. sop_documents에 parent_id, doc_type, exam_quizzes 추가
-- 2. 기존 SOPs는 자동으로 'section' 타입 (하위 호환)
-- 3. 대챕터(doc_type='chapter')는 섹션의 컨테이너
-- ============================================

-- 1. 챕터/섹션 구분 컬럼
ALTER TABLE sop_documents
  ADD COLUMN IF NOT EXISTS doc_type VARCHAR(20) DEFAULT 'section';
-- 'chapter' = 대챕터 (섹션 컨테이너)
-- 'section' = 섹션 (기존 SOP, 씬+퀴즈 보유)

-- 2. 부모 챕터 참조
ALTER TABLE sop_documents
  ADD COLUMN IF NOT EXISTS parent_id TEXT;
-- NULL = 독립 섹션 또는 대챕터
-- 'chapter-xxx' = 해당 대챕터의 하위 섹션

-- 3. 대챕터 종합시험 (30문제)
ALTER TABLE sop_documents
  ADD COLUMN IF NOT EXISTS exam_quizzes JSONB DEFAULT '[]'::jsonb;
-- 대챕터 완료 후 종합시험 문제 저장

-- 4. 인덱스
CREATE INDEX IF NOT EXISTS idx_sop_parent ON sop_documents(parent_id);
CREATE INDEX IF NOT EXISTS idx_sop_doc_type ON sop_documents(doc_type);

-- 5. 시험 결과 테이블 (챕터 종합시험용)
CREATE TABLE IF NOT EXISTS exam_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  chapter_id TEXT NOT NULL,
  score INTEGER DEFAULT 0,
  total_questions INTEGER DEFAULT 30,
  passed BOOLEAN DEFAULT false,
  answers JSONB DEFAULT '[]'::jsonb,
  completed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(employee_id, chapter_id)
);

ALTER TABLE exam_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for anon" ON exam_results FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 완료! 기존 데이터는 모두 doc_type='section'으로 유지됩니다.
-- admin에서 대챕터를 만들고 섹션을 배치하세요.
-- ============================================
