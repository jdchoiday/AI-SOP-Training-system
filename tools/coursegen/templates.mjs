// templates.mjs — slide renderers for SOP training courses.
// Matches the style of the live courses (390x693 iframe slides, dark theme).
// All HTML uses single-quoted attributes only (no double quotes, no newlines inside a slide).

const FONT = "-apple-system,'Pretendard','Noto Sans',sans-serif";
const css = (bg) =>
  `*{margin:0;padding:0;box-sizing:border-box}body{width:390px;height:693px;background:${bg};color:#e5e7eb;font-family:${FONT};padding:52px 34px 40px;overflow:hidden}` +
  `.kicker{font-size:11px;font-weight:800;letter-spacing:0.22em;text-transform:uppercase;margin-bottom:8px}` +
  `h1{font-size:25px;font-weight:900;letter-spacing:-0.02em;line-height:1.2;color:#fff;margin-bottom:18px}`;
const docHtml = (bg, body) =>
  `<!DOCTYPE html><html><head><meta charset='UTF-8'><style>${css(bg)}</style></head><body>${body}</body></html>`;

// Icon paths use only L/M/Q/V/Z/H path commands (no 'C') so 'C' is a safe color token.
const ICONS = {
  clipboard: "<rect x='15' y='9' width='18' height='28' rx='2' fill='none' stroke='C' stroke-width='2.2'/><line x1='19' y1='17' x2='29' y2='17' stroke='C' stroke-width='2'/><line x1='19' y1='23' x2='29' y2='23' stroke='C' stroke-width='2'/><line x1='19' y1='29' x2='25' y2='29' stroke='C' stroke-width='2'/>",
  people: "<circle cx='24' cy='18' r='7' fill='none' stroke='C' stroke-width='2.2'/><path d='M12 38 Q12 27 24 27 Q36 27 36 38' fill='none' stroke='C' stroke-width='2.2'/>",
  bulb: "<circle cx='24' cy='20' r='10' fill='none' stroke='C' stroke-width='2.2'/><line x1='20' y1='33' x2='28' y2='33' stroke='C' stroke-width='2.2'/><line x1='21' y1='37' x2='27' y2='37' stroke='C' stroke-width='2.2'/>",
  brush: "<line x1='32' y1='10' x2='18' y2='30' stroke='C' stroke-width='3' stroke-linecap='round'/><path d='M18 30 l-6 8 l9 -3 z' fill='C'/>",
  eye: "<path d='M8 24 Q24 12 40 24 Q24 36 8 24 Z' fill='none' stroke='C' stroke-width='2.2'/><circle cx='24' cy='24' r='4' fill='none' stroke='C' stroke-width='2.2'/>",
  star: "<path d='M24 9 l4 10 11 1 -8 7 3 11 -10 -6 -10 6 3 -11 -8 -7 11 -1 z' fill='none' stroke='C' stroke-width='2'/>",
  flag: "<line x1='16' y1='9' x2='16' y2='40' stroke='C' stroke-width='2.4'/><path d='M16 11 L34 11 L30 18 L34 25 L16 25 Z' fill='none' stroke='C' stroke-width='2.2'/>",
  doc: "<rect x='13' y='9' width='22' height='30' rx='2' fill='none' stroke='C' stroke-width='2.2'/><line x1='18' y1='18' x2='30' y2='18' stroke='C' stroke-width='2'/><line x1='18' y1='24' x2='30' y2='24' stroke='C' stroke-width='2'/><line x1='18' y1='30' x2='26' y2='30' stroke='C' stroke-width='2'/>",
  broom: "<line x1='31' y1='9' x2='20' y2='26' stroke='C' stroke-width='2.4' stroke-linecap='round'/><path d='M13 39 L20 26 L31 32 Z' fill='none' stroke='C' stroke-width='2.2' stroke-linejoin='round'/>",
  box: "<path d='M12 18 L24 12 L36 18 L36 32 L24 38 L12 32 Z' fill='none' stroke='C' stroke-width='2.2' stroke-linejoin='round'/><line x1='12' y1='18' x2='24' y2='24' stroke='C' stroke-width='2'/><line x1='36' y1='18' x2='24' y2='24' stroke='C' stroke-width='2'/><line x1='24' y1='24' x2='24' y2='38' stroke='C' stroke-width='2'/>",
  shield: "<path d='M24 8 L38 13 V25 Q38 35 24 40 Q10 35 10 25 V13 Z' fill='none' stroke='C' stroke-width='2.2'/><path d='M17 24 l5 5 9 -10' stroke='C' stroke-width='2.4' fill='none' stroke-linecap='round' stroke-linejoin='round'/>",
  check: "<circle cx='24' cy='24' r='14' fill='none' stroke='C' stroke-width='2.4'/><path d='M17 24 l5 5 9 -10' stroke='C' stroke-width='2.6' fill='none' stroke-linecap='round' stroke-linejoin='round'/>",
  clock: "<circle cx='24' cy='24' r='15' fill='none' stroke='C' stroke-width='2.2'/><path d='M24 15 V24 L31 28' stroke='C' stroke-width='2.2' fill='none' stroke-linecap='round' stroke-linejoin='round'/>",
  bag: "<path d='M15 17 H33 L35 38 H13 Z' fill='none' stroke='C' stroke-width='2.2' stroke-linejoin='round'/><path d='M19 19 V15 Q19 10 24 10 Q29 10 29 15 V19' fill='none' stroke='C' stroke-width='2.2'/>",
};
const icon = (name, color = '#93c5fd') => (ICONS[name] || ICONS.check).replaceAll('C', color);

