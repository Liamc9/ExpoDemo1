import { View, Text, Pressable } from "react-native";
import { useState } from "react";

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <View style={{ flex: 1, padding: 24, gap: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: "600" }}>
        Hello from Vite + React Native Web 👋
      </Text>

      <Pressable
        onPress={() => setCount((c) => c + 1)}
        style={{
          paddingVertical: 12,
          paddingHorizontal: 16,
          borderRadius: 8,
          backgroundColor: "#333",
        }}
      >
        <Text style={{ color: "white" }}>Clicked {count} times</Text>
      </Pressable>
    </View>
  );
}
