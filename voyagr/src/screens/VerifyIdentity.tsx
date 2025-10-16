// screens/VerifyIdentity.tsx
import { useEffect, useState } from "react";
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

const ACCENT = "#2ecc71";
const RETURN_URL = Linking.createURL("identity/return"); // mobile://identity/return

async function startIdentitySession(
  draftShop: any
): Promise<{ url: string; id: string }> {
  const res = await fetch(
    "https://<REGION>-<PROJECT>.cloudfunctions.net/createIdentitySession",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        metadata: { shopName: draftShop?.name || "" },
        return_url: RETURN_URL,
        requireSelfie: true,
      }),
    }
  );
  if (!res.ok) throw new Error("Failed to start verification");
  return await res.json();
}

async function fetchIdentityStatus(sessionId: string) {
  const res = await fetch(
    "https://<REGION>-<PROJECT>.cloudfunctions.net/getIdentityStatus",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    }
  );
  if (!res.ok) throw new Error("Failed to get identity status");
  return await res.json(); // { status, verifiedOutputs }
}

export default function VerifyIdentity({ navigation, route }: any) {
  const draftShop = route?.params?.draftShop;
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // If the app is opened via deep link after hosted flow, you could query status here too.
    const sub = Linking.addEventListener("url", async (event) => {
      // Example: mobile://identity/return
      // We still poll by sessionId we saved in start()
    });
    return () => sub.remove();
  }, []);

  const start = async () => {
    try {
      setBusy(true);
      const { url, id } = await startIdentitySession(draftShop);

      // Open hosted flow and wait for return to RETURN_URL
      const result = await WebBrowser.openAuthSessionAsync(url, RETURN_URL);
      // Regardless of result.type (success/dismiss), poll the status
      const { status } = await fetchIdentityStatus(id);

      if (status === "verified") {
        navigation.navigate("ConnectBank", { draftShop });
      } else if (status === "processing") {
        Alert.alert(
          "Processing",
          "Verification is processing. Try again in a moment."
        );
      } else if (status === "requires_input") {
        Alert.alert(
          "Needs more info",
          "Please restart verification and complete all steps."
        );
      } else {
        Alert.alert("Verification canceled", "You can try again anytime.");
      }
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
