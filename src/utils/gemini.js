const postGemini = async (payload) => {
  const response = await fetch("/api/gemini", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Gemini proxy failed: ${response.status} ${message}`);
  }

  return response.json();
};

export const hasGeminiKey = () => true;

export const checkLearningObjectiveWithGemini = async (subsection, userAnswer) =>
  postGemini({
    type: "objective",
    subsection,
    userAnswer,
  });

export const gradeSubjectiveAnswerWithGemini = async (
  question,
  expectedAnswer,
  userAnswer
) =>
  postGemini({
    type: "subjective",
    question,
    expectedAnswer,
    userAnswer,
  });
