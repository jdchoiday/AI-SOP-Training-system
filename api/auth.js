// ============================================
// Vercel Serverless Function — Auth API
// 비밀번호 해시 처리 (SHA-256 + salt)
// ============================================

const crypto = require('crypto');

function hashPassword(password, salt) {
  if (!salt) salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.createHash('sha256').update(salt + password).digest('hex');
  return { hash: salt + ':' + hash, salt };
}

function verifyPassword(password, storedHash) {
  const [salt, hash] = storedHash.split(':');
  if (!salt || !hash) {
    // 평문 비밀번호 (마이그레이션 전) — 직접 비교
    return password === storedHash;
  }
  const check = crypto.createHash('sha256').update(salt + password).digest('hex');
  return check === hash;
}

// ── 권한: 누가 어떤 role 을 부여할 수 있는가 (순수 함수 — 단위테스트 대상) ──
// staff 는 누구나(자가가입 포함) 부여 가능. 비-staff(admin/branch_manager/super_admin)는
// 인증된 관리자만, super_admin 생성은 오직 super_admin 만.
function authorizeRoleAssignment(callerRole, requestedRole) {
  const VALID = ['staff', 'admin', 'branch_manager', 'super_admin'];
  if (!VALID.includes(requestedRole)) return { ok: false, reason: 'invalid_role' };
  if (requestedRole === 'staff') return { ok: true };
  if (!callerRole) return { ok: false, reason: 'auth_required' };
  if (callerRole === 'super_admin') return { ok: true };
  if (callerRole === 'admin') {
    return requestedRole === 'super_admin'
      ? { ok: false, reason: 'cannot_create_super_admin' }
      : { ok: true };
  }
  return { ok: false, reason: 'insufficient_privilege' };
}

