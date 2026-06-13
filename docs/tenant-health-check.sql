-- ============================================================
-- 테넌트(브랜드) 건강검진 — 브랜드 격리가 깨지지 않았는지 점검
-- 사용: Supabase SQL 또는 MCP execute_sql 로 실행. "브랜드 점검해줘" 트리거.
-- 기대값: (1) 모든 0  /  (2)(3) 브랜드별 수치가 상식적  /  (4) 도메인-브랜드 눈으로 확인
-- ============================================================

-- (1) 위반 검사 — 전부 0 이어야 정상 -------------------------------------------
SELECT 'employees_null_company_nonsuper' AS check, count(*) AS n   -- super_admin 외 브랜드 없는 직원
  FROM employees WHERE company_id IS NULL AND COALESCE(role,'') <> 'super_admin'
UNION ALL
SELECT 'sop_documents_null_company', count(*)
  FROM sop_documents WHERE company_id IS NULL
UNION ALL
SELECT 'invitations_null_company', count(*)
  FROM invitations WHERE company_id IS NULL
UNION ALL
SELECT 'branch_teams_null_company', count(*)
  FROM branch_teams WHERE company_id IS NULL;

-- (2) 브랜드별 규모 — 인원/SOP/초대장/지점 ------------------------------------
SELECT c.name AS brand,
       (SELECT count(*) FROM employees     e  WHERE e.company_id  = c.id) AS employees,
       (SELECT count(*) FROM sop_documents s  WHERE s.company_id  = c.id) AS sops,
       (SELECT count(*) FROM invitations   i  WHERE i.company_id  = c.id) AS invites,
       (SELECT count(DISTINCT bt.branch) FROM branch_teams bt WHERE bt.company_id = c.id) AS branches
  FROM companies c
 ORDER BY c.name;

-- (3) 브랜드별 직원 이메일 — 도메인이 브랜드와 어긋나는 사람을 눈으로 확인 --------
--     (예: visitplayz/slko.co.kr 계정이 Kiwooza 에 섞여 있던 사고 패턴)
SELECT c.name AS brand, e.email, e.name, e.role, e.branch
  FROM employees e JOIN companies c ON c.id = e.company_id
 ORDER BY c.name, e.email;
