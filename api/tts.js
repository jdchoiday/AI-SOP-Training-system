// ============================================
// Edge TTS API — AI Coach Voice
// ============================================
// 따뜻한 코치가 교육하듯 읽는 TTS
// - 핵심 키워드 강조 (억양 UP)
// - 문장별 톤 오르내림 (단조로움 방지)
// - 전략적 쉼 (긴장감 + 집중)
// - 마무리는 차분하게 (정리 톤)
// ============================================

const { EdgeTTS } = require('node-edge-tts');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

// Neural 음성 (가장 자연스러운 음성)
const VOICES = {
  'ko-KR': { female: 'ko-KR-SunHiNeural', male: 'ko-KR-InJoonNeural' },
  'en-US': { female: 'en-US-AriaNeural', male: 'en-US-GuyNeural' },
  'vi-VN': { female: 'vi-VN-HoaiMyNeural', male: 'vi-VN-NamMinhNeural' },
};

// 발음 사전
const PRONUNCIATION_DICT = {
  'AION': '아이온', 'Aion': '아이온', 'aion': '아이온',
  'Kiwooza': '키우자', 'kiwooza': '키우자', 'KIWOOZA': '키우자',
  'SOP': '에스오피', 'POS': '포스', 'CCTV': '씨씨티비',
  'OJT': '오제이티', 'KPI': '케이피아이', 'MBTI': '엠비티아이',
  'QR': '큐알', 'WiFi': '와이파이', 'wifi': '와이파이', 'WIFI': '와이파이',
  'AI': '에이아이', 'CEO': '씨이오', 'VP': '브이피',
  'MOET': '모엣', 'Reggio': '레지오', 'Emilia': '에밀리아',
};

// 강조할 키워드 패턴 (코치가 힘줘서 읽는 단어들)
const EMPHASIS_KEYWORDS = [
  // 핵심/중요 표현
  '핵심', '중요', '필수', '반드시', '꼭', '바로', '특히',
  '가장', '최고', '최선', '근본', '본질', '기초', '기반',
  // 교육 키워드
  '원칙', '철학', '가치', '목표', '비전', '전문성', '역량',
  '발달', '성장', '학습', '교육', '실천', '역할', '책임',
  // 감정/동기 키워드
  '함께', '우리', '여러분', '기억', '믿', '신뢰', '존중',
  // 전환 강조
  '첫째', '둘째', '셋째', '먼저', '다음', '마지막',
];

// 발음 사전 적용
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

// 문장 내 키워드에 강조 마킹
function markEmphasis(sentence) {
  let result = sentence;
  // 키워드 앞에 쉼 + 느리게 읽기 (강조 효과)
  for (const kw of EMPHASIS_KEYWORDS) {
    // 키워드가 포함된 단어 찾기 (예: "핵심" → "핵심적인", "핵심은")
    const regex = new RegExp(`(${kw}[가-힣]{0,3})`, 'g');
    if (regex.test(result)) {
      result = result.replace(regex, `... $1`);
      break; // 문장당 1개만 강조 (과하면 어색)
    }
  }
  return result;
}

// ===== 코칭 톤 텍스트 생성 =====
// 문장별로 톤을 오르내리며, 키워드는 강조
function buildCoachingText(text) {
  let processed = applyPronunciation(text);

  // 기호 정리
  processed = processed.replace(/\s*→\s*/g, ', ');
  processed = processed.replace(/\s*\/\s*/g, ', ');
  processed = processed.replace(/\s*—\s*/g, '... ');
  processed = processed.replace(/\[([^\]]+)\]/g, '$1,'); // [제목] → 제목,

  // 문장 분리
  const sentences = processed.match(/[^.!?。]+[.!?。]?\s*/g) || [processed];
  const total = sentences.length;

  const parts = [];
  sentences.forEach((sent, i) => {
    let s = sent.trim();
    if (!s) return;

    // 핵심 키워드 강조 (쉼 삽입)
    s = markEmphasis(s);

    // 접속사/전환어 앞에 자연스러운 쉼
    s = s.replace(/(하지만|그러나|그런데|반면|한편)/g, '... $1');
    s = s.replace(/(그리고|또한|게다가|뿐만 아니라)/g, ', $1');
    s = s.replace(/(즉|다시 말해|결국|따라서|그래서)/g, '... $1');

    // 문장 끝에 쉼 추가 (문장 간 호흡)
    if (i === 0) {
      // 첫 문장: 도입부 — 살짝 천천히, 뒤에 긴 쉼
      parts.push(s + '...');
    } else if (i === total - 1) {
      // 마지막 문장: 마무리 — 차분하게
      parts.push('... ' + s);
    } else if (i % 3 === 0) {
      // 3문장마다: 큰 쉼 (리듬감)
      parts.push(s + '...');
    } else {
      parts.push(s);
    }
  });

  // 중복 쉼 정리
  let result = parts.join(' ');
  result = result.replace(/\.{4,}/g, '...');
  result = result.replace(/,\s*,/g, ',');
  result = result.replace(/\s{3,}/g, ' ');

  return result.trim();
}

// TTS 동시 요청 제한
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

    // 음성 선택
    const langVoices = VOICES[lang] || VOICES['ko-KR'];
    const voiceName = langVoices[gender] || langVoices.female;

    // 코칭 톤 설정: 약간 느리게, 톤 살짝 올려서 따뜻하게
    let prosodyRate = rate || '-5%';
    if (prosodyRate === 'default' || prosodyRate === '+0%') prosodyRate = '-5%';
    let prosodyPitch = pitch || '+3Hz';
    if (prosodyPitch === 'default' || prosodyPitch === '+0Hz') prosodyPitch = '+3Hz';

    // 코칭 톤으로 텍스트 변환 (키워드 강조 + 억양 쉼)
    const coachText = buildCoachingText(text);

    console.log(`[TTS Coach] voice=${voiceName} rate=${prosodyRate} pitch=${prosodyPitch} chars=${coachText.length}`);

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

    // 임시 파일 정리
    try { fs.unlinkSync(tmpFile); } catch (e) { /* ignore */ }

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
