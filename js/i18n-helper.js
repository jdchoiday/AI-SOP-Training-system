// ============================================
// i18n Helper — 공통 번역 엔진
// ============================================
// 사용법:
//   1. HTML: <span data-i18n="common.save">저장</span>
//   2. HTML: <input data-i18n-placeholder="profile.intro" placeholder="">
//   3. JS: I18n.t('common.save')  // 현재 언어로 반환
//   4. JS: I18n.applyAll()  // 페이지 전체 DOM 자동 번역
//
// 페이지 로컬 번역이 있으면 병합 가능:
//   I18n.extend({ ko: {...}, en: {...}, vi: {...} })
// ============================================

const I18n = (() => {
  let _lang = 'ko';

  // 공통 사전 (모든 페이지에서 공유)
  const DICT = {
    ko: {
      common: {
        save: '저장', cancel: '취소', delete: '삭제', edit: '수정',
        close: '닫기', next: '다음', prev: '이전', back: '뒤로',
        loading: '로딩 중...', saving: '저장 중...', saved: '저장됨',
        confirm: '확인', yes: '예', no: '아니오',
        success: '완료!', error: '오류', retry: '재시도',
        required: '필수', optional: '선택',
        notifOn: '알림 켜짐', notifOff: '알림 꺼짐',
        guide: '가이드', settings: '설정',
      },
      nav: {
        home: '홈', learn: '학습', stats: '성과', store: '스토어',
        tasks: '학습', boost: '성과', profile: '스토어',
      },
      time: {
        day: '일', days: '일', min: '분', sec: '초', hour: '시간',
        justNow: '방금', minAgo: (n) => `${n}분 전`, hrsAgo: (n) => `${n}시간 전`, daysAgo: (n) => `${n}일 전`,
        streak: (n) => `🔥 ${n}일 연속`,
      },
      profile: {
        intro: '예: 커피와 아이들을 좋아하는 3년차 바리스타입니다!',
        bio: '나를 소개해주세요...',
        personality: '예: 밝고 활발한',
        hobby: '예: 요리, 등산, 게임...',
        likes: '예: 커피, 고양이, 여행...',
        strengths: '예: 꼼꼼함, 리더십...',
        weaknesses: '예: 시간관리, 발표...',
        motto: '예: 오늘도 파이팅!',
        skills: '예: 라떼아트, 외국어, 엑셀',
        goal: '예: 전 챕터 완료하고 골드 티어 달성!',
        special: '예: 3개 국어 가능, 바리스타 자격증',
      },
      praise: {
        messagePh: '예: 오늘 바쁜 시간에 정말 많이 도와줘서 고마워요!',
      },
    },
    en: {
      common: {
        save: 'Save', cancel: 'Cancel', delete: 'Delete', edit: 'Edit',
        close: 'Close', next: 'Next', prev: 'Previous', back: 'Back',
        loading: 'Loading...', saving: 'Saving...', saved: 'Saved',
        confirm: 'Confirm', yes: 'Yes', no: 'No',
        success: 'Done!', error: 'Error', retry: 'Retry',
        required: 'Required', optional: 'Optional',
        notifOn: 'Notifications on', notifOff: 'Notifications off',
        guide: 'Guide', settings: 'Settings',
      },
      nav: {
        home: 'Home', learn: 'Learn', stats: 'Stats', store: 'Store',
        tasks: 'Learn', boost: 'Stats', profile: 'Store',
      },
      time: {
        day: 'day', days: 'days', min: 'min', sec: 'sec', hour: 'hr',
        justNow: 'just now', minAgo: (n) => `${n}m ago`, hrsAgo: (n) => `${n}h ago`, daysAgo: (n) => `${n}d ago`,
        streak: (n) => `🔥 ${n} day${n > 1 ? 's' : ''} streak`,
      },
      profile: {
        intro: "e.g., 3rd year barista who loves coffee and kids!",
        bio: 'Tell us about yourself...',
        personality: 'e.g., Bright and energetic',
        hobby: 'e.g., Cooking, Hiking, Gaming...',
        likes: 'e.g., Coffee, Cats, Travel...',
        strengths: 'e.g., Detail-oriented, Leadership...',
        weaknesses: 'e.g., Time management, Presentations...',
        motto: 'e.g., Stay positive!',
        skills: 'e.g., Latte art, Languages, Excel',
        goal: 'e.g., Finish all chapters and reach Gold!',
        special: 'e.g., Trilingual, Barista certified',
      },
      praise: {
        messagePh: 'e.g., Thanks for helping so much during busy hours today!',
      },
    },
    vi: {
      common: {
        save: 'Lưu', cancel: 'Hủy', delete: 'Xóa', edit: 'Sửa',
        close: 'Đóng', next: 'Tiếp', prev: 'Trước', back: 'Quay lại',
        loading: 'Đang tải...', saving: 'Đang lưu...', saved: 'Đã lưu',
        confirm: 'Xác nhận', yes: 'Có', no: 'Không',
        success: 'Hoàn thành!', error: 'Lỗi', retry: 'Thử lại',
        required: 'Bắt buộc', optional: 'Tùy chọn',
        notifOn: 'Bật thông báo', notifOff: 'Tắt thông báo',
        guide: 'Hướng dẫn', settings: 'Cài đặt',
      },
      nav: {
        home: 'Trang chủ', learn: 'Học', stats: 'Thành tích', store: 'Cửa hàng',
        tasks: 'Học', boost: 'Thành tích', profile: 'Cửa hàng',
      },
      time: {
        day: 'ngày', days: 'ngày', min: 'phút', sec: 'giây', hour: 'giờ',
        justNow: 'vừa xong', minAgo: (n) => `${n} phút trước`, hrsAgo: (n) => `${n} giờ trước`, daysAgo: (n) => `${n} ngày trước`,
        streak: (n) => `🔥 Chuỗi ${n} ngày`,
      },
      profile: {
        intro: 'VD: Barista năm thứ 3 yêu cà phê và trẻ em!',
        bio: 'Hãy giới thiệu về bạn...',
        personality: 'VD: Vui vẻ, năng động',
        hobby: 'VD: Nấu ăn, Leo núi...',
        likes: 'VD: Cà phê, Mèo, Du lịch...',
        strengths: 'VD: Tỉ mỉ, Lãnh đạo...',
        weaknesses: 'VD: Quản lý thời gian...',
        motto: 'VD: Hôm nay cũng cố lên!',
        skills: 'VD: Latte art, Ngoại ngữ, Excel',
        goal: 'VD: Hoàn thành các chương và đạt Vàng!',
        special: 'VD: 3 ngôn ngữ, Chứng chỉ barista',
      },
      praise: {
        messagePh: 'VD: Cảm ơn vì đã giúp đỡ trong giờ cao điểm hôm nay!',
      },
    },
  };

  // 누락 번역 추적 (중복 경고 방지)
  const _warned = new Set();

  // 키 경로로 dict에서 값 꺼내기 (예: "common.save" → DICT[lang].common.save)
  function _resolve(key, lang) {
    const parts = key.split('.');
    let val = DICT[lang];
    for (const p of parts) {
      if (val == null) return null;
      val = val[p];
    }
    return val;
  }

  return {
    init(lang) {
      _lang = lang || localStorage.getItem('sop_lang') || 'ko';
    },

    lang() { return _lang; },

    /** 번역 조회. 누락 시 한국어 폴백 + 콘솔 경고 */
    t(key, ...args) {
      let val = _resolve(key, _lang);
      if (val == null) {
        if (_lang !== 'ko' && !_warned.has(key)) {
          _warned.add(key);
          console.warn(`[i18n] Missing "${_lang}" translation for key: ${key} — falling back to Korean`);
        }
        val = _resolve(key, 'ko');
      }
      if (typeof val === 'function') return val(...args);
      return val != null ? val : `[${key}]`;
    },

    /** 페이지별 로컬 번역 추가 (기존 dict에 병합) */
    extend(translations) {
      for (const lang of Object.keys(translations)) {
        if (!DICT[lang]) DICT[lang] = {};
        // 깊은 병합
        const merge = (target, src) => {
          for (const k of Object.keys(src)) {
            if (src[k] && typeof src[k] === 'object' && !Array.isArray(src[k]) && typeof src[k] !== 'function') {
              if (!target[k]) target[k] = {};
              merge(target[k], src[k]);
            } else {
              target[k] = src[k];
            }
          }
        };
        merge(DICT[lang], translations[lang]);
      }
    },

    /**
     * DOM 자동 번역.
     * - data-i18n="key" → textContent
     * - data-i18n-placeholder="key" → placeholder
     * - data-i18n-title="key" → title
     * - data-i18n-html="key" → innerHTML (신중히)
     */
    applyAll(root) {
      const scope = root || document;

      scope.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        el.textContent = this.t(key);
      });
      scope.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        el.placeholder = this.t(key);
      });
      scope.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        el.title = this.t(key);
      });
      scope.querySelectorAll('[data-i18n-html]').forEach(el => {
        const key = el.getAttribute('data-i18n-html');
        el.innerHTML = this.t(key);
      });
    },

    /** 언어 전환 (전체 DOM 재번역) */
    setLang(lang) {
      _lang = lang;
      localStorage.setItem('sop_lang', lang);
      this.applyAll();
    },

    /** 개발용: 현재 언어의 누락 키 리포트 */
    missingReport() {
      console.log(`[i18n] ${_warned.size} missing translations in "${_lang}":`, Array.from(_warned));
    },
  };
})();

// 페이지 로드 시 자동 초기화 + DOM 번역
if (typeof window !== 'undefined') {
  I18n.init();
  const lang = I18n.lang();
  // html lang 속성도 동기화 (스크린리더 + SEO)
  if (document.documentElement) document.documentElement.lang = lang;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => I18n.applyAll());
  } else {
    I18n.applyAll();
  }
}
