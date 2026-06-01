// 회귀 가드: HTML 인라인 JS 의 회사-스코프 쓰기 경로가 company_id 를 주입하는지
// 정적으로 검증한다. (이 테이블들은 RLS company_isolation/*_company 정책으로
//  WITH CHECK (auth_is_super_admin() OR company_id = auth_company_id()) 를 강제하므로
//  company_id 없이 insert/upsert 하면 일반 직원의 저장이 조용히 거부된다.)
//
// 인라인 JS 는 vm 단위테스트가 어려워, 해당 insert/upsert 페이로드 블록 안에
// company_id 키가 존재하는지 문자열 수준으로 확인한다(실수로 제거되는 것 방지).
const fs = require('fs');
const path = require('path');

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name}${extra !== undefined ? '  → ' + JSON.stringify(extra) : ''}`); }
}

function read(f) { return fs.readFileSync(path.join(__dirname, '..', f), 'utf8'); }

// from('<table>') 이후 첫 .insert({ 또는 .upsert({ 의 객체 리터럴 본문을 대략 추출
function payloadAfter(src, tableMarker) {
  const i = src.indexOf(tableMarker);
  if (i < 0) return null;
  const rest = src.slice(i);
  const m = rest.match(/\.(insert|upsert)\(\{/);
  if (!m) return null;
  const start = rest.indexOf(m[0]) + m[0].length;
  // 중괄호 균형으로 객체 끝 찾기
  let depth = 1, j = start;
  while (j < rest.length && depth > 0) {
    const ch = rest[j];
    if (ch === '{') depth++;
    else if (ch === '}') depth--;
    j++;
  }
  return rest.slice(start, j - 1);
}

// 직원-facing: 로그인 직원 본인 회사(_currentCompanyId) 로 해석
const EMPLOYEE_CASES = [
  { file: 'profile.html',    marker: "from('employee_profiles').upsert({", table: 'employee_profiles' },
  { file: 'store.html',      marker: "from('store_redemptions').insert({", table: 'store_redemptions' },
  { file: 'team-tasks.html', marker: "from('team_tasks')",                 table: 'team_tasks' },
];
// admin-facing: 관리 대상 회사(window.__activeCompanyId) 로 해석
const ADMIN_CASES = [
  { marker: "from('invitations').insert({", table: 'invitations' },
  { marker: "from('deadlines').insert({",   table: 'deadlines' },
  { marker: "from('store_items').insert({", table: 'store_items' },
  { marker: "from('quests').insert({",      table: 'quests' },
];

console.log('=== 직원-facing 회사-스코프 쓰기 — _currentCompanyId() 주입 ===');
for (const c of EMPLOYEE_CASES) {
  const src = read(c.file);
  const body = payloadAfter(src, c.marker);
  ok(`${c.file}: ${c.table} insert/upsert 블록 발견`, body !== null, c.marker);
  ok(`${c.file}: ${c.table} 페이로드에 company_id 포함 (RLS 통과)`,
     body !== null && /company_id\s*:/.test(body),
     body !== null ? body.replace(/\s+/g, ' ').slice(0, 160) : null);
  ok(`${c.file}: company_id 가 _currentCompanyId() 로 해석됨`,
     body !== null && /company_id\s*:\s*SupabaseMode\._currentCompanyId\(\)/.test(body),
     body !== null ? body.replace(/\s+/g, ' ').slice(0, 160) : null);
}

console.log('\n=== admin 회사-스코프 쓰기 — window.__activeCompanyId 주입 ===');
{
  const adminSrc = read('admin/index.html');
  for (const c of ADMIN_CASES) {
    const body = payloadAfter(adminSrc, c.marker);
    ok(`admin: ${c.table} insert 블록 발견`, body !== null, c.marker);
    ok(`admin: ${c.table} 페이로드에 company_id=window.__activeCompanyId 주입`,
       body !== null && /company_id\s*:\s*window\.__activeCompanyId/.test(body),
       body !== null ? body.replace(/\s+/g, ' ').slice(0, 160) : null);
  }
  // basic_task_templates 는 변수 payload 라 직접 인접 검증
  ok('admin: basic_task_templates payload 에 company_id=window.__activeCompanyId 주입',
     /is_active:\s*true,\s*company_id:\s*window\.__activeCompanyId/.test(adminSrc));
}

// supabase-client.js 의 진행률 저장 경로도 같은 가드 (behavioral 테스트와 별개의 이중 안전망)
console.log('\n=== supabase-client.js 진행률 저장 — company_id 주입 정적 검증 ===');
{
  const sc = read('js/supabase-client.js');
  for (const table of ['training_progress', 'chapter_results']) {
    const body = payloadAfter(sc, `from('${table}')`);
    ok(`supabase-client.js: ${table} upsert 에 company_id 포함`,
       body !== null && /company_id\s*:/.test(body),
       body !== null ? body.replace(/\s+/g, ' ').slice(0, 160) : null);
  }
  ok('supabase-client.js: _currentCompanyId 헬퍼 정의 존재',
     /_currentCompanyId\s*\(\)\s*\{/.test(sc));
}

console.log(`\n===== 결과: ${pass} 통과 / ${fail} 실패 =====`);
process.exit(fail === 0 ? 0 : 1);
