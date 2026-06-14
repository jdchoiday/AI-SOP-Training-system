// 실전 검증(테넌트 격리): 초대 전용 온보딩.
// 신규 직원의 회사(브랜드)는 반드시 "서버가 검증한 초대장"에서만 와야 한다. 클라이언트가 보낸
// company_id 를 신뢰하면, 과거 전 직원이 한 브랜드로 쏠려 남의 교육자료를 보던 사고(RC1)가 재발한다.
//
// 1) api/auth.js 의 순수 함수 resolveInviteRegistration 를 직접 import 해 결정 로직을 검증.
// 2) register.html / api/auth.js 의 핵심 결선이 유지되는지 문자열 수준으로 가드(실수 제거 방지).
const fs = require('fs');
const path = require('path');
const handler = require('../api/auth.js');
const resolve = handler.resolveInviteRegistration;

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name}${extra !== undefined ? '  → ' + JSON.stringify(extra) : ''}`); }
}
function read(f) { return fs.readFileSync(path.join(__dirname, '..', f), 'utf8'); }

const KIWOOZA = 'dae1afc8-55cb-476e-8099-07ef41e4452d';
const SLKO = 'f7b86b4d-9a43-486d-8d07-6ba812cd4ef7';
const NOW = new Date('2026-06-13T00:00:00Z');

console.log('=== resolveInviteRegistration (자가가입 초대 검증) ===');

ok('순수 함수가 export 됨', typeof resolve === 'function');

// ── 거부 케이스 ──
console.log('\n--- 거부: 초대가 없거나 무효하면 가입 불가 ---');
ok('🔒 초대 없음(null) 거부', resolve(null, { now: NOW }).ok === false);
ok('  사유 invite_not_found', resolve(null, { now: NOW }).reason === 'invite_not_found');
ok('🔒 회사 없는 초대 거부(격리 위반 방지)',
   resolve({ code: 'X', company_id: null, max_uses: 10, used_count: 0 }, { now: NOW }).ok === false);
ok('  사유 invite_missing_company',
   resolve({ code: 'X', company_id: '', max_uses: 10, used_count: 0 }, { now: NOW }).reason === 'invite_missing_company');
ok('🔒 소진된 초대 거부(used >= max)',
   resolve({ company_id: SLKO, max_uses: 5, used_count: 5 }, { now: NOW }).ok === false);
ok('  사유 invite_exhausted',
   resolve({ company_id: SLKO, max_uses: 5, used_count: 5 }, { now: NOW }).reason === 'invite_exhausted');
ok('🔒 만료된 초대 거부',
   resolve({ company_id: SLKO, max_uses: 50, used_count: 0, expires_at: '2026-06-12T00:00:00Z' }, { now: NOW }).ok === false);
ok('  사유 invite_expired',
   resolve({ company_id: SLKO, max_uses: 50, used_count: 0, expires_at: '2026-06-12T00:00:00Z' }, { now: NOW }).reason === 'invite_expired');

// ── 허용 케이스 + 회사(브랜드) 결정 ──
console.log('\n--- 허용: 회사는 초대장에서 결정된다 ---');
const r1 = resolve({ company_id: SLKO, branch: '본사', team: '', max_uses: 50, used_count: 1, expires_at: '2026-08-09T00:00:00Z' }, { now: NOW });
ok('유효 초대 허용', r1.ok === true);
ok('  company_id 가 초대장 값(SLKO)으로 결정', r1.company_id === SLKO, r1);
ok('  지점-고정 초대는 branch 통과(본사)', r1.branch === '본사');

const r2 = resolve({ company_id: KIWOOZA, branch: '', team: '', max_uses: 200, used_count: 7 }, { now: NOW });
ok('브랜드-레벨 초대(지점 미지정) 허용', r2.ok === true);
ok('  company_id = KIWOOZA 고정', r2.company_id === KIWOOZA);
ok('  branch 는 빈 값(가입 시 사용자 선택)', r2.branch === '');

ok('만료일 없으면(null) 통과',
   resolve({ company_id: SLKO, max_uses: 50, used_count: 0, expires_at: null }, { now: NOW }).ok === true);
ok('미래 만료일이면 통과',
   resolve({ company_id: SLKO, max_uses: 50, used_count: 0, expires_at: '2027-01-01T00:00:00Z' }, { now: NOW }).ok === true);
ok('max_uses 가 null 이면 무제한 허용',
   resolve({ company_id: SLKO, max_uses: null, used_count: 999 }, { now: NOW }).ok === true);
ok('used_count 가 null 이면 0 으로 취급',
   resolve({ company_id: SLKO, max_uses: 1, used_count: null }, { now: NOW }).ok === true);
ok('  ok 결과는 다음 증가용 used_count(0) 를 함께 반환',
   resolve({ company_id: SLKO, max_uses: 1, used_count: null }, { now: NOW }).used_count === 0);

// ── 정적 가드: 서버가 자가가입에 초대를 강제하고, 회사를 초대장에서 가져오는지 ──
console.log('\n=== api/auth.js 결선 가드 ===');
{
  const src = read('api/auth.js');
  ok('자가가입은 invite_code 없으면 거부', /invite required for self-registration/.test(src));
  ok('회사(company_id)를 검증된 초대에서 가져옴', /finalCompanyId\s*=\s*inv\.company_id/.test(src));
  ok('초대 검증에 resolveInviteRegistration 사용', /resolveInviteRegistration\(\s*inviteRow/.test(src));
  ok('인증된 관리자만 초대 없이 추가 가능(isAdminCaller)', /isAdminCaller/.test(src));
  ok('초대 사용횟수는 서버가 PATCH(used_count) 로 증가', /method:\s*'PATCH'[\s\S]{0,400}used_count/.test(src));
  ok('super_admin 외 회사 누락 시 거부(테넌트 가드)', /company_id required \(no brand resolved\)/.test(src));
}

console.log('\n=== register.html 결선 가드 ===');
{
  const reg = read('register.html');
  ok('INVITE_ONLY 스위치 존재', /const\s+INVITE_ONLY\s*=\s*true/.test(reg));
  ok('코드 없이 들어오면 가입 차단(showNeedInvite)', /if\s*\(\s*INVITE_ONLY\s*\)\s*\{[\s\S]{0,80}showNeedInvite\(\)/.test(reg));
  ok('서버에 invite_code 전달', /invite_code:\s*currentInvite\s*\?\s*currentInvite\.code/.test(reg));
  ok('🔒 클라이언트측 used_count 증가 제거됨(서버가 처리)', !/used_count:\s*currentInvite\.usedCount/.test(reg));
  ok('브랜드-레벨 초대 지점 선택기 존재(initInviteBranchPicker)', /initInviteBranchPicker/.test(reg));
  ok('코드 없는 "초대 필요" 화면에선 "다시 시도"(새로고침) 버튼 숨김',
     /function showNeedInvite\(\)[\s\S]{0,900}getElementById\(['"]retryBtn['"]\)[\s\S]{0,120}display\s*=\s*['"]none['"]/.test(reg));
}

console.log(`\n===== 결과: ${pass} 통과 / ${fail} 실패 =====`);
process.exit(fail === 0 ? 0 : 1);
