import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Alert } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAuth } from "../auth/AuthProvider";

type Props = NativeStackScreenProps<any, "SignIn">;

export default function SignInScreen({ navigation }: Props) {
  const { signIn, resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setErr(null);
    if (!email || !pw) return setErr("Enter email and password.");
    setLoading(true);
    try { await signIn(email, pw); } 
    catch (e: any) { setErr(e?.message ?? "Sign in failed"); }
    finally { setLoading(false); }
  };

  const forgot = async () => {
    if (!email) return Alert.alert("Enter your email first");
    try { await resetPassword(email); Alert.alert("Check your inbox for a reset link"); }
    catch (e: any) { Alert.alert("Error", e?.message ?? "Could not send reset email"); }
  };

  return (
    <View style={s.container}>
      <Text style={s.title}>Sign in</Text>
      <TextInput style={s.input} autoCapitalize="none" placeholder="you@example.com" value={email} onChangeText={setEmail} />
      <TextInput style={s.input} secureTextEntry placeholder="••••••••" value={pw} onChangeText={setPw} />
      {err ? <Text style={s.err}>{err}</Text> : null}
      <Pressable onPress={submit} style={s.btn}><Text style={s.btnTxt}>{loading ? "Signing in..." : "Sign In"}</Text></Pressable>
      <Pressable onPress={() => navigation.navigate("SignUp")} style={{ marginTop: 12 }}><Text>Create an account</Text></Pressable>
      <Pressable onPress={forgot} style={{ marginTop: 8 }}><Text>Forgot password?</Text></Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: "center" },
  title: { fontSize: 24, marginBottom: 16, fontWeight: "700" },
  input: { borderWidth: 1, borderColor: "#ddd", padding: 12, borderRadius: 10, marginBottom: 12 },
  btn: { backgroundColor: "#ff6a00", padding: 14, borderRadius: 12, alignItems: "center" },
  btnTxt: { color: "#111", fontWeight: "600" },
  err: { color: "crimson", marginBottom: 8 },
});
