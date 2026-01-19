import React, { useCallback, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  FlatList,
  RefreshControl,
  Pressable,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

type ActivityItem = {
  id: string;
  title: string;
  subtitle: string;
  when: string;
};

const MOCK_ACTIVITIES: ActivityItem[] = [
  { id: "1", title: "Welcome aboard 👋", subtitle: "Tap a quick action to begin", when: "Just now" },
  { id: "2", title: "Profile tips", subtitle: "Add your bio and avatar", when: "Today" },
  { id: "3", title: "Settings", subtitle: "Toggle dark mode & notifications", when: "Yesterday" },
];

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const [refreshing, setRefreshing] = useState(false);
  const [activities, setActivities] = useState(MOCK_ACTIVITIES);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Simulate fetch
    setTimeout(() => {
      // Prepend a “refreshed” item so you can see it working
      setActivities((prev) => [
        {
          id: String(Date.now()),
          title: "Pulled to refresh",
          subtitle: "This is a demo item",
          when: "Just now",
        },
        ...prev,
      ]);
      setRefreshing(false);
    }, 700);
  }, []);

  const renderItem = ({ item }: { item: ActivityItem }) => (
    <View style={s.row}>
      <View style={s.rowIcon}>
        <Ionicons name="flash-outline" size={18} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.rowTitle}>{item.title}</Text>
        <Text style={s.rowSub}>{item.subtitle}</Text>
      </View>
      <Text style={s.rowWhen}>{item.when}</Text>
    </View>
  );

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.hello}>Hello, Liam</Text>
          <Text style={s.sub}>Here’s what’s happening today</Text>
        </View>

        {/* Top-right avatar button (also in your app header, but handy here too) */}
        <Pressable
          onPress={() => navigation.navigate("Profile")}
          style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }, s.avatarBtn]}
          hitSlop={10}
        >
          <Ionicons name="person-circle-outline" size={28} />
        </Pressable>
      </View>

      {/* Quick actions */}
      <View style={s.quickRow}>
        <QuickAction
          icon="person-outline"
          label="Profile"
          onPress={() => navigation.navigate("Profile")}
        />
        <QuickAction
          icon="settings-outline"
          label="Settings"
          onPress={() => navigation.navigate("Settings")}
        />
        <QuickAction
          icon="analytics-outline"
          label="Stats"
          onPress={() => {}}
        />
      </View>

      {/* KPI card */}
      <View style={s.card}>
        <Text style={s.cardTitle}>Today’s Overview</Text>
        <View style={s.kpiRow}>
          <KPI label="Sessions" value="12" />
          <KPI label="Actions" value="34" />
          <KPI label="Alerts" value="0" />
        </View>
      </View>

      {/* Recent activity list */}
      <FlatList
        data={activities}
        keyExtractor={(it) => it.id}
        renderItem={renderItem}
        contentContainerStyle={s.listPad}
        ItemSeparatorComponent={() => <View style={s.sep} />}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListHeaderComponent={<Text style={s.sectionHeader}>Recent activity</Text>}
      />
    </SafeAreaView>
  );
}

/* ---------- Small reusable bits ---------- */

function QuickAction({
  icon,
  label,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.qa, { opacity: pressed ? 0.7 : 1 }]}>
      <Ionicons name={icon} size={18} />
      <Text style={s.qaText}>{label}</Text>
    </Pressable>
  );
}

function KPI({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.kpi}>
      <Text style={s.kpiValue}>{value}</Text>
      <Text style={s.kpiLabel}>{label}</Text>
    </View>
  );
}

/* ---------- Styles ---------- */
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  header: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  hello: { fontSize: 20, fontWeight: "700" },
  sub: { marginTop: 2, color: "#666" },
  avatarBtn: { marginLeft: "auto", paddingHorizontal: 6, paddingVertical: 4 },

  quickRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    marginTop: 10,
  },
  qa: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e7e7e7",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#fafafa",
  },
  qaText: { fontSize: 14, fontWeight: "600" },

  card: {
    marginTop: 12,
    marginHorizontal: 16,
    padding: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e7e7e7",
    backgroundColor: "#f8f8f8",
  },
  cardTitle: { fontSize: 16, fontWeight: "700", marginBottom: 8 },
  kpiRow: { flexDirection: "row", gap: 12 },
  kpi: {
    flex: 1,
    height: 64,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e7e7e7",
    alignItems: "center",
    justifyContent: "center",
  },
  kpiValue: { fontSize: 18, fontWeight: "700" },
  kpiLabel: { fontSize: 12, color: "#666", marginTop: 2 },

  listPad: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24 },
  sectionHeader: { fontSize: 14, fontWeight: "700", marginBottom: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f1f1f1",
    marginRight: 12,
  },
  rowTitle: { fontSize: 15, fontWeight: "600" },
  rowSub: { fontSize: 12, color: "#666" },
  rowWhen: { fontSize: 11, color: "#999", marginLeft: 10 },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: "#eee" },
});
