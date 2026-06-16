# CLAUDE.md — AI SOP Training System

직원 교육(SOP → 영상코스 + 퀴즈 + 게이미피케이션) 멀티브랜드 웹앱.
정적 HTML/JS 프런트 + Supabase(Postgres/Auth/RLS) 백엔드. Vercel 배포.

---

## ⚠️ 최우선 불변규칙 — 브랜드(테넌트) 격리

이 앱은 **여러 브랜드(회사)를 한 DB에서 격리 운영**한다. 브랜드가 섞이면(한 브랜드가
다른 브랜드의 교육자료·인원·보상 데이터를 보는 것) **가장 심각한 버그**다. 아래는 타협 불가:

1. **테넌트 스코프 데이터는 `company_id`가 반드시 있어야 한다.** 직원/SOP/진행률/XP/
   초대장 등 사람·콘텐츠에 관한 모든 행은 `company_id`를 가진다. 절대 NULL로 두지 말 것.
   - DB 가드: `employees.company_id`는 `super_admin` 외에는 NOT NULL 강제
     (`employees_company_required` CHECK 제약). super_admin만 NULL 허용(전체 관리).
2. **회사를 "추정"하지 말 것.** 과거 "가장 먼저 생성된 회사로 자동배정" 같은 폴백이
   모든 직원을 한 브랜드(Kiwooza)로 쏠리게 해 타 브랜드 직원에게 남의 자료를 보여준
   핵심 사고였다. 회사는 **명시적으로** 정해진다:
   - **가입은 초대 전용**(`register.html`의 `INVITE_ONLY`). 회사는 **초대장의 `company_id`**에서만
     온다(브랜드가 링크에 박혀 있음). 코드 없이 들어오면 가입 불가(자유 브랜드선택 비활성).
   - **서버가 강제한다**(`api/auth.js`): 자가가입은 **유효한 `invite_code`를 요구**하고, 회사를
     **초대장에서 서버측으로 조회·결정**한다. 클라이언트가 보낸 `company_id`는 자가가입에서 **무시**한다.
   - 관리자 직접추가(인증된 Bearer 세션)는 초대 없이 가능 — 회사는 관리자 본인 회사(super_admin은
     지정 회사)로 강제. 브랜드-레벨 초대(지점 미지정)는 회사만 고정하고 지점/팀은 사용자가 고른다.
3. **읽기에도 회사 필터를 건다(이중 방어).** RLS(`company_isolation`)가 1차 방어선이지만,
   클라이언트도 SOP 조회 등에 `company_id`를 명시적으로 건다(`supabase-client.js`의
   `syncSops`). RLS 단독에 의존하지 않는다.
4. **기기 공유 시 브랜드 전환 캐시를 비운다.** 로그인 시 직전 브랜드와 다르면 회사-스코프
   localStorage를 purge (`SupabaseMode.applyCompanyScope`).

새 기능이 테넌트 데이터를 만지면: ① 쓰기에 `company_id` 주입, ② 읽기에 회사 필터,
③ **회귀 테스트 추가**(`test/`). 이 셋을 빼먹지 말 것.

### 회사(브랜드) ID (이 프로젝트 고정값 · project `xbcdzkrhtjgxdwfqqugc`)
- **Kiwooza Vietnam** = `dae1afc8-55cb-476e-8099-07ef41e4452d`
- **SLKO** = `f7b86b4d-9a43-486d-8d07-6ba812cd4ef7`

> 참고: "본사"는 브랜드가 아니라 **브랜드 안의 지점(branch)**이다. 가입은 브랜드 → 지점 →
> 팀 순으로 고른다. 지점 목록은 `branch_teams`(회사별)에서 오며, 가입 페이지(anon)는
> RLS상 `branch_teams`만 읽을 수 있다(`employees`는 못 읽음).

---

## 테넌트 건강검진

브랜드 격리가 깨지지 않았는지 점검. **"브랜드 점검해줘"** 라고 하면 아래를 실행:

```
docs/tenant-health-check.sql   # 미지정 회사·브랜드별 인원/콘텐츠 수·도메인 불일치
```

기대값: `non-super-admin null company = 0`, `sop/invite null company = 0`.

---

## 테스트

```bash
node test/run.js        # 의존성 없는 러너, test/*.test.js 전부 실행
```

격리 관련 핵심 스위트: `rls-company-scope.test.js`, `xp-company.test.js`,
`sop-sync.test.js`. 테넌트 로직을 바꾸면 여기에 케이스를 추가/갱신한다.

---

## 주요 파일

