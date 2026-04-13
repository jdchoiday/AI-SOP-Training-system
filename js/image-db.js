// ============================================
// IndexedDB 이미지 저장소 (공유 모듈)
// ============================================
// localStorage 5MB 제한 극복 — IndexedDB는 50MB~무제한
// admin과 직원 페이지 모두에서 사용

const ImageDB = {
  _db: null,
  _DB_NAME: 'sop_images_db',
  _STORE_NAME: 'scene_images',

  async init() {
    if (this._db) return this._db;
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this._DB_NAME, 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(this._STORE_NAME)) {
          db.createObjectStore(this._STORE_NAME);
        }
      };
      req.onsuccess = (e) => { this._db = e.target.result; resolve(this._db); };
      req.onerror = (e) => { console.error('[ImageDB] init failed:', e); reject(e); };
    });
  },

  async save(key, imageUrl) {
    if (!imageUrl || !imageUrl.startsWith('data:')) return;
    try {
      const db = await this.init();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(this._STORE_NAME, 'readwrite');
        tx.objectStore(this._STORE_NAME).put(imageUrl, key);
        tx.oncomplete = () => resolve();
        tx.onerror = (e) => reject(e);
      });
    } catch(e) {
      console.warn(`[ImageDB] save failed (${key}):`, e.message);
    }
  },

  async get(key) {
    try {
      const db = await this.init();
      return new Promise((resolve) => {
        const tx = db.transaction(this._STORE_NAME, 'readonly');
        const req = tx.objectStore(this._STORE_NAME).get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      });
    } catch(e) { return null; }
  },

  async deleteByPrefix(prefix) {
    try {
      const db = await this.init();
      return new Promise((resolve) => {
        const tx = db.transaction(this._STORE_NAME, 'readwrite');
        const store = tx.objectStore(this._STORE_NAME);
        const req = store.openCursor();
        req.onsuccess = (e) => {
          const cursor = e.target.result;
          if (cursor) {
            if (typeof cursor.key === 'string' && cursor.key.startsWith(prefix)) {
              cursor.delete();
            }
            cursor.continue();
          }
        };
        tx.oncomplete = () => resolve();
      });
    } catch(e) { console.warn('[ImageDB] delete failed:', e.message); }
  },

  // 모든 이미지 키 목록 반환
  async getAllKeys() {
    try {
      const db = await this.init();
      return new Promise((resolve) => {
        const tx = db.transaction(this._STORE_NAME, 'readonly');
        const req = tx.objectStore(this._STORE_NAME).getAllKeys();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });
    } catch(e) { return []; }
  }
};

// localStorage → IndexedDB 자동 마이그레이션
(async function _migrateLocalStorageImages() {
  try {
    await ImageDB.init();
    const keysToMigrate = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('sop_img_')) keysToMigrate.push(key);
    }
    if (keysToMigrate.length > 0) {
      console.log(`[ImageDB] Migrating ${keysToMigrate.length} images from localStorage → IndexedDB`);
      for (const key of keysToMigrate) {
        const val = localStorage.getItem(key);
        if (val && val.startsWith('data:')) {
          await ImageDB.save(key, val);
        }
        localStorage.removeItem(key);
      }
      console.log('[ImageDB] Migration complete');
    }
  } catch(e) { console.warn('[ImageDB] Migration failed:', e.message); }
})();
