import React from 'react';
import { useGameLoop } from './hooks/useGameLoop.js';
import StartScreen from './components/StartScreen.jsx';
import GameScreen from './components/GameScreen.jsx';
import GameOverScreen from './components/GameOverScreen.jsx';

function App() {
  const {
    screen,
    score,
    highScore,
    timeLeft,
    targetLetter,
    activeBubbles,
    levelUpText,
    showLevelUp,
    scoreBounce,
    analysis,
    isNewHighScore,
    startGame,
    handleBubblePop,
    handleBubbleMissed,
    speakInstruction,
  } = useGameLoop();

  if (screen === 'start') {
    return <StartScreen onStart={startGame} />;
  }

  if (screen === 'game') {
    return (
      <GameScreen
        timeLeft={timeLeft}
        targetLetter={targetLetter}
        score={score}
        scoreBounce={scoreBounce}
        activeBubbles={activeBubbles}
        levelUpText={levelUpText}
        showLevelUp={showLevelUp}
        onBubblePop={handleBubblePop}
        onBubbleMissed={handleBubbleMissed}
        onRepeat={() => speakInstruction(targetLetter)}
      />
    );
  }

  if (screen === 'gameover') {
    return (
      <GameOverScreen
        score={score}
        highScore={highScore}
        isNewHighScore={isNewHighScore}
        targetLetter={targetLetter}
        analysis={analysis}
        onPlayAgain={startGame}
      />
    );
  }

  return null;
}

export default App;
