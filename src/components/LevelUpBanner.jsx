import React from 'react';
import './LevelUpBanner.css';

function LevelUpBanner({ text, visible }) {
  if (!visible) return null;

  return (
    <div className="level-up-banner" aria-live="assertive" role="alert">
      {text}
    </div>
  );
}

export default React.memo(LevelUpBanner);
