// 실전 검증(보안): api/auth.js 의 권한상승 차단.
// register 엔드포인트는 service key(RLS 우회) + 공개(CORS *)이므로, 클라이언트가 보낸
// role 을 그대로 쓰면 자가가입자가 super_admin 계정을 만들 수 있다.
// authorizeRoleAssignment 순수 함수가 그 결정을 담당하므로 직접 import 해 검증한다.
const handler = require('../api/auth.js');
const authorize = handler.authorizeRoleAssignment;

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name}${extra !== undefined ? '  → ' + JSON.stringify(extra) : ''}`); }
}

console.log('=== api/auth.js authorizeRoleAssignment ===');

ok('순수 함수가 export 됨', typeof authorize === 'function');

// ── 핵심: 자가가입자(인증 토큰 없음, caller=null) ──
console.log('\n--- 자가가입자(caller=null): staff 만 허용 ---');
ok('staff 자가가입 허용', authorize(null, 'staff').ok === true);
ok('🔒 super_admin 자가부여 차단(권한상승)', authorize(null, 'super_admin').ok === false, authorize(null, 'super_admin'));
ok('🔒 admin 자가부여 차단', authorize(null, 'admin').ok === false, authorize(null, 'admin'));
ok('🔒 branch_manager 자가부여 차단', authorize(null, 'branch_manager').ok === false);
ok('차단 사유는 auth_required', authorize(null, 'admin').reason === 'auth_required');

// ── super_admin 관리자 ──
console.log('\n--- super_admin: 모든 role 부여 가능 ---');
ok('super_admin → super_admin 허용', authorize('super_admin', 'super_admin').ok === true);
ok('super_admin → admin 허용', authorize('super_admin', 'admin').ok === true);
ok('super_admin → staff 허용', authorize('super_admin', 'staff').ok === true);

// ── admin 관리자: super_admin 만 못 만든다 ──
console.log('\n--- admin: super_admin 생성만 차단 ---');
ok('admin → admin 허용', authorize('admin', 'admin').ok === true);
ok('admin → branch_manager 허용', authorize('admin', 'branch_manager').ok === true);
ok('admin → staff 허용', authorize('admin', 'staff').ok === true);
ok('🔒 admin → super_admin 차단', authorize('admin', 'super_admin').ok === false, authorize('admin', 'super_admin'));
ok('차단 사유 cannot_create_super_admin', authorize('admin', 'super_admin').reason === 'cannot_create_super_admin');

// ── 하위 권한자는 elevated 생성 불가 ──
console.log('\n--- branch_manager / staff: elevated 생성 불가 ---');
ok('🔒 branch_manager → admin 차단', authorize('branch_manager', 'admin').ok === false);
ok('branch_manager → staff 허용', authorize('branch_manager', 'staff').ok === true);
ok('🔒 staff → admin 차단', authorize('staff', 'admin').ok === false);

// ── 입력 방어 ──
console.log('\n--- 잘못된 role 방어 (CHECK 위반/주입 방지) ---');
ok('존재하지 않는 role 거부', authorize('super_admin', 'hacker').ok === false);
ok('거부 사유 invalid_role', authorize('super_admin', 'hacker').reason === 'invalid_role');
ok('빈 role 은 staff 로 안 떨어지고 거부(요청값 기준)', authorize(null, '').ok === false);

console.log(`\n===== 결과: ${pass} 통과 / ${fail} 실패 =====`);
process.exit(fail === 0 ? 0 : 1);
