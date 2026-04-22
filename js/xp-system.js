// ============================================
// 키우자 히어로즈 — XP & 티어 시스템 코어 엔진
// ============================================
// Supabase-only (localStorage에 XP 저장 안 함 → 조작 방지)
// 중복 방지: JS 체크 + DB UNIQUE constraint

const XP_CONFIG = {
  CHAPTER_COMPLETE: 50,
  QUIZ_CORRECT: 10,
  QUIZ_PERFECT_BONUS: 30,
  CHAPTER_EXAM_PASS: 100,        // 대챕터 종합시험 통과 (F 제외)
  CHAPTER_EXAM_GRADE_S_BONUS: 50, // S 등급 추가 보너스
  COURSE_COMPLETE: 200,
  ADMIN_MIN: 50,
  ADMIN_MAX: 1500,
  // 칭찬 설정 (관리자 패널에서 변경 가능)
  PRAISE_XP_PER_STACK: 15,      // 칭찬 N개 모이면 받는 XP
  PRAISE_SEND_XP: 3,            // 칭찬 보낼 때 보내는 사람 XP
  PRAISE_STACK_COUNT: 2,        // 몇 개 모여야 XP 전환?
  PRAISE_DAILY_LIMIT: 5,        // 하루 보내기 제한 (전체)
  PRAISE_SAME_PERSON_DAILY: 1,  // 같은 사람 하루 최대
};

// 관리자가 저장한 칭찬 설정 오버라이드
(function loadPraiseConfig() {
  try {
    const saved = JSON.parse(localStorage.getItem('sop_praise_config') || 'null');
    if (saved) Object.assign(XP_CONFIG, saved);
  } catch (e) {}
})();

// LOL 티어 패러디 — 9단계, 각 티어 IV~I 서브레벨
const TIERS = [
  { id: 'iron',         xp: 0,     emoji: '🌱', color: '#8B8B8B',  ko: '새싹',      en: 'Sprout',     vn: 'Mầm Non' },
  { id: 'bronze',       xp: 500,   emoji: '🥉', color: '#CD7F32',  ko: '성장',      en: 'Growing',    vn: 'Đang Lớn' },
  { id: 'silver',       xp: 1500,  emoji: '⭐', color: '#C0C0C0',  ko: '빛나는',    en: 'Shining',    vn: 'Tỏa Sáng' },
  { id: 'gold',         xp: 3500,  emoji: '🌟', color: '#FFD700',  ko: '황금별',    en: 'Gold Star',  vn: 'Ngôi Sao Vàng' },
  { id: 'platinum',     xp: 7000,  emoji: '💎', color: '#00CED1',  ko: '정예',      en: 'Elite',      vn: 'Tinh Nhuệ' },
  { id: 'diamond',      xp: 13000, emoji: '👑', color: '#B9F2FF',  ko: '챔피언',    en: 'Champion',   vn: 'Nhà Vô Địch' },
  { id: 'master',       xp: 22000, emoji: '🔮', color: '#9B59B6',  ko: '전설',      en: 'Legend',     vn: 'Huyền Thoại' },
  { id: 'grandmaster',  xp: 35000, emoji: '🔥', color: '#E74C3C',  ko: '불꽃',      en: 'Blaze',      vn: 'Ngọn Lửa' },
  { id: 'challenger',   xp: 50000, emoji: '⚡', color: '#FF6B35',  ko: '키우자 신', en: 'Kiwooza God', vn: 'Thần Kiwooza' },
];

/**
 * 총 XP로 현재 티어/서브레벨 계산 (순수 함수)
 * @param {number} totalXp
 * @returns {{ tierIndex, tierId, subLevel, emoji, color, titleKo, titleEn, titleVn, currentXp, nextTierXp, progressPct, subLabel }}
 */
