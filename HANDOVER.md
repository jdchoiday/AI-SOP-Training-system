# AI SOP Training System — 핸드오버 문서
**최종 업데이트: 2026-04-07**

---

## 1. 프로젝트 개요

직원 교육용 AI SOP 트레이닝 시스템. SOP 문서를 업로드하면 AI가 교육 영상 슬라이드 + 퀴즈를 자동 생성하고, 직원이 학습 후 진행률을 추적하는 플랫폼.

- **라이브 URL**: https://ai-sop-training-system.vercel.app
- **Vercel scope**: jdchoidw-3204s-projects
- **배포 명령**: `npx vercel --prod --yes --scope jdchoidw-3204s-projects`
- **로그인**: admin@test.com / 1234 (관리자), staff@test.com / 1234 (직원)

---

## 2. 기술 스택

| 항목 | 기술 |
|------|------|
| 프론트엔드 | Vanilla HTML/JS (SPA 방식, 단일 파일) |
| 호스팅 | Vercel (정적 + Serverless Functions) |
| DB | localStorage (1차) + Supabase (동기화) |
| AI 스크립트/퀴즈 | Google Gemini 2.5 Flash (서버 경유) |
| AI 이미지 | Nano Banana 2 via SiliconFlow |
| AI 챗봇 | Gemini / Groq / OpenAI (선택) |
| Word 파싱 | mammoth.js (CDN) |
| PDF 파싱 | pdf.js (CDN) |

---

## 3. 파일 구조 & 핵심 파일

```
/
├── admin/index.html      ← 관리자 페이지 (5,500줄+, 핵심 파일)
├── app.html              ← 직원 학습 페이지
├── chapter.html          ← 챕터별 학습 뷰
├── index.html            ← 로그인 페이지
├── register.html         ← 회원가입
├── change-password.html  ← 비밀번호 변경
├── ai-chat.html          ← AI 챗봇
├── js/
│   ├── ai-provider.js    ← AI 엔진 (스크립트/퀴즈/이미지 생성 로직)
│   ├── demo-data.js      ← SopStore, EmployeeStore, Progress 객체
│   ├── supabase-client.js ← Supabase 연동 (SupabaseMode)
│   └── config.js         ← Supabase URL/Key
├── api/
│   ├── gemini.js         ← Gemini API 프록시 (서버)
│   ├── image.js          ← 이미지 생성 API (서버)
│   ├── tts.js            ← TTS API (서버)
│   ├── siliconflow.js    ← SiliconFlow 프록시
│   └── auth.js           ← 인증 API
├── vercel.json           ← Vercel 라우팅 설정
├── package.json
└── docs/
    └── supabase-setup.sql ← DB 스키마
```

---

## 4. admin/index.html 주요 구조 (5,500줄+)

이 파일이 시스템의 핵심. 단일 HTML에 모든 관리 기능 포함.

### 4-1. 페이지 (사이드바 네비게이션)
```
SOP 관리 (page-sop) — SOP CRUD, 파일 업로드, AI 생성
콘텐츠 (page-content) — 학습 콘텐츠 미리보기
대시보드 (page-dashboard) — 통계
직원 관리 (page-employees) — 직원 CRUD, 초대
학습 경로 (page-learning-path) — 학습 경로 설정
채팅 로그 (page-chat-logs) — AI 챗봇 대화 이력
알림 (page-notifications) — 마감일/알림
리포트 (page-reports) — 학습 리포트
관리자 관리 (page-admin-manage) — 멀티 관리자
AI 설정 (page-settings) — AI 제공자/키 설정
감사 로그 (page-audit-log) — 시스템 감사 로그
용어 사전 (page-glossary) — 다국어 용어 관리
버전 관리 (page-version-mgmt) — SOP 버전 관리
```

### 4-2. 핵심 함수 위치 (대략적 줄 번호)

