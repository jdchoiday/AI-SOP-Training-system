-- ============================================
-- Migration v10: Coin Store System (Phase 2)
-- ============================================
-- Virtual coin balance strategy:
--   balance = floor(total_xp / 10) - SUM(store_redemptions.cost_coins WHERE status != 'cancelled')
-- No coin_transactions table in this migration — added later if manual bonuses needed.

-- ------------------------------------------------------------
-- 1. store_items: 관리자가 등록한 교환 가능 리워드
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS store_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '🎁',
  description TEXT DEFAULT '',
  price_coins INTEGER NOT NULL CHECK (price_coins >= 0),
  category TEXT DEFAULT 'general',
  stock INTEGER,                       -- NULL = 무제한
  active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_store_items_active ON store_items(active, display_order);

ALTER TABLE store_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for anon" ON store_items FOR ALL USING (true) WITH CHECK (true);

-- ------------------------------------------------------------
-- 2. store_redemptions: 교환 신청/승인 이력
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS store_redemptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id TEXT NOT NULL,
  item_id UUID REFERENCES store_items(id) ON DELETE SET NULL,
  item_name_snapshot TEXT NOT NULL,    -- 아이템 삭제/변경돼도 이력 유지
  item_icon_snapshot TEXT DEFAULT '🎁',
  cost_coins INTEGER NOT NULL CHECK (cost_coins >= 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','delivered','cancelled')),
  requested_at TIMESTAMPTZ DEFAULT now(),
  approved_at TIMESTAMPTZ,
  approver_id TEXT,
  note TEXT DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_redemptions_emp ON store_redemptions(employee_id, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_redemptions_status ON store_redemptions(status, requested_at DESC);

ALTER TABLE store_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for anon" ON store_redemptions FOR ALL USING (true) WITH CHECK (true);

-- ------------------------------------------------------------
-- 3. 시드 데이터 (기존 store.html preview 그대로)
-- ------------------------------------------------------------
INSERT INTO store_items (name, icon, price_coins, category, display_order, description) VALUES
  ('커피 쿠폰', '☕', 500, 'food', 1, '매장 음료 1잔 교환권'),
  ('식사 지원', '🍕', 2000, 'food', 2, '점심/저녁 식사 지원 (최대 2만원)'),
  ('영화 티켓', '🎬', 3500, 'leisure', 3, '영화 티켓 1매'),
  ('연차 1일', '🏖️', 10000, 'leave', 4, '유급 연차 1일 추가')
ON CONFLICT DO NOTHING;
