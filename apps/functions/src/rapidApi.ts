import axios, { AxiosRequestConfig } from "axios";
import { onCall } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";

/** Secret: firebase functions:secrets:set RAPID_API_KEY */
const RAPID_API_KEY = defineSecret("RAPID_API_KEY");

const endpoints = {
  "quotes.random": {
    host: "quotes15.p.rapidapi.com",
    method: "GET",
    path: "/quotes/random/",
    query: [] as string[],
    body: [] as string[],
    transformServer: (raw: any) => ({
      id: raw?.id,
      content: raw?.content,
      author: raw?.originator?.name ?? "Unknown",
      tags: raw?.tags ?? [],
    }),
  },
  "weather.city": {
    host: "open-weather13.p.rapidapi.com",
    method: "GET",
    path: "/city/{city}",
    query: ["unit"],
    body: [] as string[],
    transformServer: (w: any) => ({
      name: w?.name,
      tempC: w?.main?.temp,
      feelsLikeC: w?.main?.feels_like,
      desc: w?.weather?.[0]?.description,
    }),
  },

  // 👉 add more endpoints here
} as const;

function fillPath(path: string, params: Record<string, any>) {
  return path.replace(/\{(\w+)\}/g, (_, k) => {
    const v = params?.[k];
    if (v == null) throw new Error(`Missing path param: ${k}`);
    return encodeURIComponent(String(v));
  });
}

export const rapidApiCall = onCall({ region: "europe-west1", secrets: [RAPID_API_KEY] }, async (request) => {
  const name = request.data?.name as keyof typeof endpoints;
  const params = (request.data?.params ?? {}) as Record<string, any>;
  const def = endpoints[name];
  if (!name || !def) throw new Error("Unknown or missing endpoint name");

  const url = `https://${def.host}${fillPath(def.path, params)}`;

  const query: Record<string, any> = {};
  for (const k of def.query ?? []) if (params[k] != null) query[k] = params[k];

  let body: any = undefined;
  if ((def.body?.length ?? 0) > 0) {
    body = {};
    for (const k of def.body!) if (params[k] != null) body[k] = params[k];
  }

  const config: AxiosRequestConfig = {
    url,
    method: def.method,
    headers: {
      "x-rapidapi-key": RAPID_API_KEY.value(),
      "x-rapidapi-host": def.host,
    },
    params: query,
    data: body,
    timeout: 10_000,
  };

  try {
    const res = await axios.request(config);
    const out = def.transformServer ? def.transformServer(res.data) : res.data;
    return { ok: true, data: out };
  } catch (err: any) {
    console.error("rapidApiCall error", name, err?.response?.data || err?.message);
    throw new Error("Rapid API request failed");
  }
});
