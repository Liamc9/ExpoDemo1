// screens/More.tsx
import React, { useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, Alert, Linking, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../providers/AuthProvider";
import { auth } from "../firebase-config";
import * as Application from "expo-application";

const VERSION = Application?.nativeApplicationVersion && Application?.nativeBuildVersion ? `${Application.nativeApplicationVersion} (${Application.nativeBuildVersion})` : "1.0.0 (dev)";

export default function More({ navigation }: any) {
  const { signOutNow } = useAuth();

  const user = auth.currentUser;
  const email = user?.email || "";
  const displayName = user?.displayName || email?.split("@")[0] || "Your profile";
  const photoURL = user?.photoURL || null;

  const initials = useMemo(() => {
    const base = (user?.displayName || email || "Y P").trim();
    const parts = base.replace(/\s+/g, " ").split(" ");
    const letters = parts.length >= 2 ? parts[0][0] + parts[1][0] : (parts[0][0] || "Y") + (parts[0][1] || "P");
    return letters.toUpperCase();
  }, [user, email]);

  const openLink = async (url: string) => {
    const ok = await Linking.canOpenURL(url);
    if (!ok) return Alert.alert("Unable to open link");
    Linking.openURL(url);
  };

  const Row = ({ icon, label, onPress, trailing, danger = false }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress?: () => void; trailing?: React.ReactNode; danger?: boolean }) => (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}>
      <Ionicons name={icon} size={20} color={danger ? "#B42318" : "#0B1220"} style={{ width: 22 }} />
      <Text style={[styles.rowText, danger && { color: "#B42318" }]} numberOfLines={1}>
        {label}
      </Text>
      {trailing ?? <Ionicons name="chevron-forward" size={18} color="#98A2B3" />}
    </Pressable>
  );

  const Tile: React.FC<{ children: React.ReactNode }> = ({ children }) => <View style={styles.tile}>{children}</View>;

  const Divider = () => <View style={styles.divider} />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Profile Card */}
      <Pressable onPress={() => navigation.navigate("Profile")} style={({ pressed }) => [styles.profileCard, pressed && { opacity: 0.92 }]}>
        {photoURL ? (
          <Image source={{ uri: photoURL }} style={styles.avatarImg} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.profileName} numberOfLines={1}>
            {displayName}
          </Text>
          {!!email && (
            <Text style={styles.profileEmail} numberOfLines={1}>
              {email}
            </Text>
          )}
          <View style={styles.profilePill}>
            <Ionicons name="shield-checkmark-outline" size={12} color="#0B1220" />
            <Text style={styles.profilePillText}>Verified account</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#111827" />
      </Pressable>

      {/* Account */}
      <Section title="Account">
        <Tile>
          <Row icon="settings-outline" label="Manage account" onPress={() => navigation.navigate("ManageAccount")} />
          <Divider />
          <Row icon="options-outline" label="Manage preferences" onPress={() => navigation.navigate("ManagePreferences")} />
        </Tile>
      </Section>

      {/* Seller */}
      <Section title="Seller">
        <Tile>
          <Row icon="storefront-outline" label="Seller dashboard" onPress={() => navigation.navigate("Seller")} />
          <Divider />
          <Row icon="bag-add-outline" label="Open a shop" onPress={() => navigation.navigate("CreateShop")} />
          <Divider />
          <Row icon="pricetags-outline" label="Manage listings" onPress={() => Alert.alert("Coming soon", "Listing management is on the roadmap.")} />
        </Tile>
      </Section>

      {/* Support */}
      <Section title="Support">
        <Tile>
          <Row icon="help-circle-outline" label="Help & Support" onPress={() => navigation.navigate("HelpAndSupport")} />
        </Tile>
      </Section>

      {/* Sign out */}
      <Pressable
        onPress={() =>
          Alert.alert("Sign out", "Are you sure you want to sign out?", [
            { text: "Cancel", style: "cancel" },
            {
              text: "Sign out",
              style: "destructive",
              onPress: () => signOutNow(),
            },
          ])
        }
        style={({ pressed }) => [styles.signOut, pressed && { opacity: 0.9 }]}
      >
        <Ionicons name="log-out-outline" size={18} color="#fff" />
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>YourApp • Version {VERSION}</Text>
        <Text style={[styles.footerText, { marginTop: 2 }]}>© {new Date().getFullYear()} Your Company</Text>
      </View>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 18 }}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

const RADIUS = 14;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#F6F7F9",
  },

  /* Profile */
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: RADIUS,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#EAECEF",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
    marginBottom: 8,
  },
  avatarImg: {
    width: 56,
    height: 56,
    borderRadius: 999,
    backgroundColor: "#F1F5F9",
  },
  avatarFallback: {
    width: 56,
    height: 56,
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#111827", fontWeight: "800", fontSize: 16 },
  profileName: { color: "#0B1220", fontSize: 17, fontWeight: "800" },
  profileEmail: { color: "#6B7280", fontSize: 13, marginTop: 2 },
  profilePill: {
    marginTop: 8,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#F3F4F6",
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E5E7EB",
  },
  profilePillText: { fontSize: 12, color: "#0B1220", fontWeight: "600" },

  /* Sections */
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 8,
    marginTop: 14,
  },

  /* Tiles & rows */
  tile: {
    backgroundColor: "#FFFFFF",
    borderRadius: RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#EAECEF",
    overflow: "hidden",
  },
  row: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  rowText: { flex: 1, fontSize: 16, color: "#0B1220", fontWeight: "600" },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#EAECEF",
    marginHorizontal: 14,
  },

  /* Sign out */
  signOut: {
    marginTop: 14,
    backgroundColor: "#000",
    borderRadius: RADIUS,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignSelf: "stretch",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  signOutText: { fontSize: 16, fontWeight: "800", color: "#fff" },

  /* Footer */
  footer: { marginTop: 20, alignItems: "center" },
  footerText: { fontSize: 12, color: "#98A2B3" },
});
