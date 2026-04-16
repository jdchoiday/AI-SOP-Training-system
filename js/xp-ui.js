// ============================================
// 키우자 히어로즈 — XP UI 컴포넌트
// ============================================
// XP 토스트 알림 + 레벨업 축하 모달 + 효과음

// ===== 효과음 엔진 (Web Audio API, 무료) =====
const SFX = {
  _ctx: null,
  _enabled: true,
  _unlocked: false,

  _getCtx() {
    if (!this._ctx) {
      try { this._ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) { return null; }
    }
    // iOS: suspended 상태면 resume 시도
    if (this._ctx && this._ctx.state === 'suspended') {
      this._ctx.resume().catch(() => {});
    }
    return this._ctx;
  },

  // iOS/모바일: 첫 터치/클릭 시 AudioContext 활성화
  _initOnGesture() {
    if (this._unlocked) return;
    const unlock = () => {
      this._getCtx();
      this._unlocked = true;
      document.removeEventListener('click', unlock);
      document.removeEventListener('touchstart', unlock);
    };
    document.addEventListener('click', unlock, { once: true });
    document.addEventListener('touchstart', unlock, { once: true });
  },

  /** XP 획득 "띠링" */
  xp() {
    if (!this._enabled) return;
    const ctx = this._getCtx(); if (!ctx) return;
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sine'; osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.3);
  },

  /** 레벨업 "빠밤!" */
  levelUp() {
    if (!this._enabled) return;
    const ctx = this._getCtx(); if (!ctx) return;
    [523, 659, 784, 1047].forEach((freq, i) => {
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'triangle'; osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.12, ctx.currentTime + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.3);
      osc.start(ctx.currentTime + i * 0.12); osc.stop(ctx.currentTime + i * 0.12 + 0.3);
    });
  },

  /** Confetti/완료 "퐁" */
  pop() {
    if (!this._enabled) return;
    const ctx = this._getCtx(); if (!ctx) return;
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sine'; osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.2);
  },
};
// iOS 모바일 대응: 페이지 로드 시 제스처 리스너 등록
try { SFX._initOnGesture(); } catch(e) {}

/**
 * XP 적립 토스트 (화면 상단에 "+50 XP" 표시)
 */
function showXpToast(amount, isBonus = false) {
  try { SFX.xp(); } catch(e) {}
  // 기존 토스트 제거
  const old = document.getElementById('xp-toast');
  if (old) old.remove();

  const toast = document.createElement('div');
  toast.id = 'xp-toast';
  toast.className = 'xp-toast' + (isBonus ? ' xp-toast-bonus' : '');
  toast.innerHTML = isBonus
    ? `🎯 Perfect! <strong>+${amount} XP</strong>`
    : `⚡ <strong>+${amount} XP</strong>`;

  document.body.appendChild(toast);

  // 애니메이션: 등장 → 유지 → 사라짐
  requestAnimationFrame(() => { toast.classList.add('show'); });
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, 2200);
}

/**
 * 범용 Confetti 효과 — 보상/완료 시 화면에 폭죽 투사
 * @param {number} duration - 표시 시간 (ms), 기본 2500
 * @param {number} count - 파티클 수, 기본 40
 */
function showConfetti(duration = 2500, count = 40) {
  try { SFX.pop(); } catch(e) {}
  const existing = document.getElementById('confetti-burst');
  if (existing) existing.remove();

  const wrap = document.createElement('div');
  wrap.id = 'confetti-burst';
  wrap.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:99999;overflow:hidden;';

  const colors = ['#FFD700', '#FF6B35', '#00CED1', '#9B59B6', '#E74C3C', '#16a34a', '#10B981', '#3B82F6', '#F472B6'];
  for (let i = 0; i < count; i++) {
    const x = Math.random() * 100;
    const delay = Math.random() * 0.6;
    const size = 5 + Math.random() * 7;
    const color = colors[Math.floor(Math.random() * colors.length)];
    const shape = Math.random() > 0.5 ? 'border-radius:50%;' : Math.random() > 0.5 ? 'border-radius:2px;' : 'border-radius:50%;width:' + size*0.6 + 'px;';
    wrap.innerHTML += `<div class="confetti-particle" style="left:${x}%;animation-delay:${delay}s;width:${size}px;height:${size}px;background:${color};${shape}"></div>`;
  }

  document.body.appendChild(wrap);
  setTimeout(() => { if (wrap.parentNode) wrap.remove(); }, duration);
}