function calculateTier(totalXp) {
  let tierIndex = 0;
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (totalXp >= TIERS[i].xp) {
      tierIndex = i;
      break;
    }
  }

  const tier = TIERS[tierIndex];
  const nextTier = TIERS[tierIndex + 1];
  const tierStart = tier.xp;
  const tierEnd = nextTier ? nextTier.xp : tier.xp + 15000; // 챌린저 이후
  const tierSpan = tierEnd - tierStart;
  const xpInTier = totalXp - tierStart;

  // 서브레벨: IV(4) → III(3) → II(2) → I(1)
  let subLevel;
  if (!nextTier) {
    subLevel = 1; // 챌린저는 항상 I
  } else {
    const quarter = tierSpan / 4;
    subLevel = 4 - Math.min(3, Math.floor(xpInTier / quarter));
  }

  const subLabels = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV' };
  const progressPct = Math.min(100, Math.round((xpInTier / tierSpan) * 100));

  return {
    tierIndex,
    tierId: tier.id,
    subLevel,
    subLabel: subLabels[subLevel],
    emoji: tier.emoji,
    color: tier.color,
    titleKo: tier.ko,
    titleEn: tier.en,
    titleVn: tier.vn,
    currentXp: totalXp,
    nextTierXp: nextTier ? nextTier.xp : null,
    tierStartXp: tierStart,
    progressPct,
  };
}

/**
 * 언어에 맞는 티어 타이틀 반환
 */
function getTierTitle(tier, lang) {
  if (lang === 'en') return tier.titleEn;
  if (lang === 'vi') return tier.titleVn;
  return tier.titleKo;
}

