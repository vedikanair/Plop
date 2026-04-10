import React from 'react';
import './GameOverScreen.css';

function GameOverScreen({
  score,
  highScore,
  isNewHighScore,
  targetLetter,
  analysis,
  onPlayAgain,
  onOpenDashboard,
}) {
  return (
    <div className="gameover-screen">
      <h1 className="gameover-heading">Time's up!</h1>

      <p className="gameover-score-line">
        You popped{' '}
        <strong>{score}</strong>{' '}
        <span
          className="target-letter-display"
        >
          {targetLetter}
        </span>
        's!
      </p>

      {isNewHighScore ? (
        <div className="gameover-highscore-banner">NEW HIGH SCORE!</div>
      ) : (
        <p className="gameover-best">Best: {highScore}</p>
      )}

      {analysis && (
        <div className="ml-summary" id="ml-summary">
          <p className="ml-tip">{analysis.tip}</p>
          <div className="ml-target-accuracy">
            <div className="ml-target-accuracy-letter">{targetLetter}</div>
            <div className="ml-target-accuracy-pct">
              {Math.round(((analysis.targetAccuracy ?? 1) * 100))}% accuracy
            </div>
          </div>
          <div className="ml-confused-with">
            <strong>Most confused with:</strong>{' '}
            {analysis.confusedWith?.length ? analysis.confusedWith.slice(0, 3).join(', ') : 'None yet'}
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

      <button className="btn-secondary" onClick={() => onOpenDashboard?.()} type="button">
        Dashboard
      </button>
    </div>
  );
}

export default GameOverScreen;
