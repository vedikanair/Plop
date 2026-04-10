import React from 'react';
import { LETTER_COLORS, LETTER_BG_COLORS } from '../utils/letters.js';
import './Bubble.css';

function Bubble({ id, letter, left, floatDuration, isPopping, onPop, onMissed, onRemove }) {
  const handlePointerDown = (e) => {
    e.stopPropagation();
    onPop(id);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onPop(id);
    }
  };

  const handleAnimationEnd = (e) => {
    if (e.animationName === 'floatUp' && !isPopping) {
      onMissed(id);
    }
    if (e.animationName === 'popBurst') {
      if (onRemove) onRemove(id);
    }
  };

  return (
    <div
      className={`bubble${isPopping ? ' is-popping' : ''}`}
      style={{
        left: `${left}%`,
        '--float-duration': `${floatDuration}s`,
        backgroundColor: LETTER_BG_COLORS[letter],
        color: LETTER_COLORS[letter],
        borderColor: LETTER_COLORS[letter],
      }}
      tabIndex={0}
      role="button"
      aria-label={`bubble ${letter}`}
      onPointerDown={handlePointerDown}
      onKeyDown={handleKeyDown}
      onAnimationEnd={handleAnimationEnd}
    >
      {letter}
    </div>
  );
}

export default React.memo(Bubble);
