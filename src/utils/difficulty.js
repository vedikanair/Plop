export function getDifficultyForScore(score) {
  const level = Math.floor(score / 10);
  return {
    spawnInterval: Math.max(400, 1200 - level * 100),
    // Faster bubbles: lower duration => higher speed.
    floatDuration: Math.max(2.0, 4.8 - level * 0.35),
    bubblesOnScreen: Math.min(12, 4 + level),
  };
}
