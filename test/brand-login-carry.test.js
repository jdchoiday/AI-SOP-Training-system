// 실전 검증(테넌트 격리 · UX 결선): 초대링크 → 로그인 브랜드 이어주기.
// 초대링크(register.html?code=…)에서 "이미 계정 있음"으로 넘어갈 때, 그 초대장의 브랜드가
// 로그인 화면(index.html)까지 이어져 칩이 사전선택돼야 한다(회사 재선택 불필요).
// 격리 원칙은 유지: 이건 "로그인 화면 브랜드 칩의 사전선택"일 뿐이고, 회사는 여전히 초대장
// (selectedCompanyId)에서만 오며 절대 추정하지 않는다. 일반 직원은 로그인 후 본인 company_id 가 우선.
//
// 코드가 리팩터되어도 이 결선이 사라지지 않도록 문자열 수준으로 가드한다.
const fs = require('fs');
const path = require('path');

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name}${extra !== undefined ? '  → ' + JSON.stringify(extra) : ''}`); }
}
function read(f) { return fs.readFileSync(path.join(__dirname, '..', f), 'utf8'); }

const register = read('register.html');
const index = read('index.html');

console.log('=== register.html: 초대 브랜드를 로그인 링크로 실어 보낸다 ===');

// 로그인 링크 3개(앵커)가 존재해야 결선이 의미를 가진다.
ok('로그인 링크 id=goLoginBtn 존재', register.includes('id="goLoginBtn"'));
ok('로그인 링크 id=loginBtn 존재', register.includes('id="loginBtn"'));
ok('로그인 링크 id=alreadyHaveAccount 존재', register.includes('id="alreadyHaveAccount"'));

// 헬퍼 정의 + 세 링크 모두를 대상으로 한다.
ok('setLoginLinksBrand 정의됨', register.includes('function setLoginLinksBrand('));
ok('세 로그인 링크를 모두 갱신',
   /setLoginLinksBrand[\s\S]*goLoginBtn[\s\S]*loginBtn[\s\S]*alreadyHaveAccount/.test(register));
ok('링크에 ?brand= 로 브랜드를 싣는다', register.includes('index.html?brand='));
ok('🔒 브랜드는 companyId(초대장 값)에서만 — 추정 금지',
   register.includes('encodeURIComponent(companyId)'));

// 초대 로드 시 실제로 호출 + sop_brand 저장(= 칩 사전선택의 근거).
ok('초대 로드 시 setLoginLinksBrand 호출', register.includes('setLoginLinksBrand(selectedCompanyId)'));
ok("초대 브랜드를 sop_brand 로 저장", register.includes("localStorage.setItem('sop_brand', selectedCompanyId)"));
ok('🔒 회사 값은 invite.company_id 에서만 결정',
   register.includes('selectedCompanyId = invite.company_id'));

console.log('\n=== index.html: ?brand= 를 읽어 브랜드 칩을 사전선택 ===');

ok('?brand= 파라미터를 읽는다',
   /URLSearchParams\(location\.search\)\.get\(['"]brand['"]\)/.test(index));
ok('읽은 브랜드를 _selectedBrand 로 사전선택', /_selectedBrand\s*=\s*_qsBrand/.test(index));
ok('읽은 브랜드를 sop_brand 로 저장', index.includes("localStorage.setItem('sop_brand', _qsBrand)"));
// 칩 하이라이트는 _selectedBrand 기준(기존 로직 유지) — 사전선택이 화면에 반영되는 경로.
ok('칩 하이라이트가 _selectedBrand 기준', /c\.id\s*===\s*_selectedBrand/.test(index));

console.log(`\n===== 결과: ${pass} 통과 / ${fail} 실패 =====`);
process.exit(fail === 0 ? 0 : 1);
