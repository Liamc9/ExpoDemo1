// screens/ManagePreferences.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  Modal,
  SafeAreaView,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";

type ThemeMode = "system" | "light" | "dark";

type Preferences = {
  pushEnabled: boolean;
  emailComm: boolean;
  theme: ThemeMode;
  language: string; // e.g., "en-GB"
  currency: string; // e.g., "GBP"
  dataSaver: boolean;
};

const STORAGE_KEY = "preferences_v1_basic";
const DEFAULTS: Preferences = {
  pushEnabled: true,
  emailComm: true,
  theme: "system",
  language: "en-GB",
  currency: "GBP",
  dataSaver: false,
};

export default function ManagePreferences({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [prefs, setPrefs] = useState<Preferences>(DEFAULTS);
  const [draft, setDraft] = useState<Preferences>(DEFAULTS);

  const [openLang, setOpenLang] = useState(false);
  const [openCurr, setOpenCurr] = useState(false);

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

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          const merged: Preferences = { ...DEFAULTS, ...parsed };
          setPrefs(merged);
          setDraft(merged);
        } else {
          setPrefs(DEFAULTS);
          setDraft(DEFAULTS);
        }
      } catch {
        setPrefs(DEFAULTS);
        setDraft(DEFAULTS);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const hasChanges = JSON.stringify(prefs) !== JSON.stringify(draft);

  const save = async () => {
    setPrefs(draft);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  };

  /* UI bits */
  const Row = ({
    icon,
    label,
    children,
    onPress,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    children?: React.ReactNode;
    onPress?: () => void;
  }) => (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.row, pressed && onPress && { opacity: 0.9 }]}
    >
      <Ionicons name={icon} size={20} color={theme.text} style={{ width: 22 }} />
      <Text style={styles.rowText}>{label}</Text>
      {children}
    </Pressable>
  );

  const Tile: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <View style={[styles.tile, { backgroundColor: theme.card, borderColor: theme.border }]}>
      {children}
    </View>
  );

  const Divider = () => <View style={[styles.divider, { backgroundColor: theme.border }]} />;

  const Chip = ({
    text,
    selected,
    onPress,
  }: { text: string; selected?: boolean; onPress?: () => void }) => (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          borderColor: selected ? theme.tint : theme.border,
          backgroundColor: selected ? "#EEF2FF" : "#FFFFFF",
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <Text style={{ color: selected ? theme.tint : theme.text, fontWeight: "700", fontSize: 13 }}>
        {text}
      </Text>
    </Pressable>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 24 }}>
               {/* Notifications */}
        <Text style={[styles.sectionTitle, { color: theme.sub }]}>Notifications</Text>
        <Tile>
          <Row icon="notifications-outline" label="Push notifications">
            <Switch
              value={draft.pushEnabled}
              onValueChange={(v) => setDraft((p) => ({ ...p, pushEnabled: v }))}
              thumbColor={draft.pushEnabled ? theme.tint : undefined}
              trackColor={{ true: "#DCE7FF", false: "#E5E7EB" }}
            />
          </Row>
        </Tile>

        {/* Communication */}
        <Text style={[styles.sectionTitle, { color: theme.sub }]}>Communication</Text>
        <Tile>
          <Row icon="mail-outline" label="Email updates">
            <Switch
              value={draft.emailComm}
              onValueChange={(v) => setDraft((p) => ({ ...p, emailComm: v }))}
              thumbColor={draft.emailComm ? theme.tint : undefined}
              trackColor={{ true: "#DCE7FF", false: "#E5E7EB" }}
            />
          </Row>
        </Tile>

        {/* Appearance & region */}
        <Text style={[styles.sectionTitle, { color: theme.sub }]}>Appearance & region</Text>
        <Tile>
          <View style={styles.pad}>
            <Text style={[styles.smallLabel, { color: theme.sub }]}>Theme</Text>
            <View style={styles.chipsRow}>
              {(["system", "light", "dark"] as ThemeMode[]).map((opt) => (
                <Chip
                  key={opt}
                  text={opt[0].toUpperCase() + opt.slice(1)}
                  selected={draft.theme === opt}
                  onPress={() => setDraft((p) => ({ ...p, theme: opt }))}
                />
              ))}
            </View>
          </View>
          <Divider />
          <Row icon="language-outline" label="Language" onPress={() => setOpenLang(true)}>
            <Text style={styles.rowValue}>{draft.language}</Text>
            <Ionicons name="chevron-forward" size={18} color="#98A2B3" />
          </Row>
          <Divider />
          <Row icon="cash-outline" label="Currency" onPress={() => setOpenCurr(true)}>
            <Text style={styles.rowValue}>{draft.currency}</Text>
            <Ionicons name="chevron-forward" size={18} color="#98A2B3" />
          </Row>
        </Tile>

        {/* Data */}
        <Text style={[styles.sectionTitle, { color: theme.sub }]}>Data</Text>
        <Tile>
          <Row icon="leaf-outline" label="Data saver">
            <Switch
              value={draft.dataSaver}
              onValueChange={(v) => setDraft((p) => ({ ...p, dataSaver: v }))}
              thumbColor={draft.dataSaver ? theme.tint : undefined}
              trackColor={{ true: "#DCE7FF", false: "#E5E7EB" }}
            />
          </Row>
        </Tile>
      </ScrollView>

      {/* Save bar — always visible */}
      <View style={styles.saveBar}>
        <Pressable
          onPress={save}
          disabled={!hasChanges}
          style={({ pressed }) => [
            styles.saveBtn,
            { backgroundColor: hasChanges ? theme.tint : theme.disabledBg },
            pressed && hasChanges && { opacity: 0.9 },
          ]}
        >
          <Text style={[styles.saveText, { color: hasChanges ? "#fff" : theme.disabled }]}>
            Save changes
          </Text>
        </Pressable>
      </View>

      {/* Language modal */}
      <BottomSheet open={openLang} title="Choose language" onClose={() => setOpenLang(false)}>
        {["en-GB", "en-US", "fr-FR", "es-ES", "de-DE"].map((code) => (
          <OptionRow
            key={code}
            label={code}
            selected={draft.language === code}
            onPress={() => {
              setDraft((p) => ({ ...p, language: code }));
              setOpenLang(false);
            }}
          />
        ))}
      </BottomSheet>

      {/* Currency modal */}
      <BottomSheet open={openCurr} title="Choose currency" onClose={() => setOpenCurr(false)}>
        {["GBP", "EUR", "USD"].map((ccy) => (
          <OptionRow
            key={ccy}
            label={ccy}
            selected={draft.currency === ccy}
            onPress={() => {
              setDraft((p) => ({ ...p, currency: ccy }));
              setOpenCurr(false);
            }}
          />
        ))}
      </BottomSheet>
    </SafeAreaView>
  );
}

