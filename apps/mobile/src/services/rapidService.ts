import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase-config";

/**
 * Generic caller to the single Cloud Function.
 * name: the endpoint key you defined server-side (e.g., "quotes.random")
 * params: object of params/path/query/body—only whitelisted keys pass through
 */
const rapidFn = httpsCallable<{ name: string; params?: Record<string, any> }, { ok: boolean; data: any }>(functions, "rapidApiCall");

export async function callRapid<T = any>(name: string, params?: Record<string, any>): Promise<T> {
  const res = await rapidFn({ name, params: params ?? {} });
  if (!res.data?.ok) throw new Error("Rapid call failed");
  return res.data.data as T;
}

/**
 * Optional convenience wrappers (totally optional).
 * Just append to these objects when you add server endpoints.
 */
export const rapid = {
  quotes: {
    random: () => callRapid<{ id: string; content: string; author: string; tags: string[] }>("quotes.random"),
  },
  weather: {
    city: (city: string, unit: "c" | "f" = "c") => callRapid<{ name: string; tempC: number; feelsLikeC: number; desc: string }>("weather.city", { city, unit }),
  },

  // 👉 ADD NEW CLIENT HELPERS BELOW (optional)
  // crypto: { top: (limit = 10) => callRapid<any[]>("crypto.top", { limit }) },
};
