import React, { useState } from "react";
import {
  View,
  Image,
  Text,
  StyleSheet,
  Dimensions,
  Pressable,
  SafeAreaView,
} from "react-native";

// Mirror your app.json values here
const BG_COLOR = "#43A047";
const SPLASH_IMAGE = require("../../assets/BasilNameNoBG.png");

// Starting scale relative to screen width (e.g., 0.38 = 38% of width)
const INITIAL_SCALE = 0.9;

const { width, height } = Dimensions.get("window");

export default function SplashPreview() {
  const [scale, setScale] = useState(INITIAL_SCALE);

  const imgWidth = Math.round(width * scale);
  // keep aspect via contain by using just width and letting height auto with resizeMode="contain"
  // to ensure no overflow we cap to 80% of height visually
  const maxHeight = Math.round(height * 0.8);

  const bump = (delta: number) =>
    setScale((s) => Math.max(0.1, Math.min(0.9, +(s + delta).toFixed(3)))); // clamp 10%..90%

  return (
    <View style={[styles.root, { backgroundColor: BG_COLOR }]}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.center}>
          <Image
            source={SPLASH_IMAGE}
            resizeMode="contain"
            style={{ width: imgWidth, height: maxHeight }}
          />
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <Pressable style={styles.btn} onPress={() => bump(-0.02)}>
            <Text style={styles.btnTxt}>−</Text>
          </Pressable>
          <Text style={styles.scaleText}>{Math.round(scale * 100)}%</Text>
          <Pressable style={styles.btn} onPress={() => bump(+0.02)}>
            <Text style={styles.btnTxt}>＋</Text>
          </Pressable>
        </View>

        <Text style={styles.hint}>
          Preview only. When you like the size, add transparent padding to the
          PNG or export a smaller logo to match this percentage, then rebuild
          your dev client to see the real splash.
        </Text>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  controls: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    paddingBottom: 24,
  },
  btn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#00000080",
    alignItems: "center",
    justifyContent: "center",
  },
  btnTxt: { color: "#fff", fontSize: 22, fontWeight: "700" },
  scaleText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    width: 56,
    textAlign: "center",
  },
  hint: {
    textAlign: "center",
    color: "#ffffffcc",
    fontSize: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
});
