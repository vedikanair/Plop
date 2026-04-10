import React from 'react';
import './StartScreen.css';

function StartScreen({ onStart }) {
  return (
    <div className="start-screen">
      {/* Decorative background bubbles */}
      <div className="start-deco start-deco-1" aria-hidden="true" />
      <div className="start-deco start-deco-2" aria-hidden="true" />
      <div className="start-deco start-deco-3" aria-hidden="true" />
      <div className="start-deco start-deco-4" aria-hidden="true" />

      <h1 className="start-title">plop 🫧</h1>
      <p className="start-tagline">pop the right letters!</p>
      <button
        id="play-button"
        className="btn-primary start-play-btn"
        onClick={onStart}
        type="button"
      >
        Play!
      </button>
    </div>
  );
}

export default StartScreen;
