import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  signInWithCredential,
  GoogleAuthProvider,
  OAuthProvider,
  updateProfile,
  User,
} from "firebase/auth";
import { auth } from "../firebase-config";

type Ctx = {
  user: User | null;
  initializing: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    displayName?: string
  ) => Promise<void>;
  signOutNow: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signInWithGoogle: (tokens: {
    idToken?: string | null;
    accessToken?: string | null;
  }) => Promise<void>;
  signInWithApple: (params: {
    identityToken: string;
    rawNonce: string;
  }) => Promise<void>;

  // 🛠 Dev-only helper
  skipLogin: () => Promise<void>;
};

const AuthCtx = createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const sub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setInitializing(false);
    });
    return () => sub();
  }, []);

  // ---- Social providers ----------------------------------------------------
  const signInWithGoogle = async ({
    idToken,
    accessToken,
  }: {
    idToken?: string | null;
    accessToken?: string | null;
  }) => {
    if (!idToken && !accessToken) throw new Error("Missing Google tokens");
    const cred = GoogleAuthProvider.credential(
      idToken ?? undefined,
      accessToken ?? undefined
    );
    await signInWithCredential(auth, cred);
  };

  const signInWithApple = async ({
    identityToken,
    rawNonce,
  }: {
    identityToken: string;
    rawNonce: string;
  }) => {
    if (!identityToken) throw new Error("Missing Apple identityToken");
    const provider = new OAuthProvider("apple.com");
    const cred = provider.credential({ idToken: identityToken, rawNonce });
    await signInWithCredential(auth, cred);
  };

  // ---- Dev-only skip login -------------------------------------------------
  const skipLogin = async () => {
    if (!__DEV__) {
      throw new Error("skipLogin is only available in development mode");
    }

    const fakeUser = {
      uid: "dev-skip",
      email: "dev@skip.local",
      displayName: "Dev Tester",
    } as unknown as User;

    console.log("⏭️ Skipped login (dev mode)");
    setUser(fakeUser);
  };

  // ---- Context value -------------------------------------------------------
  const value = useMemo<Ctx>(
    () => ({
      user,
      initializing,
      signIn: async (email, password) => {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      },
      signUp: async (email, password, displayName) => {
        const { user } = await createUserWithEmailAndPassword(
          auth,
          email.trim(),
          password
        );
        if (displayName) {
          await updateProfile(user, { displayName });
        }
      },
      signOutNow: async () => {
        await signOut(auth);
      },
      resetPassword: async (email) => {
        await sendPasswordResetEmail(auth, email.trim());
      },
      signInWithGoogle,
      signInWithApple,
      skipLogin,
    }),
    [user, initializing]
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
