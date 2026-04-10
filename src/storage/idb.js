const DB_NAME = 'plop_db';
const DB_VERSION = 1;

let dbPromise = null;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;

      // Raw interaction events (append-only)
      if (!db.objectStoreNames.contains('events')) {
        const store = db.createObjectStore('events', {
          keyPath: 'id',
          autoIncrement: true,
        });
        store.createIndex('by_sessionId', 'sessionId', { unique: false });
        store.createIndex('by_ts', 'ts', { unique: false });
      }

      // Session summaries (small, queryable)
      if (!db.objectStoreNames.contains('sessions')) {
        const store = db.createObjectStore('sessions', { keyPath: 'sessionId' });
        store.createIndex('by_startedAt', 'startedAt', { unique: false });
      }

      // ML model artifacts (tfjs)
      if (!db.objectStoreNames.contains('models')) {
        db.createObjectStore('models', { keyPath: 'key' });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function getDB() {
  if (!dbPromise) dbPromise = openDB();
  return dbPromise;
}

export async function tx(storeNames, mode, fn) {
  const db = await getDB();
  const names = Array.isArray(storeNames) ? storeNames : [storeNames];
  const transaction = db.transaction(names, mode);
  const stores = names.map((n) => transaction.objectStore(n));
  const result = await fn(...stores, transaction);
  await new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
  return result;
}

export function reqToPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

