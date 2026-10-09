// Web Audio API beep + Speech Synthesis for voice feedback

export function playChime(isCheckIn = true) {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    const now = audioCtx.currentTime;

    if (isCheckIn) {
      // Pleasant rising double-tone chime
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5
    } else {
      // Warm departure chime
      osc.frequency.setValueAtTime(783.99, now); // G5
      osc.frequency.exponentialRampToValueAtTime(523.25, now + 0.2); // C5
    }

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(now);
    osc.stop(now + 0.35);
  } catch (e) {
    console.warn('Audio not supported', e);
  }
}

export function speakGreeting(name, isCheckIn = true) {
  if (!('speechSynthesis' in window)) return;
  try {
    const text = isCheckIn 
      ? `Welcome ${name}, Check-in successful` 
      : `Thank you ${name}, Check-out recorded`;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    // Prefer Indian English or Telugu if available
    const voices = window.speechSynthesis.getVoices();
    const teluguVoice = voices.find(v => v.lang.includes('te'));
    const indianVoice = voices.find(v => v.lang.includes('en-IN') || v.lang.includes('IN'));

    if (teluguVoice) utterance.voice = teluguVoice;
    else if (indianVoice) utterance.voice = indianVoice;

    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.warn('Speech synthesis error', e);
  }
}
