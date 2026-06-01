// 실전 검증: SupabaseMode 의 저장 경로가 라이브 DB 스키마/RLS 와 일치하는지.
//   1) saveBranchTeamsToSupabase — 각 행에 company_id 주입 + 삭제를 현재 회사로 스코프
//      (branch_teams_modify_company RLS: company_id = auth_company_id() 거부 방지)
//   2) saveSop — status 가 라이브 CHECK ('draft','published') 밖이면 'draft' 로 클램프
//      (status='archived'/'generated' 가 upsert 를 통째로 실패시키던 문제 방지)
// supabase-client.js 를 vm 에 올려 진짜 SupabaseMode 메서드를 호출한다.
const fs = require('fs');
const vm = require('vm');
const path = require('path');

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name}${extra !== undefined ? '  → ' + JSON.stringify(extra) : ''}`); }
}

// ---- mock Supabase 클라이언트: 모든 연산을 log 에 기록, 항상 성공 응답 ----
function makeMockClient(log) {
  const okResp = () => Promise.resolve({ data: [], error: null });
  return {
    from(table) {
      return {
        delete() {
          return {
            eq(col, val) { log.push({ op: 'delete', table, filter: { kind: 'eq', col, val } }); return okResp(); },
            neq(col, val) { log.push({ op: 'delete', table, filter: { kind: 'neq', col, val } }); return okResp(); },
          };
        },
        insert(rows) { log.push({ op: 'insert', table, rows }); return okResp(); },
        upsert(row, opts) { log.push({ op: 'upsert', table, row, opts }); return okResp(); },
      };
    },
  };
}

// ---- supabase-client.js 를 sandbox 에 로드하고 SupabaseMode 를 반환 ----
function loadSupabaseMode(activeCompanyId) {
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'supabase-client.js'), 'utf8')
    + '\n;globalThis.__exp = { SupabaseMode };';
  const win = { __activeCompanyId: activeCompanyId };
  const sandbox = {
    CONFIG: { SUPABASE_URL: 'https://x.supabase.co', SUPABASE_ANON_KEY: 'k' },
    window: win,
    createClient: () => ({}),
    console: { log: () => {}, warn: () => {}, error: () => {} },
    Date, JSON, Math, Promise, Array, Object, String, Number,
    setTimeout: (fn) => fn(),
    globalThis: {},
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox, { filename: 'supabase-client.js' });
  const SM = sandbox.__exp.SupabaseMode;
  const log = [];
  SM._ready = true;
  SM._client = makeMockClient(log);
  SM._retry = (fn) => fn();        // 백오프 없이 통과
  return { SM, log, win };
}

(async () => {
  // ================= TEST 1: branch_teams — 회사 admin (companyId 있음) =================
  console.log('=== TEST 1: saveBranchTeamsToSupabase — 회사 admin (company_id 주입) ===');
  {
    const { SM, log } = loadSupabaseMode('company-AAA');
    await SM.saveBranchTeamsToSupabase(['강남점', '판교점'], { '강남점': ['홀', '주방'], '판교점': [] });

    const del = log.find(e => e.op === 'delete');
    const ins = log.find(e => e.op === 'insert');
    ok('삭제가 현재 회사로 스코프됨 (eq company_id)', del && del.filter.kind === 'eq' && del.filter.col === 'company_id' && del.filter.val === 'company-AAA', del && del.filter);
    ok('insert 호출됨', !!ins, log.map(e => e.op));
    const rows = ins ? ins.rows : [];
    ok('모든 행에 company_id 주입됨', rows.length > 0 && rows.every(r => r.company_id === 'company-AAA'), rows);
    ok('강남점 홀/주방 2행 + 판교점 1행 = 3행', rows.length === 3, rows.length);
    const pangyo = rows.find(r => r.branch === '판교점');
    ok('팀 없는 지점은 team=null 행으로 표현', pangyo && pangyo.team === null, pangyo);
    ok('회귀: 한국어 지점명 보존', rows.some(r => r.branch === '강남점'), rows.map(r => r.branch));
  }

  // ================= TEST 2: branch_teams — super_admin 전체선택 (companyId 없음) =================
  console.log('\n=== TEST 2: saveBranchTeamsToSupabase — super_admin 전체선택 (company_id 없음) ===');
  {
    const { SM, log } = loadSupabaseMode(undefined);
    await SM.saveBranchTeamsToSupabase(['본사'], { '본사': ['관리팀'] });
    const del = log.find(e => e.op === 'delete');
    const ins = log.find(e => e.op === 'insert');
    ok('companyId 없으면 전체 삭제(neq id) — 종전 동작 유지', del && del.filter.kind === 'neq', del && del.filter);
    ok('행 company_id 는 null (super_admin RLS 통과)', ins && ins.rows.every(r => r.company_id === null), ins && ins.rows);
  }

  // ================= TEST 3: branch_teams — 빈 입력 방어 =================
  console.log('\n=== TEST 3: saveBranchTeamsToSupabase — 빈 지점 목록 ===');
  {
    const { SM, log } = loadSupabaseMode('company-BBB');
    await SM.saveBranchTeamsToSupabase([], {});
    const ins = log.find(e => e.op === 'insert');
    ok('지점 0개면 insert 안 함(크래시 없음)', !ins, log.map(e => e.op));
  }

  // ================= TEST 4~6: saveSop status 클램프 =================
  console.log('\n=== TEST 4~6: saveSop — status 가 라이브 CHECK(draft/published) 와 일치 ===');
  async function savedStatusOf(inputStatus) {
    const { SM, log } = loadSupabaseMode('company-CCC');
    await SM.saveSop({ id: 's1', title: 'T', content: '내용', status: inputStatus, script: null });
    const up = log.find(e => e.op === 'upsert' && e.table === 'sop_documents');
    return up ? up.row.status : '(no-upsert)';
  }
  ok("status='archived' → 'draft' 로 클램프 (DB 거부 방지)", (await savedStatusOf('archived')) === 'draft');
  ok("status='generated' → 'draft' 로 클램프", (await savedStatusOf('generated')) === 'draft');
  ok("status='published' → 'published' 유지", (await savedStatusOf('published')) === 'published');
  ok("status='draft' → 'draft' 유지", (await savedStatusOf('draft')) === 'draft');
  ok("status 없음 → 'draft' 기본값", (await savedStatusOf(undefined)) === 'draft');

  // saveSop 가 라이브 DB 에 없는 컬럼(content_en)을 보내지 않는지 — 보내면 upsert 전체 실패
  console.log('\n=== TEST 7: saveSop — 라이브 스키마에 없는 컬럼 미전송 ===');
  {
    const { SM, log } = loadSupabaseMode('company-CCC');
    await SM.saveSop({ id: 's2', title: 'T', title_en: 'E', content: 'c', content_vn: 'v', status: 'published', script: null });
    const up = log.find(e => e.op === 'upsert' && e.table === 'sop_documents');
    ok('upsert row 에 content_en 키 없음 (라이브 DB 미존재 컬럼)', up && !('content_en' in up.row), up && Object.keys(up.row));
    ok('title_en / content_vn 은 정상 전송 (라이브 DB 존재)', up && up.row.title_en === 'E' && up.row.content_vn === 'v', up && up.row);
  }

  console.log(`\n===== 결과: ${pass} 통과 / ${fail} 실패 =====`);
  process.exit(fail === 0 ? 0 : 1);
})();
