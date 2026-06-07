let audioContext = null;

const getAudioContext = () => {
  if (typeof window === "undefined") {
    return null;
  }

  if (!audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) {
      return null;
    }

    audioContext = new AudioContextClass();
  }

  return audioContext;
};

const envelopeGain = (context, startTime, duration, peak = 0.15) => {
  const gainNode = context.createGain();
  gainNode.gain.setValueAtTime(0.0001, startTime);
  gainNode.gain.linearRampToValueAtTime(peak, startTime + 0.02);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  gainNode.connect(context.destination);
  return gainNode;
};

const playTone = ({
  type = "sine",
  frequency,
  startOffset = 0,
  duration = 0.2,
  peak = 0.15,
  detune = 0,
}) => {
  const context = getAudioContext();

  if (!context) {
    return;
  }

  const startTime = context.currentTime + startOffset;
  const oscillator = context.createOscillator();
  const gainNode = envelopeGain(context, startTime, duration, peak);

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startTime);
  oscillator.detune.setValueAtTime(detune, startTime);
  oscillator.connect(gainNode);
  oscillator.start(startTime);
  oscillator.stop(startTime + duration);
};

const playChord = ({ frequencies, startOffset = 0, duration = 0.22, peak = 0.1, type = "sine" }) => {
  frequencies.forEach((frequency, index) => {
    playTone({
      type,
      frequency,
      startOffset,
      duration,
      peak: peak / Math.max(frequencies.length - index * 0.15, 1),
    });
  });
};

export const playCorrectSound = () => {
  playTone({ type: "triangle", frequency: 783.99, duration: 0.1, peak: 0.11 });
  playTone({ type: "triangle", frequency: 987.77, startOffset: 0.08, duration: 0.11, peak: 0.12 });
  playChord({
    frequencies: [1174.66, 1567.98],
    startOffset: 0.16,
    duration: 0.22,
    peak: 0.12,
    type: "sine",
  });
};

export const playIncorrectSound = () => {
  playTone({ type: "square", frequency: 180, duration: 0.09, peak: 0.08 });
  playTone({ type: "square", frequency: 156, startOffset: 0.1, duration: 0.1, peak: 0.08 });
  playTone({ type: "sawtooth", frequency: 132, startOffset: 0.22, duration: 0.16, peak: 0.07 });
};

export const playXpSound = () => {
  [523.25, 659.25, 783.99, 987.77, 1174.66].forEach((frequency, index) => {
    playTone({
      type: "triangle",
      frequency,
      startOffset: index * 0.04,
      duration: 0.12,
      peak: 0.08,
    });
  });
};

export const playGemSound = () => {
  [1318.51, 1567.98, 1760, 2093, 2349.32].forEach((frequency, index) => {
    playTone({
      type: "sine",
      frequency,
      startOffset: index * 0.025,
      duration: 0.09,
      peak: 0.06,
    });
  });
};

export const playLevelUpSound = () => {
  [
    [523.25, 659.25],
    [783.99, 987.77],
    [1046.5, 1318.51],
  ].forEach((frequencies, index) => {
    playChord({
      frequencies,
      startOffset: index * 0.11,
      duration: 0.3,
      peak: 0.12,
      type: "triangle",
    });
  });
};
