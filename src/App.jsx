import { Navigate, Route, Routes } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Chapter from "./pages/Chapter";

function App() {
  return (
    <div className="app-frame">
      <Routes>
        <Route element={<Dashboard />} path="/" />
        <Route element={<Chapter />} path="/chapter/:chapterId" />
        <Route element={<Navigate replace to="/" />} path="*" />
      </Routes>
    </div>
  );
}

export default App;
