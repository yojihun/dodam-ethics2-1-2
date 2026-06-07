import { stopNarration } from "./speech";

export const mascotVoices = {
  king: {
    name: "임금님",
    voiceId: "pNInz6obpgDQGcFmaJgB",
    lines: {
      success: [
        ["king_s1", "좋았어!"],
        ["king_s2", "참 잘했어!"],
        ["king_s3", "정답이구나!"],
      ],
      fail: [
        ["king_f1", "조금만 더!"],
        ["king_f2", "다시 해보자!"],
      ],
      hint: [["king_h1", "힌트를 볼까?"]],
    },
  },
  general: {
    name: "장군님",
    voiceId: "SOYHLrjzK2X1ezoPC6cr",
    lines: {
      success: [
        ["general_s1", "정답이다!"],
        ["general_s2", "좋았어!"],
        ["general_s3", "멋진데!"],
      ],
      fail: [
        ["general_f1", "다시 도전!"],
        ["general_f2", "거의 맞았어!"],
      ],
      hint: [["general_h1", "힌트를 확인해!"]],
    },
  },
  scholar: {
    name: "선비님",
    voiceId: "dMZ8mX0Ph1cjrCK7Jhrg",
    lines: {
      success: [
        ["scholar_s1", "잘했어요!"],
        ["scholar_s2", "핵심을 잡았어요!"],
        ["scholar_s3", "정확해요!"],
      ],
      fail: [
        ["scholar_f1", "한 번 더 생각해요!"],
        ["scholar_f2", "조금 더 보완해요!"],
      ],
      hint: [["scholar_h1", "힌트를 참고해요."]],
    },
  },
};

let elevenAudio = null;

const pickRandomLine = (role, type) => {
  const pool = mascotVoices[role]?.lines[type] ?? mascotVoices.scholar.lines[type] ?? [];
  return pool[Math.floor(Math.random() * pool.length)] ?? ["", ""];
};

const speakWithBrowser = (text) => {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "ko-KR";
  utterance.rate = 0.96;
  utterance.pitch = 0.95;
  window.speechSynthesis.speak(utterance);
};

export const stopMascotSpeech = () => {
  if (elevenAudio) {
    elevenAudio.pause();
    elevenAudio = null;
  }
};

export const playMascotSpeech = (lineId, fallbackText) => {
  stopNarration();
  stopMascotSpeech();

  if (typeof window === "undefined") {
    return;
  }

  const audioUrl = `/audio/${lineId}.mp3`;
  const audio = new Audio(audioUrl);
  audio.preload = "auto";
  elevenAudio = audio;

  const fallback = () => {
    stopMascotSpeech();
    speakWithBrowser(fallbackText);
  };

  audio.addEventListener("error", fallback, { once: true });
  audio.play().catch(fallback);
};

export const triggerMascotSpeech = ({ type, role = "scholar" }) => {
  const [lineId, text] = pickRandomLine(role, type);
  playMascotSpeech(lineId, text);

  return {
    role,
    speaker: mascotVoices[role]?.name ?? mascotVoices.scholar.name,
    voiceId: mascotVoices[role]?.voiceId ?? mascotVoices.scholar.voiceId,
    lineId,
    text,
  };
};
