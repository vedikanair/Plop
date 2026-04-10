import * as tf from '@tensorflow/tfjs';

const MODEL_URL = 'indexeddb://plop_confusion_model_v1';
const LAST_TRAINED_KEY = 'plop_model_last_trained_ymd';

function toLocalYmd(d) {
  const dt = d instanceof Date ? d : new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function safeGetLastTrained() {
  try {
    return localStorage.getItem(LAST_TRAINED_KEY);
  } catch {
    return null;
  }
}

function safeSetLastTrained(ymd) {
  try {
    localStorage.setItem(LAST_TRAINED_KEY, ymd);
  } catch {
    // ignore
  }
}

function oneHot(index, size) {
  const arr = new Array(size).fill(0);
  if (index >= 0 && index < size) arr[index] = 1;
  return arr;
}

export async function loadOrCreateConfusionModel({ letters }) {
  try {
    const loaded = await tf.loadLayersModel(MODEL_URL);
    return loaded;
  } catch {
    const n = letters.length;
    const model = tf.sequential();
    model.add(
      tf.layers.dense({
        inputShape: [n],
        units: Math.max(8, Math.min(32, Math.round(n * 2))),
        activation: 'relu',
      })
    );
    model.add(tf.layers.dense({ units: n, activation: 'softmax' }));
    model.compile({
      optimizer: tf.train.adam(0.01),
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy'],
    });
    return model;
  }
}

export function shouldTrainConfusionModel({ minExamples = 200 } = {}, events) {
  const ymd = toLocalYmd(Date.now());
  const last = safeGetLastTrained();
  if (last === ymd) return false;

  const usable = (events || []).filter(
    (e) => e && e.kind !== 'miss' && e.targetLetter && e.clickedLetter
  );
  return usable.length >= minExamples;
}

export async function trainConfusionModel({ model, letters, events }) {
  const n = letters.length;
  const idx = Object.fromEntries(letters.map((l, i) => [l, i]));

  const usable = (events || []).filter(
    (e) =>
      e &&
      e.kind !== 'miss' &&
      typeof idx[e.targetLetter] === 'number' &&
      typeof idx[e.clickedLetter] === 'number'
  );

  // Keep training lightweight: last N examples only.
  const MAX = 5000;
  const slice = usable.length > MAX ? usable.slice(usable.length - MAX) : usable;

  if (slice.length < 50) return { trained: false, examples: slice.length };

  const xs = [];
  const ys = [];
  for (const e of slice) {
    xs.push(oneHot(idx[e.targetLetter], n));
    ys.push(oneHot(idx[e.clickedLetter], n));
  }

  const xTensor = tf.tensor2d(xs, [xs.length, n]);
  const yTensor = tf.tensor2d(ys, [ys.length, n]);

  try {
    await model.fit(xTensor, yTensor, {
      epochs: 6,
      batchSize: 32,
      shuffle: true,
      verbose: 0,
    });
    await model.save(MODEL_URL);
    safeSetLastTrained(toLocalYmd(Date.now()));
    return { trained: true, examples: xs.length };
  } finally {
    xTensor.dispose();
    yTensor.dispose();
  }
}

export function predictClickedDistribution({ model, letters, targetLetter }) {
  const n = letters.length;
  const idx = Object.fromEntries(letters.map((l, i) => [l, i]));
  const tIdx = idx[targetLetter];
  if (typeof tIdx !== 'number') return null;

  const input = tf.tensor2d([oneHot(tIdx, n)], [1, n]);
  let out = null;
  try {
    out = model.predict(input);
    const tensor = Array.isArray(out) ? out[0] : out;
    const probs = tensor.arraySync()[0];
    if (!probs) return null;
    const row = {};
    for (let i = 0; i < letters.length; i++) row[letters[i]] = probs[i];
    return row;
  } finally {
    input.dispose();
    if (Array.isArray(out)) out.forEach((t) => t.dispose?.());
    else out?.dispose?.();
  }
}

