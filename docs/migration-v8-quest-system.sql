-- ============================================================
-- migration-v8-quest-system.sql
-- 퀘스트 시스템 테이블 및 시드 데이터
-- 티어별 퀘스트 정의 + 직원별 완료 추적
-- ============================================================

-- ============================================================
-- 1. quests 테이블 — 관리자가 정의하는 티어별 퀘스트
-- ============================================================
CREATE TABLE IF NOT EXISTS quests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tier_id TEXT NOT NULL DEFAULT 'iron',  -- iron, bronze, silver, gold, platinum, diamond, master, grandmaster, challenger
  title_ko TEXT NOT NULL,
  title_en TEXT DEFAULT '',
  title_vi TEXT DEFAULT '',
  desc_ko TEXT NOT NULL,
  desc_en TEXT DEFAULT '',
  desc_vi TEXT DEFAULT '',
  icon TEXT DEFAULT '⭐',
  xp_reward INT DEFAULT 30,
  quest_type TEXT DEFAULT 'manual',  -- profile, study_scenes, quiz_pass, boost_send, team_task, attendance_days, total_xp, manual
  quest_condition JSONB DEFAULT '{}',  -- 예: {"count": 5} → study_scenes 5개 시청
  link TEXT DEFAULT '',  -- 예: profile.html, praise.html
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  bonus_xp INT DEFAULT 0,  -- 해당 티어의 모든 퀘스트 완료 시 보너스 XP (첫 번째 퀘스트에만 설정)
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS 활성화
ALTER TABLE quests ENABLE ROW LEVEL SECURITY;

-- 모든 사용자 읽기 허용
CREATE POLICY "quests_read" ON quests FOR SELECT USING (true);

-- 관리자만 수정 가능
CREATE POLICY "quests_admin" ON quests FOR ALL USING (
  EXISTS (SELECT 1 FROM employees WHERE id = auth.uid() AND role IN ('admin','super_admin'))
);

-- ============================================================
-- 2. quest_completions 테이블 — 직원별 퀘스트 진행/완료 추적
-- ============================================================
CREATE TABLE IF NOT EXISTS quest_completions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES employees(id),
  quest_id UUID NOT NULL REFERENCES quests(id),
  completed_at TIMESTAMPTZ DEFAULT now(),
  xp_claimed BOOLEAN DEFAULT false,
  claimed_at TIMESTAMPTZ,
  UNIQUE(employee_id, quest_id)
);

-- RLS 활성화
ALTER TABLE quest_completions ENABLE ROW LEVEL SECURITY;

-- 읽기: 모든 사용자
CREATE POLICY "quest_completions_read" ON quest_completions FOR SELECT USING (true);

-- 쓰기: 모든 사용자 (자기 퀘스트 완료 기록)
CREATE POLICY "quest_completions_write" ON quest_completions FOR INSERT WITH CHECK (true);

-- 수정: 모든 사용자 (XP 수령 처리)
CREATE POLICY "quest_completions_update" ON quest_completions FOR UPDATE USING (true);

-- ============================================================
-- 3. 시드 데이터 — Iron (새싹) 티어 퀘스트
-- ============================================================
INSERT INTO quests (tier_id, title_ko, desc_ko, icon, xp_reward, quest_type, quest_condition, link, sort_order, bonus_xp)
VALUES
  -- Iron 티어: 신규 직원 기본 퀘스트 (보너스 100 XP)
  ('iron', '자기소개', '프로필 사진 + 한줄소개 등록', '👤', 30, 'profile', '{}', 'profile.html', 1, 100),
  ('iron', '첫 수업', '교육 영상 1개 시청', '📺', 50, 'study_scenes', '{"count":1}', '', 2, 0),
  ('iron', '도전자', '미니퀴즈 1회 통과', '🧠', 50, 'quiz_pass', '{"count":1}', '', 3, 0),
  ('iron', '응원단', '동료에게 부스트 1회', '💬', 30, 'boost_send', '{"count":1}', 'praise.html', 4, 0),
  ('iron', '첫 미션', '챌린지 1개 참여', '🤝', 50, 'team_task', '{"count":1}', 'team-tasks.html', 5, 0);

-- ============================================================
-- 4. 시드 데이터 — Bronze (성장) 티어 퀘스트
-- ============================================================
INSERT INTO quests (tier_id, title_ko, desc_ko, icon, xp_reward, quest_type, quest_condition, link, sort_order, bonus_xp)
VALUES
  -- Bronze 티어: 성장 단계 퀘스트 (보너스 200 XP)
  ('bronze', '학습왕', '교육 영상 10개 시청', '📚', 80, 'study_scenes', '{"count":10}', '', 1, 200),
  ('bronze', '퀴즈 마스터', '퀴즈 5회 통과', '🏅', 80, 'quiz_pass', '{"count":5}', '', 2, 0),
  ('bronze', '인기인', '부스트 10회 보내기', '🌟', 60, 'boost_send', '{"count":10}', 'praise.html', 3, 0),
  ('bronze', '팀 플레이어', '챌린지 3개 완료', '💪', 100, 'team_task', '{"count":3}', 'team-tasks.html', 4, 0),
  ('bronze', '출근왕', '출근 체크 20일 달성', '📍', 100, 'attendance_days', '{"count":20}', '', 5, 0);

-- ============================================================
-- 5. 시드 데이터 — Silver (전문) 티어 퀘스트
-- ============================================================
INSERT INTO quests (tier_id, title_ko, desc_ko, icon, xp_reward, quest_type, quest_condition, link, sort_order, bonus_xp)
VALUES
  -- Silver 티어: 전문가 단계 퀘스트 (보너스 300 XP)
  ('silver', '전문가', '교육 영상 30개 시청', '🎓', 120, 'study_scenes', '{"count":30}', '', 1, 300),
  ('silver', '퀴즈 챔피언', '퀴즈 15회 통과', '🏆', 120, 'quiz_pass', '{"count":15}', '', 2, 0),
  ('silver', '부스트 마스터', '부스트 30회 보내기', '💎', 100, 'boost_send', '{"count":30}', 'praise.html', 3, 0),
  ('silver', '리더', '챌린지 10개 완료', '🚀', 150, 'team_task', '{"count":10}', 'team-tasks.html', 4, 0),
  ('silver', '개근상', '출근 체크 60일 달성', '🏅', 150, 'attendance_days', '{"count":60}', '', 5, 0);
