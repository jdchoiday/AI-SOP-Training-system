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
const { rateLimit } = require('./_ratelimit');

// 소프트런칭 보호 — IP 당 분당 60 요청 (1초당 1회 이상 허용)
const ttsGate = rateLimit({ key: 'tts', limit: 60, windowMs: 60_000 });

const VOICES = {
  'ko-KR': { female: 'ko-KR-SunHiNeural', male: 'ko-KR-InJoonNeural' },
  'en-US': { female: 'en-US-AriaNeural', male: 'en-US-GuyNeural' },
  'vi-VN': { female: 'vi-VN-HoaiMyNeural', male: 'vi-VN-NamMinhNeural' },
};

// ===== Gemini 2.5 TTS 폴백 =====
// Edge TTS 502 발생 시 자동 전환. GEMINI_API_KEY 재사용 (별도 키 불필요).
// 참고: https://ai.google.dev/gemini-api/docs/speech-generation
const GEMINI_VOICES = {
  // Gemini TTS 음성은 언어 무관하게 다국어 지원. 톤 느낌에 맞춰 매핑.
  'ko-KR': { female: 'Kore',  male: 'Charon' },   // 차분·따뜻
  'en-US': { female: 'Aoede', male: 'Puck'   },   // 밝음·에너지
  'vi-VN': { female: 'Leda',  male: 'Fenrir' },   // 자연스러움·중저음
};

// PCM 24kHz 16bit mono → WAV 변환 (Gemini TTS 응답 포맷 처리)
function pcmToWav(pcmBuffer, sampleRate = 24000) {
  const header = Buffer.alloc(44);
  const dataLen = pcmBuffer.length;
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataLen, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);   // PCM fmt chunk size
  header.writeUInt16LE(1, 20);    // PCM format
  header.writeUInt16LE(1, 22);    // mono
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28); // byte rate (16bit mono)
  header.writeUInt16LE(2, 32);    // block align
  header.writeUInt16LE(16, 34);   // bits per sample
  header.write('data', 36);
  header.writeUInt32LE(dataLen, 40);
  return Buffer.concat([header, pcmBuffer]);
}

async function generateGeminiTTS(coachText, lang, gender) {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) throw new Error('GEMINI_API_KEY not set');

  const voiceMap = GEMINI_VOICES[lang] || GEMINI_VOICES['ko-KR'];
  const voiceName = voiceMap[gender] || voiceMap.female;

  // 코칭 톤 자연어 지시 (Gemini TTS는 텍스트 프리픽스로 스타일 제어)
  const stylePrefix = {
    'ko-KR': '따뜻하고 차분한 코칭 강사처럼, 핵심 단어를 살짝 강조하며 천천히 읽어주세요:\n\n',
    'en-US': 'Read warmly and calmly like a coaching instructor, emphasizing key words slightly:\n\n',
    'vi-VN': 'Đọc một cách ấm áp và bình tĩnh như giảng viên huấn luyện, nhấn mạnh các từ khóa chính:\n\n',
  }[lang] || '';

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000); // 25s (Vercel 60s 내)

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: stylePrefix + coachText }] }],
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName },
              },
            },
          },
        }),
        signal: controller.signal,
      }
    );
    clearTimeout(timeout);

    const data = await response.json();
    const parts = data.candidates?.[0]?.content?.parts || [];
    const audioPart = parts.find(p => p.inlineData);

    if (!audioPart?.inlineData?.data) {
      const errMsg = data.error?.message || 'No audio in Gemini response';
      throw new Error(errMsg);
    }

    const pcmBuffer = Buffer.from(audioPart.inlineData.data, 'base64');
    // Gemini 응답 mimeType 예: "audio/L16;codec=pcm;rate=24000"
    const mime = audioPart.inlineData.mimeType || '';
    const rateMatch = mime.match(/rate=(\d+)/);
    const sampleRate = rateMatch ? parseInt(rateMatch[1], 10) : 24000;

    const wavBuffer = pcmToWav(pcmBuffer, sampleRate);
    console.log(`[Gemini TTS] ✅ voice=${voiceName} PCM ${Math.round(pcmBuffer.length / 1024)}KB → WAV ${Math.round(wavBuffer.length / 1024)}KB`);
    return { buffer: wavBuffer, contentType: 'audio/wav' };
  } finally {
    clearTimeout(timeout);
  }
}

