import { STORAGE_KEY, ML_LOG_KEY } from './letters.js';

const SETTINGS_KEY = 'plop_settings';
const STREAK_KEY = 'plop_streak';

export function loadHighScore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? parseInt(raw, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

export function saveHighScore(score) {
  try {
    localStorage.setItem(STORAGE_KEY, String(score));
  } catch {
    // localStorage unavailable (private browsing) — fail silently
  }
}

export function loadMLHistory() {
  try {
    const raw = localStorage.getItem(ML_LOG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveMLSession(sessionRecord) {
  try {
    const sessions = loadMLHistory();
    sessions.push(sessionRecord);
    // Keep only the last 50 sessions
    while (sessions.length > 50) {
      sessions.shift();
    }
    localStorage.setItem(ML_LOG_KEY, JSON.stringify(sessions));
  } catch {
    // localStorage unavailable — fail silently
  }
}

export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return {
      durationSec: typeof parsed?.durationSec === 'number' ? parsed.durationSec : 60,
      haptics: typeof parsed?.haptics === 'boolean' ? parsed.haptics : true,
      practiceMode: parsed?.practiceMode === 'fixed' ? 'fixed' : 'random',
      practiceLetter: typeof parsed?.practiceLetter === 'string' ? parsed.practiceLetter : null,
    };
  } catch {
    return { durationSec: 60, haptics: true, practiceMode: 'random', practiceLetter: null };
  }
}

export function saveSettings(next) {
  try {
    const safe = {
      durationSec: typeof next?.durationSec === 'number' ? next.durationSec : 60,
      haptics: typeof next?.haptics === 'boolean' ? next.haptics : true,
      practiceMode: next?.practiceMode === 'fixed' ? 'fixed' : 'random',
      practiceLetter: typeof next?.practiceLetter === 'string' ? next.practiceLetter : null,
    };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(safe));
  } catch {
    // localStorage unavailable — fail silently
  }
}

function toLocalYmd(d) {
  const dt = d instanceof Date ? d : new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function loadStreak() {
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return {
      lastPlayedYmd: typeof parsed?.lastPlayedYmd === 'string' ? parsed.lastPlayedYmd : null,
      streakDays: typeof parsed?.streakDays === 'number' ? parsed.streakDays : 0,
    };
  } catch {
    return { lastPlayedYmd: null, streakDays: 0 };
  }
}

export function saveStreak(next) {
  try {
    const safe = {
      lastPlayedYmd: typeof next?.lastPlayedYmd === 'string' ? next.lastPlayedYmd : null,
      streakDays: typeof next?.streakDays === 'number' ? next.streakDays : 0,
    };
    localStorage.setItem(STREAK_KEY, JSON.stringify(safe));
  } catch {
    // localStorage unavailable — fail silently
  }
}

export function updateStreakOnPlayed(now = Date.now()) {
  const cur = loadStreak();
  const today = toLocalYmd(now);
  if (!cur.lastPlayedYmd) {
    const next = { lastPlayedYmd: today, streakDays: 1 };
    saveStreak(next);
    return next;
  }
  if (cur.lastPlayedYmd === today) {
    // Already counted today; no change.
    return cur;
  }

  const last = new Date(`${cur.lastPlayedYmd}T00:00:00`);
  const t = new Date(`${today}T00:00:00`);
  const diffDays = Math.round((t - last) / (24 * 60 * 60 * 1000));

  const next = {
    lastPlayedYmd: today,
    streakDays: diffDays === 1 ? cur.streakDays + 1 : 1,
  };
  saveStreak(next);
  return next;
}