// 요청의 Bearer 토큰(=관리자 세션 access_token)을 검증해 employees 의 role/company_id 를 반환.
// 토큰이 없거나 검증 실패면 null → 자가가입자로 취급(= staff 만 허용).
async function verifyCaller(req, supabaseUrl, serviceKey) {
  const authz = req.headers['authorization'] || req.headers['Authorization'];
  if (!authz || !authz.startsWith('Bearer ')) return null;
  const token = authz.slice(7);
  try {
    const uRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${token}` },
    });
    if (!uRes.ok) return null;
    const u = await uRes.json();
    const uid = u && (u.id || (u.user && u.user.id));
    if (!uid) return null;
    const eRes = await fetch(
      `${supabaseUrl}/rest/v1/employees?auth_user_id=eq.${uid}&select=role,company_id`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
    );
    if (!eRes.ok) return null;
    const rows = await eRes.json();
    if (!Array.isArray(rows) || rows.length === 0) return null;
    return { role: rows[0].role, company_id: rows[0].company_id };
  } catch (e) {
    return null;
  }
}

async function handler(req, res) {
  // CORS: 프론트엔드와 API 가 같은 Vercel 배포(동일 출처)라 * 불필요.
  // 서비스 롤 키를 쓰는 핸들러이므로 교차 출처는 허용 목록만 반영한다.
  // (추가 도메인은 환경변수 ALLOWED_ORIGINS 에 콤마로 구분해 지정)
  const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'https://ai-sop-training-system.vercel.app')
    .split(',').map(s => s.trim()).filter(Boolean);
  const reqOrigin = req.headers.origin || '';
  if (ALLOWED_ORIGINS.includes(reqOrigin) || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(reqOrigin)) {
    res.setHeader('Access-Control-Allow-Origin', reqOrigin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  // 비-JSON/누락 본문에 대한 가드 (구조분해 전 — 500 raw stack 방지)
  if (!req.body || typeof req.body !== 'object') {
    return res.status(400).json({ error: 'invalid or missing JSON body' });
  }
  const { action, password, storedHash, email } = req.body;

  if (action === 'hash') {
    if (!password) return res.status(400).json({ error: 'password required' });
    const result = hashPassword(password);
    return res.status(200).json({ hash: result.hash });
  }

  if (action === 'verify') {
    if (!password || !storedHash) return res.status(400).json({ error: 'password and storedHash required' });
    const match = verifyPassword(password, storedHash);
    return res.status(200).json({ match });
  }

  // migrate: 기존 평문 비밀번호를 해시로 변환
  if (action === 'migrate') {
    if (!password) return res.status(400).json({ error: 'password required' });
    const result = hashPassword(password);
    return res.status(200).json({ hash: result.hash, migrated: true });
  }

  // register: 신규 회원가입 (auth.users + employees 원자적 생성)
  // 클라이언트가 email+password+profile+company_id 보내면 서버가 admin API로 처리
  if (action === 'register') {
    const { email: regEmail, password: regPassword, name, branch, team, role, company_id } = req.body;
    if (!regEmail || !regPassword || !name) {
      return res.status(400).json({ error: 'email, password, name required' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail)) {
      return res.status(400).json({ error: 'invalid email format' });
    }
    if (regPassword.length < 8) {
      return res.status(400).json({ error: 'password too short (min 8)' });
    }

    const supabaseUrl = process.env.SUPABASE_URL || 'https://xbcdzkrhtjgxdwfqqugc.supabase.co';
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' });

    // ── 권한상승 차단 ──
    // 이 엔드포인트는 service key(RLS 우회)로 동작하고 공개(CORS *)이므로, 클라이언트가 보낸
    // role 을 그대로 쓰면 자가가입자가 role:'super_admin' 으로 슈퍼관리자를 만들 수 있다.
    // → 비-staff role 은 인증된 관리자(Bearer 토큰)만 부여 가능하도록 검증한다.
    const requestedRole = role || 'staff';
    let caller = null;
    if (requestedRole !== 'staff') {
      caller = await verifyCaller(req, supabaseUrl, serviceKey);
    }
    const decision = authorizeRoleAssignment(caller ? caller.role : null, requestedRole);
    if (!decision.ok) {
      return res.status(decision.reason === 'invalid_role' ? 400 : 403)
        .json({ error: 'role assignment denied: ' + decision.reason });
    }
    const finalRole = requestedRole;
    // 크로스테넌트 차단: super_admin 이 아닌 관리자가 만든 계정은 그 관리자의 회사로 강제.
    // (staff 자가가입은 종전대로 클라이언트 company_id 사용 — 초대/기본회사 흐름 보존)
    let finalCompanyId = company_id || null;
    if (caller && caller.role !== 'super_admin') {
      finalCompanyId = caller.company_id || null;
    }

    try {
      // 1. 이메일 중복 체크 (employees)
      const dupRes = await fetch(
        `${supabaseUrl}/rest/v1/employees?email=eq.${encodeURIComponent(regEmail)}&select=id`,
        { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
      );
      const dupRows = await dupRes.json();
      if (Array.isArray(dupRows) && dupRows.length > 0) {
        return res.status(409).json({ error: 'Email already exists' });
      }

      // 2. auth.users 생성 (Admin API, email_confirm: true → 즉시 사용 가능)
      const authRes = await fetch(
        `${supabaseUrl}/auth/v1/admin/users`,
        {
          method: 'POST',
          headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: regEmail,
            password: regPassword,
            email_confirm: true,
            user_metadata: { name, role: finalRole },
          }),
        }
      );
      if (!authRes.ok) {
        const errText = await authRes.text();
        console.error('[register] auth create failed:', errText);
        return res.status(500).json({ error: 'Auth user creation failed' });
      }
      const authUser = await authRes.json();
      const authUserId = authUser.id || authUser.user?.id;
      if (!authUserId) return res.status(500).json({ error: 'auth.users id missing' });

      // 3. employees 레코드 생성
      const empRes = await fetch(
        `${supabaseUrl}/rest/v1/employees`,
        {
          method: 'POST',
          headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
            'Content-Type': 'application/json',
            Prefer: 'return=representation',
          },
          body: JSON.stringify({
            name,
            email: regEmail,
            branch: branch || '',
            team: team || '',
            role: finalRole,
            auth_user_id: authUserId,
            company_id: finalCompanyId,
          }),
        }
      );
      if (!empRes.ok) {
        const errText = await empRes.text();
        console.error('[register] employees insert failed:', errText);
        // 롤백: auth.users 삭제
        await fetch(`${supabaseUrl}/auth/v1/admin/users/${authUserId}`, {
          method: 'DELETE',
          headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
        }).catch(() => {});
        return res.status(500).json({ error: 'Profile creation failed' });
      }
      const emp = (await empRes.json())[0];

      return res.status(200).json({
        registered: true,
        authUserId,
        employeeId: emp?.id,
      });
    } catch (e) {
      console.error('[register] Error:', e);
      return res.status(500).json({ error: e.message });
    }
  }

  // migrate-to-supabase: legacy_password_hash 검증 성공 시 Supabase Auth 비밀번호 재설정
  // 클라이언트는 이후 supabase.auth.signInWithPassword()로 정상 로그인 가능
  if (action === 'migrate-to-supabase') {
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password required' });
    }

    const supabaseUrl = process.env.SUPABASE_URL || 'https://xbcdzkrhtjgxdwfqqugc.supabase.co';
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceKey) {
      return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' });
    }

    try {
      // 1. employees에서 legacy_password_hash + auth_user_id 조회
      const lookupRes = await fetch(
        `${supabaseUrl}/rest/v1/employees?email=eq.${encodeURIComponent(email)}&select=id,legacy_password_hash,auth_user_id`,
        { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
      );
      if (!lookupRes.ok) {
        return res.status(500).json({ error: `Lookup failed: ${lookupRes.status}` });
      }
      const rows = await lookupRes.json();
      if (!rows || rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const emp = rows[0];
      if (!emp.legacy_password_hash) {
        return res.status(400).json({ error: 'No legacy password to migrate' });
      }
      if (!emp.auth_user_id) {
        return res.status(500).json({ error: 'auth_user_id not set — contact admin' });
      }

      // 2. legacy_password_hash 검증
      const match = verifyPassword(password, emp.legacy_password_hash);
      if (!match) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // 3. Supabase Auth Admin API로 비밀번호 재설정
      const updateRes = await fetch(
        `${supabaseUrl}/auth/v1/admin/users/${emp.auth_user_id}`,
        {
          method: 'PUT',
          headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ password, email_confirm: true }),
        }
      );
      if (!updateRes.ok) {
        const errText = await updateRes.text();
        console.error('[migrate-to-supabase] Auth update failed:', errText);
        return res.status(500).json({ error: 'Auth password update failed' });
      }

      return res.status(200).json({
        migrated: true,
        authUserId: emp.auth_user_id,
      });
    } catch (e) {
      console.error('[migrate-to-supabase] Error:', e);
      return res.status(500).json({ error: e.message });
    }
  }

  // update-password: 로그인된 사용자의 비밀번호 변경 (change-password.html 용)
  // 클라이언트에서 access token을 Authorization 헤더로 전달
  if (action === 'update-password') {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'newPassword too short (min 8)' });
    }
    const authHeader = req.headers.authorization || '';
    const accessToken = authHeader.replace(/^Bearer\s+/i, '');
    if (!accessToken) return res.status(401).json({ error: 'access token required' });

    const supabaseUrl = process.env.SUPABASE_URL || 'https://xbcdzkrhtjgxdwfqqugc.supabase.co';
    const anonKey = process.env.SUPABASE_ANON_KEY || 'sb_publishable__vL6h25o1qwCs9UWBi54Sw_Zsq4uFw8';

    try {
      const upRes = await fetch(
        `${supabaseUrl}/auth/v1/user`,
        {
          method: 'PUT',
          headers: {
            apikey: anonKey,
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ password: newPassword }),
        }
      );
      if (!upRes.ok) {
        const errText = await upRes.text();
        return res.status(upRes.status).json({ error: errText || 'update failed' });
      }
      return res.status(200).json({ updated: true });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(400).json({ error: 'Invalid action. Use: hash, verify, migrate, register, migrate-to-supabase, update-password' });
}

module.exports = handler;
module.exports.authorizeRoleAssignment = authorizeRoleAssignment;
