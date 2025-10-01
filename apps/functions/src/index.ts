// functions/src/index.ts
import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import Stripe from "stripe";
import corsLib from "cors";

/** Secrets */
const STRIPE_SECRET_KEY = defineSecret("STRIPE_SECRET_KEY");

/** CORS (allow all origins; lock down later if needed) */
const cors = corsLib({ origin: true });

/** Helper: init Stripe once per request (apiVersion pinned for types) */
const getStripe = (sk: string) =>
  new Stripe(sk, { apiVersion: "2024-06-20" as any });

/** Helper: ensure POST requests */
function ensurePost(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return false;
  }
  return true;
}

/* ──────────────────────────────────────────────────────────────
   1) Payments — existing (kept)
   ────────────────────────────────────────────────────────────── */
export const createPaymentIntent = onRequest(
  { region: "europe-west2", secrets: [STRIPE_SECRET_KEY] },
  async (req, res) =>
    new Promise<void>((resolve) => {
      cors(req, res, async () => {
        try {
          if (!ensurePost(req, res)) return resolve();

          const { amount, currency = "gbp", metadata } = req.body ?? {};
          if (typeof amount !== "number" || amount <= 0) {
            res.status(400).json({ error: "Invalid amount" });
            return resolve();
          }

          const stripe = getStripe(STRIPE_SECRET_KEY.value());
          const pi = await stripe.paymentIntents.create({
            amount,
            currency,
            payment_method_types: ["card"],
            metadata,
          });

          res.json({ clientSecret: pi.client_secret });
          resolve();
        } catch (e: any) {
          console.error(e);
          res.status(500).json({ error: e?.message ?? "Server error" });
          resolve();
        }
      });
    })
);

/* ──────────────────────────────────────────────────────────────
   2) Identity — start a Stripe Identity Verification Session
      Returns { clientSecret, id }
   ────────────────────────────────────────────────────────────── */
// functions/src/index.ts (add/replace these two handlers)
export const createIdentitySession = onRequest(
  { region: "europe-west2", secrets: [STRIPE_SECRET_KEY] },
  async (req, res) =>
    new Promise<void>((resolve) => {
      cors(req, res, async () => {
        try {
          if (req.method !== "POST") {
            res.status(405).json({ error: "Method not allowed" });
            return resolve();
          }
          const { metadata, requireSelfie = true, return_url } = req.body ?? {};
          if (!return_url) {
            res.status(400).json({ error: "return_url is required" });
            return resolve();
          }

          const stripe = new Stripe(STRIPE_SECRET_KEY.value(), {
            apiVersion: "2024-06-20" as any,
          });

          const session = await stripe.identity.verificationSessions.create({
            type: "document",
            metadata,
            return_url, // hosted flow returns here when finished/cancelled
            options: { document: { require_matching_selfie: !!requireSelfie } },
          });

          // Use session.url for hosted flow (and keep id for polling)
          res.json({ url: session.url, id: session.id });
          resolve();
        } catch (e: any) {
          console.error(e);
          res
            .status(400)
            .json({ error: e?.message ?? "Failed to create identity session" });
          resolve();
        }
      });
    })
);

export const getIdentityStatus = onRequest(
  { region: "europe-west2", secrets: [STRIPE_SECRET_KEY] },
  async (req, res) =>
    new Promise<void>((resolve) => {
      cors(req, res, async () => {
        try {
          if (req.method !== "POST") {
            res.status(405).json({ error: "Method not allowed" });
            return resolve();
          }
          const { sessionId } = req.body ?? {};
          if (!sessionId) {
            res.status(400).json({ error: "sessionId is required" });
            return resolve();
          }
          const stripe = new Stripe(STRIPE_SECRET_KEY.value(), {
            apiVersion: "2024-06-20" as any,
          });
          const s = await stripe.identity.verificationSessions.retrieve(
            sessionId,
            {
              expand: ["verified_outputs"],
            }
          );
          // status: "requires_input" | "processing" | "verified" | "canceled"
          res.json({
            status: s.status,
            verifiedOutputs: s.verified_outputs ?? null,
          });
          resolve();
        } catch (e: any) {
          console.error(e);
          res
            .status(400)
            .json({ error: e?.message ?? "Failed to fetch identity status" });
          resolve();
        }
      });
    })
);

/* ──────────────────────────────────────────────────────────────
   3) Connect — create an Express onboarding link
      Body: { return_url, refresh_url, email?, country? }
      Returns { url, accountId }
   ────────────────────────────────────────────────────────────── */
export const createConnectOnboardingLink = onRequest(
  { region: "europe-west2", secrets: [STRIPE_SECRET_KEY] },
  async (req, res) =>
    new Promise<void>((resolve) => {
      cors(req, res, async () => {
        try {
          if (!ensurePost(req, res)) return resolve();

          const {
            return_url,
            refresh_url,
            email, // optional: if you have user email, pass it
            country, // optional: default GB
          } = req.body ?? {};

          if (!return_url || !refresh_url) {
            res
              .status(400)
              .json({ error: "return_url and refresh_url are required" });
            return resolve();
          }

          const stripe = getStripe(STRIPE_SECRET_KEY.value());

          // In production, you should:
          // 1) Look up a previously created account for the current user
          // 2) If none, create it and store the account.id against the user in Firestore
          const account = await stripe.accounts.create({
            type: "express",
            country: (country || "GB").toUpperCase(),
            email: email || undefined,
            capabilities: {
              transfers: { requested: true },
              card_payments: { requested: true },
            },
          });

          const link = await stripe.accountLinks.create({
            account: account.id,
            type: "account_onboarding",
            return_url,
            refresh_url,
          });

          res.json({ url: link.url, accountId: account.id });
          resolve();
        } catch (e: any) {
          console.error(e);
          res
            .status(400)
            .json({ error: e?.message ?? "Failed to create onboarding link" });
          resolve();
        }
      });
    })
);
