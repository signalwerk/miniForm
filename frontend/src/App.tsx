import { Navigate, NavLink, Outlet, Route, Routes } from "react-router-dom";
import { EditorPage } from "./components/EditorPage";
import { AuthPage } from "./components/AuthPage";
import { FormsOverviewPage } from "./components/FormsOverviewPage";
import { useAuth } from "./lib/auth-context";

function RequireAuth() {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <Outlet />;
}

function App() {
  const { user } = useAuth();

  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <div>
          <p className="eyebrow">miniForm</p>
          <h1>Form builder</h1>
          <p className="helper-text">Self-hosted editor with PocketBase storage.</p>
        </div>
        <nav aria-label="Main navigation">
          <ul className="app-nav">
            <li>
              <NavLink
                to="/auth"
                className={({ isActive }) =>
                  isActive ? "app-nav__link app-nav__link--active" : "app-nav__link"
                }
              >
                Account
              </NavLink>
            </li>
            {user ? (
              <li>
                <NavLink
                  to="/forms"
                  className={({ isActive }) =>
                    isActive ? "app-nav__link app-nav__link--active" : "app-nav__link"
                  }
                >
                  Forms
                </NavLink>
              </li>
            ) : null}
          </ul>
        </nav>
      </header>

      <Routes>
        <Route path="/" element={<Navigate to={user ? "/forms" : "/auth"} replace />} />
        <Route path="/auth" element={user ? <Navigate to="/forms" replace /> : <AuthPage />} />
        <Route element={<RequireAuth />}>
          <Route path="/forms" element={<FormsOverviewPage />} />
          <Route path="/forms/:recordId" element={<EditorPage />} />
        </Route>
        <Route path="*" element={<Navigate to={user ? "/forms" : "/auth"} replace />} />
      </Routes>
    </div>
  );
}

export default App;
