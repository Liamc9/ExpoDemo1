// src/providers/AuthProvider.tsx
import React, { createContext, useContext, useEffect, useMemo, useState, PropsWithChildren } from "react";
import { onAuthStateChanged, signInWithCredential, GoogleAuthProvider, OAuthProvider, User, signOut } from "firebase/auth";
import { auth } from "../firebase-config";

type GoogleTokens = {
  idToken?: string | null;
  accessToken?: string | null;
};

type AppleParams = {
  identityToken: string;
  rawNonce: string;
};

type Ctx = {
  user: User | null;
  initializing: boolean;
  isSignedIn: boolean;
  uid: string | null;

  signInWithGoogle(tokens: GoogleTokens): Promise<void>;
  signInWithApple(params: AppleParams): Promise<void>;
  signOutNow(): Promise<void>;

  // Dev-only helper
  skipLogin(): Promise<void>;
};

const AuthCtx = createContext<Ctx | null>(null);

function normalizeAuthError(err: unknown): Error {
  const e = err as { code?: string; message?: string };
  if (!e?.code) return new Error(e?.message || "Unknown auth error");
  switch (e.code) {
    case "auth/cancelled-popup-request":
    case "auth/popup-closed-by-user":
      return new Error("Sign-in was cancelled.");
    case "auth/invalid-credential":
      return new Error("Invalid credential from provider.");
    case "auth/network-request-failed":
      return new Error("Network error. Check your connection and try again.");
    default:
      return new Error(e.message || e.code);
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setInitializing(false);
    });
    return unsub;
  }, []);

  const signInWithGoogle = async ({ idToken, accessToken }: GoogleTokens) => {
    try {
      if (!idToken && !accessToken) throw new Error("Missing Google tokens");
      const cred = GoogleAuthProvider.credential(idToken ?? undefined, accessToken ?? undefined);
      await signInWithCredential(auth, cred);
    } catch (err) {
      throw normalizeAuthError(err);
    }
  };

  const signInWithApple = async ({ identityToken, rawNonce }: AppleParams) => {
    try {
      if (!identityToken) throw new Error("Missing Apple identityToken");
      const provider = new OAuthProvider("apple.com");
      const cred = provider.credential({ idToken: identityToken, rawNonce });
      await signInWithCredential(auth, cred);
    } catch (err) {
      throw normalizeAuthError(err);
    }
  };

  const signOutNow = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      throw normalizeAuthError(err);
    }
  };

  const skipLogin = async () => {
    if (!__DEV__) throw new Error("skipLogin is only available in development");
    const fakeUser = { uid: "dev-skip", displayName: "Dev Tester" } as User;
    console.log("⏭️ Skipped login (dev mode)");
    setUser(fakeUser);
  };

  const value = useMemo<Ctx>(
    () => ({
      user,
      initializing,
      isSignedIn: !!user,
      uid: user?.uid ?? null,
      signInWithGoogle,
      signInWithApple,
      signOutNow,
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
