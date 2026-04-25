-- ============================================
-- Migration v11: Beta Feedback System
-- ============================================
-- 소프트런칭 기간 베타 테스터 피드백 수집용.
-- 30명 내부 테스터 규모에서는 간단한 단일 테이블로 충분.
--
-- 실행: Supabase SQL Editor 에 통째로 붙여넣기

-- ------------------------------------------------------------
-- 1. beta_feedback: 피드백 단일 테이블
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS beta_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id TEXT,                     -- 로그인된 사번 (anon 허용 → NULL 가능)
  employee_name TEXT,                   -- 편의상 스냅샷
  category TEXT NOT NULL DEFAULT 'general'
    CHECK (category IN ('bug','suggestion','content','ux','general')),
  severity TEXT DEFAULT 'normal'
    CHECK (severity IN ('low','normal','high','critical')),
  message TEXT NOT NULL CHECK (char_length(message) BETWEEN 1 AND 4000),
  page_url TEXT,                        -- 피드백 발생 위치 (URL)
  user_agent TEXT,                      -- 브라우저/OS 식별용
  viewport TEXT,                        -- ex) "1920x1080"
  screenshot_url TEXT,                  -- Supabase Storage URL (옵션)
  metadata JSONB DEFAULT '{}'::jsonb,   -- 추가 컨텍스트 (slide index, scene id 등)
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new','triaged','in_progress','resolved','wont_fix','duplicate')),
  admin_note TEXT,                      -- 어드민 메모
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_beta_feedback_created ON beta_feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_beta_feedback_status ON beta_feedback(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_beta_feedback_employee ON beta_feedback(employee_id, created_at DESC);

-- ------------------------------------------------------------
-- 2. RLS: 소프트런칭 단계 → 전면 허용
-- ------------------------------------------------------------
-- 운영 전환 시 아래 정책을 INSERT 만 허용 / SELECT 관리자 only 로 좁힐 것.
ALTER TABLE beta_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for anon" ON beta_feedback;
CREATE POLICY "Allow all for anon" ON beta_feedback
  FOR ALL USING (true) WITH CHECK (true);

-- ------------------------------------------------------------
-- 3. updated_at 자동 갱신 트리거
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION touch_beta_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_beta_feedback_updated ON beta_feedback;
CREATE TRIGGER trg_beta_feedback_updated
  BEFORE UPDATE ON beta_feedback
  FOR EACH ROW
  EXECUTE FUNCTION touch_beta_feedback_updated_at();

-- ------------------------------------------------------------
-- 4. 확인 쿼리 (실행 후 아래로 검증)
-- ------------------------------------------------------------
-- SELECT count(*) FROM beta_feedback;
-- SELECT status, count(*) FROM beta_feedback GROUP BY status;
