import axios from "axios";
import { onRequest } from "firebase-functions/v2/https";

export const getJoke = onRequest({ region: "europe-west2" }, async (req, res) => {
  try {
    const r = await axios.get("https://icanhazdadjoke.com/", {
      headers: { Accept: "application/json", "User-Agent": "basil-app/1.0" },
      timeout: 8000,
      validateStatus: () => true,
    });

    if (r.status !== 200) {
      res.status(r.status).json({ ok: false, error: `Upstream ${r.status}` });
      return; // ensure Promise<void>
    }

    res.status(200).json({ ok: true, data: { id: r.data?.id, joke: r.data?.joke } });
    // no return value
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message ?? "Server error" });
    // no return value
  }
});
