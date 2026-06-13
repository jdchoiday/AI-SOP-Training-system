-- 2026-06-13 · 브랜드 표기 통일: SLCO → SLKO  (실 도메인 slko.co.kr 기준, 오타 SLCO 정리)
-- 라이브 DB(project xbcdzkrhtjgxdwfqqugc)에 트랜잭션으로 1회 실행 완료.
-- 회사 company_id = f7b86b4d-9a43-486d-8d07-6ba812cd4ef7 (UUID 불변 — 키는 그대로, 표기만 변경).
-- repo 콘텐츠 디렉터리도 content/slco → content/slko 로 이동(이미지경로와 일치시킴).
-- 범위: 회사명/슬러그 · 코스 문서 id·parent·이미지경로 · 시험결과 chapter_id · 초대코드 · 테스트계정.

BEGIN;
-- 1) 브랜드명/슬러그
UPDATE companies SET name='SLKO', slug='slko'
 WHERE id='f7b86b4d-9a43-486d-8d07-6ba812cd4ef7';

-- 2) 코스 문서(slco-picnic, slco-picnic-01..10): parent_id → 이미지경로 → id
--    sop_documents 에 자기참조 FK 없음(PK + company_id FK + status CHECK 뿐) → 순서 무관.
UPDATE sop_documents SET parent_id = replace(parent_id,'slco-','slko-')
 WHERE parent_id ILIKE 'slco-%';
UPDATE sop_documents SET script = replace(script::text,'/content/slco/','/content/slko/')::jsonb
 WHERE script::text ILIKE '%/content/slco/%';
UPDATE sop_documents SET id = replace(id,'slco-','slko-')
 WHERE id ILIKE 'slco-%';

-- 3) 시험결과 chapter_id (slco-picnic → slko-picnic)
UPDATE chapter_results SET chapter_id = replace(chapter_id,'slco-','slko-')
 WHERE chapter_id ILIKE 'slco-%';

-- 4) 초대코드 INV-SLCO2026 → INV-SLKO2026
UPDATE invitations SET code = replace(code,'SLCO','SLKO') WHERE code ILIKE '%slco%';

-- 5) 테스트계정 이메일 slco-test@test.com → slko-test@test.com (employees + auth.users + auth.identities)
--    비밀번호도 함께 재설정(값은 운영 메모 참조 — 커밋에 평문 미포함).
UPDATE employees SET email='slko-test@test.com' WHERE email='slco-test@test.com';
UPDATE auth.users
   SET email='slko-test@test.com',
       -- encrypted_password = crypt('<신규 테스트 비밀번호>', gen_salt('bf')),
       raw_user_meta_data = jsonb_set(COALESCE(raw_user_meta_data,'{}'::jsonb),'{email}','"slko-test@test.com"'),
       updated_at = now()
 WHERE email='slco-test@test.com';
UPDATE auth.identities
   SET identity_data = jsonb_set(identity_data,'{email}','"slko-test@test.com"'),
       provider_id = CASE WHEN provider_id='slco-test@test.com' THEN 'slko-test@test.com' ELSE provider_id END
 WHERE identity_data->>'email'='slco-test@test.com';
COMMIT;

-- 검증(적용 후): 잔여 slco = 0 (companies/sop/chapter_results/invitations/employees/auth.users),
--   companies → 'SLKO'/'slko', 코스 slko-picnic* = 11, 이미지경로 = /content/slko/slime-picnic/*.