export function titleCard(kicker, titleHtml, theme = '#f59e0b') {
  const body =
    `<div style='height:100%;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center'>` +
    `<svg width='96' height='96' viewBox='0 0 48 48'>${icon('check', theme)}</svg>` +
    `<div style='font-size:13px;letter-spacing:0.3em;color:${theme};font-weight:800;margin:24px 0 14px'>${kicker}</div>` +
    `<div style='font-size:36px;font-weight:900;color:#fff;letter-spacing:-0.02em'>${titleHtml}</div>` +
    `<div style='width:60px;height:3px;background:${theme};margin-top:20px'></div></div>`;
  return docHtml('#0a0e1a', body);
}

function row(num, title, sub, theme, last) {
  return `<div style='display:flex;align-items:flex-start;gap:13px;padding:12px 0;${last ? '' : 'border-bottom:1px solid #1e293b'}'>` +
    `<div style='width:30px;height:30px;border-radius:9px;background:#1e293b;color:${theme};font-size:12px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0'>${num}</div>` +
    `<div style='flex:1;padding-top:3px'><div style='font-size:15px;font-weight:700;color:#f1f5f9;line-height:1.3'>${title}</div>` +
    (sub ? `<div style='font-size:12px;color:#64748b;margin-top:2px;line-height:1.4'>${sub}</div>` : '') + `</div></div>`;
}
export function listSlide(bg, kicker, h1, rows, theme = '#f59e0b') {
  const body = `<div class='kicker' style='color:${theme}'>${kicker}</div><h1>${h1}</h1>` +
    rows.map((r, i) => row(r[0], r[1], r[2] || '', theme, i === rows.length - 1)).join('');
  return docHtml(bg, body);
}

function stepEl(num, iconName, title, desc, theme, line) {
  return `<div style='display:flex;gap:15px;align-items:flex-start;position:relative;margin-bottom:${line ? 18 : 14}px;min-height:48px'>` +
    (line ? `<div style='position:absolute;left:27px;top:60px;width:2px;height:calc(100% - 44px);background:${theme};opacity:0.3'></div>` : '') +
    `<div style='width:54px;height:54px;border-radius:14px;background:#1f2937;display:flex;align-items:center;justify-content:center;flex-shrink:0;position:relative'>` +
    `<svg viewBox='0 0 48 48' width='34' height='34'>${icon(iconName)}</svg>` +
    `<div style='position:absolute;top:-7px;left:-7px;width:22px;height:22px;border-radius:50%;background:${theme};color:#0f1419;font-size:12px;font-weight:900;display:flex;align-items:center;justify-content:center'>${num}</div></div>` +
    `<div style='padding-top:5px'><div style='font-size:16px;font-weight:700;color:#fff;line-height:1.25'>${title}</div>` +
    `<div style='font-size:12.5px;color:#9ca3af;margin-top:3px;line-height:1.4'>${desc}</div></div></div>`;
}
function noteBox(label, text, theme) {
  return `<div style='margin-top:6px;padding:12px 14px;background:rgba(245,158,11,0.1);border-left:3px solid ${theme};border-radius:0 10px 10px 0'>` +
    `<div style='font-size:11px;font-weight:800;color:${theme};letter-spacing:0.1em;margin-bottom:5px'>${label}</div>` +
    `<div style='font-size:13px;color:#fde68a;line-height:1.5'>${text}</div></div>`;
}
export function stepsSlide(bg, kicker, h1, steps, theme = '#f59e0b', note = null) {
  const body = `<div class='kicker' style='color:${theme}'>${kicker}</div><h1>${h1}</h1>` +
    steps.map((s, i) => stepEl(s[0], s[1], s[2], s[3], theme, i !== steps.length - 1)).join('') +
    (note ? noteBox(note[0], note[1], theme) : '');
  return docHtml(bg, body);
}

export function closingCard(title, sub, theme = '#f59e0b') {
  const body =
    `<div style='height:100%;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center'>` +
    `<svg width='90' height='90' viewBox='0 0 48 48'>${icon('check', theme)}</svg>` +
    `<div style='font-size:34px;font-weight:900;color:#fff;margin-top:28px'>${title}</div>` +
    `<div style='font-size:14px;color:#94a3b8;margin-top:12px'>${sub}</div></div>`;
  return docHtml('#0a0e1a', body);
}
