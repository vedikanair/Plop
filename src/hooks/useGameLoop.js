import { useState, useRef, useCallback, useEffect } from 'react';
import { LETTERS, GAME_DURATION } from '../utils/letters.js';
// Legacy difficulty is still used for score-based logging fields, but level pacing is now handled here.
import { getDifficultyForScore } from '../utils/difficulty.js';
import { loadHighScore, saveHighScore, updateStreakOnPlayed } from '../utils/storage.js';
import { useAudio } from './useAudio.js';
import { useSpeech } from './useSpeech.js';
import { useMLLogger } from './useMLLogger.js';
import { computeAnalytics } from '../analytics/computeAnalytics.js';
import { getAllEvents } from '../storage/eventsStore.js';
import { pickBubbleLetter } from '../adaptation/letterWeights.js';
import {
  loadOrCreateConfusionModel,
  predictClickedDistribution,
  shouldTrainConfusionModel,
  trainConfusionModel,
} from '../ml/confusionModel.js';
import { randomBubbleColors } from '../utils/randomColors.js';
import confetti from 'canvas-confetti';

const CONFUSION_PAIRS = {
  i: 'j',
  j: 'i',
  b: 'd',
  d: 'b',
  p: 'q',
  q: 'p',
  m: 'w',
  w: 'm',
  h: 'n',
  n: 'h',
  u: 'v',
  v: 'u',
  c: 'o',
  o: 'c',
  f: 't',
  t: 'f',
};

function difficultyForLevel(level) {
  // Restore original baseline speed at level 1, then scale smoothly.
  // (Lower floatDuration => faster bubbles)
  const floatDuration = Math.max(2.5, 6 - (level - 1) * 0.35);
  const spawnInterval = Math.max(420, 1200 - (level - 1) * 90);
  const bubblesOnScreen = Math.min(12, 4 + Math.floor((level - 1) / 1));
  return { floatDuration, spawnInterval, bubblesOnScreen };
}

function fireConfetti(isHighScore) {
  if (isHighScore) {
    confetti({ angle: 60, spread: 55, particleCount: 80, origin: { x: 0, y: 0.6 } });
    setTimeout(() =>
      confetti({ angle: 120, spread: 55, particleCount: 80, origin: { x: 1, y: 0.6 } }),
      150
    );
    setTimeout(() =>
      confetti({ particleCount: 100, spread: 80, origin: { y: 0.5 } }),
      300
    );
  } else {
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 } });
  }
}

