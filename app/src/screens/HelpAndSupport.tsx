// screens/HelpAndSupport.tsx
import React, { useMemo, useState, useEffect } from "react";
import {
  Alert,
  Linking,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Application from "expo-application";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth } from "../firebase-config";

/* ---------- FAQ data ---------- */
type FAQ = { q: string; a: string; id: string };

const FAQS: FAQ[] = [
  {
    id: "getting-started",
    q: "Getting started",
    a: "Create an account, add your name and email in Profile, and you’re good to go.",
  },
  {
    id: "orders-payments",
    q: "Orders & payments",
    a: "We’ll add order tracking and in-app payments soon. For now, contact support if something looks off.",
  },
  {
    id: "privacy",
    q: "Privacy & data",
    a: "We only store what’s needed to run your account. See our Privacy Policy in More → Legal.",
  },
];

/* ---------- Contact sheet config ---------- */
const STORAGE_KEY = "profile_v1";
const SUPPORT_EMAIL = "support@yourapp.com";
const ISSUE_TYPES = [
  "General",
  "Account",
  "Orders",
  "Payments",
  "Bug",
] as const;
type IssueType = (typeof ISSUE_TYPES)[number];

/* ---------- Screen ---------- */
export default function HelpAndSupport() {
  const theme = useTheme();

  const [query, setQuery] = useState("");
  const [openIds, setOpenIds] = useState<string[]>([]);
  const [contactOpen, setContactOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return FAQS;
    return FAQS.filter(
      (f) => f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q)
    );
  }, [query]);

  const toggle = (id: string) =>
    setOpenIds((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : [...s, id]
    );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Quick tiles */}
        <View style={s.quickRow}>
          <QuickTile
            icon="document-text-outline"
            label="Terms"
            onPress={() => Linking.openURL("https://yourapp.com/terms")}
            theme={theme}
          />
          <QuickTile
            icon="lock-closed-outline"
            label="Privacy"
            onPress={() => Linking.openURL("https://yourapp.com/privacy")}
            theme={theme}
          />
          <QuickTile
            icon="chatbubbles-outline"
            label="Contact"
            onPress={() => setContactOpen(true)}
            theme={theme}
          />
        </View>

        <Text style={[s.sectionTitle, { color: theme.sub }]}>FAQs</Text>

        {/* Search */}
        <View
          style={[
            s.searchBox,
            { borderColor: theme.border, backgroundColor: theme.card },
          ]}
        >
          <Ionicons name="search-outline" size={18} color={theme.sub} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search help articles"
            placeholderTextColor={theme.sub}
            style={[s.searchInput, { color: theme.text }]}
            autoCapitalize="none"
            returnKeyType="search"
          />
        </View>
        {/* FAQs */}
        <View style={{ gap: 10 }}>
          {filtered.map((item) => {
            const open = openIds.includes(item.id);
            return (
              <Pressable
                key={item.id}
                onPress={() => toggle(item.id)}
                style={({ pressed }) => [
                  s.cardRow,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                    opacity: pressed ? 0.95 : 1,
                  },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[s.rowTitle, { color: theme.text }]}>
                    {item.q}
                  </Text>
                  {open ? (
                    <Text style={[s.rowBody, { color: theme.sub }]}>
                      {item.a}
                    </Text>
                  ) : null}
                </View>
                <Ionicons
                  name={open ? "chevron-up" : "chevron-down"}
                  size={18}
                  color={theme.sub}
                />
              </Pressable>
            );
          })}
          {filtered.length === 0 && (
            <Text style={{ color: theme.sub }}>
              No results. Try a different term.
            </Text>
          )}
        </View>
      </ScrollView>

      {/* Contact Support Bottom Sheet */}
      <ContactSheet
        open={contactOpen}
        onClose={() => setContactOpen(false)}
        theme={theme}
      />
    </SafeAreaView>
  );
}

