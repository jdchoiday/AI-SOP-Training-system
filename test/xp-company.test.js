// 실전 검증: 게이미피케이션 쓰기(xp_transactions / user_gamification / praise_logs /
// employee_streaks)가 각 행에 로그인 직원 company_id 를 주입하는지.
//
// 라이브 DB 에서 위 테이블은 모두 RLS company_isolation 정책으로
//   WITH CHECK (auth_is_super_admin() OR company_id = auth_company_id())
// 를 강제한다. company_id 없이 insert/upsert 하면 NULL = <uuid> → 거부되어
// 일반 직원의 XP·칭찬·스트릭이 클라우드에 조용히 저장되지 못한다(아래 DB 임퍼소네이션으로 확인됨:
//   WITHOUT company_id => 42501 row-level security 위반, WITH company_id => OK).
//
// xp-system.js 를 vm 에 올려 진짜 XpService/PraiseService/StreakService 를 호출하고,
// 체이너블 목 클라이언트가 받은 insert/upsert 페이로드를 검사한다.
const fs = require('fs');
const vm = require('vm');
const path = require('path');

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name}${extra !== undefined ? '  → ' + JSON.stringify(extra) : ''}`); }
}

// ---- 체이너블 목: 모든 쿼리빌더 메서드를 지원하고 insert/upsert 페이로드를 기록 ----
function makeMockSupabase(captured, companyId) {
  const singleData = { xp_transactions: null, user_gamification: null }; // 중복없음 / XP 0
  const listData = { praise_logs: [] };                                  // 오늘 칭찬 0
  function chain(table) {
    const c = {
      select() { return c; },
      eq() { return c; }, neq() { return c; }, gte() { return c; }, lte() { return c; },
      order() { return c; }, limit() { return c; },
      maybeSingle() { return Promise.resolve({ data: table in singleData ? singleData[table] : null, error: null }); },
      single() { return Promise.resolve({ data: table in singleData ? singleData[table] : null, error: null }); },
      insert(rows) { captured.push({ table, op: 'insert', rows }); return Promise.resolve({ data: null, error: null }); },
      upsert(row, opts) { captured.push({ table, op: 'upsert', row, opts }); return Promise.resolve({ data: null, error: null }); },
      update(row) { captured.push({ table, op: 'update', row }); return c; },
      delete() { return c; },
      // 체인 자체를 await 하면 select 결과(목록)로 resolve
      then(res, rej) { return Promise.resolve({ data: table in listData ? listData[table] : [], error: null }).then(res, rej); },
    };
    return c;
  }
  return {
    _ready: true,
    _currentCompanyId: () => companyId,
    _client: { from(table) { return chain(table); } },
  };
}

// ---- xp-system.js 를 sandbox 에 로드 ----
function loadXpSystem(companyId) {
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'xp-system.js'), 'utf8')
    + '\n;globalThis.__exp = { XpService, PraiseService, StreakService, XP_CONFIG };';
  const captured = [];
  const SupabaseMode = makeMockSupabase(captured, companyId);
  const store = {};
  const sandbox = {
    SupabaseMode,
    window: { SupabaseMode },
    localStorage: {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; },
    },
    console: { log: () => {}, warn: () => {}, error: () => {} },
    Date, JSON, Math, Promise, Array, Object, String, Number,
    setTimeout: (fn) => fn(),
    globalThis: {},
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox, { filename: 'xp-system.js' });
  const { XpService, PraiseService, StreakService } = sandbox.__exp;
  return { XpService, PraiseService, StreakService, captured };
}

(async () => {
  // ================= TEST 1: XpService.addXp =================
  console.log('=== TEST 1: XpService.addXp — xp_transactions / user_gamification 에 company_id 주입 ===');
  {
    const { XpService, captured } = loadXpSystem('company-INJECT');
    await XpService.addXp('emp-1', 50, 'chapter', 'ch-1', '챕터 완료');
    const xp = captured.find(e => e.table === 'xp_transactions' && e.op === 'insert');
    const ug = captured.find(e => e.table === 'user_gamification' && e.op === 'upsert');
    ok('xp_transactions insert 발생', !!xp, captured.map(e => e.table + ':' + e.op));
    ok('xp_transactions 에 company_id 주입 (RLS 통과)', xp && xp.rows.company_id === 'company-INJECT', xp && xp.rows);
    ok('xp_transactions 핵심필드 보존 (employee_id/amount/source/source_id)', xp && xp.rows.employee_id === 'emp-1' && xp.rows.amount === 50 && xp.rows.source === 'chapter' && xp.rows.source_id === 'ch-1', xp && xp.rows);
    ok('user_gamification upsert 에 company_id 주입', ug && ug.row.company_id === 'company-INJECT', ug && ug.row);
    ok("user_gamification onConflict='employee_id'", ug && ug.opts && ug.opts.onConflict === 'employee_id', ug && ug.opts);
  }

  // ================= TEST 2: XpService.recalculate =================
  console.log('\n=== TEST 2: XpService.recalculate — user_gamification 캐시에 company_id 주입 ===');
  {
    const { XpService, captured } = loadXpSystem('company-RC');
    await XpService.recalculate('emp-2');
    const ug = captured.find(e => e.table === 'user_gamification' && e.op === 'upsert');
    ok('user_gamification upsert 발생', !!ug, captured.map(e => e.table + ':' + e.op));
    ok('company_id 주입됨', ug && ug.row.company_id === 'company-RC', ug && ug.row);
  }

  // ================= TEST 3: PraiseService.sendPraise =================
  console.log('\n=== TEST 3: PraiseService.sendPraise — praise_logs + 발신자 XP 에 company_id 주입 ===');
  {
    const { PraiseService, captured } = loadXpSystem('company-PRAISE');
    const res = await PraiseService.sendPraise('from-1', 'to-1', 'teamwork', '수고했어요');
    ok('칭찬 성공 반환', res && res.success === true, res);
    const pl = captured.find(e => e.table === 'praise_logs' && e.op === 'insert');
    ok('praise_logs insert 발생', !!pl, captured.map(e => e.table + ':' + e.op));
    ok('praise_logs 에 company_id 주입 (발신자 회사)', pl && pl.rows.company_id === 'company-PRAISE', pl && pl.rows);
    ok('praise_logs 필드 보존 (from/to/category/reason)', pl && pl.rows.from_employee_id === 'from-1' && pl.rows.to_employee_id === 'to-1' && pl.rows.category === 'teamwork' && pl.rows.reason === '수고했어요', pl && pl.rows);
    const xp = captured.find(e => e.table === 'xp_transactions' && e.op === 'insert');
    ok('발신자 XP(xp_transactions)도 company_id 주입', xp && xp.rows.company_id === 'company-PRAISE', xp && xp.rows);
  }

  // ================= TEST 4: StreakService.checkIn =================
  console.log('\n=== TEST 4: StreakService.checkIn — employee_streaks 에 company_id 주입 ===');
  {
    const { StreakService, captured } = loadXpSystem('company-STREAK');
    StreakService.checkIn('emp-3'); // 동기 — upsert 즉시 호출
    const st = captured.find(e => e.table === 'employee_streaks' && e.op === 'upsert');
    ok('employee_streaks upsert 발생', !!st, captured.map(e => e.table + ':' + e.op));
    ok('company_id 주입됨', st && st.row.company_id === 'company-STREAK', st && st.row);
    ok("onConflict='employee_id'", st && st.opts && st.opts.onConflict === 'employee_id', st && st.opts);
  }

  // ================= TEST 5: company_id 없음 — null 전송, 크래시 없음 =================
  console.log('\n=== TEST 5: company_id 미해석 시 null 전송 (예외 없이 동작) ===');
  {
    const { XpService, captured } = loadXpSystem(null);
    await XpService.addXp('emp-4', 10, 'quiz', 'q-1', '');
    const xp = captured.find(e => e.table === 'xp_transactions' && e.op === 'insert');
    ok('company_id 없으면 null 로 전송', xp && xp.rows.company_id === null, xp && xp.rows);
  }

  console.log(`\n===== 결과: ${pass} 통과 / ${fail} 실패 =====`);
  process.exit(fail === 0 ? 0 : 1);
})();
