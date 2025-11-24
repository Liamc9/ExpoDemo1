// src/services/stripeService.ts
const API_BASE_URL = "https://europe-west2-expodemo-61d67.cloudfunctions.net"; // ← change this

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
type CreatePaymentIntentReq = {
  amount: number; // in minor units
  currency?: string; // "gbp" default in backend
  metadata?: Record<string, string>;
};
type CreatePaymentIntentRes = { clientSecret: string };

type CreateIdentityReq = {
  metadata?: Record<string, string>;
  requireSelfie?: boolean;
  return_url?: string; // optional
};
type CreateIdentityRes = { url: string; id: string };

type GetIdentityStatusReq = { sessionId: string };
type GetIdentityStatusRes = {
  status: "requires_input" | "processing" | "verified" | "canceled";
  verifiedOutputs?: unknown | null;
};

type CreateConnectLinkReq = {
  return_url: string;
  refresh_url: string;
  email?: string;
  country?: string; // e.g., "GB"
};
type CreateConnectLinkRes = { url: string; accountId: string };

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
function endpoint(path: string) {
  return `${API_BASE_URL.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

async function postJSON<TReq, TRes>(url: string, body: TReq): Promise<TRes> {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });

  let data: any;
  try {
    data = await r.json();
  } catch {
    data = null;
  }

  if (!r.ok) {
    const msg = data?.error ?? data?.message ?? `Request failed (${r.status}) for ${url}: ${JSON.stringify(data)}`;
    throw new Error(msg);
  }

  return data as TRes;
}

// ─────────────────────────────────────────────────────────────
// Stripe Service
// ─────────────────────────────────────────────────────────────
export const stripeService = {
  createPaymentIntent: (payload: CreatePaymentIntentReq) => postJSON<CreatePaymentIntentReq, CreatePaymentIntentRes>(endpoint("createPaymentIntent"), payload),

  createIdentitySession: (payload: CreateIdentityReq) => postJSON<CreateIdentityReq, CreateIdentityRes>(endpoint("createIdentitySession"), payload),

  getIdentityStatus: (payload: GetIdentityStatusReq) => postJSON<GetIdentityStatusReq, GetIdentityStatusRes>(endpoint("getIdentityStatus"), payload),

  createConnectOnboardingLink: (payload: CreateConnectLinkReq) => postJSON<CreateConnectLinkReq, CreateConnectLinkRes>(endpoint("createConnectOnboardingLink"), payload),
};
