import { useState } from "react";
import type { BaseAuthStore } from "pocketbase";

interface AuthPanelProps {
  authModel: BaseAuthStore["model"];
  authBusy: boolean;
  authError: string;
  pocketbaseUrl: string;
  onLogin: (payload: { email: string; password: string }) => Promise<void>;
  onRegister: (payload: { email: string; password: string; name: string }) => Promise<void>;
  onLogout: () => void;
}

export function AuthPanel({
  authModel,
  authBusy,
  authError,
  pocketbaseUrl,
  onLogin,
  onRegister,
  onLogout,
}: AuthPanelProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  return (
    <aside className="panel">
      <div className="panel__header">
        <div>
          <p className="eyebrow">PocketBase</p>
          <h2>Account</h2>
        </div>
        {authModel ? (
          <button type="button" className="button button--ghost" onClick={onLogout}>
            Log out
          </button>
        ) : null}
      </div>

      <p className="helper-text">Backend: {pocketbaseUrl}</p>

      {authModel ? (
        <div className="panel__stack">
          <p className="status-pill status-pill--ok">Signed in</p>
          <p>{authModel.email}</p>
          <p className="helper-text">Forms are stored per user, so each account only sees its own editor records.</p>
        </div>
      ) : (
        <form
          className="panel__stack"
          onSubmit={async (event) => {
            event.preventDefault();

            if (mode === "login") {
              await onLogin({ email, password });
              return;
            }

            await onRegister({ email, password, name });
          }}
        >
          <div className="button-group">
            <button
              type="button"
              className={mode === "login" ? "button" : "button button--secondary"}
              onClick={() => setMode("login")}
            >
              Log in
            </button>
            <button
              type="button"
              className={mode === "register" ? "button" : "button button--secondary"}
              onClick={() => setMode("register")}
            >
              Create account
            </button>
          </div>

          {mode === "register" ? (
            <div>
              <label htmlFor="auth-name">Name</label>
              <input id="auth-name" type="text" value={name} onChange={(event) => setName(event.target.value)} />
            </div>
          ) : null}

          <div>
            <label htmlFor="auth-email">Email</label>
            <input
              id="auth-email"
              type="email"
              value={email}
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <div>
            <label htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              type="password"
              value={password}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          {authError ? <p className="status-pill status-pill--error">{authError}</p> : null}

          <button type="submit" disabled={authBusy}>
            {authBusy ? "Working..." : mode === "login" ? "Log in" : "Create account"}
          </button>
        </form>
      )}
    </aside>
  );
}
