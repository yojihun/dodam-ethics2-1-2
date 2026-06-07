import { stopNarration } from "./speech";

export const mascotVoices = {
  king: {
    name: "임금님",
    voiceId: "pNInz6obpgDQGcFmaJgB",
    lines: {
      success: [
        ["king_s1", "학업의 근간이 튼튼하구나! 훌륭하다."],
        ["king_s2", "경의 학식 정진이 내 마음을 매우 흡족하게 하는구려!"],
        ["king_s3", "바른 지식을 깨우치는 모습이 참으로 아름답도다."],
      ],
      fail: [
        ["king_f1", "아직 정밀함이 부족하오. 힘내시게!"],
        ["king_f2", "과거 시험의 길은 험난한 법, 다시 분발하여 답을 찾아보시게."],
      ],
      hint: [["king_h1", "힌트를 찬찬히 읽어 지혜를 보태어 보시오."]],
    },
  },
  general: {
    name: "장군님",
    voiceId: "SOYHLrjzK2X1ezoPC6cr",
    lines: {
      success: [
        ["general_s1", "정답일세! 기세가 조조와 같구려!"],
        ["general_s2", "학문의 바다를 돌파하는 기세가 거침이 없구나! 승전이로다!"],
        ["general_s3", "좋은 흐름이다! 이 기세를 몰아 다음 장벽도 깨부수자!"],
      ],
      fail: [
        ["general_f1", "아직 포기하긴 이르다! 전열을 가다듬고 다시 돌격하라!"],
        ["general_f2", "아깝구나. 패배에 흔들리지 말고 문제를 다시 분석해 보아라."],
      ],
      hint: [["general_h1", "여기에 힌트를 준비했으니, 지략을 새로 짜 보아라!"]],
    },
  },
  scholar: {
    name: "선비님",
    voiceId: "dMZ8mX0Ph1cjrCK7Jhrg",
    lines: {
      success: [
        ["scholar_s1", "문장이 유려하고 논리가 바르오!"],
        ["scholar_s2", "경전의 이치를 꿰뚫어 보았구려. 참으로 탁월한 학식이오."],
        ["scholar_s3", "정답의 이치가 명명백백하니 내 마음이 밝아지는구려."],
      ],
      fail: [
        ["scholar_f1", "개념이 일부 누락되었구려. 피드백을 보시오."],
        ["scholar_f2", "아깝소. 다시 차분하게 복기해 보시오."],
      ],
      hint: [["scholar_h1", "학문에 지름길은 없으나, 여기 힌트가 길잡이가 되어줄 것이오."]],
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
