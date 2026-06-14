// 실전 검증(테넌트 격리 · 콘텐츠 완전성): SLKO 슬라임 피크닉 교육매뉴얼 데이터 추가.
// 이 콘텐츠는 반드시 SLKO 로만 스코프돼야 하고(Kiwooza 등 타 브랜드로 새면 안 됨),
// 17 슬라이드(이미지+설명)가 누락 없이 들어가야 한다("생략·축소 없이" 요구).
const fs = require('fs');
const path = require('path');

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name}${extra !== undefined ? '  → ' + JSON.stringify(extra) : ''}`); }
}
function read(f) { return fs.readFileSync(path.join(__dirname, '..', f), 'utf8'); }
function exists(f) { return fs.existsSync(path.join(__dirname, '..', f)); }

const KIWOOZA = 'dae1afc8-55cb-476e-8099-07ef41e4452d';
const SLKO = 'f7b86b4d-9a43-486d-8d07-6ba812cd4ef7';
const MIG = 'docs/migrations/2026-06-14-slko-slime-picnic-manual.sql';
const DIR = 'assets/manuals/slko-slime-picnic';

console.log('=== SLKO 슬라임 피크닉 매뉴얼 콘텐츠 가드 ===');

ok('마이그레이션 파일 존재', exists(MIG));
const sql = read(MIG);

// ── 테넌트 격리 ──
ok('🔒 SLKO company_id 로 스코프됨', sql.includes(SLKO));
ok('🔒 Kiwooza(타 브랜드) id 가 섞이지 않음', !sql.includes(KIWOOZA));
ok('🔒 sop_documents 에 들어감(콘텐츠 테이블)', /insert\s+into\s+public\.sop_documents/i.test(sql));

// ── 구조 ──
ok('챕터 + 섹션 구조', /'chapter'/.test(sql) && /'section'/.test(sql));
ok('공개 상태(published)', (sql.match(/'published'/g) || []).length >= 2);
ok('멱등 — ON CONFLICT DO UPDATE(재실행 안전)', /on conflict\s*\(id\)\s*do update/i.test(sql));
ok('begin/commit 트랜잭션', /\bbegin\b/i.test(sql) && /\bcommit\b/i.test(sql));

// ── 완전성: 17 슬라이드 이미지 ──
let allImg = true, allRef = true, missing = [];
for (let i = 1; i <= 17; i++) {
  const f = `slide${String(i).padStart(2, '0')}.jpg`;
  if (!exists(`${DIR}/${f}`)) { allImg = false; missing.push('file:' + f); }
  if (!sql.includes(`${DIR}/${f}`)) { allRef = false; missing.push('ref:' + f); }
}
ok('17개 슬라이드 이미지 파일이 리포지토리에 존재', allImg, missing);
ok('SQL 이 17개 슬라이드 이미지 URL 을 모두 참조', allRef, missing);

console.log(`\n===== 결과: ${pass} 통과 / ${fail} 실패 =====`);
process.exit(fail === 0 ? 0 : 1);
