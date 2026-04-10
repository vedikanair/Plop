import React from 'react';
import './DashboardScreen.css';
import { ALL_LETTERS, LETTER_BG_COLORS, LETTER_COLORS } from '../utils/letters.js';
import { getAllEvents, getRecentSessions } from '../storage/eventsStore.js';
import { computeAnalytics } from '../analytics/computeAnalytics.js';
import { loadStreak } from '../utils/storage.js';

function formatPct(x) {
  if (typeof x !== 'number') return '—';
  return `${Math.round(x * 100)}%`;
}

export default function DashboardScreen({ onBack }) {
  const [loading, setLoading] = React.useState(true);
  const [analytics, setAnalytics] = React.useState(null);
  const [streak, setStreak] = React.useState(() => loadStreak());
  const [recentSessions, setRecentSessions] = React.useState([]);

  React.useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      try {
        const [events, sessions] = await Promise.all([getAllEvents(), getRecentSessions(20)]);
        const a = computeAnalytics({ letters: ALL_LETTERS, events });
        if (cancelled) return;
        setAnalytics(a);
        setRecentSessions(sessions);
        setStreak(loadStreak());
      } catch {
        if (cancelled) return;
        setAnalytics(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  const topPair = analytics?.mostConfusedPairs?.[0] ?? null;
  const insight = topPair
    ? `You often confuse ${topPair.a} and ${topPair.b}.`
    : 'Great work — keep playing to learn even more!';

  const slowest = analytics
    ? [...ALL_LETTERS]
        .map((l) => ({ l, ms: analytics.reaction?.[l]?.medianMs ?? 0, n: analytics.reaction?.[l]?.n ?? 0 }))
        .filter((x) => x.n > 0)
        .sort((a, b) => b.ms - a.ms)
        .slice(0, 3)
    : [];

  return (
    <div className="dash">
      <div className="dash-top">
        <button className="btn-secondary" type="button" onClick={() => onBack?.()}>
          Back
        </button>
        <h1 className="dash-title">Dashboard</h1>
        <div className="dash-top-spacer" aria-hidden="true" />
      </div>

      <div className="dash-card">
        <div className="dash-card-title">Today’s insight</div>
        <div className="dash-insight">{insight}</div>
      </div>

      <div className="dash-grid">
        <div className="dash-card">
          <div className="dash-card-title">Streak</div>
          <div className="dash-big">{streak.streakDays || 0} days</div>
          <div className="dash-muted">
            Last played: {streak.lastPlayedYmd ? streak.lastPlayedYmd : '—'}
          </div>
        </div>

        <div className="dash-card">
          <div className="dash-card-title">Recent sessions</div>
          <div className="dash-muted">{recentSessions.length} saved</div>
          <ul className="dash-list">
            {recentSessions.slice(0, 5).map((s) => (
              <li key={s.sessionId}>
                <span className="dash-pill">{s.durationSec || '—'}s</span>{' '}
                <span className="dash-pill">score {s.score ?? '—'}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="dash-card">
        <div className="dash-card-title">Accuracy per letter</div>
        {loading ? (
          <div className="dash-muted">Loading…</div>
        ) : (
          <div className="dash-letters">
            {ALL_LETTERS.map((l) => (
              <div
                key={l}
                className="dash-letter"
                style={{ backgroundColor: LETTER_BG_COLORS[l] }}
              >
                <div className="dash-letter-char" style={{ color: LETTER_COLORS[l] }}>
                  {l}
                </div>
                <div className="dash-letter-pct">{formatPct(analytics?.accuracy?.[l] ?? 1)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="dash-grid">
        <div className="dash-card">
          <div className="dash-card-title">Most confused pairs</div>
          {loading ? (
            <div className="dash-muted">Loading…</div>
          ) : analytics?.mostConfusedPairs?.length ? (
            <ul className="dash-list">
              {analytics.mostConfusedPairs.slice(0, 5).map((p) => (
                <li key={`${p.a}_${p.b}`}>
                  <strong>
                    {p.a} ↔ {p.b}
                  </strong>{' '}
                  <span className="dash-muted">({p.count})</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="dash-muted">No confusions yet — awesome!</div>
          )}
        </div>

        <div className="dash-card">
          <div className="dash-card-title">Strong vs weak letters</div>
          {loading ? (
            <div className="dash-muted">Loading…</div>
          ) : (
            <>
              <div className="dash-row">
                <div className="dash-subtitle">Strong</div>
                <div className="dash-chips">
                  {analytics?.strongLetters?.map((l) => (
                    <span key={`s_${l}`} className="dash-chip">
                      {l}
                    </span>
                  ))}
                </div>
              </div>
              <div className="dash-row">
                <div className="dash-subtitle">Needs practice</div>
                <div className="dash-chips">
                  {analytics?.weakLetters?.map((l) => (
                    <span key={`w_${l}`} className="dash-chip dash-chip-weak">
                      {l}
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="dash-card">
        <div className="dash-card-title">Reaction time insights</div>
        {loading ? (
          <div className="dash-muted">Loading…</div>
        ) : slowest.length ? (
          <ul className="dash-list">
            {slowest.map((x) => (
              <li key={`rt_${x.l}`}>
                <strong>{x.l}</strong>: {x.ms}ms median
              </li>
            ))}
          </ul>
        ) : (
          <div className="dash-muted">Play a bit more to see reaction times.</div>
        )}
      </div>
    </div>
  );
}

