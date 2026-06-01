// 실전 검증: AI._localGenerateScript — 로컬(무료) 스크립트 생성기의 다국어(ko/en/vi) 나레이션.
// ai-provider.js 전체를 vm 에 올리고, _extractSections 가 쓰는 DOM 을 경량 mock 으로 제공해
// 진짜 AI._localGenerateScript 를 호출한다.
const fs = require('fs');
const vm = require('vm');
const path = require('path');

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name}${extra !== undefined ? '  → ' + JSON.stringify(extra) : ''}`); }
}

// ---- 경량 DOM mock: _extractSections 가 필요로 하는 만큼만 구현 ----
const stripTags = s => String(s).replace(/<[^>]*>/g, '').trim();
function parseHTML(html) {
  const nodes = [];
  const re = /<(h3|ul|ol)>([\s\S]*?)<\/\1>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const tag = m[1].toUpperCase(), inner = m[2];
    if (tag === 'UL' || tag === 'OL') {
      const lis = [];
      const lre = /<li>([\s\S]*?)<\/li>/gi; let lm;
      while ((lm = lre.exec(inner)) !== null) lis.push({ tagName: 'LI', textContent: stripTags(lm[1]) });
      nodes.push({ tagName: tag, _lis: lis, textContent: stripTags(inner) });
    } else {
      nodes.push({ tagName: tag, textContent: stripTags(inner) });
    }
  }
  nodes.forEach((n, i) => {
    n.nextElementSibling = nodes[i + 1] || null;
    n.querySelectorAll = sel => (sel === 'li' ? (n._lis || []) : []);
  });
  return nodes;
}
const documentMock = {
  createElement() {
    const el = { _nodes: [] };
    Object.defineProperty(el, 'innerHTML', { set(html) { this._nodes = parseHTML(html); }, get() { return ''; } });
    el.querySelectorAll = sel => (sel === 'h3' ? el._nodes.filter(n => n.tagName === 'H3') : []);
    return el;
  },
};

function loadAI() {
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'ai-provider.js'), 'utf8')
    + '\n;globalThis.__AI = AI;';
  const sandbox = {
    window: {}, document: documentMock,
    CONFIG: { DEFAULT_LANG: 'ko' },
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    console: { log: () => {}, warn: () => {}, error: () => {} },
    navigator: { language: 'ko' }, fetch: () => Promise.reject(new Error('no net')),
    setTimeout, JSON, Math, Date,
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox, { filename: 'ai-provider.js' });
  return sandbox.__AI;
}

// ---- 다국어 content 를 가진 현실적 SOP ----
const sopObj = {
  title: '아동 발달의 이해',
  title_en: 'Understanding Child Development',
  title_vn: 'Hiểu về sự phát triển của trẻ',
  content: '<h3>발달 단계</h3><ul><li>감각운동기</li><li>전조작기</li></ul><h3>관찰 방법</h3><ul><li>일화기록</li></ul>',
  content_en: '<h3>Developmental Stages</h3><ul><li>Sensorimotor</li><li>Preoperational</li></ul><h3>Observation</h3><ul><li>Anecdotal records</li></ul>',
  content_vn: '<h3>Giai đoạn phát triển</h3><ul><li>Giác động</li><li>Tiền thao tác</li></ul><h3>Phương pháp quan sát</h3><ul><li>Ghi chép giai thoại</li></ul>',
};

console.log('\n=== TEST: AI._localGenerateScript 다국어 나레이션 ===');
const AI = loadAI();
ok('AI 객체 로드됨', AI && typeof AI._localGenerateScript === 'function');

const script = AI._localGenerateScript(sopObj.title, sopObj.content, sopObj);
ok('스크립트 생성됨(배열)', Array.isArray(script) && script.length > 0, script && script.length);
// intro + 2 sections + outro = 4 씬
ok('씬 수 = intro+섹션2+outro = 4', script.length === 4, script.length);

console.log('\n--- 각 씬: 3개 언어 필드가 모두 채워지고 언어가 맞는가 ---');
let allHave3 = true, koLeakInVn = false, koLeakInEn = false;
script.forEach((sc, i) => {
  if (!sc.narration || !sc.narration_en || !sc.narration_vn) allHave3 = false;
  // 베트남어/영어 나레이션에 한글이 섞이면 누수
  if (/[가-힣]/.test(sc.narration_vn)) koLeakInVn = true;
  if (/[가-힣]/.test(sc.narration_en)) koLeakInEn = true;
});
ok('모든 씬에 ko/en/vn 3필드 존재', allHave3);
ok('베트남어 나레이션에 한글 누수 없음', !koLeakInVn);
ok('영어 나레이션에 한글 누수 없음', !koLeakInEn);

console.log('\n--- intro / outro 언어별 정확성 ---');
ok('intro 한국어', script[0].narration.includes('안녕하세요'), script[0].narration);
ok('intro 영어', script[0].narration_en.startsWith('Hello'), script[0].narration_en);
ok('intro 베트남어', script[0].narration_vn.startsWith('Xin chào'), script[0].narration_vn);
ok('intro 제목이 언어별로 다름(en)', script[0].narration_en.includes('Understanding Child Development'), script[0].narration_en);
ok('intro 제목이 언어별로 다름(vn)', script[0].narration_vn.includes('Hiểu về'), script[0].narration_vn);

const outro = script[script.length - 1];
ok('outro 한국어', outro.narration.includes('마칩니다'), outro.narration);
ok('outro 영어', outro.narration_en.includes('concludes'), outro.narration_en);
ok('outro 베트남어', outro.narration_vn.includes('Kết thúc'), outro.narration_vn);

console.log('\n--- 섹션 씬: content 의 섹션 제목이 언어별로 반영 ---');
ok('섹션1 영어에 영문 섹션명', /Developmental Stages|Sensorimotor/.test(script[1].narration_en), script[1].narration_en);
ok('섹션1 베트남어에 베트남 섹션명', /Giai đoạn|Giác động/.test(script[1].narration_vn), script[1].narration_vn);

console.log('\n=== 회귀: sopObj 없이 호출(하위호환) — 한국어만, 크래시 없음 ===');
const legacy = AI._localGenerateScript('테스트 제목', '<h3>섹션A</h3><ul><li>내용</li></ul>', null);
ok('sopObj 없어도 스크립트 생성', Array.isArray(legacy) && legacy.length >= 3, legacy && legacy.length);
ok('하위호환: narration_en 도 채워짐(폴백)', legacy.every(s => !!s.narration_en));

console.log(`\n===== 결과: ${pass} 통과 / ${fail} 실패 =====`);
process.exit(fail === 0 ? 0 : 1);
