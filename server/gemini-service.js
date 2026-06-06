const MODEL = "gemini-2.5-flash";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const requestGemini = async (apiKey, prompt) => {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing.");
  }

  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.3,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Gemini request failed: ${response.status} ${message}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("")
    .trim();

  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }

  return JSON.parse(text);
};

export const evaluateObjective = async (apiKey, subsection, userAnswer) => {
  const prompt = `
너는 중학교 도덕 교과 평가 도우미다.
학생 답변을 친절하게 평가하되, 정답을 한 번에 다 말하지 말고 1~2개의 힌트만 준다.
반드시 JSON만 반환한다.

학습 목표:
${subsection.objective}

핵심 개념:
${subsection.keyPoints.map((item) => `- ${item}`).join("\n")}

핵심 용어:
${subsection.flashcards.map((item) => `- ${item.term}: ${item.definition}`).join("\n")}

빈칸 학습 정답:
${subsection.fillInTheBlanks.map((item) => `- ${item.answer}`).join("\n")}

학생 답변:
${userAnswer}

반환 형식:
{
  "score": 0에서 100 사이 정수,
  "feedback": "격려 1문장 + 보완 힌트 1~2문장",
  "matchedKeywords": ["핵심어", "핵심어"]
}
`;

  const result = await requestGemini(apiKey, prompt);

  return {
    score: Number(result.score) || 0,
    feedback: String(result.feedback || ""),
    matchedKeywords: Array.isArray(result.matchedKeywords)
      ? result.matchedKeywords.map((item) => String(item))
      : [],
  };
};

export const evaluateSubjective = async (
  apiKey,
  question,
  expectedAnswer,
  userAnswer
) => {
  const prompt = `
너는 중학교 도덕 서술형 채점 도우미다.
학생 답안을 A, B, C 중 하나로 평가하고, 격려와 보완점을 한국어로 짧게 설명한다.
반드시 JSON만 반환한다.

문제:
${question}

모범 답안:
${expectedAnswer}

학생 답안:
${userAnswer}

반환 형식:
{
  "grade": "A 또는 B 또는 C",
  "feedback": "격려와 보완점을 담은 2~3문장",
  "matchedKeywords": ["핵심어", "핵심어"]
}
`;

  const result = await requestGemini(apiKey, prompt);

  return {
    grade: ["A", "B", "C"].includes(result.grade) ? result.grade : "C",
    feedback: String(result.feedback || ""),
    matchedKeywords: Array.isArray(result.matchedKeywords)
      ? result.matchedKeywords.map((item) => String(item))
      : [],
  };
};
