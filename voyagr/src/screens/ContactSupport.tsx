// screens/ContactSupport.tsx
import React, { useEffect, useState } from "react";
import {
  Alert,
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Application from "expo-application";
import { auth } from "../firebase-config";

type Profile = { firstName?: string; lastName?: string; name?: string };
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

export default function ContactSupport({ navigation }: any) {
  const theme = useTheme();

  const user = auth.currentUser;
  const accountEmail = user?.email || ""; // source of truth
  const [accountName, setAccountName] = useState<string>(
    user?.displayName || ""
  );

  const [type, setType] = useState<IssueType>("General");
  const [message, setMessage] = useState("");
  const [includeDevice, setIncludeDevice] = useState(true);

  // Try to enrich name from local profile (optional)
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const p: Profile = JSON.parse(raw);
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
      return Alert.alert(
        "Missing info",
        !accountEmail
          ? "We need an email on your account to contact you back. Add one in Manage account."
          : "Please write a message."
      );
    }

    const subject = `Support: ${type}`;
    const bodyLines = [
      `Issue type: ${type}`,
      `Name: ${accountName || "-"}`,
      `Email: ${accountEmail}`,
      "",
      message.trim(),
      "",
      includeDevice
        ? [
            "—",
            `App: ${Application.applicationName || "App"}`,
            `Version: ${appVersion}`,
            `App ID: ${Application.applicationId || "-"}`,
            `OS: ${Platform.OS} ${Platform.Version}`,
          ].join("\n")
        : "",
    ]
      .filter(Boolean)
      .join("\n");

    const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(bodyLines)}`;

    const can = await Linking.canOpenURL(url);
    if (!can) {
      Alert.alert(
        "No mail app",
        `We couldn’t open your email client. You can email us at ${SUPPORT_EMAIL}.`
      );
      return;
    }
    Linking.openURL(url);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={s.header}>
          <Text style={[s.title, { color: theme.text }]}>Contact support</Text>
          <Text style={[s.sub, { color: theme.sub }]}>
            We usually reply within 1–2 business days.
          </Text>
          <View style={s.badgeRow}>
            <View
              style={[
                s.badge,
                { borderColor: theme.border, backgroundColor: theme.card },
              ]}
            >
              <Ionicons name="person-outline" size={14} color={theme.sub} />
              <Text style={[s.badgeText, { color: theme.sub }]}>
                {accountName || "No name set"}
              </Text>
            </View>
            <View
              style={[
                s.badge,
                { borderColor: theme.border, backgroundColor: theme.card },
              ]}
            >
              <Ionicons name="mail-outline" size={14} color={theme.sub} />
              <Text style={[s.badgeText, { color: theme.sub }]}>
                {accountEmail || "No email on account"}
              </Text>
            </View>
          </View>
          {!accountEmail ? (
            <Pressable
              onPress={() => navigation?.navigate?.("ManageAccount")}
              style={({ pressed }) => [
                s.addEmailBtn,
                pressed && { opacity: 0.9 },
              ]}
            >
              <Text style={[s.addEmailText, { color: theme.tint }]}>
                Add an email in Manage account
              </Text>
            </Pressable>
          ) : null}
        </View>

        {/* Issue type */}
        <View
          style={[
            s.tile,
            { borderColor: theme.border, backgroundColor: theme.card },
          ]}
        >
          <Text style={[s.smallTitle, { color: theme.sub }]}>Issue type</Text>
          <View style={s.chipsRow}>
            {ISSUE_TYPES.map((t) => {
              const active = t === type;
              return (
                <Pressable
                  key={t}
                  onPress={() => setType(t)}
                  style={({ pressed }) => [
                    s.chip,
                    {
                      borderColor: active ? theme.tint : theme.border,
                      backgroundColor: active ? "#EEF2FF" : theme.card,
                      opacity: pressed ? 0.92 : 1,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: active ? theme.tint : theme.text,
                      fontWeight: active ? "800" : "600",
                      fontSize: 13,
                    }}
                  >
                    {t}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Message */}
        <View
          style={[
            s.tile,
            { borderColor: theme.border, backgroundColor: theme.card },
          ]}
        >
          <Text style={[s.smallTitle, { color: theme.sub }]}>Message</Text>
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

          <View style={s.rowBetween}>
            <Text style={{ color: theme.sub, fontSize: 14 }}>
              Include device info
            </Text>
            <Switch
              value={includeDevice}
              onValueChange={setIncludeDevice}
              thumbColor={includeDevice ? theme.tint : undefined}
              trackColor={{ true: "#DCE7FF", false: "#E5E7EB" }}
            />
          </View>
        </View>

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
            style={[s.submitText, { color: canSend ? "#fff" : theme.disabled }]}
          >
            Send
          </Text>
        </Pressable>

        {/* Alt contact */}
        <View style={s.altWrap}>
          <Text style={{ color: theme.sub, fontSize: 12 }}>
            Or email us directly at{" "}
            <Text style={{ color: theme.text, fontWeight: "700" }}>
              {SUPPORT_EMAIL}
            </Text>
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* -------- Theme -------- */
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

/* -------- Styles -------- */
const RADIUS = 14;

const s = StyleSheet.create({
  scroll: { padding: 16, gap: 14 },
  header: { gap: 6 },
  title: { fontSize: 22, fontWeight: "800" },
  sub: { fontSize: 13 },

  badgeRow: { flexDirection: "row", gap: 8, marginTop: 4, flexWrap: "wrap" },
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

  addEmailBtn: { marginTop: 4, alignSelf: "flex-start" },
  addEmailText: { fontSize: 12, fontWeight: "700" },

  tile: {
    borderRadius: RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 1,
  },
  smallTitle: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },

  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },

  input: {
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },

  rowBetween: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  submit: {
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  submitText: { fontSize: 16, fontWeight: "800" },

  altWrap: { alignItems: "center", marginTop: 8 },
});
