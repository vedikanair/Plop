import React from 'react';
import { LETTER_COLORS } from '../utils/letters.js';
import './HUD.css';

function HUD({ timeLeft, targetLetter, score, scoreBounce, onRepeat }) {
  const timerDanger = timeLeft <= 10;

  return (
    <div className="hud">
      {/* Timer */}
      <div className="hud-timer">
        <span className="hud-label">Time</span>
        <span
          className={`hud-value${timerDanger ? ' timer-danger' : ''}`}
          aria-live="off"
        >
          {timeLeft}
        </span>
      </div>

      {/* Instruction */}
      <div className="hud-instruction" role="status" aria-live="polite">
        <span className="hud-instruction-text">
          Pop all the{' '}
          <span
            className="hud-target-letter"
            style={{ color: LETTER_COLORS[targetLetter] }}
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
          🔊
        </button>
      </div>

      {/* Score */}
      <div className="hud-score" aria-live="polite">
        <span className="hud-label">Score</span>
        <span className={`hud-value${scoreBounce ? ' score-bounce' : ''}`}>
          {score}
        </span>
      </div>
    </div>
  );
}

export default React.memo(HUD);
