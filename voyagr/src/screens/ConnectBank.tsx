import { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { Ionicons } from "@expo/vector-icons";

const ACCENT = "#2ecc71";
const RETURN_URL = Linking.createURL("onboarding/return"); // needs app scheme in app.json
const REFRESH_URL = Linking.createURL("onboarding/refresh");

async function getOnboardingLink(): Promise<{ url: string }> {
  const res = await fetch(
    "https://<YOUR_REGION>-<YOUR_PROJECT>.cloudfunctions.net/createConnectOnboardingLink",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        return_url: RETURN_URL,
        refresh_url: REFRESH_URL,
      }),
    }
  );
  if (!res.ok) throw new Error("Failed to create onboarding link");
  return await res.json();
}

export default function ConnectBank({ navigation, route }: any) {
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const sub = Linking.addEventListener("url", (event) => {
      const url = event.url;
      if (url.includes("/onboarding/return")) {
        // Optionally, call your backend to check account capabilities and then finish shop creation.
        Alert.alert(
          "All set",
          "Bank details added. You can now receive payouts."
        );
        navigation.reset({ index: 0, routes: [{ name: "Seller" }] });
      }
    });
    return () => sub.remove();
  }, [navigation]);

  const startOnboarding = async () => {
    try {
      setBusy(true);
      const { url } = await getOnboardingLink();
      await WebBrowser.openBrowserAsync(url);
    } catch (e: any) {
      console.error(e);
      Alert.alert("Error", e?.message ?? "Could not open onboarding.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={s.safe}>
      <Text style={s.h1}>Add bank details</Text>
      <Text style={s.p}>
        Stripe will securely collect your payout information.
      </Text>

      <TouchableOpacity
        onPress={startOnboarding}
        style={[s.primaryBtn, { backgroundColor: ACCENT }]}
        disabled={busy}
      >
        {busy ? (
          <ActivityIndicator />
        ) : (
          <Ionicons name="cash-outline" size={18} color="#0B1220" />
        )}
        <Text style={s.primaryBtnText}>
          {busy ? "Opening…" : "Open Stripe onboarding"}
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
