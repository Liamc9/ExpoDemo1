import React, { useState } from "react";
import { View, Text, Button, ActivityIndicator, StyleSheet } from "react-native";

const JOKE_URL = `https://getjoke-e4sangfijq-nw.a.run.app`;

export default function JokeScreen() {
  const [joke, setJoke] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchJoke = async () => {
    setLoading(true);
    setError(null);
    setJoke(null);

    try {
      console.log("[Joke] calling:", JOKE_URL);
      const res = await fetch(JOKE_URL, { method: "GET" });
      const text = await res.text();
      let json: any;
      try {
        json = JSON.parse(text);
      } catch {
        json = { ok: false, error: text };
      }

      if (!res.ok || !json?.ok) {
        const msg = typeof json?.error === "string" ? json.error : `HTTP ${res.status}`;
        throw new Error(msg);
      }

      setJoke(json.data?.joke ?? "No joke returned");
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dad Joke</Text>
      {loading && <ActivityIndicator />}
      {error && <Text style={styles.error}>Error: {error}</Text>}
      {joke && <Text style={styles.joke}>{joke}</Text>}
      <Button title="Get Joke" onPress={fetchJoke} disabled={loading} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 16 },
  title: { fontSize: 22, fontWeight: "600", marginBottom: 8 },
  error: { color: "red", marginVertical: 8, textAlign: "center" },
  joke: { fontSize: 18, marginVertical: 16, textAlign: "center" },
});
