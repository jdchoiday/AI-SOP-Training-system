// 실전 검증: SupabaseMode.syncSops 의 SOP 동기화 정책.
//   핵심 원칙 — 관리자가 업로드한 SOP 는 절대 누락하지 않는다.
//   - DB 에 있는 SOP 는 유지(로컬 script/quizzes 보강분 보존).
//   - DB 에 없는 로컬 전용 SOP 중
//       · 데모/샘플 시드(고정 ID) 또는 사용자 삭제(툼스톤) → 제거
//       · 그 외 사용자 업로드분 → 보존 + DB 로 복구 업로드(조용한 저장 실패 복구)
//   - 동기화 실패/빈결과면 localStorage 미변경(오프라인 보존).
//   - deleteSop 는 sop_deleted_ids 툼스톤을 남겨 복구 업로드가 삭제분을 되살리지 않게 한다.
// 배경: "DB 권위" 동기화가 DB 미존재 로컬 SOP 를 전량 삭제해, 저장 실패로 로컬에만
//       남아 있던 관리자 업로드 SOP 수십 개가 사라진 사고를 재발 방지한다.
const fs = require('fs');
const vm = require('vm');
const path = require('path');

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name}${extra !== undefined ? '  → ' + JSON.stringify(extra) : ''}`); }
}

// supabaseResult: { data, error } — from('sop_documents').select('*').order('order_num') 가 반환
// opts: { tombstones, adminContext } — sop_deleted_ids 시드 / 관리자 컨텍스트(복구 업로드 활성)
function loadSM(supabaseResult, localSops, opts = {}) {
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'supabase-client.js'), 'utf8')
    + '\n;globalThis.__exp = { SupabaseMode };';
  const store = {
    sop_documents: JSON.stringify(localSops || []),
    sop_deleted_ids: JSON.stringify(opts.tombstones || []),
  };
  const sandbox = {
    CONFIG: { SUPABASE_URL: 'https://x.supabase.co', SUPABASE_ANON_KEY: 'k' },
    // adminContext !== false 면 __activeCompanyId 설정 → 복구 업로드 경로 활성
    window: opts.adminContext === false ? {} : { __activeCompanyId: 'test-co' },
    localStorage: {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; },
    },
    createClient: () => ({}),
    console: { log: () => {}, warn: () => {}, error: () => {} },
    Date, JSON, Math, Promise, Array, Object, String, Number, Set,
    setTimeout: (fn) => fn(),
    globalThis: {},
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox, { filename: 'supabase-client.js' });
  const SM = sandbox.__exp.SupabaseMode;
  SM._ready = true;
  SM._retry = (fn) => fn();
  // 복구 업로드를 가로채 캡처 (실제 DB/세션 불필요)
  const uploaded = [];
  SM.saveAllSops = async (sops) => { (sops || []).forEach(s => uploaded.push(s)); };
  SM._client = {
    from() {
      return {
        select() { return { order() { return Promise.resolve(supabaseResult); } }; },
        delete() { return { eq() { return Promise.resolve({ error: null }); } }; },
      };
    },
  };
  const readStore = () => JSON.parse(store.sop_documents || '[]');
  const readTombstones = () => JSON.parse(store.sop_deleted_ids || '[]');
  return { SM, readStore, readTombstones, uploaded };
}

(async () => {
  const VN = { id: 'kwzvn-opening-shift', title: 'SOP Mở cửa đầu ca', content_vn: '...', status: 'published', order_num: 2 };
  // 관리자가 직접 업로드한 실제 SOP (타임스탬프 기반 ID) — DB 에는 아직 없음(저장 실패분)
  const USER_SOP = { id: 'sop-1776743049363-ewyb', title: 'SOP Trang trí tiệc', content_vn: 'nội dung', status: 'published', order_num: 8 };
  // 데모/샘플 시드 (고정 ID, 한국어) — 사용자 콘텐츠 아님
  const DEMO_KO = { id: 'sop-open', title: '매장 오픈 절차', content: '한국어 본문', status: 'published', order_num: 1 };

  // ===== TEST 1: 데모 시드 로컬 전용은 제거, DB SOP 는 유지 =====
  console.log('=== TEST 1: syncSops — 데모 시드(sop-open) 정리, 사용자 SOP 보존 ===');
  {
    const { SM, readStore, uploaded } = loadSM({ data: [VN], error: null }, [VN, USER_SOP, DEMO_KO]);
    await SM.syncSops();
    const ids = readStore().map(s => s.id);
    ok('DB 의 베트남어 SOP 는 유지', ids.includes('kwzvn-opening-shift'), ids);
    ok('데모 시드(sop-open) 는 제거됨', !ids.includes('sop-open'), ids);
    ok('데모 시드는 DB 로 업로드하지 않음', !uploaded.find(s => s.id === 'sop-open'), uploaded.map(s => s.id));
  }

  // ===== TEST 2: 사용자 업로드 SOP(로컬 전용)는 보존 + DB 복구 업로드 =====
  console.log('\n=== TEST 2: syncSops — 로컬 전용 사용자 SOP 보존 + 복구 업로드 (누락 금지) ===');
  {
    const { SM, readStore, uploaded } = loadSM({ data: [VN], error: null }, [VN, USER_SOP]);
    await SM.syncSops();
    const ids = readStore().map(s => s.id);
    ok('사용자 업로드 SOP 가 localStorage 에 보존됨', ids.includes('sop-1776743049363-ewyb'), ids);
    ok('DB + 로컬전용 합쳐 2개 유지', readStore().length === 2, readStore().length);
    ok('사용자 SOP 는 DB 로 복구 업로드 시도됨', !!uploaded.find(s => s.id === 'sop-1776743049363-ewyb'), uploaded.map(s => s.id));
  }

  // ===== TEST 3: 툼스톤(사용자 삭제) 로컬 전용은 부활하지 않음 =====
  console.log('\n=== TEST 3: syncSops — 삭제(툼스톤) 처리된 로컬 전용 SOP 는 제거/미업로드 ===');
  {
    const { SM, readStore, uploaded } = loadSM(
      { data: [VN], error: null }, [VN, USER_SOP], { tombstones: ['sop-1776743049363-ewyb'] });
    await SM.syncSops();
    const ids = readStore().map(s => s.id);
    ok('툼스톤 SOP 는 로컬에서 제거됨', !ids.includes('sop-1776743049363-ewyb'), ids);
    ok('툼스톤 SOP 는 DB 로 업로드되지 않음(부활 방지)', !uploaded.find(s => s.id === 'sop-1776743049363-ewyb'), uploaded.map(s => s.id));
  }

  // ===== TEST 4: DB SOP 의 로컬 script/quizzes 보강분 보존 =====
  console.log('\n=== TEST 4: syncSops — DB SOP 에 대한 로컬 script/quizzes 보강 보존 ===');
  {
    const dbRow = { id: 'kwzvn-opening-shift', title: 'SOP Mở cửa đầu ca', script: null, quizzes: null, order_num: 2 };
    const localRow = { id: 'kwzvn-opening-shift', title: 'old', script: [{ scene: 1, narration: 'xin chào' }], quizzes: [{ question: 'q' }] };
    const { SM, readStore } = loadSM({ data: [dbRow], error: null }, [localRow]);
    await SM.syncSops();
    const row = readStore().find(s => s.id === 'kwzvn-opening-shift');
    ok('DB 에 script 없으면 로컬 script 보존', row && Array.isArray(row.script) && row.script.length === 1, row && row.script);
    ok('DB 에 quizzes 없으면 로컬 quizzes 보존', row && Array.isArray(row.quizzes) && row.quizzes.length === 1, row && row.quizzes);
    ok('제목은 DB 값으로 갱신', row && row.title === 'SOP Mở cửa đầu ca', row && row.title);
  }

  // ===== TEST 5: 동기화 실패/빈결과면 localStorage 보존(오프라인 안전) =====
  console.log('\n=== TEST 5: syncSops — error/빈결과 시 localStorage 미변경 (로컬 전용 SOP 안전) ===');
  {
    const { SM, readStore, uploaded } = loadSM({ data: null, error: { message: 'network' } }, [VN, USER_SOP]);
    await SM.syncSops();
    ok('에러 시 로컬 SOP 2개 그대로 보존(데이터 손실 없음)', readStore().length === 2, readStore().length);
    ok('에러 시 복구 업로드도 시도하지 않음', uploaded.length === 0, uploaded.length);
  }
  {
    const { SM, readStore } = loadSM({ data: [], error: null }, [VN, USER_SOP]);
    await SM.syncSops();
    ok('빈 결과 시에도 로컬 보존(전량 삭제 방지)', readStore().length === 2, readStore().length);
  }

  // ===== TEST 6: deleteSop 가 툼스톤을 기록 =====
  console.log('\n=== TEST 6: deleteSop — sop_deleted_ids 툼스톤 기록 (복구 업로드 부활 차단) ===');
  {
    const { SM, readTombstones } = loadSM({ data: [VN], error: null }, [VN]);
    await SM.deleteSop('sop-1776743049363-ewyb');
    ok('삭제한 SOP id 가 툼스톤에 기록됨', readTombstones().includes('sop-1776743049363-ewyb'), readTombstones());
    await SM.deleteSop('sop-1776743049363-ewyb');
    ok('중복 삭제 시 툼스톤 중복 미기록', readTombstones().filter(x => x === 'sop-1776743049363-ewyb').length === 1, readTombstones());
  }

  console.log(`\n===== 결과: ${pass} 통과 / ${fail} 실패 =====`);
  process.exit(fail === 0 ? 0 : 1);
})();
