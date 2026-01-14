import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react";
import type { Session } from "../types";
import { saveSession, clearSession, getStoredSession } from "../utils/auth";

interface AuthContextType {
  session: Session | null;
  loading: boolean;
  error: string | null;
  setSession: (session: Session | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSessionState] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load session from localStorage on mount
  useEffect(() => {
    const stored = getStoredSession();
    if (stored) {
      setSessionState(stored);
    }
  }, []);

  const setSession = useCallback((newSession: Session | null) => {
    setSessionState(newSession);
    if (newSession) {
      saveSession(newSession);
    } else {
      clearSession();
    }
  }, []);

  const logout = useCallback(() => {
    setSessionState(null);
    clearSession();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        loading,
        error,
        setSession,
        setLoading,
        setError,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
