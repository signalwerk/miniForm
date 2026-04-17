import {
  Navigate,
  NavLink,
  Outlet,
  createHashRouter,
} from "react-router-dom";
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

function RootRedirect() {
  const { user } = useAuth();
  return <Navigate to={user ? "/forms" : "/auth"} replace />;
}

function AuthRoute() {
  const { user } = useAuth();
  return user ? <Navigate to="/forms" replace /> : <AuthPage />;
}

function NotFoundRedirect() {
  const { user } = useAuth();
  return <Navigate to={user ? "/forms" : "/auth"} replace />;
}

export default function App() {
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

      <Outlet />
    </div>
  );
}

export const router = createHashRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        index: true,
        element: <RootRedirect />,
      },
      {
        path: "auth",
        element: <AuthRoute />,
      },
      {
        element: <RequireAuth />,
        children: [
          {
            path: "forms",
            element: <FormsOverviewPage />,
          },
          {
            path: "forms/:recordId",
            element: <EditorPage />,
          },
        ],
      },
      {
        path: "*",
        element: <NotFoundRedirect />,
      },
    ],
  },
]);
