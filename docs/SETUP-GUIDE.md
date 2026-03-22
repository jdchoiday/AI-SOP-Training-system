# SOP Training System - 설정 가이드

## 현재 상태: 데모 모드
지금은 Supabase 없이 **데모 모드**로 작동합니다.
- 직원 로그인: `staff@test.com` / `1234`
- 관리자 로그인: `admin@test.com` / `1234`

---

## Supabase 연결하기 (데이터베이스 + 로그인 기능)

### 1단계: Supabase 가입
1. https://supabase.com 접속
2. "Start your project" 클릭
3. GitHub 계정으로 가입 (무료)
4. "New Project" 클릭
5. 프로젝트 이름: `sop-training`
6. 비밀번호 설정 (메모해두세요!)
7. Region: `Northeast Asia (Tokyo)` 선택 (한국에서 빠름)
8. "Create new project" 클릭 → 2~3분 대기

### 2단계: 데이터베이스 테이블 만들기
1. 왼쪽 메뉴에서 "SQL Editor" 클릭
2. "New Query" 클릭
3. 아래 SQL 코드를 복사해서 붙여넣기
4. "Run" 버튼 클릭

```sql
-- ===== SOP Training System 데이터베이스 =====

-- 직원 테이블
CREATE TABLE employees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'staff' CHECK (role IN ('staff', 'admin', 'branch_manager')),
  branch TEXT,
  language TEXT DEFAULT 'ko',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 챕터 (학습 단원)
CREATE TABLE chapters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  title_en TEXT,
  title_vn TEXT,
  description TEXT,
  order_num INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 비디오
CREATE TABLE videos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  title_en TEXT,
  title_vn TEXT,
  video_url TEXT NOT NULL,
  duration INTEGER DEFAULT 0,
  order_num INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 퀴즈/테스트 문제
CREATE TABLE questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('video_quiz', 'chapter_test')),
  question_text TEXT NOT NULL,
  question_en TEXT,
  question_vn TEXT,
  options_json JSONB NOT NULL,
  correct_answer INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 비디오 시청 기록
CREATE TABLE video_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  completed BOOLEAN DEFAULT false,
  watched_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(employee_id, video_id)
);

-- 퀴즈 결과
CREATE TABLE quiz_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  answer INTEGER NOT NULL,
  is_correct BOOLEAN NOT NULL,
  answered_at TIMESTAMPTZ DEFAULT now()
);

-- 챕터 완료 기록
CREATE TABLE chapter_completions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  passed BOOLEAN NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(employee_id, chapter_id)
);

-- SOP 문서 (AI 챗봇용)
CREATE TABLE sop_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT,
  language TEXT DEFAULT 'ko',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS (Row Level Security) 활성화
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapter_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_documents ENABLE ROW LEVEL SECURITY;

-- 기본 정책: 인증된 사용자는 읽기 가능
CREATE POLICY "Authenticated read" ON chapters FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read" ON videos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read" ON questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read" ON sop_documents FOR SELECT TO authenticated USING (true);

-- 직원은 자신의 데이터만 읽기/쓰기
CREATE POLICY "Own data" ON employees FOR ALL TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Own progress" ON video_progress FOR ALL TO authenticated
  USING (employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()));
CREATE POLICY "Own results" ON quiz_results FOR ALL TO authenticated
  USING (employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()));
CREATE POLICY "Own completions" ON chapter_completions FOR ALL TO authenticated
  USING (employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()));
```

### 3단계: 프로젝트 키 가져오기
1. 왼쪽 메뉴 → "Project Settings" (톱니바퀴)
2. "API" 탭 클릭
3. 두 가지 값을 복사:
   - **Project URL**: `https://xxxx.supabase.co`
   - **anon public key**: `eyJhbGci...` (긴 문자열)
4. `js/config.js` 파일에서 해당 값을 교체

### 4단계: 테스트 직원 추가
1. Supabase → "Authentication" → "Users" 탭
2. "Add User" → "Create New User"
3. 이메일/비밀번호 입력하여 직원 계정 생성

---

## Vercel 배포하기 (무료 웹 호스팅)

### 1단계: GitHub에 코드 올리기
1. https://github.com 가입
2. "New Repository" → 이름: `sop-training`
3. 프로젝트 폴더의 모든 파일을 업로드

### 2단계: Vercel 배포
1. https://vercel.com 접속
2. GitHub 계정으로 로그인
3. "Import Project" → 방금 만든 repo 선택
4. "Deploy" 클릭
5. 완료! → `https://sop-training.vercel.app` 같은 주소로 접속 가능
