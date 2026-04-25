# 소프트런칭 운영 체크리스트

내부 30명 베타 테스트를 시작하기 전 / 운영 중 체크할 항목.
**이 문서를 위에서 아래로 따라가면** 빠진 것 없이 런칭할 수 있도록 정리했습니다.

> 작성: 2026-04-23 / 대상 환경: Vercel + Supabase

---

## 0. 한눈에 보는 의존성

| 영역 | 서비스 | 무료 한도 (베타 기간 충분) |
|---|---|---|
| 호스팅 / Edge | Vercel Hobby | 100GB 대역폭/월 |
| DB / Auth | Supabase Free | 500MB DB / 50k MAU |
| AI 텍스트·이미지 | Gemini API | 일일 무료 티어 (모니터링 필수) |
| TTS 1순위 | Microsoft Edge TTS (비공식) | 무료 |
| TTS 2순위 | Gemini 2.5 TTS | 토큰 과금 |
| 에러 추적 | Sentry | 5k 에러/월 |
| 알림 메일 | Resend | 3k 메일/월, 100/일 |

---

## 1. 배포 전 환경변수 (Vercel Dashboard)

> Project → Settings → Environment Variables 에 모두 **Production / Preview** 둘 다 등록

### ✅ 필수 (없으면 시스템 안 돌아감)

| 키 | 설명 | 예시 |
|---|---|---|
| `GEMINI_API_KEY` | Gemini 2.5 Flash / Image / TTS | `AIza...` |
| `SUPABASE_URL` | Supabase 프로젝트 URL | `https://xxx.supabase.co` |
| `SUPABASE_ANON_KEY` | 클라이언트 RLS 용 | `eyJhbGc...` |
| `SUPABASE_SERVICE_ROLE_KEY` | 서버 측 (피드백 저장) | `eyJhbGc...` |

### ✅ 모니터링 / 알림 (소프트런칭에 강력 권장)

| 키 | 설명 | 비고 |
|---|---|---|
| `RESEND_API_KEY` | Resend 발신용 | https://resend.com → API Keys |
| `ALERT_EMAIL` | 장애 알림 받을 메일 | `you@example.com` |
| `ALERT_FROM` | 발신자 (옵션) | 기본 `onboarding@resend.dev` |
| `SENTRY_DSN_SERVER` | 서버용 Sentry DSN | 프론트 DSN 과 분리 권장 |
| `CRON_SECRET` | Vercel 자동 주입 | 손대지 말 것 |

### 🔵 옵션

| 키 | 설명 |
|---|---|
| `SENTRY_DSN_BROWSER` | 프론트 Sentry (관리자가 localStorage 로 주입해도 OK) |
| `PEXELS_API_KEY` | 영상 검색 폴백 (옵션) |

설정 후 **반드시 재배포** (env 변경은 자동 반영 X — Redeploy 필요)

```bash
# 또는 CLI 로 확인
vercel env ls
```

---

## 2. Supabase 마이그레이션 실행

Supabase Dashboard → SQL Editor 에서 **순서대로** 실행:

```
docs/supabase-setup.sql              ← (이미 적용된 경우 skip)
docs/migration-v2-praise-teams.sql
docs/migration-v3-profiles.sql
docs/migration-v4-basic-tasks.sql
docs/migration-v4-fix-fk.sql
docs/migration-v5-profile-upgrade.sql
docs/migration-v6-team-tasks.sql
docs/migration-v7-team-tasks-upgrade.sql
docs/migration-v8-chapter-sections.sql
docs/migration-v8-quest-system.sql
docs/migration-v9-streaks.sql
docs/migration-v10-store.sql
docs/migration-v11-feedback.sql      ← 🆕 이번 런칭에서 추가
```

### 검증 쿼리

```sql
-- 모든 마이그레이션이 적용됐는지
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('beta_feedback','store_items','quest_definitions','team_tasks');
-- 4개 모두 나와야 함

SELECT count(*) FROM beta_feedback;  -- 0 이어야 정상 (아직 피드백 없음)
```

