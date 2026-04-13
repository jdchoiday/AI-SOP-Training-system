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

  const { action, password, storedHash } = req.body;

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

  return res.status(400).json({ error: 'Invalid action. Use: hash, verify, migrate' });
};
