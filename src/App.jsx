import React from 'react';
import { useGameLoop } from './hooks/useGameLoop.js';
import StartScreen from './components/StartScreen.jsx';
import GameScreen from './components/GameScreen.jsx';
import GameOverScreen from './components/GameOverScreen.jsx';
import DashboardScreen from './components/DashboardScreen.jsx';
import { loadSettings, saveSettings } from './utils/storage.js';

function App() {
  const [settings, setSettings] = React.useState(() => loadSettings());
  const [appScreen, setAppScreen] = React.useState(null); // null | 'dashboard'

  const {
    screen,
    score,
    highScore,
    timeLeft,
    totalDurationSec,
    targetLetter,
    activeBubbles,
    levelUpText,
    showLevelUp,
    scoreBounce,
    analysis,
    isNewHighScore,
    level,
    lettersSpawned,
    lettersThisLevel,
    isBetweenLevels,
    startGame,
    nextLevel,
    handleBubblePop,
    handleBubbleMissed,
    speakInstruction,
  } = useGameLoop({
    gameDurationSec: settings.durationSec,
    hapticsEnabled: settings.haptics,
    practiceMode: settings.practiceMode,
    practiceLetter: settings.practiceLetter,
  });

  if (appScreen === 'dashboard') {
    return <DashboardScreen onBack={() => setAppScreen(null)} />;
  }

  if (screen === 'start') {
    return (
      <StartScreen
        durationSec={settings.durationSec}
        hapticsEnabled={settings.haptics}
        practiceMode={settings.practiceMode}
        practiceLetter={settings.practiceLetter}
        onDurationChange={(durationSec) => {
          const next = { ...settings, durationSec };
          setSettings(next);
          saveSettings(next);
        }}
        onHapticsChange={(haptics) => {
          const next = { ...settings, haptics };
          setSettings(next);
          saveSettings(next);
        }}
        onPracticeModeChange={(practiceMode) => {
          const next = {
            ...settings,
            practiceMode,
            practiceLetter: practiceMode === 'fixed' ? settings.practiceLetter ?? 'b' : null,
          };
          setSettings(next);
          saveSettings(next);
        }}
        onPracticeLetterChange={(practiceLetter) => {
          const next = { ...settings, practiceLetter };
          setSettings(next);
          saveSettings(next);
        }}
        onStart={startGame}
        onOpenDashboard={() => setAppScreen('dashboard')}
      />
    );
  }

  if (screen === 'game') {
    return (
      <GameScreen
        timeLeft={timeLeft}
        totalDurationSec={totalDurationSec}
        targetLetter={targetLetter}
        score={score}
        scoreBounce={scoreBounce}
        activeBubbles={activeBubbles}
        levelUpText={levelUpText}
        showLevelUp={showLevelUp}
        level={level}
        lettersSpawned={lettersSpawned}
        lettersThisLevel={lettersThisLevel}
        isBetweenLevels={isBetweenLevels}
        onNextLevel={nextLevel}
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
        onOpenDashboard={() => setAppScreen('dashboard')}
      />
    );
  }

  return null;
}

export default App;
