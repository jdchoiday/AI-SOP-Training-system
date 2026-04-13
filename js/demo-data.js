// ============================================
// SOP Training System — 통합 데이터 관리
// ============================================
// 관리자가 SOP를 배포하면 → 직원 앱에 챕터로 자동 반영
// localStorage 기반 (Supabase 연결 전까지)

// ===== SOP 저장소 =====
const SopStore = {
  _key: 'sop_documents',

  getAll() {
    const sops = JSON.parse(localStorage.getItem(this._key) || '[]');
    // __stored__ 포인터 → IndexedDB 캐시에서 이미지 복원
    sops.forEach(sop => {
      if (sop.script) sop.script.forEach((sc, idx) => {
        if (sc.imageUrl && sc.imageUrl.startsWith('__stored__:')) {
          // ImageDB 캐시에서 동기적으로 복원 (preload 완료 후)
          if (typeof _imageCache !== 'undefined') {
            const key = `sop_img_${sop.id}_${idx}`;
            sc.imageUrl = _imageCache[key] || null;
          } else {
            sc.imageUrl = null; // 캐시 없으면 나중에 비동기 로드
          }
        }
      });
    });
    return sops;
  },

  // 비동기: 특정 SOP의 이미지를 IndexedDB에서 프리로드
  async preloadImages(sopId) {
    if (typeof ImageDB === 'undefined') return;
    const sops = JSON.parse(localStorage.getItem(this._key) || '[]');
    const sop = sops.find(s => s.id === sopId);
    if (!sop?.script) return;
    if (typeof _imageCache === 'undefined') window._imageCache = {};
    for (let i = 0; i < sop.script.length; i++) {
      const key = `sop_img_${sopId}_${i}`;
      const img = await ImageDB.get(key);
      if (img) _imageCache[key] = img;
    }
  },

  save(sops) {
    localStorage.setItem(this._key, JSON.stringify(sops));
    // Supabase 동기화
    if (typeof SupabaseMode !== 'undefined' && SupabaseMode._ready) {
      SupabaseMode.saveAllSops(sops).catch(e => console.error('SOP sync error:', e));
    }
  },

  getById(id) {
    return this.getAll().find(s => s.id === id);
  },

  // 배포된 SOP만 가져오기 (직원 앱에서 사용)
  getPublished() {
    return this.getAll().filter(s => s.status === 'published').sort((a, b) => {
      const orderA = a.order_num || 999;
      const orderB = b.order_num || 999;
      return orderA - orderB;
    });
  },

  // SOP → 챕터 형식으로 변환 (2단 계층 지원)
  getChapters() {
    const published = this.getPublished();
    const chapters = []; // 대챕터 목록
    const orphanSections = []; // parent 없는 섹션 (하위호환)

    // 1) 대챕터 수집
    published.filter(s => s.doc_type === 'chapter').forEach(ch => {
      chapters.push({
        id: ch.id,
        title: ch.title,
        title_en: ch.title_en || ch.title,
        title_vn: ch.title_vn || ch.title,
        description: ch.category || '',
        order_num: ch.order_num || 999,
        is_active: true,
        doc_type: 'chapter',
        sections: [], // 하위 섹션
        examQuizCount: ch.exam_quizzes ? ch.exam_quizzes.length : 0,
      });
    });

    // 2) 섹션 분배
    published.filter(s => s.doc_type !== 'chapter').forEach((sop, i) => {
      const section = {
        id: sop.id,
        title: sop.title,
        title_en: sop.title_en || sop.title,
        title_vn: sop.title_vn || sop.title,
        description: sop.category || '',
        order_num: sop.order_num || (i + 1),
        is_active: true,
        doc_type: 'section',
        parent_id: sop.parent_id || null,
        videoCount: sop.script ? sop.script.length : 0,
        estimatedMinutes: sop.script ? Math.round(sop.script.length * 0.7) : 0,
        quizCount: sop.quizzes ? sop.quizzes.length : 0,
      };

      if (sop.parent_id) {
        const parent = chapters.find(c => c.id === sop.parent_id);
        if (parent) {
          parent.sections.push(section);
          return;
        }
      }
      orphanSections.push(section);
    });

    // 3) 대챕터 섹션 정렬
    chapters.forEach(ch => ch.sections.sort((a, b) => a.order_num - b.order_num));
    chapters.sort((a, b) => a.order_num - b.order_num);

    // 4) parent 없는 섹션은 독립 챕터처럼 표시 (하위호환)
    orphanSections.sort((a, b) => a.order_num - b.order_num);

    return { chapters, orphanSections };
  },

  // 특정 대챕터의 섹션 목록
  getSections(chapterId) {
    return this.getPublished()
      .filter(s => s.parent_id === chapterId && s.doc_type !== 'chapter')
      .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));
  },

  // 대챕터의 종합시험 퀴즈
  getExamQuizzes(chapterId) {
    const ch = this.getById(chapterId);
    if (!ch || !ch.exam_quizzes) return [];
    return ch.exam_quizzes.map((q, i) => ({
      id: `${chapterId}-exam-q${i + 1}`,
      question: q.question,
      question_en: q.question_en || q.question,
      question_vn: q.question_vn || q.question,
      options: q.options || [],
      options_en: q.options_en || q.options || [],
      options_vn: q.options_vn || q.options || [],
      correct: q.correct,
      explanation: q.explanation || '',
      difficulty: q.difficulty || 'medium',
      type: q.type || 'mc',
    }));
  },

  // SOP의 스크립트 → 비디오 목록으로 변환
  getVideos(sopId) {
    const sop = this.getById(sopId);
    if (!sop || !sop.script) return [];

    return sop.script.map((scene, i) => {
      const lang = localStorage.getItem('sop_lang') || CONFIG.DEFAULT_LANG;
      const sceneLabel = lang === 'en' ? 'Scene' : lang === 'vi' ? 'Cảnh' : '씬';
      return {
      id: `${sopId}-v${i + 1}`,
      title: `${sceneLabel} ${scene.scene}: ${scene.narration.slice(0, 30)}...`,
      title_full: scene.narration,
      visual: scene.visual,
      video_url: '', // AI 영상 생성 후 URL 연결
      duration: 45 + Math.floor(scene.narration.length / 3), // 나레이션 길이 기반 예상
      order_num: i + 1,
    };});
  },

  // SOP의 섹션 퀴즈 가져오기
  getQuizzes(sopId) {
    const sop = this.getById(sopId);
    if (!sop || !sop.quizzes) return [];
    return sop.quizzes.map((q, i) => ({
      id: `${sopId}-q${i + 1}`,
      question: q.question,
      question_en: q.question_en || q.question,
      question_vn: q.question_vn || q.question,
      options: q.options,
      options_en: q.options_en || q.options,
      options_vn: q.options_vn || q.options,
      correct: q.correct,
      explanation: q.explanation || '',
    }));
  },

  // 특정 씬의 퀴즈 가져오기 (script[i].quizzes)
  getSceneQuizzes(sopId, sceneIndex) {
    const sop = this.getById(sopId);
    if (!sop?.script?.[sceneIndex]?.quizzes) return [];
    return sop.script[sceneIndex].quizzes.map((q, i) => ({
      id: `${sopId}-s${sceneIndex}-q${i + 1}`,
      question: q.question,
      question_en: q.question_en || q.question,
      question_vn: q.question_vn || q.question,
      options: q.options || [],
      options_en: q.options_en || q.options || [],
      options_vn: q.options_vn || q.options || [],
      correct: q.correct,
      explanation: q.explanation || '',
    }));
  },

  // 초기 SOP 세팅 (KIDS_SOP_CONTENT가 있으면 사용, 없으면 기본 데모)
  // 한번이라도 삭제한 적 있으면 자동 생성하지 않음
  initDemo() {
    if (this.getAll().length > 0) return;
    // 사용자가 의도적으로 삭제한 경우 자동 생성 차단
    if (localStorage.getItem('sop_user_cleared') === 'true') return;
    // 자동 로드 비활성화됨 - 관리자가 직접 SOP 업로드
    if (localStorage.getItem('sop_skip_auto_load') === 'true') return;

    // 키즈카페 SOP 콘텐츠가 로드되어 있으면 사용
    if (typeof KIDS_SOP_CONTENT !== 'undefined' && KIDS_SOP_CONTENT.length > 0) {
      const sops = KIDS_SOP_CONTENT.map(sop => ({
        ...sop,
        status: 'published',
        createdAt: sop.createdAt || new Date().toISOString().slice(0, 10),
        script: null,  // AI 생성으로 채워질 예정
        quizzes: sop.quizzes || null,
      }));
      this.save(sops);
      // 각 SOP에 대해 로컬 AI로 스크립트 자동 생성
      if (typeof AI !== 'undefined') {
        const allSops = this.getAll();
        allSops.forEach(s => {
          if (!s.script && s.content) {
            s.script = AI._localGenerateScript(s.title, s.content);
          }
        });
        this.save(allSops);
      }
      return;
    }

    // 기본 데모 데이터 (키즈카페 콘텐츠가 없을 때)
    this.save([
      {
        id: 'sop-open', title: '매장 오픈 절차', title_en: 'Store Opening', title_vn: 'Quy trình mở cửa',
        category: '오프닝', status: 'published', order_num: 1, createdAt: '2026-03-15',
        content: '<h3>1. 출근 및 체크인</h3><ol><li>정시 10분 전까지 도착</li><li>출근 체크인 완료</li><li>유니폼 착용, 명찰 부착</li></ol><h3>2. 장비 점검</h3><ol><li>체크리스트로 장비 작동 확인</li><li>냉장고 온도 확인 (0~5°C)</li><li>이상 시 매니저 보고</li></ol><h3>3. 청소</h3><ol><li>빗자루 → 물걸레 → 소독</li><li>화장실 점검, 비품 보충</li></ol><h3>4. 최종 확인</h3><ol><li>조명, 음악 세팅</li><li>메뉴판, POS 확인</li><li>오픈 30분 전 완료</li></ol>',
        script: [
          { scene: 1, narration: '안녕하세요. 매장 오픈 절차를 배우겠습니다.', visual: '타이틀 화면' },
          { scene: 2, narration: '정시 10분 전 도착, 출근 체크인, 유니폼과 명찰을 착용합니다.', visual: '체크인 장면' },
          { scene: 3, narration: '체크리스트로 장비를 점검합니다. 냉장고는 0~5도를 유지해야 합니다.', visual: '장비 점검' },
          { scene: 4, narration: '빗자루, 물걸레, 소독 순서로 청소합니다.', visual: '청소 장면' },
          { scene: 5, narration: '조명, 음악, 메뉴판, POS를 최종 확인합니다. 오픈 30분 전 완료!', visual: '최종 확인' },
        ],
        quizzes: [
          { question: '출근 후 가장 먼저 할 일은?', options: ['청소', '체크인 및 유니폼 착용', '장비 점검', '고객 맞이'], correct: 1 },
          { question: '냉장고 적정 온도는?', options: ['-5~0°C', '0~5°C', '5~10°C', '10~15°C'], correct: 1 },
          { question: '청소 순서로 올바른 것은?', options: ['소독→빗자루→물걸레', '빗자루→물걸레→소독', '물걸레→빗자루', '소독만'], correct: 1 },
          { question: '오픈 준비 완료 시한은?', options: ['직전', '10분 전', '30분 전', '1시간 전'], correct: 2 },
          { question: '장비 이상 시 조치는?', options: ['직접 수리', '무시', '매니저 보고', '퇴근 후 보고'], correct: 2 },
        ]
      },
      {
        id: 'sop-customer', title: '고객 응대 매뉴얼', title_en: 'Customer Service', title_vn: 'Phục vụ khách hàng',
        category: '고객 응대', status: 'published', order_num: 2, createdAt: '2026-03-16',
        content: '<h3>1. 고객 맞이</h3><ol><li>눈 맞춤 + 미소 + 인사</li><li>자연스럽게 안내</li></ol><h3>2. 주문 접수</h3><ol><li>주문 내용 복창</li><li>추가 요청 확인</li></ol><h3>3. 불만 응대</h3><ol><li>경청 → 공감 → 해결 → 후속조치</li><li>변명 금지</li></ol><h3>4. 결제</h3><ol><li>금액 안내, 결제 처리</li><li>영수증 발행</li></ol>',
        script: [
          { scene: 1, narration: '고객 응대의 기본을 배우겠습니다.', visual: '타이틀' },
          { scene: 2, narration: '고객이 오면 눈을 맞추고 미소 지으며 인사합니다.', visual: '인사 장면' },
          { scene: 3, narration: '주문을 받으면 반드시 복창하여 확인합니다.', visual: '주문 접수' },
          { scene: 4, narration: '불만 고객은 경청, 공감, 해결, 후속조치 순서로 대응합니다.', visual: '불만 응대' },
          { scene: 5, narration: '결제 시 금액을 안내하고 영수증을 발행합니다.', visual: '결제 처리' },
        ],
        quizzes: [
          { question: '고객 맞이 시 올바른 행동은?', options: ['무시', '눈 맞춤+미소+인사', '큰 소리로만', '고개만 끄덕'], correct: 1 },
          { question: '주문 접수 시 필수 행동은?', options: ['빠르게 넘김', '주문 복창', '메뉴 추천만', '대기'], correct: 1 },
          { question: '불만 고객 대응 첫 단계는?', options: ['변명', '경청', '매니저 호출', '할인'], correct: 1 },
          { question: '결제 오류 시 대처는?', options: ['무시', '정중히 안내 후 재시도', '다른 직원에게', '환불'], correct: 1 },
        ]
      },
      {
        id: 'sop-hygiene', title: '안전 및 위생 관리', title_en: 'Safety & Hygiene', title_vn: 'An toàn & Vệ sinh',
        category: '안전/위생', status: 'published', order_num: 3, createdAt: '2026-03-17',
        content: '<h3>1. 개인 위생</h3><ol><li>손 씻기 최소 20초</li><li>유니폼 청결 유지</li></ol><h3>2. 시설 안전</h3><ol><li>소화기 위치 숙지, 매월 점검</li><li>비상구 확보</li></ol><h3>3. 식품 위생</h3><ol><li>냉장 0~5°C, 냉동 -18°C</li><li>교차오염 방지</li></ol>',
        script: [
          { scene: 1, narration: '안전 및 위생 관리를 배우겠습니다.', visual: '타이틀' },
          { scene: 2, narration: '손은 최소 20초간 비누로 씻습니다.', visual: '손 씻기' },
          { scene: 3, narration: '소화기 위치를 숙지하고 매월 점검합니다.', visual: '소화기 점검' },
          { scene: 4, narration: '식품은 냉장 0~5도, 냉동 영하 18도 이하로 보관합니다.', visual: '식품 보관' },
        ],
        quizzes: [
          { question: '손 씻기 최소 시간은?', options: ['5초', '20초', '1분', '10초'], correct: 1 },
          { question: '소화기 점검 주기는?', options: ['1년', '매월', '매일', '분기'], correct: 1 },
          { question: '냉장 보관 적정 온도는?', options: ['상온', '0~5°C', '10~15°C', '-5°C'], correct: 1 },
        ]
      },
      {
        id: 'sop-closing', title: '매장 클로징 절차', title_en: 'Store Closing', title_vn: 'Đóng cửa hàng',
        category: '클로징', status: 'published', order_num: 4, createdAt: '2026-03-18',
        content: '<h3>1. 마감 정산</h3><ol><li>POS 매출 확인</li><li>현금 시재 대조</li></ol><h3>2. 청소</h3><ol><li>주방→홀→화장실→쓰레기 배출</li></ol><h3>3. 시건장치</h3><ol><li>가스 밸브, 전원 차단</li><li>모든 문/창문 잠금</li><li>보안 알람 설정</li></ol>',
        script: [
          { scene: 1, narration: '클로징 절차를 배우겠습니다.', visual: '타이틀' },
          { scene: 2, narration: 'POS 매출을 확인하고 현금 시재를 대조합니다.', visual: '정산 장면' },
          { scene: 3, narration: '주방, 홀, 화장실 순서로 청소하고 쓰레기를 배출합니다.', visual: '청소' },
          { scene: 4, narration: '가스 밸브, 전원을 차단하고 모든 문을 잠급니다. 보안 알람을 설정하세요.', visual: '잠금 확인' },
        ],
        quizzes: [
          { question: '마감 정산 첫 단계는?', options: ['금고 잠금', 'POS 매출 확인', '청소', '조명 끄기'], correct: 1 },
          { question: '현금 불일치 시 조치는?', options: ['무시', '매니저 보고+원인 파악', '개인 돈 채움', '다음 날'], correct: 1 },
          { question: '퇴근 전 필수 확인은?', options: ['내일 스케줄', '모든 잠금+가스 밸브', '복장 정리', '인사'], correct: 1 },
        ]
      },
      {
        id: 'sop-emergency', title: '비상 상황 대응', title_en: 'Emergency Response', title_vn: 'Ứng phó khẩn cấp',
        category: '비상 대응', status: 'published', order_num: 5, createdAt: '2026-03-19',
        content: '<h3>1. 화재</h3><ol><li>"불이야!" 알림 + 119</li><li>대피 유도</li><li>초기 진화 (안전한 경우)</li></ol><h3>2. 응급환자</h3><ol><li>119 + 의식 확인</li><li>CPR + AED</li></ol><h3>3. 정전</h3><ol><li>비상조명 확인</li><li>고객 안내</li><li>30분 이상 시 매니저 판단</li></ol>',
        script: [
          { scene: 1, narration: '비상 상황 대응법을 배우겠습니다.', visual: '타이틀' },
          { scene: 2, narration: '화재 시 큰 소리로 알리고 119에 신고합니다. 고객을 비상구로 대피시킵니다.', visual: '화재 대응' },
          { scene: 3, narration: '응급환자 발생 시 119 신고, 의식을 확인하고 필요 시 CPR과 AED를 사용합니다.', visual: '응급 대응' },
          { scene: 4, narration: '정전 시 비상조명을 확인하고 고객을 안내합니다. 30분 이상이면 매니저가 판단합니다.', visual: '정전 대응' },
        ],
        quizzes: [
          { question: '화재 발견 시 첫 행동은?', options: ['직접 진화', '119 신고+대피 유도', '사진 촬영', '매니저 연락'], correct: 1 },
          { question: 'AED가 필요한 경우는?', options: ['두통', '심정지 의심', '감기', '피로'], correct: 1 },
          { question: '정전 시 먼저 할 일은?', options: ['퇴근', '비상조명 확인+고객 안내', '충전', '대기'], correct: 1 },
        ]
      },
      {
        id: 'sop-fire-detail', title: '화재 비상 대응 (상세)', category: '비상 대응',
        status: 'draft', order_num: 6, createdAt: '2026-03-20',
        content: '<h3>1. 화재 발견</h3><ol><li>큰 소리로 알림</li><li>화재 경보 버튼</li></ol><p><em>작성 중...</em></p>',
        script: null, quizzes: null
      }
    ]);
  }
};

