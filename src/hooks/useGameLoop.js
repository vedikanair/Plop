import { useState, useRef, useCallback, useEffect } from 'react';
import { LETTERS, GAME_DURATION } from '../utils/letters.js';
import { getDifficultyForScore } from '../utils/difficulty.js';
import { loadHighScore, saveHighScore } from '../utils/storage.js';
import { useAudio } from './useAudio.js';
import { useSpeech } from './useSpeech.js';
import { useMLLogger } from './useMLLogger.js';
import confetti from 'canvas-confetti';

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

export function useGameLoop() {
  const [screen, setScreen] = useState('start'); // 'start' | 'game' | 'gameover'
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => loadHighScore());
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [targetLetter, setTargetLetter] = useState('d');
  const [isRunning, setIsRunning] = useState(false);
  const [activeBubbles, setActiveBubbles] = useState([]);
  const [levelUpText, setLevelUpText] = useState('');
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [scoreBounce, setScoreBounce] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [isNewHighScore, setIsNewHighScore] = useState(false);

  const timerRef = useRef(null);
  const spawnRef = useRef(null);
  const levelAtLastFlashRef = useRef(-1);
  const sessionStartTimeRef = useRef(null);
  const scoreRef = useRef(0);
  const timeLeftRef = useRef(GAME_DURATION);
  const difficultyRef = useRef({
    spawnInterval: 1200,
    floatDuration: 6,
    bubblesOnScreen: 4,
  });
  const targetLetterRef = useRef('d');
  const activeBubblesRef = useRef([]);
  const highScoreRef = useRef(loadHighScore());
  const isRunningRef = useRef(false);

  const { playCorrectSound, playWrongSound, playGameOverSound } = useAudio();
  const { speakInstruction } = useSpeech();
  const { logMLEvent, analyzeSession, saveSession, resetLog } = useMLLogger();

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
    saveSession(targetLetterRef.current, finalScore, result);

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
  }, [playGameOverSound, analyzeSession, saveSession]);

  const endGameRef = useRef(endGame);
  useEffect(() => {
    endGameRef.current = endGame;
  }, [endGame]);

  const startSpawner = useCallback((interval) => {
    if (spawnRef.current) clearInterval(spawnRef.current);
    spawnRef.current = setInterval(() => {
      if (!isRunningRef.current) return;
      const current = activeBubblesRef.current;
      if (current.length >= difficultyRef.current.bubblesOnScreen) return;

      const bubble = {
        id: Date.now() + Math.random(),
        letter: LETTERS[Math.floor(Math.random() * LETTERS.length)],
        left: 5 + Math.random() * 80,
        floatDuration: difficultyRef.current.floatDuration,
        spawnTime: Date.now(),
        isPopping: false,
      };
      const next = [...current, bubble];
      activeBubblesRef.current = next;
      setActiveBubbles(next);
    }, interval);
  }, []);

  const checkLevelUp = useCallback((newScore) => {
    const newLevel = Math.floor(newScore / 10);
    if (newLevel > levelAtLastFlashRef.current) {
      levelAtLastFlashRef.current = newLevel;
      const diff = getDifficultyForScore(newScore);
      difficultyRef.current = diff;

      // Restart spawner with new interval
      startSpawner(diff.spawnInterval);

      setLevelUpText(`Level ${newLevel + 1}! 🚀 Faster!`);
      setShowLevelUp(true);
      setTimeout(() => setShowLevelUp(false), 1500);
    }
  }, [startSpawner]);

  const handleBubblePop = useCallback((bubbleId) => {
    const current = activeBubblesRef.current;
    const bubble = current.find((b) => b.id === bubbleId);
    if (!bubble || bubble.isPopping) return;

    // Mark as popping
    const updated = current.map((b) =>
      b.id === bubbleId ? { ...b, isPopping: true } : b
    );
    activeBubblesRef.current = updated;
    setActiveBubbles(updated);

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
      const newScore = scoreRef.current + 1;
      scoreRef.current = newScore;
      setScore(newScore);
      playCorrectSound();
      setScoreBounce(true);
      setTimeout(() => setScoreBounce(false), 200);
      checkLevelUp(newScore);
    } else {
      playWrongSound();
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
  }, [logMLEvent]);

  const startGame = useCallback(() => {
    // Pick random target letter
    const target = LETTERS[Math.floor(Math.random() * LETTERS.length)];
    targetLetterRef.current = target;
    setTargetLetter(target);

    // Reset state
    scoreRef.current = 0;
    setScore(0);
    timeLeftRef.current = GAME_DURATION;
    setTimeLeft(GAME_DURATION);
    setActiveBubbles([]);
    activeBubblesRef.current = [];
    levelAtLastFlashRef.current = -1;
    sessionStartTimeRef.current = Date.now();
    setShowLevelUp(false);
    setAnalysis(null);
    setIsNewHighScore(false);
    resetLog();

    // Reset difficulty
    const diff = getDifficultyForScore(0);
    difficultyRef.current = diff;

    // Set running
    isRunningRef.current = true;
    setIsRunning(true);
    setScreen('game');

    // Speak instruction
    speakInstruction(target);

    // Start timer
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const newTime = timeLeftRef.current - 1;
      timeLeftRef.current = newTime;
      setTimeLeft(newTime);
      if (newTime <= 0) {
        endGameRef.current();
      }
    }, 1000);

    // Start spawner
    startSpawner(diff.spawnInterval);
  }, [speakInstruction, startSpawner, resetLog]);

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
    targetLetter,
    isRunning,
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
  };
}
