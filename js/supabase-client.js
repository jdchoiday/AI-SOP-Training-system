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
        if (result.error && result.error.message && /500|502|503|504|fetch|timeout/i.test(result.error.message)) {
          if (i < maxRetries) {
            console.warn(`[Supabase] 일시적 오류, ${i+1}/${maxRetries} 재시도...`);
            await new Promise(r => setTimeout(r, 1500 * (i + 1)));
            continue;
          }
        }
        return result;
      } catch (e) {
        if (i < maxRetries) {
          console.warn(`[Supabase] 네트워크 오류, ${i+1}/${maxRetries} 재시도...`);
          await new Promise(r => setTimeout(r, 1500 * (i + 1)));
          continue;
        }
        throw e;
      }
    }
  },

  get client() {
    return this._client;
  },

  // ===== 로그인 (Supabase Auth 우선, 실패 시 legacy hash 자동 전환) =====
  async login(email, password) {
    if (!this._ready) return null;
    try {
      // 1차 시도: Supabase Auth로 직접 로그인
      let { data: authData, error: authError } = await this._client.auth.signInWithPassword({
        email, password
      });

      // 실패 → legacy hash 검증 + Supabase Auth 비번 재설정 후 재시도
      if (authError || !authData?.user) {
        console.log('[Auth] Supabase Auth 실패 — legacy 마이그레이션 시도');
        try {
          const migrateRes = await fetch('/api/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'migrate-to-supabase', email, password })
          });
          const migrateResult = await migrateRes.json();
          if (!migrateResult.migrated) {
            console.warn('[Auth] 마이그레이션 실패:', migrateResult.error);
            return null;
          }
          console.log('[Auth] ✅ legacy → Supabase Auth 마이그레이션 완료');

          // 2차 시도: 마이그레이션 후 signIn
          const retry = await this._client.auth.signInWithPassword({ email, password });
          if (retry.error || !retry.data?.user) {
            console.error('[Auth] 마이그레이션 후 재시도 실패:', retry.error?.message);
            return null;
          }
          authData = retry.data;
        } catch (e) {
          console.error('[Auth] 마이그레이션 예외:', e.message);
          return null;
        }
      }

      // employees 테이블에서 프로필 조회 (auth_user_id 기반)
      const authUserId = authData.user.id;
      const { data: emp, error: empErr } = await this._retry(() =>
        this._client.from('employees').select('*').eq('auth_user_id', authUserId).single()
      );
      if (empErr || !emp) {
        console.warn('[Auth] employees 프로필 없음:', authUserId);
        // 프로필 없으면 로그아웃
        await this._client.auth.signOut();
        return null;
      }

      return {
        id: emp.id,
        name: emp.name,
        email: emp.email,
        role: emp.role,
        branch: emp.branch,
        authUserId,
      };
    } catch (e) {
      console.error('[Supabase] 로그인 오류:', e);
      return null;
    }
  },

  async logout() {
    if (!this._ready) return;
    try {
      await this._client.auth.signOut();
    } catch (e) {
      console.warn('[Auth] 로그아웃 오류:', e.message);
    }
  },

  async currentAuthUser() {
    if (!this._ready) return null;
    const { data } = await this._client.auth.getUser();
    return data?.user || null;
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
            // 챕터/섹션 계층 구조 (v8)
            doc_type: d.doc_type || local.doc_type || (d.id.startsWith('chapter-') ? 'chapter' : 'section'),
            parent_id: d.parent_id || local.parent_id || null,
            exam_quizzes: d.exam_quizzes || local.exam_quizzes || null,
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

  // base64 이미지 및 __stored__ 포인터 정리 헬퍼
  _stripLargeData(text) {
    if (!text || typeof text !== 'string') return text || '';
    // base64 이미지 인라인 제거 (data:image/...)
    return text.replace(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/g, '');
  },

  // 프로필 사진 업로드 (sop-images 버킷, profiles/ 경로)
  async uploadProfilePhoto(empId, base64DataUrl) {
    if (!this._ready || !base64DataUrl) return null;
    try {
      const match = base64DataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
      if (!match) return null;
      const mimeType = match[1];
      const ext = mimeType.split('/')[1] || 'jpg';
      const byteString = atob(match[2]);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
      const blob = new Blob([ab], { type: mimeType });

      const filePath = `profiles/${empId}.${ext}`;
      const { error } = await this._client.storage
        .from('sop-images').upload(filePath, blob, { contentType: mimeType, upsert: true });
      if (error) { console.warn('[Storage] 프로필 업로드 실패:', error.message); return null; }

      const { data } = this._client.storage.from('sop-images').getPublicUrl(filePath);
      console.log(`[Storage] ✅ 프로필 사진 업로드 완료 (${empId})`);
      return data?.publicUrl || null;
    } catch (e) {
      console.warn('[Storage] 프로필 사진 오류:', e.message);
      return null;
    }
  },

  // base64 이미지를 Supabase Storage에 업로드하고 공개 URL 반환
  async uploadSceneImage(sopId, sceneIndex, base64DataUrl) {
    if (!this._ready) return null;
    try {
      // base64 → Blob 변환
      const match = base64DataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
      if (!match) return null;
      const mimeType = match[1];
      const ext = mimeType.split('/')[1] || 'png';
      const byteString = atob(match[2]);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
      const blob = new Blob([ab], { type: mimeType });

      const filePath = `scenes/${sopId}/scene-${sceneIndex}.${ext}`;

      // 기존 파일 덮어쓰기 (upsert)
      const { error } = await this._client.storage
        .from('sop-images')
        .upload(filePath, blob, { contentType: mimeType, upsert: true });

      if (error) {
        console.warn(`[Storage] 업로드 실패 (${filePath}):`, error.message);
        return null;
      }

      // 공개 URL 반환
      const { data } = this._client.storage.from('sop-images').getPublicUrl(filePath);
      console.log(`[Storage] ✅ ${filePath} 업로드 완료`);
      return data?.publicUrl || null;
    } catch (e) {
      console.warn('[Storage] 이미지 업로드 오류:', e.message);
      return null;
    }
  },

  async saveSop(sop) {
    if (!this._ready) return;
    try {
      // Supabase status check constraint에 맞는 값만 허용
      const validStatuses = ['draft', 'published', 'archived'];
      let status = sop.status || 'draft';
      if (!validStatuses.includes(status)) status = 'draft';

      // script에서 base64 이미지를 Storage에 업로드 후 URL로 교체
      let scriptClean = sop.script;
      if (scriptClean && Array.isArray(scriptClean)) {
        scriptClean = await Promise.all(scriptClean.map(async (sc, i) => {
          const copy = { ...sc };
          // base64 이미지 → Storage 업로드 → 공개 URL로 교체
          if (copy.imageUrl && copy.imageUrl.startsWith('data:')) {
            const publicUrl = await this.uploadSceneImage(sop.id, i, copy.imageUrl);
            if (publicUrl) {
              copy.imageUrl = publicUrl;
              // localStorage의 원본도 URL로 업데이트 (다음 저장 시 재업로드 방지)
              if (sop.script[i]) sop.script[i].imageUrl = publicUrl;
            } else {
              copy.imageUrl = ''; // 업로드 실패 시 제거
            }
          } else if (copy.imageUrl && copy.imageUrl.startsWith('__stored__')) {
            copy.imageUrl = ''; // IndexedDB 포인터는 제거
          }
          // narration, visual 등에 혹시 base64가 섞여있으면 제거
          if (copy.narration) copy.narration = this._stripLargeData(copy.narration);
          return copy;
        }));
      }

      // content 필드에서도 base64 이미지 제거
      const contentClean = this._stripLargeData(sop.content);
      const contentVnClean = this._stripLargeData(sop.content_vn);

      const row = {
        id: sop.id,
        title: sop.title,
        title_en: sop.title_en || null,
        title_vn: sop.title_vn || null,
        category: sop.category || '',
        content: contentClean,
        content_vn: contentVnClean,
        status: status,
        order_num: sop.order_num || 0,
        script: scriptClean || null,
        quizzes: sop.quizzes || null,
        // 챕터/섹션 계층 구조 (v8)
        doc_type: sop.doc_type || 'section',
        parent_id: sop.parent_id || null,
        exam_quizzes: sop.exam_quizzes || null,
        updated_at: new Date().toISOString(),
      };

      // 행 크기 체크 (1MB 이상이면 스킵 — Supabase 타임아웃 방지)
      const rowSize = JSON.stringify(row).length;
      if (rowSize > 1024 * 1024) {
        console.warn(`[Supabase] SOP ${sop.id} 크기 초과 (${(rowSize/1024).toFixed(0)}KB) — 업로드 스킵`);
        return;
      }

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
    let ok = 0, fail = 0;
    for (const sop of sops) {
      try {
        await this.saveSop(sop);
        ok++;
      } catch (e) {
        fail++;
        console.warn(`[Supabase] SOP ${sop.id} 업로드 실패:`, e.message);
      }
    }
    console.log(`[Supabase] SOP ${ok}/${sops.length}개 업로드 완료` + (fail ? ` (❌${fail} 실패)` : ''));
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

  // Supabase Auth + employees 원자적 생성 (서버 API로 위임)
  async addEmployee(emp) {
    if (!this._ready) return null;
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register',
          email: emp.email,
          password: emp.password || '1234',
          name: emp.name,
          branch: emp.branch || '',
          team: emp.team || '',
          role: emp.role || 'staff',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.registered) {
        console.error('[Supabase] 직원 추가 실패:', data.error);
        return null;
      }
      return { id: data.employeeId, authUserId: data.authUserId };
    } catch (e) {
      console.error('[Supabase] 직원 추가 오류:', e);
      return null;
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

      // 빈 배열은 "데이터 없음"이므로 localStorage 덮어쓰지 않음 (기록 손실 방지)
      const hasVp = vp && vp.length > 0;
      const hasCr = cr && cr.length > 0;

      let all;
      try { all = JSON.parse(localStorage.getItem('sop_progress_v2') || '{}'); } catch(e) { all = {}; }
      if (!all[employeeId]) all[employeeId] = { completedVideos: [], chapterResults: {}, quizScores: {} };

      // 머지 전략: Supabase에 데이터가 있으면 합침, 로컬 진행률은 보존
      if (hasVp) {
        const remoteVids = vp.map(v => v.video_id);
        const localVids = all[employeeId].completedVideos || [];
        // 유니온 (중복 제거)
        all[employeeId].completedVideos = Array.from(new Set([...localVids, ...remoteVids]));
      }
      if (hasCr) {
        cr.forEach(c => {
          const local = all[employeeId].chapterResults[c.chapter_id];
          // 로컬에 없거나, 원격이 더 높은 점수면 업데이트
          if (!local || (c.score || 0) >= (local.score || 0)) {
            all[employeeId].chapterResults[c.chapter_id] = {
              score: c.score, passed: c.passed, date: c.completed_at,
            };
          }
        });
      }

      // 로컬 진행률 Supabase로 푸시 (로컬에만 있는 기록 업로드)
      const localResults = all[employeeId].chapterResults || {};
      const remoteChapterIds = new Set((cr || []).map(c => c.chapter_id));
      const toPush = Object.entries(localResults).filter(([chapterId]) => !remoteChapterIds.has(chapterId));
      if (toPush.length > 0) {
        console.log(`[Supabase] 로컬 진행률 ${toPush.length}개 원격으로 업로드...`);
        for (const [chapterId, result] of toPush) {
          this.saveChapterResult(employeeId, chapterId, result.score, result.passed).catch(() => {});
        }
      }

      localStorage.setItem('sop_progress_v2', JSON.stringify(all));
      console.log(`[Supabase] 진행률 동기화 완료 (${employeeId}) — 원격 video:${hasVp ? vp.length : 0}, chapter:${hasCr ? cr.length : 0}`);
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
    const SYNC_TIMEOUT_MS = 15000; // 15초 글로벌 타임아웃

    // 각 sync를 타임아웃으로 감싸기 (개별 hang 방지)
    const withTimeout = (promise, name) => Promise.race([
      promise,
      new Promise((_, rej) => setTimeout(() => rej(new Error(`${name} timeout`)), SYNC_TIMEOUT_MS))
    ]).catch(e => { console.warn(`[Supabase] ${name} 실패:`, e.message); return null; });

    await Promise.all([
      withTimeout(this.syncSops(), 'syncSops'),
      withTimeout(this.syncEmployees(), 'syncEmployees'),
      withTimeout(this.syncBranchTeams(), 'syncBranchTeams'),
    ]);
    // 로그인된 사용자의 진행률도 동기화
    const user = JSON.parse(localStorage.getItem('sop_user') || 'null');
    if (user?.id) {
      await withTimeout(this.syncProgress(user.id), 'syncProgress');
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