| 파일 | 역할 |
|------|------|
| `index.html` | 로그인 + 브랜드 선택 칩. 로그인 시 `applyCompanyScope` 호출 |
| `register.html` | 가입 — **초대 전용**(`INVITE_ONLY`). 브랜드는 초대장에서 고정, 지점/팀만 사용자 선택 |
| `app.html` | 직원 학습 화면. 헤더에 브랜드명 표시 |
| `admin/index.html` | 관리자 — 활성 회사(`__activeCompanyId`)로 스코프. 초대생성 시 "지점 미지정=브랜드 공용 링크" |
| `js/supabase-client.js` | Auth/동기화. `syncSops` 회사필터, `applyCompanyScope` 캐시purge |
| `api/auth.js` | 서버측 가입 — 자가가입은 **초대코드 검증 후 초대장 `company_id`로 배정**(클라 값 무시), 관리자추가는 Bearer 검증 |
| `js/slide-player.js` | 슬라이드 플레이어 — 나레이션 TTS 재생. **혼재 언어는 구간별 음성** + Web Speech 폴백 |
| `api/tts.js` · `api/_lang-segment.js` | 서버 TTS. **언어 구간 분할(`segmentByLang`) → 구간별 음성 합성·연결** |
| `docs/migrations/` | 라이브 DB에 적용한 변경 기록 |

---

## 다국어 나레이션(TTS) — 혼재 언어 규칙

교육자료 나레이션에는 **한 자료 안에 여러 언어가 섞이는 반복 형식**이 있다(예: Kiwooza
BAR/INFO SOP 시리즈 — 베트남어 인트로·아웃트로 + 영어 절차 본문). 이런 혼재는 **개별
자료마다 손보지 않고 재생 엔진에서 일괄 처리**한다. 규칙(타협 불가):

1. **혼재 나레이션은 언어 구간별로 해당 언어 음성으로 읽는다.** 영어 구간은 영어 음성,
   베트남어 구간은 베트남어 음성. 전체를 한 언어 음성으로 읽지 않는다.
2. **엔진이 자동 처리한다 — 콘텐츠를 억지로 손대지 말 것.** 새 이중언어 SOP를 시드/추가할
   때 한 언어로 합치거나 언어별로 자료를 쪼갤 필요 없다. 원문 그대로 넣으면 된다.
   - 분할: `api/_lang-segment.js`의 `segmentByLang()` — 문장/줄 단위로 언어(영/베/한)를
     감지해 연속 같은 언어를 한 구간으로 묶는다(순수 함수, 서버·테스트·클라 동일 규칙).
   - 합성: `api/tts.js` — 혼재면 구간별 Edge 음성으로 합성해 **MP3를 이어붙여 단일
     오디오**로 반환(`X-TTS-Engine: edge-multi`). 클라의 자막/진행바/일시정지/캐시는
     단일 오디오를 받으므로 그대로 동작(무회귀).
   - 폴백: `js/slide-player.js`의 Web Speech 폴백도 구간별 언어로 순차 발화.
3. **단일 언어 자료는 동작 불변.** 한 언어면 기존 경로 그대로. 단, 서버가 실제 언어를
   재감지해 클라가 잘못 보낸 `lang`을 교정한다(예: em-dash로 영어 감지 실패 → 교정).
4. **한국어 전용 전처리(발음치환 `Service`→`서비스`/코칭 리듬)는 한국어 구간에만** 적용한다.
   영어·베트남어 구간에 적용하면 음성이 깨진다(`_processForLang`).

새 언어/형식 추가 시: `unitLang`의 감지 규칙과 `VOICES`의 음성 매핑에 더하고,
**`test/tts-mixed-lang.test.js`에 회귀 케이스를 추가**한다. 이 셋(감지·음성·테스트)을 빼먹지 말 것.

> **일반 원칙(반복 형식 처리):** 같은 형식이 반복되면 개별 사례가 아니라 **공통 로직(엔진)에서
> 일괄 처리하고 여기 규칙으로 남긴다.** 그러면 같은 형식이 또 와도 추가 작업 없이 동일하게 적용된다.

---

## 운영 메모

- **super_admin은 본인 회사가 없다(company_id NULL).** 학습앱(app/tasks/chapter)에서
  전 브랜드가 섞여 보이지 않도록, **로그인 화면에서 브랜드 칩을 골라야** 그 브랜드로
  스코프된다(`sop_brand`→`_currentCompanyId`). 미선택 시 전체가 보인다(추정 금지 원칙).
  일반 직원은 항상 본인 `company_id`가 우선이라 영향 없다. (`super-admin-scope.test.js`)
- **신규 직원은 브랜드 초대링크로만 가입한다(`INVITE_ONLY`)** — 브랜드 오선택 여지가 원천적으로 없다.
  브랜드별 "공용 초대링크"(지점 미지정, 장기·다회용)를 하나씩 만들어 직원에게 배포하면 된다.
- 새 브랜드 온보딩: `companies` 생성 → `branch_teams` 지점 → **브랜드 공용 초대링크** → 직원 배포.
- 데이터 변경 작업 후엔 **브랜드별 전후 개수**를 보고한다.
- 모델 식별자/내부 식별값을 커밋·PR·코드 주석에 넣지 않는다(채팅 답변에서만).
