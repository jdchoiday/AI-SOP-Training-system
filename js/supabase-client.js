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

  // 현재 로그인 직원의 company_id 해석
  // training_progress / chapter_results RLS(company_isolation)는
  // WITH CHECK (auth_is_super_admin() OR company_id = auth_company_id()) 라서
  // company_id 없이 upsert 하면 NULL = <uuid> → 조용히 거부되어 진행률이 저장되지 않는다.
  // auth_company_id() = 로그인 직원의 employees.company_id 이며, 이는 로그인 시
  // sop_user.company_id 로 저장되므로 그 값을 그대로 주입해 WITH CHECK 를 통과시킨다.
  // super_admin 은 본인 회사가 없다(company_id NULL, 전 브랜드 관리). 그대로 두면 학습앱
  // (app/tasks/chapter)에서 syncSops 가 필터 없이 전 브랜드 콘텐츠를 끌어와 한 브랜드를
  // 테스트할 때 타 브랜드(예: SLKO) 코스가 섞여 보인다. 회사를 '추정'하지 않고, 로그인 시
  // 명시적으로 고른 브랜드(sop_brand)만 유효 회사로 사용한다(CLAUDE.md 불변규칙).
  _superAdminSelectedCompany(user) {
    if (!user || user.role !== 'super_admin') return null;
    try {
      return localStorage.getItem('sop_active_company') || localStorage.getItem('sop_brand') || null;
    } catch (e) { return null; }
  },

  _currentCompanyId() {
    let user = null;
    try { user = JSON.parse(localStorage.getItem('sop_user') || 'null'); } catch (e) { /* ignore */ }
    if (user && user.company_id) return user.company_id;
    // 관리자 페이지에서 명시 선택한 활성 회사 (admin/index.html)
    if (typeof window !== 'undefined' && window.__activeCompanyId) return window.__activeCompanyId;
    // super_admin 학습앱: 로그인 시 고른 브랜드로 스코프 (없으면 null = 전체)
    const sel = this._superAdminSelectedCompany(user);
    if (sel) return sel;
    return null;
  },

  // 로그인 직원의 회사(브랜드)가 직전 세션과 다르면 회사-스코프 localStorage 캐시를 비운다.
  // 한 기기에서 Kiwooza→SLKO 로 바꿔 로그인했을 때 이전 브랜드의 SOP/진행률/지점/학습경로가
  // 남아 보이던 교차-브랜드 누출(RC4)을 차단한다. 로그인 직후(syncAll 이전)에 호출할 것.
  applyCompanyScope(user) {
    try {
      // 유효 회사: 일반 직원은 본인 회사, super_admin 은 로그인 시 고른 브랜드(sop_brand).
      // 이렇게 해야 super_admin 이 브랜드를 바꿔 로그인할 때도 직전 브랜드 캐시가 비워진다.
      let newCo = (user && user.company_id) || '';
      if (!newCo && user && user.role === 'super_admin') {
        newCo = localStorage.getItem('sop_brand') || '';
      }
      const prevCo = localStorage.getItem('sop_active_company') || '';
      if (newCo && prevCo && newCo !== prevCo) {
        ['sop_documents', 'sop_progress_v2', 'sop_branches', 'sop_branch_teams',
         'sop_learning_paths', 'sop_deadlines', 'sop_employees', 'sop_deleted_ids',
         'sop_pending_notifications'].forEach(k => localStorage.removeItem(k));
        console.log('[Supabase] 브랜드 변경 감지 — 회사-스코프 캐시 초기화:', prevCo, '→', newCo);
      }
      if (newCo) localStorage.setItem('sop_active_company', newCo);
    } catch (e) { /* localStorage 불가 환경 무시 */ }
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

      // employees 테이블에서 프로필 조회 (auth_user_id 기반) + 회사(브랜드) 정보 조인
      const authUserId = authData.user.id;
      const { data: emp, error: empErr } = await this._retry(() =>
        this._client.from('employees').select('*, companies(id, name, slug, brand_color)').eq('auth_user_id', authUserId).single()
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
        company_id: emp.company_id || null,
        // 브랜드 표시/스코프용 (헤더·로그인 화면에서 사용)
        company_name: emp.companies?.name || null,
        company_slug: emp.companies?.slug || null,
        brand_color: emp.companies?.brand_color || null,
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
      // 회사(브랜드) 명시적 필터 — RLS company_isolation 에 더해 클라이언트에서도 한 번 더
      // 회사 스코프를 강제한다(방어선 이중화). 직원/회사관리자는 자기 회사만, super_admin 이
      // 회사 미선택(=전체) 일 때만 companyId 가 null 이라 필터 없이 RLS 판단에 맡긴다.
      const _companyId = this._currentCompanyId();
      const { data, error } = await this._retry(() => {
        let q = this._client.from('sop_documents').select('*');
        if (_companyId) q = q.eq('company_id', _companyId);
        return q.order('order_num');
      });
      if (!error && data && data.length > 0) {
        // 기존 localStorage 데이터와 머지 (Supabase 실패 시 데이터 보존)
        const existing = JSON.parse(localStorage.getItem('sop_documents') || '[]');
        const existingMap = {};
        existing.forEach(s => { existingMap[s.id] = s; });

        const dbSops = data.map(d => {
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
            // 멀티 테넌시
            company_id: d.company_id || local.company_id || null,
            createdAt: d.created_at || new Date().toISOString(),
          };
        });
        const dbIds = new Set(data.map(d => d.id));

        // DB 에 없는 로컬 전용 SOP 처리 원칙 (사용자 업로드분 절대 누락 금지):
        //  - 데모/샘플 시드(아래 고정 ID) 또는 사용자가 삭제한 툼스톤 ID → 제거
        //    (과거 "삭제했는데 한국어 데모 SOP 가 계속 나타나는" 문제 차단)
        //  - 그 외(관리자가 직접 업로드한 실제 SOP) → 보존 + DB 로 복구 업로드
        //    (RLS/세션 문제로 조용히 저장 실패해 로컬에만 남은 SOP 를 잃지 않도록)
        const DEMO_SEED_IDS = new Set([
          'sop-open', 'sop-customer', 'sop-hygiene', 'sop-closing', 'sop-emergency', 'sop-fire-detail',
          'kids-sop-open', 'kids-sop-service', 'kids-sop-safety', 'kids-sop-equipment',
          'kids-sop-hygiene', 'kids-sop-emergency', 'kids-sop-closing',
        ]);
        let tombstones = [];
        try { tombstones = JSON.parse(localStorage.getItem('sop_deleted_ids') || '[]'); } catch (_) { tombstones = []; }
        const tombstoneSet = new Set(tombstones);

        const localOnly = existing.filter(s => !dbIds.has(s.id));
        const removedSeed = localOnly.filter(s => DEMO_SEED_IDS.has(s.id) || tombstoneSet.has(s.id));
        let userLocalOnly = localOnly.filter(s => !DEMO_SEED_IDS.has(s.id) && !tombstoneSet.has(s.id));

        // 멀티테넌시 정리: 현재 회사 소속이 아닌(또는 회사 미지정) 로컬 전용 SOP 제거.
        // 과거 단일테넌트 시절('AION 킨더' 등) 만든 한국어 SOP 가 다른 회사 직원 화면/챗봇에
        // 계속 노출되던 문제 차단. 정상 관리자 업로드분은 company_id 가 주입돼 있어 보존된다.
        // 현재 회사 ID 를 알 수 있을 때만 적용해 데이터 손실을 방지한다.
        const curCompany = this._currentCompanyId();
        if (curCompany) {
          const foreign = userLocalOnly.filter(s => s.company_id !== curCompany);
          if (foreign.length > 0) {
            console.log(`[Supabase] 타 회사/미지정 로컬 SOP ${foreign.length}개 정리:`, foreign.map(s => `${s.id}(${s.company_id || 'null'})`).join(', '));
          }
          userLocalOnly = userLocalOnly.filter(s => s.company_id === curCompany);
        }

        if (removedSeed.length > 0) {
          console.log(`[Supabase] 데모/삭제 SOP ${removedSeed.length}개 정리:`, removedSeed.map(s => s.id).join(', '));
        }

        // DB SOP + 로컬 전용 사용자 SOP 를 합쳐 보존한다 (업로드분 누락 금지).
        const merged = dbSops.concat(userLocalOnly);
        localStorage.setItem('sop_documents', JSON.stringify(merged));
        console.log(`[Supabase] SOP 동기화: DB ${dbSops.length} + 로컬전용 ${userLocalOnly.length} = ${merged.length}개`);

        // 로컬에만 있던 사용자 SOP 를 DB 로 복구 업로드(조용한 저장 실패 복구) — 비차단.
        // 관리자 컨텍스트(__activeCompanyId 존재)에서만 시도해 직원 세션의 RLS 거부/알림을 피한다.
        if (userLocalOnly.length > 0 && typeof window !== 'undefined' && window.__activeCompanyId) {
          console.log(`[Supabase] 로컬 전용 사용자 SOP ${userLocalOnly.length}개 → DB 복구 업로드 시도`);
          Promise.resolve(this.saveAllSops(userLocalOnly))
            .catch(e => console.warn('[Supabase] 로컬 SOP 복구 업로드 실패:', e && e.message));
        }
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
      // Supabase status check constraint 와 정확히 일치해야 함.
      // 라이브 DB 제약은 ('draft','published') 만 허용 — 'archived' 를 보내면
      // upsert 가 통째로 실패(check_violation)하고 SOP 가 조용히 저장 안 됨.
      // 따라서 'archived'(및 기타값)는 'draft' 로 클램프 — draft 도 비공개라 의도(비노출) 보존.
      const validStatuses = ['draft', 'published'];
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
          // 2-Pass HTML 참고사진 (base64) → Storage 업로드 (씬당 100~150KB 이라 1MB 초과 주요 원인)
          if (copy._referenceImageUrl && copy._referenceImageUrl.startsWith('data:')) {
            const refUrl = await this.uploadSceneImage(sop.id, `${i}-ref`, copy._referenceImageUrl);
            if (refUrl) {
              copy._referenceImageUrl = refUrl;
              if (sop.script[i]) sop.script[i]._referenceImageUrl = refUrl;
            } else {
              copy._referenceImageUrl = ''; // 업로드 실패 시 제거
            }
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
        // 멀티 테넌시: SOP가 명시적 company_id 가졌으면 그것, 아니면 admin 활성 회사
        company_id: sop.company_id || (typeof window !== 'undefined' && window.__activeCompanyId) || null,
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

    // Auth 세션 사전 점검 — 세션 없으면 RLS 전량 실패하므로 조기 중단
    try {
      const { data: { session } } = await this._client.auth.getSession();
      if (!session) {
        console.error('[Supabase] ❌ Auth 세션 없음 — SOP 저장 중단. 관리자 계정으로 다시 로그인하세요.');
        if (typeof window !== 'undefined' && !window.__sopAuthWarned) {
          window.__sopAuthWarned = true;
          alert('⚠️ 로그인 세션이 만료되었습니다.\nSOP가 DB에 저장되지 않습니다.\n다시 로그인해주세요.');
        }
        return;
      }
    } catch (e) {
      console.warn('[Supabase] Auth 세션 확인 실패:', e.message);
    }

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
    // 툼스톤 기록: syncSops 의 로컬 전용 복구 업로드가 삭제된 SOP 를 되살리지 않도록.
    // (오프라인이어도 남도록 _ready 검사보다 먼저 기록한다.)
    try {
      const t = JSON.parse(localStorage.getItem('sop_deleted_ids') || '[]');
      if (!t.includes(id)) { t.push(id); localStorage.setItem('sop_deleted_ids', JSON.stringify(t)); }
    } catch (_) { /* localStorage 불가 환경 무시 */ }
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
          company_id: d.company_id || null,
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
      // 관리자 세션 토큰 전달 — 서버가 비-staff role 부여 권한을 검증한다
      const { data: _sess } = await this._client.auth.getSession();
      const _tok = _sess?.session?.access_token;
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(_tok ? { Authorization: 'Bearer ' + _tok } : {}) },
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
        // RLS WITH CHECK(company_id = auth_company_id()) 통과 — 없으면 저장이 조용히 거부됨
        company_id: this._currentCompanyId(),
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
        // RLS WITH CHECK(company_id = auth_company_id()) 통과 — 없으면 저장이 조용히 거부됨
        company_id: this._currentCompanyId(),
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
      // 멀티테넌시: 현재 활성 회사 (saveSop 와 동일 소스). 회사 admin 은 이 값이 필수 —
      // company_id 없이 insert 하면 branch_teams_modify_company RLS(WITH CHECK:
      // company_id = auth_company_id())가 거부해 저장이 조용히 실패한다.
      const companyId = (typeof window !== 'undefined' && window.__activeCompanyId) || null;

      // 재삽입 전 기존 데이터 삭제 — 현재 회사 범위만 비운다(타 회사 데이터 보존).
      // companyId 없으면(super_admin 전체선택) 종전처럼 전체 삭제.
      await this._retry(() => {
        const q = this._client.from('branch_teams').delete();
        return companyId
          ? q.eq('company_id', companyId)
          : q.neq('id', '00000000-0000-0000-0000-000000000000');
      });

      // 새 데이터 삽입 (각 행에 company_id 주입 — RLS 통과 + 회사별 격리)
      const rows = [];
      branches.forEach(branch => {
        const teams = (branchTeams && branchTeams[branch]) || [];
        if (teams.length === 0) {
          // 팀 없는 지점도 행으로 표현 (team = null)
          rows.push({ branch, team: null, company_id: companyId });
        } else {
          teams.forEach(team => {
            rows.push({ branch, team, company_id: companyId });
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
