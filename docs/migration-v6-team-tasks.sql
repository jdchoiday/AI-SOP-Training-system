-- ============================================
-- V6: 팀 테스크 시스템 (Team Tasks)
-- 테스크 생성 → 팀원 초대 → 역할별 XP → 칭찬 → 공유
-- ============================================

-- 1) 팀 테스크 (프로젝트/업무)
CREATE TABLE IF NOT EXISTS team_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  creator_id TEXT NOT NULL,          -- 만든 사람 employee_id
  branch TEXT DEFAULT '',             -- 지점
  status TEXT DEFAULT 'open' CHECK (status IN ('open','in_progress','review','completed','cancelled')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  deadline DATE,                      -- 마감일
  xp_reward INT DEFAULT 30,          -- 완료 시 기본 XP
  point_reward INT DEFAULT 15,       -- 완료 시 기본 P
  max_members INT DEFAULT 10,        -- 최대 참여 인원
  is_public BOOLEAN DEFAULT true,    -- 같은 지점에 공개 여부
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2) 테스크 멤버 (역할별 참여)
CREATE TABLE IF NOT EXISTS team_task_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES team_tasks(id) ON DELETE CASCADE,
  employee_id TEXT NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('leader','member','supporter','reviewer')),
  status TEXT DEFAULT 'invited' CHECK (status IN ('invited','accepted','declined','completed')),
  xp_multiplier NUMERIC(3,2) DEFAULT 1.00,  -- 역할별 XP 배율 (리더 1.5x 등)
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE(task_id, employee_id)
);

-- 3) 테스크 활동 로그 (코멘트, 상태변경, 칭찬)
CREATE TABLE IF NOT EXISTS team_task_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES team_tasks(id) ON DELETE CASCADE,
  actor_id TEXT NOT NULL,             -- 행동한 사람
  type TEXT NOT NULL CHECK (type IN ('comment','status_change','praise','member_join','member_leave','complete')),
  content TEXT DEFAULT '',            -- 코멘트 내용 또는 상태 변경 설명
  target_id TEXT,                     -- 칭찬 대상 등
  metadata JSONB DEFAULT '{}',        -- 추가 데이터
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4) 인덱스
CREATE INDEX IF NOT EXISTS idx_team_tasks_creator ON team_tasks(creator_id);
CREATE INDEX IF NOT EXISTS idx_team_tasks_branch ON team_tasks(branch);
CREATE INDEX IF NOT EXISTS idx_team_tasks_status ON team_tasks(status);
CREATE INDEX IF NOT EXISTS idx_team_task_members_employee ON team_task_members(employee_id);
CREATE INDEX IF NOT EXISTS idx_team_task_members_task ON team_task_members(task_id);
CREATE INDEX IF NOT EXISTS idx_team_task_activities_task ON team_task_activities(task_id);

-- 5) 역할별 기본 XP 배율 참고:
--   leader    = 1.5x (테스크 리더, 책임자)
--   member    = 1.0x (일반 참여자)
--   supporter = 0.7x (부분 지원)
--   reviewer  = 0.5x (검토/피드백)
