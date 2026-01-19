import axios, { AxiosRequestConfig } from "axios";
import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import corsLib from "cors";

const RAPID_API_KEY = defineSecret("RAPID_API_KEY");
const cors = corsLib({ origin: true, credentials: true });

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
} as const;

function fillPath(path: string, params: Record<string, any>) {
  return path.replace(/\{(\w+)\}/g, (_, k) => {
    const v = params?.[k];
    if (v == null) throw new Error(`Missing path param: ${k}`);
    return encodeURIComponent(String(v));
  });
}

export const rapidApiCall = onRequest(
  { region: "europe-west2", secrets: [RAPID_API_KEY] },
  async (req, res) =>
    new Promise<void>((resolve) => {
      cors(req, res, async () => {
        try {
          // Accept POST with JSON body; optionally allow GET with querystring
          if (req.method !== "POST" && req.method !== "GET") {
            res.status(405).json({ ok: false, error: "Use POST (or GET for quick tests)" });
            return resolve();
          }

          const input = req.method === "GET" ? { ...req.query } : req.body ?? {};
          const name = input?.name as keyof typeof endpoints;
          const params = (input?.params ?? {}) as Record<string, any>;
          const def = endpoints[name];

          if (!name || !def) {
            res.status(400).json({ ok: false, error: "Unknown or missing endpoint name" });
            return resolve();
          }

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
            timeout: 10000,
            validateStatus: () => true,
          };

          const r = await axios.request(config);

          if (r.status < 200 || r.status >= 300) {
            res.status(200).json({
              ok: false,
              error: `Upstream ${r.status}`,
              upstreamStatus: r.status,
              upstreamBody: r.data ?? null,
            });
            return resolve();
          }

          const out = (def as any).transformServer ? (def as any).transformServer(r.data) : r.data;
          res.status(200).json({ ok: true, data: out });
          resolve();
        } catch (err: any) {
          console.error("rapidApiCall error", err?.message);
          res.status(200).json({ ok: false, error: err?.message ?? "Rapid API request failed" });
          resolve();
        }
      });
    })
);
