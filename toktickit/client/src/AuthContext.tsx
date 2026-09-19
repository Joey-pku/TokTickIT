import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { getMe, login as apiLogin, logout as apiLogout, changePassword as apiChangePassword, type User } from "./api.js";

type AuthState = "loading" | "unauthenticated" | "must-change-password" | "authenticated";

interface AuthContextValue {
  state: AuthState;
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (current: string, next: string, confirm: string) => Promise<void>;
  requestPasswordChange: () => void;
  reload: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [state, setState] = useState<AuthState>("loading");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let active = true;
    setState("loading");
    getMe()
      .then(u => {
        if (!active) return;
        setUser(u);
        setState(u.mustChangePassword ? "must-change-password" : "authenticated");
      })
      .catch(() => {
        if (active) { setUser(null); setState("unauthenticated"); }
      });
    return () => { active = false; };
  }, [tick]);

  const login = useCallback(async (email: string, password: string) => {
    const u = await apiLogin(email, password);
    setUser(u);
    setState(u.mustChangePassword ? "must-change-password" : "authenticated");
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
    setState("unauthenticated");
  }, []);

  const changePassword = useCallback(async (current: string, next: string, confirm: string) => {
    const u = await apiChangePassword(current, next, confirm);
    setUser(u);
    setState(u.mustChangePassword ? "must-change-password" : "authenticated");
  }, []);

  const reload = useCallback(() => setTick(t => t + 1), []);
  const requestPasswordChange = useCallback(() => setState("must-change-password"), []);

  return (
    <AuthContext.Provider value={{ state, user, login, logout, changePassword, requestPasswordChange, reload }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("AuthProvider is required.");
  return ctx;
}
