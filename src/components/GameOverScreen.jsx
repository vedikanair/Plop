import React from 'react';
import { LETTERS, LETTER_COLORS, LETTER_BG_COLORS } from '../utils/letters.js';
import './GameOverScreen.css';

function GameOverScreen({
  score,
  highScore,
  isNewHighScore,
  targetLetter,
  analysis,
  onPlayAgain,
}) {
  return (
    <div className="gameover-screen">
      <h1 className="gameover-heading">Time's up! ⏱</h1>

      <p className="gameover-score-line">
        You popped{' '}
        <strong>{score}</strong>{' '}
        <span
          className="target-letter-display"
          style={{
            backgroundColor: LETTER_BG_COLORS[targetLetter],
            color: LETTER_COLORS[targetLetter],
          }}
        >
          {targetLetter}
        </span>
        's!
      </p>

      {isNewHighScore ? (
        <div className="gameover-highscore-banner">🎉 NEW HIGH SCORE!</div>
      ) : (
        <p className="gameover-best">Best: {highScore}</p>
      )}

      {analysis && (
        <div className="ml-summary" id="ml-summary">
          <p className="ml-tip">{analysis.tip}</p>
          <div className="ml-accuracy-row">
            {LETTERS.map((l) => (
              <div
                key={l}
                className="ml-accuracy-item"
                style={{ backgroundColor: LETTER_BG_COLORS[l] }}
              >
                <span
                  className="ml-accuracy-letter"
                  style={{ color: LETTER_COLORS[l] }}
                >
                  {l}
                </span>
                <span className="ml-accuracy-pct">
                  {Math.round((analysis.accuracy[l] ?? 1) * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        id="play-again-button"
        className="btn-primary gameover-play-btn"
        onClick={onPlayAgain}
        type="button"
      >
        Play Again!
      </button>
    </div>
  );
}

export default GameOverScreen;
