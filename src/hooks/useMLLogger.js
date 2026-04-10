import { useRef, useCallback } from 'react';
import { LETTERS } from '../utils/letters.js';
import { saveMLSession } from '../utils/storage.js';

function generateTip(weakestPair) {
  if (!weakestPair || weakestPair.length < 2) {
    return 'Incredible! You popped every bubble perfectly! 🎉';
  }
  const sorted = [...weakestPair].sort().join('');
  switch (sorted) {
    case 'bd':
      return "You're so close! b faces right, d faces left. You've got this! 🌟";
    case 'bp':
      return "Almost there! b sits on the line, p drops its tail below. Keep it up! 🌟";
    case 'bq':
      return "Great effort! b faces right with a tall back, q faces left with a tail. You're a star! ⭐";
    case 'dp':
      return "So close! d faces left on the line, p drops its tail below. You can do it! 🌟";
    case 'dq':
      return "Nearly there! d has a tall back on the left, q drops its tail below-left. Keep going! ⭐";
    case 'pq':
      return "Nearly there! p has its tail going down-right, q goes down-left. Keep going! ⭐";
    default:
      return "Great job practising! Keep playing to get even better! 🌟";
  }
}

export function useMLLogger() {
  const eventsRef = useRef([]);

  const resetLog = useCallback(() => {
    eventsRef.current = [];
  }, []);

  const logMLEvent = useCallback((event) => {
    eventsRef.current.push(event);
  }, []);

  const analyzeSession = useCallback((targetLetter) => {
    const events = eventsRef.current;

    // Build confusion matrix
    const confusionMatrix = {};
    LETTERS.forEach((a) => {
      confusionMatrix[a] = {};
      LETTERS.forEach((b) => {
        confusionMatrix[a][b] = 0;
      });
    });

    // Track accuracy per letter
    const letterStats = {};
    LETTERS.forEach((l) => {
      letterStats[l] = { correct: 0, total: 0 };
    });

    let totalReactionMs = 0;
    let reactionCount = 0;

    events.forEach((ev) => {
      if (ev.type === 'correct_pop') {
        confusionMatrix[ev.targetLetter][ev.tappedLetter] += 1;
        letterStats[ev.tappedLetter].correct += 1;
        letterStats[ev.tappedLetter].total += 1;
        if (ev.reactionMs != null) {
          totalReactionMs += ev.reactionMs;
          reactionCount += 1;
        }
      } else if (ev.type === 'wrong_pop') {
        // Player tapped the wrong letter — record confusion
        confusionMatrix[ev.targetLetter][ev.tappedLetter] += 1;
        letterStats[ev.tappedLetter].total += 1;
        if (ev.reactionMs != null) {
          totalReactionMs += ev.reactionMs;
          reactionCount += 1;
        }
      } else if (ev.type === 'miss') {
        letterStats[ev.tappedLetter].total += 1;
      }
    });

    // Accuracy per letter
    const accuracy = {};
    LETTERS.forEach((l) => {
      const s = letterStats[l];
      accuracy[l] = s.total > 0 ? s.correct / s.total : 1.0;
    });

    // Find weakest pair from confusion matrix (off-diagonal)
    let maxConfusion = 0;
    let weakestPair = null;
    LETTERS.forEach((a) => {
      LETTERS.forEach((b) => {
        if (a !== b) {
          const count = confusionMatrix[a][b] + confusionMatrix[b][a];
          if (count > maxConfusion) {
            maxConfusion = count;
            weakestPair = [a, b];
          }
        }
      });
    });

    const avgReactionMs =
      reactionCount > 0 ? Math.round(totalReactionMs / reactionCount) : 0;

    const tip = generateTip(weakestPair);

    return {
      accuracy,
      confusionMatrix,
      weakestPair,
      avgReactionMs,
      tip,
    };
  }, []);

  const saveSession = useCallback((targetLetter, score, analysis) => {
    const sessionRecord = {
      timestamp: Date.now(),
      targetLetter,
      score,
      events: eventsRef.current,
      analysis,
    };
    saveMLSession(sessionRecord);
  }, []);

  return { logMLEvent, analyzeSession, saveSession, resetLog };
}
