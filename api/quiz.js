// ============================================
// Quiz Auto-Generation API (Gemini)
// ============================================
// POST /api/quiz
// Body: { narration, count, lang, sceneIndex, mode }
//
// mode:
//   'scene'   → 씬별 퀴즈 3개 (이미지 생성 시 동시 호출)
//   'section' → 섹션 종합 퀴즈 3개
//   'exam'    → 챕터 종합시험 30문제
// ============================================

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) return res.status(500).json({ error: 'GEMINI_API_KEY not set' });

  try {
    const { narration, count = 3, lang = 'auto', sceneIndex = 0, mode = 'scene', sections = [] } = req.body || {};

    if (mode === 'exam' && (!sections || sections.length === 0)) {
      return res.status(400).json({ error: 'sections required for exam mode' });
    }
    if (mode !== 'exam' && !narration) {
      return res.status(400).json({ error: 'narration required' });
    }

    // 언어 감지
    const detectedLang = detectLang(narration || sections.map(s => s.title).join(' '), lang);

    // 프롬프트 생성
    let prompt;
    if (mode === 'exam') {
      prompt = buildExamPrompt(sections, detectedLang, count);
    } else if (mode === 'section') {
      prompt = buildSectionQuizPrompt(narration, detectedLang, count);
    } else {
      prompt = buildSceneQuizPrompt(narration, detectedLang, count, sceneIndex);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            responseMimeType: 'application/json',
          },
        }),
        signal: controller.signal,
      }
    );
    clearTimeout(timeout);

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!text) {
      return res.status(500).json({ error: 'No response from AI', raw: data });
    }

    // JSON 파싱 (```json 래퍼 제거)
    let quizzes;
    try {
      const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      quizzes = JSON.parse(cleaned);
      if (!Array.isArray(quizzes)) {
        quizzes = quizzes.quizzes || quizzes.questions || [quizzes];
      }
    } catch (e) {
      console.error('[Quiz] JSON parse failed:', text.slice(0, 200));
      return res.status(500).json({ error: 'Failed to parse quiz JSON', raw: text.slice(0, 500) });
    }

    // 검증 및 정규화
    quizzes = quizzes.filter(q => q && q.question && q.options && q.options.length >= 2);
    quizzes = quizzes.map((q, i) => ({
      question: q.question || '',
      question_en: q.question_en || '',
      question_vn: q.question_vn || '',
      options: (q.options || []).slice(0, 4),
      options_en: (q.options_en || []).slice(0, 4),
      options_vn: (q.options_vn || []).slice(0, 4),
      correct: typeof q.correct === 'number' ? q.correct : 0,
      explanation: q.explanation || '',
    }));

    console.log(`[Quiz] ${mode} mode: generated ${quizzes.length} questions (requested ${count})`);

    return res.status(200).json({
      mode,
      count: quizzes.length,
      quizzes,
    });

  } catch (err) {
    console.error('[Quiz] Error:', err);
    return res.status(500).json({ error: err.message });
  }
};

// 언어 감지
function detectLang(text, hint) {
  if (hint && hint !== 'auto') return hint;
  const hasVie = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(text || '');
  const isEn = !hasVie && /^[\x00-\x7F\s.,!?;:'"()\-\d\n]+$/.test((text || '').slice(0, 200));
  return hasVie ? 'vi' : isEn ? 'en' : 'ko';
}

// 씬별 퀴즈 프롬프트 (3문제)
function buildSceneQuizPrompt(narration, lang, count, sceneIndex) {
  const langMap = { ko: 'Korean', en: 'English', vi: 'Vietnamese' };
  const langName = langMap[lang] || 'Korean';

  return `You are a quiz generator for employee training content.

Generate exactly ${count} multiple-choice quiz questions based on this narration:

"${narration}"

Rules:
- Questions test PRACTICAL understanding (not memorization)
- Each question has exactly 4 options
- Only 1 correct answer per question
- Questions should be in ${langName} as primary language
- Also provide English and Vietnamese translations
- Keep questions SHORT (1 sentence max)
- Options should be SHORT (2-5 words each)
- Include a brief explanation for the correct answer

Return ONLY a JSON array (no markdown, no wrapper):
[
  {
    "question": "질문 (${langName})",
    "question_en": "Question in English",
    "question_vn": "Câu hỏi tiếng Việt",
    "options": ["옵션A", "옵션B", "옵션C", "옵션D"],
    "options_en": ["Option A", "Option B", "Option C", "Option D"],
    "options_vn": ["Lựa chọn A", "Lựa chọn B", "Lựa chọn C", "Lựa chọn D"],
    "correct": 0,
    "explanation": "정답 설명"
  }
]`;
}

// 섹션 종합 퀴즈 프롬프트 (3문제)
function buildSectionQuizPrompt(narration, lang, count) {
  const langMap = { ko: 'Korean', en: 'English', vi: 'Vietnamese' };
  const langName = langMap[lang] || 'Korean';

  return `You are a quiz generator for employee training.

Generate exactly ${count} COMPREHENSIVE quiz questions that test overall understanding of this section:

"${narration}"

Rules:
- Questions should test KEY CONCEPTS and PRACTICAL APPLICATION
- Mix difficulty: 1 easy, 1 medium, 1 hard
- Each question has exactly 4 options, 1 correct
- Primary language: ${langName}, with EN and VN translations
- Keep questions and options concise
- Include explanation for correct answer

Return ONLY a JSON array:
[
  {
    "question": "...", "question_en": "...", "question_vn": "...",
    "options": ["A","B","C","D"], "options_en": [...], "options_vn": [...],
    "correct": 0, "explanation": "..."
  }
]`;
}

// 챕터 종합시험 프롬프트 (30문제)
function buildExamPrompt(sections, lang, count) {
  const langMap = { ko: 'Korean', en: 'English', vi: 'Vietnamese' };
  const langName = langMap[lang] || 'Korean';

  const sectionSummaries = sections.map((s, i) =>
    `Section ${i + 1}: "${s.title}"\nContent: ${(s.content || s.narration || '').slice(0, 500)}`
  ).join('\n\n');

  return `You are a comprehensive exam generator for employee training.

Generate exactly ${count} exam questions covering ALL sections below:

${sectionSummaries}

Rules:
- Distribute questions EVENLY across all sections
- Mix difficulty: 30% easy, 50% medium, 20% hard
- Question types: mostly multiple choice (4 options), include 3-5 short-answer
- Test PRACTICAL workplace application, not just memorization
- Primary language: ${langName}, with EN and VN translations
- For short-answer questions, set options to [] and correct to -1
- Include explanation for each correct answer

Return ONLY a JSON array:
[
  {
    "question": "...", "question_en": "...", "question_vn": "...",
    "options": ["A","B","C","D"], "options_en": [...], "options_vn": [...],
    "correct": 0, "explanation": "...",
    "section_index": 0,
    "difficulty": "easy|medium|hard",
    "type": "mc|short"
  }
]`;
}