// ===== XP 서비스 (Supabase 전용) =====
const XpService = {

  /**
   * XP 적립 (중복 방지 포함)
   * @returns {{ newTotal, oldTier, newTier, leveledUp } | null} 중복이면 null
   */
  async addXp(empId, amount, source, sourceId, reason = '') {
    if (!SupabaseMode._ready || !empId || !amount) return null;

    try {
      // 1) 중복 체크
      const { data: existing } = await SupabaseMode._client
        .from('xp_transactions')
        .select('id')
        .eq('employee_id', empId)
        .eq('source', source)
        .eq('source_id', sourceId)
        .maybeSingle();

      if (existing) {
        console.log(`[XP] 중복 건너뜀: ${source}/${sourceId}`);
        return null;
      }

      // 2) 현재 XP 조회 (이전 티어)
      const oldTotal = await this.getTotal(empId);
      const oldTier = calculateTier(oldTotal);

      // 3) XP 트랜잭션 삽입
      const { error } = await SupabaseMode._client
        .from('xp_transactions')
        .insert({
          employee_id: empId,
          amount,
          source,
          source_id: sourceId,
          reason,
        });

      if (error) {
        // UNIQUE 위반 (23505) = 이미 존재 → 무시
        if (error.code === '23505') {
          console.log(`[XP] DB 중복 방지: ${source}/${sourceId}`);
          return null;
        }
        console.error('[XP] 적립 오류:', error.message);
        return null;
      }

      // 4) 캐시 업데이트
      const newTotal = oldTotal + amount;
      const newTier = calculateTier(newTotal);

      await SupabaseMode._client
        .from('user_gamification')
        .upsert({
          employee_id: empId,
          total_xp: newTotal,
          tier_index: newTier.tierIndex,
          sub_level: newTier.subLevel,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'employee_id' });

      // 5) 레벨업 감지
      const leveledUp = newTier.tierIndex > oldTier.tierIndex;

      console.log(`[XP] +${amount} (${source}) → 총 ${newTotal} XP | ${newTier.tierId} ${newTier.subLabel}`);

      return { newTotal, oldTier, newTier, leveledUp };

    } catch (e) {
      console.error('[XP] addXp 오류:', e);
      return null;
    }
  },

  /**
   * 직원의 총 XP 조회
   */
  async getTotal(empId) {
    if (!SupabaseMode._ready || !empId) return 0;
    try {
      const { data } = await SupabaseMode._client
        .from('user_gamification')
        .select('total_xp')
        .eq('employee_id', empId)
        .maybeSingle();

      return data?.total_xp || 0;
    } catch (e) {
      console.error('[XP] getTotal 오류:', e);
      return 0;
    }
  },

  /**
   * XP 이력 조회
   */
  async getHistory(empId, limit = 50) {
    if (!SupabaseMode._ready || !empId) return [];
    try {
      const { data } = await SupabaseMode._client
        .from('xp_transactions')
        .select('*')
        .eq('employee_id', empId)
        .order('created_at', { ascending: false })
        .limit(limit);

      return data || [];
    } catch (e) {
      console.error('[XP] getHistory 오류:', e);
      return [];
    }
  },

  /**
   * 전 직원 게이미피케이션 조회 (관리자용)
   */
  async getAllGamification() {
    if (!SupabaseMode._ready) return [];
    try {
      const { data } = await SupabaseMode._client
        .from('user_gamification')
        .select('*')
        .order('total_xp', { ascending: false });

      return data || [];
    } catch (e) {
      console.error('[XP] getAllGamification 오류:', e);
      return [];
    }
  },

  /**
   * 전체 XP 이력 조회 (관리자용)
   */
  async getAllHistory(limit = 100) {
    if (!SupabaseMode._ready) return [];
    try {
      const { data } = await SupabaseMode._client
        .from('xp_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      return data || [];
    } catch (e) {
      console.error('[XP] getAllHistory 오류:', e);
      return [];
    }
  },

  /**
   * XP 재계산 (xp_transactions 합계로 캐시 갱신)
   */
  async recalculate(empId) {
    if (!SupabaseMode._ready || !empId) return 0;
    try {
      const { data } = await SupabaseMode._client
        .from('xp_transactions')
        .select('amount')
        .eq('employee_id', empId);

      const total = (data || []).reduce((sum, row) => sum + row.amount, 0);
      const tier = calculateTier(total);

      await SupabaseMode._client
        .from('user_gamification')
        .upsert({
          employee_id: empId,
          total_xp: total,
          tier_index: tier.tierIndex,
          sub_level: tier.subLevel,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'employee_id' });

      return total;
    } catch (e) {
      console.error('[XP] recalculate 오류:', e);
      return 0;
    }
  },
};

// ===== 칭찬 서비스 =====
const PRAISE_CATEGORIES = [
  { id: 'teamwork', emoji: '🤝', ko: '팀워크', en: 'Teamwork', vn: 'Tinh thần đồng đội' },
  { id: 'service',  emoji: '⭐', ko: '서비스', en: 'Service',  vn: 'Phục vụ' },
  { id: 'idea',     emoji: '💡', ko: '아이디어', en: 'Idea',   vn: 'Ý tưởng' },
  { id: 'passion',  emoji: '🔥', ko: '열정',   en: 'Passion',  vn: 'Nhiệt huyết' },
  { id: 'accuracy', emoji: '🎯', ko: '정확함', en: 'Accuracy', vn: 'Chính xác' },
];

const PraiseService = {

  /**
   * 칭찬 보내기 가능 여부 체크
   * @returns {{ ok: boolean, reason?: string }}
   */
  async canPraise(fromId, toId) {
    if (!SupabaseMode._ready) return { ok: false, reason: 'DB 연결 필요' };
    if (fromId === toId) return { ok: false, reason: '자기 자신에게는 불가' };

    // KST 기준 오늘 자정 (UTC-9 → UTC 변환)
    const kst = new Date(Date.now() + 9 * 3600000);
    const todayStart = new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate()) - 9 * 3600000).toISOString();

    try {
      // 오늘 전체 보낸 수
      const { data: todaySent } = await SupabaseMode._client
        .from('praise_logs')
        .select('id')
        .eq('from_employee_id', fromId)
        .gte('created_at', todayStart);

      if ((todaySent?.length || 0) >= XP_CONFIG.PRAISE_DAILY_LIMIT) {
        return { ok: false, reason: `오늘 보내기 한도 (${XP_CONFIG.PRAISE_DAILY_LIMIT}개) 초과` };
      }

      // 오늘 같은 사람에게 보낸 수
      const { data: todaySame } = await SupabaseMode._client
        .from('praise_logs')
        .select('id')
        .eq('from_employee_id', fromId)
        .eq('to_employee_id', toId)
        .gte('created_at', todayStart);

      if ((todaySame?.length || 0) >= XP_CONFIG.PRAISE_SAME_PERSON_DAILY) {
        return { ok: false, reason: '같은 사람에게 하루 1번만 가능' };
      }

      return { ok: true };
    } catch (e) {
      console.error('[Praise] canPraise 오류:', e);
      return { ok: false, reason: '확인 중 오류' };
    }
  },

  /**
   * 칭찬 보내기
   * @returns {{ success, xpResult?, stackConverted? } | null}
   */
  async sendPraise(fromId, toId, category, reason = '') {
    const check = await this.canPraise(fromId, toId);
    if (!check.ok) return { success: false, reason: check.reason };

    try {
      // 1) praise_logs에 삽입
      const insertData = {
        from_employee_id: fromId,
        to_employee_id: toId,
        category,
      };
      if (reason) insertData.reason = reason;
      const { error } = await SupabaseMode._client
        .from('praise_logs')
        .insert(insertData);

      if (error) {
        console.error('[Praise] 삽입 오류:', error.message);
        // DB 트리거 남용 방지 메시지 처리
        if (error.message.includes('Daily praise limit')) {
          return { success: false, reason: `오늘 보내기 한도 (${XP_CONFIG.PRAISE_DAILY_LIMIT}개) 초과` };
        }
        if (error.message.includes('Same person daily limit')) {
          return { success: false, reason: '같은 사람에게 하루 1번만 가능' };
        }
        if (error.message.includes('Cannot praise yourself')) {
          return { success: false, reason: '자기 자신에게는 불가' };
        }
        return { success: false, reason: '저장 실패' };
      }

      // 2) 보내는 사람 XP (+3)
      const sendXpId = `praise_send_${fromId}_${Date.now()}`;
      await XpService.addXp(fromId, XP_CONFIG.PRAISE_SEND_XP, 'praise_send', sendXpId, `칭찬 보냄 → ${toId.slice(0, 8)}`);

      // 3) 받는 사람 스택 체크 → XP 전환
      let stackConverted = false;
      const stack = await this.getStackProgress(toId);
      const newCount = stack.current; // getStackProgress already includes the just-inserted praise

      if (newCount >= XP_CONFIG.PRAISE_STACK_COUNT) {
        // XP 전환!
        const batchNum = stack.totalConverted + 1;
        const stackXpId = `praise_stack_${toId}_batch_${batchNum}`;
        const xpResult = await XpService.addXp(toId, XP_CONFIG.PRAISE_XP_PER_STACK, 'praise_stack', stackXpId, `칭찬 ${XP_CONFIG.PRAISE_STACK_COUNT}개 달성`);
        stackConverted = true;
        console.log(`[Praise] 스택 전환! ${toId} → +${XP_CONFIG.PRAISE_XP_PER_STACK} XP (batch ${batchNum})`);
        return { success: true, stackConverted, xpResult };
      }

      return { success: true, stackConverted: false };
    } catch (e) {
      console.error('[Praise] sendPraise 오류:', e);
      return { success: false, reason: '오류 발생' };
    }
  },

  /**
   * 받은 칭찬의 스택 진행률
   * @returns {{ current, needed, totalReceived, totalConverted }}
   */
  async getStackProgress(empId) {
    if (!SupabaseMode._ready || !empId) return { current: 0, needed: XP_CONFIG.PRAISE_STACK_COUNT, totalReceived: 0, totalConverted: 0 };
    try {
      // 총 받은 칭찬 수
      const { data } = await SupabaseMode._client
        .from('praise_logs')
        .select('id')
        .eq('to_employee_id', empId);

      const totalReceived = data?.length || 0;
      const stackSize = XP_CONFIG.PRAISE_STACK_COUNT;
      const totalConverted = Math.floor(totalReceived / stackSize);
      const current = totalReceived % stackSize;

      return { current, needed: stackSize, totalReceived, totalConverted };
    } catch (e) {
      console.error('[Praise] getStackProgress 오류:', e);
      return { current: 0, needed: XP_CONFIG.PRAISE_STACK_COUNT, totalReceived: 0, totalConverted: 0 };
    }
  },

  /**
   * 오늘 보낸 칭찬 수
   */
  async getDailySentCount(fromId) {
    if (!SupabaseMode._ready || !fromId) return 0;
    // KST 기준 오늘 자정
    const kst = new Date(Date.now() + 9 * 3600000);
    const todayStart = new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate()) - 9 * 3600000).toISOString();
    try {
      const { data } = await SupabaseMode._client
        .from('praise_logs')
        .select('id')
        .eq('from_employee_id', fromId)
        .gte('created_at', todayStart);
      return data?.length || 0;
    } catch (e) { return 0; }
  },

  /**
   * 받은 칭찬 이력
   */
  async getReceivedHistory(empId, limit = 20) {
    if (!SupabaseMode._ready || !empId) return [];
    try {
      const { data } = await SupabaseMode._client
        .from('praise_logs')
        .select('*')
        .eq('to_employee_id', empId)
        .order('created_at', { ascending: false })
        .limit(limit);
      return data || [];
    } catch (e) { return []; }
  },

  /**
   * 전체 칭찬 로그 (관리자용)
   */
  async getAllPraiseLogs(limit = 100) {
    if (!SupabaseMode._ready) return [];
    try {
      const { data } = await SupabaseMode._client
        .from('praise_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      return data || [];
    } catch (e) { return []; }
  },

  /**
   * 이번 달 칭찬 통계 (관리자용)
   */
  async getMonthlyStats() {
    if (!SupabaseMode._ready) return { total: 0, byEmployee: {} };
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    try {
      const { data } = await SupabaseMode._client
        .from('praise_logs')
        .select('*')
        .gte('created_at', monthStart);

      const logs = data || [];
      const byEmployee = {};
      logs.forEach(l => {
        byEmployee[l.to_employee_id] = (byEmployee[l.to_employee_id] || 0) + 1;
      });
      return { total: logs.length, byEmployee };
    } catch (e) { return { total: 0, byEmployee: {} }; }
  },
};

