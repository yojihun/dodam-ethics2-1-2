import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useLearning } from "../context/useLearning";
import { chapters, quizzes } from "../data/chapters";
import {
  checkLearningObjective,
  createLearningObjectiveHint,
  gradeSubjectiveAnswer,
} from "../utils/localGrader";
import {
  checkLearningObjectiveWithGemini,
  createLearningObjectiveHintWithGemini,
  gradeSubjectiveAnswerWithGemini,
  hasGeminiKey,
} from "../utils/gemini";
import { triggerMascotSpeech } from "../utils/mascotAudio";
import {
  playCorrectSound,
  playGemSound,
  playIncorrectSound,
  playLevelUpSound,
  playXpSound,
} from "../utils/soundEffects";

const topTabs = ["overview", "blanks", "cards", "quiz"];
const cardModes = ["flip", "objective", "subjective"];
const quizModes = ["objective", "subjective"];

const hashString = (value) =>
  value.split("").reduce((total, character, index) => total + character.charCodeAt(0) * (index + 1), 0);

const getObjectiveStatus = (feedback) => {
  if (!feedback) {
    return { label: "미달성 목표", tone: "pending" };
  }

  if (feedback.score >= 80) {
    return { label: "달성한 목표", tone: "complete" };
  }

  return { label: "보완이 필요한 목표", tone: "in-progress" };
};

const buildCardObjectiveOptions = (currentCard, flashcards) => {
  if (!currentCard) {
    return [];
  }

  if (currentCard.objectiveOptions?.length) {
    return currentCard.objectiveOptions;
  }

  const distractors = flashcards
    .filter((card) => card.term !== currentCard.term)
    .map((card) => card.term)
    .slice(0, 3);

  return [currentCard.term, ...distractors]
    .map((option, index) => ({
      option,
      sortKey: (hashString(`${currentCard.id}:${option}`) + index * 17) % 997,
    }))
    .sort((left, right) => left.sortKey - right.sortKey)
    .map((item) => item.option);
};

