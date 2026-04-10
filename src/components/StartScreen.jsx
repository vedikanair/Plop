import React from 'react';
import './StartScreen.css';
import { ALL_LETTERS } from '../utils/letters.js';

function StartScreen({
  durationSec,
  hapticsEnabled,
  practiceMode,
  practiceLetter,
  onDurationChange,
  onHapticsChange,
  onPracticeModeChange,
  onPracticeLetterChange,
  onStart,
  onOpenDashboard,
}) {
  return (
    <div className="start-screen">
      {/* Decorative background bubbles */}
      <div className="start-deco start-deco-1" aria-hidden="true" />
      <div className="start-deco start-deco-2" aria-hidden="true" />
      <div className="start-deco start-deco-3" aria-hidden="true" />
      <div className="start-deco start-deco-4" aria-hidden="true" />

      <h1 className="start-title">plop</h1>
      <p className="start-tagline">pop the right letters!</p>

      <div className="start-settings" role="group" aria-label="Game settings">
        <div className="start-setting">
          <div className="start-setting-label">Practice</div>
          <div className="start-segment" role="radiogroup" aria-label="Practice mode">
            {[
              { id: 'random', label: 'Random' },
              { id: 'fixed', label: 'Pick letter' },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`start-segment-btn${(practiceMode ?? 'random') === opt.id ? ' is-active' : ''}`}
                onClick={() => onPracticeModeChange?.(opt.id)}
                role="radio"
                aria-checked={(practiceMode ?? 'random') === opt.id}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {(practiceMode ?? 'random') === 'fixed' && (
          <div className="start-letter-picker" role="group" aria-label="Choose a letter">
            {ALL_LETTERS.map((l) => (
              <button
                key={l}
                type="button"
                className={`start-letter-btn${practiceLetter === l ? ' is-active' : ''}`}
                onClick={() => onPracticeLetterChange?.(l)}
              >
                {l}
              </button>
            ))}
          </div>
        )}

        <div className="start-setting">
          <div className="start-setting-label">Game time</div>
          <div className="start-segment" role="radiogroup" aria-label="Game time">
            {[30, 60].map((s) => (
              <button
                key={s}
                type="button"
                className={`start-segment-btn${durationSec === s ? ' is-active' : ''}`}
                onClick={() => onDurationChange?.(s)}
                role="radio"
                aria-checked={durationSec === s}
              >
                {s}s
              </button>
            ))}
          </div>
        </div>

        <label className="start-setting start-toggle">
          <span className="start-setting-label">Vibration</span>
          <input
            type="checkbox"
            checked={!!hapticsEnabled}
            onChange={(e) => onHapticsChange?.(e.target.checked)}
          />
          <span className="start-toggle-ui" aria-hidden="true" />
        </label>
      </div>

      <button
        id="play-button"
        className="btn-primary start-play-btn"
        onClick={onStart}
        type="button"
      >
        Play!
      </button>

      <button
        className="btn-secondary"
        onClick={() => onOpenDashboard?.()}
        type="button"
      >
        Dashboard
      </button>
    </div>
  );
}

export default StartScreen;
