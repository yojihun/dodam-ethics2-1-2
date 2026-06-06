import { Link } from "react-router-dom";
import { chapters, quizzes } from "../data/chapters";

const studyModes = [
  {
    title: "개념 압축",
    body: "교과서 핵심 문장을 단원별로 빠르게 훑으며 시험 직전 감각을 되살립니다.",
  },
  {
    title: "빈칸 훈련",
    body: "핵심 용어를 직접 입력하며 정의와 개념 연결을 자연스럽게 익힙니다.",
  },
  {
    title: "서술형 대비",
    body: "모범 답안 핵심어를 기준으로 자신의 서술 답안을 점검합니다.",
  },
];

export default function Dashboard() {
  const chapter = chapters[0];
  const subsectionCount = chapter.sections.reduce(
    (total, section) => total + section.subsections.length,
    0
  );

  return (
    <div className="page-shell">
      <section className="hero-card">
        <div className="hero-copy">
          <p className="eyebrow">2026 시험 준비 웹앱</p>
          <h1>{chapter.examTitle}</h1>
          <p className="hero-summary">
            교과서 PDF 내용을 바탕으로 핵심 개념, 빈칸 학습, 카드 암기, 객관식,
            서술형 연습을 한 번에 묶은 도덕 시험 대비 코스입니다.
          </p>
          <div className="hero-actions">
            <Link className="primary-button" to={`/chapter/${chapter.id}`}>
              학습 시작하기
            </Link>
            <a className="ghost-button" href="#overview">
              범위 살펴보기
            </a>
          </div>
        </div>
        <div className="hero-stats">
          <div className="stat-card">
            <span>시험 범위</span>
            <strong>{chapter.pageRange}</strong>
          </div>
          <div className="stat-card">
            <span>학습 소단원</span>
            <strong>{subsectionCount}개</strong>
          </div>
          <div className="stat-card">
            <span>실전 문제</span>
            <strong>{quizzes.length}문항</strong>
          </div>
        </div>
      </section>

      <section className="dashboard-section" id="overview">
        <div className="section-heading">
          <p className="eyebrow">Range Overview</p>
          <h2>이번 범위 핵심 줄기</h2>
        </div>
        <div className="path-grid">
          {chapter.sections.map((section) => (
            <article className="path-card" key={section.id}>
              <p className="path-index">{section.id}</p>
              <h3>{section.title}</h3>
              <ul className="mini-list">
                {section.subsections.map((subsection) => (
                  <li key={subsection.id}>
                    {subsection.title}
                    <span>{subsection.page}쪽</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="dashboard-section">
        <div className="section-heading">
          <p className="eyebrow">Study Flow</p>
          <h2>이 앱에서 하는 공부</h2>
        </div>
        <div className="mode-grid">
          {studyModes.map((mode) => (
            <article className="mode-card" key={mode.title}>
              <h3>{mode.title}</h3>
              <p>{mode.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="dashboard-section">
        <div className="section-heading">
          <p className="eyebrow">Memory Hooks</p>
          <h2>시험 전 꼭 붙잡아 둘 말</h2>
        </div>
        <div className="quote-grid">
          <article className="quote-card">
            <strong>자아</strong>
            <p>나를 알고자 하는 과정에서 드러나는 자신의 모습</p>
          </article>
          <article className="quote-card">
            <strong>도덕</strong>
            <p>인간으로서 마땅히 지켜야 할 도리</p>
          </article>
          <article className="quote-card">
            <strong>도덕적 자아</strong>
            <p>도덕성과 관련한 자신의 모습</p>
          </article>
        </div>
      </section>
    </div>
  );
}
