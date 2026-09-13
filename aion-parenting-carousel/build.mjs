/**
 * AION Kinder — 부모교육 캐러셀 생성기 (결정층)
 *
 * 주제 JSON 1개 → 8장 PNG 슬라이드 (1080x1350, 인스타 4:5)
 *
 * 사용법:
 *   node build.mjs topics/vn-001-lam-vo-bat.json
 *
 * 디자인·레이아웃은 100% 이 파일이 결정한다. 주제 JSON은 "글"만 담는다.
 * → 주제를 바꿔도 브랜드 룩은 한 픽셀도 안 흔들린다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const W = 1080, H = 1350;            // 인스타그램 캐러셀 4:5 (피드 점유율 최대)

// ── 브랜드 디자인 토큰 ─────────────────────────────────────────────
const T = {
  cream:  '#FFF8EF',   // 배경 (따뜻한 크림)
  ink:    '#12514C',   // 제목 (깊은 틸 — 신뢰/교육)
  body:   '#3F3A35',   // 본문
  muted:  '#8A8079',   // 보조
  coral:  '#D4553A',   // 하지 말 것
  green:  '#2E8B6F',   // 해야 할 것
  sand:   '#F2E5D2',   // 카드 배경
  line:   '#E3D5C0',
};

// 폰트는 절대경로로 박는다 (임시 HTML 위치와 무관하게 항상 로드되도록)
const fontFace = (w) => ['vietnamese', 'latin-ext', 'latin']
  .map((s) => `@font-face{font-family:BVP;font-weight:${w};font-display:block;` +
              `src:url('file://${ROOT}/fonts/BVP-${w}-${s}.woff2') format('woff2')}`).join('');

const CSS = `
${[400, 600, 800].map(fontFace).join('')}
*{margin:0;padding:0;box-sizing:border-box}
body{width:${W}px;height:${H}px;background:${T.cream};font-family:BVP,sans-serif;
     color:${T.body};overflow:hidden;position:relative}
.pad{position:absolute;inset:0;padding:96px 88px;display:flex;flex-direction:column}
.grow{flex:1}

/* 상단 라벨 */
.series{font-weight:800;font-size:26px;letter-spacing:.16em;color:${T.green};text-transform:uppercase}
.rule{width:76px;height:7px;background:${T.coral};border-radius:99px;margin:26px 0 0}

/* 타이포 */
h1{font-weight:800;font-size:86px;line-height:1.1;color:${T.ink};letter-spacing:-.02em;white-space:pre-line}
h2{font-weight:800;font-size:68px;line-height:1.14;color:${T.ink};letter-spacing:-.015em}
.sub{font-weight:400;font-size:38px;line-height:1.45;color:${T.muted};white-space:pre-line}
.lead{font-weight:600;font-size:44px;line-height:1.35;color:${T.ink}}
.kicker{font-weight:600;font-size:30px;color:${T.muted};margin-top:14px}

/* 하단 공통 */
.foot{display:flex;justify-content:space-between;align-items:flex-end;font-size:26px;color:${T.muted};font-weight:600}
.dots{display:flex;gap:10px;align-items:center}
.dot{width:12px;height:12px;border-radius:99px;background:${T.line}}
.dot.on{background:${T.coral};width:34px}

/* 카드 */
.card{background:#fff;border-radius:26px;padding:38px 40px;font-size:40px;line-height:1.35;
      font-weight:600;color:${T.body};box-shadow:0 3px 0 ${T.line}}
.card.bad{border-left:12px solid ${T.coral}}
.stack{display:flex;flex-direction:column;gap:26px}

/* 번호 스텝 */
.step{display:flex;gap:30px;align-items:flex-start}
.num{flex:none;width:76px;height:76px;border-radius:99px;background:${T.green};color:#fff;
     font-weight:800;font-size:40px;display:flex;align-items:center;justify-content:center}
.st{font-weight:800;font-size:44px;color:${T.ink};line-height:1.2}
.sd{font-weight:400;font-size:36px;color:${T.body};line-height:1.4;margin-top:10px}

/* 불릿 */
.bul{display:flex;gap:24px;align-items:flex-start}
.bdot{flex:none;width:18px;height:18px;border-radius:99px;background:${T.coral};margin-top:16px}
.btxt{font-weight:600;font-size:41px;line-height:1.38;color:${T.body}}

