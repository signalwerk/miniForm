import { Navigate, NavLink, Route, Routes } from "react-router-dom";
import { EditorPage } from "./components/EditorPage";
import { ViewerPage } from "./components/ViewerPage";

function App() {
  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <div>
          <p className="eyebrow">miniForm</p>
          <h1>Self-hosted form editor</h1>
        </div>
        <nav aria-label="Main navigation">
          <ul className="app-nav">
            <li>
              <NavLink
                to="/editor"
                className={({ isActive }) =>
                  isActive ? "app-nav__link app-nav__link--active" : "app-nav__link"
                }
              >
                Editor
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/viewer"
                className={({ isActive }) =>
                  isActive ? "app-nav__link app-nav__link--active" : "app-nav__link"
                }
              >
                Viewer
              </NavLink>
            </li>
          </ul>
        </nav>
      </header>

      <Routes>
        <Route path="/" element={<Navigate to="/editor" replace />} />
        <Route path="/editor" element={<EditorPage />} />
        <Route path="/viewer" element={<ViewerPage />} />
      </Routes>
    </div>
  );
}

export default App;
