import { useRef, useCallback } from 'react';
import { ALL_LETTERS } from '../utils/letters.js';
import { saveMLSession } from '../utils/storage.js';
import { computeAnalytics } from '../analytics/computeAnalytics.js';
import { addInteractionEvents, createSession, finalizeSession } from '../storage/eventsStore.js';

function safeUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `sess_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function tipFromConfusions({ targetLetter, confusedWith }) {
  if (!targetLetter) return 'Great job. Keep playing to get even better!';
  if (!confusedWith || confusedWith.length === 0) return `Great job with "${targetLetter}"!`;
  const top = confusedWith.slice(0, 2).join(' and ');
  return `You often confuse "${targetLetter}" with ${top}. Keep practising — you're improving!`;
}

function normalizeForStorage(ev, sessionId) {
  const ts = ev.timestamp ?? ev.ts ?? Date.now();
  const targetLetter = ev.targetLetter ?? null;
  const clickedLetter = ev.clickedLetter ?? ev.tappedLetter ?? null;

  const kind = ev.kind ?? (ev.type === 'miss' ? 'miss' : 'pop');
  const correct =
    typeof ev.correct === 'boolean'
      ? ev.correct
      : ev.type === 'correct_pop'
        ? true
        : ev.type === 'wrong_pop'
          ? false
          : null;

  return {
    sessionId,
    ts,
    kind,
    targetLetter,
    clickedLetter,
    correct,
    reactionMs: typeof ev.reactionMs === 'number' ? ev.reactionMs : null,
    // Optional context (kept if present)
    timeRemaining: typeof ev.timeRemaining === 'number' ? ev.timeRemaining : null,
    difficultyLevel: typeof ev.difficultyLevel === 'number' ? ev.difficultyLevel : null,
    sessionMs: typeof ev.sessionMs === 'number' ? ev.sessionMs : null,
  };
}

export function useMLLogger() {
  const eventsRef = useRef([]);
  const sessionIdRef = useRef(null);
  const sessionMetaRef = useRef(null);

  const resetLog = useCallback(() => {
    eventsRef.current = [];
    sessionIdRef.current = null;
  }, []);

  const beginSession = useCallback(({ startedAt, durationSec, targetLetter }) => {
    const sessionId = safeUUID();
    eventsRef.current = [];
    sessionIdRef.current = sessionId;
    sessionMetaRef.current = { startedAt, durationSec, targetLetter };

    // Fire-and-forget: keep gameplay synchronous.
    void createSession({
      sessionId,
      startedAt,
      durationSec,
      targetLetter,
    }).catch(() => {});

    return sessionId;
  }, []);

  const logMLEvent = useCallback((event) => {
    const sessionId = sessionIdRef.current ?? 'unknown';
    eventsRef.current.push(normalizeForStorage(event, sessionId));
  }, []);

  const analyzeSession = useCallback((targetLetter) => {
    const all = eventsRef.current;
    const filtered = targetLetter ? all.filter((e) => e?.targetLetter === targetLetter) : all;
    const analysis = computeAnalytics({ letters: ALL_LETTERS, events: filtered });

    const row = analysis.confusionMatrix?.[targetLetter] ?? null;
    const confusedWith = row
      ? Object.entries(row)
          .filter(([l, count]) => l !== targetLetter && (count || 0) > 0)
          .sort((a, b) => (b[1] || 0) - (a[1] || 0))
          .map(([l]) => l)
      : [];

    const tip = tipFromConfusions({ targetLetter, confusedWith });
    const targetAccuracy =
      typeof targetLetter === 'string' ? analysis.accuracy?.[targetLetter] ?? 1 : null;

    return {
      targetLetter,
      targetAccuracy,
      confusedWith: confusedWith.slice(0, 5),
      confusionCounts: row,
      tip,
      // Keep full analysis so we can persist it and reuse it later if needed.
      full: analysis,
    };
  }, []);

  const endSession = useCallback(async ({ endedAt, score, analysis }) => {
    const sessionId = sessionIdRef.current;
    if (!sessionId) return;

    const events = eventsRef.current;
    try {
      await addInteractionEvents(events);

      await finalizeSession({
        sessionId,
        endedAt,
        score,
        analysis,
        eventCount: events.length,
      });
    } catch {
      // IndexedDB might be unavailable; fail silently.
    }

    // Back-compat history (small; last 50)
    const meta = sessionMetaRef.current;
    saveMLSession({
      timestamp: endedAt,
      sessionId,
      targetLetter: meta?.targetLetter ?? null,
      score,
      events,
      analysis,
    });
  }, []);

  return { beginSession, logMLEvent, analyzeSession, endSession, resetLog };
}