/* 인용 */
.quote{background:${T.ink};border-radius:34px;padding:66px 58px;color:#fff;position:relative}
.qmark{font-size:150px;font-weight:800;line-height:.7;color:${T.green};opacity:.9}
.qtext{font-weight:600;font-size:52px;line-height:1.42;white-space:pre-line;margin-top:18px}

/* 표지 큰 원형 장식 */
.blob{position:absolute;width:560px;height:560px;border-radius:99px;background:${T.sand};
      right:-190px;top:-170px;z-index:0}
/* 주의: .pad 의 position:absolute 를 덮으면 높이가 무너진다. z-index 만 올릴 것 */
.z{z-index:1}

/* CTA */
.brandbig{font-weight:800;font-size:58px;color:${T.ink}}
.handle{font-weight:600;font-size:36px;color:${T.green};margin-top:8px}
`;

// ── 슬라이드 정의 ─────────────────────────────────────────────────
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const dots = (i, n) => `<div class="dots">${Array.from({ length: n },
  (_, k) => `<div class="dot${k === i ? ' on' : ''}"></div>`).join('')}</div>`;

function slides(d) {
  const S = [];

  // 1. 표지 — 훅
  S.push(`<div class="blob"></div><div class="pad z">
    <div class="series">${esc(d.series)}</div><div class="rule"></div>
    <div class="grow" style="display:flex;flex-direction:column;justify-content:center">
      <h1>${esc(d.cover.hook)}</h1>
      <div class="sub" style="margin-top:38px">${esc(d.cover.sub)}</div>
    </div>
    <div class="foot"><div>${esc(d.brand)}</div><div>→ Vuốt sang</div></div></div>`);

  // 2. 상황
  S.push(`<div class="pad">
    <h2>${esc(d.situation.title)}</h2><div class="rule"></div>
    <div class="grow stack" style="justify-content:center">
      ${d.situation.lines.map((l, i) => `<div class="${i === 1 ? 'lead' : 'btxt'}"
        style="${i === 1 ? `font-size:72px;font-weight:800;color:${T.coral};letter-spacing:.04em` : ''}">${esc(l)}</div>`).join('')}
    </div>${foot(d, 1)}</div>`);

  // 3. 흔한 반응 (하지 말 것)
  S.push(`<div class="pad">
    <h2>${esc(d.dont.title)}</h2>
    <div class="kicker">${esc(d.dont.subtitle)}</div><div class="rule"></div>
    <div class="grow stack" style="justify-content:center">
      ${d.dont.items.map((x) => `<div class="card bad">${esc(x)}</div>`).join('')}
    </div>${foot(d, 2)}</div>`);

  // 4. 왜 안 되는가
  S.push(`<div class="pad">
    <h2>${esc(d.why.title)}</h2><div class="rule"></div>
    <div class="lead" style="margin-top:44px">${esc(d.why.lead)}</div>
    <div class="grow stack" style="justify-content:center;gap:34px">
      ${d.why.points.map((p) => `<div class="bul"><div class="bdot"></div>
        <div class="btxt">${esc(p)}</div></div>`).join('')}
    </div>${foot(d, 3)}</div>`);

  // 5. 올바른 반응 3단계
  S.push(`<div class="pad">
    <h2>${esc(d.do.title)}</h2><div class="rule"></div>
    <div class="grow stack" style="justify-content:center;gap:52px">
      ${d.do.steps.map((s) => `<div class="step"><div class="num">${esc(s.n)}</div>
        <div><div class="st">${esc(s.t)}</div><div class="sd">${esc(s.d)}</div></div></div>`).join('')}
    </div>${foot(d, 4)}</div>`);

  // 6. 그대로 따라 할 대사
  S.push(`<div class="pad">
    <h2>${esc(d.script.title)}</h2><div class="rule"></div>
    <div class="grow" style="display:flex;flex-direction:column;justify-content:center">
      <div class="quote"><div class="qmark">“</div>
        <div class="qtext">${esc(d.script.quote)}</div></div>
      <div class="sub" style="margin-top:36px;font-size:34px">${esc(d.script.note)}</div>
    </div>${foot(d, 5)}</div>`);

  // 7. 요약
  S.push(`<div class="pad">
    <h2>${esc(d.summary.title)}</h2><div class="rule"></div>
    <div class="grow stack" style="justify-content:center;gap:40px">
      ${d.summary.points.map((p, i) => `<div class="step">
        <div class="num" style="background:${T.coral}">${i + 1}</div>
        <div class="st" style="font-size:42px;padding-top:12px">${esc(p)}</div></div>`).join('')}
    </div>${foot(d, 6)}</div>`);

  // 8. CTA
  S.push(`<div class="blob" style="left:-190px;bottom:-170px;top:auto;right:auto"></div>
    <div class="pad z">
    <div class="series">${esc(d.series)}</div><div class="rule"></div>
    <div class="grow" style="display:flex;flex-direction:column;justify-content:center">
      <h2 style="font-size:78px">${esc(d.cta.headline).replace(/\n/g, '<br>')}</h2>
      <div class="sub" style="margin-top:34px">${esc(d.cta.sub)}</div>
    </div>
    <div><div class="brandbig">${esc(d.brand)}</div>
      <div class="handle">${esc(d.cta.handle)}</div></div></div>`);

  return S;
}

const foot = (d, i) => `<div class="foot">${dots(i, 8)}<div>${esc(d.brand)}</div></div>`;

// ── 렌더 ──────────────────────────────────────────────────────────
const topicFile = process.argv[2];
if (!topicFile) { console.error('사용법: node build.mjs topics/<주제>.json'); process.exit(1); }

const d = JSON.parse(fs.readFileSync(path.resolve(ROOT, topicFile), 'utf8'));
const outDir = path.join(ROOT, 'out', d.id);
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

const tmp = path.join(ROOT, '.tmp');
fs.mkdirSync(tmp, { recursive: true });

const list = slides(d);
console.log(`\n▶ ${d.id} — 슬라이드 ${list.length}장 생성\n`);

list.forEach((html, i) => {
  const n = String(i + 1).padStart(2, '0');
  const f = path.join(tmp, `s${n}.html`);
  // 폰트 상대경로가 맞도록 HTML을 프로젝트 루트 기준으로 쓴다
  fs.writeFileSync(f, `<!doctype html><meta charset="utf-8"><style>${CSS}</style>${html}`);
  const png = path.join(outDir, `slide-${n}.png`);
  execFileSync(CHROME, [
    '--headless', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
    '--force-device-scale-factor=1', `--window-size=${W},${H}`,
    '--virtual-time-budget=4000', `--screenshot=${png}`,
    `file://${f}`,
  ], { stdio: 'ignore' });
  const kb = Math.round(fs.statSync(png).size / 1024);
  console.log(`  ✓ slide-${n}.png  (${kb} KB)`);
});

