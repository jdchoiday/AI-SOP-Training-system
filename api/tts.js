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

// 한국어 텍스트를 자연스럽게 읽을 수 있도록 전처리
// 핵심: 과도한 쉼 제거, 실제 사람처럼 빠르게 읽되 핵심 구간만 끊기
function preprocessKoreanText(text) {
  let result = text;

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

    // 자연스러운 속도 (실제 사람 말투에 가깝게)
    let prosodyRate = rate || '+5%';
    if (prosodyRate === 'default') prosodyRate = '+5%';
    let prosodyPitch = pitch || '+0Hz';
    if (prosodyPitch === 'default') prosodyPitch = '+0Hz';

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
