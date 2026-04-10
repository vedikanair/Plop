import React from 'react';
import Bubble from './Bubble.jsx';
import HUD from './HUD.jsx';
import LevelUpBanner from './LevelUpBanner.jsx';
import './GameScreen.css';

function GameScreen({
  targetLetter,
  score,
  scoreBounce,
  activeBubbles,
  levelUpText,
  showLevelUp,
  level,
  lettersSpawned,
  lettersThisLevel,
  isBetweenLevels,
  onNextLevel,
  onBubblePop,
  onBubbleMissed,
  onRepeat,
}) {
  return (
    <div className="game-shell">
      <div className="game-bento">
        <div className="game-card game-card-hud">
          <HUD
            targetLetter={targetLetter}
            score={score}
            scoreBounce={scoreBounce}
            level={level}
            lettersSpawned={lettersSpawned}
            lettersThisLevel={lettersThisLevel}
            onRepeat={onRepeat}
          />
        </div>

        <div className="game-card game-card-controls">
          <div className="controls-row">
            <div className="controls-label">Target</div>
            <div className="controls-target">{targetLetter}</div>
          </div>
          <button className="btn-secondary" type="button" onClick={onRepeat}>
            Repeat
          </button>
        </div>

        <div className="game-card game-card-area" aria-label="Game area with floating bubbles">
          <LevelUpBanner text={levelUpText} visible={showLevelUp} />

          <div className="game-area">
            {activeBubbles.map((b) => (
              <Bubble
                key={b.id}
                id={b.id}
                letter={b.letter}
                colors={b.colors}
                left={b.left}
                floatDuration={b.floatDuration}
                isPopping={b.isPopping}
                isWrong={b.isWrong}
                onPop={onBubblePop}
                onMissed={onBubbleMissed}
              />
            ))}
          </div>

          {isBetweenLevels && (
            <div className="nextlevel-overlay" role="dialog" aria-label="Next level">
              <div className="nextlevel-card">
                <div className="nextlevel-title">Next Level</div>
                <div className="nextlevel-sub">
                  Level {level + 1} will be faster.
                </div>
                <button className="btn-primary" type="button" onClick={onNextLevel}>
                  Continue
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default GameScreen;
