import { useEffect, useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Image,
  Platform,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { db, auth } from "../firebase-config";
import {
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
  Timestamp,
  DocumentData,
} from "firebase/firestore";

type Order = {
  id: string;
  shopId: string;
  buyerUid: string;
  status:
    | "placed"
    | "accepted"
    | "preparing"
    | "ready"
    | "out_for_delivery"
    | "completed"
    | "delivered"
    | "cancelled"
    | "refunded";
  subtotalCents: number;
  feesCents: number;
  totalCents: number;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
  // optional enrichments
  shopName?: string | null;
  heroImage?: string | null;
};

const UPCOMING_STATUSES = new Set([
  "placed",
  "accepted",
  "preparing",
  "ready",
  "out_for_delivery",
]);
const PAST_STATUSES = new Set([
  "completed",
  "delivered",
  "cancelled",
  "refunded",
]);

export default function Orders({ navigation }: any) {
  const uid = auth.currentUser?.uid ?? null;
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");

  // live subscribe to user's orders
  useEffect(() => {
    if (!uid) return;
    setLoading(true);
    const q = query(
      collection(db, "orders"),
      where("buyerUid", "==", uid),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows: Order[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as DocumentData),
        })) as Order[];
        setOrders(rows);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, [uid]);

  const onRefresh = useCallback(() => {
    // onSnapshot keeps us live; we just show a quick spinner
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 350);
  }, []);

  const { upcoming, past } = useMemo(() => {
    const up: Order[] = [];
    const pa: Order[] = [];
    for (const o of orders) {
      if (UPCOMING_STATUSES.has(o.status)) up.push(o);
      else if (PAST_STATUSES.has(o.status)) pa.push(o);
      // if status unknown, treat as past
      else pa.push(o);
    }
    return { upcoming: up, past: pa };
  }, [orders]);

  const data = tab === "upcoming" ? upcoming : past;

  const renderItem = ({ item }: { item: Order }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.9}
      onPress={() => navigation.navigate?.("OrderDetail", { orderId: item.id })}
    >
      <Image
        source={{
          uri:
            item.heroImage ||
            // fallback to a nice generic food image
            "https://images.unsplash.com/photo-1550547660-d9450f859349?q=80&w=1200&auto=format&fit=crop",
        }}
        style={styles.cardImage}
      />
      <View style={{ flex: 1, gap: 4 }}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.shopName || "Your Order"}
          </Text>
          <StatusPill status={item.status} />
        </View>

        <Text style={styles.cardSub} numberOfLines={1}>
          {formatDate(item.createdAt)} • {formatCurrency(item.totalCents)}
        </Text>

        <View style={styles.rowBetween}>
          <View style={styles.metaRow}>
            <Ionicons name="receipt-outline" size={14} color="#6B7280" />
            <Text style={styles.metaText}>#{item.id.slice(0, 6)}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.linkText}>View details</Text>
            <Ionicons name="chevron-forward" size={16} color="#2563EB" />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top bar */}
      <View style={styles.topbar}>
        <Text style={styles.title}>Orders</Text>
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => navigation.goBack?.()}
        >
          <Ionicons name="close" size={18} color="#111827" />
        </TouchableOpacity>
      </View>

      {/* Segmented tabs */}
      <View style={styles.segmentWrap}>
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: "upcoming", label: "Upcoming" },
            { value: "past", label: "Past" },
          ]}
        />
      </View>

      {/* List */}
      <FlatList
        data={data}
        keyExtractor={(o) => o.id}
        renderItem={renderItem}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: 24,
          gap: 12,
          paddingTop: 8,
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <EmptyState
            loading={loading}
            isUpcoming={tab === "upcoming"}
          />
        }
      />
    </SafeAreaView>
  );
}

/* ---------------- helpers ---------------- */