| 함수/영역 | 줄 번호 | 설명 |
|----------|---------|------|
| `getSops() / saveSops()` | ~962 | SOP 데이터 CRUD (localStorage) |
| `handleSopFileUpload()` | ~1560 | 파일 → SOP 변환 |
| `extractDocText()` | ~1844 | Word(.docx) 텍스트+이미지 추출 |
| `compressImage()` | ~1840 | 이미지 압축 (800px, JPEG 70%) |
| `createNewSop()` | ~1900 | 새 SOP 생성 (h3+ol 템플릿) |
| `openSopEditor()` | ~1920 | SOP 에디터 열기 |
| `generateContent()` | ~1960 | 슬라이드+퀴즈 AI 생성 |
| `_sopContentToScenes()` | ~2078 | SOP HTML → 씬 배열 변환 (Word 이미지 매칭 포함) |
| `_saveScripts()` | ~2108 | 스크립트 저장 |
| `_generateAllImages()` | ~2340 | 이미지 일괄 생성 (Word 이미지 건너뜀) |
| `_openImageManager()` | ~2700 | 씬별 이미지 관리 모달 |
| `_autoGeneratePrompt()` | ~2820 | AI 이미지 프롬프트 재생성 |
| `openConvertGuide()` | ~3100 | AI SOP 구조화 변환 모달 |
| `SOP_CONVERT_RULES` | ~3010 | 변환 규칙 (ko/en/vi) |
| `renderAiResults()` | ~3430 | AI 결과(슬라이드+퀴즈) 렌더링 |
| `publishSop()` | ~3550 | SOP 배포 |
| `renderGlossary()` | ~3700 | 용어 사전 |
| `renderVersionDashboard()` | ~4100 | 버전 관리 |
| `AuditLog` | ~4400 | 감사 로그 유틸 |
| `callGemini()` | ~880 | Gemini API 공통 호출 |

---

## 5. 데이터 흐름

### 5-1. SOP 생성 → 영상 슬라이드 파이프라인
```
SOP 작성/업로드
  → saveSops() (localStorage 저장)
  → generateContent() 클릭
    → _sopContentToScenes(htmlContent)
      - <h3> + <ol><li> 구조 파싱
      - Word 이미지가 있으면 씬에 순서 매칭
    → AI.generateQuiz() (Gemini로 퀴즈 생성)
    → 씬 카드 렌더링 (renderAiResults)
    → 이미지 생성 (개별 or 일괄)
      - Word 원본 이미지 있으면 건너뜀
      - Gemini → 영어 프롬프트 → FLUX 이미지 생성
    → 배포 (publishSop)
```

### 5-2. 이미지 저장 구조
```
이미지 소스:
  - Word 추출: mammoth.js → compressImage(800px, JPEG 70%) → scene.imageUrl
  - AI 생성: Gemini 프롬프트 → SiliconFlow FLUX → scene.imageUrl (URL)
  - 직접 업로드: FileReader → compressImage → scene.imageUrl

저장:
  - localStorage: 씬 이미지(압축 data:) 포함
  - Supabase: 이미지 제외 (텍스트만 동기화)
  - content 안 base64 img 태그: 저장 시 자동 제거 (용량 절약)
```

### 5-3. SOP 최적 구조 (AI가 잘 읽는 형식)
```html
<h3>1. 섹션 제목</h3>
<ol>
  <li>구체적인 단계 설명을 합니다</li>
  <li>다음 단계를 진행합니다</li>
</ol>
<h3>2. 다음 섹션</h3>
<ol>
  <li>절차를 수행합니다</li>
</ol>
```
- `_narrationToVisual()` (ai-provider.js:451): 30+ 한국어 키워드 → 영어 이미지 프롬프트 매핑
- `_sopContentToScenes()`: `<li>` 1개 = 씬 1개

---

## 6. AI 설정

### 서버 환경변수 (Vercel)
```
GEMINI_API_KEY     — Google Gemini API 키
SILICONFLOW_API_KEY — SiliconFlow (이미지 생성)
```

### 클라이언트 AI_CONFIG (admin/index.html)
```javascript
AI_CONFIG = {
  scriptProvider: 'gemini',    // local | gemini | groq | openai
  quizProvider: 'gemini',
  chatProvider: 'gemini',
  videoProvider: 'none',
  keys: { gemini: '', siliconflow: '' },
  models: { gemini: 'gemini-2.5-flash', wan: 'Wan-AI/Wan2.2-T2V-A14B' }
}
```

---

## 7. 이번 세션에서 구현/수정한 기능

### 7-1. AI SOP 구조화 변환 (신규)
- **위치**: admin/index.html `openConvertGuide()`, `SOP_CONVERT_RULES`
- **기능**: 일반 텍스트를 AI가 `<h3>+<ol><li>` 최적 구조로 변환
- **언어**: 한국어, English, Tiếng Việt (3개 언어)
- **규칙**: 요약 금지, 모든 내용 보존, 섹션 수 무제한
- **접근**: 에디터 툴바 → "🤖 AI 구조화" 버튼
- **입력 한도**: 15,000자, 출력 8,192 토큰

