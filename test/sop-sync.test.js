// 실전 검증: SupabaseMode.syncSops 가 Supabase 를 SOP 단일 진실원본으로 삼는지.
//   - DB 에 있는 SOP 만 localStorage 에 남긴다(= DB 미존재 로컬 전용 SOP 제거).
//   - 단, Supabase 동기화가 실패/빈결과면 localStorage 를 건드리지 않는다(오프라인 보존).
//   - DB SOP 에 대해선 로컬 script/quizzes 보강분을 보존한다.
// 배경: 과거엔 localStorage 전용 SOP 를 무한 보존 → DB 에서 지워도/한 번도 안 올라가도
//       (데모·로컬 생성 한국어 SOP 등) 기기에 영구 잔존하여 "계속 나타나는" 문제 발생.
const fs = require('fs');
const vm = require('vm');
const path = require('path');

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name}${extra !== undefined ? '  → ' + JSON.stringify(extra) : ''}`); }
}

// supabaseResult: { data, error } — from('sop_documents').select('*').order('order_num') 가 반환
function loadSM(supabaseResult, localSops) {
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'supabase-client.js'), 'utf8')
    + '\n;globalThis.__exp = { SupabaseMode };';
  const store = { sop_documents: JSON.stringify(localSops || []) };
  const sandbox = {
    CONFIG: { SUPABASE_URL: 'https://x.supabase.co', SUPABASE_ANON_KEY: 'k' },
    window: {},
    localStorage: {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; },
    },
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
  SM._ready = true;
  SM._retry = (fn) => fn();
  SM._client = {
    from() {
      return { select() { return { order() { return Promise.resolve(supabaseResult); } }; } };
    },
  };
  const readStore = () => JSON.parse(store.sop_documents || '[]');
  return { SM, readStore };
}

(async () => {
  const VN = { id: 'kwzvn-opening-shift', title: 'SOP Mở cửa đầu ca', content_vn: '...', status: 'published', order_num: 2 };
  const KO_LOCAL = { id: 'AION-ko-intro', title: 'AION의탄생배경과비전', content: '한국어 본문', status: 'published', order_num: 1 };

  // ===== TEST 1: DB 미존재 로컬 전용(한국어) SOP 제거 =====
  console.log('=== TEST 1: syncSops — DB 에 없는 로컬 전용 SOP 정리 (한국어 SOP 사라짐) ===');
  {
    const { SM, readStore } = loadSM({ data: [VN], error: null }, [VN, KO_LOCAL]);
    await SM.syncSops();
    const after = readStore();
    const ids = after.map(s => s.id);
    ok('동기화 후 DB 의 베트남어 SOP 는 유지', ids.includes('kwzvn-opening-shift'), ids);
    ok('동기화 후 로컬 전용 한국어 SOP 는 제거됨', !ids.includes('AION-ko-intro'), ids);
    ok('localStorage 에 DB SOP 개수만 남음(1개)', after.length === 1, after.length);
  }

  // ===== TEST 2: DB SOP 의 로컬 script/quizzes 보강분 보존 =====
  console.log('\n=== TEST 2: syncSops — DB SOP 에 대한 로컬 script/quizzes 보강 보존 ===');
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

  // ===== TEST 3: 동기화 실패/빈결과면 localStorage 보존(오프라인 안전) =====
  console.log('\n=== TEST 3: syncSops — error/빈결과 시 localStorage 미변경 (로컬 전용 SOP 안전) ===');
  {
    const { SM, readStore } = loadSM({ data: null, error: { message: 'network' } }, [VN, KO_LOCAL]);
    await SM.syncSops();
    ok('에러 시 로컬 SOP 2개 그대로 보존(데이터 손실 없음)', readStore().length === 2, readStore().length);
  }
  {
    const { SM, readStore } = loadSM({ data: [], error: null }, [VN, KO_LOCAL]);
    await SM.syncSops();
    ok('빈 결과 시에도 로컬 보존(전량 삭제 방지)', readStore().length === 2, readStore().length);
  }

  console.log(`\n===== 결과: ${pass} 통과 / ${fail} 실패 =====`);
  process.exit(fail === 0 ? 0 : 1);
})();
