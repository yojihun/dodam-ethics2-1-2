import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useLearning } from "./context/useLearning";
import Dashboard from "./pages/Dashboard";
import Chapter from "./pages/Chapter";

function App() {
  const { learnerName, level, xp, gems, renameLearner } = useLearning();
  const location = useLocation();

  const handleRename = () => {
    const nextName = window.prompt("학습자 이름을 입력하세요.", learnerName);

    if (!nextName || nextName.trim() === learnerName) {
      return;
    }

    renameLearner(nextName.trim());
  };

  return (
    <div className="app-frame">
      <header className="app-header">
        <h1>시흥은행중학교 2학년 1학기 2차 시험 - 도덕</h1>
        <div className="app-header-meta">
          <div className="header-pill">
            <span>레벨</span>
            <strong>
              Lv.{level} <small>({xp} XP)</small>
            </strong>
          </div>
          <div className="header-pill">
            <span>보석</span>
            <strong>{gems}개</strong>
          </div>
          <div className="header-pill learner-pill">
            <span>학습자</span>
            <strong>{learnerName}</strong>
            <button className="pill-action" onClick={handleRename} type="button">
              변경
            </button>
          </div>
        </div>
      </header>
      <Routes>
        <Route element={<Dashboard />} path="/" />
        <Route
          element={<Chapter key={`${learnerName}-${location.pathname}`} />}
          path="/chapter/:chapterId"
        />
        <Route element={<Navigate replace to="/" />} path="*" />
      </Routes>
    </div>
  );
}

export default App;
