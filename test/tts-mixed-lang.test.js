// 혼재 언어(영어/베트남어/한국어) 나레이션 분할기 회귀 테스트.
// api/_lang-segment.js 의 segmentByLang 이 영어 구간과 베트남어 구간을 올바른
// 순서·언어로 나누고, 내용을 잃지 않는지(영어가 베트남어 구간에 안 섞이는지) 검증한다.
// 실제 사례: Kiwooza BAR SOP — 베트남어 인트로/아웃트로 + 영어 본문(절차).
const { segmentByLang } = require('../api/_lang-segment.js');

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name}${extra !== undefined ? '  → ' + extra : ''}`); }
}
const langs = segs => segs.map(s => s.lang);

console.log('\n=== 단일 언어: 분할하지 않음(1구간) + 서버측 언어 보정 ===');
{
  // 클라가 vi 로 보내도 본문이 영어면 en-US 로 보정되어야 한다(em-dash 등으로 오탐된 경우).
  const en = segmentByLang('OBJECTIVE. Associates understand the proper procedure to open and close the bar.', 'vi-VN');
  ok('순수 영어 → 1구간', en.length === 1, JSON.stringify(langs(en)));
  ok('순수 영어 → en-US (vi 로 와도 보정)', en[0] && en[0].lang === 'en-US', en[0] && en[0].lang);

  // em-dash 가 들어가도 영어로 감지(기존 _detectTextLang 의 약점 보완).
  const enDash = segmentByLang('OPENING — Procedure. Bottles placed according to volume.', 'vi-VN');
  ok('em-dash 포함 영어 → 1구간 en-US', enDash.length === 1 && enDash[0].lang === 'en-US', JSON.stringify(langs(enDash)));

  const vi = segmentByLang('Xin chào. Hãy ghi nhớ những nội dung chính nhé!', 'en-US');
  ok('순수 베트남어 → 1구간 vi-VN', vi.length === 1 && vi[0].lang === 'vi-VN', JSON.stringify(langs(vi)));

  const ko = segmentByLang('아이의 발달 단계를 이해합니다. 관찰 기록을 작성합니다.', 'en-US');
  ok('순수 한국어 → 1구간 ko-KR', ko.length === 1 && ko[0].lang === 'ko-KR', JSON.stringify(langs(ko)));
}

console.log('\n=== 혼재: 영어 본문 + 베트남어 꼬리 (실제 bar-01 씬4 형태) ===');
{
  const t = 'CLOSING — Procedure. Turn off coffee machine. Clean head group with water. ' +
            'Bản trích xuất phục vụ tạo nội dung đào tạo. Giữ nguyên nguyên gốc.';
  const segs = segmentByLang(t, 'vi-VN');
  ok('2구간으로 분할', segs.length === 2, JSON.stringify(langs(segs)));
  ok('순서: [en-US, vi-VN]',
     segs.length === 2 && segs[0].lang === 'en-US' && segs[1].lang === 'vi-VN', JSON.stringify(langs(segs)));
  ok('영어 구간에 영어 본문 포함', segs[0] && /Procedure/.test(segs[0].text) && /coffee machine/i.test(segs[0].text),
     segs[0] && segs[0].text);
  ok('베트남어 구간에 베트남어 포함', segs[1] && /trích xuất/.test(segs[1].text), segs[1] && segs[1].text);
  ok('내용 보존: 영어가 베트남어 구간에 안 섞임', segs[1] && !/coffee/i.test(segs[1].text), segs[1] && segs[1].text);
}

console.log('\n=== 혼재: 베트남어 인트로 + 영어 본문 + 베트남어 아웃트로 ===');
{
  const t = 'Xin chào. Chúng ta sẽ học. OBJECTIVE. Associates understand the procedure. Kết thúc khóa học nhé!';
  const segs = segmentByLang(t, 'vi-VN');
  ok('3구간', segs.length === 3, JSON.stringify(langs(segs)));
  ok('순서 [vi, en, vi]',
     JSON.stringify(langs(segs)) === JSON.stringify(['vi-VN', 'en-US', 'vi-VN']), JSON.stringify(langs(segs)));
}

console.log('\n=== 한국어 문장에 영어 단어가 박혀도 ko 유지(기존 동작 보존) ===');
{
  // "Service"→"서비스" 한글 발음치환은 한국어 음성에서만 의미 있으므로, 한국어 문장은
  // 영어 단어를 품은 채 ko-KR 한 구간이어야 한다(분리하면 한국어 흐름이 깨짐).
  const segs = segmentByLang('이 Service는 매우 중요합니다. Manager에게 보고하세요.', 'ko-KR');
  ok('1구간 ko-KR', segs.length === 1 && segs[0].lang === 'ko-KR', JSON.stringify(langs(segs)));
}

console.log('\n=== 중립(숫자/기호) 조각은 인접 언어로 귀속, 내용 보존 ===');
{
  const segs = segmentByLang('Step one. 1 2 3. Bước tiếp theo nhé.', 'vi-VN');
  ok('2구간 [en, vi]',
     JSON.stringify(langs(segs)) === JSON.stringify(['en-US', 'vi-VN']), JSON.stringify(langs(segs)));
  const all = segs.map(s => s.text).join(' ');
  ok('숫자 보존(유실 없음)', /1 2 3/.test(all), all);
}

console.log('\n=== 순서·내용 보존: 모든 구간을 이으면 핵심 토큰이 다 남는다 ===');
{
  const t = 'Xin chào. OBJECTIVE here. Cảm ơn.';
  const segs = segmentByLang(t, 'vi-VN');
  const joined = segs.map(s => s.text).join(' ');
  ok('토큰 유실 없음', /Xin chào/.test(joined) && /OBJECTIVE here/.test(joined) && /Cảm ơn/.test(joined), joined);
  ok('순서 [vi, en, vi]',
     JSON.stringify(langs(segs)) === JSON.stringify(['vi-VN', 'en-US', 'vi-VN']), JSON.stringify(langs(segs)));
}

console.log('\n=== 빈/공백/널 입력 안전 ===');
{
  ok('빈 문자열 → []', segmentByLang('', 'en-US').length === 0);
  ok('공백/줄바꿈만 → []', segmentByLang('   \n  ', 'en-US').length === 0);
  ok('null → []', segmentByLang(null, 'en-US').length === 0);
  ok('undefined → []', segmentByLang(undefined, 'en-US').length === 0);
}

console.log(`\n===== 결과: ${pass} 통과 / ${fail} 실패 =====`);
process.exit(fail === 0 ? 0 : 1);
