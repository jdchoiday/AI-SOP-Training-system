// ============================================
// PWA Install Prompt — 앱처럼 설치 유도
// ============================================
// 동작:
// 1. Service Worker 등록 (모든 페이지에서 호출 안전 — 중복 register 무해)
// 2. 안드로이드/Chrome: beforeinstallprompt 이벤트 → 우측 하단 "앱 설치" 플로팅 버튼
// 3. iOS Safari: 자동 프롬프트 미지원 → "공유 → 홈 화면에 추가" 안내 모달
// 4. 이미 설치된 앱(standalone 모드) → UI 노출 안 함
// 5. 한 번 설치/거절하면 7일간 표시 안 함
// ============================================
(function () {
  'use strict';

  if (typeof window === 'undefined') return;

  // ===== 1. Service Worker 등록 =====
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    // 페이지가 완전히 로드된 후 등록 (초기 로딩 영향 최소화)
    if (document.readyState === 'complete') {
      navigator.serviceWorker.register('/sw.js').catch(e => console.warn('[PWA] SW 등록 실패:', e));
    } else {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(e => console.warn('[PWA] SW 등록 실패:', e));
      });
    }
  }

  // ===== 2. 이미 설치된 상태면 UI 안 띄우기 =====
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;
  if (isStandalone) return;

  // ===== 3. 짧은 기간 내 거절했으면 표시 안 함 =====
  const DISMISS_KEY = 'sop_pwa_dismissed_at';
  const DISMISS_COOLDOWN_DAYS = 7;
  const lastDismiss = parseInt(localStorage.getItem(DISMISS_KEY) || '0');
  if (lastDismiss && (Date.now() - lastDismiss) < DISMISS_COOLDOWN_DAYS * 86400000) return;

  // ===== 4. 다국어 사전 =====
  const lang = (typeof CONFIG !== 'undefined' ? localStorage.getItem('sop_lang') || CONFIG.DEFAULT_LANG : 'ko');
  const TEXTS = {
    ko: {
      installBtn: '📱 앱으로 설치',
      installDesc: '홈 화면에 추가하면 더 빠르고 편해요',
      install: '설치',
      later: '나중에',
      iosTitle: '아이폰에 앱으로 설치하기',
      iosStep1: '아래 메뉴 중 "공유" 버튼 누르기',
      iosStep2: '"홈 화면에 추가" 선택',
      iosStep3: '오른쪽 위 "추가" 버튼 누르기',
      iosClose: '닫기',
      installed: '✅ 앱이 설치되었어요!',
    },
    en: {
      installBtn: '📱 Install App',
      installDesc: 'Add to home screen for faster access',
      install: 'Install',
      later: 'Later',
      iosTitle: 'Install on your iPhone',
      iosStep1: 'Tap the "Share" button at the bottom',
      iosStep2: 'Select "Add to Home Screen"',
      iosStep3: 'Tap "Add" in the top right',
      iosClose: 'Close',
      installed: '✅ App installed!',
    },
    vi: {
      installBtn: '📱 Cài đặt ứng dụng',
      installDesc: 'Thêm vào màn hình chính để truy cập nhanh hơn',
      install: 'Cài đặt',
      later: 'Để sau',
      iosTitle: 'Cài đặt trên iPhone',
      iosStep1: 'Nhấn nút "Chia sẻ" ở dưới',
      iosStep2: 'Chọn "Thêm vào Màn hình chính"',
      iosStep3: 'Nhấn "Thêm" ở góc trên bên phải',
      iosClose: 'Đóng',
      installed: '✅ Đã cài đặt ứng dụng!',
    },
  };
  const t = TEXTS[lang] || TEXTS.ko;

  // ===== 5. 환경 감지 =====
  const ua = navigator.userAgent || '';
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
  const isAndroid = /Android/i.test(ua);

  // ===== 6. 플로팅 설치 버튼 (Android/Chrome) =====
  let deferredPrompt = null;

  function createInstallButton() {
    if (document.getElementById('pwaInstallBtn')) return;
    const btn = document.createElement('button');
    btn.id = 'pwaInstallBtn';
    btn.innerHTML = `<span style="font-size:16px;">${t.installBtn}</span>`;
    btn.style.cssText = `
      position: fixed;
      bottom: 84px;
      right: 16px;
      z-index: 9998;
      background: linear-gradient(135deg, #10B981, #059669);
      color: white;
      border: none;
      border-radius: 24px;
      padding: 12px 20px;
      font-size: 14px;
      font-weight: 700;
      box-shadow: 0 6px 20px rgba(16,185,129,0.4);
      cursor: pointer;
      animation: pwaSlideUp 0.4s ease-out;
      max-width: 220px;
    `;
    btn.onclick = handleInstallClick;

    // 닫기 X 버튼
    const closeX = document.createElement('span');
    closeX.textContent = '×';
    closeX.style.cssText = `
      position: absolute;
      top: -8px;
      right: -8px;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: #1E293B;
      color: white;
      font-size: 16px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    `;
    closeX.onclick = (e) => {
      e.stopPropagation();
      localStorage.setItem(DISMISS_KEY, Date.now().toString());
      btn.remove();
    };
    btn.appendChild(closeX);

    // 애니메이션 키프레임 (한 번만 주입)
    if (!document.getElementById('pwaInstallStyle')) {
      const style = document.createElement('style');
      style.id = 'pwaInstallStyle';
      style.textContent = `
        @keyframes pwaSlideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pwaFadeIn { from { opacity: 0; } to { opacity: 1; } }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(btn);
  }

  async function handleInstallClick() {
    if (deferredPrompt) {
      // Android/Chrome: 네이티브 설치 프롬프트
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        showToast(t.installed);
      } else {
        localStorage.setItem(DISMISS_KEY, Date.now().toString());
      }
      deferredPrompt = null;
      const btn = document.getElementById('pwaInstallBtn');
      if (btn) btn.remove();
    } else if (isIOS) {
      // iOS: 안내 모달
      showIosGuide();
    }
  }

  function showToast(msg) {
    const toast = document.createElement('div');
    toast.textContent = msg;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #10B981;
      color: white;
      padding: 12px 24px;
      border-radius: 24px;
      font-size: 14px;
      font-weight: 600;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      animation: pwaFadeIn 0.3s ease-out;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
  }

  // ===== 7. iOS 안내 모달 =====
  function showIosGuide() {
    if (document.getElementById('pwaIosModal')) return;

    const overlay = document.createElement('div');
    overlay.id = 'pwaIosModal';
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.7);
      z-index: 10001;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      animation: pwaFadeIn 0.25s ease-out;
    `;

    overlay.innerHTML = `
      <div style="background: linear-gradient(135deg, #1E293B 0%, #0F172A 100%); border-radius: 20px; padding: 28px 24px; max-width: 360px; width: 100%; color: #F1F5F9; box-shadow: 0 20px 60px rgba(0,0,0,0.5); border: 1px solid rgba(16,185,129,0.2);">
        <div style="text-align:center; margin-bottom: 18px;">
          <div style="font-size: 56px; margin-bottom: 8px;">📱</div>
          <h3 style="font-size: 18px; font-weight: 700; margin: 0;">${t.iosTitle}</h3>
        </div>
        <ol style="list-style: none; padding: 0; margin: 0 0 18px; counter-reset: step;">
          <li style="counter-increment: step; padding: 12px 12px 12px 44px; margin-bottom: 8px; background: rgba(16,185,129,0.08); border-radius: 12px; position: relative; font-size: 14px; line-height: 1.4;">
            <span style="position: absolute; left: 12px; top: 12px; width: 24px; height: 24px; border-radius: 50%; background: #10B981; color: white; font-size: 13px; font-weight: 700; display: flex; align-items: center; justify-content: center;">1</span>
            ${t.iosStep1}
            <span style="display:inline-block; margin-left:6px; padding: 2px 6px; background: rgba(255,255,255,0.1); border-radius: 6px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle;"><path d="M12 2L8 6h3v9h2V6h3l-4-4z"/><path d="M5 11v9a2 2 0 002 2h10a2 2 0 002-2v-9"/></svg>
            </span>
          </li>
          <li style="counter-increment: step; padding: 12px 12px 12px 44px; margin-bottom: 8px; background: rgba(16,185,129,0.08); border-radius: 12px; position: relative; font-size: 14px; line-height: 1.4;">
            <span style="position: absolute; left: 12px; top: 12px; width: 24px; height: 24px; border-radius: 50%; background: #10B981; color: white; font-size: 13px; font-weight: 700; display: flex; align-items: center; justify-content: center;">2</span>
            ${t.iosStep2} ➕
          </li>
          <li style="counter-increment: step; padding: 12px 12px 12px 44px; background: rgba(16,185,129,0.08); border-radius: 12px; position: relative; font-size: 14px; line-height: 1.4;">
            <span style="position: absolute; left: 12px; top: 12px; width: 24px; height: 24px; border-radius: 50%; background: #10B981; color: white; font-size: 13px; font-weight: 700; display: flex; align-items: center; justify-content: center;">3</span>
            ${t.iosStep3}
          </li>
        </ol>
        <button id="pwaIosClose" style="width:100%; padding: 12px; background: rgba(255,255,255,0.1); color: #F1F5F9; border: none; border-radius: 12px; font-size: 14px; font-weight: 600; cursor: pointer;">
          ${t.iosClose}
        </button>
      </div>
    `;

    overlay.onclick = (e) => {
      if (e.target === overlay || e.target.id === 'pwaIosClose') {
        overlay.remove();
        localStorage.setItem(DISMISS_KEY, Date.now().toString());
      }
    };

    document.body.appendChild(overlay);
  }

  // ===== 8. 이벤트 바인딩 =====

  // Android/Chrome: 브라우저가 설치 가능하다고 판단하면 이벤트 발생
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    // 페이지 로딩 후 1.5초 뒤에 살짝 띄움 (방해 안 되게)
    setTimeout(createInstallButton, 1500);
  });

  // iOS: beforeinstallprompt 이벤트가 없음 → 직접 띄우기
  // standalone 이 아니고, iOS 사파리이면 → 한 번 보여주기
  if (isIOS) {
    setTimeout(() => {
      // 같은 페이지에서 이미 띄웠으면 스킵
      if (sessionStorage.getItem('pwa_ios_shown_this_session')) return;
      sessionStorage.setItem('pwa_ios_shown_this_session', '1');
      createInstallButton();
    }, 3000);
  }

  // 설치 완료 감지
  window.addEventListener('appinstalled', () => {
    showToast(t.installed);
    const btn = document.getElementById('pwaInstallBtn');
    if (btn) btn.remove();
    localStorage.removeItem(DISMISS_KEY);
  });

  // 디버그 / 강제 호출용 (콘솔에서 PWAInstall.show() 호출)
  window.PWAInstall = {
    show: createInstallButton,
    showIosGuide,
    dismiss: () => localStorage.setItem(DISMISS_KEY, Date.now().toString()),
    reset: () => localStorage.removeItem(DISMISS_KEY),
    isStandalone,
    isIOS,
    isAndroid,
  };

})();
