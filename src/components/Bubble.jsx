import React from 'react';
import './Bubble.css';

function Bubble({
  id,
  letter,
  colors,
  left,
  floatDuration,
  isPopping,
  isWrong,
  onPop,
  onMissed,
  onRemove,
}) {
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
      className={`bubble${isPopping ? ' is-popping' : ''}${isWrong ? ' is-wrong' : ''}`}
      style={{
        left: `${left}%`,
        '--float-duration': `${floatDuration}s`,
        backgroundColor: colors?.bg,
        color: colors?.fg,
        borderColor: colors?.border ?? colors?.fg,
      }}
      tabIndex={0}
      role="button"
      aria-label={`bubble ${letter}`}
      onPointerDown={handlePointerDown}
      onKeyDown={handleKeyDown}
      onAnimationEnd={handleAnimationEnd}
    >
      <div className="bubble-inner">{letter}</div>
    </div>
  );
}

export default React.memo(Bubble);
