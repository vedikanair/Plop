import React from 'react';
import './HUD.css';

function HUD({
  timeLeft,
  totalDurationSec,
  targetLetter,
  score,
  scoreBounce,
  level,
  lettersSpawned,
  lettersThisLevel,
  onRepeat,
}) {
  const denom =
    typeof totalDurationSec === 'number' && totalDurationSec > 0 ? totalDurationSec : 1;
  const progress = Math.max(0, Math.min(1, (timeLeft || 0) / denom));
  const remaining = Math.max(0, timeLeft || 0);

  return (
    <div className="hud">
      <div className="hud-progress" aria-hidden="true">
        <div
          className="hud-progress-bar"
          style={{ transform: `scaleX(${progress})` }}
        />
      </div>

      {/* Timer */}
      <div className="hud-timer">
        <span className="hud-label">Level</span>
        <span className="hud-value" aria-live="polite">
          {level}
        </span>
        <span className="hud-label" style={{ marginTop: 8 }}>Time</span>
        <span className="hud-value">{remaining}</span>
      </div>

      {/* Instruction */}
      <div className="hud-instruction" role="status" aria-live="polite">
        <span className="hud-instruction-text">
          Pop all the{' '}
          <span
            className="hud-target-letter"
          >
            {targetLetter}
          </span>
          's!
        </span>
        <button
          className="hud-repeat-btn"
          onClick={onRepeat}
          aria-label="Repeat instruction"
          type="button"
        >
          Repeat
        </button>
      </div>

      {/* Score */}
      <div className="hud-score" aria-live="polite">
        <span className="hud-label">Bubbles</span>
        <span className="hud-value">{lettersSpawned || 0}</span>
        <span className="hud-label" style={{ marginTop: 8 }}>Score</span>
        <span className={`hud-value${scoreBounce ? ' score-bounce' : ''}`}>
          {score}
        </span>
      </div>
    </div>
  );
}

export default React.memo(HUD);
