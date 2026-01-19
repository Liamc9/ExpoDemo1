// screens/ManageAccount.tsx
// #region Imports
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useMemo, useState } from "react";

import {
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";
import {
  Alert,
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
import { auth } from "../firebase-config";
// If you have a sign-out helper:
// import { useAuth } from "../auth/AuthProvider";
// #endregion

const THEME = {
  bg: "#F6F7F9",
  card: "#FFFFFF",
  border: "#EAECEF",
  text: "#0B1220",
  sub: "#6B7280",
  tint: "#2563EB",
  red: "#EF4444",
  redBg: "#FEF2F2",
  green: "#16A34A",
};

export default function ManageAccount({ navigation }: any) {
  const user = auth.currentUser;
  const email = user?.email || "—";

  // If you need this:
  // const { signOutNow } = useAuth();

  const [pwdOpen, setPwdOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const theme = useMemo(() => THEME, []);

  const Row = ({
    icon,
    label,
    onPress,
    trailing,
    danger = false,
    disabled = false,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    onPress?: () => void;
    trailing?: React.ReactNode;
    danger?: boolean;
    disabled?: boolean;
  }) => (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.row,
        pressed && { opacity: 0.9 },
        disabled && { opacity: 0.5 },
      ]}
    >
      <Ionicons
        name={icon}
        size={20}
        color={danger ? theme.red : theme.text}
        style={{ width: 22 }}
      />
      <Text
        numberOfLines={1}
        style={[styles.rowText, danger && { color: theme.red }]}
      >
        {label}
      </Text>
      {trailing ? (
        trailing
      ) : (
        <Ionicons name="chevron-forward" size={18} color="#98A2B3" />
      )}
    </Pressable>
  );

  const Tile: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <View
      style={[
        styles.tile,
        { backgroundColor: theme.card, borderColor: theme.border },
      ]}
    >
      {children}
    </View>
  );

  const Divider = () => (
    <View style={[styles.divider, { backgroundColor: theme.border }]} />
  );

  const clearLocal = async () => {
    Alert.alert(
      "Clear local data?",
      "This removes locally cached settings on this device.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            // Prefer targeted keys to avoid wiping unrelated storage.
            const KEYS = ["profile_v1"];
            try {
              await Promise.all(KEYS.map((k) => AsyncStorage.removeItem(k)));
              Alert.alert("Cleared", "Local data removed on this device.");
            } catch (e) {
              Alert.alert("Error", "Could not clear local data.");
            }
          },
        },
      ]
    );
  };

  const handleDelete = async () => {
    if (!user) return Alert.alert("Not signed in");
    Alert.alert(
      "Delete account?",
      "This permanently deletes your account. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setBusy(true);
              await deleteUser(user); // may throw auth/requires-recent-login
              setBusy(false);
              Alert.alert("Account deleted", "We're sorry to see you go.");
              // Optionally: navigation.reset(...)
            } catch (e: any) {
              setBusy(false);
              if (e?.code === "auth/requires-recent-login") {
                // Ask for password to re-auth (email/password accounts)
                setPwdOpen(true);
              } else {
                Alert.alert(
                  "Deletion failed",
                  e?.message ?? "Please try again."
                );
              }
            }
          },
        },
      ]
    );
  };

  const reauthAndDelete = async () => {
    if (!user || !email) {
      setPwdOpen(false);
      return Alert.alert("Re-auth failed", "Please sign in again.");
    }
    try {
      setBusy(true);
      const cred = EmailAuthProvider.credential(email, password);
      await reauthenticateWithCredential(user, cred);
      await deleteUser(user);
      setBusy(false);
      setPwdOpen(false);
      Alert.alert("Account deleted", "Your account has been removed.");
      // Optionally: navigation.reset(...)
    } catch (e: any) {
      setBusy(false);
      Alert.alert(
        "Re-auth failed",
        e?.message ?? "Please check your password."
      );
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        {/* Security */}
        <Text style={[styles.sectionTitle, { color: theme.sub }]}>
          Security
        </Text>
        <Tile>
          <Row
            icon="mail-outline"
            label="Change email"
            onPress={() => navigation.navigate("ChangeEmail")}
          />
          <Divider />
          <Row
            icon="key-outline"
            label="Change password"
            onPress={() => navigation.navigate("ChangePassword")}
          />
          <Divider />
          <Row
            icon="shield-checkmark-outline"
            label="Two-factor authentication"
            onPress={() =>
              Alert.alert("Coming soon", "2FA setup will be available shortly.")
            }
            trailing={<Pill text="Soon" />}
          />
        </Tile>

        {/* Data & privacy */}
        <Text style={[styles.sectionTitle, { color: theme.sub }]}>
          Data & privacy
        </Text>
        <Tile>
          <Row
            icon="download-outline"
            label="Download my data"
            onPress={() =>
              Alert.alert(
                "Request received",
                "You'll be able to export your data soon."
              )
            }
          />
          <Divider />
          <Row
            icon="trash-outline"
            label="Clear local cache on this device"
            onPress={clearLocal}
          />
        </Tile>

        {/* Danger zone */}
        <Text style={[styles.sectionTitle, { color: theme.sub }]}>
          Danger zone
        </Text>
        <View
          style={[
            styles.tile,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
            },
          ]}
        >
          <Row
            icon="alert-circle-outline"
            label="Delete account permanently"
            onPress={handleDelete}
            danger
          />
          <View style={styles.dangerHint}>
            <Ionicons
              name="information-circle-outline"
              size={14}
              color={theme.sub}
            />
            <Text style={[styles.hintText, { color: theme.sub }]}>
              This removes your account and associated authentication. You may
              need to re-enter your password to confirm.
            </Text>
          </View>
        </View>

        {/* (Optional) Sessions */}
        {/* <Text style={[styles.sectionTitle, { color: theme.sub }]}>Sessions</Text>
        <Tile>
          <Row
            icon="log-out-outline"
            label="Sign out of all devices"
            onPress={() => Alert.alert("Admin action required", "Signing out all devices requires a server action to revoke tokens.")}
          />
        </Tile> */}
      </ScrollView>

      {/* Password prompt (for re-auth) */}
      <PasswordPrompt
        open={pwdOpen}
        email={email}
        password={password}
        onChangePassword={setPassword}
        onCancel={() => {
          setPassword("");
          setPwdOpen(false);
        }}
        onConfirm={reauthAndDelete}
        loading={busy}
      />
    </SafeAreaView>
  );
}