/* ---------- Contact sheet ---------- */
function ContactSheet({
  open,
  onClose,
  theme,
}: {
  open: boolean;
  onClose: () => void;
  theme: ReturnType<typeof useTheme>;
}) {
  const user = auth.currentUser;
  const accountEmail = user?.email || "";
  const [accountName, setAccountName] = useState<string>(
    user?.displayName || ""
  );
  const [type, setType] = useState<IssueType>("General");
  const [message, setMessage] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);

  // Enrich name from local profile if present
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const p = JSON.parse(raw);
          const name =
            p.firstName || p.lastName
              ? `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim()
              : p.name || "";
          if (name) setAccountName(name);
        }
      } catch {}
    })();
  }, []);

  const appVersion =
    Application.nativeApplicationVersion && Application.nativeBuildVersion
      ? `${Application.nativeApplicationVersion} (${Application.nativeBuildVersion})`
      : "dev";

  const canSend = Boolean(accountEmail) && message.trim().length > 0;

  const onSend = async () => {
    if (!canSend) {
      Alert.alert(
        "Missing info",
        !accountEmail
          ? "We need an email on your account to contact you back. Add one in Manage account."
          : "Please write a message."
      );
      return;
    }

    const subject = `Support: ${type}`;
    const body = [
      `Issue type: ${type}`,
      `Name: ${accountName || "-"}`,
      `Email: ${accountEmail}`,
      "",
      message.trim(),
      "",
      "—",
      `App: ${Application.applicationName || "App"}`,
      `Version: ${appVersion}`,
      `App ID: ${Application.applicationId || "-"}`,
      `OS: ${Platform.OS} ${Platform.Version}`,
    ].join("\n");

    const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;

    const ok = await Linking.canOpenURL(url);
    if (!ok) {
      Alert.alert(
        "No mail app",
        `We couldn’t open your email client. You can email us at ${SUPPORT_EMAIL}.`
      );
      return;
    }
    Linking.openURL(url);
    onClose();
  };

  return (
    <Modal
      visible={open}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={bs.wrap}>
        <Pressable style={bs.backdrop} onPress={onClose} />
        <View style={[bs.sheet, { backgroundColor: theme.card }]}>
          <View style={bs.grabber} />
          <Text style={[bs.title, { color: theme.text }]}>Contact support</Text>
          <Text style={[bs.subtitle, { color: theme.sub }]}>
            We usually reply within 1–2 business days.
          </Text>

          {/* Account badges */}
          <View style={s.badgeRow}>
            <Badge
              icon="person-outline"
              text={accountName || "No name set"}
              theme={theme}
            />
            <Badge
              icon="mail-outline"
              text={accountEmail || "No email on account"}
              theme={theme}
            />
          </View>

          {/* Issue type select */}
          <Text style={[s.smallTitle, { color: theme.sub, marginTop: 12 }]}>
            Issue type
          </Text>
          <Pressable
            onPress={() => setPickerOpen(true)}
            style={({ pressed }) => [
              s.select,
              { borderColor: theme.border, backgroundColor: theme.inputBg },
              pressed && { opacity: 0.95 },
            ]}
          >
            <Text style={{ color: theme.text, fontWeight: "700" }}>{type}</Text>
            <Ionicons name="chevron-down" size={18} color={theme.sub} />
          </Pressable>

          {/* Message box */}
          <Text style={[s.smallTitle, { color: theme.sub, marginTop: 12 }]}>
            Message
          </Text>
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder="Describe the issue…"
            placeholderTextColor={theme.sub}
            multiline
            style={[
              s.input,
              {
                color: theme.text,
                borderColor: theme.border,
                backgroundColor: theme.inputBg,
                height: 140,
                textAlignVertical: "top",
              },
            ]}
          />

          {/* Send */}
          <Pressable
            onPress={onSend}
            disabled={!canSend}
            style={({ pressed }) => [
              s.submit,
              {
                backgroundColor: canSend ? theme.tint : theme.disabledBg,
                opacity: pressed && canSend ? 0.9 : 1,
              },
            ]}
          >
            <Ionicons
              name="send-outline"
              size={18}
              color={canSend ? "#fff" : theme.disabled}
            />
            <Text
              style={[
                s.submitText,
                { color: canSend ? "#fff" : theme.disabled },
              ]}
            >
              Send
            </Text>
          </Pressable>

          {/* Issue type picker (nested) */}
          <Modal
            visible={pickerOpen}
            transparent
            animationType="fade"
            onRequestClose={() => setPickerOpen(false)}
          >
            <Pressable
              style={bs.backdrop}
              onPress={() => setPickerOpen(false)}
            />
            <View style={[bs.innerSheet, { backgroundColor: theme.card }]}>
              <Text style={[bs.innerTitle, { color: theme.text }]}>
                Choose issue type
              </Text>
              {ISSUE_TYPES.map((opt) => {
                const selected = opt === type;
                return (
                  <Pressable
                    key={opt}
                    onPress={() => {
                      setType(opt);
                      setPickerOpen(false);
                    }}
                    style={({ pressed }) => [
                      bs.row,
                      pressed && { opacity: 0.95 },
                    ]}
                  >
                    <Text
                      style={[
                        bs.rowText,
                        {
                          color: theme.text,
                          fontWeight: selected ? "800" : "600",
                        },
                      ]}
                    >
                      {opt}
                    </Text>
                    {selected && (
                      <Ionicons name="checkmark" size={18} color={theme.tint} />
                    )}
                  </Pressable>
                );
              })}
            </View>
          </Modal>
        </View>
      </View>
    </Modal>
  );
}

/* ---------- Small components ---------- */
function QuickTile({
  icon,
  label,
  onPress,
  theme,
  tint = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  theme: ReturnType<typeof useTheme>;
  tint?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        s.quickTile,
        {
          borderColor: theme.border,
          backgroundColor: tint ? "#EEF2FF" : theme.card,
        },
        pressed && { opacity: 0.92 },
      ]}
    >
      <Ionicons name={icon} size={18} color={tint ? theme.tint : theme.text} />
      <Text
        style={{
          color: tint ? theme.tint : theme.text,
          fontWeight: "700",
          fontSize: 13,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function Badge({
  icon,
  text,
  theme,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <View
      style={[
        s.badge,
        { borderColor: theme.border, backgroundColor: theme.card },
      ]}
    >
      <Ionicons name={icon} size={14} color={theme.sub} />
      <Text style={[s.badgeText, { color: theme.sub }]}>{text}</Text>
    </View>
  );
}

/* ---------- Theme ---------- */
function useTheme() {
  return {
    bg: "#F6F7F9",
    card: "#FFFFFF",
    inputBg: "#FAFAFA",
    text: "#0B1220",
    sub: "#6B7280",
    border: "#EAECEF",
    tint: "#2563EB",
    disabled: "#9CA3AF",
    disabledBg: "#E5E7EB",
  };
}

/* ---------- Styles ---------- */
const RADIUS = 14;

const s = StyleSheet.create({
  scroll: { padding: 16, gap: 16 },
  header: { gap: 6 },
  title: { fontSize: 24, fontWeight: "800" },
  sub: { fontSize: 13 },

  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 16, paddingVertical: 2 },

  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginTop: 4,
  },

  quickRow: { flexDirection: "row", gap: 10 },
  quickTile: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  cardRow: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  rowTitle: { fontSize: 16, fontWeight: "700", marginBottom: 6 },
  rowBody: { fontSize: 14, lineHeight: 20 },

  cta: {
    marginTop: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  ctaText: { fontSize: 16, fontWeight: "700" },

  /* Contact sheet bits reused */
  badgeRow: { flexDirection: "row", gap: 8, marginTop: 8, flexWrap: "wrap" },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  badgeText: { fontSize: 12 },

  smallTitle: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },

  select: {
    height: 48,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "space-between",
    flexDirection: "row",
    marginTop: 6,
  },

  input: {
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 6,
  },

  submit: {
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  submitText: { fontSize: 16, fontWeight: "800" },
});

/* ---------- Bottom-sheet styles ---------- */
const bs = StyleSheet.create({
  wrap: { flex: 1, justifyContent: "flex-end" },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  sheet: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 16,
    paddingBottom: 12 + (Platform.OS === "ios" ? 12 : 0),
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 6,
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
    alignSelf: "center",
    marginBottom: 8,
  },
  title: { fontSize: 18, fontWeight: "800" },
  subtitle: { fontSize: 13, marginTop: 2, marginBottom: 8 },
  innerSheet: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 24 + (Platform.OS === "ios" ? 12 : 0),
    borderRadius: 14,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#EAECEF",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  innerTitle: { fontSize: 14, fontWeight: "800", marginBottom: 6 },
  row: {
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowText: { fontSize: 16 },
});