/**
 * 레벨업 축하 풀스크린 오버레이
 */
function showLevelUpCelebration(oldTier, newTier, lang = 'ko') {
  try { SFX.levelUp(); } catch(e) {}
  // 기존 오버레이 제거
  const old = document.getElementById('levelup-overlay');
  if (old) old.remove();

  const title = getTierTitle(newTier, lang);
  const overlay = document.createElement('div');
  overlay.id = 'levelup-overlay';
  overlay.className = 'levelup-overlay';

  // 오버레이 내부 파티클이 있으므로 외부 showConfetti()는 호출하지 않음
  // (호출 측에서 이미 showConfetti() 실행 후 레벨업 체크)

  // 폭죽 파티클 생성 (오버레이 내부용)
  let particles = '';
  for (let i = 0; i < 30; i++) {
    const x = Math.random() * 100;
    const delay = Math.random() * 0.5;
    const size = 4 + Math.random() * 6;
    const colors = ['#FFD700', '#FF6B35', '#00CED1', '#9B59B6', '#E74C3C', '#16a34a', '#10B981'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    particles += `<div class="confetti-particle" style="left:${x}%;animation-delay:${delay}s;width:${size}px;height:${size}px;background:${color};"></div>`;
  }

  const levelUpLabel = lang === 'en' ? 'LEVEL UP!' : lang === 'vi' ? 'THĂNG CẤP!' : '레벨 업!';
  const newTierLabel = lang === 'en' ? 'New Tier' : lang === 'vi' ? 'Cấp mới' : '새로운 등급';

  overlay.innerHTML = `
    <div class="confetti-container">${particles}</div>
    <div class="levelup-content">
      <div class="levelup-flash">${levelUpLabel}</div>
      <div class="levelup-emoji" style="font-size:72px;">${newTier.emoji}</div>
      <div class="levelup-tier" style="color:${newTier.color};">${newTierLabel}</div>
      <div class="levelup-title" style="color:${newTier.color};">${title} ${newTier.subLabel}</div>
      <div class="levelup-xp">${newTier.currentXp.toLocaleString()} XP</div>
    </div>
  `;

  overlay.addEventListener('click', () => {
    overlay.classList.add('fadeout');
    setTimeout(() => overlay.remove(), 500);
  });

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('show'));

  // 4초 후 자동 닫힘
  setTimeout(() => {
    if (document.getElementById('levelup-overlay')) {
      overlay.classList.add('fadeout');
      setTimeout(() => overlay.remove(), 500);
    }
  }, 4000);
}

/**
 * 홈 화면용 티어 카드 HTML 생성
 */
function createTierCardHTML(tier, lang = 'ko') {
  const title = getTierTitle(tier, lang);
  const nextXpText = tier.nextTierXp
    ? `${tier.currentXp.toLocaleString()} / ${tier.nextTierXp.toLocaleString()} XP`
    : `${tier.currentXp.toLocaleString()} XP (MAX)`;

  const xpLabel = lang === 'en' ? 'My Level' : lang === 'vi' ? 'Cấp của tôi' : '내 레벨';

  return `
    <div class="tier-card" style="border-left:4px solid ${tier.color};">
      <div style="display:flex; align-items:center; gap:12px;">
        <div class="tier-badge" style="background:${tier.color}20; color:${tier.color}; border:2px solid ${tier.color};">
          ${tier.emoji}
        </div>
        <div style="flex:1;">
          <div style="font-size:12px; color:var(--gray-500); margin-bottom:2px;">${xpLabel}</div>
          <div style="font-weight:700; font-size:16px; color:var(--gray-900);">${title} ${tier.subLabel}</div>
          <div class="tier-progress" style="margin-top:6px;">
            <div class="tier-progress-fill" style="width:${tier.progressPct}%; background:${tier.color};"></div>
          </div>
          <div style="font-size:11px; color:var(--gray-500); margin-top:3px;">${nextXpText}</div>
        </div>
      </div>
    </div>
  `;
}