---

## 3. Sentry 프로젝트 만들기 (10분)

1. https://sentry.io → Create Project
2. **Project 1**: Platform = `Browser JavaScript` → 프론트용
3. **Project 2**: Platform = `Node.js` → 서버용 (선택, 통합도 가능)
4. 각 프로젝트의 DSN 복사
5. Vercel 환경변수에 등록:
   - `SENTRY_DSN_SERVER` = Node.js 프로젝트 DSN
6. 프론트 DSN 은 **관리자가 admin/index.html 의 콘솔에서**:
   ```js
   localStorage.setItem('sentry_dsn_browser', 'https://...@sentry.io/...');
   location.reload();
   ```
   (페이지 어디서든 한 번만 하면 모든 베타 테스터 브라우저가 자동으로는 안 받음 → 필요시 코드에 직접 박을 것)

> ⚠️ 모든 베타 테스터에게 Sentry 를 적용하려면 `chapter.html` / `admin/index.html` 의 `window.SENTRY_DSN_BROWSER` 라인에 DSN 을 직접 넣고 재배포하세요.

---

## 4. Resend 발신 도메인 설정 (선택, but 권장)

기본 `onboarding@resend.dev` 로도 알림은 옵니다. 그러나:
- 스팸함으로 갈 확률 높음
- "from" 이 안 깔끔

자기 도메인 인증하면 깔끔해짐 (5분):
1. https://resend.com → Domains → Add Domain
2. DNS 에 SPF / DKIM 추가
3. 인증되면 `ALERT_FROM=alerts@yourdomain.com` 으로 변경

---

## 5. 배포 + 헬스체크

### 5-1. 배포

```bash
git push origin main
# Vercel 이 자동 빌드/배포
```

### 5-2. 헬스체크 (배포 직후 반드시)

```bash
# 운영 URL 로 교체
curl -s https://your-prod.vercel.app/api/health | jq
```

기대 응답:
```json
{
  "ok": true,
  "checks": {
    "gemini":   { "ok": true },
    "edgeTts":  { "ok": true },
    "supabase": { "ok": true },
    "env":      { "ok": true }
  }
}
```

❌ 하나라도 `ok: false` 면 **베타 테스터 초대를 보내지 마세요**. 먼저 fix.

### 5-3. Cron 작동 확인

- Vercel Dashboard → Project → Settings → Cron Jobs
- `/api/cron-health` 가 **15분 간격**으로 표시되는지
- 첫 실행 후 → "Last Invocation" 에 200 OK 가 떠야 정상

### 5-4. 강제 알림 테스트

`ALERT_EMAIL` 로 테스트 메일이 오는지 확인:

```bash
# 일부러 헬스체크 실패시키기 → Vercel 환경변수에서 GEMINI_API_KEY 잠시 제거
# 또는 ?force=1 로 강제 호출 (단 헬스 ok 면 메일 안 옴)
curl -s "https://your-prod.vercel.app/api/cron-health?force=1"
```

---

## 6. 베타 사용자 계정 생성

Supabase → Authentication → Users → "Add user (manual)"

각 테스터마다:
- Email: `tester01@example.com`
- Password: 임시 비밀번호 (예: `Beta2026!#`)
- Email confirm: **자동 확인**

생성 후 `profiles` 테이블에 직접 INSERT:

```sql
INSERT INTO profiles (employee_id, name, branch, team, role, email)
VALUES ('TESTER01', '홍길동', '강남점', '운영팀', 'staff', 'tester01@example.com');
```

> ⚠️ **주의**: `auth.users` 테이블을 SQL 로 직접 만들면 GoTrue 가 NULL 토큰 버그를 일으킵니다.
> 반드시 Dashboard 에서 만들거나, SQL 로 만들 경우 토큰 컬럼을 `''` (빈 문자열) 로 초기화해야 합니다.
> 자세한 건 `memory/feedback_gotrue_null_token_bug.md` 참고.

---

## 7. 베타 테스터에게 안내 메일 (템플릿)

