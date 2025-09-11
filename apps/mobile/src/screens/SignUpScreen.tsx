import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAuth } from "../auth/AuthProvider";

type Props = NativeStackScreenProps<any, "SignUp">;

export default function SignUpScreen({ navigation }: Props) {
  const { signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setErr(null);
    if (!email || !pw || !confirm) return setErr("Fill all fields.");
    if (pw !== confirm) return setErr("Passwords do not match.");
    setLoading(true);
    try {
      await signUp(email, pw);
    } catch (e: any) {
      setErr(e?.message ?? "Sign up failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.container}>
      <Text style={s.title}>Create account</Text>
      <TextInput
        style={s.input}
        autoCapitalize="none"
        placeholder="you@example.com"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={s.input}
        secureTextEntry
        placeholder="Password"
        value={pw}
        onChangeText={setPw}
      />
      <TextInput
        style={s.input}
        secureTextEntry
        placeholder="Confirm password"
        value={confirm}
        onChangeText={setConfirm}
      />
      {err ? <Text style={s.err}>{err}</Text> : null}
      <Pressable onPress={submit} style={s.btn}>
        <Text style={s.btnTxt}>
          {loading ? "Creating..." : "Create Account"}
        </Text>
      </Pressable>
      <Pressable onPress={() => navigation.goBack()} style={{ marginTop: 12 }}>
        <Text>Back to sign in</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: "center" },
  title: { fontSize: 24, marginBottom: 16, fontWeight: "700" },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  btn: {
    backgroundColor: "#ff6a00",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  btnTxt: { color: "#111", fontWeight: "600" },
  err: { color: "crimson", marginBottom: 8 },
});
