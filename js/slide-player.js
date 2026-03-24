// ============================================
// Slide-based Training Video Player
// ============================================
// Full-screen overlay that plays SOP scenes as
// a continuous slide presentation with TTS narration.
// Works with SopStore script data: {scene, narration, visual}
//
// Usage:
//   SlidePlayer.open(sopId)        - launch player for a SOP
//   SlidePlayer.close()            - close player
//   SlidePlayer.isOpen()           - check if player is open
// ============================================

const SlidePlayer = (() => {
  // --- State ---
  let scenes = [];        // {scene, narration, visual}[]
  let currentIndex = 0;
  let isPlaying = false;
  let isPaused = false;
  let sopId = null;
  let chId = null;        // chapter (SOP) id for progress tracking
  let startTime = 0;
  let overlay = null;
  let ttsResolve = null;
  let ttsReject = null;
  let destroyed = false;

  // --- i18n ---
  function _lang() { return localStorage.getItem('sop_lang') || (typeof CONFIG !== 'undefined' ? CONFIG.DEFAULT_LANG : 'ko'); }

  const L = {
    ko: {
      slideOf: (c, t) => `${c} / ${t}`,
      scene: '',
      pause: '일시정지',
      play: '재생',
      prev: '이전',
      next: '다음',
      close: '닫기',
      autoPlay: '자동 재생',
      totalDuration: '예상 소요',
      min: '분',
      sec: '초',
      visual: '시각 설명',
      completed: '학습 완료!',
      completedMsg: '모든 슬라이드를 시청했습니다.',
      closeBtn: '닫기',
      narration: '나레이션',
      slideTitle: (n, t) => `씬 ${n}/${t}`,
    },
    en: {
      slideOf: (c, t) => `${c} / ${t}`,
      scene: 'Scene',
      pause: 'Pause',
      play: 'Play',
      prev: 'Previous',
      next: 'Next',
      close: 'Close',
      autoPlay: 'Auto Play',
      totalDuration: 'Est. duration',
      min: 'min',
      sec: 'sec',
      visual: 'Visual',
      completed: 'Training Complete!',
      completedMsg: 'You have viewed all slides.',
      closeBtn: 'Close',
      narration: 'Narration',
      slideTitle: (n, t) => `Scene ${n}/${t}`,
    },
    vi: {
      slideOf: (c, t) => `${c} / ${t}`,
      scene: '',
      pause: 'Tam dung',
      play: 'Phat',
      prev: 'Truoc',
      next: 'Tiep',
      close: 'Dong',
      autoPlay: 'Tu dong phat',
      totalDuration: 'Thoi luong',
      min: 'phut',
      sec: 'giay',
      visual: 'Hinh anh',
      completed: 'Hoan thanh!',
      completedMsg: 'Ban da xem het tat ca slide.',
      closeBtn: 'Dong',
      narration: 'Thuyet minh',
      slideTitle: (n, t) => `Canh ${n}/${t}`,
    }
  };

  function t() { return L[_lang()] || L.ko; }

  function _ttsLang() {
    const l = _lang();
    if (l === 'en') return 'en-US';
    if (l === 'vi') return 'vi-VN';
    return 'ko-KR';
  }

  // --- Estimated duration per scene (rough: chars / speaking rate) ---
  function _estimateDuration(narration) {
    if (!narration) return 5;
    const l = _lang();
    const charsPerSec = l === 'ko' ? 4 : l === 'vi' ? 6 : 5;
    return Math.max(5, Math.ceil(narration.length / charsPerSec));
  }

  function _totalDuration() {
    return scenes.reduce((sum, s) => sum + _estimateDuration(s.narration), 0);
  }

  function _formatDuration(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m > 0) return `${m}${t().min} ${s}${t().sec}`;
    return `${s}${t().sec}`;
  }

  // --- Icon SVGs (inline, no dependencies) ---
  const ICONS = {
    play: '<svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><polygon points="6,3 20,12 6,21"/></svg>',
    pause: '<svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><rect x="5" y="3" width="4" height="18"/><rect x="15" y="3" width="4" height="18"/></svg>',
    prev: '<svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><polygon points="17,3 7,12 17,21"/></svg>',
    next: '<svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><polygon points="7,3 17,12 7,21"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="22" height="22"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>',
    volume: '<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0012 7.5v9a4.5 4.5 0 004.5-4.5z"/></svg>',
    eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
  };

  // =========================================
  // Build the overlay DOM
  // =========================================
  function _buildOverlay() {
    if (overlay) overlay.remove();

    overlay = document.createElement('div');
    overlay.id = 'slidePlayerOverlay';
    overlay.innerHTML = `
      <style>
        #slidePlayerOverlay {
          position: fixed; inset: 0; z-index: 100000;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
          display: flex; flex-direction: column;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          color: #f1f5f9; overflow: hidden;
          animation: sp-fadeIn 0.35s ease;
        }
        @keyframes sp-fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes sp-slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }

        /* Top bar */
        .sp-topbar {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 20px; flex-shrink: 0;
          background: rgba(0,0,0,0.3);
        }
        .sp-topbar-left { display: flex; align-items: center; gap: 12px; }
        .sp-close-btn {
          background: rgba(255,255,255,0.1); border: none; color: #f1f5f9;
          width: 36px; height: 36px; border-radius: 50%; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.2s;
        }
        .sp-close-btn:hover { background: rgba(255,255,255,0.2); }
        .sp-title-text { font-size: 15px; font-weight: 600; opacity: 0.9; }
        .sp-duration-badge {
          font-size: 12px; padding: 4px 10px; border-radius: 20px;
          background: rgba(99,102,241,0.3); color: #a5b4fc;
        }

        /* Main slide area */
        .sp-slide-area {
          flex: 1; display: flex; flex-direction: column;
          justify-content: center; align-items: center;
          padding: 20px 24px; overflow-y: auto;
          position: relative;
        }

        .sp-slide-container {
          width: 100%; max-width: 800px;
          animation: sp-slideUp 0.4s ease;
        }

        /* Scene badge */
        .sp-scene-badge {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 13px; font-weight: 700; color: #a5b4fc;
          background: rgba(99,102,241,0.15); padding: 6px 14px;
          border-radius: 20px; margin-bottom: 16px;
          letter-spacing: 0.5px;
        }

        /* Narration text */
        .sp-narration-area {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px; padding: 28px 28px 24px;
          margin-bottom: 16px; position: relative;
        }
        .sp-narration-label {
          position: absolute; top: -10px; left: 20px;
          font-size: 11px; font-weight: 700; text-transform: uppercase;
          color: #6366f1; background: #1e293b; padding: 2px 10px;
          border-radius: 4px; letter-spacing: 1px;
          display: flex; align-items: center; gap: 5px;
        }
        .sp-narration-text {
          font-size: 20px; line-height: 1.8; color: #e2e8f0;
          font-weight: 400; word-break: keep-all;
        }
        .sp-narration-text .sp-highlight {
          color: #fbbf24; font-weight: 600;
        }

        @media (max-width: 600px) {
          .sp-narration-text { font-size: 17px; line-height: 1.7; }
          .sp-narration-area { padding: 22px 18px 18px; }
          .sp-slide-area { padding: 12px 14px; }
        }

        /* Visual description */
        .sp-visual-area {
          display: flex; align-items: flex-start; gap: 10px;
          background: rgba(99,102,241,0.08);
          border: 1px solid rgba(99,102,241,0.15);
          border-radius: 12px; padding: 14px 18px;
          margin-bottom: 16px;
        }
        .sp-visual-icon { flex-shrink: 0; color: #818cf8; margin-top: 2px; }
        .sp-visual-text {
          font-size: 14px; color: #94a3b8; font-style: italic; line-height: 1.5;
        }

        /* Bottom control bar */
        .sp-controls {
          flex-shrink: 0; background: rgba(0,0,0,0.5);
          backdrop-filter: blur(10px); padding: 10px 20px 14px;
          border-top: 1px solid rgba(255,255,255,0.06);
        }

        /* Progress bar */
        .sp-progress-wrap {
          width: 100%; height: 4px; background: rgba(255,255,255,0.1);
          border-radius: 2px; margin-bottom: 10px; cursor: pointer;
          position: relative;
        }
        .sp-progress-wrap:hover { height: 6px; }
        .sp-progress-fill {
          height: 100%; background: linear-gradient(90deg, #6366f1, #a78bfa);
          border-radius: 2px; transition: width 0.3s ease;
          position: relative;
        }
        .sp-progress-fill::after {
          content: ''; position: absolute; right: -5px; top: 50%;
          transform: translateY(-50%); width: 12px; height: 12px;
          border-radius: 50%; background: #a78bfa;
          opacity: 0; transition: opacity 0.2s;
        }
        .sp-progress-wrap:hover .sp-progress-fill::after { opacity: 1; }

        /* Button row */
        .sp-btn-row {
          display: flex; align-items: center; justify-content: space-between;
        }
        .sp-btn-group { display: flex; align-items: center; gap: 8px; }

        .sp-ctrl-btn {
          background: none; border: none; color: #cbd5e1;
          cursor: pointer; padding: 8px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.15s;
        }
        .sp-ctrl-btn:hover { color: #f1f5f9; background: rgba(255,255,255,0.1); }
        .sp-ctrl-btn:disabled { opacity: 0.3; cursor: not-allowed; }
        .sp-ctrl-btn.sp-play-btn {
          background: rgba(99,102,241,0.3); width: 44px; height: 44px;
        }
        .sp-ctrl-btn.sp-play-btn:hover { background: rgba(99,102,241,0.5); }

        .sp-slide-counter {
          font-size: 13px; color: #94a3b8; font-weight: 600;
          min-width: 60px; text-align: center;
        }

        .sp-autoplay-toggle {
          display: flex; align-items: center; gap: 6px;
          font-size: 12px; color: #94a3b8; cursor: pointer;
          background: none; border: none; padding: 4px 8px;
        }
        .sp-autoplay-toggle:hover { color: #e2e8f0; }
        .sp-autoplay-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: #475569; transition: background 0.2s;
        }
        .sp-autoplay-dot.active { background: #22c55e; }

        /* Completion overlay */
        .sp-complete-overlay {
          position: absolute; inset: 0;
          background: rgba(15,23,42,0.95);
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          z-index: 10; animation: sp-fadeIn 0.4s ease;
        }
        .sp-complete-icon { font-size: 64px; margin-bottom: 16px; }
        .sp-complete-title { font-size: 24px; font-weight: 800; margin-bottom: 8px; color: #a5b4fc; }
        .sp-complete-msg { font-size: 15px; color: #94a3b8; margin-bottom: 24px; }
        .sp-complete-btn {
          padding: 14px 40px; border-radius: 12px; font-size: 16px; font-weight: 700;
          border: none; cursor: pointer; color: white;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          transition: transform 0.15s;
        }
        .sp-complete-btn:hover { transform: scale(1.03); }

        /* TTS active indicator */
        .sp-tts-indicator {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 12px; color: #6366f1; font-weight: 600;
        }
        .sp-tts-bars {
          display: flex; align-items: flex-end; gap: 2px; height: 14px;
        }
        .sp-tts-bar {
          width: 3px; background: #6366f1; border-radius: 1px;
          animation: sp-barAnim 0.8s ease-in-out infinite alternate;
        }
        .sp-tts-bar:nth-child(1) { height: 6px; animation-delay: 0s; }
        .sp-tts-bar:nth-child(2) { height: 10px; animation-delay: 0.15s; }
        .sp-tts-bar:nth-child(3) { height: 4px; animation-delay: 0.3s; }
        .sp-tts-bar:nth-child(4) { height: 12px; animation-delay: 0.45s; }
        @keyframes sp-barAnim {
          0% { transform: scaleY(0.4); }
          100% { transform: scaleY(1); }
        }
        .sp-tts-bars.paused .sp-tts-bar { animation-play-state: paused; }
      </style>

      <!-- Top Bar -->
      <div class="sp-topbar">
        <div class="sp-topbar-left">
          <button class="sp-close-btn" id="spCloseBtn" title="${t().close}">${ICONS.close}</button>
          <span class="sp-title-text" id="spTopTitle"></span>
        </div>
        <span class="sp-duration-badge" id="spDurationBadge"></span>
      </div>

      <!-- Slide Area -->
      <div class="sp-slide-area" id="spSlideArea">
        <div class="sp-slide-container" id="spSlideContainer"></div>
      </div>

      <!-- Bottom Controls -->
      <div class="sp-controls">
        <div class="sp-progress-wrap" id="spProgressWrap">
          <div class="sp-progress-fill" id="spProgressFill" style="width:0%"></div>
        </div>
        <div class="sp-btn-row">
          <div class="sp-btn-group">
            <button class="sp-ctrl-btn" id="spPrevBtn" title="${t().prev}">${ICONS.prev}</button>
            <button class="sp-ctrl-btn sp-play-btn" id="spPlayBtn">${ICONS.play}</button>
            <button class="sp-ctrl-btn" id="spNextBtn" title="${t().next}">${ICONS.next}</button>
            <span class="sp-slide-counter" id="spCounter">1 / 1</span>
          </div>
          <div class="sp-btn-group">
            <span class="sp-tts-indicator" id="spTtsIndicator" style="display:none;">
              <div class="sp-tts-bars" id="spTtsBars">
                <div class="sp-tts-bar"></div><div class="sp-tts-bar"></div>
                <div class="sp-tts-bar"></div><div class="sp-tts-bar"></div>
              </div>
            </span>
            <button class="sp-autoplay-toggle" id="spAutoToggle">
              <span class="sp-autoplay-dot active" id="spAutoDot"></span>
              ${t().autoPlay}
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    _bindEvents();
  }

  // =========================================
  // Render current slide
  // =========================================
  function _renderSlide() {
    const scene = scenes[currentIndex];
    if (!scene) return;

    const container = document.getElementById('spSlideContainer');
    const total = scenes.length;
    const num = currentIndex + 1;

    // Build bullet points from narration (split by sentence boundaries)
    const bullets = _extractBullets(scene.narration);
    const bulletsHtml = bullets.map(b => `<div style="margin-bottom:8px;">&#8226; ${_escHtml(b)}</div>`).join('');

    container.innerHTML = `
      <div class="sp-scene-badge">${t().slideTitle(num, total)}</div>
      <div class="sp-narration-area">
        <div class="sp-narration-label">${ICONS.volume} ${t().narration}</div>
        <div class="sp-narration-text" id="spNarrationText">${bulletsHtml || _escHtml(scene.narration)}</div>
      </div>
      ${scene.visual ? `
        <div class="sp-visual-area">
          <span class="sp-visual-icon">${ICONS.eye}</span>
          <span class="sp-visual-text">${t().visual}: ${_escHtml(scene.visual)}</span>
        </div>
      ` : ''}
    `;

    // Force re-animation
    container.style.animation = 'none';
    container.offsetHeight; // reflow
    container.style.animation = '';

    // Update counter & progress
    document.getElementById('spCounter').textContent = t().slideOf(num, total);
    document.getElementById('spProgressFill').style.width = (num / total * 100) + '%';

    // Button states
    document.getElementById('spPrevBtn').disabled = currentIndex === 0;
  }

  function _extractBullets(text) {
    if (!text) return [];
    // Split on sentence-ending punctuation, newlines, or numbered markers
    const parts = text
      .split(/(?<=[.!?。])\s+|\n+|(?=\d+[\.\)]\s)/)
      .map(s => s.trim())
      .filter(s => s.length > 3);
    // If only one sentence, return as-is (will render as paragraph)
    if (parts.length <= 1) return [];
    return parts;
  }

  function _escHtml(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
  }

  // =========================================
  // TTS playback for current slide
  // =========================================
  function _playCurrentTTS() {
    return new Promise((resolve, reject) => {
      if (destroyed) return reject('destroyed');
      const scene = scenes[currentIndex];
      if (!scene || !scene.narration) return resolve();

      // Show TTS indicator
      const indicator = document.getElementById('spTtsIndicator');
      const bars = document.getElementById('spTtsBars');
      if (indicator) indicator.style.display = 'inline-flex';
      if (bars) bars.classList.remove('paused');

      ttsResolve = resolve;
      ttsReject = reject;

      if (!window.speechSynthesis) {
        // Fallback: wait estimated duration
        const dur = _estimateDuration(scene.narration);
        setTimeout(() => {
          if (indicator) indicator.style.display = 'none';
          resolve();
        }, dur * 1000);
        return;
      }

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(scene.narration);
      utterance.lang = _ttsLang();
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;

      const voices = window.speechSynthesis.getVoices();
      const match = voices.find(v => v.lang === utterance.lang) ||
                    voices.find(v => v.lang.startsWith(utterance.lang.split('-')[0]));
      if (match) utterance.voice = match;

      // Highlight words as they are spoken
      utterance.onboundary = (e) => {
        if (e.name === 'word') {
          _highlightWord(e.charIndex, e.charLength, scene.narration);
        }
      };

      utterance.onend = () => {
        if (indicator) indicator.style.display = 'none';
        ttsResolve = null;
        resolve();
      };

      utterance.onerror = (e) => {
        if (indicator) indicator.style.display = 'none';
        ttsResolve = null;
        // On error, still resolve so playback continues
        resolve();
      };

      window.speechSynthesis.speak(utterance);
    });
  }

  function _highlightWord(charIdx, charLen, fullText) {
    // Optional: highlight the current word in the narration display
    // We keep it simple - just update a highlight class
    const el = document.getElementById('spNarrationText');
    if (!el) return;

    // If we rendered bullets, skip word highlighting (complex DOM)
    if (el.querySelector('div')) return;

    const before = _escHtml(fullText.substring(0, charIdx));
    const word = _escHtml(fullText.substring(charIdx, charIdx + charLen));
    const after = _escHtml(fullText.substring(charIdx + charLen));
    el.innerHTML = `${before}<span class="sp-highlight">${word}</span>${after}`;
  }

  function _stopTTS() {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    const indicator = document.getElementById('spTtsIndicator');
    if (indicator) indicator.style.display = 'none';
    if (ttsResolve) { ttsResolve(); ttsResolve = null; }
  }

  function _pauseTTS() {
    if (window.speechSynthesis && window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
      const bars = document.getElementById('spTtsBars');
      if (bars) bars.classList.add('paused');
    }
  }

  function _resumeTTS() {
    if (window.speechSynthesis && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      const bars = document.getElementById('spTtsBars');
      if (bars) bars.classList.remove('paused');
    }
  }

  // =========================================
  // Playback control
  // =========================================
  let autoPlay = true;

  async function _playSlide() {
    if (destroyed || isPaused) return;
    isPlaying = true;
    _updatePlayBtn();

    try {
      await _playCurrentTTS();
    } catch (e) {
      // Destroyed or error
      return;
    }

    if (destroyed || isPaused) return;

    // Auto-advance
    if (autoPlay && currentIndex < scenes.length - 1) {
      currentIndex++;
      _renderSlide();
      // Small delay between slides for smooth transition
      await new Promise(r => setTimeout(r, 600));
      if (!destroyed && !isPaused) _playSlide();
    } else if (currentIndex >= scenes.length - 1) {
      // Completed all slides
      _showCompletion();
    } else {
      isPlaying = false;
      _updatePlayBtn();
    }
  }

  function _togglePlay() {
    if (isPlaying && !isPaused) {
      // Pause
      isPaused = true;
      _pauseTTS();
      _updatePlayBtn();
    } else if (isPaused) {
      // Resume
      isPaused = false;
      _resumeTTS();
      _updatePlayBtn();
      // If TTS was not mid-speech, restart slide play
      if (!window.speechSynthesis || !window.speechSynthesis.paused) {
        _playSlide();
      }
    } else {
      // Start playing
      isPaused = false;
      _playSlide();
    }
  }

  function _goToSlide(idx) {
    if (idx < 0 || idx >= scenes.length) return;
    _stopTTS();
    isPaused = false;
    isPlaying = false;
    currentIndex = idx;
    _renderSlide();
    // Remove completion overlay if it exists
    const completeEl = document.querySelector('.sp-complete-overlay');
    if (completeEl) completeEl.remove();
    if (autoPlay) {
      setTimeout(() => _playSlide(), 300);
    }
  }

  function _updatePlayBtn() {
    const btn = document.getElementById('spPlayBtn');
    if (!btn) return;
    if (isPlaying && !isPaused) {
      btn.innerHTML = ICONS.pause;
    } else {
      btn.innerHTML = ICONS.play;
    }
  }

  function _showCompletion() {
    isPlaying = false;
    _updatePlayBtn();

    // Mark all videos as watched
    if (chId && typeof Progress !== 'undefined') {
      const vids = typeof SopStore !== 'undefined' ? SopStore.getVideos(chId) : [];
      vids.forEach(v => {
        if (!Progress.isVideoCompleted(v.id)) {
          Progress.completeVideo(v.id, chId);
          // Supabase sync
          const user = JSON.parse(localStorage.getItem('sop_user') || 'null');
          if (user?.id && typeof SupabaseMode !== 'undefined' && SupabaseMode._ready) {
            SupabaseMode.saveVideoProgress(user.id, v.id, chId).catch(() => {});
          }
        }
      });
    }

    const area = document.getElementById('spSlideArea');
    if (!area) return;

    const completeEl = document.createElement('div');
    completeEl.className = 'sp-complete-overlay';
    completeEl.innerHTML = `
      <div class="sp-complete-icon">&#127891;</div>
      <div class="sp-complete-title">${t().completed}</div>
      <div class="sp-complete-msg">${t().completedMsg}</div>
      <button class="sp-complete-btn" id="spCompleteCloseBtn">${t().closeBtn}</button>
    `;
    area.appendChild(completeEl);

    document.getElementById('spCompleteCloseBtn').addEventListener('click', () => {
      _close();
    });

    // Update progress bar to 100%
    document.getElementById('spProgressFill').style.width = '100%';
  }

  // =========================================
  // Progress bar click-to-seek
  // =========================================
  function _handleProgressClick(e) {
    const wrap = document.getElementById('spProgressWrap');
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetIdx = Math.min(scenes.length - 1, Math.floor(pct * scenes.length));
    _goToSlide(targetIdx);
  }

  // =========================================
  // Bind all events
  // =========================================
  function _bindEvents() {
    document.getElementById('spCloseBtn').addEventListener('click', _close);
    document.getElementById('spPlayBtn').addEventListener('click', _togglePlay);
    document.getElementById('spPrevBtn').addEventListener('click', () => _goToSlide(currentIndex - 1));
    document.getElementById('spNextBtn').addEventListener('click', () => _goToSlide(currentIndex + 1));
    document.getElementById('spProgressWrap').addEventListener('click', _handleProgressClick);

    document.getElementById('spAutoToggle').addEventListener('click', () => {
      autoPlay = !autoPlay;
      const dot = document.getElementById('spAutoDot');
      if (dot) dot.classList.toggle('active', autoPlay);
    });

    // Keyboard shortcuts
    overlay._keyHandler = (e) => {
      if (e.key === 'Escape') _close();
      if (e.key === ' ' || e.key === 'k') { e.preventDefault(); _togglePlay(); }
      if (e.key === 'ArrowLeft' || e.key === 'p') _goToSlide(currentIndex - 1);
      if (e.key === 'ArrowRight' || e.key === 'n') _goToSlide(currentIndex + 1);
    };
    document.addEventListener('keydown', overlay._keyHandler);

    // Swipe support for mobile
    let touchStartX = 0;
    const area = document.getElementById('spSlideArea');
    area.addEventListener('touchstart', (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
    area.addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 60) {
        if (dx > 0) _goToSlide(currentIndex - 1);
        else _goToSlide(currentIndex + 1);
      }
    }, { passive: true });
  }

  // =========================================
  // Public API
  // =========================================
  function _open(targetSopId) {
    sopId = targetSopId;
    chId = targetSopId;
    destroyed = false;
    currentIndex = 0;
    isPlaying = false;
    isPaused = false;
    startTime = Date.now();
    autoPlay = true;

    // Get scenes from SopStore
    if (typeof SopStore === 'undefined') {
      console.error('SlidePlayer: SopStore not available');
      return;
    }
    const sop = SopStore.getById(sopId);
    if (!sop || !sop.script || sop.script.length === 0) {
      console.error('SlidePlayer: No script found for SOP', sopId);
      return;
    }
    scenes = sop.script;

    // Build overlay
    _buildOverlay();

    // Set title
    const titleEl = document.getElementById('spTopTitle');
    if (titleEl) {
      const lang = _lang();
      const title = (lang === 'en' && sop.title_en) ? sop.title_en
                  : (lang === 'vi' && sop.title_vn) ? sop.title_vn
                  : sop.title;
      titleEl.textContent = title;
    }

    // Set duration
    const durEl = document.getElementById('spDurationBadge');
    if (durEl) {
      durEl.textContent = `${t().totalDuration}: ~${_formatDuration(_totalDuration())}`;
    }

    // Render first slide
    _renderSlide();

    // Prevent body scroll
    document.body.style.overflow = 'hidden';

    // Auto-start after a short delay
    setTimeout(() => {
      if (!destroyed) _playSlide();
    }, 800);
  }

  function _close() {
    destroyed = true;
    _stopTTS();

    if (overlay) {
      if (overlay._keyHandler) {
        document.removeEventListener('keydown', overlay._keyHandler);
      }
      overlay.style.animation = 'none';
      overlay.style.opacity = '0';
      overlay.style.transition = 'opacity 0.25s ease';
      setTimeout(() => {
        if (overlay) overlay.remove();
        overlay = null;
      }, 260);
    }

    document.body.style.overflow = '';
    isPlaying = false;
    isPaused = false;

    // Notify callback if set
    if (_onCloseCallback) {
      _onCloseCallback();
      _onCloseCallback = null;
    }
  }

  let _onCloseCallback = null;

  return {
    open(sopId) { _open(sopId); },
    close() { _close(); },
    isOpen() { return !!overlay && !destroyed; },
    onClose(fn) { _onCloseCallback = fn; },
  };
})();
