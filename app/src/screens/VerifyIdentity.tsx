// screens/VerifyIdentity.tsx
import React, { useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useIdentityVerification } from "../hooks/useIdentityVerification";

const ACCENT = "#2ecc71";

export default function VerifyIdentity({ navigation, route }: any) {
  const draftShop = route?.params?.draftShop;
  const { status, error, startVerification } = useIdentityVerification();

  const handleNext = useCallback(
    (s: string) => {
      if (s === "verified") {
        navigation.navigate("ConnectBank", { draftShop });
      } else if (s === "processing") {
        Alert.alert("Processing", "Verification is still processing. Try again shortly.");
      } else if (s === "requires_input") {
        Alert.alert("More info needed", "Please restart and complete all steps.");
      } else if (s === "canceled") {
        Alert.alert("Canceled", "You can try again anytime.");
      }
    },
    [navigation, draftShop]
  );

  const onStart = async () => {
    try {
      const finalStatus = await startVerification({
        metadata: { shopName: draftShop?.name || "" },
        requireSelfie: true,
        // choose either flow; both work because backend omits return_url
        useAuthSession: false, // openBrowser + poll
        // useAuthSession: true,       // openAuthSession + deep link + poll
        returnPath: "identity/return", // only used when useAuthSession=true
        maxAttempts: 40,
        intervalMs: 2000,
      });
      if (finalStatus) handleNext(finalStatus);
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not start verification.");
    }
  };

  const busy = status === "starting" || status === "opened" || status === "polling";

  return (
    <View style={s.safe}>
      <Text style={s.h1}>Verify your identity</Text>
      <Text style={s.p}>We’ll open a secure Stripe page to verify your ID.</Text>

      <TouchableOpacity onPress={onStart} style={[s.primaryBtn, { backgroundColor: ACCENT }]} disabled={busy} activeOpacity={0.9}>
        {busy ? <ActivityIndicator /> : <Ionicons name="shield-checkmark-outline" size={18} color="#0B1220" />}
        <Text style={s.primaryBtnText}>{busy ? "Starting…" : "Start verification"}</Text>
      </TouchableOpacity>

      {!!error && <Text style={{ color: "red", marginTop: 8 }}>{error}</Text>}

      <TouchableOpacity onPress={() => navigation.goBack()} style={s.textBtn} disabled={busy}>
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
