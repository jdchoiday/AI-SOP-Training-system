// ============================================
// Edge TTS — Warm AI Coach Voice
// ============================================
// 따뜻한 코칭 AI가 교육하듯 읽는 TTS
//
// 핵심 전략:
// 1. 전체 맥락 파악 후 핵심 키워드 추출
// 2. 키워드 앞에 전략적 쉼(...)으로 강조
// 3. 문장 톤 패턴: 올림→내림→올림 (파도 리듬)
// 4. 도입부는 밝게, 중간은 리듬감, 마무리는 차분
// 5. 접속사/전환어에서 긴장 조성
// ============================================

const { EdgeTTS } = require('node-edge-tts');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const VOICES = {
  'ko-KR': { female: 'ko-KR-SunHiNeural', male: 'ko-KR-InJoonNeural' },
  'en-US': { female: 'en-US-AriaNeural', male: 'en-US-GuyNeural' },
  'vi-VN': { female: 'vi-VN-HoaiMyNeural', male: 'vi-VN-NamMinhNeural' },
};

const PRONUNCIATION_DICT = {
  'AION': '아이온', 'Aion': '아이온', 'aion': '아이온',
  'Kiwooza': '키우자', 'kiwooza': '키우자', 'KIWOOZA': '키우자',
  'SOP': '에스오피', 'POS': '포스', 'CCTV': '씨씨티비',
  'OJT': '오제이티', 'KPI': '케이피아이', 'MBTI': '엠비티아이',
  'QR': '큐알', 'WiFi': '와이파이', 'wifi': '와이파이', 'WIFI': '와이파이',
  'AI': '에이아이', 'CEO': '씨이오', 'VP': '브이피',
  'MOET': '모엣', 'Reggio': '레지오', 'Emilia': '에밀리아',
};

