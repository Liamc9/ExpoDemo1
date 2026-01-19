// screens/Profile.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
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
  SafeAreaView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";

type Profile = {
  firstName: string;
  lastName: string;
  dobISO: string | null;
  email: string;
};

const STORAGE_KEY = "profile_v1";

export default function ProfileScreen() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile>({
    firstName: "Liam",
    lastName: "",
    dobISO: null,
    email: "liam@example.com",
  });
  const [draft, setDraft] = useState<Profile>(profile);
  const [showDOB, setShowDOB] = useState(false);

  const theme = useMemo(
    () => ({
      bg: "#F6F7F9",
      card: "#FFFFFF",
      border: "#EAECEF",
      text: "#0B1220",
      sub: "#6B7280",
      tint: "#2563EB",
      disabled: "#9CA3AF",
      disabledBg: "#E5E7EB",
    }),
    []
  );

  const firstRef = useRef<TextInput>(null);
  const lastRef = useRef<TextInput>(null);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          const migrated: Profile = {
            firstName: parsed.firstName ?? parsed.name?.split(" ")[0] ?? "",
            lastName:
              parsed.lastName ??
              parsed.name?.split(" ").slice(1).join(" ") ??
              "",
            dobISO: parsed.dobISO ?? null,
            email: parsed.email ?? "",
          };
          setProfile(migrated);
          setDraft(migrated);
        }
      } catch (e) {
        console.warn("Failed to load profile:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = async (next: Profile) => {
    setProfile(next);
    setDraft(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (e) {
      console.warn("Failed to save profile:", e);
    }
  };

  const hasChanges = JSON.stringify(profile) !== JSON.stringify(draft);

  const formatDOB = (iso: string | null) => {
    if (!iso) return "Add birthday";
    try {
      const [y, m, d] = iso.split("-").map((x) => Number(x));
      return new Date(y, m - 1, d).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return iso;
    }
  };

  const onPickDOB = (_: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === "android") setShowDOB(false);
    if (date) {
      const iso = [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0"),
      ].join("-");
      setDraft((p) => ({ ...p, dobISO: iso }));
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: "padding", android: undefined })}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.avatar, { borderColor: theme.border }]}>
              <Text style={styles.avatarText}>
                {(draft.firstName?.[0] || "Y").toUpperCase()}
                {(draft.lastName?.[0] || "P").toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: theme.text }]}>Profile</Text>
              {!!draft.email && (
                <Text
                  style={[styles.subtitle, { color: theme.sub }]}
                  numberOfLines={1}
                >
                  {draft.email}
                </Text>
              )}
            </View>
          </View>

          {/* Card */}
          <View
            style={[
              styles.card,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <EditableRow
              label="First name"
              value={draft.firstName}
              placeholder="Enter first name"
              onPress={() => firstRef.current?.focus()}
              renderInput={({ setActive }) => (
                <TextInput
                  ref={firstRef}
                  defaultValue={draft.firstName}
                  onChangeText={(t) =>
                    setDraft((p) => ({ ...p, firstName: t }))
                  }
                  onBlur={() => setActive(false)}
                  style={[
                    styles.input,
                    { borderColor: theme.border, color: theme.text },
                  ]}
                  placeholder="Enter first name"
                  placeholderTextColor={theme.sub}
                  autoCapitalize="words"
                  returnKeyType="next"
                  onSubmitEditing={() => lastRef.current?.focus()}
                />
              )}
            />
            <Divider />

            <EditableRow
              label="Last name"
              value={draft.lastName}
              placeholder="Enter last name"
              onPress={() => lastRef.current?.focus()}
              renderInput={({ setActive }) => (
                <TextInput
                  ref={lastRef}
                  defaultValue={draft.lastName}
                  onChangeText={(t) => setDraft((p) => ({ ...p, lastName: t }))}
                  onBlur={() => setActive(false)}
                  style={[
                    styles.input,
                    { borderColor: theme.border, color: theme.text },
                  ]}
                  placeholder="Enter last name"
                  placeholderTextColor={theme.sub}
                  autoCapitalize="words"
                />
              )}
            />
            <Divider />

            <Pressable
              onPress={() => setShowDOB(true)}
              style={({ pressed }) => [
                styles.rowPress,
                pressed && { opacity: 0.9 },
              ]}
            >
              <View style={styles.rowLeft}>
                <Text style={[styles.label, { color: theme.sub }]}>
                  Date of birth
                </Text>
                <Text
                  style={[
                    styles.value,
                    { color: draft.dobISO ? theme.text : theme.sub },
                  ]}
                >
                  {formatDOB(draft.dobISO)}
                </Text>
              </View>
              <Ionicons name="calendar-outline" size={18} color={theme.sub} />
            </Pressable>

            {showDOB && (
              <DateTimePicker
                value={
                  draft.dobISO
                    ? new Date(
                        Number(draft.dobISO.slice(0, 4)),
                        Number(draft.dobISO.slice(5, 7)) - 1,
                        Number(draft.dobISO.slice(8, 10))
                      )
                    : new Date(1995, 0, 1)
                }
                mode="date"
                display={Platform.select({
                  ios: "spinner",
                  android: "default",
                })}
                onChange={onPickDOB}
                maximumDate={new Date()}
              />
            )}
          </View>
        </ScrollView>

        {/* Save changes bar — always visible */}
        <View style={styles.saveBar}>
          <Pressable
            onPress={() => {
              if (!draft.firstName.trim()) {
                return Alert.alert("First name required");
              }
              save(draft);
              Alert.alert("Saved", "Your changes have been saved.");
            }}
            disabled={!hasChanges}
            accessibilityState={{ disabled: !hasChanges }}
            style={({ pressed }) => [
              styles.saveBtn,
              { backgroundColor: hasChanges ? theme.tint : theme.disabledBg },
              pressed && hasChanges && { opacity: 0.9 },
            ]}
          >
            <Text
              style={[
                styles.saveText,
                { color: hasChanges ? "#fff" : theme.disabled },
              ]}
            >
              Save changes
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ===== Reusable pieces ===== */

function EditableRow({
  label,
  value,
  placeholder,
  onPress,
  renderInput,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onPress?: () => void;
  renderInput: (ctx: { setActive: (b: boolean) => void }) => React.ReactNode;
}) {
  const [active, setActive] = useState(false);
  return active ? (
    <View>
      <Text style={styles.label}>{label}</Text>
      {renderInput({ setActive })}
    </View>
  ) : (
    <Pressable
      onPress={() => {
        setActive(true);
        onPress?.();
      }}
      style={({ pressed }) => [styles.rowPress, pressed && { opacity: 0.9 }]}
    >
      <View style={styles.rowLeft}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.value, { color: value ? "#0B1220" : "#6B7280" }]}>
          {value || placeholder || "Tap to add"}
        </Text>
      </View>
      <Ionicons name="create-outline" size={18} color="#98A2B3" />
    </Pressable>
  );
}

const Divider = () => <View style={styles.divider} />;

/* ===== Styles ===== */

const RADIUS = 16;

const styles = StyleSheet.create({
  scroll: { padding: 16, gap: 16 },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  title: { fontSize: 24, fontWeight: "800" },
  subtitle: { fontSize: 13, marginTop: 2 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  avatarText: { fontSize: 18, fontWeight: "800", color: "#111827" },

  card: {
    borderRadius: RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
  },

  rowPress: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  rowLeft: { flex: 1 },
  label: { fontSize: 12, color: "#6B7280", marginBottom: 4 },
  value: { fontSize: 16, fontWeight: "600" },

  input: {
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: "#FAFAFA",
  },

  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#EAECEF",
    marginVertical: 4,
  },

  saveBar: {
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: "#EAECEF",
    backgroundColor: "#FFFFFF",
  },
  saveBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveText: { fontSize: 16, fontWeight: "700" },
});