export default function Chapter() {
  const { chapterId } = useParams();
  const navigate = useNavigate();
  const { chapterState, rewards, level, updateChapterState, addXp, addGems, markReward } =
    useLearning();
  const chapter = chapters.find((item) => item.id === chapterId) ?? chapters[0];
  const allSubsections = chapter.sections.flatMap((section) => section.subsections);
  const savedChapterState = chapterState[chapter.id] ?? {};

  const [selectedSubsectionId, setSelectedSubsectionId] = useState(
    allSubsections.some((item) => item.id === savedChapterState.selectedSubsectionId)
      ? savedChapterState.selectedSubsectionId
      : allSubsections[0].id
  );
  const [activeTab, setActiveTab] = useState(savedChapterState.activeTab ?? "overview");
  const [cardMode, setCardMode] = useState(savedChapterState.cardMode ?? "flip");
  const [quizMode, setQuizMode] = useState(savedChapterState.quizMode ?? "objective");
  const [blankAnswers, setBlankAnswers] = useState(savedChapterState.blankAnswers ?? {});
  const [blankChecks, setBlankChecks] = useState(savedChapterState.blankChecks ?? {});
  const [objectiveModalId, setObjectiveModalId] = useState(null);
  const [objectiveDrafts, setObjectiveDrafts] = useState(savedChapterState.objectiveDrafts ?? {});
  const [objectiveFeedbackMap, setObjectiveFeedbackMap] = useState(
    savedChapterState.objectiveFeedbackMap ?? {}
  );
  const [objectiveHintMap, setObjectiveHintMap] = useState(
    savedChapterState.objectiveHintMap ?? {}
  );
  const [objectiveLoadingId, setObjectiveLoadingId] = useState(null);
  const [objectiveHintLoadingId, setObjectiveHintLoadingId] = useState(null);
  const [cardIndex, setCardIndex] = useState(savedChapterState.cardIndex ?? 0);
  const [cardObjectiveIndex, setCardObjectiveIndex] = useState(
    savedChapterState.cardObjectiveIndex ?? 0
  );
  const [cardSubjectiveIndex, setCardSubjectiveIndex] = useState(
    savedChapterState.cardSubjectiveIndex ?? 0
  );
  const [cardFlipped, setCardFlipped] = useState(false);
  const [quizIndex, setQuizIndex] = useState(savedChapterState.quizIndex ?? 0);
  const [quizSelection, setQuizSelection] = useState(null);
  const [quizChecked, setQuizChecked] = useState(false);
  const [cardObjectiveSelectionMap, setCardObjectiveSelectionMap] = useState(
    savedChapterState.cardObjectiveSelectionMap ?? {}
  );
  const [cardObjectiveCheckedMap, setCardObjectiveCheckedMap] = useState(
    savedChapterState.cardObjectiveCheckedMap ?? {}
  );
  const [cardSubjectiveAnswers, setCardSubjectiveAnswers] = useState(
    savedChapterState.cardSubjectiveAnswers ?? {}
  );
  const [cardSubjectiveFeedbackMap, setCardSubjectiveFeedbackMap] = useState(
    savedChapterState.cardSubjectiveFeedbackMap ?? {}
  );
  const [cardSubjectiveLoadingId, setCardSubjectiveLoadingId] = useState(null);
  const [subjectiveId, setSubjectiveId] = useState(
    savedChapterState.subjectiveId ??
      chapter.subjectiveQuizzes.find((item) => item.subsectionId === allSubsections[0].id)?.id ??
      chapter.subjectiveQuizzes[0].id
  );
  const [subjectiveAnswers, setSubjectiveAnswers] = useState(
    savedChapterState.subjectiveAnswers ?? {}
  );
  const [subjectiveFeedbackMap, setSubjectiveFeedbackMap] = useState(
    savedChapterState.subjectiveFeedbackMap ?? {}
  );
  const [subjectiveLoading, setSubjectiveLoading] = useState(false);
  const [gradingMode, setGradingMode] = useState(hasGeminiKey() ? "gemini" : "local");
  const [mascotFeedback, setMascotFeedback] = useState(null);
  const [rewardToasts, setRewardToasts] = useState([]);

  const selectedSubsection =
    allSubsections.find((item) => item.id === selectedSubsectionId) ?? allSubsections[0];
  const selectedSection =
    chapter.sections.find((section) =>
      section.subsections.some((subsection) => subsection.id === selectedSubsection.id)
    ) ?? chapter.sections[0];
  const selectedFlashcards = selectedSubsection.flashcards.map((card, index) => ({
    ...card,
    id: `${selectedSubsection.id}-flash-${index}`,
    subsectionTitle: selectedSection.title,
  }));
  const selectedQuizzes = quizzes.filter((quiz) => quiz.subsectionId === selectedSubsection.id);
  const selectedSubjectives = chapter.subjectiveQuizzes.filter(
    (item) => item.subsectionId === selectedSubsection.id
  );
  const activeObjectiveSubsection =
    allSubsections.find((item) => item.id === objectiveModalId) ?? null;
  const currentQuiz = selectedQuizzes[quizIndex] ?? selectedQuizzes[0];
  const currentSubjective =
    selectedSubjectives.find((item) => item.id === subjectiveId) ?? selectedSubjectives[0];
  const currentStudyCard = selectedFlashcards[cardIndex] ?? selectedFlashcards[0];
  const currentCardObjectiveCard =
    selectedFlashcards[cardObjectiveIndex] ?? selectedFlashcards[0];
  const currentCardSubjectiveCard =
    selectedFlashcards[cardSubjectiveIndex] ?? selectedFlashcards[0];
  const currentCardObjectiveOptions = buildCardObjectiveOptions(
    currentCardObjectiveCard,
    selectedFlashcards
  );
  const currentCardObjectiveSelection = currentCardObjectiveCard
    ? cardObjectiveSelectionMap[currentCardObjectiveCard.id] ?? null
    : null;
  const currentCardObjectiveChecked = currentCardObjectiveCard
    ? cardObjectiveCheckedMap[currentCardObjectiveCard.id] ?? false
    : false;
  const currentCardSubjectiveAnswer = currentCardSubjectiveCard
    ? cardSubjectiveAnswers[currentCardSubjectiveCard.id] ?? ""
    : "";
  const currentCardSubjectiveFeedback = currentCardSubjectiveCard
    ? cardSubjectiveFeedbackMap[currentCardSubjectiveCard.id] ?? null
    : null;
  const currentSubjectiveAnswer = subjectiveAnswers[subjectiveId] ?? "";
  const subjectiveFeedback = subjectiveFeedbackMap[subjectiveId] ?? null;

  const currentObjectiveAnswer = activeObjectiveSubsection
    ? objectiveDrafts[activeObjectiveSubsection.id] ?? ""
    : "";
  const currentObjectiveFeedback = activeObjectiveSubsection
    ? objectiveFeedbackMap[activeObjectiveSubsection.id] ?? null
    : null;
  const currentObjectiveHint = activeObjectiveSubsection
    ? objectiveHintMap[activeObjectiveSubsection.id] ?? null
    : null;
  const currentObjectiveStatus = getObjectiveStatus(currentObjectiveFeedback);

  useEffect(() => {
    if (!mascotFeedback) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setMascotFeedback(null);
    }, 1900);

    return () => window.clearTimeout(timer);
  }, [mascotFeedback]);

  const deliverMascotFeedback = (type, role) => {
    const line = triggerMascotSpeech({ type, role });
    setMascotFeedback({
      ...line,
      type,
    });
    return line;
  };

  const enqueueRewardToasts = (items = []) => {
    items.forEach((item, index) => {
      const toastId = `${Date.now()}-${index}-${Math.random().toString(16).slice(2)}`;

      window.setTimeout(() => {
        setRewardToasts((prev) => [...prev, { id: toastId, ...item }]);

        window.setTimeout(() => {
          setRewardToasts((prev) => prev.filter((toast) => toast.id !== toastId));
        }, 1680);
      }, index * 140);
    });
  };

  const rewardProgress = ({ xp = 0, gems = 0, conceptLabel = "" }) => {
    const rewardItems = [];

    if (conceptLabel) {
      rewardItems.push({
        tone: "concept",
        icon: "✓",
        label: conceptLabel,
      });
    }

    if (xp > 0) {
      const { leveledUp } = addXp(xp);
      playXpSound();
      if (leveledUp) {
        playLevelUpSound();
        rewardItems.push({
          tone: "level",
          icon: "⬆",
          label: `Lv.${level + 1} 달성`,
        });
      }
      rewardItems.push({
        tone: "xp",
        icon: "⭐",
        label: `+${xp} XP`,
      });
    }

    if (gems > 0) {
      addGems(gems);
      playGemSound();
      rewardItems.push({
        tone: "gem",
        icon: "💎",
        label: `+${gems} 보석`,
      });
    }

    return rewardItems;
  };

  useEffect(() => {
    updateChapterState(chapter.id, (previousState) => ({
      ...previousState,
      selectedSubsectionId,
      activeTab,
      cardMode,
      quizMode,
      blankAnswers,
      blankChecks,
      objectiveDrafts,
      objectiveFeedbackMap,
      objectiveHintMap,
      cardIndex,
      cardObjectiveIndex,
      cardSubjectiveIndex,
      quizIndex,
      cardObjectiveSelectionMap,
      cardObjectiveCheckedMap,
      cardSubjectiveAnswers,
      cardSubjectiveFeedbackMap,
      subjectiveId,
      subjectiveAnswers,
      subjectiveFeedbackMap,
    }));
  }, [
    activeTab,
    blankAnswers,
    blankChecks,
    cardIndex,
    cardObjectiveIndex,
    cardObjectiveCheckedMap,
    cardObjectiveSelectionMap,
    cardSubjectiveIndex,
    cardSubjectiveAnswers,
    cardSubjectiveFeedbackMap,
    cardMode,
    chapter.id,
    objectiveDrafts,
    objectiveFeedbackMap,
    objectiveHintMap,
    quizIndex,
    quizMode,
    selectedSubsectionId,
    subjectiveAnswers,
    subjectiveFeedbackMap,
    subjectiveId,
    updateChapterState,
  ]);

  const isBlankQuestionCorrect = (question, index) => {
    const key = `${selectedSubsection.id}-${index}`;
    const values = blankAnswers[key] ?? [];

    return question.answers.every(
      (answer, answerIndex) =>
        (values[answerIndex] ?? "").trim().toLowerCase() === answer.trim().toLowerCase()
    );
  };

  const openObjectivePad = (subsection) => {
    setSelectedSubsectionId(subsection.id);
    setObjectiveModalId(subsection.id);
  };

  const resetCardProgress = (nextMode) => {
    setActiveTab("cards");
    setCardMode(nextMode);

    if (nextMode === "flip") {
      setCardIndex(0);
      setCardFlipped(false);
    }

    if (nextMode === "objective") {
      setCardObjectiveIndex(0);
    }

    if (nextMode === "subjective") {
      setCardSubjectiveIndex(0);
    }
  };

  const resetQuizProgress = (nextMode) => {
    setActiveTab("quiz");
    setQuizMode(nextMode);

    if (nextMode === "objective") {
      setQuizIndex(0);
      setQuizSelection(null);
      setQuizChecked(false);
    }

    if (nextMode === "subjective") {
      setSubjectiveId(selectedSubjectives[0]?.id ?? chapter.subjectiveQuizzes[0]?.id ?? "");
    }
  };

  const handleTopTabClick = (tab) => {
    if (tab === "cards") {
      resetCardProgress("flip");
      return;
    }

    if (tab === "quiz") {
      resetQuizProgress("objective");
      return;
    }

    setActiveTab(tab);
  };

  const handleObjectiveCheck = async () => {
    if (!activeObjectiveSubsection) {
      return;
    }

    const answer = objectiveDrafts[activeObjectiveSubsection.id] ?? "";
    setObjectiveLoadingId(activeObjectiveSubsection.id);

    try {
      let result;
      if (hasGeminiKey()) {
        result = await checkLearningObjectiveWithGemini(activeObjectiveSubsection, answer);
        setObjectiveFeedbackMap((prev) => ({
          ...prev,
          [activeObjectiveSubsection.id]: result,
        }));
        setGradingMode("gemini");
      } else {
        result = checkLearningObjective(activeObjectiveSubsection, answer);
        setObjectiveFeedbackMap((prev) => ({
          ...prev,
          [activeObjectiveSubsection.id]: result,
        }));
        setGradingMode("local");
      }

      if (result.score >= 80) {
        playCorrectSound();
        if (!rewards.objectives[activeObjectiveSubsection.id]) {
          markReward("objectives", activeObjectiveSubsection.id);
          enqueueRewardToasts(
            rewardProgress({ xp: 50, gems: 2, conceptLabel: "학습목표 달성" })
          );
        }
        deliverMascotFeedback("success", "scholar");
      } else {
        playIncorrectSound();
        deliverMascotFeedback("fail", "scholar");
      }
    } catch (error) {
      const result = checkLearningObjective(activeObjectiveSubsection, answer);
      setObjectiveFeedbackMap((prev) => ({
        ...prev,
        [activeObjectiveSubsection.id]: result,
      }));
      setGradingMode("local");
      if (result.score >= 80) {
        playCorrectSound();
        if (!rewards.objectives[activeObjectiveSubsection.id]) {
          markReward("objectives", activeObjectiveSubsection.id);
          enqueueRewardToasts(
            rewardProgress({ xp: 50, gems: 2, conceptLabel: "학습목표 달성" })
          );
        }
        deliverMascotFeedback("success", "scholar");
      } else {
        playIncorrectSound();
        deliverMascotFeedback("fail", "scholar");
      }
      console.error(error);
    } finally {
      setObjectiveLoadingId(null);
    }
  };

  const handleObjectiveHint = async () => {
    if (!activeObjectiveSubsection) {
      return;
    }

    const answer = objectiveDrafts[activeObjectiveSubsection.id] ?? "";
    setObjectiveHintLoadingId(activeObjectiveSubsection.id);

    try {
      if (hasGeminiKey()) {
        const result = await createLearningObjectiveHintWithGemini(
          activeObjectiveSubsection,
          answer
        );
        setObjectiveHintMap((prev) => ({
          ...prev,
          [activeObjectiveSubsection.id]: result,
        }));
        setGradingMode("gemini");
      } else {
        const result = createLearningObjectiveHint(activeObjectiveSubsection, answer);
        setObjectiveHintMap((prev) => ({
          ...prev,
          [activeObjectiveSubsection.id]: result,
        }));
        setGradingMode("local");
      }
      deliverMascotFeedback("hint", "scholar");
    } catch (error) {
      const result = createLearningObjectiveHint(activeObjectiveSubsection, answer);
      setObjectiveHintMap((prev) => ({
        ...prev,
        [activeObjectiveSubsection.id]: result,
      }));
      setGradingMode("local");
      deliverMascotFeedback("hint", "scholar");
      console.error(error);
    } finally {
      setObjectiveHintLoadingId(null);
    }
  };

  const handleSubjectiveCheck = async () => {
    setSubjectiveLoading(true);
    try {
      let result;
      if (hasGeminiKey()) {
        result = await gradeSubjectiveAnswerWithGemini(
          currentSubjective.question,
          currentSubjective.expectedAnswer,
          currentSubjectiveAnswer
        );
        setSubjectiveFeedbackMap((prev) => ({
          ...prev,
          [subjectiveId]: result,
        }));
        setGradingMode("gemini");
      } else {
        result = gradeSubjectiveAnswer(currentSubjective.expectedAnswer, currentSubjectiveAnswer);
        setSubjectiveFeedbackMap((prev) => ({
          ...prev,
          [subjectiveId]: result,
        }));
        setGradingMode("local");
      }

      if (["A", "B"].includes(result.grade)) {
        playCorrectSound();
        if (!rewards.subjectives[subjectiveId]) {
          markReward("subjectives", subjectiveId);
          enqueueRewardToasts(
            rewardProgress({ xp: 30, gems: 1, conceptLabel: "서술형 통과" })
          );
        }
        deliverMascotFeedback("success", "king");
      } else {
        playIncorrectSound();
        deliverMascotFeedback("fail", "king");
      }
    } catch (error) {
      const result = gradeSubjectiveAnswer(currentSubjective.expectedAnswer, currentSubjectiveAnswer);
      setSubjectiveFeedbackMap((prev) => ({
        ...prev,
        [subjectiveId]: result,
      }));
      setGradingMode("local");
      if (["A", "B"].includes(result.grade)) {
        playCorrectSound();
        if (!rewards.subjectives[subjectiveId]) {
          markReward("subjectives", subjectiveId);
          enqueueRewardToasts(
            rewardProgress({ xp: 30, gems: 1, conceptLabel: "서술형 통과" })
          );
        }
        deliverMascotFeedback("success", "king");
      } else {
        playIncorrectSound();
        deliverMascotFeedback("fail", "king");
      }
      console.error(error);
    } finally {
      setSubjectiveLoading(false);
    }
  };

  const handleCardObjectiveSubmit = () => {
    if (!currentCardObjectiveCard) {
      return;
    }

    setCardObjectiveCheckedMap((prev) => ({
      ...prev,
      [currentCardObjectiveCard.id]: true,
    }));

    if (
      currentCardObjectiveOptions[currentCardObjectiveSelection] ===
      (currentCardObjectiveCard.objectiveAnswer ?? currentCardObjectiveCard.term)
    ) {
      playCorrectSound();
      enqueueRewardToasts(rewardProgress({ conceptLabel: "개념 확인 완료" }));
      deliverMascotFeedback("success", "general");
      return;
    }

    playIncorrectSound();
    deliverMascotFeedback("fail", "general");
  };

  const handleCardSubjectiveCheck = async () => {
    if (!currentCardSubjectiveCard) {
      return;
    }

    setCardSubjectiveLoadingId(currentCardSubjectiveCard.id);

    try {
      let result;

      if (hasGeminiKey()) {
        result = await gradeSubjectiveAnswerWithGemini(
          currentCardSubjectiveCard.subjectivePrompt ??
            `${currentCardSubjectiveCard.term}의 뜻을 자신의 말로 설명하시오.`,
          currentCardSubjectiveCard.subjectiveExpectedAnswer ??
            currentCardSubjectiveCard.definition,
          currentCardSubjectiveAnswer
        );
        setGradingMode("gemini");
      } else {
        result = gradeSubjectiveAnswer(
          currentCardSubjectiveCard.subjectiveExpectedAnswer ??
            currentCardSubjectiveCard.definition,
          currentCardSubjectiveAnswer
        );
        setGradingMode("local");
      }

      setCardSubjectiveFeedbackMap((prev) => ({
        ...prev,
        [currentCardSubjectiveCard.id]: result,
      }));

      if (["A", "B"].includes(result.grade)) {
        playCorrectSound();
        enqueueRewardToasts(rewardProgress({ conceptLabel: "개념 설명 성공" }));
        deliverMascotFeedback("success", "scholar");
      } else {
        playIncorrectSound();
        deliverMascotFeedback("fail", "scholar");
      }
    } catch (error) {
      const result = gradeSubjectiveAnswer(
        currentCardSubjectiveCard.subjectiveExpectedAnswer ??
          currentCardSubjectiveCard.definition,
        currentCardSubjectiveAnswer
      );
      setCardSubjectiveFeedbackMap((prev) => ({
        ...prev,
        [currentCardSubjectiveCard.id]: result,
      }));
      setGradingMode("local");
      if (["A", "B"].includes(result.grade)) {
        playCorrectSound();
        enqueueRewardToasts(rewardProgress({ conceptLabel: "개념 설명 성공" }));
        deliverMascotFeedback("success", "scholar");
      } else {
        playIncorrectSound();
        deliverMascotFeedback("fail", "scholar");
      }
      console.error(error);
    } finally {
      setCardSubjectiveLoadingId(null);
    }
  };

  const handleObjectiveQuizSubmit = () => {
    setQuizChecked(true);

    if (quizSelection === null || !currentQuiz) {
      return;
    }

    if (quizSelection === currentQuiz.answer) {
      playCorrectSound();
      if (!rewards.quizzes[currentQuiz.id]) {
        markReward("quizzes", currentQuiz.id);
        enqueueRewardToasts(rewardProgress({ xp: 15, conceptLabel: "실전 퀴즈 정답" }));
      }
      deliverMascotFeedback("success", "general");
    } else {
      playIncorrectSound();
      deliverMascotFeedback("fail", "general");
    }
  };

  return (
    <div className="chapter-shell">
      <div className="chapter-topbar">
        <div>
          <Link className="back-link" to="/">
            <button
              className="back-link-button"
              onClick={(event) => {
                event.preventDefault();
                navigate("/");
              }}
              type="button"
            >
              홈으로
            </button>
          </Link>
          <p className="eyebrow">Ethics Chapter</p>
          <h1>{chapter.subtitle}</h1>
          <p className="chapter-summary">{chapter.summary}</p>
        </div>
      </div>

      <div className="chapter-layout">
        <aside className="chapter-sidebar">
          <div className="sidebar-card">
            <p className="sidebar-title">소단원 선택</p>
            {chapter.sections.map((section) => (
              <div className="sidebar-group" key={section.id}>
                <strong>{section.title}</strong>
                {section.subsections.map((subsection) => (
                  <button
                    className={
                      subsection.id === selectedSubsection.id
                        ? "sidebar-item active"
                        : "sidebar-item"
                    }
                    key={subsection.id}
                    onClick={() => {
                      setSelectedSubsectionId(subsection.id);
                      setActiveTab("overview");
                      setCardIndex(0);
                      setCardObjectiveIndex(0);
                      setCardSubjectiveIndex(0);
                      setCardFlipped(false);
                      setQuizIndex(0);
                      setQuizSelection(null);
                      setQuizChecked(false);
                      setQuizMode("objective");
                      const subsectionSubjectives = chapter.subjectiveQuizzes.filter(
                        (item) => item.subsectionId === subsection.id
                      );
                      setSubjectiveId(subsectionSubjectives[0]?.id ?? "");
                      setSubjectiveFeedbackMap((prev) => {
                        const next = { ...prev };
                        subsectionSubjectives.forEach((item) => {
                          if (!(item.id in next)) {
                            next[item.id] = null;
                          }
                        });
                        return next;
                      });
                    }}
                    type="button"
                  >
                    <span>{subsection.title}</span>
                    <small>{subsection.page}</small>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </aside>

        <main className="chapter-main">
          <section className="tabs-card">
            <div className="tab-row">
              {topTabs.map((tab) => {
                const isActive =
                  (tab === "overview" && activeTab === "overview") ||
                  (tab === "blanks" && activeTab === "blanks") ||
                  (tab === "cards" && activeTab === "cards") ||
                  (tab === "quiz" && activeTab === "quiz");

                return (
                  <button
                    className={isActive ? "tab-button active" : "tab-button"}
                    key={tab}
                    onClick={() => handleTopTabClick(tab)}
                    type="button"
                  >
                    {tab === "overview" && "학습 목표"}
                    {tab === "blanks" && "빈칸 훈련"}
                    {tab === "cards" && "도덕 카드 (개념 정복)"}
                    {tab === "quiz" && "실전 퀴즈"}
                  </button>
                );
              })}
            </div>

            {activeTab === "overview" && (
              <div className="tab-panel">
                {chapter.sections.map((section) => (
                  <article className="objective-section-card" key={section.id}>
                    <h3>{section.title}</h3>
                    <div className="objective-list">
                      {section.subsections.map((subsection) => {
                        const feedback = objectiveFeedbackMap[subsection.id] ?? null;
                        const status = getObjectiveStatus(feedback);

                        return (
                          <button
                            className="objective-item"
                            key={subsection.id}
                            onClick={() => openObjectivePad(subsection)}
                            type="button"
                          >
                            <span
                              className={`objective-item-marker objective-item-marker-${status.tone}`}
                            />
                            <div className="objective-item-copy">
                              <div className="objective-item-head">
                                <strong>{subsection.title}</strong>
                                <small>{status.label}</small>
                              </div>
                              <p>{subsection.objective}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </article>
                ))}
              </div>
            )}

            {activeTab === "blanks" && (
              <div className="tab-panel">
                {selectedSubsection.fillInTheBlanks.map((item, index) => {
                  const key = `${selectedSubsection.id}-${index}`;
                  const userValues = blankAnswers[key] ?? [];
                  const checked = blankChecks[key] ?? false;
                  const isCorrect = isBlankQuestionCorrect(item, index);
                  const segments = item.text.split(/\[(.*?)\]/g);

                  return (
                    <article className="blank-card" key={key}>
                      <div className="blank-sentence">
                        <strong>Q{index + 1}.</strong>
                        <p>
                          {segments.map((segment, segmentIndex) =>
                            segmentIndex % 2 === 0 ? (
                              <span key={`${key}-text-${segmentIndex}`}>{segment}</span>
                            ) : (
                              <input
                                className="inline-blank-input"
                                key={`${key}-answer-${segmentIndex}`}
                                onChange={(event) => {
                                  const answerIndex = Math.floor(segmentIndex / 2);
                                  setBlankAnswers((prev) => {
                                    const nextValues = [...(prev[key] ?? [])];
                                    nextValues[answerIndex] = event.target.value;
                                    return {
                                      ...prev,
                                      [key]: nextValues,
                                    };
                                  });
                                  setBlankChecks((prev) => ({
                                    ...prev,
                                    [key]: false,
                                  }));
                                }}
                                placeholder="정답"
                                value={userValues[Math.floor(segmentIndex / 2)] ?? ""}
                              />
                            )
                          )}
                        </p>
                      </div>
                      <div className="blank-actions">
                        <button
                          className="ghost-button"
                          onClick={() => {
                            setBlankChecks((prev) => ({
                              ...prev,
                              [key]: true,
                            }));
                            setBlankAnswers((prev) => {
                              const nextValues = [...(prev[key] ?? [])];
                              const correctedValues = item.answers.map((answer, answerIndex) => {
                                const currentValue = nextValues[answerIndex] ?? "";
                                return currentValue.trim().toLowerCase() === answer.trim().toLowerCase()
                                  ? currentValue
                                  : answer;
                              });

                              return {
                                ...prev,
                                [key]: correctedValues,
                              };
                            });
                          }}
                          type="button"
                        >
                          정답 확인
                        </button>
                        <span
                          className={
                            checked && isCorrect ? "answer-chip correct" : "answer-chip"
                          }
                        >
                          {checked ? (isCorrect ? "정답" : "다시 확인") : "작성 중"}
                        </span>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {activeTab === "cards" && (
              <div className="tab-panel">
                <div className="card-mode-row">
                  {cardModes.map((mode) => (
                    <button
                      className={cardMode === mode ? "tab-button active" : "tab-button"}
                      key={mode}
                      onClick={() => resetCardProgress(mode)}
                      type="button"
                    >
                      {mode === "flip" && "카드 뒤집기"}
                      {mode === "objective" && "선택형 퀴즈"}
                      {mode === "subjective" && "서술형 퀴즈"}
                    </button>
                  ))}
                </div>

                {cardMode === "flip" && currentStudyCard && (
                  <div className="card-study-panel">
                    <div className="card-study-meta">
                      <span>{selectedSection.title} 카드 수: {selectedFlashcards.length}장</span>
                      <span>
                        진행률: {cardIndex + 1} / {selectedFlashcards.length}
                      </span>
                    </div>
                    <button
                      className={cardFlipped ? "study-flashcard revealed" : "study-flashcard"}
                      onClick={() => setCardFlipped((prev) => !prev)}
                      type="button"
                    >
                      <span>{currentStudyCard.sectionTitle}</span>
                      <strong>
                        {cardFlipped ? currentStudyCard.definition : currentStudyCard.term}
                      </strong>
                      <small>
                        {cardFlipped ? "다시 클릭하면 용어로 돌아갑니다." : "클릭하여 뜻 확인하기"}
                      </small>
                    </button>
                    <div className="card-study-nav">
                      <button
                        className="ghost-button"
                        disabled={cardIndex === 0}
                        onClick={() => {
                          setCardIndex((prev) => Math.max(prev - 1, 0));
                          setCardFlipped(false);
                        }}
                        type="button"
                      >
                        이전 카드
                      </button>
                      <button
                        className="ghost-button"
                        disabled={cardIndex === selectedFlashcards.length - 1}
                        onClick={() => {
                          setCardIndex((prev) =>
                            Math.min(prev + 1, selectedFlashcards.length - 1)
                          );
                          setCardFlipped(false);
                        }}
                        type="button"
                      >
                        다음 카드
                      </button>
                    </div>
                  </div>
                )}

                {cardMode === "objective" && currentCardObjectiveCard && (
                  <div className="card-study-panel quiz-panel">
                    <div className="card-study-meta">
                      <span>
                        카드 선택형 문항: {cardObjectiveIndex + 1} / {selectedFlashcards.length}
                      </span>
                      <span>현재 점검: 카드 개념 선택형 확인</span>
                    </div>
                    <div className="panel-block quiz-question-card">
                      <h3>다음 설명에 해당하는 도덕 개념은 무엇인가요?</h3>
                      <p className="card-check-prompt">
                        {currentCardObjectiveCard.objectivePrompt ??
                          `"${currentCardObjectiveCard.definition}"`}
                      </p>
                      <div className="option-list">
                        {currentCardObjectiveOptions.map((option, index) => {
                          const selected = currentCardObjectiveSelection === index;
                          const correct =
                            currentCardObjectiveChecked &&
                            option ===
                              (currentCardObjectiveCard.objectiveAnswer ??
                                currentCardObjectiveCard.term);
                          const wrong =
                            currentCardObjectiveChecked &&
                            selected &&
                            option !==
                              (currentCardObjectiveCard.objectiveAnswer ??
                                currentCardObjectiveCard.term);
                          const className = correct
                            ? "option-button correct"
                            : wrong
                              ? "option-button wrong"
                              : selected
                                ? "option-button selected"
                                : "option-button";

                          return (
                            <button
                              className={className}
                              key={`${currentCardObjectiveCard.id}-${option}`}
                              onClick={() =>
                                setCardObjectiveSelectionMap((prev) => ({
                                  ...prev,
                                  [currentCardObjectiveCard.id]: index,
                                }))
                              }
                              type="button"
                            >
                              {option}
                            </button>
                          );
                        })}
                      </div>
                      <div className="inline-actions">
                        <button
                          className="primary-button"
                          disabled={currentCardObjectiveSelection === null}
                          onClick={handleCardObjectiveSubmit}
                          type="button"
                        >
                          답안 제출
                        </button>
                        <button
                          className="ghost-button"
                          onClick={() => {
                            setCardObjectiveIndex((prev) =>
                              Math.min(prev + 1, selectedFlashcards.length - 1)
                            );
                          }}
                          type="button"
                        >
                          다음 카드 문제
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {cardMode === "subjective" && currentCardSubjectiveCard && (
                  <div className="card-study-panel subjective-panel">
                    <div className="card-study-meta">
                      <span>
                        카드 서술형 문항: {cardSubjectiveIndex + 1} / {selectedFlashcards.length}
                      </span>
                      <span>
                        채점: {gradingMode === "gemini" ? "Gemini AI" : "로컬 기준"}
                      </span>
                    </div>
                    <div className="panel-block">
                      <h3>
                        {currentCardSubjectiveCard.subjectivePrompt ??
                          `${currentCardSubjectiveCard.term}의 뜻을 자신의 말로 설명해 보세요.`}
                      </h3>
                      <p className="card-check-caption">
                        카드에서 배운 뜻을 떠올려 2~4문장으로 써 보세요.
                      </p>
                      <textarea
                        className="study-textarea"
                        onChange={(event) =>
                          setCardSubjectiveAnswers((prev) => ({
                            ...prev,
                            [currentCardSubjectiveCard.id]: event.target.value,
                          }))
                        }
                        placeholder={`${currentCardSubjectiveCard.term}과 관련된 핵심 내용을 자기 말로 정리해 보세요.`}
                        value={currentCardSubjectiveAnswer}
                      />
                      <div className="inline-actions">
                        <button
                          className="primary-button"
                          disabled={
                            cardSubjectiveLoadingId === currentCardSubjectiveCard.id ||
                            !currentCardSubjectiveAnswer.trim()
                          }
                          onClick={handleCardSubjectiveCheck}
                          type="button"
                        >
                          {cardSubjectiveLoadingId === currentCardSubjectiveCard.id
                            ? "채점 중..."
                            : "채점 받기"}
                        </button>
                        <button
                          className="ghost-button"
                          onClick={() => {
                            setCardSubjectiveIndex((prev) =>
                              Math.min(prev + 1, selectedFlashcards.length - 1)
                            );
                          }}
                          type="button"
                        >
                          다음 카드 문제
                        </button>
                      </div>
                      {currentCardSubjectiveFeedback && (
                        <div className="feedback-card card-inline-feedback">
                          <strong>예상 등급 {currentCardSubjectiveFeedback.grade}</strong>
                          <p>{currentCardSubjectiveFeedback.feedback}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

              </div>
            )}

            {activeTab === "quiz" && (
              <div className="tab-panel">
                <div className="card-mode-row">
                  {quizModes.map((mode) => (
                    <button
                      className={quizMode === mode ? "tab-button active" : "tab-button"}
                      key={mode}
                      onClick={() => resetQuizProgress(mode)}
                      type="button"
                    >
                      {mode === "objective" && "객관식 테스트"}
                      {mode === "subjective" && "서술형 테스트"}
                    </button>
                  ))}
                </div>

                {quizMode === "objective" && currentQuiz && (
                  <div className="card-study-panel quiz-panel">
                    <div className="card-study-meta">
                      <span>
                        테스트 문항: {quizIndex + 1} / {selectedQuizzes.length}
                      </span>
                      <span>현재 점검: 카드에서 배운 개념 객관식</span>
                    </div>
                    <div className="panel-block quiz-question-card">
                      <h3>{currentQuiz.question}</h3>
                      <div className="option-list">
                        {currentQuiz.options.map((option, index) => {
                          const selected = quizSelection === index;
                          const correct = quizChecked && currentQuiz.answer === index;
                          const wrong = quizChecked && selected && currentQuiz.answer !== index;
                          const className = correct
                            ? "option-button correct"
                            : wrong
                              ? "option-button wrong"
                              : selected
                                ? "option-button selected"
                                : "option-button";

                          return (
                            <button
                              className={className}
                              key={option}
                              onClick={() => setQuizSelection(index)}
                              type="button"
                            >
                              {option}
                            </button>
                          );
                        })}
                      </div>
                      <div className="inline-actions">
                        <button
                          className="primary-button"
                          disabled={quizSelection === null}
                          onClick={handleObjectiveQuizSubmit}
                          type="button"
                        >
                          답안 제출
                        </button>
                        <button
                          className="ghost-button"
                          onClick={() => {
                            setQuizIndex((prev) => (prev + 1) % selectedQuizzes.length);
                            setQuizSelection(null);
                            setQuizChecked(false);
                          }}
                          type="button"
                        >
                          다음 문제
                        </button>
                      </div>
                      {quizChecked && (
                        <div className="feedback-card">
                          <strong>
                            {quizSelection === currentQuiz.answer
                              ? "정답입니다."
                              : "다시 확인해 보세요."}
                          </strong>
                          <p>{currentQuiz.explanation}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {quizMode === "subjective" && (
                  <div className="card-study-panel subjective-panel">
                    <div className="card-study-meta">
                      <span>
                        서술형 문항:{" "}
                        {selectedSubjectives.findIndex((item) => item.id === subjectiveId) + 1} /{" "}
                        {selectedSubjectives.length}
                      </span>
                      <span>
                        채점: {gradingMode === "gemini" ? "Gemini AI" : "로컬 기준"}
                      </span>
                    </div>
                    <div className="subjective-selector">
                      {selectedSubjectives.map((quiz) => (
                        <button
                          className={subjectiveId === quiz.id ? "mini-button active" : "mini-button"}
                          key={quiz.id}
                          onClick={() => {
                            setSubjectiveId(quiz.id);
                            setSubjectiveFeedbackMap((prev) => ({
                              ...prev,
                              [quiz.id]: prev[quiz.id] ?? null,
                            }));
                          }}
                          type="button"
                        >
                          문항 {selectedSubjectives.findIndex((item) => item.id === quiz.id) + 1}
                        </button>
                      ))}
                    </div>
                    <div className="panel-block">
                      <h3>{currentSubjective.question}</h3>
                      <textarea
                        className="study-textarea"
                        onChange={(event) =>
                          setSubjectiveAnswers((prev) => ({
                            ...prev,
                            [subjectiveId]: event.target.value,
                          }))
                        }
                        placeholder="핵심 개념과 이유를 포함해 3~5문장으로 답을 정리해 보세요."
                        value={currentSubjectiveAnswer}
                      />
                      <div className="inline-actions">
                        <button
                          className="primary-button"
                          disabled={subjectiveLoading || !currentSubjectiveAnswer.trim()}
                          onClick={handleSubjectiveCheck}
                          type="button"
                        >
                          {subjectiveLoading ? "채점 중..." : "채점 받기"}
                        </button>
                      </div>
                      {subjectiveFeedback && (
                        <div className="feedback-card">
                          <strong>예상 등급 {subjectiveFeedback.grade}</strong>
                          <p>{subjectiveFeedback.feedback}</p>
                          <details>
                            <summary>모범 답안 보기</summary>
                            <p className="expected-answer">{currentSubjective.expectedAnswer}</p>
                          </details>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        </main>
      </div>

      {activeObjectiveSubsection && (
        <div
          className="objective-modal-backdrop"
          onClick={() => setObjectiveModalId(null)}
          role="presentation"
        >
          <section
            className="objective-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-labelledby="objective-modal-title"
            aria-modal="true"
          >
            <div className="objective-modal-header">
              <div>
                <p className="eyebrow">학습목표 달성 노트패드</p>
                <h2 id="objective-modal-title">{activeObjectiveSubsection.title}</h2>
              </div>
              <button
                className="objective-modal-close"
                onClick={() => setObjectiveModalId(null)}
                type="button"
              >
                닫기
              </button>
            </div>

            <div className="objective-modal-body">
              <article className={`objective-status-card ${currentObjectiveStatus.tone}`}>
                <span>{currentObjectiveStatus.label}</span>
                <strong>{activeObjectiveSubsection.title}</strong>
                <p>{activeObjectiveSubsection.objective}</p>
              </article>

              <div className="panel-block">
                <h3>서술하기</h3>
                <p>
                  이 소단원의 핵심 내용을 포함해 자유롭게 정리해 보세요. 교과서 용어를
                  활용하되, 자신의 말로 설명하는 것이 중요합니다.
                </p>
                <textarea
                  className="study-textarea objective-notepad"
                  onChange={(event) =>
                    setObjectiveDrafts((prev) => ({
                      ...prev,
                      [activeObjectiveSubsection.id]: event.target.value,
                    }))
                  }
                  placeholder="여기에 학습한 내용을 충분히 적어 보세요."
                  value={currentObjectiveAnswer}
                />
              </div>

              {currentObjectiveHint && (
                <div className="feedback-card hint-card">
                  <strong>AI 힌트</strong>
                  <p>{currentObjectiveHint.hint}</p>
                  {currentObjectiveHint.focusKeywords?.length > 0 && (
                    <small>집중할 핵심어: {currentObjectiveHint.focusKeywords.join(", ")}</small>
                  )}
                </div>
              )}

              {currentObjectiveFeedback && (
                <div className="feedback-card">
                  <strong>이해도 {currentObjectiveFeedback.score}점</strong>
                  <p>{currentObjectiveFeedback.feedback}</p>
                  {currentObjectiveFeedback.missingKeywords?.length > 0 && (
                    <p className="feedback-detail">
                      더 보완할 핵심어: {currentObjectiveFeedback.missingKeywords.join(", ")}
                    </p>
                  )}
                  {currentObjectiveFeedback.improvementSteps?.length > 0 && (
                    <div className="feedback-actions-list">
                      {currentObjectiveFeedback.improvementSteps.map((step) => (
                        <p className="feedback-detail" key={step}>
                          점수 올리는 방법: {step}
                        </p>
                      ))}
                    </div>
                  )}
                  <small>
                    잡힌 핵심어:{" "}
                    {currentObjectiveFeedback.matchedKeywords.length
                      ? currentObjectiveFeedback.matchedKeywords.join(", ")
                      : "아직 없음"}
                  </small>
                </div>
              )}
            </div>

            <div className="objective-modal-footer">
              <button
                className="ghost-button"
                onClick={() => setObjectiveModalId(null)}
                type="button"
              >
                닫기
              </button>
              <button
                className="ghost-button hint-button"
                disabled={
                  objectiveHintLoadingId === activeObjectiveSubsection.id ||
                  Boolean(objectiveHintMap[activeObjectiveSubsection.id])
                }
                onClick={handleObjectiveHint}
                type="button"
              >
                {objectiveHintLoadingId === activeObjectiveSubsection.id
                  ? "힌트 준비 중..."
                  : objectiveHintMap[activeObjectiveSubsection.id]
                    ? "AI 힌트 사용 완료"
                    : "AI 힌트 (1회)"}
              </button>
              <button
                className="primary-button"
                disabled={
                  objectiveLoadingId === activeObjectiveSubsection.id ||
                  !currentObjectiveAnswer.trim()
                }
                onClick={handleObjectiveCheck}
                type="button"
              >
                {objectiveLoadingId === activeObjectiveSubsection.id
                  ? "채점 중..."
                  : "제출하고 채점받기"}
              </button>
            </div>
          </section>
        </div>
      )}

      {rewardToasts.length > 0 && (
        <div className="reward-toast-stack" aria-live="polite">
          {rewardToasts.map((toast) => (
            <div className={`reward-toast reward-toast--${toast.tone}`} key={toast.id}>
              <span className="reward-toast-icon">{toast.icon}</span>
              <strong>{toast.label}</strong>
            </div>
          ))}
        </div>
      )}

      {mascotFeedback && (
        <div className={`feedback-overlay feedback-overlay--${mascotFeedback.type}`}>
          <div className={`feedback-modal feedback-modal--${mascotFeedback.type}`}>
            <img
              alt="도덕 길잡이 캐릭터"
              className="feedback-character"
              src={
                "/images/ethics-guide-mascot.svg"
              }
            />
            <div className="feedback-line">{mascotFeedback.text}</div>
          </div>
        </div>
      )}
    </div>
  );
}
