const normalize = (text) =>
  text
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[.,!?()[\]'":;/-]/g, "")
    .trim();

const keywordPoolFromSubsection = (subsection) => {
  const answers = subsection.fillInTheBlanks.flatMap((item) => item.answers ?? []);
  const cardTerms = subsection.flashcards.map((item) => item.term);
  const keyPhrases = subsection.keyPoints ?? [];

  return [...answers, ...cardTerms, ...keyPhrases]
    .flatMap((item) => item.split(/[,\u00b7]/))
    .map((item) => item.trim())
    .filter((item) => item.length >= 2);
};

const buildKeywordAction = (keyword) => {
  if (keyword.includes("개인적 자아")) {
    return `"개인적 자아는 성격, 취향, 가치관처럼 개인의 특성과 관련된 모습이다."처럼 뜻을 분명히 써 보세요.`;
  }
  if (keyword.includes("사회적 자아")) {
    return `"사회적 자아는 역할과 책임처럼 사회 속에서의 나를 이해하는 모습이다."라는 방향으로 보완해 보세요.`;
  }
  if (keyword.includes("자아 정체성")) {
    return `"자아 정체성은 여러 자아를 통합해 자신을 이해한 상태"라는 표현을 넣으면 점수를 더 올릴 수 있어요.`;
  }
  if (keyword.includes("도덕")) {
    return `"왜 도덕이 필요한지"를 개인과 사회 두 측면으로 나누어 한 문장씩 써 보세요.`;
  }
  if (keyword.includes("행복")) {
    return `"행복의 의미"와 "행복의 조건"을 구분해서 각각 한 문장으로 설명해 보세요.`;
  }
  if (keyword.includes("가정")) {
    return `"가정의 의미"와 "가정의 도덕적 특성"을 따로 구분해 적으면 더 좋아요.`;
  }
  if (keyword.includes("우정") || keyword.includes("친구")) {
    return `"왜 친구가 소중한지"와 "어떻게 존중해야 하는지"를 연결해서 써 보세요.`;
  }
  if (keyword.includes("가상공간")) {
    return `"가상공간의 특성"과 "지켜야 할 원칙"을 나누어 쓰면 더 정확해집니다.`;
  }

  return `"${keyword}"의 뜻이나 역할을 한 문장으로 분명하게 덧붙여 보세요.`;
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
  const uniqueMissing = [...new Set(missing)];

  let tone = "좋은 출발이에요.";
  if (coverage >= 80) tone = "핵심 개념을 꽤 잘 잡았어요.";
  else if (coverage >= 55) tone = "중요한 내용이 보이지만 조금 더 보완하면 훨씬 좋아져요.";

  const improvementSteps = uniqueMissing.slice(0, 3).map(buildKeywordAction);
  const strengths = uniqueMatched.length
    ? `잘한 점: ${uniqueMatched.slice(0, 3).join(", ")} 관련 표현이 답안에 들어가 있어요.`
    : "잘한 점: 질문의 핵심을 설명하려는 방향은 잘 잡았어요.";
  const missingSummary = uniqueMissing.length
    ? `부족한 부분: ${uniqueMissing.slice(0, 3).join(", ")} 내용을 더 분명히 써야 해요.`
    : "부족한 부분: 핵심어는 대부분 들어갔으니, 개념 사이의 관계를 더 또렷하게 연결하면 좋아요.";
  const rewriteGuide = improvementSteps.length
    ? `점수 올리는 방법: ${improvementSteps.join(" ")}`
    : "점수 올리는 방법: 마지막에 '이 때문에 학습목표를 달성할 수 있다.'처럼 정리 문장을 한 줄 더 써 보세요.";

  return {
    score: coverage,
    feedback: `${tone} ${strengths} ${missingSummary} ${rewriteGuide}`,
    matchedKeywords: uniqueMatched.slice(0, 8),
    missingKeywords: uniqueMissing.slice(0, 6),
    improvementSteps,
  };
};

export const createLearningObjectiveHint = (subsection, userAnswer = "") => {
  const sourceKeywords = keywordPoolFromSubsection(subsection);
  const normalized = normalize(userAnswer);
  const missing = sourceKeywords.filter(
    (keyword) => !normalized.includes(normalize(keyword))
  );
  const focusKeywords = [...new Set(missing)].slice(0, 2);

  if (!focusKeywords.length) {
    return {
      hint:
        "지금 답변에는 핵심어가 꽤 잘 들어가 있어요. 각 개념 사이의 관계나 자신의 사례를 한 문장 더 보태 보세요.",
      focusKeywords: [],
    };
  }

  return {
    hint: `힌트: "${focusKeywords.join(
      '", "'
    )}"를 꼭 넣고, 학습목표가 요구하는 내용을 자신의 말로 연결해서 설명해 보세요.`,
    focusKeywords,
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