```
제목: [SOP Training 베타] 시작 안내드립니다 🎉

안녕하세요, 홍길동님.

SOP Training 시스템 내부 베타에 초대됐습니다.

▶ 접속: https://your-prod.vercel.app
▶ ID: tester01@example.com
▶ 임시 비밀번호: Beta2026!#  (최초 로그인 후 변경 부탁드려요)

▶ 가이드: docs/BETA_TESTER_GUIDE.md (10분이면 다 읽어요)
▶ 문의: 우측 하단 💬 버튼 → 카테고리 선택 후 자유롭게

베타 기간은 약 2-4주, 끝나면 작은 선물을 드릴 예정입니다 🎁

테스트 잘 부탁드립니다!
```

---

## 8. 운영 중 매일 체크 (관리자)

### 매일 9시 ☕ 5분 루틴

1. **베타 모니터링 페이지** (`/admin/` → "베타 모니터링")
   - 시스템 상태 4개 모두 ✅ OK 인지
   - 신규 피드백 (status=new) 0 ~ N 건 검토
2. **Resend 알림 메일함** 체크 (장애 알림 왔는지)
3. **Sentry Issue 페이지** — 새로 발생한 unique 이슈 있는지

### 피드백 트리아지 가이드

- **치명적 / 심각** → 즉시 fix → 핫픽스 배포
- **보통** → 그날 안에 검토 → 다음 배포에 포함
- **가벼움** → 주 1회 모아서 처리
- 처리 완료 시 모니터링 페이지 status 드롭다운으로 `resolved`

---

## 9. 알려진 제약 / 미해결

> 정식 런칭 전에 정리해야 할 항목 — 베타 기간 동안 최소한 인지하고 운영

- [ ] **Gemini API 키 만료 위험** — GCP 청구 계정 연결 + GCP 키로 마이그레이션 권장
- [ ] **레이트리밋이 인메모리** — Vercel 콜드스타트마다 리셋 (베타 30명은 OK, 정식은 Upstash Redis 로 교체)
- [ ] **알림 쿨다운도 인메모리** — 콜드스타트 시 30분 쿨다운 리셋 (스팸 위험 작음)
- [ ] **셀프서비스 비밀번호 재설정 미구현** — 관리자 수동 처리
- [ ] **Edge TTS 비공식 의존** — Microsoft 가 막으면 즉시 영향, Gemini TTS 폴백 있음
- [ ] **이미지 Storage 가 Supabase 무료 플랜** (1GB 한계)

---

## 10. 롤백 절차

문제 시 30초 안에 롤백:

```bash
# Vercel CLI
vercel rollback https://your-prod.vercel.app

# 또는 Dashboard → Deployments → 이전 빌드 → Promote to Production
```

전체 베타 중단이 필요하면:
- 베타 테스터 안내 메일로 일시중단 공지
- Vercel 환경변수 `BETA_PAUSED=1` 추가 + 페이지 가드 (필요시 추가 구현)

---

## 11. 베타 → 정식 전환 체크리스트 (참고용, 나중에)

- [ ] Gemini 키 GCP 마이그레이션
- [ ] 레이트리밋 → Vercel KV / Upstash Redis
- [ ] beta_feedback RLS 정책 강화 (INSERT 만 anon, SELECT 는 admin only)
- [ ] 셀프서비스 비밀번호 재설정 추가
- [ ] feedback-widget 옵션화 (정식 운영 시 노출 끄기)
- [ ] `BETA_TESTER_GUIDE.md` → 일반 사용자 매뉴얼로 교체
- [ ] 도메인 / SSL / 회사 메일 발신
- [ ] 약관 / 개인정보 처리방침 / 마케팅 동의
- [ ] 결제 / 청구 (B2B 라이선스인 경우)

---

**완료한 항목은 [x] 로 체크하면서 진행하세요.**
이 문서를 PR / 노션 / 위키 어디든 공유해서 팀 전체가 같은 페이지를 보게 만드세요.
