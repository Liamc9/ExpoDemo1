import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";

type Profile = {
  name: string;
  username: string;
  email: string;
  bio: string;
  avatarUri?: string; // optional (if you later add image picker)
};

const STORAGE_KEY = "profile_v1";

export default function ProfileScreen() {
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState<Profile>({
    name: "Liam",
    username: "liam_demo",
    email: "liam@example.com",
    bio: "Data analyst, dashboards, and RN tinkering.",
    avatarUri: undefined,
  });

  // simple theme (matches Settings approach)
  const theme = useMemo(
    () => ({
      bg: "#0b0b0b0A", // subtle
      card: "#fff",
      border: "#e6e6e6",
      text: "#111",
      sub: "#666",
      tint: "#ff6b00",
    }),
    []
  );

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setProfile(JSON.parse(raw));
      } catch (e) {
        console.warn("Failed to load profile:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = async (next: Profile) => {
    setProfile(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (e) {
      console.warn("Failed to save profile:", e);
    }
  };

  const onSavePress = () => {
    // basic validation
    if (!profile.name.trim()) {
      Alert.alert("Name required", "Please enter your name.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(profile.email)) {
      Alert.alert("Invalid email", "Please enter a valid email address.");
      return;
    }
    save(profile);
    setEditing(false);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: "padding", android: undefined })}
      style={{ flex: 1, backgroundColor: theme.bg }}
    >
      <ScrollView contentContainerStyle={s.scroll}>
        {/* Card */}
        <View
          style={[
            s.card,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          {/* Header row */}
          <View style={s.headerRow}>
            <Avatar name={profile.name} size={72} uri={profile.avatarUri} />
            <View style={{ flex: 1, marginLeft: 14 }}>
              {editing ? (
                <TextInput
                  value={profile.name}
                  onChangeText={(t) => setProfile((p) => ({ ...p, name: t }))}
                  placeholder="Full name"
                  style={[s.input, s.inputTitle]}
                  placeholderTextColor={theme.sub}
                />
              ) : (
                <Text style={[s.title, { color: theme.text }]}>
                  {profile.name || "—"}
                </Text>
              )}
              {editing ? (
                <TextInput
                  value={profile.username}
                  onChangeText={(t) =>
                    setProfile((p) => ({
                      ...p,
                      username: t.replace(/\s/g, ""),
                    }))
                  }
                  placeholder="Username"
                  style={[s.input, s.inputSub]}
                  placeholderTextColor={theme.sub}
                  autoCapitalize="none"
                />
              ) : (
                <Text style={[s.subtitle, { color: theme.sub }]}>
                  @{profile.username || "username"}
                </Text>
              )}
            </View>

            <Pressable
              onPress={() => (editing ? onSavePress() : setEditing(true))}
              style={({ pressed }) => [
                s.editBtn,
                { borderColor: theme.border, opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <Ionicons
                name={editing ? "save-outline" : "create-outline"}
                size={18}
                color={theme.tint}
              />
              <Text style={[s.editBtnText, { color: theme.tint }]}>
                {editing ? "Save" : "Edit"}
              </Text>
            </Pressable>
          </View>

          {/* Fields */}
          <Field
            label="Email"
            value={profile.email}
            editable={editing}
            onChangeText={(t) => setProfile((p) => ({ ...p, email: t }))}
            theme={theme}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Field
            label="Bio"
            value={profile.bio}
            editable={editing}
            onChangeText={(t) => setProfile((p) => ({ ...p, bio: t }))}
            theme={theme}
            multiline
          />

          {/* Optional actions row */}
          <View style={s.rowActions}>
            <RowAction
              icon="share-outline"
              text="Share profile"
              onPress={() => Alert.alert("Share", "Implement share logic")}
              theme={theme}
            />
            <RowAction
              icon="copy-outline"
              text="Copy link"
              onPress={() => Alert.alert("Copied", "Profile link copied")}
              theme={theme}
            />
          </View>
        </View>

        {/* Danger zone */}
        <View
          style={[
            s.card,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <Text style={[s.sectionTitle, { color: theme.sub }]}>
            Danger Zone
          </Text>
          <Pressable
            onPress={() =>
              Alert.alert(
                "Delete profile?",
                "This will clear saved profile data.",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                      const blank: Profile = {
                        name: "",
                        username: "",
                        email: "",
                        bio: "",
                      };
                      await save(blank);
                      setEditing(true);
                    },
                  },
                ]
              )
            }
            style={({ pressed }) => [
              s.dangerBtn,
              { borderColor: theme.border, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Ionicons name="trash-outline" size={18} color={theme.tint} />
            <Text style={[s.dangerText, { color: theme.tint }]}>
              Delete Profile
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* ------------ Reusable bits ------------ */

function Avatar({
  name,
  size = 64,
  uri,
}: {
  name: string;
  size?: number;
  uri?: string;
}) {
  // If you add expo-image-picker later, show the picked image via `uri`.
  if (uri) {
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          overflow: "hidden",
          backgroundColor: "#ddd",
        }}
      >
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <Text style={{ display: "none" }}>{uri as any}</Text>
      </View>
    );
  }

  const initials =
    name
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0]?.toUpperCase())
      .slice(0, 2)
      .join("") || "👤";

  const bg = stringToColor(name || "user");
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bg,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{ color: "white", fontSize: size * 0.34, fontWeight: "700" }}
      >
        {initials}
      </Text>
    </View>
  );
}

function stringToColor(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  const hue = Math.abs(h) % 360;
  return `hsl(${hue}, 60%, 50%)`;
}

function Field({
  label,
  value,
  onChangeText,
  editable,
  theme,
  multiline,
  keyboardType,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  editable: boolean;
  theme: any;
  multiline?: boolean;
  keyboardType?: "default" | "email-address";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
}) {
  return (
    <View style={s.fieldBox}>
      <Text style={[s.fieldLabel, { color: theme.sub }]}>{label}</Text>
      {editable ? (
        <TextInput
          value={value}
          onChangeText={onChangeText}
          style={[s.input, { color: theme.text }]}
          placeholder={label}
          placeholderTextColor={theme.sub}
          multiline={multiline}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
        />
      ) : (
        <Text style={[s.fieldValue, { color: theme.text }]}>
          {value || "—"}
        </Text>
      )}
    </View>
  );
}

function RowAction({
  icon,
  text,
  onPress,
  theme,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  text: string;
  onPress: () => void;
  theme: any;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        s.rowAction,
        { borderColor: theme.border, opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <Ionicons name={icon} size={16} color={theme.sub} />
      <Text style={[s.rowActionText, { color: theme.text }]}>{text}</Text>
    </Pressable>
  );
}

/* ------------ Styles ------------ */

const s = StyleSheet.create({
  scroll: { padding: 16, gap: 16 },
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
  },
  headerRow: { flexDirection: "row", alignItems: "center" },
  title: { fontSize: 20, fontWeight: "700" },
  subtitle: { marginTop: 2, fontSize: 13 },
  editBtn: {
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 9,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginLeft: 8,
  },
  editBtnText: { fontSize: 14, fontWeight: "600" },
  fieldBox: { marginTop: 16 },
  fieldLabel: { fontSize: 12, letterSpacing: 0.2, marginBottom: 6 },
  fieldValue: { fontSize: 16 },
  input: {
    fontSize: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e6e6e6",
    backgroundColor: "#fafafa",
  },
  inputTitle: { fontSize: 18, fontWeight: "700" },
  inputSub: { fontSize: 13 },
  rowActions: { flexDirection: "row", gap: 10, marginTop: 16 },
  rowAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  rowActionText: { fontSize: 14 },
  sectionTitle: { fontSize: 12, marginBottom: 8 },
  dangerBtn: {
    height: 44,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  dangerText: { fontSize: 15, fontWeight: "600" },
});
