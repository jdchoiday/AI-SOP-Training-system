// 실전 검증: getVideos(다국어 나레이션) + getLocalizedText 를 실제 로드해 돌린다.
// demo-data.js 를 vm 컨텍스트에 mock 전역과 함께 올려 진짜 함수를 호출한다.
const fs = require('fs');
const vm = require('vm');
const path = require('path');

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name}${extra ? '  → ' + extra : ''}`); }
}

// ---- mock 전역 ----
function makeLocalStorage(initial) {
  const store = { ...initial };
  return {
    getItem: k => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: k => { delete store[k]; },
    _dump: () => store,
  };
}

function loadDemoData(lang) {
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'demo-data.js'), 'utf8')
    // 끝에 실제 함수들을 sandbox 로 노출 (const 는 vm 전역에 안 붙으므로 명시적 export)
    + '\n;globalThis.__exp = { SopStore, getLocalizedText, EmployeeStore, Progress };';
  const sandbox = {
    localStorage: makeLocalStorage({ sop_lang: lang }),
    CONFIG: { DEFAULT_LANG: 'ko' },
    window: {},
    console: { log: () => {}, warn: () => {}, error: () => {} },
    Date,
    JSON,
    Math,
    globalThis: {},
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox, { filename: 'demo-data.js' });
  return { ...sandbox.__exp, localStorage: sandbox.localStorage };
}

// ---- 테스트용 SOP (베트남어 나레이션 있음 / 일부 누락) ----
const SOP = {
  id: 'sop-test',
  title: 'Lý thuyết phát triển',
  script: [
    { scene: 1,
      narration: '아이의 발달 단계를 이해합니다.',
      narration_vn: 'Hiểu các giai đoạn phát triển của trẻ.',
      narration_en: 'Understand the stages of child development.',
      visual: 'child playing' },
    { scene: 2,
      narration: '관찰 기록을 작성합니다.',     // _vn / _en 누락 (번역 안 된 씬)
      visual: 'teacher writing' },
  ],
};

console.log('\n=== TEST 1: 베트남어(vi) 사용자 — 나레이션 다국어 노출 ===');
{
  const { SopStore, getLocalizedText, localStorage } = loadDemoData('vi');
  // 테스트 SOP 주입
  localStorage.setItem('sop_documents', JSON.stringify([SOP]));
  const videos = SopStore.getVideos('sop-test');

  ok('비디오 2개 생성', videos.length === 2, `len=${videos.length}`);

  // 씬1: 베트남어 나레이션 존재 → vi 사용자는 베트남어를 받아야 함
  const v1 = getLocalizedText(videos[0], 'title_full');
  ok('씬1 title_full_vn 채워짐', videos[0].title_full_vn === SOP.script[0].narration_vn,
     videos[0].title_full_vn);
  ok('씬1: vi 사용자가 베트남어 나레이션 받음', v1 === SOP.script[0].narration_vn, v1);
  ok('씬1: 한국어 원문이 노출되지 않음', !v1.includes('아이의'), v1);

  // 씬2: 번역 누락 → 한국어로 폴백 (degradation 허용, 크래시 없어야)
  const v2 = getLocalizedText(videos[1], 'title_full');
  ok('씬2: 번역 없으면 한국어 폴백(크래시 없음)', typeof v2 === 'string' && v2.length > 0, v2);
  ok('씬2 title_full_vn 폴백=한국어원문', videos[1].title_full_vn === SOP.script[1].narration, videos[1].title_full_vn);
}

console.log('\n=== TEST 2: 영어(en) 사용자 ===');
{
  const { SopStore, getLocalizedText, localStorage } = loadDemoData('en');
  localStorage.setItem('sop_documents', JSON.stringify([SOP]));
  const videos = SopStore.getVideos('sop-test');
  const v1 = getLocalizedText(videos[0], 'title_full');
  ok('씬1: en 사용자가 영어 나레이션 받음', v1 === SOP.script[0].narration_en, v1);
  ok('씬1: 한국어 미노출', !v1.includes('아이의'), v1);
}

console.log('\n=== TEST 3: 한국어(ko) 사용자 — 원문 유지 ===');
{
  const { SopStore, getLocalizedText, localStorage } = loadDemoData('ko');
  localStorage.setItem('sop_documents', JSON.stringify([SOP]));
  const videos = SopStore.getVideos('sop-test');
  const v1 = getLocalizedText(videos[0], 'title_full');
  ok('씬1: ko 사용자가 한국어 원문 받음', v1 === SOP.script[0].narration, v1);
}

console.log('\n=== TEST 4: 언어 전환 일관성 (같은 영상, lang만 바꿔 재빌드) ===');
{
  for (const [lang, field, expected] of [
    ['vi', 'narration_vn', SOP.script[0].narration_vn],
    ['en', 'narration_en', SOP.script[0].narration_en],
    ['ko', 'narration',    SOP.script[0].narration],
  ]) {
    const { SopStore, getLocalizedText, localStorage } = loadDemoData(lang);
    localStorage.setItem('sop_documents', JSON.stringify([SOP]));
    const v = getLocalizedText(SopStore.getVideos('sop-test')[0], 'title_full');
    ok(`lang=${lang} → ${field}`, v === expected, v);
  }
}

console.log(`\n===== 결과: ${pass} 통과 / ${fail} 실패 =====`);
process.exit(fail === 0 ? 0 : 1);
