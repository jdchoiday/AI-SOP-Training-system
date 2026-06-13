// 회귀 가드: super_admin 의 학습앱 브랜드 스코프
// ----------------------------------------------------------------------------
// 사고: super_admin(company_id NULL)이 직원 학습앱(app/tasks/chapter)에 로그인하면
//   _currentCompanyId()=null → syncSops 가 회사 필터 없이 전 브랜드 SOP 를 끌어와,
//   한 브랜드(예: Kiwooza)를 테스트할 때 타 브랜드(SLKO) 코스가 목록에 섞여 보였다.
// 규칙: 회사를 추정하지 말 것. super_admin 은 로그인 시 명시적으로 고른 브랜드(sop_brand)
//   만 유효 회사로 사용한다. 일반 직원은 항상 본인 company_id 가 우선한다.
// 이 테스트는 실제 SupabaseMode 를 vm 으로 로드해 _currentCompanyId / applyCompanyScope
// 동작을 검증한다(문자열 검사가 아닌 실동작).

const fs = require('fs');
const path = require('path');
const vm = require('vm');

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name}${extra !== undefined ? '  → ' + JSON.stringify(extra) : ''}`); }
}

const KIWOOZA = 'dae1afc8-55cb-476e-8099-07ef41e4452d';
const SLKO = 'f7b86b4d-9a43-486d-8d07-6ba812cd4ef7';

// --- 가짜 localStorage ---
function makeLS(initial) {
  const store = Object.assign({}, initial);
  return {
    getItem: k => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: k => { delete store[k]; },
    _dump: () => store,
  };
}

// --- SupabaseMode 를 격리 컨텍스트에 로드 ---
function loadSM(localStorage, win) {
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'supabase-client.js'), 'utf8');
  const sandbox = {
    CONFIG: { SUPABASE_URL: 'https://x.supabase.co', SUPABASE_ANON_KEY: 'k' },
    localStorage,
    window: win || {},
    document: {},
    console: { log() {}, warn() {}, error() {} },
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  // 최상위 const SupabaseMode 를 캡처
  vm.runInContext(src + '\n;globalThis.__SM = SupabaseMode;', sandbox);
  return sandbox.__SM;
}

console.log('=== _currentCompanyId(): super_admin 브랜드 스코프 ===');

// 1) super_admin + sop_brand=Kiwooza → Kiwooza 로 스코프
{
  const ls = makeLS({ sop_user: JSON.stringify({ role: 'super_admin', company_id: null }), sop_brand: KIWOOZA });
  const SM = loadSM(ls);
  ok('super_admin + sop_brand(Kiwooza) → Kiwooza', SM._currentCompanyId() === KIWOOZA, SM._currentCompanyId());
}

// 2) super_admin, 브랜드 미선택 → null (전체 보기, 추정 안 함)
{
  const ls = makeLS({ sop_user: JSON.stringify({ role: 'super_admin', company_id: null }) });
  const SM = loadSM(ls);
  ok('super_admin + 브랜드 미선택 → null', SM._currentCompanyId() === null, SM._currentCompanyId());
}

// 3) 🔒 실제 직원은 본인 회사가 우선 — sop_brand(SLKO) 가 있어도 무시
{
  const ls = makeLS({ sop_user: JSON.stringify({ role: 'staff', company_id: KIWOOZA }), sop_brand: SLKO });
  const SM = loadSM(ls);
  ok('🔒 Kiwooza 직원은 sop_brand(SLKO) 무시하고 Kiwooza', SM._currentCompanyId() === KIWOOZA, SM._currentCompanyId());
}

// 4) sop_active_company 가 sop_brand 보다 우선(applyCompanyScope 가 확정한 값)
{
  const ls = makeLS({ sop_user: JSON.stringify({ role: 'super_admin', company_id: null }), sop_active_company: SLKO, sop_brand: KIWOOZA });
  const SM = loadSM(ls);
  ok('super_admin: sop_active_company(SLKO) 우선', SM._currentCompanyId() === SLKO, SM._currentCompanyId());
}

// 5) 🔒 super_admin 이 아닌 계정엔 sop_brand 스코프가 새지 않음(방어적)
{
  const ls = makeLS({ sop_user: JSON.stringify({ role: 'staff', company_id: null }), sop_brand: SLKO });
  const SM = loadSM(ls);
  ok('🔒 비-super_admin + null company 는 sop_brand 무시', SM._currentCompanyId() === null, SM._currentCompanyId());
}

// 6) 관리자 페이지: window.__activeCompanyId 가 super_admin 선택보다 우선
{
  const ls = makeLS({ sop_user: JSON.stringify({ role: 'super_admin', company_id: null }), sop_brand: KIWOOZA });
  const SM = loadSM(ls, { __activeCompanyId: SLKO });
  ok('admin 컨텍스트: __activeCompanyId(SLKO) 우선', SM._currentCompanyId() === SLKO, SM._currentCompanyId());
}

console.log('\n=== applyCompanyScope(): super_admin 브랜드 전환 시 캐시 purge ===');

// 7) super_admin 이 SLKO→Kiwooza 로 바꾸면 회사-스코프 캐시 비움 + active 갱신
{
  const ls = makeLS({ sop_active_company: SLKO, sop_brand: KIWOOZA, sop_documents: '[{"id":"slko-picnic"}]', sop_progress_v2: '{"x":1}' });
  const SM = loadSM(ls);
  SM.applyCompanyScope({ role: 'super_admin', company_id: null });
  ok('브랜드 전환 → sop_documents 캐시 purge', ls.getItem('sop_documents') === null, ls._dump());
  ok('브랜드 전환 → sop_active_company=Kiwooza 로 갱신', ls.getItem('sop_active_company') === KIWOOZA, ls.getItem('sop_active_company'));
}

// 8) 같은 브랜드면 purge 하지 않음(불필요한 캐시 손실 방지)
{
  const ls = makeLS({ sop_active_company: KIWOOZA, sop_brand: KIWOOZA, sop_documents: '[{"id":"keep"}]' });
  const SM = loadSM(ls);
  SM.applyCompanyScope({ role: 'super_admin', company_id: null });
  ok('동일 브랜드 → 캐시 보존', ls.getItem('sop_documents') === '[{"id":"keep"}]', ls.getItem('sop_documents'));
}

// 9) 🔒 일반 직원 브랜드 전환(Kiwooza→SLKO)도 여전히 purge (기존 RC4 보호 유지)
{
  const ls = makeLS({ sop_active_company: KIWOOZA, sop_documents: '[{"id":"kw"}]' });
  const SM = loadSM(ls);
  SM.applyCompanyScope({ role: 'staff', company_id: SLKO });
  ok('🔒 직원 브랜드 전환 → purge 유지', ls.getItem('sop_documents') === null && ls.getItem('sop_active_company') === SLKO, ls._dump());
}

console.log(`\n===== 결과: ${pass} 통과 / ${fail} 실패 =====`);
process.exit(fail === 0 ? 0 : 1);
