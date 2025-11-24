import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase-config";

export async function fetchJoke() {
  const fn = httpsCallable<unknown, { ok: boolean; data: { id: string; joke: string } }>(functions, "getJoke");
  const res = await fn();
  if (!res?.data?.ok) throw new Error("Joke fetch failed");
  return res.data.data;
}
