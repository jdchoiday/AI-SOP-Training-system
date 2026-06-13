-- 2026-06-13 · 초대 전용 온보딩 (브랜드 격리 강화)
-- ----------------------------------------------------------------------------
-- 배경: 신규 직원 가입에서 "브랜드 자유선택"이 브랜드 오배정의 원천이었다(RC1).
--       이제 가입은 초대 전용(register.html INVITE_ONLY)이며, 서버(api/auth.js)가
--       자가가입에 유효한 invite_code 를 강제하고 회사(company_id)를 초대장에서만
--       서버측으로 결정한다(클라이언트가 보낸 company_id 는 자가가입에서 무시).
--
-- 코드/UI 변경은 앱 배포(Vercel)로 반영된다. 이 파일은 "브랜드별 공용 초대링크"를
-- 라이브 DB 에 만드는 데이터 변경만 담는다. 멱등(ON CONFLICT DO NOTHING)이라 재실행 안전.
--
-- 공용 초대링크 = 지점 미지정(branch='') 다회용 장기 초대. 회사(브랜드)만 고정하고
-- 지점/팀은 직원이 가입 시 회사 범위 안에서 직접 고른다. RLS 격리는 그대로 유지된다.
-- ----------------------------------------------------------------------------

-- Kiwooza Vietnam (지점 6개 — 직원이 가입 시 지점 선택)
insert into public.invitations (code, company_id, branch, team, max_uses, used_count, expires_at)
values ('INV-KIWOOZA-JOIN', 'dae1afc8-55cb-476e-8099-07ef41e4452d', '', '', 500, 0, '2027-06-13T00:00:00Z')
on conflict (code) do nothing;

-- SLKO (현재 지점은 본사뿐 — 단일 지점이면 가입 화면에서 자동 선택)
insert into public.invitations (code, company_id, branch, team, max_uses, used_count, expires_at)
values ('INV-SLKO-JOIN', 'f7b86b4d-9a43-486d-8d07-6ba812cd4ef7', '', '', 500, 0, '2027-06-13T00:00:00Z')
on conflict (code) do nothing;

-- 기존 INV-SLKO2026(지점=본사 고정)은 그대로 유효하다. 위 공용 링크와 병행 사용 가능.

-- 검증: 브랜드별 활성 초대 확인
-- select c.name, i.code, i.branch, i.max_uses, i.used_count, i.expires_at
-- from public.invitations i join public.companies c on c.id = i.company_id
-- order by c.name, i.code;