// ── 검토용 PDF (8장 한 파일) ───────────────────────────────────────
// 팀이 구글드라이브에서 PDF에 바로 코멘트를 달 수 있게 한다.
// 글자가 벡터로 들어가 용량이 작고 확대해도 선명하다.
const pdfHtml = path.join(tmp, 'review.html');
fs.writeFileSync(pdfHtml,
  `<!doctype html><meta charset="utf-8"><style>${CSS}
   @page{size:${W}px ${H}px;margin:0}
   body{width:auto;height:auto;background:none}
   .page{width:${W}px;height:${H}px;background:${T.cream};position:relative;
         overflow:hidden;break-after:page}
   .page:last-child{break-after:auto}</style>` +
  list.map((h) => `<div class="page">${h}</div>`).join(''));

const pdf = path.join(outDir, `${d.id}-review.pdf`);
execFileSync(CHROME, [
  '--headless', '--disable-gpu', '--no-sandbox',
  '--no-pdf-header-footer', '--virtual-time-budget=6000',
  `--print-to-pdf=${pdf}`, `file://${pdfHtml}`,
], { stdio: 'ignore' });
console.log(`\n  ✓ ${path.basename(pdf)}  (${Math.round(fs.statSync(pdf).size / 1024)} KB) — 팀 검토용`);

fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\n✅ 완료 → out/${d.id}/\n`);
