// screens/VerifyIdentity.tsx
import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";

/**
 * Notes:
 * - We no longer pass `return_url` to the backend (Stripe doesn't require it).
 * - We open the hosted verification page in a browser tab, then POLL the session status.
 * - This avoids the "return_url must be https" problem.
 */

const ACCENT = "#2ecc71";

/** ---- API helpers ---- */
async function startIdentitySession(
  draftShop: any
): Promise<{ url: string; id: string }> {
  // IMPORTANT: Replace with your real Cloud Function URL
  const FUNC_URL = "https://createidentitysession-e4sangfijq-nw.a.run.app";

  const res = await fetch(FUNC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      metadata: { shopName: draftShop?.name || "" },
      requireSelfie: true,
      // ⛔️ NO return_url
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let msg = "Failed to start verification";
    try {
      const json = JSON.parse(text);
      if (json?.detail?.message) msg = json.detail.message;
      else if (json?.error) msg = json.error;
    } catch {}
    throw new Error(msg);
  }
  return await res.json();
}

async function fetchIdentityStatus(sessionId: string): Promise<{
  status: "requires_input" | "processing" | "verified" | "canceled";
  verifiedOutputs?: any;
}> {
  // IMPORTANT: Replace with your real Cloud Function URL
  const FUNC_URL = "https://getidentitystatus-e4sangfijq-nw.a.run.app";

  const res = await fetch(FUNC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Failed to get identity status${
        text ? `: ${text.slice(0, 200)}` : ""
      }`.trim()
    );
  }
  return await res.json();
}

/** Simple sleep helper */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Poll until status is final or we time out */
async function pollIdentityStatus(
  sessionId: string,
  {
    maxAttempts = 10,
    intervalMs = 1500,
  }: { maxAttempts?: number; intervalMs?: number } = {}
) {
  for (let i = 0; i < maxAttempts; i++) {
    const { status } = await fetchIdentityStatus(sessionId);
    if (
      status === "verified" ||
      status === "canceled" ||
      status === "requires_input"
    ) {
      return status;
    }
    // status === "processing"
    await sleep(intervalMs);
  }
  return "processing" as const;
}

/** ---- Screen ---- */
export default function VerifyIdentity({ navigation, route }: any) {
  const draftShop = route?.params?.draftShop;
  const [busy, setBusy] = useState(false);
  const sessionIdRef = useRef<string | null>(null);

  // Optional: if you later add a deep-link path, you can re-poll here.
  useEffect(() => {
    const sub = Linking.addEventListener("url", async () => {
      if (sessionIdRef.current) {
        try {
          const finalStatus = await pollIdentityStatus(sessionIdRef.current, {
            maxAttempts: 1, // quick check on resume
          });
          handleStatus(finalStatus);
        } catch {
          // no-op
        }
      }
    });
    return () => sub.remove();
  }, []);

  const handleStatus = (status: string) => {
    if (status === "verified") {
      navigation.navigate("ConnectBank", { draftShop });
      return;
    }
    if (status === "processing") {
      Alert.alert("Processing", "Verification is processing. Try again soon.");
      return;
    }
    if (status === "requires_input") {
      Alert.alert(
        "Needs more info",
        "Please restart verification and complete all steps."
      );
      return;
    }
    // canceled
    Alert.alert("Verification canceled", "You can try again anytime.");
  };

  const start = async () => {
    try {
      setBusy(true);

      // 1) Create session (no return_url)
      const { url, id } = await startIdentitySession(draftShop);
      sessionIdRef.current = id;

      // 2) Open hosted flow in browser
      //    We use openBrowserAsync since we're not returning to an app scheme.
      await WebBrowser.openBrowserAsync(url);

      // 3) After user closes the tab, POLL for final status
      const finalStatus = await pollIdentityStatus(id);
      handleStatus(finalStatus);
    } catch (e: any) {
      console.error(e);
      Alert.alert("Error", e?.message ?? "Could not start verification.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={s.safe}>
      <Text style={s.h1}>Verify your identity</Text>
      <Text style={s.p}>
        We’ll open a secure Stripe page to verify your ID.
      </Text>

      <TouchableOpacity
        onPress={start}
        style={[s.primaryBtn, { backgroundColor: ACCENT }]}
        disabled={busy}
        activeOpacity={0.9}
      >
        {busy ? (
          <ActivityIndicator />
        ) : (
          <Ionicons name="shield-checkmark-outline" size={18} color="#0B1220" />
        )}
        <Text style={s.primaryBtnText}>
          {busy ? "Starting…" : "Start verification"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.goBack()} style={s.textBtn}>
        <Text style={s.textBtnLabel}>Back</Text>
      </TouchableOpacity>
    </View>
  );
}

/** ---- Styles ---- */
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F8FAFC", padding: 16, gap: 10 },
  h1: { fontSize: 22, fontWeight: "800", color: "#0B1220" },
  p: { color: "#6B7280", marginBottom: 6 },
  primaryBtn: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
  },
  primaryBtnText: { color: "#0B1220", fontSize: 15, fontWeight: "800" },
  textBtn: { paddingVertical: 10, alignSelf: "center" },
  textBtnLabel: { color: "#0B1220", fontWeight: "700" },
});
