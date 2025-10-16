import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";

const ACCENT = "#2ecc71";

export default function CreateShopDetails({ navigation, route }: any) {
  const [name, setName] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "Allow photo access to upload a picture."
      );
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (res.canceled) return;
    setBusy(true);
    try {
      const manipulated = await ImageManipulator.manipulateAsync(
        res.assets[0].uri,
        [{ resize: { width: 1200 } }],
        { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
      );
      setImageUri(manipulated.uri);
    } finally {
      setBusy(false);
    }
  };

  const next = () => {
    if (!name.trim())
      return Alert.alert("Add a name", "Your shop needs a name.");
    if (!imageUri)
      return Alert.alert("Add a cover", "Please choose a cover image.");
    navigation.navigate("VerifyIdentity", {
      draftShop: { name: name.trim(), imageUri },
    });
  };

  return (
    <View style={s.safe}>
      <Text style={s.h1}>Create your shop</Text>
      <View style={s.card}>
        <View style={{ gap: 10 }}>
          <View style={s.inputWrap}>
            <Ionicons name="storefront-outline" size={16} color="#98A2B3" />
            <TextInput
              placeholder="Shop name"
              placeholderTextColor="#98A2B3"
              value={name}
              onChangeText={setName}
              style={s.input}
            />
          </View>

          <TouchableOpacity
            onPress={pickImage}
            style={s.imagePicker}
            activeOpacity={0.9}
          >
            {imageUri ? (
              <Image
                source={{ uri: imageUri }}
                style={{ width: "100%", height: "100%" }}
              />
            ) : (
              <View style={s.imagePrompt}>
                {busy ? (
                  <ActivityIndicator />
                ) : (
                  <Ionicons name="image-outline" size={22} color="#98A2B3" />
                )}
                <Text style={{ color: "#98A2B3" }}>
                  {busy ? "Processing…" : "Tap to add a cover image"}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={next}
            style={[s.primaryBtn, { backgroundColor: ACCENT }]}
            activeOpacity={0.9}
          >
            <Ionicons name="chevron-forward" size={18} color="#0B1220" />
            <Text style={s.primaryBtnText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F8FAFC", padding: 16 },
  h1: { fontSize: 22, fontWeight: "800", color: "#0B1220", marginBottom: 12 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FAFAFA",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E5E7EB",
  },
  input: { flex: 1, color: "#0B1220", fontSize: 15 },
  imagePicker: {
    height: 170,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#F3F4F6",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E5E7EB",
  },
  imagePrompt: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  primaryBtn: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
  },
  primaryBtnText: { color: "#0B1220", fontSize: 15, fontWeight: "800" },
});