function applyPronunciation(text) {
  let result = text;
  const sortedKeys = Object.keys(PRONUNCIATION_DICT).sort((a, b) => b.length - a.length);
  for (const word of sortedKeys) {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?<![A-Za-z])${escaped}(?![A-Za-z])`, 'g');
    result = result.replace(regex, PRONUNCIATION_DICT[word]);
  }
  return result;
}

// ===== 1단계: 전체 맥락에서 핵심 키워드 추출 =====
// 나레이션 전체를 읽고, 이 씬에서 가장 중요한 2~3개 단어를 찾음
function extractStoryKeywords(text) {
  const keywords = new Set();

  // (A) 명시적 강조 표현 뒤의 핵심어 추출
  // "핵심은 X", "중요한 것은 X", "바로 X" 패턴
  const emphasisPatterns = [
    /(?:핵심은|핵심이|중요한 것은|중요한 점은)\s*([가-힣]+(?:\s[가-힣]+)?)/g,
    /(?:바로|특히|무엇보다)\s+([가-힣]{2,8})/g,
    /(?:이것이|이것은|이것이 바로)\s+([가-힣]+(?:\s[가-힣]+)?)/g,
  ];
  for (const p of emphasisPatterns) {
    let m;
    while ((m = p.exec(text)) !== null) {
      if (m[1] && m[1].length >= 2) keywords.add(m[1].trim());
    }
  }

  // (B) 반복 등장하는 명사 = 이 씬의 핵심 주제
  const nouns = text.match(/[가-힣]{2,6}(?=은|는|이|가|을|를|의|에|로|와|과|도)/g) || [];
  const freq = {};
  nouns.forEach(n => {
    if (n.length >= 2) freq[n] = (freq[n] || 0) + 1;
  });
  // 2번 이상 등장하는 단어 = 핵심 주제
  Object.entries(freq)
    .filter(([_, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .forEach(([word]) => keywords.add(word));

  // (C) 대비/전환 뒤의 핵심어
  const contrastMatch = text.match(/(?:하지만|그러나|반면|한편)\s+([가-힣]{2,10})/g);
  if (contrastMatch) {
    contrastMatch.forEach(m => {
      const word = m.replace(/^(하지만|그러나|반면|한편)\s+/, '');
      if (word.length >= 2) keywords.add(word);
    });
  }

  // (D) 첫 문장의 주어 = 이 씬의 주제
  const firstSentence = (text.match(/^[^.!?。]+/) || [''])[0];
  const subjectMatch = firstSentence.match(/^([가-힣A-Za-z\s]{2,15}?)(?:은|는|이|가)\s/);
  if (subjectMatch) keywords.add(subjectMatch[1].trim());

  return [...keywords].slice(0, 5); // 최대 5개
}

// ===== 2단계: 코칭 리듬으로 텍스트 재구성 =====
// 파도 패턴: ↗ 올림 → ↘ 내림 → ↗ 올림 → ↘ 내림
function buildCoachingText(text) {
  let processed = applyPronunciation(text);

  // 기호 정리
  processed = processed.replace(/\s*→\s*/g, ', ');
  processed = processed.replace(/\s*\/\s*/g, ', ');
  processed = processed.replace(/\s*—\s*/g, '. ');
  processed = processed.replace(/\[([^\]]+)\]/g, '$1.');

  // 맥락에서 핵심 키워드 추출
  const storyKeywords = extractStoryKeywords(processed);
  console.log(`[Coach] 핵심 키워드: [${storyKeywords.join(', ')}]`);

  // 문장 분리
  const sentences = processed.match(/[^.!?。]+[.!?。]?\s*/g) || [processed];
  const total = sentences.length;

  // 파도 톤 패턴 (올렸다 내렸다)
  // UP = 밝고 에너지 있게 → DOWN = 차분하고 깊게
  const tonePattern = ['UP', 'UP', 'DOWN', 'UP', 'DOWN', 'DOWN', 'UP', 'DOWN'];

  const parts = [];
  sentences.forEach((sent, i) => {
    let s = sent.trim();
    if (!s) return;

    const tone = tonePattern[i % tonePattern.length];
    const isFirst = (i === 0);
    const isLast = (i === total - 1);

    // 핵심 키워드 앞에 전략적 쉼 삽입 (문장당 최대 1개)
    let emphasized = false;
    for (const kw of storyKeywords) {
      if (s.includes(kw) && !emphasized) {
        // 키워드 앞에 "..." 쉼 → TTS가 잠시 멈추고 강조해서 읽음
        s = s.replace(kw, `... ${kw}`);
        emphasized = true;
      }
    }

    // 접속사 처리 — 대비/역접은 긴 쉼, 순접은 짧은 쉼
    s = s.replace(/^(하지만|그러나|그런데|반면에?|그럼에도)/,   '... $1,');  // 역접 = 긴장
    s = s.replace(/^(그리고|또한|게다가|뿐만 아니라)/,         ', $1');      // 순접 = 부드럽게
    s = s.replace(/^(즉|다시 말해|결국|따라서|그래서|결론적으로)/, '... $1,'); // 정리 = 강조

    // 문장 중간의 전환어
    s = s.replace(/,\s*(하지만|그러나|반면)/g, '... $1,');
    s = s.replace(/,\s*(특히|무엇보다|가장 중요한)/g, '... $1');

    // === 문장 위치별 리듬 부여 ===
    if (isFirst) {
      // 도입부: 에너지 있게 시작, 뒤에 호흡
      parts.push(s);
      parts.push('...');
    } else if (isLast) {
      // 마무리: 쉼 후 차분하게
      parts.push('...');
      parts.push(s);
    } else if (tone === 'DOWN' && s.length > 20) {
      // DOWN 톤: 차분하게 읽되, 끝에 짧은 쉼
      parts.push(s + ',');
    } else if (tone === 'UP') {
      // UP 톤: 에너지 있게, 끝에 약간의 쉼
      parts.push(s);
    } else {
      parts.push(s);
    }

    // 3~4문장마다 큰 호흡 (리듬 리셋)
    if (!isFirst && !isLast && i % 3 === 2) {
      parts.push('...');
    }
  });

  let result = parts.join(' ');

  // 정리: 과도한 쉼 제거
  result = result.replace(/\.{4,}/g, '...');
  result = result.replace(/,\s*\.\.\./g, '...');
  result = result.replace(/\.\.\.\s*\.\.\./g, '...');
  result = result.replace(/,\s*,/g, ',');
  result = result.replace(/\s{3,}/g, ' ');

  return result.trim();
}

// TTS 큐
let ttsQueue = Promise.resolve();
function enqueueTTS(fn) {
  ttsQueue = ttsQueue.then(fn).catch(err => {
    console.error('[TTS Queue] Error:', err.message);
  });
  return ttsQueue;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { text, lang = 'ko-KR', gender = 'female', rate, pitch } = req.body || {};

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'text is required' });
    }
    if (text.length > 3000) {
      return res.status(400).json({ error: 'Text too long (max 3000 chars)' });
    }

    const langVoices = VOICES[lang] || VOICES['ko-KR'];
    const voiceName = langVoices[gender] || langVoices.female;

    // 코칭 톤: 살짝 느리게 + 따뜻한 피치
    let prosodyRate = rate || '-5%';
    if (prosodyRate === 'default' || prosodyRate === '+0%') prosodyRate = '-5%';
    let prosodyPitch = pitch || '+3Hz';
    if (prosodyPitch === 'default' || prosodyPitch === '+0Hz') prosodyPitch = '+3Hz';

    const coachText = buildCoachingText(text);

    console.log(`[TTS Coach] voice=${voiceName} rate=${prosodyRate} pitch=${prosodyPitch}`);
    console.log(`[TTS Coach] original: ${text.slice(0, 60)}...`);
    console.log(`[TTS Coach] coached:  ${coachText.slice(0, 80)}...`);

    const tmpFile = path.join(os.tmpdir(), `tts_${crypto.randomBytes(8).toString('hex')}.mp3`);

    await enqueueTTS(async () => {
      const tts = new EdgeTTS({
        voice: voiceName,
        lang: lang,
        outputFormat: 'audio-24khz-96kbitrate-mono-mp3',
        rate: prosodyRate,
        pitch: prosodyPitch,
        volume: '+10%',
        timeout: 30000,
      });
      await tts.ttsPromise(coachText, tmpFile);
    });

    const audioBuffer = fs.readFileSync(tmpFile);
    try { fs.unlinkSync(tmpFile); } catch (e) {}

    if (audioBuffer.length < 100) {
      return res.status(500).json({ error: 'TTS generated empty audio' });
    }

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', audioBuffer.length);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.status(200).send(audioBuffer);

  } catch (err) {
    console.error('[TTS Error]', err.message);
    return res.status(500).json({ error: 'TTS generation failed: ' + err.message });
  }
};
