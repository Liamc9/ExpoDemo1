// services/rapid.ts
// HTTP version of Rapid API proxy (onRequest). No httpsCallable here.

type RapidOk<T> = { ok: true; data: T; [k: string]: any };
type RapidErr = { ok: false; error?: string; upstreamStatus?: number; [k: string]: any };

// Paste the exact Trigger URL from `firebase functions:list` for rapidApiCall:
const RAPID_URL = "https://rapidapicall-e4sangfijq-nw.a.run.app"; // <-- replace

async function rapid<T = any>(name: string, params: Record<string, any> = {}): Promise<T> {
  // If you need auth, add ID token/App Check headers here.
  const res = await fetch(RAPID_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // Authorization: `Bearer ${idToken}`,          // optional: Firebase ID token
      // "X-Firebase-AppCheck": appCheckToken,        // optional: App Check
    },
    body: JSON.stringify({ name, params }),
  });

  const text = await res.text();
  let json: RapidOk<T> | RapidErr;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`HTTP ${res.status}: ${text}`);
  }

  if (!json.ok) {
    const msg = json.error || `Request failed${json.upstreamStatus ? ` (upstream ${json.upstreamStatus})` : ""}`;
    throw new Error(msg);
  }
  return (json as RapidOk<T>).data;
}

export const Rapid = {
  randomQuote: () => rapid<{ id: string; content: string; author: string; tags: string[] }>("quotes.random"),
  cityWeather: (city: string, unit: "metric" | "imperial" = "metric") => rapid<{ name: string; tempC: number; feelsLikeC: number; desc: string }>("weather.city", { city, unit }),
};

export default Rapid;
