import { useState } from "react";
import type { ClientResponseError } from "pocketbase";
import { AuthPanel } from "./AuthPanel";
import { useAuth } from "../lib/auth-context";

const getErrorMessage = (error: unknown) => {
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: string }).message);
  }

  return "Something went wrong.";
};

export function AuthPage() {
  const { pocketbaseUrl, login, logout, register, user } = useAuth();
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState("");

  const runAuthAction = async (callback: () => Promise<void>) => {
    setAuthBusy(true);
    setAuthError("");

    try {
      await callback();
    } catch (error) {
      const responseError = error as ClientResponseError;
      setAuthError(responseError.response?.message || getErrorMessage(error));
    } finally {
      setAuthBusy(false);
    }
  };

  return (
    <main className="route-page route-page--auth">
      <section className="route-page__intro">
        <p className="eyebrow">Step 1</p>
        <h2>Login or create an account</h2>
        <p>
          Sign in before managing surveys. PocketBase keeps each user&apos;s saved surveys separate, so
          the next steps stay scoped to the current account.
        </p>
      </section>

      <AuthPanel
        authModel={user}
        authBusy={authBusy}
        authError={authError}
        pocketbaseUrl={pocketbaseUrl}
        onLogin={(payload) => runAuthAction(() => login(payload))}
        onRegister={(payload) => runAuthAction(() => register(payload))}
        onLogout={logout}
      />
    </main>
  );
}
