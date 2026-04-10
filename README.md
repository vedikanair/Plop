plop 🫧

    A 60-second browser game built to help dyslexic kids practice letters that look like mirror images of each other and cause the most confusion. Bubbles float up the screen, you pop the right ones.
    Won 2nd place at HACK4GOOD, organized by the Dept. of Computer Technology, SRMIST.

Live at plopdeployed.vercel.app
  
  How it works
  
    Each round picks a random target letter and reads it out loud — "Pop all the d's!" Bubbles carrying all four letters float up continuously. Tap the ones that match. Wrong taps play a bloop sound but don't deduct points, because the last thing a kid needs is a penalty for guessing. Every 10 correct pops the game speeds up a little. Your best score is saved locally so there's always something to chase.
  
  How to play
  
    Press Play and listen for your target letter
    Pop every bubble that shows that letter
    Ignore the rest (or tap them anyway, the bloop is very satisfying)
    Survive 60 seconds
    
  
  A few things we got right
  
    All sounds are generated with the Web Audio API- no audio files
    OpenDyslexic font throughout, with Arial and Comic Sans as fallbacks
    Fully keyboard accessible, Tab to move between bubbles, Enter or Space to pop
    Respects prefers-reduced-motion
    Minimum 60px touch targets so it's actually usable on a phone
    No backend, no accounts, high score lives in localStorage

  
  Codebase
  
    Three files- index.html, styles.css, script.js. Two CDN dependencies: the OpenDyslexic font and canvas-confetti for the end screen celebration.
