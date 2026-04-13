// ============================================
// Supabase 연동 레이어 (하이브리드 모드)
// ============================================
// localStorage = 빠른 UI 렌더링 (동기)
// Supabase = 영구 저장 + 멀티 디바이스 (비동기)
// 전략: 로드 시 Supabase → localStorage, 저장 시 localStorage + Supabase

const SupabaseMode = {
  _client: null,
  _ready: false,

  isEnabled() {
    return CONFIG.SUPABASE_URL &&
           CONFIG.SUPABASE_URL !== 'https://YOUR_PROJECT.supabase.co' &&
           CONFIG.SUPABASE_ANON_KEY !== 'YOUR_ANON_KEY';
  },

  async init() {
    if (!this.isEnabled()) {
      console.log('[Supabase] 미설정 — localStorage 모드');
      return false;
    }

    try {
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
      this._client = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
      this._ready = true;
      console.log('[Supabase] ✅ 연결 성공');
      return true;
    } catch (e) {
      console.error('[Supabase] ❌ 연결 실패:', e.message);
      this._ready = false;
      return false;
    }
  },

  // 재시도 헬퍼 (502/503 등 일시적 오류 대응)
  async _retry(fn, maxRetries = 2) {
    for (let i = 0; i <= maxRetries; i++) {
      try {
        const result = await fn();
        if (result.error && result.error.message && /502|503|504|fetch/.test(result.error.message)) {
          if (i < maxRetries) {
            console.warn(`[Supabase] 일시적 오류, ${i+1}/${maxRetries} 재시도...`);
            await new Promise(r => setTimeout(r, 1000 * (i + 1)));
            continue;
          }
        }
        return result;
      } catch (e) {
        if (i < maxRetries) {
          console.warn(`[Supabase] 네트워크 오류, ${i+1}/${maxRetries} 재시도...`);
          await new Promise(r => setTimeout(r, 1000 * (i + 1)));
          continue;
        }
        throw e;
      }
    }
  },

  get client() {
    return this._client;
  },

  // ===== 로그인 (employees 테이블 조회 + 해시 검증) =====
  async login(email, password) {
    if (!this._ready) return null;
    try {
      // 이메일로 직원 조회 (비밀번호는 서버에서 검증)
      const { data, error } = await this._retry(() =>
        this._client.from('employees').select('*').eq('email', email).single()
      );
      if (error || !data) return null;

      // 비밀번호 검증
      const storedHash = data.password_hash;
      let passwordMatch = false;

      if (storedHash && storedHash.includes(':')) {
        // 해시된 비밀번호 — 서버에서 검증
        try {
          const res = await fetch('/api/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'verify', password, storedHash })
          });
          const result = await res.json();
          passwordMatch = result.match === true;
        } catch (e) {
          console.warn('[Auth] 서버 검증 실패, 폴백:', e.message);
          passwordMatch = (password === storedHash);
        }
      } else {
        // 평문 비밀번호 (마이그레이션 전) — 직접 비교 후 해시로 업데이트
        passwordMatch = (password === storedHash);
        if (passwordMatch) {
          // 자동 마이그레이션: 평문 → 해시
          this._migratePassword(data.id, password).catch(() => {});
        }
      }

      if (!passwordMatch) return null;

      return {
        id: data.id,
        name: data.name,
        email: data.email,
        role: data.role,
        branch: data.branch
      };
    } catch (e) {
      console.error('[Supabase] 로그인 오류:', e);
      return null;
    }
  },

  // 평문 비밀번호를 해시로 자동 업데이트
  async _migratePassword(employeeId, plainPassword) {
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'migrate', password: plainPassword })
      });
      const { hash } = await res.json();
      if (hash) {
        await this._client.from('employees').update({ password_hash: hash }).eq('id', employeeId);
        console.log('[Auth] ✅ 비밀번호 해시 마이그레이션 완료');
      }
    } catch (e) {
      console.warn('[Auth] 마이그레이션 실패:', e.message);
    }
  },

  // ===== SOP 동기화 =====
  async syncSops() {
    if (!this._ready) return;
    try {
      const { data, error } = await this._retry(() =>
        this._client.from('sop_documents').select('*').order('order_num')
      );
      if (!error && data && data.length > 0) {
        // 기존 localStorage 데이터와 머지 (Supabase 실패 시 데이터 보존)
        const existing = JSON.parse(localStorage.getItem('sop_documents') || '[]');
        const existingMap = {};
        existing.forEach(s => { existingMap[s.id] = s; });

        const sops = data.map(d => {
          const local = existingMap[d.id] || {};
          return {
            id: d.id,
            title: d.title,
            title_en: d.title_en || d.title,
            title_vn: d.title_vn || d.title,
            category: d.category || '',
            content: d.content || '',
            content_vn: d.content_vn || '',
            status: d.status || 'draft',
            order_num: d.order_num || 0,
            // 스크립트/퀴즈: Supabase 데이터 우선, 없으면 localStorage 보존
            script: d.script || local.script || null,
            quizzes: d.quizzes || local.quizzes || null,
            createdAt: d.created_at || new Date().toISOString(),
          };
        });

        // localStorage에만 있는 SOP도 보존 (아직 Supabase에 안 올라간 것)
        existing.forEach(s => {
          if (!data.find(d => d.id === s.id)) {
            sops.push(s);
          }
        });

        localStorage.setItem('sop_documents', JSON.stringify(sops));
        console.log(`[Supabase] SOP ${sops.length}개 동기화 완료`);
      }
    } catch (e) {
      console.error('[Supabase] SOP 동기화 오류:', e);
    }
  },

  async saveSop(sop) {
    if (!this._ready) return;
    try {
      // Supabase status check constraint에 맞는 값만 허용
      const validStatuses = ['draft', 'published', 'archived'];
      let status = sop.status || 'draft';
      if (!validStatuses.includes(status)) status = 'draft';

      // script에서 base64 이미지 데이터 제거 (Supabase 용량 절약)
      let scriptClean = sop.script;
      if (scriptClean && Array.isArray(scriptClean)) {
        scriptClean = scriptClean.map(sc => {
          const copy = { ...sc };
          if (copy.imageUrl && copy.imageUrl.startsWith('data:')) {
            copy.imageUrl = ''; // base64는 Supabase에 저장하지 않음
          }
          return copy;
        });
      }

      const row = {
        id: sop.id,
        title: sop.title,
        title_en: sop.title_en || null,
        title_vn: sop.title_vn || null,
        category: sop.category || '',
        content: sop.content || '',
        content_vn: sop.content_vn || '',
        status: status,
        order_num: sop.order_num || 0,
        script: scriptClean || null,
        quizzes: sop.quizzes || null,
        updated_at: new Date().toISOString(),
      };
      const { error } = await this._retry(() =>
        this._client.from('sop_documents').upsert(row, { onConflict: 'id' })
      );
      if (error) console.warn('[Supabase] SOP 저장 실패:', sop.id, error.message);
    } catch (e) {
      console.error('[Supabase] SOP 저장 오류:', e);
    }
  },

  async saveAllSops(sops) {
    if (!this._ready) return;
    for (const sop of sops) {
      await this.saveSop(sop);
    }
    console.log(`[Supabase] SOP ${sops.length}개 업로드 완료`);
  },

  async deleteSop(id) {
    if (!this._ready) return;
    try {
      await this._client.from('sop_documents').delete().eq('id', id);
    } catch (e) {
      console.error('[Supabase] SOP 삭제 오류:', e);
    }
  },

  // ===== 직원 동기화 =====
  async syncEmployees() {
    if (!this._ready) return;
    try {
      const { data, error } = await this._retry(() =>
        this._client.from('employees').select('*').order('created_at')
      );
      if (!error && data && data.length > 0) {
        const emps = data.map(d => ({
          id: d.id,
          name: d.name,
          email: d.email,
          branch: d.branch || '',
          team: d.team || '',
          role: d.role || 'staff',
          created: d.created_at || new Date().toISOString(),
        }));
        localStorage.setItem('sop_employees', JSON.stringify(emps));
        console.log(`[Supabase] 직원 ${emps.length}명 동기화 완료`);
      }
    } catch (e) {
      console.error('[Supabase] 직원 동기화 오류:', e);
    }
  },

  async addEmployee(emp) {
    if (!this._ready) return;
    try {
      await this._client.from('employees').insert({
        name: emp.name,
        email: emp.email,
        password_hash: emp.password || '1234',
        branch: emp.branch || '',
        team: emp.team || '',
        role: emp.role || 'staff',
      });
    } catch (e) {
      console.error('[Supabase] 직원 추가 오류:', e);
    }
  },

  // ===== 진행률 동기화 =====
  async saveVideoProgress(employeeId, videoId, chapterId) {
    if (!this._ready) return;
    try {
      await this._client.from('training_progress').upsert({
        employee_id: employeeId,
        video_id: videoId,
        chapter_id: chapterId,
        completed: true,
        completed_at: new Date().toISOString(),
      }, { onConflict: 'employee_id,video_id' });
    } catch (e) {
      console.error('[Supabase] 영상 진행 저장 오류:', e);
    }
  },

  async saveChapterResult(employeeId, chapterId, score, passed) {
    if (!this._ready) return;
    try {
      await this._client.from('chapter_results').upsert({
        employee_id: employeeId,
        chapter_id: chapterId,
        score: score,
        passed: passed,
        completed_at: new Date().toISOString(),
      }, { onConflict: 'employee_id,chapter_id' });
    } catch (e) {
      console.error('[Supabase] 챕터 결과 저장 오류:', e);
    }
  },

  async syncProgress(employeeId) {
    if (!this._ready) return;
    try {
      const [{ data: vp }, { data: cr }] = await Promise.all([
        this._client.from('training_progress').select('video_id').eq('employee_id', employeeId).eq('completed', true),
        this._client.from('chapter_results').select('chapter_id, score, passed, completed_at').eq('employee_id', employeeId),
      ]);

      if (vp || cr) {
        const all = JSON.parse(localStorage.getItem('sop_progress_v2') || '{}');
        if (!all[employeeId]) all[employeeId] = { completedVideos: [], chapterResults: {}, quizScores: {} };

        if (vp) all[employeeId].completedVideos = vp.map(v => v.video_id);
        if (cr) {
          cr.forEach(c => {
            all[employeeId].chapterResults[c.chapter_id] = {
              score: c.score,
              passed: c.passed,
              date: c.completed_at,
            };
          });
        }
        localStorage.setItem('sop_progress_v2', JSON.stringify(all));
        console.log(`[Supabase] 진행률 동기화 완료 (${employeeId})`);
      }
    } catch (e) {
      console.error('[Supabase] 진행률 동기화 오류:', e);
    }
  },

  // ===== 지점/팀 동기화 =====
  async syncBranchTeams() {
    if (!this._ready) return;
    try {
      const { data, error } = await this._retry(() =>
        this._client.from('branch_teams').select('*').order('created_at')
      );
      if (error) {
        console.warn('[Supabase] branch_teams 동기화 실패:', error.message);
        return;
      }
      if (data && data.length > 0) {
        // Supabase 데이터 → branches 배열 + branchTeams 객체 구성
        const branchSet = new Set();
        const branchTeams = {};
        data.forEach(row => {
          branchSet.add(row.branch);
          if (!branchTeams[row.branch]) branchTeams[row.branch] = [];
          if (row.team) {
            branchTeams[row.branch].push(row.team);
          }
        });
        const branches = Array.from(branchSet);
        localStorage.setItem('sop_branches', JSON.stringify(branches));
        localStorage.setItem('sop_branch_teams', JSON.stringify(branchTeams));
        console.log(`[Supabase] 지점 ${branches.length}개, 팀 데이터 동기화 완료`);
      }
    } catch (e) {
      console.error('[Supabase] 지점/팀 동기화 오류:', e);
    }
  },

  async saveBranchTeamsToSupabase(branches, branchTeams) {
    if (!this._ready) return;
    try {
      // 기존 데이터 모두 삭제 후 재삽입 (단순하고 확실한 방법)
      await this._retry(() =>
        this._client.from('branch_teams').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      );

      // 새 데이터 삽입
      const rows = [];
      branches.forEach(branch => {
        const teams = (branchTeams && branchTeams[branch]) || [];
        if (teams.length === 0) {
          // 팀 없는 지점도 행으로 표현 (team = null)
          rows.push({ branch, team: null });
        } else {
          teams.forEach(team => {
            rows.push({ branch, team });
          });
        }
      });

      if (rows.length > 0) {
        const { error } = await this._retry(() =>
          this._client.from('branch_teams').insert(rows)
        );
        if (error) {
          console.warn('[Supabase] branch_teams 저장 실패:', error.message);
        } else {
          console.log(`[Supabase] 지점/팀 ${rows.length}행 저장 완료`);
        }
      }
    } catch (e) {
      console.error('[Supabase] 지점/팀 저장 오류:', e);
    }
  },

  // ===== 전체 초기 동기화 =====
  async syncAll() {
    if (!this._ready) return;
    console.log('[Supabase] 전체 동기화 시작...');
    await Promise.all([
      this.syncSops(),
      this.syncEmployees(),
      this.syncBranchTeams(),
    ]);
    // 로그인된 사용자의 진행률도 동기화
    const user = JSON.parse(localStorage.getItem('sop_user') || 'null');
    if (user?.id) {
      await this.syncProgress(user.id);
    }
    console.log('[Supabase] ✅ 전체 동기화 완료');
  },

  // ===== localStorage → Supabase 초기 업로드 =====
  async uploadLocalData() {
    if (!this._ready) return;

    // SOP 업로드
    const sops = JSON.parse(localStorage.getItem('sop_documents') || '[]');
    if (sops.length > 0) {
      const { data: existing } = await this._client.from('sop_documents').select('id');
      if (!existing || existing.length === 0) {
        await this.saveAllSops(sops);
        console.log('[Supabase] localStorage SOP → Supabase 업로드 완료');
      }
    }
  }
};

// 상태 표시
console.log('[SOP System] Mode:', SupabaseMode.isEnabled() ? '🔗 Supabase' : '💾 localStorage (데모)');
