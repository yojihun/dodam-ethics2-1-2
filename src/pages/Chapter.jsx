import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { chapters, quizzes } from "../data/chapters";
import { checkLearningObjective, gradeSubjectiveAnswer } from "../utils/localGrader";
import {
  checkLearningObjectiveWithGemini,
  gradeSubjectiveAnswerWithGemini,
  hasGeminiKey,
} from "../utils/gemini";
import { playNarration, stopNarration } from "../utils/speech";

const tabs = ["overview", "blanks", "cards", "quiz", "subjective"];

export default function Chapter() {
  const { chapterId } = useParams();
  const chapter = chapters.find((item) => item.id === chapterId) ?? chapters[0];
  const allSubsections = chapter.sections.flatMap((section) => section.subsections);

  const [selectedSubsectionId, setSelectedSubsectionId] = useState(allSubsections[0].id);
  const [activeTab, setActiveTab] = useState("overview");
  const [blankAnswers, setBlankAnswers] = useState({});
  const [revealedCards, setRevealedCards] = useState({});
  const [objectiveAnswer, setObjectiveAnswer] = useState("");
  const [objectiveFeedback, setObjectiveFeedback] = useState(null);
  const [objectiveLoading, setObjectiveLoading] = useState(false);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizSelection, setQuizSelection] = useState(null);
  const [quizChecked, setQuizChecked] = useState(false);
  const [subjectiveId, setSubjectiveId] = useState(chapter.subjectiveQuizzes[0].id);
  const [subjectiveAnswer, setSubjectiveAnswer] = useState("");
  const [subjectiveFeedback, setSubjectiveFeedback] = useState(null);
  const [subjectiveLoading, setSubjectiveLoading] = useState(false);
  const [gradingMode, setGradingMode] = useState(hasGeminiKey() ? "gemini" : "local");

  const selectedSubsection =
    allSubsections.find((item) => item.id === selectedSubsectionId) ?? allSubsections[0];

  const chapterQuizzes = quizzes.filter((quiz) => quiz.chapterId === chapter.id);
  const currentQuiz = chapterQuizzes[quizIndex];
  const currentSubjective =
    chapter.subjectiveQuizzes.find((item) => item.id === subjectiveId) ??
    chapter.subjectiveQuizzes[0];

  const solvedBlankCount = selectedSubsection.fillInTheBlanks.filter((item, index) => {
    const key = `${selectedSubsection.id}-${index}`;
    return (
      (blankAnswers[key] ?? "").trim().toLowerCase() === item.answer.trim().toLowerCase()
    );
  }).length;

  const handleObjectiveCheck = async () => {
    setObjectiveLoading(true);
    try {
      if (hasGeminiKey()) {
        const result = await checkLearningObjectiveWithGemini(
          selectedSubsection,
          objectiveAnswer
        );
        setObjectiveFeedback(result);
        setGradingMode("gemini");
      } else {
        setObjectiveFeedback(checkLearningObjective(selectedSubsection, objectiveAnswer));
        setGradingMode("local");
      }
    } catch (error) {
      setObjectiveFeedback(checkLearningObjective(selectedSubsection, objectiveAnswer));
      setGradingMode("local");
      console.error(error);
    } finally {
      setObjectiveLoading(false);
    }
  };

  const handleSubjectiveCheck = async () => {
    setSubjectiveLoading(true);
    try {
      if (hasGeminiKey()) {
        const result = await gradeSubjectiveAnswerWithGemini(
          currentSubjective.question,
          currentSubjective.expectedAnswer,
          subjectiveAnswer
        );
        setSubjectiveFeedback(result);
        setGradingMode("gemini");
      } else {
        setSubjectiveFeedback(
          gradeSubjectiveAnswer(currentSubjective.expectedAnswer, subjectiveAnswer)
        );
        setGradingMode("local");
      }
    } catch (error) {
      setSubjectiveFeedback(
        gradeSubjectiveAnswer(currentSubjective.expectedAnswer, subjectiveAnswer)
      );
      setGradingMode("local");
      console.error(error);
    } finally {
      setSubjectiveLoading(false);
    }
  };

  return (
    <div className="chapter-shell">
      <div className="chapter-topbar">
        <div>
          <Link className="back-link" to="/">
            홈으로
          </Link>
          <p className="eyebrow">Chapter Study</p>
          <h1>{chapter.subtitle}</h1>
          <p className="chapter-summary">{chapter.summary}</p>
        </div>
        <div className="chapter-badge">
          <span>현재 범위</span>
          <strong>{chapter.pageRange}</strong>
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
                      setObjectiveAnswer("");
                      setObjectiveFeedback(null);
                    }}
                    type="button"
                  >
                    <span>{subsection.title}</span>
                    <small>{subsection.page}쪽</small>
                  </button>
                ))}
              </div>
            ))}
          </div>

          <div className="sidebar-card accent">
            <p className="sidebar-title">빠른 점검</p>
            <ul className="compact-list">
              <li>빈칸 정답 수: {solvedBlankCount} / {selectedSubsection.fillInTheBlanks.length}</li>
              <li>객관식 진행: {quizIndex + 1} / {chapterQuizzes.length}</li>
              <li>서술형 문항: {chapter.subjectiveQuizzes.length}개</li>
              <li>채점 방식: {gradingMode === "gemini" ? "Gemini AI" : "로컬 기준"}</li>
            </ul>
          </div>
        </aside>

        <main className="chapter-main">
          <section className="focus-card">
            <div className="focus-head">
              <div>
                <p className="eyebrow">Selected Topic</p>
                <h2>{selectedSubsection.title}</h2>
                <p>{selectedSubsection.objective}</p>
              </div>
              <div className="focus-actions">
                <button
                  className="ghost-button"
                  onClick={() =>
                    playNarration(
                      `${selectedSubsection.title}. ${selectedSubsection.keyPoints.join(" ")}`
                    )
                  }
                  type="button"
                >
                  읽어주기
                </button>
                <button className="ghost-button" onClick={stopNarration} type="button">
                  음성 멈춤
                </button>
              </div>
            </div>
            <div className="keypoint-grid">
              {selectedSubsection.keyPoints.map((point) => (
                <article className="keypoint-card" key={point}>
                  <span>핵심</span>
                  <p>{point}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="tabs-card">
            <div className="tab-row">
              {tabs.map((tab) => (
                <button
                  className={activeTab === tab ? "tab-button active" : "tab-button"}
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  type="button"
                >
                  {tab === "overview" && "개념 설명"}
                  {tab === "blanks" && "빈칸 훈련"}
                  {tab === "cards" && "카드 암기"}
                  {tab === "quiz" && "객관식"}
                  {tab === "subjective" && "서술형"}
                </button>
              ))}
            </div>

            {activeTab === "overview" && (
              <div className="tab-panel">
                <div className="panel-block">
                  <h3>학습 목표 설명해 보기</h3>
                  <p>
                    아래에 직접 설명을 적고 피드백 받기를 누르면 교과서 핵심어를
                    기준으로 부족한 점을 짚어 줍니다.
                  </p>
                  <textarea
                    className="study-textarea"
                    onChange={(event) => setObjectiveAnswer(event.target.value)}
                    placeholder="예: 자아는 나를 알고자 하는 과정에서 드러나는 모습이고..."
                    value={objectiveAnswer}
                  />
                  <div className="inline-actions">
                    <button
                      className="primary-button"
                      disabled={objectiveLoading || !objectiveAnswer.trim()}
                      onClick={handleObjectiveCheck}
                      type="button"
                    >
                      {objectiveLoading ? "채점 중..." : "피드백 받기"}
                    </button>
                  </div>
                  {objectiveFeedback && (
                    <div className="feedback-card">
                      <strong>이해도 {objectiveFeedback.score}점</strong>
                      <p>{objectiveFeedback.feedback}</p>
                      <small>
                        잡힌 핵심어:{" "}
                        {objectiveFeedback.matchedKeywords.length
                          ? objectiveFeedback.matchedKeywords.join(", ")
                          : "아직 없음"}
                      </small>
                    </div>
                  )}
                </div>
                <div className="panel-block">
                  <h3>생각 확장 질문</h3>
                  <ul className="prompt-list">
                    {selectedSubsection.reflectionPrompts.map((prompt) => (
                      <li key={prompt}>{prompt}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {activeTab === "blanks" && (
              <div className="tab-panel">
                {selectedSubsection.fillInTheBlanks.map((item, index) => {
                  const key = `${selectedSubsection.id}-${index}`;
                  const userValue = blankAnswers[key] ?? "";
                  const isCorrect =
                    userValue.trim().toLowerCase() === item.answer.trim().toLowerCase();

                  return (
                    <article className="blank-card" key={key}>
                      <p>{item.sentence.replace(/\[(.*?)\]/g, "____")}</p>
                      <div className="blank-row">
                        <input
                          className="study-input"
                          onChange={(event) =>
                            setBlankAnswers((prev) => ({
                              ...prev,
                              [key]: event.target.value,
                            }))
                          }
                          placeholder="정답 입력"
                          value={userValue}
                        />
                        <span className={isCorrect ? "answer-chip correct" : "answer-chip"}>
                          {isCorrect ? "정답" : "확인 중"}
                        </span>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {activeTab === "cards" && (
              <div className="flashcard-grid">
                {selectedSubsection.flashcards.map((card, index) => {
                  const key = `${selectedSubsection.id}-card-${index}`;
                  const revealed = revealedCards[key] ?? false;
                  return (
                    <button
                      className={revealed ? "flashcard revealed" : "flashcard"}
                      key={key}
                      onClick={() =>
                        setRevealedCards((prev) => ({ ...prev, [key]: !revealed }))
                      }
                      type="button"
                    >
                      <span>{revealed ? "설명" : "용어"}</span>
                      <strong>{revealed ? card.definition : card.term}</strong>
                    </button>
                  );
                })}
              </div>
            )}

            {activeTab === "quiz" && currentQuiz && (
              <div className="tab-panel">
                <div className="quiz-head">
                  <h3>
                    객관식 {quizIndex + 1} / {chapterQuizzes.length}
                  </h3>
                  <p>{currentQuiz.question}</p>
                </div>
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
                    onClick={() => setQuizChecked(true)}
                    type="button"
                  >
                    정답 확인
                  </button>
                  <button
                    className="ghost-button"
                    onClick={() => {
                      setQuizIndex((prev) => (prev + 1) % chapterQuizzes.length);
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
                      {quizSelection === currentQuiz.answer ? "정답입니다." : "다시 확인해 보세요."}
                    </strong>
                    <p>{currentQuiz.explanation}</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "subjective" && (
              <div className="tab-panel">
                <div className="subjective-selector">
                  {chapter.subjectiveQuizzes.map((quiz) => (
                    <button
                      className={subjectiveId === quiz.id ? "mini-button active" : "mini-button"}
                      key={quiz.id}
                      onClick={() => {
                        setSubjectiveId(quiz.id);
                        setSubjectiveAnswer("");
                        setSubjectiveFeedback(null);
                      }}
                      type="button"
                    >
                      {quiz.id.toUpperCase()}
                    </button>
                  ))}
                </div>
                <div className="panel-block">
                  <h3>{currentSubjective.question}</h3>
                  <textarea
                    className="study-textarea"
                    onChange={(event) => setSubjectiveAnswer(event.target.value)}
                    placeholder="핵심 개념, 이유, 예시를 넣어 3~5문장 정도로 써 보세요."
                    value={subjectiveAnswer}
                  />
                  <div className="inline-actions">
                    <button
                      className="primary-button"
                      disabled={subjectiveLoading || !subjectiveAnswer.trim()}
                      onClick={handleSubjectiveCheck}
                      type="button"
                    >
                      {subjectiveLoading ? "채점 중..." : "서술형 채점"}
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
          </section>
        </main>
      </div>
    </div>
  );
}