### 7-2. Word 이미지 추출 & 압축 (신규)
- **위치**: `extractDocText()`, `compressImage()`
- mammoth.js `convertImage` 옵션으로 이미지 추출
- 800px 리사이즈 + JPEG 70% 압축 (원본 대비 ~90% 절감)
- `_sopContentToScenes()`에서 이미지를 씬에 순서 매칭
- Word 이미지가 있는 씬은 AI 이미지 생성 시 건너뜀 (`imageSource: 'word-extract'`)

### 7-3. saveSops() 용량 최적화 (수정)
- content 안 base64 `<img>` 태그 자동 제거 (저장 시)
- Supabase에는 이미지 제거된 경량 데이터만 전송
- QuotaExceededError 시 이미지 제거 후 재시도 + 경고

### 7-4. Supabase 에러 수정
- `saveVersionSnapshot()`: `.eq().catch()` → `async IIFE + await + try-catch`
- `saveSops()` Supabase 전송: base64 이미지 포함 → 제거 후 전송 (502 해결)

### 7-5. 직접 업로드 이미지 압축 (수정)
- `_uploadSceneImage()`: FileReader 후 `compressImage()` 적용
- 업로드 제한: 5MB → 10MB (압축 후 저장)

---

## 8. 알려진 이슈 & 제한사항

| 이슈 | 상태 | 설명 |
|------|------|------|
| localStorage 5MB 한도 | 완화됨 | 이미지 압축+content 이미지 제거로 대응. 다수 SOP에 이미지가 많으면 여전히 초과 가능 |
| Word 이미지↔씬 매칭 정확도 | 보통 | 순서 기반 매칭. 이미지 수와 씬 수가 다르면 불일치 가능 |
| Word/AI 이미지 톤 불일치 | 알려진 | 실사 원본 + AI 일러스트 혼재 시 영상 톤 불일치. 관리자가 씬별로 선택 |
| HWP 파일 | 제한적 | 텍스트만 추출 시도. 실패율 높음 |
| RLS 정책 | 취약 | "Allow all for anon" 상태. 프로덕션 전 반드시 수정 필요 |
| API 키 노출 | 주의 | 서버 환경변수로 관리 중이나, 클라이언트 코드에 일부 노출 우려 |

---

## 9. 향후 계획

### 즉시 (현 시스템 안정화)
- [ ] Word 이미지 매칭 테스트 & 개선
- [ ] 실제 회사 SOP로 전체 파이프라인 테스트
- [ ] UI 버그 수정 및 다듬기

### 단기 (도메인 구매 후)
- [ ] crewup.co 도메인 연결
- [ ] 커스텀 도메인 SSL 설정

### 중기 (플랫폼 전환 — 별도 프로젝트)
- [ ] 새 프로젝트로 CrewUp SaaS 개발 (현 시스템은 프로토타입/설계도 역할)
- [ ] Supabase Auth + 멀티테넌트 DB (companies 테이블, RLS)
- [ ] 서브도메인 라우팅 (company.crewup.co)
- [ ] 랜딩 페이지 + 가격표 + 회원가입
- [ ] 결제 연동 (Stripe / 토스페이먼츠)

### GPT 보안 리뷰 개선 (기능 개발 후)
- [ ] Phase 1: DOMPurify 추가, API 키 정리
- [ ] Phase 2: Rate limiting, CORS 강화

---

## 10. Supabase 정보

- **URL**: https://xbcdzkrhtjgxdwfqqugc.supabase.co
- **테이블**: employees, sop_documents, training_progress, chapter_results, invitations, deadlines
- **RLS**: 현재 "Allow all for anon" (보안 취약 — 프로토타입용)
- **스키마 파일**: `docs/supabase-setup.sql`

---

## 11. 개발 환경 설정

```bash
# 로컬 실행
node server.js
# http://localhost:3000

# 배포
npx vercel --prod --yes --scope jdchoidw-3204s-projects

# 환경변수 (Vercel Dashboard에서 설정)
GEMINI_API_KEY=...
SILICONFLOW_API_KEY=...
SUPABASE_URL=https://xbcdzkrhtjgxdwfqqugc.supabase.co
SUPABASE_ANON_KEY=...
```
