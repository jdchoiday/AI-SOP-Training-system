# i18n 가이드 — 한국어 섞임 방지

## 문제: 왜 한국어가 베트남어 UI에 섞여 나오나?

다음 6가지 근본 원인 때문에 반복적으로 발생:

1. **HTML 기본값이 한국어** — `placeholder="예: ..."` 하드코딩
2. **페이지마다 T 객체 따로** — 9개 HTML 파일에 9개 T 객체
3. **JS 템플릿에 한국어 박음** — `` `🔥 ${n}일 연속` ``
4. **Supabase `title_ko` NOT NULL, 나머지 NULLABLE** — admin이 잊어버리면 빈칸
5. **누락 시 조용히 한국어 fallback** — 개발자도 모름
6. **자동 DOM 번역기 없음** — 매번 `getElementById().textContent = t.xxx` 수동

## 해결: `js/i18n-helper.js` 사용

### 1. HTML에서 — `data-i18n-*` 속성만 붙이면 자동 번역

```html
<!-- 텍스트 -->
<span data-i18n="common.save">저장</span>

<!-- 플레이스홀더 -->
<input placeholder="" data-i18n-placeholder="profile.intro">

<!-- title 툴팁 -->
<button data-i18n-title="common.settings">⚙️</button>
```

### 2. JS에서 — `I18n.t()` 함수 사용

```javascript
// 단순 조회
const label = I18n.t('common.save');

// 함수형 번역 (파라미터 포함)
const streak = I18n.t('time.streak', 3); // "🔥 3일 연속" or "🔥 Chuỗi 3 ngày"
```

### 3. 페이지별 번역 추가

```javascript
I18n.extend({
  ko: { myPage: { greeting: '안녕' } },
  en: { myPage: { greeting: 'Hello' } },
  vi: { myPage: { greeting: 'Xin chào' } },
});
I18n.applyAll(); // DOM 재번역
```

### 4. 누락 감지 — 콘솔에서 확인

번역이 없으면 콘솔에 경고:
```
[i18n] Missing "vi" translation for key: common.newfeature — falling back to Korean
```

개발 중 한번씩 실행:
```javascript
I18n.missingReport(); // 누락 키 전체 리스트
```

## 공통 사전 (`DICT`)

이미 정의된 네임스페이스:
- `common.*` — 공용 버튼/라벨 (save, cancel, next, ...)
- `nav.*` — 네비 (home, tasks, boost, profile)
- `time.*` — 시간 단위, 스트릭
- `profile.*` — 프로필 플레이스홀더
- `praise.*` — 부스트 메시지

### 새 키 추가 방법

`js/i18n-helper.js`의 `DICT` 객체에 3개 언어 모두 추가:
```javascript
DICT.ko.myPage = { title: '내 페이지' };
DICT.en.myPage = { title: 'My Page' };
DICT.vi.myPage = { title: 'Trang của tôi' };
```

**반드시 3개 언어 모두 채워야 합니다.** 하나라도 빠지면 사용자가 한국어를 보게 됩니다.

## Supabase 다국어 컬럼

`quests`, `sop_documents` 등 테이블은 `title_ko`, `title_en`, `title_vi` 3개 컬럼을 가집니다.

admin 페이지에서 새 데이터 추가 시 **3개 언어 모두 채웠는지 자동 체크**되며, 빠진 게 있으면 확인 다이얼로그를 띄웁니다.

## 체크리스트 (새 기능 추가 시)

- [ ] HTML `placeholder`, `title`, `alt` 속성은 `data-i18n-*` 사용?
- [ ] JS 템플릿 문자열에 한국어 직접 박지 않음?
- [ ] `I18n.t(key)` 사용하고 3개 언어 번역 추가?
- [ ] Supabase에 저장하는 사용자 노출 텍스트는 3개 컬럼 모두 채움?
- [ ] 베트남어 언어 선택하고 확인 완료?