const PRONUNCIATION_DICT = {
  'AION': '아이온', 'Aion': '아이온', 'aion': '아이온',
  'Kiwooza': '키우자', 'kiwooza': '키우자', 'KIWOOZA': '키우자',
  'SOP': '에스오피', 'POS': '포스', 'CCTV': '씨씨티비',
  'OJT': '오제이티', 'KPI': '케이피아이', 'MBTI': '엠비티아이',
  'QR': '큐알', 'WiFi': '와이파이', 'wifi': '와이파이', 'WIFI': '와이파이',
  'AI': '에이아이', 'CEO': '씨이오', 'VP': '브이피',
  'MOET': '모엣', 'Reggio': '레지오', 'Emilia': '에밀리아',
  // 영어 단어 한국어 발음
  'Academy': '아카데미', 'academy': '아카데미', 'ACADEMY': '아카데미',
  'Service': '서비스', 'service': '서비스', 'SERVICE': '서비스',
  'System': '시스템', 'system': '시스템', 'SYSTEM': '시스템',
  'Team': '팀', 'team': '팀', 'TEAM': '팀',
  'Manager': '매니저', 'manager': '매니저', 'MANAGER': '매니저',
  'Staff': '스태프', 'staff': '스태프', 'STAFF': '스태프',
  'Training': '트레이닝', 'training': '트레이닝', 'TRAINING': '트레이닝',
  'Program': '프로그램', 'program': '프로그램', 'PROGRAM': '프로그램',
  'Project': '프로젝트', 'project': '프로젝트', 'PROJECT': '프로젝트',
  'Manual': '매뉴얼', 'manual': '매뉴얼', 'MANUAL': '매뉴얼',
  'Guide': '가이드', 'guide': '가이드', 'GUIDE': '가이드',
  'Online': '온라인', 'online': '온라인', 'ONLINE': '온라인',
  'Offline': '오프라인', 'offline': '오프라인', 'OFFLINE': '오프라인',
  'Contents': '콘텐츠', 'contents': '콘텐츠', 'Content': '콘텐츠', 'content': '콘텐츠',
  'Check': '체크', 'check': '체크', 'CHECK': '체크',
  'Feedback': '피드백', 'feedback': '피드백', 'FEEDBACK': '피드백',
  'Mission': '미션', 'mission': '미션', 'MISSION': '미션',
  'Challenge': '챌린지', 'challenge': '챌린지', 'CHALLENGE': '챌린지',
  'Level': '레벨', 'level': '레벨', 'LEVEL': '레벨',
  'Review': '리뷰', 'review': '리뷰', 'REVIEW': '리뷰',
  'Display': '디스플레이', 'display': '디스플레이', 'DISPLAY': '디스플레이',
  'Event': '이벤트', 'event': '이벤트', 'EVENT': '이벤트',
  'Schedule': '스케줄', 'schedule': '스케줄', 'SCHEDULE': '스케줄',
  'Curriculum': '커리큘럼', 'curriculum': '커리큘럼',
  'Coaching': '코칭', 'coaching': '코칭', 'COACHING': '코칭',
  'Leadership': '리더십', 'leadership': '리더십',
  'Report': '리포트', 'report': '리포트', 'REPORT': '리포트',
  'Process': '프로세스', 'process': '프로세스', 'PROCESS': '프로세스',
  'Standard': '스탠다드', 'standard': '스탠다드',
  'Quality': '퀄리티', 'quality': '퀄리티',
  'Playz': '플레이즈', 'playz': '플레이즈', 'PLAYZ': '플레이즈',
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

  if (!ttsGate(req, res)) return; // 429 자동 응답

  try {
    const { text, lang = 'ko-KR', gender = 'female', rate, pitch, engine = 'edge' } = req.body || {};

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'text is required' });
    }
    if (text.length > 3000) {
      return res.status(400).json({ error: 'Text too long (max 3000 chars)' });
    }

    // ★ engine: 'edge' (default, 일관성) | 'gemini' (AI 음성) | 'auto' (Edge → Gemini 폴백)
    // 기본값을 'edge'로 설정 — 씬마다 목소리 변경을 방지 (이전 'auto'는 실패 씬만 Gemini 전환되어 일관성 깨짐)
    const ttsEngine = ['edge', 'gemini', 'auto'].includes(engine) ? engine : 'edge';

    const langVoices = VOICES[lang] || VOICES['ko-KR'];
    const voiceName = langVoices[gender] || langVoices.female;

    // 코칭 톤: 살짝 느리게 + 따뜻한 피치
    let prosodyRate = rate || '-5%';
    if (prosodyRate === 'default' || prosodyRate === '+0%') prosodyRate = '-5%';
    let prosodyPitch = pitch || '+3Hz';
    if (prosodyPitch === 'default' || prosodyPitch === '+0Hz') prosodyPitch = '+3Hz';

    const coachText = buildCoachingText(text);

    console.log(`[TTS Coach] engine=${ttsEngine} voice=${voiceName} rate=${prosodyRate} pitch=${prosodyPitch}`);
    console.log(`[TTS Coach] original: ${text.slice(0, 60)}...`);
    console.log(`[TTS Coach] coached:  ${coachText.slice(0, 80)}...`);

    // ================================
    // engine=gemini: Gemini만 사용 (Edge 시도 안 함)
    // ================================
    if (ttsEngine === 'gemini') {
      try {
        const { buffer: wavBuffer, contentType } = await generateGeminiTTS(coachText, lang, gender);
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Length', wavBuffer.length);
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.setHeader('X-TTS-Engine', 'gemini');
        return res.status(200).send(wavBuffer);
      } catch (geminiErr) {
        console.error('[TTS] Gemini 실패:', geminiErr.message);
        return res.status(502).json({
          error: 'Gemini TTS failed',
          message: geminiErr.message,
          retryable: true,
        });
      }
    }

    // ================================
    // engine=edge 또는 auto: Edge TTS 시도
    // ================================
    const tmpFile = path.join(os.tmpdir(), `tts_${crypto.randomBytes(8).toString('hex')}.mp3`);

    // ECONNRESET 재시도: Microsoft Edge TTS 엔드포인트가 가끔 연결을 끊음
    const MAX_RETRY = 3;
    let lastErr = null;
    for (let attempt = 1; attempt <= MAX_RETRY; attempt++) {
      try {
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
        if (fs.existsSync(tmpFile) && fs.statSync(tmpFile).size > 100) {
          break; // 성공
        }
        lastErr = new Error('Empty or missing output file');
      } catch (e) {
        lastErr = e;
        console.warn(`[TTS Retry] 시도 ${attempt}/${MAX_RETRY} 실패:`, e.message);
      }
      if (attempt < MAX_RETRY) await new Promise(r => setTimeout(r, attempt * 800));
    }

    // ================================
    // Edge 실패 시 분기
    // engine=edge: 폴백 없이 에러 반환 (씬 간 음성 일관성 유지, 클라이언트 Web Speech 폴백 사용)
    // engine=auto: Gemini 폴백 (기존 동작)
    // ================================
    if (!fs.existsSync(tmpFile) || fs.statSync(tmpFile).size < 100) {
      if (ttsEngine === 'edge') {
        console.warn(`[TTS] Edge TTS 실패 (${lastErr?.message}) — engine=edge 이므로 폴백 없이 에러 반환 (클라이언트가 Web Speech로 처리)`);
        try { if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile); } catch (e) {}
        return res.status(502).json({
          error: 'Edge TTS failed',
          message: lastErr?.message || 'N/A',
          retryable: true,
        });
      }

      // engine=auto: Gemini 폴백
      console.warn(`[TTS] Edge TTS 재시도 모두 실패 (${lastErr?.message}) → Gemini 폴백 시도 (engine=auto)`);
      try { if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile); } catch (e) {}
      try {
        const { buffer: wavBuffer, contentType } = await generateGeminiTTS(coachText, lang, gender);
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Length', wavBuffer.length);
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.setHeader('X-TTS-Engine', 'gemini-fallback');
        return res.status(200).send(wavBuffer);
      } catch (geminiErr) {
        console.error('[TTS] Gemini 폴백도 실패:', geminiErr.message);
        return res.status(502).json({
          error: 'All TTS engines failed',
          message: `Edge: ${lastErr?.message || 'N/A'} | Gemini: ${geminiErr.message}`,
          retryable: true,
        });
      }
    }

    const audioBuffer = fs.readFileSync(tmpFile);
    try { fs.unlinkSync(tmpFile); } catch (e) {}

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', audioBuffer.length);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('X-TTS-Engine', 'edge');
    return res.status(200).send(audioBuffer);

  } catch (err) {
    console.error('[TTS Error]', err.message);
    return res.status(500).json({ error: 'TTS generation failed: ' + err.message });
  }
};
