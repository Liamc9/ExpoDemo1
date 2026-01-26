import React, { useEffect } from "react";
import { View, Text, ImageBackground, StyleSheet, Pressable, Dimensions, Alert, SafeAreaView, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import Constants from "expo-constants";
import { LinearGradient } from "expo-linear-gradient";
import { OAuthProvider, signInWithCredential, GoogleAuthProvider } from "firebase/auth";
import { auth } from "../../firebase-config";

WebBrowser.maybeCompleteAuthSession();

const { width, height } = Dimensions.get("window");

/** --------- Tweakables --------- **/
const BG_SHIFT_UP = Math.round(height * 0.08); // move background up a bit
const BUTTON_BOTTOM_GAP = 32; // extra space from very bottom
const GRADIENT_COVER_HEIGHT = Math.round(height * 0.55); // how tall the dark bottom is
const TITLE_TOP_OFFSET = Math.round(height * 0.02); // app name top spacing
/** ------------------------------ **/

// ---------------- Helpers ----------------
function randomNonce(len = 64) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let s = "";
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}
async function sha256Hex(s: string) {
  return await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, s);
}

// ---------------- Apple ----------------
async function signInWithAppleNative() {
  const isExpoGo = Constants.appOwnership === "expo";
  if (isExpoGo && Platform.OS !== "ios") {
    Alert.alert("Use web flow in Expo Go", "Native Apple tokens in Expo Go have the wrong audience. Test Apple natively on TestFlight, or use your web OAuth flow in Expo Go.");
    return;
  }

  const rawNonce = randomNonce(64);
  const hashedNonce = await sha256Hex(rawNonce);

  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
    nonce: hashedNonce,
  });

  if (!credential.identityToken) {
    Alert.alert("Apple Sign-In failed", "No identity token returned. Ensure your App ID has the 'Sign in with Apple' capability, then rebuild.");
    return;
  }

  const provider = new OAuthProvider("apple.com");
  const fbCred = provider.credential({
    idToken: credential.identityToken,
    rawNonce,
  });

  await signInWithCredential(auth, fbCred);
}

export default function SignInScreen() {
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    iosClientId: "239133658843-l2l98vsvt5at3ia7vvam3e9blvn56tgg.apps.googleusercontent.com",
    androidClientId: "239133658843-2lk567392r6qfjbfn1p7g6gn29g9saqs.apps.googleusercontent.com",
    webClientId: "239133658843-b25pd7i1m3f4l20lu58m6bm8iu6t49s1.apps.googleusercontent.com",
  });

  useEffect(() => {
    if (response?.type === "success") {
      // @ts-ignore
      const { id_token } = response.params || {};
      if (!id_token) return;
      const cred = GoogleAuthProvider.credential(id_token);
      signInWithCredential(auth, cred).catch((err) => {
        Alert.alert("Google Sign-In failed", err?.message ?? String(err));
      });
    }
  }, [response]);

  return (
    <View style={s.root}>
      <ImageBackground source={require("../../assets/images/BakeryImage.png")} style={s.bg} imageStyle={s.bgImage} resizeMode="cover">
        <SafeAreaView style={{ flex: 1 }}>
          <View style={s.topContent}>
            <Text style={s.appName}>Basil</Text>
            <Text style={s.motto}>Sell From Your Home</Text>
          </View>
        </SafeAreaView>

        {/* Darker bottom overlay (absolute), also holds the buttons */}
        <LinearGradient colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.85)", "rgba(0,0,0,0.95)"]} locations={[0, 0.45, 1]} style={s.gradient}>
          <SafeAreaView>
            <View style={s.bottomBar}>
              <Pressable style={s.appleBtn} onPress={signInWithAppleNative}>
                <Ionicons name="logo-apple" size={22} color="#fff" />
                <Text style={s.appleTxt}>Continue with Apple</Text>
              </Pressable>

              <Pressable onPress={() => promptAsync()} style={s.googleBtn} disabled={!request}>
                <Ionicons name="logo-google" size={20} color="#000" />
                <Text style={s.googleTxt}>Continue with Google</Text>
              </Pressable>
            </View>
          </SafeAreaView>
        </LinearGradient>
      </ImageBackground>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },

  bg: { flex: 1, width: "100%", height: "100%" },
  bgImage: {
    // lift the photo upward a bit so the interesting part sits higher
    transform: [{ translateY: -BG_SHIFT_UP }],
  },

  topContent: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: TITLE_TOP_OFFSET,
    // subtle shadow under text for readability on bright images
  },

  appName: {
    fontSize: 44,
    fontWeight: "800",
    color: "#fff",
    textAlign: "center",
    letterSpacing: 0.5,
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
    marginBottom: 8,
  },

  motto: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: "600",
    color: "#ffffffdd",
    textAlign: "center",
    paddingHorizontal: 24,
  },

  gradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: GRADIENT_COVER_HEIGHT,
    justifyContent: "flex-end",
  },

  bottomBar: {
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: BUTTON_BOTTOM_GAP,
  },

  googleBtn: {
    height: 54,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  googleTxt: { fontSize: 16, fontWeight: "700", color: "#111827" },

  appleBtn: {
    height: 54,
    borderRadius: 14,
    backgroundColor: "#000",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  appleTxt: { fontSize: 16, fontWeight: "700", color: "#fff" },
});
