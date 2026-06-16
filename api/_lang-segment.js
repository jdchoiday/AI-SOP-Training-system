'use strict';
// ============================================
// 혼재 언어 나레이션 분할기 (영어 / 베트남어 / 한국어)
// ============================================
// 한 나레이션에 영어 구간과 베트남어 구간이 섞여 있으면(예: 영어 SOP 본문 +
// 베트남어 인트로·아웃트로) TTS 가 한 언어 음성으로 전체를 읽어 어색해진다.
// 이 모듈은 텍스트를 문장/줄 단위로 보고 "연속 같은 언어"끼리 묶어 구간 배열로 만든다.
// → 각 구간을 해당 언어 음성으로 합성하면 영어는 영어로, 베트남어는 베트남어로 읽힌다.
//
// 순수 함수(외부 의존성 없음) — api/tts.js 와 test/ 가 함께 require 한다.
// 클라이언트(js/slide-player.js) 는 같은 규칙을 별도로 인라인한다(브라우저 호환).

// 베트남어 고유 성조·모음 부호(정규결합형). 하나라도 있으면 베트남어로 본다.
const VI_CHARS = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
// 한글 음절/자모
const KO_CHARS = /[가-힯ㄱ-ㆎᄀ-ᇿ]/;
// 라틴 문자
const LATIN = /[A-Za-z]/;

// 한 조각(문장/줄)의 언어 판정.
//   한글 있으면 ko-KR (한국어 문장에 영어 단어가 박혀도 한국어로 — 기존 동작 보존)
//   베트남어 성조부호 있으면 vi-VN
//   라틴 문자만(성조·한글 없음) 있으면 en-US
//   글자가 전혀 없으면(숫자·기호·공백) null = 중립 → 인접 구간에 귀속
function unitLang(s) {
  if (KO_CHARS.test(s)) return 'ko-KR';
  if (VI_CHARS.test(s)) return 'vi-VN';
  if (LATIN.test(s)) return 'en-US';
  return null;
}

// 문장/줄 단위로 분리. 종결부호(. ! ? … 。 ！ ？) 뒤가 공백/문자열끝이거나 줄바꿈에서 자른다.
// (룩비하인드를 쓰지 않아 구형 브라우저에서도 동일하게 동작하도록 직접 스캔)
function splitUnits(text) {
  const str = String(text == null ? '' : text);
  const out = [];
  let buf = '';
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    buf += ch;
    if (ch === '\n') {
      const t = buf.trim();
      if (t) out.push(t);
      buf = '';
      continue;
    }
    if ('.!?…。！？'.indexOf(ch) !== -1) {
      const next = str[i + 1];
      // 다음 글자가 또 종결부호면(예: ".." "…") 계속 모은다. 공백/끝이면 한 조각 종료.
      if (next === undefined || /\s/.test(next)) {
        const t = buf.trim();
        if (t) out.push(t);
        buf = '';
      }
    }
  }
  const tail = buf.trim();
  if (tail) out.push(tail);
  return out;
}

// 혼재 텍스트 → [{ lang, text }, ...]  (연속 같은 언어는 병합, 등장 순서 보존)
//   defaultLang: 중립 조각만 있거나 앞뒤로 언어가 없을 때의 기본값.
function segmentByLang(text, defaultLang) {
  const def = defaultLang || 'ko-KR';
  const units = splitUnits(text).map(t => ({ t, lang: unitLang(t) }));
  if (!units.length) return [];

  // 중립(글자 없는) 조각은 가장 가까운 언어로 귀속(앞 우선 → 없으면 뒤 → 없으면 기본값).
  for (let i = 0; i < units.length; i++) {
    if (units[i].lang) continue;
    let j = i - 1;
    while (j >= 0 && !units[j].lang) j--;
    let k = i + 1;
    while (k < units.length && !units[k].lang) k++;
    units[i].lang = j >= 0 ? units[j].lang : (k < units.length ? units[k].lang : def);
  }

  // 연속 같은 언어 병합.
  const segs = [];
  for (const u of units) {
    const last = segs[segs.length - 1];
    if (last && last.lang === u.lang) last.text += ' ' + u.t;
    else segs.push({ lang: u.lang, text: u.t });
  }

  return segs
    .map(s => ({ lang: s.lang, text: s.text.replace(/\s{2,}/g, ' ').trim() }))
    .filter(s => s.text.length > 0);
}

module.exports = { segmentByLang, unitLang, splitUnits };
