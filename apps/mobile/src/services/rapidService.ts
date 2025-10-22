// services/rapidService.ts
import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase-config";

export async function callRapid<T = any>(name: string, params?: Record<string, any>): Promise<T> {
  const fn = httpsCallable<{ name: string; params?: Record<string, any> }, { ok: boolean; data: T }>(functions, "rapidApiCall");
  const res = await fn({ name, params });
  if (!res.data?.ok) throw new Error("Rapid API call failed");
  return res.data.data;
}