// ===== 직원 저장소 =====
const EmployeeStore = {
  _key: 'sop_employees',

  getAll() {
    return JSON.parse(localStorage.getItem(this._key) || '[]');
  },

  save(emps) {
    localStorage.setItem(this._key, JSON.stringify(emps));
    // Supabase 동기화 (직원 추가 시)
  },

  getById(id) {
    return this.getAll().find(e => e.id === id);
  },

  // 현재 로그인한 직원 정보
  getCurrentEmployee() {
    const user = JSON.parse(localStorage.getItem('sop_user') || 'null');
    if (!user) return null;
    return this.getAll().find(e => e.email === user.email) || {
      id: user.id, name: user.name, email: user.email, branch: '본사', role: user.role
    };
  },

  initDemo() {
    if (this.getAll().length > 0) return;
    this.save([
      { id: 'e1', name: '김민수', email: 'minsu@company.com', branch: '서울 강남점', role: 'staff', created: '2026-01-15' },
      { id: 'e2', name: 'Nguyen Van A', email: 'nguyen@company.com', branch: '호치민 1호점', role: 'staff', created: '2026-02-01' },
      { id: 'e3', name: '이지은', email: 'jieun@company.com', branch: '서울 홍대점', role: 'staff', created: '2026-02-10' },
      { id: 'e4', name: 'Tran Thi B', email: 'tran@company.com', branch: '하노이 1호점', role: 'staff', created: '2026-03-01' },
      { id: 'e5', name: '박준호', email: 'junho@company.com', branch: '부산 해운대점', role: 'staff', created: '2026-01-20' },
      { id: 'e6', name: '최영희', email: 'younghee@company.com', branch: '서울 강남점', role: 'branch_manager', created: '2025-11-01' },
      { id: 'e7', name: 'Le Van C', email: 'levan@company.com', branch: '호치민 1호점', role: 'staff', created: '2026-02-15' },
      { id: 'e8', name: '정수민', email: 'sumin@company.com', branch: '서울 홍대점', role: 'staff', created: '2026-01-25' },
      { id: 'demo-staff', name: '직원1', email: 'staff@test.com', branch: '서울 강남점', role: 'staff', created: '2026-03-01' },
    ]);
  }
};

