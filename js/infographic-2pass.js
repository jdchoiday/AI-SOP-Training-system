// ============================================
// 2-Pass Infographic HTML Generator
// 나레이션 → Pass 1 분석 JSON → Pass 2 9:16 HTML
// 8-스타일 라이브러리 + 12원칙 + 오버플로우 방지
// ============================================
(function () {
  'use strict';

  // ===== 모델 비용표 (USD per 1M tokens) =====
  const RATES = {
    'gemini-2.5-pro':    { in: 1.25, out: 10 },
    'gemini-2.5-flash':  { in: 0.30, out: 2.50 },
    'claude-opus-4-7':   { in: 15, out: 75 },
    'claude-sonnet-4-6': { in: 3,  out: 15 },
  };

  // ===== 언어 감지 (나레이션 → ko/en/vi) =====
  // ai-provider.js / api/image.js 와 동일한 로직 — 한 곳에서 바꾸면 전부 통일되도록 분리
  const VI_DIACRITICS = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
  function detectLang(text) {
    const s = (text || '').slice(0, 300);
    if (VI_DIACRITICS.test(s)) return 'vi';
    if (/^[\x00-\x7F\s.,!?;:'"()\-\d\n]+$/.test(s)) return 'en';
    return 'ko';
  }
  function langName(code) {
    return code === 'vi' ? 'Vietnamese (tiếng Việt)' : code === 'en' ? 'English' : 'Korean (한국어)';
  }

  // ===== 스타일 힌트 =====
  const STYLE_HINTS = {
    auto: '나레이션 내용을 분석해서 가장 어울리는 스타일을 자유롭게 선택.',
    dramatic: '드라마틱 — 강렬한 그라디언트, 거대한 타이포, 강한 명암 대비, 극적 레이아웃.',
    minimal: '미니멀 — 여백 풍부, 단순 색상(2~3개), 세련된 타이포, 절제된 장식.',
    warm: '따뜻함 — 오렌지·핑크·아이보리, 부드러운 곡선, 친근한 톤.',
    data: '데이터 — 숫자·차트·통계 강조, 명확한 구조, 정보 위계 극대화.',
  };

  // ============================================
  // 8-스타일 템플릿 (Pass 2가 scene_type 맞춰 1개만 주입)
  // ============================================
  const STYLE_TEMPLATES = {
    stat_hero: {
      name: 'Stat Hero · 수치 강조',
      guide: '거대한 숫자 하나를 화면 중앙에. 숫자 140~180px · 단위 28~40px · 델타 화살표는 강조색. 원형 링(conic-gradient) 또는 숫자 단독. 상단 CAPTION(13px, letter-spacing 높게, uppercase)과 하단 footer(12px)만 부가 정보로.',
      example: `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{width:390px;height:693px;background:#0a0e1a;color:#e5e7eb;font-family:-apple-system,'Pretendard',sans-serif;overflow:hidden;position:relative;word-break:keep-all;padding-bottom:40px}
.caption{position:absolute;top:56px;left:40px;font-size:13px;color:#6b7280;letter-spacing:0.15em;text-transform:uppercase}
.ring{position:absolute;top:120px;left:50%;transform:translateX(-50%);width:260px;height:260px;border-radius:50%;background:conic-gradient(#60a5fa 0deg 352.8deg,#1f2937 352.8deg);display:flex;align-items:center;justify-content:center}
.ring::before{content:'';position:absolute;width:228px;height:228px;border-radius:50%;background:#0a0e1a}
.hero{position:relative;font-size:118px;font-weight:900;color:#fff;letter-spacing:-0.05em;line-height:1}
.unit{position:relative;font-size:26px;color:#9ca3af;margin-left:4px;align-self:flex-end;margin-bottom:18px}
.sub{position:absolute;top:400px;left:0;right:0;text-align:center;font-size:22px;color:#e5e7eb;font-weight:600}
.delta{position:absolute;top:440px;left:0;right:0;text-align:center;font-size:16px;color:#4ade80;font-weight:700}
.footer{position:absolute;top:500px;left:0;right:0;text-align:center;font-size:11px;color:#525252;letter-spacing:0.1em}
</style></head><body>
<div class="caption">CUSTOMER SATISFACTION · 2026</div>
<div class="ring"><span class="hero">98</span><span class="unit">점</span></div>
<div class="sub">고객 만족도</div>
<div class="delta">↗ 작년 대비 +12점</div>
<div class="footer">SERVICE QUALITY INDEX</div>
</body></html>`,
    },

    step_flow: {
      name: 'Step Flow · 단계·절차',
      guide: '1→2→3 번호 배지(48px 원, 강조색 배경). 단계 사이 세로 연결선(2px, 옅은 강조색). 각 단계 = [타이틀 20px weight:700 + 설명 14px + 핵심값 강조색]. 3~4단계가 최적.',
      example: `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{width:390px;height:693px;background:#0f1419;color:#e5e7eb;font-family:-apple-system,'Pretendard',sans-serif;padding:56px 36px 40px;word-break:keep-all;overflow:hidden}
h1{font-size:32px;font-weight:900;letter-spacing:-0.02em;margin-bottom:36px;color:#fff;line-height:1.2}
h1 span{color:#fbbf24}
.step{display:flex;gap:20px;margin-bottom:36px;align-items:flex-start;position:relative}
.step::after{content:'';position:absolute;left:23px;top:58px;width:2px;height:42px;background:#fbbf24;opacity:0.3}
.step:last-child::after{display:none}
.num{width:48px;height:48px;border-radius:50%;background:#fbbf24;color:#0f1419;font-size:22px;font-weight:900;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.body{padding-top:6px}
.title{font-size:20px;font-weight:700;color:#fff;margin-bottom:6px}
.desc{font-size:14px;color:#9ca3af;line-height:1.5}
.key{color:#fbbf24;font-weight:700}
</style></head><body>
<h1>커피 추출<br><span>3단계</span></h1>
<div class="step"><div class="num">1</div><div class="body"><div class="title">미세 분쇄</div><div class="desc">원두를 <span class="key">에스프레소 굵기</span>로 균일하게</div></div></div>
<div class="step"><div class="num">2</div><div class="body"><div class="title">탬핑</div><div class="desc"><span class="key">30파운드</span> 압력으로 수평 탬핑</div></div></div>
<div class="step"><div class="num">3</div><div class="body"><div class="title">추출</div><div class="desc"><span class="key">25초</span>간 크레마 형성</div></div></div>
</body></html>`,
    },

    manifesto: {
      name: 'Manifesto · 철학·선언·인용',
      guide: 'NYT Opinion 스타일. 거대한 장식 따옴표(120~160px, 강조색, Georgia serif, 반투명 0.8). 선언문 헤드라인 60~80px weight:900 · letter-spacing -0.04em. 핵심 단어 1개만 강조색으로. 하단에 속성/출처(11~13px · uppercase · 상단 1px 구분선).',
      example: `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{width:390px;height:693px;background:#0a0a0a;color:#f5f5f5;font-family:-apple-system,'Pretendard',sans-serif;padding:72px 36px 48px;display:flex;flex-direction:column;justify-content:flex-start;word-break:keep-all;position:relative;overflow:hidden}
.quote-mark{position:absolute;top:60px;left:32px;font-size:140px;color:#ef4444;line-height:0.6;font-family:Georgia,serif;opacity:0.85}
.hero{font-size:72px;font-weight:900;line-height:1.05;letter-spacing:-0.04em;color:#fff;margin-bottom:32px}
.hero em{color:#ef4444;font-style:normal}
.context{font-size:17px;line-height:1.55;color:#a3a3a3;margin-bottom:48px;max-width:310px}
.attribute{font-size:11px;color:#525252;letter-spacing:0.2em;text-transform:uppercase;border-top:1px solid #262626;padding-top:16px}
</style></head><body>
<div class="quote-mark">"</div>
<div class="hero">첫 <em>3초</em>가<br>전부입니다</div>
<div class="context">그 순간 매장의 인상이 결정되고, 재방문 여부가 갈립니다.</div>
<div class="attribute">— SOP 서비스 철학</div>
</body></html>`,
    },

    side_by_side: {
      name: 'Side-by-Side · 비교·대비',
      guide: '화면을 상하 분할. 잘못된 쪽은 레드 톤, 올바른 쪽은 그린 톤. 각 영역에 인라인 SVG 아이콘(48px, ✕ 또는 ✓ 를 stroke-width:3 으로 직접 그리기 — 이모지 금지) + 라벨(12px uppercase) + 핵심 문구(20~24px weight:800). 분할 영역은 body 전체(693px)를 활용.',
      example: `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{width:390px;height:693px;font-family:-apple-system,'Pretendard',sans-serif;word-break:keep-all;overflow:hidden;background:#0a0a0a;position:relative}
.stack{display:grid;grid-template-rows:1fr 1fr;height:693px}
.half{padding:40px 32px;display:flex;flex-direction:column;justify-content:center;align-items:flex-start;position:relative}
.bad{background:linear-gradient(135deg,#450a0a,#7f1d1d);color:#fca5a5}
.good{background:linear-gradient(135deg,#14532d,#166534);color:#bbf7d0}
.icon{width:52px;height:52px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin-bottom:14px}
.bad .icon{background:rgba(239,68,68,0.15);border:2px solid #ef4444}
.good .icon{background:rgba(74,222,128,0.15);border:2px solid #4ade80}
.icon svg{width:24px;height:24px;stroke-width:3;fill:none;stroke-linecap:round}
.bad .icon svg{stroke:#fca5a5}
.good .icon svg{stroke:#bbf7d0}
.label{font-size:11px;letter-spacing:0.25em;text-transform:uppercase;opacity:0.75;margin-bottom:10px;font-weight:800}
.msg{font-size:21px;font-weight:800;line-height:1.3;color:#fff}
</style></head><body>
<div class="stack">
  <div class="half bad"><div class="icon"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></div><div class="label">Wrong</div><div class="msg">손님을 쳐다보지 않고 인사</div></div>
  <div class="half good"><div class="icon"><svg viewBox="0 0 24 24"><path d="M5 12l5 5L20 7"/></svg></div><div class="label">Right</div><div class="msg">눈을 맞추고<br>3초간 미소</div></div>
</div>
</body></html>`,
    },

    checklist_grid: {
      name: 'Checklist Grid · 점검표·리스트',
      guide: '상단 제목(26~32px weight:900) + 서브 라벨(13px uppercase). 5~8개 항목 세로 리스트. 각 항목 = [번호 배지 32px 정사각 rounded + 이름 17px weight:600 + 짧은 부가설명 13px muted]. **이모지 금지** — 아이콘이 꼭 필요하면 인라인 SVG(stroke-width:1.8, 단색)로 직접 그리거나, 아예 생략하고 번호+텍스트만으로 구성. 체크표시는 인라인 SVG 체크마크로.',
      example: `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{width:390px;height:693px;background:#0f172a;color:#e2e8f0;font-family:-apple-system,'Pretendard',sans-serif;padding:48px 36px 40px;word-break:keep-all;overflow:hidden}
h1{font-size:26px;font-weight:900;line-height:1.25;margin-bottom:6px;color:#fff;letter-spacing:-0.02em}
.sub{font-size:12px;color:#64748b;letter-spacing:0.2em;text-transform:uppercase;margin-bottom:24px;font-weight:700}
.item{display:flex;align-items:flex-start;gap:14px;padding:12px 0;border-bottom:1px solid #1e293b}
.item:last-child{border-bottom:none}
.num{width:28px;height:28px;border-radius:8px;background:#1e293b;color:#60a5fa;font-size:12px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-variant-numeric:tabular-nums}
.body{flex:1;padding-top:2px}
.name{font-size:15px;font-weight:700;color:#f1f5f9;margin-bottom:2px;line-height:1.35}
.desc{font-size:12px;color:#64748b;line-height:1.4}
.check{width:18px;height:18px;margin-top:4px;flex-shrink:0}
.check circle{fill:#1e40af;opacity:0.3}
.check path{stroke:#60a5fa;stroke-width:2.5;fill:none;stroke-linecap:round;stroke-linejoin:round}
</style></head><body>
<h1>오픈 전 점검</h1>
<div class="sub">5 Point Checklist</div>
<div class="item"><div class="num">01</div><div class="body"><div class="name">조명 밝기</div><div class="desc">전 구역 420~450 lux 유지</div></div><svg class="check" viewBox="0 0 20 20"><circle cx="10" cy="10" r="9"/><path d="M6 10l3 3 5-5"/></svg></div>
<div class="item"><div class="num">02</div><div class="body"><div class="name">배경 음악</div><div class="desc">58~62dB · 보사노바 플레이리스트</div></div><svg class="check" viewBox="0 0 20 20"><circle cx="10" cy="10" r="9"/><path d="M6 10l3 3 5-5"/></svg></div>
<div class="item"><div class="num">03</div><div class="body"><div class="name">실내 온도</div><div class="desc">여름 24°C · 겨울 22°C</div></div><svg class="check" viewBox="0 0 20 20"><circle cx="10" cy="10" r="9"/><path d="M6 10l3 3 5-5"/></svg></div>
<div class="item"><div class="num">04</div><div class="body"><div class="name">공간의 향기</div><div class="desc">시그니처 디퓨저 레벨 3</div></div><svg class="check" viewBox="0 0 20 20"><circle cx="10" cy="10" r="9"/><path d="M6 10l3 3 5-5"/></svg></div>
<div class="item"><div class="num">05</div><div class="body"><div class="name">인테리어 정돈</div><div class="desc">의자 정렬 · 먼지 · 지문 제거</div></div><svg class="check" viewBox="0 0 20 20"><circle cx="10" cy="10" r="9"/><path d="M6 10l3 3 5-5"/></svg></div>
</body></html>`,
    },

    warning_callout: {
      name: 'Warning Callout · 경고·주의',
      guide: '상단+하단에 경고 스트라이프(repeating-linear-gradient 노랑/다크). **인라인 SVG 삼각형 경고 아이콘**(120~140px, 노랑 stroke+투명 fill, 중앙 느낌표) — 이모지 ⚠️ 금지. 라벨 "WARNING"(12px letter-spacing:0.3em). 헤드라인 36~44px weight:900, 핵심 단어는 노랑/주황 강조.',
      example: `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{width:390px;height:693px;background:#1c1917;color:#fef3c7;font-family:-apple-system,'Pretendard',sans-serif;padding:56px 36px 40px;word-break:keep-all;display:flex;flex-direction:column;align-items:center;text-align:center;position:relative;overflow:hidden}
body::before{content:'';position:absolute;top:0;left:0;right:0;height:10px;background:repeating-linear-gradient(-45deg,#facc15 0 18px,#1c1917 18px 36px)}
body::after{content:'';position:absolute;top:683px;left:0;right:0;height:10px;background:repeating-linear-gradient(-45deg,#facc15 0 18px,#1c1917 18px 36px)}
.warn-icon{width:120px;height:120px;margin-top:16px;margin-bottom:18px}
.warn-icon polygon{fill:none;stroke:#fbbf24;stroke-width:3;stroke-linejoin:round}
.warn-icon line{stroke:#fbbf24;stroke-width:6;stroke-linecap:round}
.warn-icon circle{fill:#fbbf24}
.label{font-size:12px;letter-spacing:0.3em;color:#fbbf24;font-weight:800;margin-bottom:18px}
.headline{font-size:38px;font-weight:900;line-height:1.2;color:#fff;margin-bottom:28px;letter-spacing:-0.02em}
.headline em{color:#fbbf24;font-style:normal}
.rules{font-size:16px;color:#fde68a;line-height:1.7;font-weight:500}
.rules strong{color:#fff;font-weight:700}
</style></head><body>
<svg class="warn-icon" viewBox="0 0 100 100"><polygon points="50,10 92,85 8,85"/><line x1="50" y1="38" x2="50" y2="62"/><circle cx="50" cy="74" r="3.5"/></svg>
<div class="label">W A R N I N G</div>
<div class="headline">위생 관리는<br><em>철저히</em></div>
<div class="rules">조리도구 <strong>매일 살균</strong><br>냉장고 <strong>4°C 이하</strong> 유지</div>
</body></html>`,
    },

    definition_card: {
      name: 'Definition Card · 용어·개념 정의',
      guide: '사전 페이지·위키 상단 박스 느낌. 카테고리 라벨 상단(11px uppercase, 강조색). 영문/원어(Georgia italic 18px, mid-gray). 용어 한글 52~64px weight:900 (Georgia+Pretendard 믹스). 짧은 구분선(40px × 3px 강조색). "DEFINITION" 라벨 + 정의 본문(19px line-height:1.55).',
      example: `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{width:390px;height:693px;background:#0a0a0a;color:#e5e5e5;font-family:-apple-system,'Pretendard',sans-serif;padding:68px 36px 40px;word-break:keep-all;position:relative;overflow:hidden}
.category{font-size:11px;letter-spacing:0.3em;color:#a78bfa;text-transform:uppercase;font-weight:700;margin-bottom:28px}
.term-en{font-size:17px;color:#737373;font-family:Georgia,serif;font-style:italic;margin-bottom:6px}
.term{font-size:48px;font-weight:900;color:#fff;letter-spacing:-0.03em;line-height:1.1;margin-bottom:32px;font-family:Georgia,'Pretendard',serif}
.divider{width:40px;height:3px;background:#a78bfa;margin-bottom:22px}
.def-label{font-size:10px;letter-spacing:0.25em;color:#a78bfa;text-transform:uppercase;font-weight:700;margin-bottom:12px}
.def{font-size:17px;line-height:1.55;color:#d4d4d4}
.def strong{color:#fff;font-weight:700}
.footer{position:absolute;top:520px;left:36px;right:36px;padding-top:14px;border-top:1px solid #262626;font-size:11px;color:#525252;letter-spacing:0.15em;text-transform:uppercase}
</style></head><body>
<div class="category">교육 철학 · Italy</div>
<div class="term-en">Reggio Emilia Approach</div>
<div class="term">레지오<br>에밀리아</div>
<div class="divider"></div>
<div class="def-label">Definition</div>
<div class="def">아이를 작은 어른이 아닌 <strong>유능한 탐구자</strong>로 보는 이탈리아 교육 철학. <strong>환경이 셋째 교사</strong>다.</div>
<div class="footer">Early Childhood Education</div>
</body></html>`,
    },

    tip_card: {
      name: 'Tip Card · 팁·비법·노하우',
      guide: '포스트잇/힌트박스 느낌. "TIP" pill 배지(강조색 pill, 13px weight:900 uppercase) 상단 좌측 — 이모지 금지, 텍스트만 또는 인라인 SVG 아이콘(작은 별/체크). 핵심 비법 문장 36~44px weight:900, 핵심 단어 강조색. 하단 시각 블록(border-left 3px 강조색, 어두운 bg)에 핵심 수치/시간 크게 표시.',
      example: `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{width:390px;height:693px;background:#0f1419;color:#e5e7eb;font-family:-apple-system,'Pretendard',sans-serif;padding:64px 36px 40px;word-break:keep-all;display:flex;flex-direction:column;justify-content:flex-start;overflow:hidden}
.badge{display:inline-flex;align-items:center;gap:8px;background:#fbbf24;color:#0f1419;padding:7px 14px;border-radius:999px;font-size:12px;font-weight:900;letter-spacing:0.12em;align-self:flex-start;margin-bottom:28px;text-transform:uppercase}
.badge svg{width:14px;height:14px;fill:#0f1419}
.headline{font-size:42px;font-weight:900;line-height:1.2;letter-spacing:-0.02em;color:#fff;margin-bottom:24px}
.headline em{color:#fbbf24;font-style:normal}
.method{font-size:17px;line-height:1.6;color:#9ca3af;margin-bottom:32px}
.method strong{color:#fbbf24;font-weight:700}
.visual{background:#1f2937;border-left:3px solid #fbbf24;padding:20px 24px;border-radius:0 12px 12px 0;font-size:15px;color:#e5e7eb;line-height:1.5}
.visual .time{font-size:28px;font-weight:900;color:#fbbf24;display:block;margin-bottom:4px;letter-spacing:-0.02em}
</style></head><body>
<div class="badge"><svg viewBox="0 0 24 24"><path d="M12 2l2.6 7.6H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.5 2.4-7.4L2 9.6h7.4z"/></svg>TIP</div>
<div class="headline">김치찌개<br>맛내는 <em>비법</em></div>
<div class="method">묵은지를 약불에 <strong>15분간</strong> 볶아 신맛을 날린 후 국물을 부어주세요.</div>
<div class="visual"><span class="time">15분</span>약불 볶기 → 신맛 제거</div>
</body></html>`,
    },
  };

  // ============================================
  // PASS 1 프롬프트 — 핵심 분석 (JSON 출력)
  // ============================================
  function buildPass1Prompt(narration, style, lang) {
    const lcode = lang || detectLang(narration);
    const lname = langName(lcode);
    return `당신은 정보 설계 전문가입니다. 아래 SOP 교육 나레이션의 **본질과 시각 구조**를 분석하세요.
Edward Tufte, Otto Neurath(Isotype), Kurzgesagt, NYT 그래픽팀 수준으로 생각하세요.

[CRITICAL · 출력 언어 = ${lname}]
모든 텍스트 필드(core_message, hero_text, hero_unit, sub_keywords, description_short, body_items[].title, body_items[].desc 등)는 **반드시 ${lname}로만** 작성하세요.
- 다른 언어 단어를 1개도 섞지 말 것 (예: ${lcode === 'vi' ? '베트남어 결과에 한국어/영어 단어 금지' : lcode === 'en' ? 'English 결과에 한국어/베트남어 단어 금지' : '한국어 결과에 영어/베트남어 단어 금지'})
- 시스템 키(scene_type, emotional_tone, palette, visual_concept, reasoning) 만 영어 enum 그대로 둘 것

[나레이션]
${narration}

[스타일 방향]
${STYLE_HINTS[style] || STYLE_HINTS.auto}

[분석 단계 — 순서대로 추론]
1. **본질 추출**: 이 나레이션이 시청자에게 전달하려는 **단 하나의 핵심 메시지**는?
2. **씬 유형 판정**: 아래 8개 씬 스타일 중 **정확히 1개** 선택
   - **stat_hero**: 수치·성과·통계 강조
   - **step_flow**: 단계·절차·순서
   - **manifesto**: 철학·선언·인용문
   - **side_by_side**: 비교·대비
   - **checklist_grid**: 점검표·리스트
   - **warning_callout**: 경고·주의
   - **definition_card**: 용어·개념 정의
   - **tip_card**: 팁·비법·노하우
3. **데이터 추출**: 수치·퍼센트·단위·비교값·시간이 있으면 전부 뽑아내기
4. **타이포 히어로**: 화면에서 가장 크게 표시할 **1개 단어/숫자/구절**
5. **보조 키워드**: 2~3개
6. **감정 톤**: 자신감/긴장/따뜻함/엄숙/경각심/기쁨/친근 중 택 1
7. **팔레트**: 다크 배경 필수
8. **시각 메타포(visual_concept)**: 나레이션을 상징하는 **기하학적 컨셉**을 짧은 영어/한글 키워드로 1~2개 (예: "ring+arrow", "staircase", "waveform", "hourglass", "radar-chart", "triangle-warning"). **이모지 금지** — 이 필드는 Pass 2 가 인라인 SVG 로 그리기 위한 스케치 힌트.

⚠️ **길이 제약 (9:16 세로 모바일 390×693px에 반드시 fit 되어야 함 — 절대 규칙)**
- \`hero_text\`: **최대 8자**
- \`hero_unit\`: **최대 4자**
- \`core_message\`: **최대 30자**
- \`sub_keywords\` 각: **최대 8자**
- \`key_data[].label\`: **최대 10자**, \`.value\`: **최대 6자**
- \`description_short\`: **최대 50자**, 1~2줄
- \`body_items\`(단계/체크/비교 시): \`[{title:≤15자, desc:≤40자}]\` 최대 4개
- 원본 나레이션 그대로 복사 금지. 반드시 **압축/재작성**

[출력 형식 — 반드시 유효한 JSON만, 설명 금지]
\`\`\`json
{
  "core_message": "고객 만족도 98점 돌파",
  "scene_type": "stat_hero",
  "key_data": [{"label":"만족도","value":"98","unit":"점","delta":"+12"}],
  "hero_text": "98",
  "hero_unit": "점",
  "sub_keywords": ["고객 만족","서비스 품질"],
  "description_short": "3개월간 지속적 개선 결과, 역대 최고치 달성",
  "body_items": [],
  "emotional_tone": "자신감",
  "palette": {"bg":"#0a0e1a","main":"#60a5fa","accent":"#fbbf24"},
  "visual_concept": "ring+upward-arrow",
  "reasoning": "핵심이 수치(98점)이므로 stat_hero, 상승이므로 자신감 톤. 원형 게이지+상향 화살표로 시각화."
}
\`\`\`
반드시 코드블록으로 감싸고 JSON만 출력하세요.`;
  }

  // ============================================
  // PASS 2 프롬프트 — 고품질 HTML 디자인
  // ============================================
  function buildPass2Prompt(analysis, narration, style, lang) {
    const template = STYLE_TEMPLATES[analysis.scene_type] || STYLE_TEMPLATES.stat_hero;
    const availableTypes = Object.keys(STYLE_TEMPLATES).join(' / ');
    const lcode = lang || detectLang(narration);
    const lname = langName(lcode);
    const wordBreak = lcode === 'vi'
      ? 'word-break:normal; overflow-wrap:break-word' // 베트남어는 띄어쓰기 단어 분할 OK
      : lcode === 'en'
        ? 'word-break:normal; overflow-wrap:break-word'
        : 'word-break:keep-all'; // 한국어 어절 단위 줄바꿈

    return `당신은 **Kurzgesagt + NYT Graphics + 교과서 편집 디자이너**를 합친 세계 최고의 에디토리얼 디자이너입니다. SOP 교육 영상의 한 씬을 **9:16 세로 모바일** HTML+CSS로 제작하세요.

[CRITICAL · 출력 언어 = ${lname}]
HTML 본문에 표시되는 **모든 텍스트(제목·본문·캡션·라벨·footer)** 는 반드시 ${lname}로만 작성하세요.
- 예시 템플릿에 한국어 텍스트가 있어도, 실제 출력은 ${lname}로 번역해서 넣을 것
- 다른 언어 단어를 단 1개도 섞지 마세요
- font-family / 시스템 폰트 / CSS 속성명은 그대로 영어 유지
- ${lcode === 'vi' ? '베트남어 성조 마크(diacritics)가 깨지지 않게 charset utf-8 필수' : lcode === 'en' ? 'English text — no foreign characters' : '한국어 — 영어/베트남어 단어 금지'}

[Pass 1 분석 결과 — 반드시 반영]
${JSON.stringify(analysis, null, 2)}

[원본 나레이션 — 참고용, 절대 통째로 복사 금지]
${narration}

⚠️ **최우선 규칙: 원본 나레이션을 문장 그대로 HTML에 넣지 마세요.**
반드시 Pass 1의 압축된 필드만 사용:
- 메인 타이포: \`hero_text\` + \`hero_unit\`
- 헤드라인: \`core_message\` 또는 \`hero_text\` 파생
- 본문: \`description_short\` (또는 \`body_items\` 있으면 우선)
- 보조: \`sub_keywords\`
원본 나레이션 모든 문장을 담으려 하면 **반드시 오버플로우 발생**합니다.

[전체 스타일 방향]
${STYLE_HINTS[style] || STYLE_HINTS.auto}

════════════════════════════════════════
🎬 이 씬의 전용 스타일: ${template.name}
════════════════════════════════════════
(Pass 1이 8개 씬 스타일 [${availableTypes}] 중 **${analysis.scene_type}** 를 선택)

**스타일 가이드**
${template.guide}

**이 스타일 참고 예시 (복붙 금지, 구조만 참고)**
\`\`\`html
${template.example}
\`\`\`

════════════════════════════════════════
🚫 이모지 금지 규칙 (최우선·절대 규칙)
════════════════════════════════════════
- 이모지(😀💡⚠️📈🎵🌡️🌸✨⭕❌✅🔥 등 **모든 이모지**)를 **절대** HTML 본문에 쓰지 마세요.
- 아이콘이 필요하면 반드시 아래 중 하나:
  (a) **인라인 SVG** — \`<svg viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="2">…<path/>…</svg>\` 형태로 직접 도형 그리기 (체크✓, X, 화살표, 삼각형, 원, 별, 물결 등)
  (b) **CSS 기하 도형** — \`border-radius\`, \`clip-path\`, \`conic-gradient\`, \`linear-gradient\`, \`::before/::after\` 로 링·바·삼각형·리본 등 구성
  (c) **순수 타이포/숫자** — 아이콘 없이 번호 배지·거대 숫자로만
- Pass 1 \`visual_concept\` ("${analysis.visual_concept || analysis.visual_metaphor || ''}") 를 SVG/CSS 로 **실제로 그려서** 씬의 주인공으로 배치하세요. 텍스트만 쓰지 말고 시각화하세요.
- 유일한 예외: 국기(🇰🇷🇺🇸) 는 허용. 그 외 모든 이모지 금지.

════════════════════════════════════════
📚 교과서 인포그래픽 공통 12 원칙 (반드시 준수)
════════════════════════════════════════
1. **Tufte Data-Ink Ratio** — 정보를 돕지 않는 장식 제거
2. **Swiss Grid** — 가상 그리드에 정렬
3. **Typography Hierarchy 3-tier** — 히어로 : 서브 : 캡션 최소 3배 차이
4. **3+1 Color Rule** — Pass1 팔레트(\`${JSON.stringify(analysis.palette || {})}\`) + 회색/흰색만
5. **One Screen, One Message** — core_message 하나만
6. **Isotype** — 수치는 반복 아이콘(SVG)/바/링으로 직관화
7. **Kurzgesagt Palette** — 다크 배경 + 미드톤 액센트
8. **Khan Academy Color Coding** — 같은 개념 같은 색
9. **NYT Editorial** — 인용/선언 거대, 출처/설명 작게
10. **수치 시각화 의무** — key_data 있으면 반드시 시각화 (SVG ring/bar 등)
11. **Negative Space** — 중앙 요소 주변 최소 40px 여백
12. **Custom Illustration** — 이모지가 아닌 SVG/CSS 로 직접 그려서 디자인 수준 보여주기

════════════════════════════════════════
⚙️ 기술 제약 (절대 규칙)
════════════════════════════════════════
- 컨테이너: **width:390px, height:693px, overflow:hidden** (예외 없음)
- **외부 리소스 완전 금지** — \`@font-face\`, \`@import\`, \`<link rel="stylesheet">\`, \`src: url('https://...')\`, \`<script src>\`, \`<img src="https://...">\` 전부 **절대 금지**. CDN URL 단 하나도 넣지 마세요 (jsdelivr, fonts.googleapis.com 등 포함). 모든 스타일은 \`<style>\` 태그 안 인라인 CSS 로만.
- 시스템 폰트만 사용: \`font-family: -apple-system, 'Pretendard', sans-serif\` (Pretendard 는 사용자 기기에 있으면 적용되고 없으면 시스템 폰트로 폴백 — @font-face 로 불러오지 말 것)
- 배경은 반드시 다크
- 줄바꿈 규칙 (언어별): \`${wordBreak}\`
- JavaScript 금지

════════════════════════════════════════
📐 레이아웃 안전 규칙 (오버플로우 방지)
════════════════════════════════════════
- **모든 콘텐츠는 693px 안에 완전히 들어가야 함.** 스크롤/잘림 절대 금지
- 글자 길이 제한:
  · 히어로 타이포: **최대 12자** (1줄, 폰트 60~160px)
  · 헤드라인: **최대 30자** (1~2줄, 폰트 28~42px)
  · 본문/설명: **최대 80자** (3~4줄, 폰트 14~18px)
  · 단계/체크/비교 아이템: **최대 4개** (제목 15자, 본문 40자)
- 콘텐츠 많으면 **폰트·여백 축소 우선**
- 그래도 안 맞으면 **요소 삭제** (sub_keywords 생략 가능)

════════════════════════════════════════
📐 하단 여백 가이드 (자막은 iframe 밖 별도 블록)
════════════════════════════════════════
자막은 iframe **외부 별도 블록**에 분리 렌더링되므로 body 하단에 특별한 safe zone 이 **필요하지 않습니다**.
단, 시각적 호흡을 위해 body 하단 여백은 최소 32~48px 권장:
- \`body { padding: 56px 36px 40px; ... }\` 같은 자연스러운 여백 사용
- y=0~693 전체 영역을 자유롭게 활용 (과거 하단 130px 금지 규칙은 폐기)
- position:absolute; bottom:8~24px 에 footer 장식 배치 가능
- 하단 행 grid-template-rows 도 제약 없음 (693px 전체가 자유 캔버스)

════════════════════════════════════════
🎯 자가 검증 체크리스트 (출력 전 재확인)
════════════════════════════════════════
☐ body가 정확히 width:390px height:693px overflow:hidden인가?
☐ 모든 텍스트/요소가 693px 안에 완전히 들어가는가?
☐ 원본 나레이션을 문장 그대로 복사하지 않았는가?
☐ Pass1.hero_text가 가장 크게 표시되었는가?
☐ 색상 4개 이내?
☐ ${template.name} 가이드 준수?
☐ **이모지(💡⚠️✅❌📈 등) 가 HTML 본문에 단 하나도 없는가?** (국기 제외)
☐ 시각 요소는 전부 인라인 SVG 또는 CSS 기하 도형으로 직접 그렸는가?
☐ visual_concept 을 실제 SVG/CSS 아트로 구현했는가?
☐ 하단 여백(padding-bottom 또는 bottom) 이 32~48px 이상이어서 시각적 호흡이 있는가?
☐ **@font-face, @import, <link>, url('https://...'), <script src>, <img src="https://..."> 가 하나도 없는가?** (외부 리소스 완전 금지)

════════════════════════════════════════
📤 출력 — 설명 없이 HTML 코드블록만
════════════════════════════════════════
\`\`\`html
<!DOCTYPE html>
...
\`\`\``;
  }

  // ============================================
  // API 호출 헬퍼 (Gemini / Claude 공통)
  // ============================================
  async function callModel({ prompt, model, maxTokens = 8192, temperature = 0.8, thinkingBudget = 0, signal }) {
    const isClaude = model.startsWith('claude-');
    let res, data, raw;

    if (isClaude) {
      res = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, model, temperature, max_tokens: maxTokens }),
        signal,
      });
      data = await res.json();
      if (!res.ok) throw new Error(data.error || data.hint || 'Claude 호출 실패');
      raw = data.content?.[0]?.text || '';
    } else {
      const genCfg = { temperature, maxOutputTokens: maxTokens };
      if (thinkingBudget > 0) genCfg.thinkingConfig = { thinkingBudget };
      res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, model, generationConfig: genCfg }),
        signal,
      });
      data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gemini 호출 실패');
      raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }
    if (!raw) throw new Error('빈 응답');

    let inTok = 0, outTok = 0;
    if (isClaude) {
      inTok = data.usage?.input_tokens || 0;
      outTok = data.usage?.output_tokens || 0;
    } else {
      inTok = data.usageMetadata?.promptTokenCount || 0;
      outTok = data.usageMetadata?.candidatesTokenCount || 0;
    }
    const rate = RATES[model] || { in: 1, out: 5 };
    const cost = (inTok * rate.in + outTok * rate.out) / 1_000_000;

    return { raw, inTok, outTok, cost };
  }

  // ============================================
  // JSON / HTML 추출
  // ============================================
  function extractBlock(raw, lang) {
    const re = new RegExp('```(?:' + lang + ')?\\s*([\\s\\S]*?)```', 'i');
    const m = raw.match(re);
    return m ? m[1].trim() : raw.trim();
  }

  function extractHtml(raw) {
    let html = extractBlock(raw, 'html');
    if (!/^<!DOCTYPE/i.test(html) && !/^<html/i.test(html)) {
      html = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="margin:0;padding:0">${html}</body></html>`;
    }
    return html;
  }

  // ============================================
  // (Deprecated) Safe Zone enforcer
  // 자막이 iframe 밖 별도 블록으로 분리되면서 더 이상 필요 없음.
  // 기존 노출 API 호환 목적으로 no-op 로 보존 (외부 호출자를 막지 않음).
  // ============================================
  function enforceSafeZone(html) {
    return html;
  }

  function extractJson(raw) {
    const text = extractBlock(raw, 'json');
    try { return JSON.parse(text); }
    catch (e) {
      const m = text.match(/\{[\s\S]*\}/);
      if (m) return JSON.parse(m[0]);
      throw new Error('Pass 1 JSON 파싱 실패: ' + e.message);
    }
  }

  // ============================================
  // MAIN: 2-Pass 생성
  // ============================================
  async function generateInfographic(narration, opts = {}) {
    const {
      model = 'gemini-2.5-pro',
      pass1Model = null,   // 옵션: Pass 1을 Flash로 해서 비용 절감
      style = 'auto',
      signal,
      onProgress,           // (phase, message) => void
    } = opts;

    if (!narration || !narration.trim()) throw new Error('나레이션이 비어 있음');

    const p1Model = pass1Model || model;
    const t0 = performance.now();
    let pass1 = { in: 0, out: 0, cost: 0 };
    let pass2 = { in: 0, out: 0, cost: 0 };

    // 나레이션 언어 1회 감지 → Pass 1/2 양쪽에 전달 (출력 언어 강제)
    const lang = detectLang(narration);

    // --- Pass 1: 분석 ---
    if (onProgress) onProgress('pass1', `🧠 Pass 1/2 · ${p1Model} 분석 중... (${lang.toUpperCase()})`);
    const p1Prompt = buildPass1Prompt(narration.trim(), style, lang);
    const p1 = await callModel({
      prompt: p1Prompt,
      model: p1Model,
      maxTokens: 8192,
      temperature: 0.5,
      thinkingBudget: 4096,
      signal,
    });
    pass1 = { in: p1.inTok, out: p1.outTok, cost: p1.cost };

    let analysis;
    try { analysis = extractJson(p1.raw); }
    catch (e) { throw new Error('Pass 1 분석 실패: ' + e.message + ' — raw: ' + p1.raw.slice(0, 200)); }

    // --- Pass 2: 디자인 ---
    if (onProgress) onProgress('pass2', `🎨 Pass 2/2 · ${model} HTML 디자인 중... (${lang.toUpperCase()})`);
    const p2Prompt = buildPass2Prompt(analysis, narration.trim(), style, lang);
    const p2 = await callModel({
      prompt: p2Prompt,
      model,
      maxTokens: 8192,
      temperature: 0.85,
      thinkingBudget: 2048,
      signal,
    });
    pass2 = { in: p2.inTok, out: p2.outTok, cost: p2.cost };

    const html = extractHtml(p2.raw);
    const elapsed = (performance.now() - t0) / 1000;

    return {
      analysis,
      html,
      timeMs: Math.round(performance.now() - t0),
      elapsedSec: +elapsed.toFixed(1),
      tokens: {
        pass1: { in: pass1.in, out: pass1.out },
        pass2: { in: pass2.in, out: pass2.out },
        totalIn: pass1.in + pass2.in,
        totalOut: pass1.out + pass2.out,
      },
      cost: {
        pass1: pass1.cost,
        pass2: pass2.cost,
        total: pass1.cost + pass2.cost,
      },
    };
  }

  // ============================================
  // 오버플로우 검증 (iframe 로드 후 호출)
  // 반환: { ok: bool, actualH: number, overPx: number }
  // ============================================
  async function validateOverflow(iframe, targetHeight = 693) {
    try {
      const doc = iframe?.contentDocument;
      if (!doc || !doc.body) return { ok: false, err: 'no doc' };

      // fonts.ready 는 sandbox iframe 에서 종종 멈추므로 400ms 타임아웃 보호
      if (doc.fonts?.ready) {
        try {
          await Promise.race([
            doc.fonts.ready,
            new Promise(r => setTimeout(r, 400)),
          ]);
        } catch {}
      }
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      await new Promise(r => setTimeout(r, 80));

      const body = doc.body;
      const allElems = [...body.querySelectorAll('*')];
      const maxBottom = allElems.reduce((max, el) => {
        const b = el.getBoundingClientRect().bottom;
        return b > max ? b : max;
      }, 0);
      const scrollH = Math.max(body.scrollHeight, doc.documentElement.scrollHeight);
      const actualH = Math.max(maxBottom, scrollH);
      const overPx = Math.round(actualH - targetHeight);
      return { ok: overPx <= 6, actualH: Math.round(actualH), overPx };
    } catch (e) {
      return { ok: false, err: String(e) };
    }
  }

  // ============================================
  // Export (window.Infographic2Pass)
  // ============================================
  window.Infographic2Pass = {
    generate: generateInfographic,
    validateOverflow,
    enforceSafeZone,
    buildPass1Prompt,
    buildPass2Prompt,
    detectLang,    // 'ko' | 'en' | 'vi'
    langName,
    STYLE_TEMPLATES,
    STYLE_HINTS,
    RATES,
  };
})();
