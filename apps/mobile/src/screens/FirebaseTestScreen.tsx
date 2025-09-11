// apps/mobile/FirebaseTestScreen.tsx
import React, { useState } from "react";
import { View, Text, Button, StyleSheet } from "react-native";
import { auth } from "../firebase-config";
import { createUserWithEmailAndPassword, signOut } from "firebase/auth";

export default function FirebaseTestScreen() {
  const [message, setMessage] = useState("Not connected yet");

  const handleTest = async () => {
    try {
      // Create a test user with random email (so you can run it more than once)
      const email = `test${Date.now()}@example.com`;
      const password = "password123";
      const userCred = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      setMessage(`✅ Connected! Signed in as ${userCred.user.email}`);
    } catch (err: any) {
      setMessage(`❌ Error: ${err.message}`);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setMessage("Signed out");
    } catch (err: any) {
      setMessage(`❌ Sign out error: ${err.message}`);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Firebase Connection Test</Text>
      <Text style={styles.status}>{message}</Text>
      <Button title="Run Firebase Test" onPress={handleTest} />
      <View style={{ height: 12 }} />
      <Button title="Sign Out" onPress={handleSignOut} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  title: { fontSize: 20, marginBottom: 10 },
  status: { marginBottom: 20, textAlign: "center" },
});
