// ============================================
// Floating Feedback Widget (베타 피드백 버튼)
// ============================================
// 모든 페이지 우측 하단 떠있는 💬 버튼.
// 클릭 → 모달 → 카테고리/심각도/메시지 입력 → /api/feedback POST
//
// 통합:
//   <script src="js/feedback-widget.js?v=2026-04-23e"></script>
//
// 초기화 옵션 (선택):
//   window.FEEDBACK_WIDGET_OPTIONS = { position: 'bottom-right', hidden: false };
//
// 사용자 컨텍스트 — 페이지가 supabase-client 로드 후 window.currentUser 세팅하면
// 자동으로 employee_id / employee_name 포함됨.
// ============================================

(function () {
  if (window.__feedbackWidgetLoaded) return;
  window.__feedbackWidgetLoaded = true;

  const OPTS = Object.assign({
    position: 'bottom-right',
    hidden: false,
    endpoint: '/api/feedback',
  }, window.FEEDBACK_WIDGET_OPTIONS || {});

  // ---------------- 스타일 주입 ----------------
  const style = document.createElement('style');
  style.textContent = `
  .fbw-fab {
    position: fixed; z-index: 99998;
    bottom: 20px; right: 20px;
    width: 52px; height: 52px; border-radius: 50%;
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    color: white; border: none; cursor: pointer;
    font-size: 22px; line-height: 1;
    box-shadow: 0 6px 20px rgba(99,102,241,0.4);
    transition: transform 0.15s ease, box-shadow 0.15s ease;
    display: flex; align-items: center; justify-content: center;
  }
  .fbw-fab:hover { transform: translateY(-2px) scale(1.05); box-shadow: 0 8px 24px rgba(99,102,241,0.5); }
  .fbw-fab:active { transform: translateY(0) scale(0.98); }
  .fbw-fab[data-hidden="true"] { display: none; }

  .fbw-modal-backdrop {
    position: fixed; inset: 0; z-index: 99999;
    background: rgba(0,0,0,0.5);
    display: flex; align-items: center; justify-content: center;
    padding: 16px; animation: fbwFadeIn 0.15s ease;
  }
  @keyframes fbwFadeIn { from { opacity: 0; } to { opacity: 1; } }

  .fbw-modal {
    background: white; border-radius: 16px;
    width: 100%; max-width: 460px; max-height: 90vh; overflow-y: auto;
    box-shadow: 0 20px 50px rgba(0,0,0,0.3);
    animation: fbwSlideUp 0.2s ease;
  }
  @keyframes fbwSlideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

  .fbw-header {
    padding: 20px 24px 12px; border-bottom: 1px solid #f1f5f9;
    display: flex; justify-content: space-between; align-items: center;
  }
  .fbw-title { font-size: 18px; font-weight: 700; color: #1e293b; margin: 0; }
  .fbw-subtitle { font-size: 12px; color: #64748b; margin: 4px 0 0; }
  .fbw-close {
    background: none; border: none; font-size: 24px; color: #94a3b8;
    cursor: pointer; padding: 0; width: 32px; height: 32px;
    border-radius: 8px; transition: background 0.15s;
  }
  .fbw-close:hover { background: #f1f5f9; color: #475569; }

  .fbw-body { padding: 16px 24px 24px; }
  .fbw-field { margin-bottom: 16px; }
  .fbw-label {
    display: block; font-size: 13px; font-weight: 600;
    color: #334155; margin-bottom: 6px;
  }
  .fbw-cat-grid {
    display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px;
  }
  .fbw-cat-btn {
    padding: 10px 4px; border: 2px solid #e2e8f0; border-radius: 10px;
    background: white; cursor: pointer; font-size: 11px;
    display: flex; flex-direction: column; align-items: center; gap: 4px;
    transition: all 0.15s; color: #475569;
  }
  .fbw-cat-btn:hover { border-color: #a5b4fc; background: #eef2ff; }
  .fbw-cat-btn.active {
    border-color: #6366f1; background: #eef2ff; color: #4338ca; font-weight: 700;
  }
  .fbw-cat-btn-icon { font-size: 20px; line-height: 1; }

  .fbw-sev-row { display: flex; gap: 6px; }
  .fbw-sev-btn {
    flex: 1; padding: 8px; border: 2px solid #e2e8f0; border-radius: 8px;
    background: white; cursor: pointer; font-size: 12px; font-weight: 600;
    color: #475569; transition: all 0.15s;
  }
  .fbw-sev-btn:hover { border-color: #cbd5e1; }
  .fbw-sev-btn.active[data-sev="low"]       { border-color: #10b981; background: #d1fae5; color: #065f46; }
  .fbw-sev-btn.active[data-sev="normal"]    { border-color: #3b82f6; background: #dbeafe; color: #1e40af; }
  .fbw-sev-btn.active[data-sev="high"]      { border-color: #f59e0b; background: #fef3c7; color: #92400e; }
  .fbw-sev-btn.active[data-sev="critical"]  { border-color: #ef4444; background: #fee2e2; color: #991b1b; }

  .fbw-textarea {
    width: 100%; box-sizing: border-box;
    padding: 12px; border: 2px solid #e2e8f0; border-radius: 10px;
    font-size: 14px; font-family: inherit; resize: vertical;
    min-height: 110px; line-height: 1.5; color: #1e293b;
  }
  .fbw-textarea:focus { outline: none; border-color: #6366f1; }
  .fbw-counter { font-size: 11px; color: #94a3b8; text-align: right; margin-top: 4px; }

  .fbw-meta {
    font-size: 11px; color: #94a3b8; margin-top: 4px;
    padding: 8px 10px; background: #f8fafc; border-radius: 6px;
    line-height: 1.5;
  }

  .fbw-actions {
    display: flex; gap: 8px; margin-top: 20px;
  }
  .fbw-btn {
    flex: 1; padding: 12px; border-radius: 10px; border: none;
    font-size: 14px; font-weight: 600; cursor: pointer;
    transition: all 0.15s;
  }
  .fbw-btn-cancel { background: #f1f5f9; color: #475569; }
  .fbw-btn-cancel:hover { background: #e2e8f0; }
  .fbw-btn-submit {
    background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white;
  }
  .fbw-btn-submit:hover { filter: brightness(1.05); }
  .fbw-btn-submit:disabled { opacity: 0.5; cursor: not-allowed; filter: none; }

  .fbw-toast {
    position: fixed; left: 50%; bottom: 90px; transform: translateX(-50%);
    background: #1e293b; color: white; padding: 10px 16px; border-radius: 10px;
    font-size: 13px; z-index: 100000; box-shadow: 0 8px 24px rgba(0,0,0,0.25);
    animation: fbwFadeIn 0.15s ease;
  }
  .fbw-toast[data-type="error"] { background: #991b1b; }
  .fbw-toast[data-type="success"] { background: #065f46; }

  @media (max-width: 480px) {
    .fbw-fab { bottom: 16px; right: 16px; width: 48px; height: 48px; font-size: 20px; }
    .fbw-modal { border-radius: 14px 14px 0 0; max-height: 95vh; align-self: flex-end; }
    .fbw-modal-backdrop { padding: 0; align-items: flex-end; }
    .fbw-cat-grid { grid-template-columns: repeat(5, 1fr); }
  }
  `;
  document.head.appendChild(style);

  // ---------------- FAB ----------------
  const fab = document.createElement('button');
  fab.className = 'fbw-fab';
  fab.innerHTML = '💬';
  fab.title = '피드백 보내기 (베타)';
  fab.setAttribute('aria-label', '피드백 보내기');
  fab.dataset.hidden = OPTS.hidden ? 'true' : 'false';
  fab.addEventListener('click', openModal);
  document.body.appendChild(fab);

  // ---------------- 모달 ----------------
  let modalEl = null;
  let state = { category: 'bug', severity: 'normal' };

  const CATEGORIES = [
    { key: 'bug',        icon: '🐛', label: '버그' },
    { key: 'ux',         icon: '🎨', label: 'UX' },
    { key: 'content',    icon: '📝', label: '내용' },
    { key: 'suggestion', icon: '💡', label: '제안' },
    { key: 'general',    icon: '💬', label: '기타' },
  ];
  const SEVERITIES = [
    { key: 'low',      label: '가벼움' },
    { key: 'normal',   label: '보통' },
    { key: 'high',     label: '심각' },
    { key: 'critical', label: '치명적' },
  ];

  function openModal() {
    if (modalEl) return;
    state = { category: 'bug', severity: 'normal' };

    const backdrop = document.createElement('div');
    backdrop.className = 'fbw-modal-backdrop';
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeModal();
    });

    const modal = document.createElement('div');
    modal.className = 'fbw-modal';
    modal.innerHTML = `
      <div class="fbw-header">
        <div>
          <h3 class="fbw-title">피드백 보내기</h3>
          <p class="fbw-subtitle">소프트런칭 베타 · 개선에 도움이 됩니다</p>
        </div>
        <button class="fbw-close" type="button" aria-label="닫기">✕</button>
      </div>
      <div class="fbw-body">
        <div class="fbw-field">
          <label class="fbw-label">종류</label>
          <div class="fbw-cat-grid" role="radiogroup" aria-label="피드백 종류">
            ${CATEGORIES.map(c => `
              <button type="button" class="fbw-cat-btn ${c.key === state.category ? 'active' : ''}" data-cat="${c.key}">
                <span class="fbw-cat-btn-icon">${c.icon}</span>
                <span>${c.label}</span>
              </button>`).join('')}
          </div>
        </div>
        <div class="fbw-field">
          <label class="fbw-label">심각도</label>
          <div class="fbw-sev-row" role="radiogroup" aria-label="심각도">
            ${SEVERITIES.map(s => `
              <button type="button" class="fbw-sev-btn ${s.key === state.severity ? 'active' : ''}" data-sev="${s.key}">${s.label}</button>`).join('')}
          </div>
        </div>
        <div class="fbw-field">
          <label class="fbw-label" for="fbw-msg">내용</label>
          <textarea id="fbw-msg" class="fbw-textarea" maxlength="4000"
            placeholder="어떤 문제가 있었는지, 어떤 상황이었는지 자세히 알려주세요.&#10;예) 7챕터 퀴즈 문제 3번에서 제출 버튼을 눌러도 반응이 없어요."></textarea>
          <div class="fbw-counter"><span id="fbw-count">0</span> / 4000</div>
        </div>
        <div class="fbw-meta" id="fbw-meta"></div>
        <div class="fbw-actions">
          <button type="button" class="fbw-btn fbw-btn-cancel">취소</button>
          <button type="button" class="fbw-btn fbw-btn-submit">보내기</button>
        </div>
      </div>
    `;
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);
    modalEl = backdrop;

    // 카테고리 버튼
    modal.querySelectorAll('.fbw-cat-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        state.category = btn.dataset.cat;
        modal.querySelectorAll('.fbw-cat-btn').forEach(b => b.classList.toggle('active', b.dataset.cat === state.category));
      });
    });
    // 심각도 버튼
    modal.querySelectorAll('.fbw-sev-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        state.severity = btn.dataset.sev;
        modal.querySelectorAll('.fbw-sev-btn').forEach(b => b.classList.toggle('active', b.dataset.sev === state.severity));
      });
    });
    // 카운터
    const ta = modal.querySelector('#fbw-msg');
    const counter = modal.querySelector('#fbw-count');
    ta.addEventListener('input', () => { counter.textContent = ta.value.length; });

    // 메타 정보 표시
    const meta = modal.querySelector('#fbw-meta');
    const user = getCurrentUser();
    const ctx = [
      user ? `사번: ${user.employee_id || '-'}${user.name ? ' (' + user.name + ')' : ''}` : '로그인 안 됨',
      `페이지: ${location.pathname}${location.search}`,
      `화면: ${window.innerWidth}×${window.innerHeight}`,
    ];
    meta.innerHTML = ctx.map(t => `• ${escapeHtml(t)}`).join('<br>');

    // 닫기 / 취소
    modal.querySelector('.fbw-close').addEventListener('click', closeModal);
    modal.querySelector('.fbw-btn-cancel').addEventListener('click', closeModal);
    // 전송
    const submitBtn = modal.querySelector('.fbw-btn-submit');
    submitBtn.addEventListener('click', async () => {
      const msg = ta.value.trim();
      if (!msg) {
        toast('내용을 입력해주세요', 'error');
        ta.focus();
        return;
      }
      submitBtn.disabled = true;
      submitBtn.textContent = '전송 중...';
      try {
        await submit(msg);
        toast('보내주셔서 감사합니다! 🙏', 'success');
        closeModal();
      } catch (e) {
        console.error('[feedback] 전송 실패:', e);
        toast(e.message || '전송 실패 · 잠시 후 재시도', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = '보내기';
      }
    });

    // ESC 로 닫기
    document.addEventListener('keydown', onEsc);
    setTimeout(() => ta.focus(), 80);
  }

  function onEsc(e) {
    if (e.key === 'Escape') closeModal();
  }

  function closeModal() {
    if (!modalEl) return;
    modalEl.remove();
    modalEl = null;
    document.removeEventListener('keydown', onEsc);
  }

  async function submit(message) {
    const user = getCurrentUser();
    const body = {
      employee_id: user?.employee_id || null,
      employee_name: user?.name || null,
      category: state.category,
      severity: state.severity,
      message,
      page_url: location.href,
      user_agent: navigator.userAgent,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      metadata: getPageContext(),
    };

    const resp = await fetch(OPTS.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      throw new Error(data?.error || `HTTP ${resp.status}`);
    }
    return data;
  }

  function getCurrentUser() {
    // 프로젝트 내 다양한 저장 방식 지원
    if (window.currentUser && typeof window.currentUser === 'object') return window.currentUser;
    try {
      const raw = localStorage.getItem('currentUser') || localStorage.getItem('user');
      if (raw) return JSON.parse(raw);
    } catch (e) { /* noop */ }
    return null;
  }

  function getPageContext() {
    const ctx = {};
    try {
      // chapter.html 컨텍스트
      if (typeof window.currentChapterId !== 'undefined') ctx.chapter_id = window.currentChapterId;
      if (typeof window.currentSectionId !== 'undefined') ctx.section_id = window.currentSectionId;
      // slide-player 상태
      if (window.SlidePlayer && typeof window.SlidePlayer.currentIndex === 'number') {
        ctx.slide_index = window.SlidePlayer.currentIndex;
      }
      if (window.SlidePlayer?._lastTtsEngine) ctx.tts_engine = window.SlidePlayer._lastTtsEngine;
      // 화면 DPR
      ctx.dpr = window.devicePixelRatio || 1;
      ctx.referrer = document.referrer || null;
    } catch (e) { /* noop */ }
    return ctx;
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m]));
  }

  function toast(text, type) {
    const old = document.querySelector('.fbw-toast');
    if (old) old.remove();
    const el = document.createElement('div');
    el.className = 'fbw-toast';
    if (type) el.dataset.type = type;
    el.textContent = text;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  }

  // 외부에서 프로그래밍으로 열기
  window.openFeedbackWidget = openModal;
  window.hideFeedbackWidget = () => { fab.dataset.hidden = 'true'; };
  window.showFeedbackWidget = () => { fab.dataset.hidden = 'false'; };
})();