export function useGameLoop({
  gameDurationSec,
  hapticsEnabled,
  practiceMode,
  practiceLetter,
} = {}) {
  const resolvedDurationSec =
    typeof gameDurationSec === 'number' && gameDurationSec > 0 ? gameDurationSec : GAME_DURATION;
  const [screen, setScreen] = useState('start'); // 'start' | 'game' | 'gameover'
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => loadHighScore());
  const [totalDurationSec, setTotalDurationSec] = useState(resolvedDurationSec);
  const [timeLeft, setTimeLeft] = useState(resolvedDurationSec); // kept for UI/back-compat, but no longer drives rounds
  const [targetLetter, setTargetLetter] = useState('d');
  const [isRunning, setIsRunning] = useState(false);
  const [activeBubbles, setActiveBubbles] = useState([]);
  const [levelUpText, setLevelUpText] = useState('');
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [scoreBounce, setScoreBounce] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [isNewHighScore, setIsNewHighScore] = useState(false);
  const [level, setLevel] = useState(1);
  const [lettersSpawned, setLettersSpawned] = useState(0);
  const [lettersThisLevel, setLettersThisLevel] = useState(0);
  const [isBetweenLevels, setIsBetweenLevels] = useState(false);

  const timerRef = useRef(null);
  const spawnRef = useRef(null);
  const levelAtLastFlashRef = useRef(-1);
  const sessionStartTimeRef = useRef(null);
  const scoreRef = useRef(0);
  const timeLeftRef = useRef(resolvedDurationSec);
  const totalDurationRef = useRef(resolvedDurationSec);
  const difficultyRef = useRef({
    spawnInterval: 1200,
    floatDuration: 6,
    bubblesOnScreen: 4,
  });
  const levelRef = useRef(1);
  const lettersSpawnedRef = useRef(0);
  const lettersThisLevelRef = useRef(lettersThisLevel);
  const isBetweenLevelsRef = useRef(false);
  const lastSpawnedLetterRef = useRef(null);
  const targetLetterRef = useRef('d');
  const activeBubblesRef = useRef([]);
  const highScoreRef = useRef(loadHighScore());
  const isRunningRef = useRef(false);
  const adaptiveAnalyticsRef = useRef(null);
  const confusionModelRef = useRef(null);
  const hapticsEnabledRef = useRef(!!hapticsEnabled);

  useEffect(() => {
    hapticsEnabledRef.current = !!hapticsEnabled;
  }, [hapticsEnabled]);

  useEffect(() => {
    // Allow changing duration from Start screen without restarting the app.
    if (!isRunningRef.current && screen === 'start') {
      totalDurationRef.current = resolvedDurationSec;
      setTotalDurationSec(resolvedDurationSec);
      timeLeftRef.current = resolvedDurationSec;
      setTimeLeft(resolvedDurationSec);
    }
  }, [resolvedDurationSec, screen]);

  const { playCorrectSound, playWrongSound, playGameOverSound } = useAudio();
  const { speakInstruction } = useSpeech();
  const { beginSession, logMLEvent, analyzeSession, endSession, resetLog } =
    useMLLogger();

  const refreshAdaptiveAnalytics = useCallback(async () => {
    try {
      const events = await getAllEvents();
      const base = computeAnalytics({ letters: LETTERS, events });
      adaptiveAnalyticsRef.current = base;

      // ML refinement runs only off the gameplay path.
      if (!confusionModelRef.current) {
        confusionModelRef.current = await loadOrCreateConfusionModel({ letters: LETTERS });
      }

      if (shouldTrainConfusionModel({}, events)) {
        await trainConfusionModel({
          model: confusionModelRef.current,
          letters: LETTERS,
          events,
        });
      }

      const blended = {};
      for (const t of LETTERS) {
        const predRow = predictClickedDistribution({
          model: confusionModelRef.current,
          letters: LETTERS,
          targetLetter: t,
        });
        const count = LETTERS.reduce((s, c) => s + (base.confusionMatrix?.[t]?.[c] || 0), 0);
        const lambda = predRow ? Math.min(0.5, 1 / (1 + count / 20)) : 0;

        blended[t] = {};
        for (const c of LETTERS) {
          const pEmp = base.confusionProb?.[t]?.[c] ?? (c === t ? 1 : 0);
          const pMl = predRow?.[c] ?? pEmp;
          blended[t][c] = (1 - lambda) * pEmp + lambda * pMl;
        }
      }

      adaptiveAnalyticsRef.current = {
        ...base,
        confusionProb: blended,
      };
    } catch {
      adaptiveAnalyticsRef.current = null;
    }
  }, []);

  useEffect(() => {
    void refreshAdaptiveAnalytics();
  }, [refreshAdaptiveAnalytics]);

  // Sync refs with state
  useEffect(() => {
    scoreRef.current = score;
  }, [score]);
  useEffect(() => {
    timeLeftRef.current = timeLeft;
  }, [timeLeft]);
  useEffect(() => {
    activeBubblesRef.current = activeBubbles;
  }, [activeBubbles]);
  useEffect(() => {
    levelRef.current = level;
  }, [level]);
  useEffect(() => {
    lettersSpawnedRef.current = lettersSpawned;
  }, [lettersSpawned]);
  useEffect(() => {
    lettersThisLevelRef.current = lettersThisLevel;
  }, [lettersThisLevel]);
  useEffect(() => {
    isBetweenLevelsRef.current = isBetweenLevels;
  }, [isBetweenLevels]);

  const endGame = useCallback(() => {
    clearInterval(timerRef.current);
    clearInterval(spawnRef.current);
    timerRef.current = null;
    spawnRef.current = null;
    isRunningRef.current = false;
    setIsRunning(false);
    setActiveBubbles([]);
    activeBubblesRef.current = [];

    playGameOverSound();

    const result = analyzeSession(targetLetterRef.current);
    setAnalysis(result);

    const finalScore = scoreRef.current;
    void endSession({
      endedAt: Date.now(),
      score: finalScore,
      analysis: result,
    });
    updateStreakOnPlayed(Date.now());
    // Refresh adaptive stats for the next run.
    setTimeout(() => void refreshAdaptiveAnalytics(), 0);

    const prevHigh = highScoreRef.current;
    const newHigh = finalScore > prevHigh;
    setIsNewHighScore(newHigh);
    if (newHigh) {
      setHighScore(finalScore);
      highScoreRef.current = finalScore;
      saveHighScore(finalScore);
    }

    fireConfetti(newHigh);
    setScreen('gameover');
  }, [playGameOverSound, analyzeSession, endSession]);

  const stopToStart = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (spawnRef.current) clearInterval(spawnRef.current);
    timerRef.current = null;
    spawnRef.current = null;
    isRunningRef.current = false;
    setIsRunning(false);
    setIsBetweenLevels(false);
    isBetweenLevelsRef.current = false;
    setActiveBubbles([]);
    activeBubblesRef.current = [];
    setScreen('start');
  }, []);

  const endGameRef = useRef(endGame);
  useEffect(() => {
    endGameRef.current = endGame;
  }, [endGame]);

  const startSpawner = useCallback((interval) => {
    if (spawnRef.current) clearInterval(spawnRef.current);
    spawnRef.current = setInterval(() => {
      if (!isRunningRef.current) return;
      if (isBetweenLevelsRef.current) return;
      const current = activeBubblesRef.current;
      if (current.length >= difficultyRef.current.bubblesOnScreen) return;
      // Timer-driven levels: no per-level quota.

      const nextLetter =
        pickBubbleLetter({
          letters: LETTERS,
          targetLetter: targetLetterRef.current,
          analytics: adaptiveAnalyticsRef.current,
          lastSpawnedLetter: lastSpawnedLetterRef.current,
          pairMap: CONFUSION_PAIRS,
        }) ?? LETTERS[Math.floor(Math.random() * LETTERS.length)];

      const bubble = {
        id: Date.now() + Math.random(),
        letter: nextLetter,
        colors: randomBubbleColors(),
        left: 5 + Math.random() * 80,
        floatDuration: difficultyRef.current.floatDuration,
        spawnTime: Date.now(),
        isPopping: false,
        isWrong: false,
      };
      const next = [...current, bubble];
      activeBubblesRef.current = next;
      setActiveBubbles(next);

      lastSpawnedLetterRef.current = nextLetter;
    }, interval);
  }, []);

  const checkLevelUp = useCallback((newScore) => {
    const newLevel = Math.floor(newScore / 10);
    if (newLevel > levelAtLastFlashRef.current) {
      levelAtLastFlashRef.current = newLevel;
      setLevelUpText(`Level up!`);
      setShowLevelUp(true);
      setTimeout(() => setShowLevelUp(false), 1500);
    }
  }, [startSpawner]);

  const handleBubblePop = useCallback((bubbleId) => {
    const current = activeBubblesRef.current;
    const bubble = current.find((b) => b.id === bubbleId);
    if (!bubble || bubble.isPopping || bubble.isWrong) return;

    const isCorrect = bubble.letter === targetLetterRef.current;

    logMLEvent({
      type: isCorrect ? 'correct_pop' : 'wrong_pop',
      targetLetter: targetLetterRef.current,
      tappedLetter: bubble.letter,
      reactionMs: Date.now() - bubble.spawnTime,
      timeRemaining: timeLeftRef.current,
      difficultyLevel: Math.floor(scoreRef.current / 10),
      sessionMs: Date.now() - sessionStartTimeRef.current,
      timestamp: Date.now(),
    });

    if (isCorrect) {
      // Mark as popping
      const updated = current.map((b) =>
        b.id === bubbleId ? { ...b, isPopping: true } : b
      );
      activeBubblesRef.current = updated;
      setActiveBubbles(updated);

      const newScore = scoreRef.current + 1;
      scoreRef.current = newScore;
      setScore(newScore);
      playCorrectSound();
      setScoreBounce(true);
      setTimeout(() => setScoreBounce(false), 200);
      checkLevelUp(newScore);

      // Level completion is timer-driven (handled by the per-level timer).
    } else {
      // Wrong click feedback: shake + red tint, but do not remove the bubble.
      const updated = current.map((b) =>
        b.id === bubbleId ? { ...b, isWrong: true } : b
      );
      activeBubblesRef.current = updated;
      setActiveBubbles(updated);

      if (hapticsEnabledRef.current && navigator?.vibrate) {
        try {
          navigator.vibrate(40);
        } catch {
          // ignore
        }
      }
      playWrongSound();

      setTimeout(() => {
        const c = activeBubblesRef.current;
        const cleared = c.map((b) =>
          b.id === bubbleId && !b.isPopping ? { ...b, isWrong: false } : b
        );
        activeBubblesRef.current = cleared;
        setActiveBubbles(cleared);
      }, 350);
      return;
    }

    // Remove after pop animation
    setTimeout(() => {
      const c = activeBubblesRef.current.filter((b) => b.id !== bubbleId);
      activeBubblesRef.current = c;
      setActiveBubbles(c);
    }, 200);
  }, [logMLEvent, playCorrectSound, playWrongSound, checkLevelUp]);

  const handleBubbleMissed = useCallback((bubbleId) => {
    const current = activeBubblesRef.current;
    const bubble = current.find((b) => b.id === bubbleId);
    if (!bubble) return;

    logMLEvent({
      type: 'miss',
      targetLetter: targetLetterRef.current,
      tappedLetter: bubble.letter,
      reactionMs: null,
      timeRemaining: timeLeftRef.current,
      difficultyLevel: Math.floor(scoreRef.current / 10),
      sessionMs: Date.now() - sessionStartTimeRef.current,
      timestamp: Date.now(),
    });

    const c = current.filter((b) => b.id !== bubbleId);
    activeBubblesRef.current = c;
    setActiveBubbles(c);

    // Level completion is timer-driven (handled by the per-level timer).
  }, [logMLEvent]);

  const startGame = useCallback(() => {
    const mode = practiceMode === 'fixed' ? 'fixed' : 'random';
    const requested =
      typeof practiceLetter === 'string' && LETTERS.includes(practiceLetter)
        ? practiceLetter
        : null;

    const target =
      mode === 'fixed' && requested
        ? requested
        : LETTERS[Math.floor(Math.random() * LETTERS.length)];
    targetLetterRef.current = target;
    setTargetLetter(target);

    // Reset state
    setLevel(1);
    levelRef.current = 1;
    setLettersSpawned(0);
    lettersSpawnedRef.current = 0;
    setLettersThisLevel(0);
    lettersThisLevelRef.current = 0;
    setIsBetweenLevels(false);
    isBetweenLevelsRef.current = false;
    scoreRef.current = 0;
    setScore(0);
    const durationSec = totalDurationRef.current;
    setTotalDurationSec(durationSec);
    timeLeftRef.current = durationSec;
    setTimeLeft(durationSec);
    setActiveBubbles([]);
    activeBubblesRef.current = [];
    levelAtLastFlashRef.current = -1;
    const startedAt = Date.now();
    sessionStartTimeRef.current = startedAt;
    setShowLevelUp(false);
    setAnalysis(null);
    setIsNewHighScore(false);
    resetLog();
    beginSession({ startedAt, durationSec: durationSec, targetLetter: target });

    // Reset difficulty (level-based)
    const diff = difficultyForLevel(1);
    difficultyRef.current = diff;

    // Set running
    isRunningRef.current = true;
    setIsRunning(true);
    setScreen('game');

    // Speak instruction
    speakInstruction(target);

    // Start timer (per-level, consistent duration)
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const newTime = timeLeftRef.current - 1;
      timeLeftRef.current = newTime;
      setTimeLeft(newTime);
      if (newTime <= 0) {
        // End level: pause & show transition.
        if (spawnRef.current) clearInterval(spawnRef.current);
        spawnRef.current = null;
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
        setActiveBubbles([]);
        activeBubblesRef.current = [];
        setIsBetweenLevels(true);
        isBetweenLevelsRef.current = true;
      }
    }, 1000);

    // Start spawner
    startSpawner(diff.spawnInterval);
  }, [speakInstruction, startSpawner, resetLog, beginSession, practiceMode, practiceLetter]);

  const nextLevel = useCallback(() => {
    const next = levelRef.current + 1;
    setLevel(next);
    levelRef.current = next;

    setLettersSpawned(0);
    lettersSpawnedRef.current = 0;
    setLettersThisLevel(0);
    lettersThisLevelRef.current = 0;

    setIsBetweenLevels(false);
    isBetweenLevelsRef.current = false;

    // Reset timer cleanly for the new level using the original selected duration.
    const durationSec = totalDurationRef.current;
    timeLeftRef.current = durationSec;
    setTimeLeft(durationSec);

    const diff = difficultyForLevel(next);
    difficultyRef.current = diff;
    startSpawner(diff.spawnInterval);

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const newTime = timeLeftRef.current - 1;
      timeLeftRef.current = newTime;
      setTimeLeft(newTime);
      if (newTime <= 0) {
        if (spawnRef.current) clearInterval(spawnRef.current);
        spawnRef.current = null;
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
        setActiveBubbles([]);
        activeBubblesRef.current = [];
        setIsBetweenLevels(true);
        isBetweenLevelsRef.current = true;
      }
    }, 1000);
  }, [startSpawner]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (spawnRef.current) clearInterval(spawnRef.current);
    };
  }, []);

  return {
    screen,
    score,
    highScore,
    timeLeft,
    totalDurationSec,
    targetLetter,
    isRunning,
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
    stopToStart,
    handleBubblePop,
    handleBubbleMissed,
    speakInstruction,
  };
}
