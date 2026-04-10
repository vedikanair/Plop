import React from 'react';
import Bubble from './Bubble.jsx';
import HUD from './HUD.jsx';
import LevelUpBanner from './LevelUpBanner.jsx';
import './GameScreen.css';

function GameScreen({
  timeLeft,
  targetLetter,
  score,
  scoreBounce,
  activeBubbles,
  levelUpText,
  showLevelUp,
  onBubblePop,
  onBubbleMissed,
  onRepeat,
}) {
  return (
    <>
      <HUD
        timeLeft={timeLeft}
        targetLetter={targetLetter}
        score={score}
        scoreBounce={scoreBounce}
        onRepeat={onRepeat}
      />

      <LevelUpBanner text={levelUpText} visible={showLevelUp} />

      <div className="game-area" aria-label="Game area with floating bubbles">
        {activeBubbles.map((b) => (
          <Bubble
            key={b.id}
            id={b.id}
            letter={b.letter}
            left={b.left}
            floatDuration={b.floatDuration}
            isPopping={b.isPopping}
            onPop={onBubblePop}
            onMissed={onBubbleMissed}
          />
        ))}
      </div>
    </>
  );
}

export default GameScreen;
