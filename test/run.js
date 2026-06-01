#!/usr/bin/env node
// 의존성 없는 테스트 러너: test/*.test.js 를 모두 실행하고 결과를 집계한다.
//   실행:  node test/run.js
// (루트 package.json 을 두지 않는 이유: Vercel 빌드 감지를 바꾸지 않기 위해.)
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const dir = __dirname;
const files = fs.readdirSync(dir).filter(f => f.endsWith('.test.js')).sort();

let failedFiles = 0;
const summary = [];
for (const f of files) {
  const res = spawnSync(process.execPath, [path.join(dir, f)], { encoding: 'utf8' });
  process.stdout.write(res.stdout || '');
  if (res.stderr) process.stderr.write(res.stderr);
  const m = (res.stdout || '').match(/결과:\s*(\d+)\s*통과\s*\/\s*(\d+)\s*실패/);
  const passed = m ? +m[1] : 0;
  const failed = m ? +m[2] : (res.status === 0 ? 0 : 1);
  if (res.status !== 0 || failed > 0) failedFiles++;
  summary.push({ f, passed, failed, ok: res.status === 0 && failed === 0 });
}

console.log('\n======================== 전체 요약 ========================');
let totalPass = 0, totalFail = 0;
for (const s of summary) {
  console.log(`  ${s.ok ? '✅' : '❌'} ${s.f}  (${s.passed} 통과 / ${s.failed} 실패)`);
  totalPass += s.passed; totalFail += s.failed;
}
console.log(`  ----------------------------------------------------`);
console.log(`  합계: ${totalPass} 통과 / ${totalFail} 실패  ·  파일 ${summary.length}개 중 ${failedFiles}개 실패`);
console.log('===========================================================');
process.exit(failedFiles === 0 ? 0 : 1);
