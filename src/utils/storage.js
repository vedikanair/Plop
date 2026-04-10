import { STORAGE_KEY, ML_LOG_KEY } from './letters.js';

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
