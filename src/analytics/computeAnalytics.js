function median(sortedNums) {
  const n = sortedNums.length;
  if (n === 0) return 0;
  const mid = Math.floor(n / 2);
  return n % 2 === 1 ? sortedNums[mid] : (sortedNums[mid - 1] + sortedNums[mid]) / 2;
}

function normalizeEvent(ev) {
  const ts = ev.ts ?? ev.timestamp ?? Date.now();
  const targetLetter = ev.targetLetter ?? null;
  const clickedLetter = ev.clickedLetter ?? ev.tappedLetter ?? null;
  const reactionMs = typeof ev.reactionMs === 'number' ? ev.reactionMs : null;

  const kind =
    ev.kind ??
    (ev.type === 'miss' ? 'miss' : ev.type === 'correct_pop' || ev.type === 'wrong_pop' ? 'pop' : 'pop');

  const correct =
    typeof ev.correct === 'boolean'
      ? ev.correct
      : ev.type === 'correct_pop'
        ? true
        : ev.type === 'wrong_pop'
          ? false
          : null;

  return {
    ts,
    kind,
    targetLetter,
    clickedLetter,
    reactionMs,
    correct,
  };
}

function initMatrix(letters) {
  const m = {};
  for (const a of letters) {
    m[a] = {};
    for (const b of letters) m[a][b] = 0;
  }
  return m;
}

export function computeAnalytics({ letters, events }) {
  const matrix = initMatrix(letters);
  const correctByTarget = Object.fromEntries(letters.map((l) => [l, 0]));
  const wrongByTarget = Object.fromEntries(letters.map((l) => [l, 0]));
  const missedTarget = Object.fromEntries(letters.map((l) => [l, 0]));

  const rtByTarget = Object.fromEntries(letters.map((l) => [l, []]));

  for (const raw of events || []) {
    const ev = normalizeEvent(raw);
    if (!ev.targetLetter || !letters.includes(ev.targetLetter)) continue;

    if (ev.kind === 'miss') {
      // Only count a miss as an error if the missed bubble was actually the target letter.
      if (ev.clickedLetter && ev.clickedLetter === ev.targetLetter) {
        missedTarget[ev.targetLetter] += 1;
      }
      continue;
    }

    if (!ev.clickedLetter || !letters.includes(ev.clickedLetter)) continue;

    // Confusion matrix counts (includes diagonal).
    matrix[ev.targetLetter][ev.clickedLetter] += 1;

    if (ev.correct === true || ev.clickedLetter === ev.targetLetter) {
      correctByTarget[ev.targetLetter] += 1;
    } else if (ev.correct === false || ev.clickedLetter !== ev.targetLetter) {
      wrongByTarget[ev.targetLetter] += 1;
    }

    if (ev.reactionMs != null) rtByTarget[ev.targetLetter].push(ev.reactionMs);
  }

  const accuracy = {};
  const reaction = {};
  const confusionProb = initMatrix(letters);

  for (const t of letters) {
    const total = correctByTarget[t] + wrongByTarget[t] + missedTarget[t];
    accuracy[t] = total > 0 ? correctByTarget[t] / total : 1;

    const rts = rtByTarget[t].slice().sort((a, b) => a - b);
    const avg = rts.length ? Math.round(rts.reduce((s, x) => s + x, 0) / rts.length) : 0;
    const med = rts.length ? Math.round(median(rts)) : 0;
    reaction[t] = { avgMs: avg, medianMs: med, n: rts.length };

    const rowSum = letters.reduce((s, c) => s + (matrix[t][c] || 0), 0);
    for (const c of letters) {
      confusionProb[t][c] = rowSum > 0 ? matrix[t][c] / rowSum : c === t ? 1 : 0;
    }
  }

  // Most confused pairs: sum off-diagonal counts both directions.
  const pairCounts = [];
  for (let i = 0; i < letters.length; i++) {
    for (let j = i + 1; j < letters.length; j++) {
      const a = letters[i];
      const b = letters[j];
      const count = (matrix[a]?.[b] || 0) + (matrix[b]?.[a] || 0);
      if (count > 0) pairCounts.push({ a, b, count });
    }
  }
  pairCounts.sort((x, y) => y.count - x.count);

  const letterScores = letters.map((l) => ({
    letter: l,
    accuracy: accuracy[l] ?? 1,
    rt: reaction[l]?.medianMs ?? 0,
  }));

  // Weak = low accuracy then slow RT; Strong = high accuracy then fast RT.
  const weak = [...letterScores].sort((x, y) => {
    if (x.accuracy !== y.accuracy) return x.accuracy - y.accuracy;
    return y.rt - x.rt;
  });
  const strong = [...letterScores].sort((x, y) => {
    if (x.accuracy !== y.accuracy) return y.accuracy - x.accuracy;
    return x.rt - y.rt;
  });

  return {
    letters,
    confusionMatrix: matrix,
    confusionProb,
    accuracy,
    reaction,
    mostConfusedPairs: pairCounts.slice(0, 10),
    weakLetters: weak.slice(0, 5).map((x) => x.letter),
    strongLetters: strong.slice(0, 5).map((x) => x.letter),
  };
}

