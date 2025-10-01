import React, { useEffect } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  Pressable,
  Dimensions,
  Alert,
} from "react-native";
import Swiper from "react-native-swiper";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import Constants from "expo-constants";
import { Platform } from "react-native";
import {
  OAuthProvider,
  signInWithCredential,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { auth } from "../firebase-config";

WebBrowser.maybeCompleteAuthSession();

const { width, height } = Dimensions.get("window");

// Dev test creds (optional)
const TEST_EMAIL =
  process.env.EXPO_PUBLIC_TEST_LOGIN_EMAIL || "liamccrowley@gmail.com";
const TEST_PASSWORD = process.env.EXPO_PUBLIC_TEST_LOGIN_PASSWORD || "qwerty";

function randomNonce(len = 64) {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let s = "";
  for (let i = 0; i < len; i++)
    s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}
async function sha256Hex(s: string) {
  return await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, s);
}

// ---------------- Google ----------------
const GOOGLE_IDS = {
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID!,
  androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID!,
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID!,
};

// ---------------- Apple (native) ----------------
async function signInWithAppleNative() {
  const isExpoGo = Constants.appOwnership === "expo";
  if (isExpoGo) {
    Alert.alert(
      "Use web flow in Expo Go",
      "Native Apple tokens in Expo Go have the wrong audience. Test Apple natively on TestFlight, or use your web OAuth flow in Expo Go."
    );
    return;
  }

  const rawNonce = randomNonce(64);
  const hashedNonce = await sha256Hex(rawNonce);

  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
    nonce: hashedNonce,
  });

  if (!credential.identityToken) {
    Alert.alert(
      "Apple Sign-In failed",
      "No identity token returned. Ensure your App ID has the 'Sign in with Apple' capability, then rebuild."
    );
    return;
  }

  const provider = new OAuthProvider("apple.com");
  const fbCred = provider.credential({
    idToken: credential.identityToken,
    rawNonce,
  });

  const res = await signInWithCredential(auth, fbCred);
  console.log("✅ Apple signed in:", res.user.email);
}

// ---------------- Test account ----------------
async function signInWithTestAccount() {
  try {
    const cred = await signInWithEmailAndPassword(
      auth,
      TEST_EMAIL,
      TEST_PASSWORD
    );
    console.log("✅ Test user signed in:", cred.user.email);
  } catch (e: any) {
    if (e?.code === "auth/user-not-found") {
      try {
        const newCred = await createUserWithEmailAndPassword(
          auth,
          TEST_EMAIL,
          TEST_PASSWORD
        );
        await updateProfile(newCred.user, { displayName: "Liam (Test)" });
        console.log("🆕 Created & signed in:", newCred.user.email);
      } catch (err) {
        console.error("Create test user failed:", err);
      }
    } else {
      console.error("Test sign-in error:", e);
      Alert.alert("Sign-in failed", e?.message ?? "Please try again.");
    }
  }
}

export default function SignInScreen() {
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    iosClientId: GOOGLE_IDS.iosClientId,
    androidClientId: GOOGLE_IDS.androidClientId,
    webClientId: GOOGLE_IDS.webClientId,
  });

  useEffect(() => {
    if (response?.type === "success") {
      const { id_token } = response.params || {};
      if (!id_token) return;
      const cred = GoogleAuthProvider.credential(id_token);
      signInWithCredential(auth, cred)
        .then((uc) => console.log("✅ Google signed in:", uc.user.email))
        .catch((err) => {
          console.error("Firebase Google sign-in error:", err);
          Alert.alert("Google Sign-In failed", err?.message ?? String(err));
        });
    } else if (response?.type === "error") {
      Alert.alert(
        "Google Sign-In failed",
        JSON.stringify(response.params ?? response, null, 2)
      );
    }
  }, [response]);

  const slides = [
    {
      key: "1",
      title: "Discover local bakeries",
      image:
        "https://media.istockphoto.com/id/627331270/photo/beautiful-young-baker.jpg?s=612x612&w=0&k=20&c=m6ZXr58jChncWu2mkig2_gB-ZJN-PEdcGabGmga7ybg=",
    },
    {
      key: "2",
      title: "Cosy cafés near you",
      image:
        "https://media.istockphoto.com/id/1870401470/photo/proud-baker-with-an-assortment-of-cakes-in-a-shop.jpg?s=612x612&w=0&k=20&c=UuDXmCTTd7VrEjt6JE8FCeSt49xYydsB0nIyHR_El3A=",
    },
    {
      key: "3",
      title: "Fresh food from top spots",
      image:
        "https://media.istockphoto.com/id/1487993826/photo/baker-with-fresh-pastries.jpg?s=612x612&w=0&k=20&c=j9SWAaJbxNfEvJnyWV9qgkAaN71XOADhEsRsMgTq4UU=",
    },
    {
      key: "4",
      title: "Order ahead & skip the queue",
      image:
        "https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?w=1080&auto=format&fit=crop&q=80",
    },
  ];

  return (
    <View style={s.fullscreen}>
      <Swiper
        autoplay
        loop
        dot={<View style={s.dot} />}
        activeDot={<View style={s.activeDot} />}
      >
        {slides.map((slide) => (
          <View key={slide.key} style={s.slide}>
            <Image source={{ uri: slide.image }} style={s.image} />
            <View style={s.overlay}>
              <Text style={s.slideTitle}>{slide.title}</Text>
            </View>
          </View>
        ))}
      </Swiper>

      <View style={s.bottomBar}>
        <Pressable
          onPress={() => promptAsync()}
          style={s.googleBtn}
          disabled={!request}
        >
          <Ionicons name="logo-google" size={20} color="#000" />
          <Text style={s.googleTxt}>Continue with Google</Text>
        </Pressable>

        <Pressable style={s.appleBtn} onPress={signInWithAppleNative}>
          <Ionicons name="logo-apple" size={22} color="#fff" />
          <Text style={s.appleTxt}>Continue with Apple</Text>
        </Pressable>

        <Pressable style={s.skipBtn} onPress={signInWithTestAccount}>
          <Text style={s.skipTxt}>Skip for now</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  fullscreen: { flex: 1, backgroundColor: "#000" },
  slide: { flex: 1 },
  image: { width, height, resizeMode: "cover" },
  overlay: {
    position: "absolute",
    bottom: 250,
    left: 20,
    right: 20,
    alignItems: "center",
  },
  slideTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#fff",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.4)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  dot: {
    backgroundColor: "rgba(255,255,255,0.4)",
    width: 8,
    height: 8,
    borderRadius: 4,
    margin: 3,
  },
  activeDot: {
    backgroundColor: "#fff",
    width: 10,
    height: 10,
    borderRadius: 5,
    margin: 3,
  },
  bottomBar: { position: "absolute", bottom: 30, left: 20, right: 20, gap: 12 },
  googleBtn: {
    height: 54,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  googleTxt: { fontSize: 16, fontWeight: "600", color: "#111827" },
  appleBtn: {
    height: 54,
    borderRadius: 12,
    backgroundColor: "#000",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  appleTxt: { fontSize: 16, fontWeight: "600", color: "#fff" },
  skipBtn: {
    height: 48,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E5E7EB",
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  skipTxt: { fontSize: 15, fontWeight: "600", color: "#fff" },
});
