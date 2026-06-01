// 실전 검증: 파일명→제목 복원(_cleanTitleFromFilename) + 챕터/섹션 파싱(parseChapterSection)
// admin/index.html 에서 추출한 진짜 함수(/tmp/title_fns.js)를 호출한다.
const { _cleanTitle, _cleanTitleFromFilename, parseChapterSection } = require('/tmp/title_fns.js');

let pass = 0, fail = 0;
function eq(name, got, want) {
  const okk = got === want;
  if (okk) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name}\n       got : ${JSON.stringify(got)}\n       want: ${JSON.stringify(want)}`); }
}
function truthy(name, cond, extra) {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name}${extra ? '  → ' + JSON.stringify(extra) : ''}`); }
}

console.log('\n=== TEST A: 언더스코어/하이픈 구분자 → 공백 복원 ===');
eq('베트남어 언더스코어', _cleanTitleFromFilename('Lý_thuyết_phát_triển.mp4'), 'Lý thuyết phát triển');
eq('영어 언더스코어', _cleanTitleFromFilename('Understanding_Child_Development.pdf'), 'Understanding Child Development');
eq('한국어 언더스코어', _cleanTitleFromFilename('누리과정_이해와_적용.docx'), '누리과정 이해와 적용');
eq('하이픈 연결자 보존', _cleanTitleFromFilename('Piaget-Vygotsky.mp4'), 'Piaget - Vygotsky');
eq('확장자만 제거(공백 이미 정상)', _cleanTitleFromFilename('Lý thuyết phát triển.mp4'), 'Lý thuyết phát triển');
eq('다중 언더스코어/공백 정리', _cleanTitleFromFilename('A__B___C.txt'), 'A B C');

console.log('\n=== TEST B: NFC 정규화 (결합문자 → 합성문자, 깨짐 방지) ===');
{
  // 베트남어 "ệ" 를 분해형(NFD)으로 만든 입력 — 화면에서 깨져 보이던 케이스
  const nfd = 'Hiệu'.normalize('NFD');          // e + 결합기호들
  const out = _cleanTitleFromFilename(nfd + '.mp4');
  truthy('NFD 입력이 NFC 로 합성됨', out === out.normalize('NFC'), out);
  eq('NFD→NFC 결과가 원문과 동일', out, 'Hiệu');
  truthy('베트남어 성조 보존', out.includes('ệ'), out);
}

console.log('\n=== TEST C: 빈 값/이상 입력 방어 ===');
eq('빈 문자열', _cleanTitleFromFilename(''), '');
eq('null', _cleanTitleFromFilename(null), '');
eq('undefined', _cleanTitleFromFilename(undefined), '');
eq('확장자 없음', _cleanTitleFromFilename('제목만'), '제목만');

console.log('\n=== TEST D: 챕터/섹션 파싱 (parseChapterSection) ===');
{
  const r1 = parseChapterSection('Ch02_Sec01_아동발달이론.mp4');
  truthy('Ch02_Sec01 인식', r1 && r1.chapterNum === 2 && r1.sectionNum === 1, r1);
  eq('  → chapterKey 포맷', r1 && r1.chapterKey, 'ch02');
  truthy('  → 섹션 제목 추출', r1 && r1.sectionTitle.includes('아동발달'), r1 && r1.sectionTitle);

  const r2 = parseChapterSection('ch3-동기부여.pdf');   // 섹션 없음 → 기본 1
  truthy('Ch만 있을 때 섹션=1', r2 && r2.chapterNum === 3 && r2.sectionNum === 1, r2);

  const r3 = parseChapterSection('그냥제목.mp4');         // 패턴 없음 → null
  eq('패턴 없으면 null', r3, null);
}

console.log('\n=== TEST E: 회귀 방지 — 정상 제목을 망가뜨리지 않음 ===');
eq('이미 깔끔한 한국어', _cleanTitleFromFilename('영유아 건강 관리.mp4'), '영유아 건강 관리');
eq('숫자 포함 제목', _cleanTitleFromFilename('2024 안전교육.pdf'), '2024 안전교육');

console.log(`\n===== 결과: ${pass} 통과 / ${fail} 실패 =====`);
process.exit(fail === 0 ? 0 : 1);
