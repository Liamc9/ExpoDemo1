import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Switch,
  Pressable,
  StyleSheet,
  Modal,
  FlatList,
  useColorScheme,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";

type SettingsState = {
  darkMode: boolean | "system"; // "system" respects OS theme
  notificationsEnabled: boolean;
  hapticsEnabled: boolean;
  language: string; // e.g., "en", "es", "bg"
};

const STORAGE_KEY = "app_settings_v1";

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "bg", label: "Български" },
  { code: "de", label: "Deutsch" },
];

export default function SettingsScreen() {
  const systemScheme = useColorScheme(); // "light" | "dark"
  const [loading, setLoading] = useState(true);
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  const [settings, setSettings] = useState<SettingsState>({
    darkMode: "system",
    notificationsEnabled: true,
    hapticsEnabled: true,
    language: "en",
  });

  // Derived theme: if "system", use OS; else force.
  const effectiveDark =
    settings.darkMode === "system"
      ? systemScheme === "dark"
      : settings.darkMode === true;

  const theme = useMemo(
    () => ({
      bg: effectiveDark ? "#0b0b0b" : "#ffffff",
      card: effectiveDark ? "#141414" : "#f6f6f6",
      border: effectiveDark ? "#222" : "#e6e6e6",
      text: effectiveDark ? "#f2f2f2" : "#111111",
      sub: effectiveDark ? "#b5b5b5" : "#555555",
      tint: "#ff6b00", // accent
    }),
    [effectiveDark]
  );

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as SettingsState;
          setSettings((s) => ({ ...s, ...parsed }));
        }
      } catch (e) {
        console.warn("Failed to load settings:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = async (next: Partial<SettingsState>) => {
    const merged = { ...settings, ...next };
    setSettings(merged);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    } catch (e) {
      console.warn("Failed to save settings:", e);
    }
  };

  const resetToDefaults = async () => {
    const defaults: SettingsState = {
      darkMode: "system",
      notificationsEnabled: true,
      hapticsEnabled: true,
      language: "en",
    };
    setSettings(defaults);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
  };

  if (loading) {
    return (
      <View style={[s.container, { backgroundColor: theme.bg }]}>
        <Text style={[s.sectionTitle, { color: theme.sub }]}>Loading…</Text>
      </View>
    );
  }

  return (
    <View style={[s.container, { backgroundColor: theme.bg }]}>
      <Section title="Appearance" theme={theme}>
        <ListRow
          theme={theme}
          leftIcon="color-palette-outline"
          title="Theme"
          subtitle={
            settings.darkMode === "system"
              ? `System (${systemScheme ?? "light"})`
              : settings.darkMode
              ? "Dark"
              : "Light"
          }
          onPress={() => {
            // Cycle: system → light → dark → system
            const next =
              settings.darkMode === "system"
                ? false
                : settings.darkMode === false
                ? true
                : "system";
            save({ darkMode: next as SettingsState["darkMode"] });
          }}
          right={<Pill theme={theme} text="Change" />}
        />
      </Section>

      <Section title="Preferences" theme={theme}>
        <ToggleRow
          theme={theme}
          leftIcon="notifications-outline"
          title="Enable notifications"
          value={settings.notificationsEnabled}
          onValueChange={(v) => save({ notificationsEnabled: v })}
        />
        <ToggleRow
          theme={theme}
          leftIcon="phone-portrait-outline"
          title="Haptics"
          subtitle="Vibration feedback on actions"
          value={settings.hapticsEnabled}
          onValueChange={(v) => save({ hapticsEnabled: v })}
        />
        <ListRow
          theme={theme}
          leftIcon="language-outline"
          title="Language"
          subtitle={LANGUAGES.find((l) => l.code === settings.language)?.label}
          onPress={() => setShowLanguageModal(true)}
          right={<Ionicons name="chevron-forward" size={18} color={theme.sub} />}
        />
      </Section>

      <Section title="About" theme={theme}>
        <ListRow
          theme={theme}
          leftIcon="information-circle-outline"
          title="Version"
          subtitle="1.0.0"
        />
        <ListRow
          theme={theme}
          leftIcon="open-outline"
          title="Open source licenses"
          onPress={() => Alert.alert("Licenses", "Show your licenses screen here")}
          right={<Ionicons name="chevron-forward" size={18} color={theme.sub} />}
        />
      </Section>

      <Section theme={theme}>
        <Pressable
          style={[s.dangerBtn, { borderColor: theme.border }]}
          onPress={resetToDefaults}
        >
          <Ionicons name="refresh-outline" size={16} color={theme.tint} />
          <Text style={[s.dangerText, { color: theme.tint }]}>
            Reset to defaults
          </Text>
        </Pressable>
      </Section>

      {/* Language chooser modal */}
      <Modal visible={showLanguageModal} transparent animationType="slide">
        <View style={s.modalBackdrop}>
          <View style={[s.modalSheet, { backgroundColor: theme.card }]}>
            <View style={s.modalHeader}>
              <Text style={[s.modalTitle, { color: theme.text }]}>Language</Text>
              <Pressable onPress={() => setShowLanguageModal(false)}>
                <Ionicons name="close" size={22} color={theme.sub} />
              </Pressable>
            </View>
            <FlatList
              data={LANGUAGES}
              keyExtractor={(item) => item.code}
              ItemSeparatorComponent={() => (
                <View style={[s.separator, { backgroundColor: theme.border }]} />
              )}
              renderItem={({ item }) => {
                const active = item.code === settings.language;
                return (
                  <Pressable
                    onPress={() => {
                      save({ language: item.code });
                      setShowLanguageModal(false);
                    }}
                    style={s.modalRow}
                  >
                    <Text
                      style={[
                        s.modalRowText,
                        { color: theme.text, fontWeight: active ? "700" : "400" },
                      ]}
                    >
                      {item.label}
                    </Text>
                    {active && (
                      <Ionicons name="checkmark" size={18} color={theme.tint} />
                    )}
                  </Pressable>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* ---------- Reusable pieces ---------- */

function Section({
  title,
  children,
  theme,
}: {
  title?: string;
  children: React.ReactNode;
  theme: ReturnType<typeof useMemo> extends infer T ? any : any;
}) {
  return (
    <View style={s.section}>
      {title ? (
        <Text style={[s.sectionTitle, { color: theme.sub }]}>{title}</Text>
      ) : null}
      <View style={[s.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        {children}
      </View>
    </View>
  );
}

function ListRow({
  theme,
  leftIcon,
  title,
  subtitle,
  right,
  onPress,
}: {
  theme: any;
  leftIcon?: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        s.row,
        { opacity: pressed ? 0.7 : 1, borderBottomColor: theme.border },
      ]}
    >
      <View style={s.rowLeft}>
        {leftIcon ? (
          <Ionicons name={leftIcon} size={18} color={theme.sub} style={{ marginRight: 10 }} />
        ) : null}
        <View>
          <Text style={[s.rowTitle, { color: theme.text }]}>{title}</Text>
          {subtitle ? (
            <Text style={[s.rowSub, { color: theme.sub }]}>{subtitle}</Text>
          ) : null}
        </View>
      </View>
      <View style={s.rowRight}>{right}</View>
    </Pressable>
  );
}

function ToggleRow({
  theme,
  leftIcon,
  title,
  subtitle,
  value,
  onValueChange,
}: {
  theme: any;
  leftIcon?: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  return (
    <View style={[s.row, { borderBottomColor: theme.border }]}>
      <View style={s.rowLeft}>
        {leftIcon ? (
          <Ionicons name={leftIcon} size={18} color={theme.sub} style={{ marginRight: 10 }} />
        ) : null}
        <View>
          <Text style={[s.rowTitle, { color: theme.text }]}>{title}</Text>
          {subtitle ? (
            <Text style={[s.rowSub, { color: theme.sub }]}>{subtitle}</Text>
          ) : null}
        </View>
      </View>
      <Switch value={value} onValueChange={onValueChange} />
    </View>
  );
}

function Pill({ text, theme }: { text: string; theme: any }) {
  return (
    <View style={[s.pill, { borderColor: theme.border }]}>
      <Text style={[s.pillText, { color: theme.sub }]}>{text}</Text>
    </View>
  );
}

/* ---------- Styles ---------- */
const s = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 13, letterSpacing: 0.3, marginBottom: 8 },
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  row: {
    minHeight: 52,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1 },
  rowRight: { marginLeft: 12 },
  rowTitle: { fontSize: 16 },
  rowSub: { fontSize: 12, marginTop: 2 },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pillText: { fontSize: 12 },
  dangerBtn: {
    height: 48,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  dangerText: { fontSize: 15, fontWeight: "600" },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    maxHeight: "60%",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 24,
  },
  modalHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalTitle: { fontSize: 18, fontWeight: "700" },
  modalRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalRowText: { fontSize: 16 },
  separator: { height: StyleSheet.hairlineWidth, width: "100%" },
});
