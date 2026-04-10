export function getDifficultyForScore(score) {
  const level = Math.floor(score / 10);
  return {
    spawnInterval: Math.max(400, 1200 - level * 100),
    floatDuration: Math.max(2.5, 6 - level * 0.4),
    bubblesOnScreen: Math.min(12, 4 + level),
  };
}
