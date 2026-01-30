import React, { useEffect } from "react";
import { View, Text, Pressable, StyleSheet, Alert } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import { auth } from "../../firebase-config";
import * as AuthSession from "expo-auth-session";

WebBrowser.maybeCompleteAuthSession();

const BRAND_GREEN = "#43A047";

export default function SignInWeb() {
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: "239133658843-b25pd7i1m3f4l20lu58m6bm8iu6t49s1.apps.googleusercontent.com",
  });

const redirectUri = AuthSession.makeRedirectUri();
console.log("redirectUri:", redirectUri);

  useEffect(() => {
    if (response?.type !== "success") return;
    // @ts-ignore
    const { id_token } = response.params || {};
    if (!id_token) return;

    const cred = GoogleAuthProvider.credential(id_token);
    signInWithCredential(auth, cred).catch((err) => {
      Alert.alert("Google Sign-In failed", err?.message ?? String(err));
    });
  }, [response]);

  return (
    <View style={s.page}>
      <View style={s.card}>
        <Text style={s.brand}>Basil</Text>
        <Text style={s.subtitle}>Sell From Your Home</Text>

        <Pressable style={[s.btn, !request && s.btnDisabled]} onPress={() => promptAsync()} disabled={!request}>
          <Text style={s.btnText}>Continue with Google</Text>
        </Pressable>

        <Text style={s.note}>Apple Sign-In is available in the mobile app.</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: BRAND_GREEN,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "white",
    borderRadius: 16,
    padding: 22,
  },
  brand: {
    fontSize: 34,
    fontWeight: "800",
    color: "#0B0F14",
    textAlign: "center",
  },
  subtitle: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: "600",
    color: "#334155",
    textAlign: "center",
  },
  btn: {
    marginTop: 18,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#0B0F14",
    alignItems: "center",
    justifyContent: "center",
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
  note: {
    marginTop: 14,
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
  },
});
