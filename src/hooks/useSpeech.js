import { useCallback } from 'react';

export function useSpeech() {
  const speakInstruction = useCallback((targetLetter) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(
      `Pop all the ${targetLetter}s!`
    );
    utterance.rate = 0.85;
    utterance.pitch = 1.1;
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
  }, []);

  return { speakInstruction };
}
