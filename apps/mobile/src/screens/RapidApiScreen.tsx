// screens/RapidApiScreen.tsx
import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, ScrollView } from "react-native";
import { callRapid } from "../services/rapidService";

export default function RapidApiScreen() {
  const [endpoint, setEndpoint] = useState<"quotes.random" | "weather.city">("quotes.random");
  const [city, setCity] = useState("London");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const handleCall = async () => {
    try {
      setLoading(true);
      setError(null);
      setResult(null);

      let data;
      if (endpoint === "quotes.random") {
        data = await callRapid("quotes.random");
      } else {
        data = await callRapid("weather.city", { city, unit: "c" });
      }

      setResult(data);
    } catch (e: any) {
      console.log("Callable error:", e?.code, e?.message, e?.details);
      setError(e?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#F7F8FA",
        padding: 20,
      }}
    >
      <Text style={{ fontSize: 24, fontWeight: "700", marginBottom: 20 }}>🌐 Rapid API Demo</Text>

      {/* Endpoint Selector */}
      <View
        style={{
          flexDirection: "row",
          borderRadius: 12,
          overflow: "hidden",
          marginBottom: 20,
          borderWidth: 1,
          borderColor: "#E5E7EB",
        }}
      >
        <TouchableOpacity
          onPress={() => setEndpoint("quotes.random")}
          style={{
            flex: 1,
            backgroundColor: endpoint === "quotes.random" ? "#2563EB" : "#fff",
            paddingVertical: 12,
            alignItems: "center",
          }}
        >
          <Text style={{ color: endpoint === "quotes.random" ? "#fff" : "#0F172A", fontWeight: "600" }}>Quotes</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setEndpoint("weather.city")}
          style={{
            flex: 1,
            backgroundColor: endpoint === "weather.city" ? "#2563EB" : "#fff",
            paddingVertical: 12,
            alignItems: "center",
          }}
        >
          <Text style={{ color: endpoint === "weather.city" ? "#fff" : "#0F172A", fontWeight: "600" }}>Weather</Text>
        </TouchableOpacity>
      </View>

      {/* City Input (only for weather) */}
      {endpoint === "weather.city" && (
        <TextInput
          value={city}
          onChangeText={setCity}
          placeholder="Enter city"
          style={{
            width: "100%",
            backgroundColor: "#fff",
            borderRadius: 10,
            borderWidth: 1,
            borderColor: "#E5E7EB",
            padding: 12,
            fontSize: 16,
            marginBottom: 20,
          }}
        />
      )}

      {/* Action Button */}
      <TouchableOpacity
        onPress={handleCall}
        style={{
          width: "100%",
          backgroundColor: "#2563EB",
          borderRadius: 10,
          paddingVertical: 14,
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <Text style={{ color: "white", fontWeight: "600", fontSize: 16 }}>{loading ? "Loading..." : "Fetch Data"}</Text>
      </TouchableOpacity>

      {/* Loading */}
      {loading && <ActivityIndicator size="large" color="#2563EB" />}

      {/* Error */}
      {error && <Text style={{ color: "#DC2626", fontWeight: "600", marginTop: 10 }}>{error}</Text>}

      {/* Result */}
      {!loading && result && (
        <View
          style={{
            width: "100%",
            backgroundColor: "#fff",
            borderRadius: 12,
            padding: 16,
            shadowColor: "#000",
            shadowOpacity: 0.05,
            shadowRadius: 4,
            elevation: 2,
          }}
        >
          {endpoint === "quotes.random" ? (
            <>
              <Text style={{ fontSize: 18, fontStyle: "italic", marginBottom: 10 }}>“{result.content}”</Text>
              <Text style={{ fontWeight: "600", color: "#2563EB" }}>— {result.author}</Text>
            </>
          ) : (
            <>
              <Text style={{ fontSize: 20, fontWeight: "700", marginBottom: 4 }}>{result.name}</Text>
              <Text style={{ fontSize: 16, color: "#475569" }}>
                {result.tempC}°C • feels like {result.feelsLikeC}°C
              </Text>
              <Text style={{ fontSize: 14, color: "#64748B", marginTop: 4 }}>{result.desc}</Text>
            </>
          )}
        </View>
      )}
    </ScrollView>
  );
}