/* ---------- Bottom sheet + helpers ---------- */

function BottomSheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <Modal visible={open} transparent animationType="slide">
      <View style={bs.wrap}>
        <Pressable style={bs.backdrop} onPress={onClose} />
        <View style={bs.sheet}>
          <View style={bs.grabber} />
          <Text style={bs.title}>{title}</Text>
          <View>{children}</View>
        </View>
      </View>
    </Modal>
  );
}

function OptionRow({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [bs.optRow, pressed && { opacity: 0.9 }]}>
      <Text style={[bs.optText, selected && { fontWeight: "800" }]}>{label}</Text>
      {selected && <Ionicons name="checkmark" size={18} color="#2563EB" />}
    </Pressable>
  );
}

/* ---------- Styles ---------- */

const RADIUS = 14;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { marginBottom: 6 },
  title: { fontSize: 22, fontWeight: "800" },
  subtitle: { fontSize: 13, marginTop: 2 },

  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginTop: 18,
    marginBottom: 8,
  },

  tile: {
    borderRadius: RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },

  row: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
  },
  rowText: { flex: 1, fontSize: 16, color: "#0B1220", fontWeight: "600" },
  rowValue: { fontSize: 14, color: "#0B1220", marginRight: 8 },

  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 14 },

  pad: { paddingHorizontal: 14, paddingVertical: 12 },
  smallLabel: { fontSize: 12, fontWeight: "700", letterSpacing: 0.3 },

  chipsRow: { flexDirection: "row", gap: 8, marginTop: 8, flexWrap: "wrap" },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
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

const bs = StyleSheet.create({
  wrap: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.25)" },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 16,
    paddingBottom: 12 + (Platform.OS === "ios" ? 12 : 0),
  },
  grabber: {
    width: 40, height: 4, borderRadius: 999, backgroundColor: "#E5E7EB",
    alignSelf: "center", marginBottom: 8,
  },
  title: { fontSize: 16, fontWeight: "800", marginBottom: 8 },
  optRow: {
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  optText: { fontSize: 16, color: "#0B1220" },
});
