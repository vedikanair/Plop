function pickWeighted(weights, rng = Math.random) {
  const entries = Object.entries(weights).filter(([, w]) => typeof w === 'number' && w > 0);
  if (entries.length === 0) return null;
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = rng() * total;
  for (const [k, w] of entries) {
    r -= w;
    if (r <= 0) return k;
  }
  return entries[entries.length - 1][0];
}

function uniformPick(arr, rng = Math.random) {
  return arr[Math.floor(rng() * arr.length)];
}

export function buildTargetWeights({ letters, analytics, alpha = 2.0, beta = 0.6, base = 1.0 }) {
  const weights = {};
  for (const l of letters) {
    const acc = analytics?.accuracy?.[l];
    const rt = analytics?.reaction?.[l]?.medianMs ?? 0;
    const accPenalty = typeof acc === 'number' ? 1 - acc : 0;
    const slowPenalty = rt ? Math.min(1, rt / 2000) : 0;
    weights[l] = base + alpha * accPenalty + beta * slowPenalty;
  }
  return weights;
}

export function pickNextTargetLetter({ letters, analytics, rng = Math.random }) {
  if (!letters || letters.length === 0) return null;
  if (!analytics) return uniformPick(letters, rng);
  const weights = buildTargetWeights({ letters, analytics });
  return pickWeighted(weights, rng) ?? uniformPick(letters, rng);
}

export function pickBubbleLetter({
  letters,
  targetLetter,
  analytics,
  lastSpawnedLetter,
  pairMap,
  rng = Math.random,
  exploration = 0.15,
  targetBias = 0.35,
  pairBoost = 0.35,
}) {
  if (!letters || letters.length === 0) return null;
  if (!targetLetter || !letters.includes(targetLetter)) return uniformPick(letters, rng);

  // Exploration keeps the game from getting stuck and helps data collection.
  if (!analytics || rng() < exploration) return uniformPick(letters, rng);

  const row = analytics.confusionProb?.[targetLetter];
  if (!row) return uniformPick(letters, rng);

  const weights = {};
  for (const l of letters) {
    // Start from model/data probabilities; add epsilon so nothing is impossible.
    const p = typeof row[l] === 'number' ? row[l] : 0;
    weights[l] = 0.02 + p;
  }

  // Ensure target letters appear frequently enough to be playable.
  weights[targetLetter] = (weights[targetLetter] ?? 0.1) + targetBias;

  // Confusion pair logic: when one letter appears, boost its pair next.
  if (pairMap && lastSpawnedLetter && typeof pairMap[lastSpawnedLetter] === 'string') {
    const paired = pairMap[lastSpawnedLetter];
    if (paired && weights[paired] != null) weights[paired] += pairBoost;
  }

  return pickWeighted(weights, rng) ?? uniformPick(letters, rng);
}

