export function getDifficultyForScore(score) {
  const level = Math.floor(score / 10);
  return {
    spawnInterval: Math.max(400, 1200 - level * 100),
    // Original baseline speed (playable for kids)
    floatDuration: Math.max(2.5, 6 - level * 0.4),
    bubblesOnScreen: Math.min(12, 4 + level),
  };
}