/* ---------- Small components ---------- */

function Pill({ text }: { text: string }) {
  return (
    <View style={styles.pill}>
      <Text style={styles.pillText}>{text}</Text>
    </View>
  );
}

function PasswordPrompt({
  open,
  email,
  password,
  onChangePassword,
  onCancel,
  onConfirm,
  loading,
}: {
  open: boolean;
  email: string;
  password: string;
  onChangePassword: (t: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  loading: boolean;
}) {
  return (
    <Modal visible={open} transparent animationType="slide">
      <View style={styles.modalWrap}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Confirm deletion</Text>
          <Text style={styles.modalDesc}>
            For security, re-enter the password for{" "}
            <Text style={{ fontWeight: "700" }}>{email}</Text>.
          </Text>
          <TextInput
            value={password}
            onChangeText={onChangePassword}
            placeholder="Password"
            placeholderTextColor="#9CA3AF"
            secureTextEntry
            style={styles.modalInput}
            autoCapitalize="none"
          />
          <View style={styles.modalRow}>
            <Pressable
              onPress={onCancel}
              style={({ pressed }) => [
                styles.modalBtn,
                styles.btnGhost,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={[styles.modalBtnText, { color: "#374151" }]}>
                Cancel
              </Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              disabled={loading || password.length === 0}
              style={({ pressed }) => [
                styles.modalBtn,
                styles.btnDanger,
                (pressed || loading) && { opacity: 0.9 },
                (loading || password.length === 0) && { opacity: 0.6 },
              ]}
            >
              <Text style={[styles.modalBtnText, { color: "#fff" }]}>
                {loading ? "Deleting..." : "Delete"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
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
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 14 },

  pill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#F3F4F6",
  },
  pillText: { fontSize: 11, color: "#111827", fontWeight: "600" },

  dangerHint: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 6,
    backgroundColor: "#FFF",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#F3F4F6",
    flexDirection: "row",
    alignItems: "flex-start",
  },
  hintText: { fontSize: 12, flex: 1 },

  // Modal
  modalWrap: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.25)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 16,
    paddingBottom: 12 + (Platform.OS === "ios" ? 12 : 0),
  },
  modalTitle: { fontSize: 18, fontWeight: "800", marginBottom: 4 },
  modalDesc: { fontSize: 14, color: "#6B7280", marginBottom: 10 },
  modalInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: "#FAFAFA",
  },
  modalRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  modalBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  btnGhost: {
    backgroundColor: "#F3F4F6",
  },
  btnDanger: {
    backgroundColor: "#EF4444",
  },
  modalBtnText: { fontSize: 15, fontWeight: "700" },
});
