// screens/RapidDemoScreen.tsx
import React, { useMemo, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet, ScrollView } from "react-native";
import Rapid from "../services/rapid";
import { useRapid } from "../hooks/useRapid";

export default function RapidDemoScreen() {
  // --- Random Quote ---
  const quoteFetcher = useMemo(() => () => Rapid.randomQuote(), []);
  const quote = useRapid(quoteFetcher, [quoteFetcher], { auto: false });

  // --- Weather ---
  const [city, setCity] = useState("London");
  const [unit, setUnit] = useState<"metric" | "imperial">("metric");

  const weatherFetcher = useMemo(() => () => Rapid.cityWeather(city.trim(), unit), [city, unit]);
  const weather = useRapid(weatherFetcher, [weatherFetcher], { auto: false });

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Rapid API Demo</Text>

      {/* QUOTE CARD */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🎲 Random Quote</Text>

        {quote.loading ? (
          <ActivityIndicator />
        ) : quote.error ? (
          <Text style={styles.error}>Error: {quote.error}</Text>
        ) : quote.data ? (
          <View style={{ gap: 6 }}>
            <Text style={styles.quote}>"{quote.data.content}"</Text>
            <Text style={styles.muted}>— {quote.data.author}</Text>
          </View>
        ) : (
          <Text style={styles.muted}>Press “Get Quote” to fetch one.</Text>
        )}

        <TouchableOpacity style={styles.btn} onPress={() => quote.refetch()} disabled={quote.loading}>
          <Text style={styles.btnText}>{quote.loading ? "Loading..." : "Get Quote"}</Text>
        </TouchableOpacity>
      </View>

      {/* WEATHER CARD */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🌤 City Weather</Text>

        <View style={styles.row}>
          <TextInput value={city} onChangeText={setCity} placeholder="City (e.g., London)" style={styles.input} autoCapitalize="words" />
          <View style={styles.toggleGroup}>
            <TouchableOpacity onPress={() => setUnit("metric")} style={[styles.toggleBtn, unit === "metric" && styles.toggleBtnActive]}>
              <Text style={[styles.toggleText, unit === "metric" && styles.toggleTextActive]}>°C</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setUnit("imperial")} style={[styles.toggleBtn, unit === "imperial" && styles.toggleBtnActive]}>
              <Text style={[styles.toggleText, unit === "imperial" && styles.toggleTextActive]}>°F</Text>
            </TouchableOpacity>
          </View>
        </View>

        {weather.loading ? (
          <ActivityIndicator />
        ) : weather.error ? (
          <Text style={styles.error}>Error: {weather.error}</Text>
        ) : weather.data ? (
          <View style={{ gap: 6 }}>
            <Text style={styles.cityName}>{weather.data.name}</Text>
            <Text style={styles.bigTemp}>
              {Math.round(weather.data.tempC)}
              {unit === "metric" ? "°C" : "°F"}
            </Text>
            <Text style={styles.muted}>
              Feels like {Math.round(weather.data.feelsLikeC)}
              {unit === "metric" ? "°C" : "°F"}
            </Text>
            <Text style={styles.muted}>{weather.data.desc}</Text>
          </View>
        ) : (
          <Text style={styles.muted}>Enter a city and press “Get Weather”.</Text>
        )}

        <TouchableOpacity style={styles.btn} onPress={() => weather.refetch()} disabled={weather.loading || !city.trim()}>
          <Text style={styles.btnText}>{weather.loading ? "Loading..." : "Get Weather"}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 16 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 4 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
    gap: 12,
  },
  cardTitle: { fontSize: 18, fontWeight: "600" },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  toggleGroup: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    borderRadius: 10,
    overflow: "hidden",
  },
  toggleBtn: { paddingVertical: 10, paddingHorizontal: 12 },
  toggleBtnActive: { backgroundColor: "#2ecc71" },
  toggleText: { fontWeight: "600" },
  toggleTextActive: { color: "#fff" },
  btn: {
    backgroundColor: "#2ecc71",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontWeight: "700" },
  error: { color: "#ef4444" },
  muted: { color: "#64748b" },
  quote: { fontSize: 16, fontStyle: "italic" },
  cityName: { fontSize: 16, fontWeight: "600" },
  bigTemp: { fontSize: 28, fontWeight: "800" },
});
