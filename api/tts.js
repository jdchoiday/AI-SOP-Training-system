// ============================================
// Edge TTS API Endpoint (Microsoft Neural Voices)
// ============================================
// POST /api/tts
// Body: { text, lang, gender, rate, pitch }
// Response: audio/mpeg binary
//
// 자연스러운 호흡을 위해 텍스트 전처리:
// - 문장 사이에 쉼표/마침표 보강
// - 긴 문장 내 자연스러운 끊어읽기 포인트 추가
// ============================================

const { EdgeTTS } = require('node-edge-tts');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

// 최고 품질 Neural 음성 매핑
const VOICES = {
  'ko-KR': { female: 'ko-KR-SunHiNeural', male: 'ko-KR-InJoonNeural' },
  'en-US': { female: 'en-US-JennyNeural', male: 'en-US-GuyNeural' },
  'vi-VN': { female: 'vi-VN-HoaiMyNeural', male: 'vi-VN-NamMinhNeural' },
};

// 브랜드/고유명사 발음 사전 (TTS가 잘못 읽는 단어 교정)
// 관리자가 추가 가능하도록 별도 객체로 분리
const PRONUNCIATION_DICT = {
  // 브랜드명
  'AION': '아이온',
  'Aion': '아이온',
  'aion': '아이온',
  'Kiwooza': '키우자',
  'kiwooza': '키우자',
  'KIWOOZA': '키우자',
  'SOP': '에스오피',
  'POS': '포스',
  'CCTV': '씨씨티비',
  'OJT': '오제이티',
  'KPI': '케이피아이',
  'MBTI': '엠비티아이',
  'QR': '큐알',
  'WiFi': '와이파이',
  'wifi': '와이파이',
  'WIFI': '와이파이',
  'AI': '에이아이',
  'CEO': '씨이오',
  'VP': '브이피',
};

// 한국어 텍스트를 자연스럽게 읽을 수 있도록 전처리
// 핵심: 과도한 쉼 제거, 실제 사람처럼 빠르게 읽되 핵심 구간만 끊기
function preprocessKoreanText(text) {
  let result = text;

  // 0. 발음 사전 적용 (긴 단어부터 먼저 치환하여 부분 매칭 방지)
  const sortedKeys = Object.keys(PRONUNCIATION_DICT).sort((a, b) => b.length - a.length);
  for (const word of sortedKeys) {
    // 단어 경계를 고려한 치환 (예: "AION" → "아이온", 단 "CAION" 같은건 안 바꿈)
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?<![A-Za-z])${escaped}(?![A-Za-z])`, 'g');
    result = result.replace(regex, PRONUNCIATION_DICT[word]);
  }

  // 1. 마침표 뒤 공백 확보
  result = result.replace(/\.([^\s\d])/g, '. $1');

  // 2. 번호 매기기는 자연스럽게 (... 제거, 짧은 쉼만)
  result = result.replace(/(\d+)\.\s+/g, '$1. ');

  // 3. 화살표/슬래시 → 짧은 끊김
  result = result.replace(/\s*→\s*/g, ', ');
  result = result.replace(/\s*\/\s*/g, ', ');

  // 4. 괄호 처리 (가벼운 쉼만)
  result = result.replace(/\s*\(/g, ' (');
  result = result.replace(/\)\s*/g, ') ');

  // 5. — 대시
  result = result.replace(/\s*—\s*/g, ', ');

  // 6. 중복 정리
  result = result.replace(/,\s*,/g, ',');
  result = result.replace(/\s{3,}/g, ' ');

  return result.trim();
}

function preprocessText(text, lang) {
  if (!text) return text;
  if (lang === 'ko-KR') return preprocessKoreanText(text);
  return text;
}

// TTS 동시 요청 제한 (Edge TTS 충돌 방지)
let ttsQueue = Promise.resolve();
function enqueueTTS(fn) {
  ttsQueue = ttsQueue.then(fn).catch(err => {
    console.error('[TTS Queue] Error:', err.message);
    // 에러를 삼켜서 큐가 중단되지 않도록 함
  });
  return ttsQueue;
}

module.exports = async (req, res) => {
  // CORS
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

    // Resolve voice
    const langVoices = VOICES[lang] || VOICES['ko-KR'];
    const voiceName = langVoices[gender] || langVoices.female;

    // 자연스러운 속도 (교육용 — 또렷하되 편안한 톤)
    let prosodyRate = rate || '-5%';
    if (prosodyRate === 'default' || prosodyRate === '+0%') prosodyRate = '-5%';
    let prosodyPitch = pitch || '+2Hz';
    if (prosodyPitch === 'default' || prosodyPitch === '+0Hz') prosodyPitch = '+2Hz';

    // 텍스트 전처리 (자연스러운 끊어읽기)
    const processedText = preprocessText(text, lang);

    console.log(`[TTS] voice=${voiceName} lang=${lang} chars=${processedText.length} rate=${prosodyRate}`);

    // Generate unique temp file path
    const tmpFile = path.join(os.tmpdir(), `tts_${crypto.randomBytes(8).toString('hex')}.mp3`);

    // 큐에 넣어 동시 요청 충돌 방지
    await enqueueTTS(async () => {
      const tts = new EdgeTTS({
        voice: voiceName,
        lang: lang,
        outputFormat: 'audio-24khz-48kbitrate-mono-mp3',
        rate: prosodyRate,
        pitch: prosodyPitch,
        volume: 'default',
        timeout: 30000,
      });
      await tts.ttsPromise(processedText, tmpFile);
    });

    // Read the generated file
    const audioBuffer = fs.readFileSync(tmpFile);

    // Clean up temp file
    try { fs.unlinkSync(tmpFile); } catch (e) {}
    try { fs.unlinkSync(tmpFile + '.json'); } catch (e) {}

    if (audioBuffer.length < 100) {
      return res.status(500).json({ error: 'Generated audio too small' });
    }

    console.log(`[TTS] Success: ${audioBuffer.length} bytes`);

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', audioBuffer.length);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.status(200).send(audioBuffer);

  } catch (err) {
    console.error('[TTS] Error:', err);
    return res.status(500).json({ error: String(err.message || err) });
  }
};
