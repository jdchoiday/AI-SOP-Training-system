// ============================================
// IndexedDB 이미지 저장소 (공유 모듈)
// ============================================
// localStorage 5MB 제한 극복 — IndexedDB는 50MB~무제한
// admin과 직원 페이지 모두에서 사용

const ImageDB = {
  _db: null,
  _DB_NAME: 'sop_images_db',
  _STORE_NAME: 'scene_images',
  _VERSION: 3,
  _initPromise: null,

  // DB 열기 (한 번만 실행, 이후 캐시)
  init() {
    if (this._initPromise) return this._initPromise;
    this._initPromise = this._openDB().catch(async (err) => {
      // 실패 시 DB 삭제 후 재시도
      console.warn('[ImageDB] First open failed, resetting DB...', err.message || err);
      this._db = null;
      this._initPromise = null;
      await this._deleteDB();
      return this._openDB();
    });
    return this._initPromise;
  },

  _openDB() {
    return new Promise((resolve, reject) => {
      try {
        const req = indexedDB.open(this._DB_NAME, this._VERSION);
        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          // 기존 store 삭제 후 재생성 (깨끗하게)
          if (db.objectStoreNames.contains(this._STORE_NAME)) {
            db.deleteObjectStore(this._STORE_NAME);
          }
          db.createObjectStore(this._STORE_NAME);
        };
        req.onsuccess = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains(this._STORE_NAME)) {
            db.close();
            reject(new Error('Store not created'));
            return;
          }
          this._db = db;
          console.log('[ImageDB] ✅ Ready');
          resolve(db);
        };
        req.onerror = (e) => reject(e.target.error || new Error('open failed'));
        req.onblocked = () => reject(new Error('DB blocked by other tab'));
      } catch(e) { reject(e); }
    });
  },

  _deleteDB() {
    return new Promise((resolve) => {
      try {
        if (this._db) { this._db.close(); this._db = null; }
        const req = indexedDB.deleteDatabase(this._DB_NAME);
        req.onsuccess = () => { console.log('[ImageDB] DB deleted for reset'); resolve(); };
        req.onerror = () => resolve(); // 실패해도 계속 진행
        req.onblocked = () => resolve();
      } catch(e) { resolve(); }
    });
  },

  // 자동 복구 래퍼: NotFoundError 발생 시 DB 리셋 후 재시도
  async _withRetry(fn) {
    try {
      const db = await this.init();
      return await fn(db);
    } catch(e) {
      if (e && (e.name === 'NotFoundError' || (e.message && e.message.includes('object store')))) {
        console.warn('[ImageDB] Store error, resetting...');
        this._db = null;
        this._initPromise = null;
        await this._deleteDB();
        try {
          const db = await this._openDB();
          this._initPromise = Promise.resolve(db);
          return await fn(db);
        } catch(e2) {
          console.error('[ImageDB] Retry failed:', e2.message);
          return null;
        }
      }
      throw e;
    }
  },

  async save(key, imageUrl) {
    if (!imageUrl || !imageUrl.startsWith('data:')) return;
    try {
      await this._withRetry((db) => new Promise((resolve, reject) => {
        const tx = db.transaction(this._STORE_NAME, 'readwrite');
        tx.objectStore(this._STORE_NAME).put(imageUrl, key);
        tx.oncomplete = () => resolve();
        tx.onerror = (e) => reject(e.target.error || new Error('save tx error'));
      }));
    } catch(e) {
      console.warn(`[ImageDB] save failed (${key}):`, e.message || e);
    }
  },

  async get(key) {
    try {
      return await this._withRetry((db) => new Promise((resolve) => {
        const tx = db.transaction(this._STORE_NAME, 'readonly');
        const req = tx.objectStore(this._STORE_NAME).get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      }));
    } catch(e) { return null; }
  },

  async deleteByPrefix(prefix) {
    try {
      await this._withRetry((db) => new Promise((resolve) => {
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
      }));
    } catch(e) { console.warn('[ImageDB] delete failed:', e.message); }
  },

  async getAllKeys() {
    try {
      return await this._withRetry((db) => new Promise((resolve) => {
        const tx = db.transaction(this._STORE_NAME, 'readonly');
        const req = tx.objectStore(this._STORE_NAME).getAllKeys();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      }));
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
      console.log(`[ImageDB] Migrating ${keysToMigrate.length} images: localStorage → IndexedDB`);
      for (const key of keysToMigrate) {
        const val = localStorage.getItem(key);
        if (val && val.startsWith('data:')) {
          await ImageDB.save(key, val);
        }
        localStorage.removeItem(key);
      }
      console.log('[ImageDB] ✅ Migration complete');
    }
  } catch(e) { console.warn('[ImageDB] Migration skipped:', e.message); }
})();
