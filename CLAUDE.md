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
   - 자유가입: 사용자가 **브랜드를 직접 선택**(`register.html`).
   - 초대가입: **초대장의 `company_id`**를 사용(브랜드가 링크에 박혀 있음).
3. **읽기에도 회사 필터를 건다(이중 방어).** RLS(`company_isolation`)가 1차 방어선이지만,
   클라이언트도 SOP 조회 등에 `company_id`를 명시적으로 건다(`supabase-client.js`의
   `syncSops`). RLS 단독에 의존하지 않는다.
4. **기기 공유 시 브랜드 전환 캐시를 비운다.** 로그인 시 직전 브랜드와 다르면 회사-스코프
   localStorage를 purge (`SupabaseMode.applyCompanyScope`).

새 기능이 테넌트 데이터를 만지면: ① 쓰기에 `company_id` 주입, ② 읽기에 회사 필터,
③ **회귀 테스트 추가**(`test/`). 이 셋을 빼먹지 말 것.

### 회사(브랜드) ID (이 프로젝트 고정값 · project `xbcdzkrhtjgxdwfqqugc`)
- **Kiwooza Vietnam** = `dae1afc8-55cb-476e-8099-07ef41e4452d`
- **SLCO** = `f7b86b4d-9a43-486d-8d07-6ba812cd4ef7`

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
| `register.html` | 가입 — 브랜드→지점→팀. 초대장 `company_id` 사용, 회사 추정 폴백 없음 |
| `app.html` | 직원 학습 화면. 헤더에 브랜드명 표시 |
| `admin/index.html` | 관리자 — 활성 회사(`__activeCompanyId`)로 스코프 |
| `js/supabase-client.js` | Auth/동기화. `syncSops` 회사필터, `applyCompanyScope` 캐시purge |
| `api/auth.js` | 서버측 가입(Auth + employees 원자적 생성), `company_id` 전달 |
| `docs/migrations/` | 라이브 DB에 적용한 변경 기록 |

---

## 운영 메모

- **신규 직원은 브랜드 초대링크로 받는 것을 권장** — 브랜드 오선택 여지가 없다.
- 새 브랜드 온보딩: `companies` 생성 → `branch_teams` 지점 → 초대장 → 그다음 사람 초대.
- 데이터 변경 작업 후엔 **브랜드별 전후 개수**를 보고한다.
- 모델 식별자/내부 식별값을 커밋·PR·코드 주석에 넣지 않는다(채팅 답변에서만).
