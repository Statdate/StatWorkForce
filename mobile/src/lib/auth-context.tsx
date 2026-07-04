import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getItem, setItem, deleteItem } from "@/lib/storage";
import { login as apiLogin, getMe, TOKEN_KEY } from "@/lib/api";
import { registerForPushNotificationsAsync } from "@/lib/push-notifications";
import { isBiometricEnabled, authenticateWithBiometrics } from "@/lib/biometric";

type AuthUser = {
  id: string;
  firstName: string;
  lastName: string;
  accountType: string;
  badgeNumber: string;
  // Optional: absent in the rare fallback path where a fresh login's
  // follow-up getMe() call fails and we fall back to the login response
  // alone, which doesn't carry these.
  jobType?: { id: string; name: string } | null;
  title?: string | null;
  shiftPattern?: string | null;
  hospitalName?: string;
  units?: { id: string; name: string; type: string }[];
};

type AuthContextValue = {
  user: AuthUser | null;
  isLoading: boolean;
  // True when a stored session was restored on app launch and biometric lock
  // is enabled — the (app) screens stay hidden behind a lock screen until
  // unlock() succeeds. Never true right after a fresh signIn(): typing the
  // password already proved identity for this app open.
  isLocked: boolean;
  signIn: (badgeNumber: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  unlock: () => Promise<boolean>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    (async () => {
      const token = await getItem(TOKEN_KEY);
      if (token) {
        try {
          const me = await getMe();
          setUser(me);
          if (await isBiometricEnabled()) {
            setIsLocked(true);
          }
          registerForPushNotificationsAsync();
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
    setIsLocked(false);
    registerForPushNotificationsAsync();
  }

  async function signOut() {
    await deleteItem(TOKEN_KEY);
    setUser(null);
    setIsLocked(false);
  }

  async function unlock() {
    const success = await authenticateWithBiometrics('Unlock Stat Workforce');
    if (success) setIsLocked(false);
    return success;
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, isLocked, signIn, signOut, unlock }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
