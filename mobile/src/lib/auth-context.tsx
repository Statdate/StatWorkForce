import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getItem, setItem, deleteItem } from "@/lib/storage";
import { login as apiLogin, getMe, TOKEN_KEY } from "@/lib/api";

type AuthUser = {
  id: string;
  firstName: string;
  lastName: string;
  accountType: string;
  badgeNumber: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  isLoading: boolean;
  signIn: (badgeNumber: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const token = await getItem(TOKEN_KEY);
      if (token) {
        try {
          const me = await getMe();
          setUser(me);
        } catch {
          await deleteItem(TOKEN_KEY);
        }
      }
      setIsLoading(false);
    })();
  }, []);

  async function signIn(badgeNumber: string, password: string) {
    const { token, user: loggedInUser } = await apiLogin(badgeNumber, password);
    await setItem(TOKEN_KEY, token);
    const me = await getMe();
    setUser(me ?? { ...loggedInUser, badgeNumber });
  }

  async function signOut() {
    await deleteItem(TOKEN_KEY);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