// ===== 칭찬 설정 Supabase 동기화 (전역 함수) =====

// Supabase에서 칭찬 설정 로드 (관리자가 저장한 설정을 모든 기기에서 동기화)
async function syncPraiseConfigFromSupabase() {
  if (!window.SupabaseMode || !SupabaseMode._ready || !SupabaseMode._client) return;
  try {
    const { data } = await SupabaseMode._client
      .from('app_config')
      .select('*')
      .eq('key', 'praise_config')
      .single();
    if (data && data.value) {
      const config = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
      Object.assign(XP_CONFIG, config);
      localStorage.setItem('sop_praise_config', JSON.stringify(config));
    }
  } catch (e) {
    // app_config 테이블이 없으면 무시 (localStorage 폴백)
  }
}

async function savePraiseConfigToSupabase(config) {
  if (!window.SupabaseMode || !SupabaseMode._ready || !SupabaseMode._client) return;
  try {
    await SupabaseMode._client
      .from('app_config')
      .upsert({ key: 'praise_config', value: config, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  } catch (e) {
    console.error('[PraiseConfig] Supabase 저장 실패:', e);
  }
}

// ===== 일일 스트릭 시스템 =====
const StreakService = {
  _key: 'sop_streak',

  /** 오늘 접속 기록 + 스트릭 갱신 */
  checkIn(empId) {
    if (!empId) return this._get(empId);
    // 로컬 타임존 기준 날짜 (KST 등 사용자 시간대 반영)
    const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD (local)
    const data = this._get(empId);

    if (data.lastDate === today) return data; // 이미 체크인

    const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('en-CA');
    if (data.lastDate === yesterday) {
      data.current += 1; // 연속!
    } else {
      data.current = 1; // 리셋
    }
    data.lastDate = today;
    data.best = Math.max(data.best, data.current);
    data.totalDays = (data.totalDays || 0) + 1;

    localStorage.setItem(this._key + '_' + empId, JSON.stringify(data));

    // Supabase 동기화 (fire & forget)
    if (SupabaseMode._ready) {
      SupabaseMode._client.from('employee_streaks').upsert({
        employee_id: empId, current_streak: data.current,
        best_streak: data.best, last_date: data.lastDate,
        total_days: data.totalDays, updated_at: new Date().toISOString(),
      }, { onConflict: 'employee_id' }).catch(() => {});
    }

    return data;
  },

  _get(empId) {
    try {
      const raw = localStorage.getItem(this._key + '_' + (empId || ''));
      if (raw) return JSON.parse(raw);
    } catch(e) {}
    return { current: 0, best: 0, lastDate: '', totalDays: 0 };
  },

  /** Supabase에서 스트릭 로드 (첫 로드 시) */
  async sync(empId) {
    if (!SupabaseMode._ready || !empId) return;
    try {
      const { data } = await SupabaseMode._client
        .from('employee_streaks').select('*').eq('employee_id', empId).maybeSingle();
      if (data) {
        const local = this._get(empId);
        // Supabase가 더 높으면 동기화
        if ((data.current_streak || 0) > local.current || (data.best_streak || 0) > local.best) {
          const merged = {
            current: Math.max(data.current_streak || 0, local.current),
            best: Math.max(data.best_streak || 0, local.best),
            lastDate: data.last_date || local.lastDate,
            totalDays: Math.max(data.total_days || 0, local.totalDays),
          };
          localStorage.setItem(this._key + '_' + empId, JSON.stringify(merged));
        }
      }
    } catch(e) {}
  }
};
