const normalize = (text) =>
  text
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[.,!?()[\]'":;/-]/g, "")
    .trim();

const keywordPoolFromSubsection = (subsection) => {
  const answers = subsection.fillInTheBlanks.map((item) => item.answer);
  const cardTerms = subsection.flashcards.map((item) => item.term);
  const keyPhrases = subsection.keyPoints ?? [];

  return [...answers, ...cardTerms, ...keyPhrases]
    .flatMap((item) => item.split(/[,\u00b7]/))
    .map((item) => item.trim())
    .filter((item) => item.length >= 2);
};

export const checkLearningObjective = (subsection, userAnswer) => {
  const sourceKeywords = keywordPoolFromSubsection(subsection);
  const normalized = normalize(userAnswer);
  const matched = sourceKeywords.filter((keyword) =>
    normalized.includes(normalize(keyword))
  );
  const uniqueMatched = [...new Set(matched)];
  const coverage = Math.min(
    100,
    Math.round((uniqueMatched.length / Math.max(sourceKeywords.length / 2, 4)) * 100)
  );

  const missing = sourceKeywords.filter(
    (keyword) => !normalized.includes(normalize(keyword))
  );

  let tone = "좋은 출발이에요.";
  if (coverage >= 80) tone = "핵심 개념을 꽤 잘 잡았어요.";
  else if (coverage >= 55) tone = "중요한 내용이 보이지만 조금 더 보완하면 훨씬 좋아져요.";

  const hints = missing.slice(0, 2).map((keyword) => {
    if (keyword.includes("자아")) {
      return "개인적 자아와 사회적 자아의 차이를 한 번 더 분명하게 써 볼까요?";
    }
    if (keyword.includes("도덕")) {
      return "도덕이 왜 필요한지 개인과 사회 측면으로 나누어 적어 보면 좋아요.";
    }
    if (keyword.includes("성찰") || keyword.includes("좌우명")) {
      return "성찰을 실천으로 어떻게 이어 갈지 예시를 넣어 보면 더 탄탄해져요.";
    }
    return `"${keyword}"과(와) 관련된 설명을 한 줄 더 보태 보세요.`;
  });

  return {
    score: coverage,
    feedback: `${tone} ${hints.join(" ") || "이제 교과서 용어를 사용해 문장을 조금 더 정리해 보세요."}`,
    matchedKeywords: uniqueMatched.slice(0, 8),
  };
};

export const gradeSubjectiveAnswer = (expectedAnswer, userAnswer) => {
  const expectedKeywords = expectedAnswer
    .split(/[.,\s]+/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 2);

  const normalized = normalize(userAnswer);
  const uniqueKeywords = [...new Set(expectedKeywords)];
  const matches = uniqueKeywords.filter((keyword) =>
    normalized.includes(normalize(keyword))
  );
  const ratio = matches.length / Math.max(uniqueKeywords.length, 1);

  let grade = "C";
  if (ratio >= 0.5) grade = "B";
  if (ratio >= 0.72) grade = "A";

  const strengths =
    grade === "A"
      ? "핵심 개념과 이유를 비교적 고르게 포함했어요."
      : grade === "B"
        ? "중요한 개념은 잡았지만 이유나 연결 설명을 조금 더 보완하면 좋아요."
        : "핵심 용어는 일부 보이지만 정의와 이유를 더 분명하게 적어야 해요.";

  const missing = uniqueKeywords.filter(
    (keyword) => !normalized.includes(normalize(keyword))
  );

  const missingPart = missing.length
    ? `${missing.slice(0, 4).map((keyword) => `"${keyword}"`).join(", ")} 같은 표현을 참고해 다시 정리해 보세요.`
    : "문장만 조금 더 매끄럽게 다듬으면 아주 좋아요.";

  return {
    grade,
    feedback: `${strengths} ${missingPart}`,
    matchedKeywords: matches.slice(0, 10),
  };
};
