// src/hooks/useIdentityVerification.ts
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { stripeService } from "../services/stripe";

type Status = "idle" | "starting" | "opened" | "polling" | "verified" | "canceled" | "requires_input" | "processing" | "error";

type StartOpts = {
  metadata?: Record<string, string>;
  requireSelfie?: boolean;
  /** If you want an auth session + deep link return UX (optional) */
  useAuthSession?: boolean;
  /** App path for deep link return when useAuthSession=true (e.g. "identity/return") */
  returnPath?: string; // defaults to "identity/return"
  /** Polling config */
  maxAttempts?: number; // default 40
  intervalMs?: number; // default 2000
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function useIdentityVerification() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
  }, []);

  const stopPolling = useCallback(() => {
    if (pollTimer.current) {
      clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
  }, []);

  const pollOnce = useCallback(async (id: string) => {
    const res = await stripeService.getIdentityStatus({ sessionId: id });
    return res.status as Status;
  }, []);

  const pollUntilDone = useCallback(
    async (id: string, maxAttempts = 40, intervalMs = 2000) => {
      let attempts = 0;
      while (attempts < maxAttempts && mounted.current) {
        const s = await pollOnce(id);
        if (s === "verified" || s === "canceled" || s === "requires_input") return s;
        // processing -> keep polling
        attempts++;
        await sleep(intervalMs);
      }
      return "processing" as Status;
    },
    [pollOnce]
  );

  const startVerification = useCallback(
    async ({ metadata, requireSelfie = true, useAuthSession = false, returnPath = "identity/return", maxAttempts = 40, intervalMs = 2000 }: StartOpts = {}) => {
      setError(null);
      setStatus("starting");

      try {
        // 1) Create session. We DO NOT send return_url to the backend.
        const { url, id } = await stripeService.createIdentitySession({
          metadata,
          requireSelfie,
          // return_url intentionally omitted to avoid https requirement
        });
        if (!mounted.current) return;
        setSessionId(id);
        setStatus("opened");

        // 2) Open Stripe-hosted page
        if (useAuthSession) {
          const returnUrl = Linking.createURL(returnPath);
          await WebBrowser.openAuthSessionAsync(url, returnUrl);
          // Whether or not we receive the deep link, we’ll poll next.
        } else {
          await WebBrowser.openBrowserAsync(url);
        }
        if (!mounted.current) return;

        // 3) Poll for completion
        setStatus("polling");
        const finalStatus = await pollUntilDone(id, maxAttempts, intervalMs);
        if (!mounted.current) return;
        setStatus(finalStatus);
        return finalStatus;
      } catch (e: any) {
        if (!mounted.current) return;
        setStatus("error");
        setError(e?.message || "Failed to start verification");
        throw e;
      } finally {
        stopPolling();
      }
    },
    [pollUntilDone, stopPolling]
  );

  // Optional: quick re-poll if a deep link fires (useful when useAuthSession=true)
  useEffect(() => {
    const sub = Linking.addEventListener("url", async () => {
      if (!sessionId || !mounted.current) return;
      try {
        const quick = await pollOnce(sessionId);
        if (!mounted.current) return;
        setStatus(quick);
      } catch {
        /* no-op */
      }
    });
    // RN compatibility
    // @ts-ignore
    return () => (typeof sub?.remove === "function" ? sub.remove() : undefined);
  }, [sessionId, pollOnce]);

  return {
    status,
    error,
    sessionId,
    startVerification,
    stopPolling, // exposed in case you want manual canceling
  };
}
