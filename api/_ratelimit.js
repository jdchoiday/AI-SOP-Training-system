// ============================================
// 간단한 per-IP 인메모리 레이트 리미터
// ============================================
// Vercel 서버리스 환경에서 워커(콜드스타트) 마다 카운터가 리셋되지만,
// 30명 내부 베타 규모에서는 폭주 방지용으로 충분.
// 장기적으로는 Upstash Redis 또는 Vercel KV 로 교체.
//
// 사용:
//   const { rateLimit } = require('./_ratelimit');
//   const gate = rateLimit({ key: 'tts', limit: 30, windowMs: 60_000 });
//   module.exports = async (req, res) => {
//     if (!gate(req, res)) return;  // 429 응답 자동 전송
//     ...
//   };
// ============================================

function getClientIp(req) {
  const xff = req.headers?.['x-forwarded-for'];
  if (xff) return String(xff).split(',')[0].trim();
  return req.headers?.['x-real-ip'] || req.socket?.remoteAddress || 'unknown';
}

const buckets = new Map(); // `${key}:${ip}` → { count, resetAt }
const MAX_BUCKET_ENTRIES = 5000;

function rateLimit({ key = 'default', limit = 60, windowMs = 60_000 } = {}) {
  return function gate(req, res) {
    const ip = getClientIp(req);
    const bucketKey = `${key}:${ip}`;
    const now = Date.now();
    let bucket = buckets.get(bucketKey);

    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(bucketKey, bucket);
    }

    bucket.count += 1;
    const remaining = Math.max(0, limit - bucket.count);
    const retryAfterSec = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));

    // 응답 헤더에 상태 노출
    try {
      res.setHeader('X-RateLimit-Limit', String(limit));
      res.setHeader('X-RateLimit-Remaining', String(remaining));
      res.setHeader('X-RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));
    } catch (e) { /* ignore */ }

    if (bucket.count > limit) {
      try {
        res.setHeader('Retry-After', String(retryAfterSec));
        res.status(429).json({
          error: 'Too Many Requests',
          message: `요청이 너무 많습니다. ${retryAfterSec}초 후 다시 시도해주세요.`,
          retryAfterSec,
        });
      } catch (e) { /* ignore */ }
      return false;
    }

    // 맵 크기 제한 — 주기적으로 오래된 버킷 청소
    if (buckets.size > MAX_BUCKET_ENTRIES) {
      for (const [k, b] of buckets) {
        if (b.resetAt <= now) buckets.delete(k);
      }
    }

    return true;
  };
}

module.exports = { rateLimit, getClientIp };
