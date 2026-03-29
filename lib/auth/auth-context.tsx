"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
} from "firebase/firestore";
import { auth, db, initializeAnalytics } from "@/lib/firebase/client";
import type { AppRole } from "@/lib/auth/roles";

type AuthContextValue = {
  user: User | null;
  role: AppRole | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshRole: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function setSessionCookie(isLoggedIn: boolean) {
  if (typeof document === "undefined") {
    return;
  }

  if (isLoggedIn) {
    document.cookie = "monitoring_session=1; path=/; max-age=604800; samesite=lax";
    return;
  }

  document.cookie = "monitoring_session=; path=/; max-age=0; samesite=lax";
}

async function getUserRole(uid: string): Promise<AppRole> {
  const roleDocRef = doc(db, "user_roles", uid);
  const roleDoc = await getDoc(roleDocRef);

  if (roleDoc.exists()) {
    const data = roleDoc.data();
    if (data.role === "admin" || data.role === "operator" || data.role === "viewer") {
      return data.role;
    }
  }

  // Keep a safe default in client state if role provisioning has not happened yet.
  return "viewer";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeAnalytics().catch(() => {
      // Analytics is optional and should not block auth state.
    });

    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);

      if (nextUser) {
        setSessionCookie(true);
        try {
          const nextRole = await getUserRole(nextUser.uid);
          setRole(nextRole);
        } catch {
          // Avoid crashing the app when Firestore rules reject role reads.
          setRole(null);
        }
      } else {
        setSessionCookie(false);
        setRole(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    await createUserWithEmailAndPassword(auth, email, password);
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
  }, []);

  const refreshRole = useCallback(async () => {
    if (!auth.currentUser) {
      setRole(null);
      return;
    }

    try {
      const nextRole = await getUserRole(auth.currentUser.uid);
      setRole(nextRole);
    } catch {
      setRole(null);
    }
  }, []);

  const contextValue = useMemo(
    () => ({
      user,
      role,
      loading,
      login,
      register,
      logout,
      refreshRole,
    }),
    [loading, login, logout, refreshRole, register, role, user],
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
}