// ===== 진행 상태 관리 =====
const Progress = {
  _key: 'sop_progress_v2',

  // 구조: { "employee_id": { completedVideos: [], chapterResults: {}, quizScores: {} } }
  _getData() {
    return JSON.parse(localStorage.getItem(this._key) || '{}');
  },

  _save(data) {
    localStorage.setItem(this._key, JSON.stringify(data));
  },

  _getEmpData(empId) {
    const all = this._getData();
    if (!all[empId]) all[empId] = { completedVideos: [], chapterResults: {}, quizScores: {} };
    return all[empId];
  },

  _saveEmpData(empId, empData) {
    const all = this._getData();
    all[empId] = empData;
    this._save(all);
  },

  _currentEmpId() {
    const user = JSON.parse(localStorage.getItem('sop_user') || 'null');
    return user ? user.id : null;
  },

  // --- 현재 로그인 직원용 ---
  completeVideo(videoId, chapterId) {
    const empId = this._currentEmpId();
    if (!empId) return;
    const d = this._getEmpData(empId);
    if (!d.completedVideos.includes(videoId)) d.completedVideos.push(videoId);
    d.lastActive = new Date().toISOString();
    this._saveEmpData(empId, d);
    // Supabase 동기화
    if (typeof SupabaseMode !== 'undefined' && SupabaseMode._ready) {
      SupabaseMode.saveVideoProgress(empId, videoId, chapterId || '').catch(() => {});
    }
  },

  isVideoCompleted(videoId) {
    const empId = this._currentEmpId();
    if (!empId) return false;
    return this._getEmpData(empId).completedVideos.includes(videoId);
  },

  saveQuizScore(videoId, score) {
    const empId = this._currentEmpId();
    if (!empId) return;
    const d = this._getEmpData(empId);
    d.quizScores[videoId] = score;
    d.lastActive = new Date().toISOString();
    this._saveEmpData(empId, d);
  },

  saveChapterResult(chapterId, score, passed) {
    const empId = this._currentEmpId();
    if (!empId) return;
    const d = this._getEmpData(empId);
    d.chapterResults[chapterId] = { score, passed, date: new Date().toISOString() };
    d.lastActive = new Date().toISOString();
    this._saveEmpData(empId, d);
    // Supabase 동기화
    if (typeof SupabaseMode !== 'undefined' && SupabaseMode._ready) {
      SupabaseMode.saveChapterResult(empId, chapterId, score, passed).catch(() => {});
    }
  },

  isChapterPassed(chapterId) {
    const empId = this._currentEmpId();
    if (!empId) return false;
    return this._getEmpData(empId).chapterResults[chapterId]?.passed === true;
  },

  isChapterUnlocked(chapterIndex) {
    if (chapterIndex === 0) return true;
    const chapters = SopStore.getChapters();
    if (chapterIndex >= chapters.length) return false;
    return this.isChapterPassed(chapters[chapterIndex - 1].id);
  },

  isChapterAllVideosComplete(chapterId) {
    const videos = SopStore.getVideos(chapterId);
    return videos.length > 0 && videos.every(v => this.isVideoCompleted(v.id));
  },

  getChapterVideoProgress(chapterId) {
    const videos = SopStore.getVideos(chapterId);
    if (videos.length === 0) return 0;
    const done = videos.filter(v => this.isVideoCompleted(v.id)).length;
    return Math.round((done / videos.length) * 100);
  },

  getTotalProgress() {
    const chapters = SopStore.getChapters();
    if (chapters.length === 0) return 0;
    // 각 챕터별로: 영상 시청 50% + 퀴즈 통과 50%
    let totalScore = 0;
    chapters.forEach(ch => {
      const videoPct = this.getChapterVideoProgress(ch.id); // 0~100
      const quizPassed = this.isChapterPassed(ch.id);
      // 영상 시청 비율 50% + 퀴즈 통과 50%
      totalScore += (videoPct / 100) * 50 + (quizPassed ? 50 : 0);
    });
    return Math.round(totalScore / chapters.length);
  },

  getAllResults() {
    const empId = this._currentEmpId();
    if (!empId) return { completedVideos: [], chapterResults: {}, quizScores: {} };
    return this._getEmpData(empId);
  },

  // --- 관리자용: 특정 직원의 진행률 ---
  getEmployeeProgress(empId) {
    const d = this._getEmpData(empId);
    const chapters = SopStore.getChapters();
    const totalChapters = chapters.length;
    const passedChapters = chapters.filter(ch => d.chapterResults[ch.id]?.passed === true).length;
    const totalVideos = chapters.reduce((sum, ch) => sum + SopStore.getVideos(ch.id).length, 0);
    const completedVideos = d.completedVideos.length;

    // 퀴즈 평균 점수
    const scores = Object.values(d.chapterResults).map(r => r.score).filter(s => s > 0);
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

    let status = 'not_started';
    if (passedChapters >= totalChapters && totalChapters > 0) status = 'completed';
    else if (completedVideos > 0 || passedChapters > 0) status = 'in_progress';

    return {
      progress: totalChapters > 0 ? Math.round((passedChapters / totalChapters) * 100) : 0,
      passedChapters,
      totalChapters,
      completedVideos,
      totalVideos,
      avgScore,
      status,
      lastActive: d.lastActive || null,
      chapterResults: d.chapterResults,
      completedVideoIds: d.completedVideos,
    };
  },

  // 관리자용: 모든 직원 진행률 요약
  getAllEmployeesProgress() {
    const employees = EmployeeStore.getAll();
    return employees.map(emp => ({
      ...emp,
      ...this.getEmployeeProgress(emp.id),
    }));
  },

  // 초기화 (데모 데이터 시뮬레이션)
  initDemoProgress() {
    // 사용자가 SOP를 삭제한 적 있으면 데모 진행률 생성 안 함
    if (localStorage.getItem('sop_user_cleared') === 'true') return;
    const all = this._getData();
    // 이미 데이터 있으면 스킵
    if (Object.keys(all).length > 1) return;

    const chapters = SopStore.getChapters();
    if (chapters.length === 0) return;

    // 김민수: 100% 완료
    const e1 = { completedVideos: [], chapterResults: {}, quizScores: {}, lastActive: '2026-03-21T09:00:00Z' };
    chapters.forEach(ch => {
      SopStore.getVideos(ch.id).forEach(v => e1.completedVideos.push(v.id));
      e1.chapterResults[ch.id] = { score: 88 + Math.floor(Math.random() * 12), passed: true, date: '2026-03-20T10:00:00Z' };
    });
    all['e1'] = e1;

    // Nguyen: 60%
    const e2 = { completedVideos: [], chapterResults: {}, quizScores: {}, lastActive: '2026-03-20T14:00:00Z' };
    chapters.slice(0, 3).forEach(ch => {
      SopStore.getVideos(ch.id).forEach(v => e2.completedVideos.push(v.id));
      e2.chapterResults[ch.id] = { score: 75 + Math.floor(Math.random() * 15), passed: true, date: '2026-03-19T10:00:00Z' };
    });
    all['e2'] = e2;

    // 이지은: 30%
    const e3 = { completedVideos: [], chapterResults: {}, quizScores: {}, lastActive: '2026-03-18T16:00:00Z' };
    chapters.slice(0, 1).forEach(ch => {
      SopStore.getVideos(ch.id).forEach(v => e3.completedVideos.push(v.id));
      e3.chapterResults[ch.id] = { score: 82, passed: true, date: '2026-03-18T10:00:00Z' };
    });
    // 2번째 챕터 일부 비디오만
    const ch2vids = SopStore.getVideos(chapters[1]?.id);
    ch2vids.slice(0, 2).forEach(v => e3.completedVideos.push(v.id));
    all['e3'] = e3;

    // 박준호: 100%
    const e5 = { completedVideos: [], chapterResults: {}, quizScores: {}, lastActive: '2026-03-19T11:00:00Z' };
    chapters.forEach(ch => {
      SopStore.getVideos(ch.id).forEach(v => e5.completedVideos.push(v.id));
      e5.chapterResults[ch.id] = { score: 85 + Math.floor(Math.random() * 10), passed: true, date: '2026-03-18T10:00:00Z' };
    });
    all['e5'] = e5;

    // 최영희: 100%
    const e6 = { completedVideos: [], chapterResults: {}, quizScores: {}, lastActive: '2026-03-21T08:00:00Z' };
    chapters.forEach(ch => {
      SopStore.getVideos(ch.id).forEach(v => e6.completedVideos.push(v.id));
      e6.chapterResults[ch.id] = { score: 92 + Math.floor(Math.random() * 8), passed: true, date: '2026-03-15T10:00:00Z' };
    });
    all['e6'] = e6;

    // 정수민: 80%
    const e8 = { completedVideos: [], chapterResults: {}, quizScores: {}, lastActive: '2026-03-20T15:00:00Z' };
    chapters.slice(0, 4).forEach(ch => {
      SopStore.getVideos(ch.id).forEach(v => e8.completedVideos.push(v.id));
      e8.chapterResults[ch.id] = { score: 78 + Math.floor(Math.random() * 15), passed: true, date: '2026-03-20T10:00:00Z' };
    });
    all['e8'] = e8;

    this._save(all);
  },

  reset() {
    localStorage.removeItem(this._key);
  }
};

// ===== 유틸리티 =====
function formatDuration(seconds) {
  const lang = localStorage.getItem('sop_lang') || CONFIG.DEFAULT_LANG;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (lang === 'en') return `${m} min ${s > 0 ? s + ' sec' : ''}`;
  if (lang === 'vi') return `${m} phút ${s > 0 ? s + ' giây' : ''}`;
  return `${m}분 ${s > 0 ? s + '초' : ''}`;
}

function getLocalizedText(item, field) {
  const lang = localStorage.getItem('sop_lang') || CONFIG.DEFAULT_LANG;
  if (lang === 'en' && item[field + '_en']) return item[field + '_en'];
  if (lang === 'vi' && item[field + '_vn']) return item[field + '_vn'];
  return item[field];
}

function formatDate(isoStr) {
  if (!isoStr) return '-';
  const lang = localStorage.getItem('sop_lang') || CONFIG.DEFAULT_LANG;
  const locale = lang === 'en' ? 'en-US' : lang === 'vi' ? 'vi-VN' : 'ko-KR';
  const d = new Date(isoStr);
  return d.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
}

// ===== 초기화 =====
SopStore.initDemo();
EmployeeStore.initDemo();
Progress.initDemoProgress();
