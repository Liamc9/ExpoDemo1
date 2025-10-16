import React from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { useQuote } from "../hooks/useQuote";

export default function QuoteScreen() {
  const { quote, loading, error, refresh } = useQuote();

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24, backgroundColor: "#F7F8FA" }}>
      {loading && <ActivityIndicator size="large" />}
      {error && <Text style={{ color: "#DC2626", marginBottom: 12 }}>{error}</Text>}
      {quote && (
        <>
          <Text style={{ fontSize: 20, fontStyle: "italic", textAlign: "center", marginBottom: 12 }}>“{quote.content}”</Text>
          <Text style={{ fontWeight: "bold", color: "#2563EB" }}>— {quote.author}</Text>
        </>
      )}
      <TouchableOpacity
        onPress={refresh}
        style={{
          marginTop: 24,
          paddingHorizontal: 20,
          paddingVertical: 12,
          backgroundColor: "#2563EB",
          borderRadius: 999,
        }}
      >
        <Text style={{ color: "white", fontWeight: "600" }}>New Quote</Text>
      </TouchableOpacity>
    </View>
  );
}
