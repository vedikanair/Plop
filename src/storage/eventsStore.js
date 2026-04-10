import { reqToPromise, tx } from './idb.js';

function safeUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `sess_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

/**
 * Session records are small, queryable summaries. Raw events are stored separately.
 */
export async function createSession({ sessionId = safeUUID(), startedAt, durationSec, targetLetter }) {
  const record = {
    sessionId,
    startedAt,
    durationSec,
    targetLetter,
    endedAt: null,
    score: null,
    analysis: null,
    eventCount: 0,
  };

  await tx('sessions', 'readwrite', async (sessions) => {
    sessions.put(record);
  });

  return sessionId;
}

export async function finalizeSession({ sessionId, endedAt, score, analysis, eventCount }) {
  await tx('sessions', 'readwrite', async (sessions) => {
    const existing = await reqToPromise(sessions.get(sessionId));
    if (!existing) return;
    sessions.put({
      ...existing,
      endedAt,
      score,
      analysis,
      eventCount: typeof eventCount === 'number' ? eventCount : existing.eventCount,
    });
  });
}

export async function addInteractionEvents(events) {
  if (!events || events.length === 0) return;
  await tx('events', 'readwrite', async (store) => {
    for (const ev of events) store.add(ev);
  });
}

export async function getRecentSessions(limit = 50) {
  return tx('sessions', 'readonly', async (sessions) => {
    const out = [];
    const idx = sessions.index('by_startedAt');
    // Walk newest-first
    const cursorReq = idx.openCursor(null, 'prev');
    await new Promise((resolve, reject) => {
      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result;
        if (!cursor || out.length >= limit) return resolve();
        out.push(cursor.value);
        cursor.continue();
      };
      cursorReq.onerror = () => reject(cursorReq.error);
    });
    return out;
  });
}

export async function getAllEvents({ sinceTs = 0 } = {}) {
  return tx('events', 'readonly', async (events) => {
    const out = [];
    const idx = events.index('by_ts');
    const range = IDBKeyRange.lowerBound(sinceTs);
    const cursorReq = idx.openCursor(range, 'next');
    await new Promise((resolve, reject) => {
      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result;
        if (!cursor) return resolve();
        out.push(cursor.value);
        cursor.continue();
      };
      cursorReq.onerror = () => reject(cursorReq.error);
    });
    return out;
  });
}

export async function getEventsForSession(sessionId) {
  return tx('events', 'readonly', async (events) => {
    const out = [];
    const idx = events.index('by_sessionId');
    const range = IDBKeyRange.only(sessionId);
    const cursorReq = idx.openCursor(range, 'next');
    await new Promise((resolve, reject) => {
      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result;
        if (!cursor) return resolve();
        out.push(cursor.value);
        cursor.continue();
      };
      cursorReq.onerror = () => reject(cursorReq.error);
    });
    return out;
  });
}

