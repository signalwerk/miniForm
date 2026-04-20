import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { BaseAuthStore } from "pocketbase";
import { getCurrentUser, loginUser, logoutUser, pb, registerUser } from "./pocketbase";

interface AuthContextValue {
  user: BaseAuthStore["model"];
  pocketbaseUrl: string;
  login: (payload: { email: string; password: string }) => Promise<void>;
  register: (payload: { email: string; password: string; name: string }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<BaseAuthStore["model"]>(getCurrentUser());

  useEffect(() => {
    const unsubscribe = pb.authStore.onChange(() => {
      setUser(getCurrentUser());
    });

    return () => unsubscribe();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      pocketbaseUrl: pb.baseURL,
      login: loginUser,
      register: registerUser,
      logout: logoutUser,
    }),
    [user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }

  return context;
};
