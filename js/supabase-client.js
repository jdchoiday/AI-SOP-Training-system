// ============================================
// Supabase 연동 레이어
// ============================================
// config.js의 SUPABASE_URL이 설정되면 자동으로 Supabase 사용
// 미설정이면 localStorage 모드(demo-data.js)로 작동
//
// 전환 방법:
// 1. Supabase 프로젝트 생성 (supabase.com)
// 2. SQL Editor에서 docs/SETUP-GUIDE.md의 SQL 실행
// 3. config.js에 URL + ANON_KEY 입력
// 4. 끝! 자동으로 Supabase 모드로 전환됨

const SupabaseMode = {
  isEnabled() {
    return CONFIG.SUPABASE_URL && CONFIG.SUPABASE_URL !== 'https://YOUR_PROJECT.supabase.co';
  },

  _client: null,

  getClient() {
    if (!this._client && this.isEnabled()) {
      // Supabase JS 라이브러리를 CDN에서 동적 로드
      const script = document.createElement('script');
      script.src = 'https://esm.sh/@supabase/supabase-js@2';
      script.type = 'module';
      document.head.appendChild(script);
    }
    return this._client;
  },

  async init() {
    if (!this.isEnabled()) {
      console.log('[Supabase] 미설정 — localStorage 모드');
      return false;
    }

    try {
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
      this._client = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
      console.log('[Supabase] 연결 성공');
      return true;
    } catch (e) {
      console.error('[Supabase] 연결 실패:', e.message);
      return false;
    }
  },

  // ===== 인증 =====
  async login(email, password) {
    if (!this._client) throw new Error('Supabase 미연결');
    const { data, error } = await this._client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  async logout() {
    if (!this._client) return;
    await this._client.auth.signOut();
  },

  async getCurrentUser() {
    if (!this._client) return null;
    const { data: { user } } = await this._client.auth.getUser();
    return user;
  },

  // ===== SOP CRUD =====
  async getSops() {
    const { data, error } = await this._client.from('sop_documents').select('*').order('order_num');
    if (error) throw error;
    return data;
  },

  async saveSop(sop) {
    const { error } = await this._client.from('sop_documents').upsert(sop);
    if (error) throw error;
  },

  async deleteSop(id) {
    const { error } = await this._client.from('sop_documents').delete().eq('id', id);
    if (error) throw error;
  },

  // ===== 직원 =====
  async getEmployees() {
    const { data, error } = await this._client.from('employees').select('*').order('created_at');
    if (error) throw error;
    return data;
  },

  async addEmployee(emp) {
    const { error } = await this._client.from('employees').insert(emp);
    if (error) throw error;
  },

  // ===== 진행률 =====
  async saveVideoProgress(employeeId, videoId) {
    const { error } = await this._client.from('video_progress').upsert({
      employee_id: employeeId, video_id: videoId, completed: true, watched_at: new Date().toISOString()
    }, { onConflict: 'employee_id,video_id' });
    if (error) throw error;
  },

  async saveQuizResult(employeeId, questionId, answer, isCorrect) {
    const { error } = await this._client.from('quiz_results').insert({
      employee_id: employeeId, question_id: questionId, answer, is_correct: isCorrect, answered_at: new Date().toISOString()
    });
    if (error) throw error;
  },

  async saveChapterCompletion(employeeId, chapterId, score, passed) {
    const { error } = await this._client.from('chapter_completions').upsert({
      employee_id: employeeId, chapter_id: chapterId, score, passed, completed_at: new Date().toISOString()
    }, { onConflict: 'employee_id,chapter_id' });
    if (error) throw error;
  },

  async getEmployeeProgress(employeeId) {
    const [{ data: vp }, { data: cc }] = await Promise.all([
      this._client.from('video_progress').select('video_id').eq('employee_id', employeeId).eq('completed', true),
      this._client.from('chapter_completions').select('chapter_id, score, passed').eq('employee_id', employeeId),
    ]);
    return {
      completedVideos: (vp || []).map(v => v.video_id),
      chapterResults: Object.fromEntries((cc || []).map(c => [c.chapter_id, { score: c.score, passed: c.passed }])),
    };
  }
};

// 상태 표시용
console.log('[SOP System] Mode:', SupabaseMode.isEnabled() ? 'Supabase' : 'localStorage (데모)');
