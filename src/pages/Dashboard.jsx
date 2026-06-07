import { Link } from "react-router-dom";
import { chapters } from "../data/chapters";
import { useLearning } from "../context/useLearning";

export default function Dashboard() {
  const { learnerName, level, xp } = useLearning();

  return (
    <div className="page-shell">
      <section className="dashboard-hero">
        <div>
          <p className="eyebrow">Ethics Study</p>
          <h2>{learnerName}의 도덕 학습</h2>
          <p>
            소단원별 학습목표를 스스로 설명하고, 빈칸 훈련과 개념 카드, 실전 퀴즈로 이해를
            점검해 보세요.
          </p>
        </div>
        <div className="dashboard-hero-stat">
          <span>현재 학습 레벨</span>
          <strong>Lv.{level}</strong>
          <small>{xp} XP 누적</small>
        </div>
      </section>
      <section className="dashboard-section">
        <div className="chapter-card-grid">
          {chapters.map((chapter) => (
            <article className="chapter-card" key={chapter.id}>
              <p className="chapter-card-group">{chapter.title}</p>
              <h2>{chapter.subtitle}</h2>
              <ul className="chapter-card-list">
                {chapter.sections.map((section) => (
                  <li key={section.id}>
                    <strong>{section.title}</strong>
                    <span>{section.subsections[0].title}</span>
                  </li>
                ))}
              </ul>
              <Link className="primary-button chapter-card-button" to={`/chapter/${chapter.id}`}>
                이 단원 보기
              </Link>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
