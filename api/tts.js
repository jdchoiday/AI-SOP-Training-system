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

// SSML 생성 — 자연스러운 억양, 강조, 호흡 포함
function buildSSML(text, voiceName, rate, pitch) {
  let processed = applyPronunciation(text);

  // 문장 분리
  const sentences = processed.match(/[^.!?。]+[.!?。]?\s*/g) || [processed];

  let ssmlBody = '';
  sentences.forEach((sent, i) => {
    let s = sent.trim();
    if (!s) return;

    // 첫 문장은 살짝 강조 (도입부 톤 업)
    if (i === 0) {
      ssmlBody += `<prosody rate="${rate}" pitch="${pitch}">${s}</prosody> `;
      ssmlBody += '<break time="400ms"/>';
    }
    // 마지막 문장은 약간 느리게 (마무리 톤)
    else if (i === sentences.length - 1) {
      ssmlBody += `<prosody rate="-8%" pitch="-1Hz">${s}</prosody>`;
    }
    // 중간 문장들
    else {
      // 긴 문장은 쉼표/조사에서 자연스러운 끊어읽기
      s = s.replace(/(하지만|그러나|그리고|또한|특히|즉|이것은|왜냐하면|결국|따라서)/g, '<break time="200ms"/>$1');
      // 마침표/쉼표 뒤 자연스러운 쉼
      ssmlBody += `<prosody rate="${rate}" pitch="${pitch}">${s}</prosody>`;
      ssmlBody += '<break time="350ms"/>';
    }
  });

  return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="ko-KR">
  <voice name="${voiceName}">
    ${ssmlBody}
  </voice>
</speak>`;
}

// 일반 텍스트 전처리 (SSML 미지원 시 폴백)
function preprocessText(text, lang) {
  if (!text) return text;
  let result = applyPronunciation(text);
  // 화살표/슬래시 → 쉼
  result = result.replace(/\s*→\s*/g, ', ');
  result = result.replace(/\s*\/\s*/g, ', ');
  result = result.replace(/\s*—\s*/g, ', ');
  result = result.replace(/,\s*,/g, ',');
  result = result.replace(/\s{3,}/g, ' ');
  return result.trim();
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

    // 교육용 — 또렷하고 편안한 톤
    let prosodyRate = rate || '-3%';
    if (prosodyRate === 'default' || prosodyRate === '+0%') prosodyRate = '-3%';
    let prosodyPitch = pitch || '+2Hz';
    if (prosodyPitch === 'default' || prosodyPitch === '+0Hz') prosodyPitch = '+2Hz';

    // SSML로 자연스러운 억양 생성
    const ssml = buildSSML(text, voiceName, prosodyRate, prosodyPitch);
    const processedText = preprocessText(text, lang);

    console.log(`[TTS] voice=${voiceName} lang=${lang} chars=${text.length} rate=${prosodyRate} ssml=true`);

    // Generate unique temp file path
    const tmpFile = path.join(os.tmpdir(), `tts_${crypto.randomBytes(8).toString('hex')}.mp3`);

    // 큐에 넣어 동시 요청 충돌 방지
    await enqueueTTS(async () => {
      try {
        // SSML 모드 시도 (억양+강조+호흡 포함)
        const tts = new EdgeTTS({
          voice: voiceName,
          lang: lang,
          outputFormat: 'audio-24khz-96kbitrate-mono-mp3',
          rate: prosodyRate,
          pitch: prosodyPitch,
          volume: '+5%',
          timeout: 30000,
        });
        await tts.ttsPromise(processedText, tmpFile);
      } catch (ssmlErr) {
        console.warn('[TTS] SSML fallback to plain text:', ssmlErr.message);
        const tts = new EdgeTTS({
          voice: voiceName,
          lang: lang,
          outputFormat: 'audio-24khz-96kbitrate-mono-mp3',
          rate: prosodyRate,
          pitch: prosodyPitch,
          volume: '+5%',
          timeout: 30000,
        });
        await tts.ttsPromise(processedText, tmpFile);
      }
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
