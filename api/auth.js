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

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

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
  // 클라이언트가 email+password+profile 보내면 서버가 admin API로 처리
  if (action === 'register') {
    const { email: regEmail, password: regPassword, name, branch, team, role } = req.body;
    if (!regEmail || !regPassword || !name) {
      return res.status(400).json({ error: 'email, password, name required' });
    }
    if (regPassword.length < 4) {
      return res.status(400).json({ error: 'password too short' });
    }

    const supabaseUrl = process.env.SUPABASE_URL || 'https://xbcdzkrhtjgxdwfqqugc.supabase.co';
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' });

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
            user_metadata: { name, role: role || 'staff' },
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
            role: role || 'staff',
            auth_user_id: authUserId,
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
    if (!newPassword || newPassword.length < 4) {
      return res.status(400).json({ error: 'newPassword too short' });
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
};