function formatCurrency(cents?: number) {
  const v = (cents ?? 0) / 100;
  return `£${v.toFixed(2)}`;
}
function formatDate(ts?: Timestamp | null) {
  if (!ts) return "—";
  const d = ts.toDate();
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function statusMeta(
  status: Order["status"]
): { label: string; bg: string; fg: string; border: string } {
  switch (status) {
    case "placed":
      return { label: "Placed", bg: "#EFF6FF", fg: "#1D4ED8", border: "#DBEAFE" };
    case "accepted":
      return { label: "Accepted", bg: "#ECFDF5", fg: "#047857", border: "#D1FAE5" };
    case "preparing":
      return { label: "Preparing", bg: "#FFFBEB", fg: "#B45309", border: "#FDE68A" };
    case "ready":
      return { label: "Ready", bg: "#EEF2FF", fg: "#4F46E5", border: "#E0E7FF" };
    case "out_for_delivery":
      return { label: "On the way", bg: "#F0FDFA", fg: "#0F766E", border: "#99F6E4" };
    case "completed":
    case "delivered":
      return { label: "Delivered", bg: "#F0FDF4", fg: "#15803D", border: "#BBF7D0" };
    case "cancelled":
      return { label: "Cancelled", bg: "#FEF2F2", fg: "#B91C1C", border: "#FECACA" };
    case "refunded":
      return { label: "Refunded", bg: "#F5F3FF", fg: "#6D28D9", border: "#DDD6FE" };
    default:
      return { label: "Status", bg: "#F3F4F6", fg: "#111827", border: "#E5E7EB" };
  }
}

function StatusPill({ status }: { status: Order["status"] }) {
  const m = statusMeta(status);
  return (
    <View
      style={[
        styles.pill,
        { backgroundColor: m.bg, borderColor: m.border },
      ]}
    >
      <Text style={[styles.pillText, { color: m.fg }]}>{m.label}</Text>
    </View>
  );
}

function EmptyState({
  loading,
  isUpcoming,
}: {
  loading: boolean;
  isUpcoming: boolean;
}) {
  if (loading) {
    return (
      <View style={styles.emptyWrap}>
        <Ionicons name="time-outline" size={28} color="#9CA3AF" />
        <Text style={styles.emptyTitle}>Loading orders…</Text>
        <Text style={styles.emptySub}>Just a moment.</Text>
      </View>
    );
  }
  return (
    <View style={styles.emptyWrap}>
      <Ionicons name="file-tray-outline" size={28} color="#9CA3AF" />
      <Text style={styles.emptyTitle}>
        {isUpcoming ? "No upcoming orders" : "No past orders yet"}
      </Text>
      <Text style={styles.emptySub}>
        {isUpcoming
          ? "When you place an order, you’ll see it here."
          : "Completed and cancelled orders will appear here."}
      </Text>
    </View>
  );
}

function Segmented({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: any) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <View style={styles.segment}>
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <TouchableOpacity
            key={opt.value}
            onPress={() => onChange(opt.value as any)}
            activeOpacity={0.9}
            style={[
              styles.segmentBtn,
              active && styles.segmentBtnActive,
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                active && styles.segmentTextActive,
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/* ---------------- styles ---------------- */

const CARD_RADIUS = 14;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F6F7F9" },

  topbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#EAECEF",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
      },
      android: { elevation: 2 },
    }),
  },
  title: { color: "#111827", fontSize: 22, fontWeight: "800" },
  iconBtn: {
    backgroundColor: "#F2F3F5",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E5E7EB",
  },

  segmentWrap: { padding: 16, paddingBottom: 8 },
  segment: {
    flexDirection: "row",
    backgroundColor: "#EFF1F5",
    borderRadius: 12,
    padding: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E5E7EB",
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  segmentBtnActive: {
    backgroundColor: "#FFFFFF",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E5E7EB",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
      },
      android: { elevation: 1 },
    }),
  },
  segmentText: { color: "#6B7280", fontWeight: "700" },
  segmentTextActive: { color: "#111827" },

  card: {
    flexDirection: "row",
    gap: 12,
    padding: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: CARD_RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#EAECEF",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
      },
      android: { elevation: 1 },
    }),
  },
  cardImage: {
    width: 80,
    height: 60,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
  },
  cardTitle: { color: "#111827", fontSize: 15, fontWeight: "700" },
  cardSub: { color: "#6B7280", fontSize: 13 },

  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  metaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaText: { color: "#6B7280", fontSize: 12 },
  linkText: { color: "#2563EB", fontWeight: "700" },

  pill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pillText: { fontSize: 12, fontWeight: "800" },

  emptyWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 40,
    gap: 8,
  },
  emptyTitle: { fontWeight: "800", color: "#111827" },
  emptySub: { color: "#6B7280", textAlign: "center", paddingHorizontal: 24 },
});
