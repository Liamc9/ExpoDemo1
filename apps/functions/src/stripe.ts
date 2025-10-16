// functions/src/stripe.ts
import type { onRequest as onRequestType } from "firebase-functions/v2/https";
import type Stripe from "stripe";
import type corsLib from "cors";

/** Types for the helpers we’ll receive from index.ts */
type Deps = {
  onRequest: typeof onRequestType;
  STRIPE_SECRET_KEY: any;
  cors: ReturnType<typeof corsLib>;
  getStripe: (sk: string) => Stripe;
  ensurePost: (req: any, res: any) => boolean;
};

/** Build Stripe handlers using shared deps from index.ts */
export function makeStripeHandlers({ onRequest, STRIPE_SECRET_KEY, cors, getStripe, ensurePost }: Deps) {
  const createPaymentIntent = onRequest(
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

            res.status(200).json({ clientSecret: pi.client_secret });
            resolve();
          } catch (e: any) {
            console.error("createPaymentIntent error:", e);
            res.status(500).json({ error: e?.message ?? "Server error" });
            resolve();
          }
        });
      })
  );

  const createIdentitySession = onRequest(
    { region: "europe-west2", secrets: [STRIPE_SECRET_KEY] },
    async (req, res) =>
      new Promise<void>((resolve) => {
        cors(req, res, async () => {
          try {
            if (!ensurePost(req, res)) return resolve();

            const { metadata, requireSelfie = true, return_url } = req.body ?? {};
            const stripe = getStripe(STRIPE_SECRET_KEY.value());

            const createArgs: Stripe.Identity.VerificationSessionCreateParams = {
              type: "document",
              metadata,
              options: { document: { require_matching_selfie: !!requireSelfie } },
            };
            if (typeof return_url === "string" && return_url.length > 0) {
              createArgs.return_url = return_url; // must be https:// if provided
            }

            const session = await stripe.identity.verificationSessions.create(createArgs);
            res.status(200).json({ url: session.url, id: session.id });
            resolve();
          } catch (e: any) {
            const detail = {
              message: e?.message,
              type: e?.type,
              code: e?.code,
              param: e?.param,
            };
            console.error("createIdentitySession error:", detail, e);
            res.status(400).json({ error: "Failed to create identity session", detail });
            resolve();
          }
        });
      })
  );

  const getIdentityStatus = onRequest(
    { region: "europe-west2", secrets: [STRIPE_SECRET_KEY] },
    async (req, res) =>
      new Promise<void>((resolve) => {
        cors(req, res, async () => {
          try {
            if (!ensurePost(req, res)) return resolve();

            const { sessionId } = req.body ?? {};
            if (!sessionId || typeof sessionId !== "string") {
              res.status(400).json({ error: "sessionId is required" });
              return resolve();
            }

            const stripe = getStripe(STRIPE_SECRET_KEY.value());
            const s = await stripe.identity.verificationSessions.retrieve(sessionId, {
              expand: ["verified_outputs"],
            });

            res.status(200).json({
              status: s.status,
              verifiedOutputs: s.verified_outputs ?? null,
            });
            resolve();
          } catch (e: any) {
            console.error("getIdentityStatus error:", e);
            res.status(400).json({ error: e?.message ?? "Failed to fetch identity status" });
            resolve();
          }
        });
      })
  );

  const createConnectOnboardingLink = onRequest(
    { region: "europe-west2", secrets: [STRIPE_SECRET_KEY] },
    async (req, res) =>
      new Promise<void>((resolve) => {
        cors(req, res, async () => {
          try {
            if (!ensurePost(req, res)) return resolve();

            const { return_url, refresh_url, email, country } = req.body ?? {};
            if (!return_url || !refresh_url) {
              res.status(400).json({ error: "return_url and refresh_url are required" });
              return resolve();
            }

            const stripe = getStripe(STRIPE_SECRET_KEY.value());

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

            res.status(200).json({ url: link.url, accountId: account.id });
            resolve();
          } catch (e: any) {
            console.error("createConnectOnboardingLink error:", e);
            res.status(400).json({ error: e?.message ?? "Failed to create onboarding link" });
            resolve();
          }
        });
      })
  );

  return {
    createPaymentIntent,
    createIdentitySession,
    getIdentityStatus,
    createConnectOnboardingLink,
  };
}
