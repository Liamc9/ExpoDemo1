// functions/src/index.ts
import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import Stripe from "stripe";
import corsLib from "cors";
import { makeStripeHandlers } from "./stripe";

/** ── Shared (lives here to avoid many files) ───────────────── */
export const STRIPE_SECRET_KEY = defineSecret("STRIPE_SECRET_KEY");

// Wide-open for dev; restrict in prod
export const cors = corsLib({ origin: true });

export const getStripe = (sk: string) => new Stripe(sk, { apiVersion: "2024-06-20" as any });

export function ensurePost(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return false;
  }
  return true;
}

/** ── Build Stripe functions using the shared deps ──────────── */
const stripe = makeStripeHandlers({
  onRequest,
  STRIPE_SECRET_KEY,
  cors,
  getStripe,
  ensurePost,
});

/** ── Re-export top-level Cloud Functions ───────────────────── */
export const { createPaymentIntent, createIdentitySession, getIdentityStatus, createConnectOnboardingLink } = stripe;

// In future you can add other categories similarly:
// const auth = makeAuthHandlers({ onRequest, cors, ... });
// export const { signIn, signOut } = auth;
