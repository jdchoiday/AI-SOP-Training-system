// ============================================
// 키우자 히어로즈 — XP UI 컴포넌트
// ============================================
// XP 토스트 알림 + 레벨업 축하 모달

/**
 * XP 적립 토스트 (화면 상단에 "+50 XP" 표시)
 */
function showXpToast(amount, isBonus = false) {
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
 * 레벨업 축하 풀스크린 오버레이
 */
function showLevelUpCelebration(oldTier, newTier, lang = 'ko') {
  // 기존 오버레이 제거
  const old = document.getElementById('levelup-overlay');
  if (old) old.remove();

  const title = getTierTitle(newTier, lang);
  const overlay = document.createElement('div');
  overlay.id = 'levelup-overlay';
  overlay.className = 'levelup-overlay';

  // 폭죽 파티클 생성
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
