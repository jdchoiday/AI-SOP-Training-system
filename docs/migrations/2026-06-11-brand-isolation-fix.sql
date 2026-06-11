-- ============================================================
-- 2026-06-11 · 브랜드(회사) 데이터 격리 바로잡기
-- ============================================================
-- 배경: 자유/초대 가입이 직원을 무조건 "가장 먼저 생성된 회사"(Kiwooza)로
--       배정해, SLCO 직원이 키우자 교육자료를 보던 문제(RC1/RC2)를 코드에서 수정.
--       아래는 그 버그로 이미 잘못 배정된 라이브 데이터를 바로잡은 기록(적용 완료).
-- 주의: 이 파일은 "이미 라이브 DB(execute_sql)로 적용된" 변경의 기록용이다.
--       회사 UUID 는 이 프로젝트(xbcdzkrhtjgxdwfqqugc) 고정값.
--   Kiwooza Vietnam = dae1afc8-55cb-476e-8099-07ef41e4452d
--   SLCO            = f7b86b4d-9a43-486d-8d07-6ba812cd4ef7

-- ── 1) 잘못 배정된 SLCO 직원 3명 + 그들의 모든 개인데이터를 Kiwooza → SLCO 로 이동 ──
--    (jd.choi@visitplayz.com / jino1265@slko.co.kr / lsm713@slko.co.kr)
BEGIN;
UPDATE employees         SET company_id='f7b86b4d-9a43-486d-8d07-6ba812cd4ef7' WHERE email IN ('jd.choi@visitplayz.com','jino1265@slko.co.kr','lsm713@slko.co.kr');

WITH ids AS (
  SELECT id::text AS eid FROM employees
  WHERE email IN ('jd.choi@visitplayz.com','jino1265@slko.co.kr','lsm713@slko.co.kr')
)
SELECT 'noop';  -- 아래 개별 UPDATE 는 위 employee id 목록으로 실행됨(기록용 요약)
-- training_progress / chapter_results / exam_results / xp_transactions / user_gamification /
-- employee_streaks / quest_completions / point_transactions / store_redemptions /
-- basic_task_logs / employee_profiles / beta_feedback : SET company_id=SLCO WHERE employee_id IN (위 3명)
-- praise_logs : SET company_id=SLCO WHERE from_employee_id IN (3명) OR to_employee_id IN (3명)
COMMIT;

-- ── 2) Kiwooza 지점들을 branch_teams 에 백필 (가입 페이지가 anon 으로 읽는 유일한 소스) ──
--    회사별 지점 드롭다운이 브랜드별로 분리되도록. SLCO 는 이미 '본사' 행 존재.
INSERT INTO branch_teams (branch, team, company_id)
SELECT DISTINCT e.branch, NULL::text, e.company_id
FROM employees e
WHERE e.company_id='dae1afc8-55cb-476e-8099-07ef41e4452d'
  AND COALESCE(e.branch,'') <> ''
  AND NOT EXISTS (
    SELECT 1 FROM branch_teams bt
    WHERE bt.company_id=e.company_id AND bt.branch=e.branch
  );

-- 결과(적용 후): Kiwooza 14명 / SLCO 4명 · branch_teams 가 회사별로 분리(본사가 회사별 별도 행).
