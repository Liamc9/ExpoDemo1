import { useEffect, useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { db } from "../firebase-config";
import {
  doc,
  onSnapshot,
  collection,
  query,
  orderBy,
  onSnapshot as onSnapshotColl,
  updateDoc,
  Timestamp,
  DocumentData,
  addDoc,
  writeBatch,
} from "firebase/firestore";

type OrderStatus =
  | "placed"
  | "accepted"
  | "preparing"
  | "ready"
  | "out_for_delivery"
  | "completed"
  | "delivered"
  | "cancelled"
  | "refunded";

type Order = {
  id: string;
  shopId: string;
  buyerUid: string;
  status: OrderStatus;
  subtotalCents: number;
  feesCents: number;
  totalCents: number;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
  shopName?: string | null;
  heroImage?: string | null;
};

type LineItem = {
  id: string;
  productId: string;
  name: string;
  unitPriceCents: number;
  qty: number;
  imageUrl?: string | null;
};

const UPCOMING = new Set<OrderStatus>([
  "placed",
  "accepted",
  "preparing",
  "ready",
  "out_for_delivery",
]);

export default function OrderDetail({ route, navigation }: any) {
  const orderId: string = route?.params?.orderId;

  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<LineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // Subscribe to order doc
  useEffect(() => {
    if (!orderId) return;
    const ref = doc(db, "orders", orderId);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          setOrder({ id: snap.id, ...(snap.data() as DocumentData) } as Order);
        } else {
          setOrder(null);
        }
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, [orderId]);

  // Subscribe to line items
  useEffect(() => {
    if (!orderId) return;
    const q = query(
      collection(db, "orders", orderId, "items"),
      orderBy("name")
    );
    const unsub = onSnapshotColl(q, (snap) => {
      const rows: LineItem[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as DocumentData),
      })) as LineItem[];
      setItems(rows);
    });
    return () => unsub();
  }, [orderId]);

  const isUpcoming = useMemo(
    () => UPCOMING.has(order?.status as OrderStatus),
    [order?.status]
  );

  // Actions
  const copyId = useCallback(async () => {
    if (!order) return;
    await Clipboard.setStringAsync(order.id);
    Alert.alert("Copied", "Order ID copied to clipboard.");
  }, [order]);

  const cancelOrder = useCallback(async () => {
    if (!order) return;
    if (!isUpcoming) return;
    Alert.alert("Cancel order?", "This can’t be undone.", [
      { text: "No" },
      {
        text: "Yes, cancel",
        style: "destructive",
        onPress: async () => {
          try {
            setBusy(true);
            await updateDoc(doc(db, "orders", order.id), {
              status: "cancelled",
              updatedAt: Timestamp.now(),
            });
          } catch (e: any) {
            Alert.alert("Cancel failed", e?.message ?? "Please try again.");
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  }, [order, isUpcoming]);

  const reorder = useCallback(async () => {
    if (!order) return;
    try {
      setBusy(true);
      // Create a new order with same items (you might send to cart instead)
      const newRef = await addDoc(collection(db, "orders"), {
        shopId: order.shopId,
        buyerUid: order.buyerUid,
        status: "placed" as OrderStatus,
        subtotalCents: order.subtotalCents,
        feesCents: order.feesCents,
        totalCents: order.totalCents,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        shopName: order.shopName ?? null,
        heroImage: order.heroImage ?? null,
      });
      const batch = writeBatch(db);
      for (const it of items) {
        batch.set(doc(db, "orders", newRef.id, "items", it.id), {
          productId: it.productId,
          name: it.name,
          unitPriceCents: it.unitPriceCents,
          qty: it.qty,
          imageUrl: it.imageUrl ?? null,
        });
      }
      await batch.commit();
      Alert.alert("Reordered 🎉", `New order ID: ${newRef.id}`);
      navigation.push("OrderDetail", { orderId: newRef.id });
    } catch (e: any) {
      Alert.alert("Reorder failed", e?.message ?? "Please try again.");
    } finally {
      setBusy(false);
    }
  }, [order, items, navigation]);

  // Header right: Copy ID
  useEffect(() => {
    navigation.setOptions?.({
      headerRight: () => (
        <TouchableOpacity onPress={copyId} style={styles.headerBtn}>
          <Ionicons name="copy" size={16} color="#111827" />
        </TouchableOpacity>
      ),
      title: "Order details",
    });
  }, [navigation, copyId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.centerFill}>
          <ActivityIndicator />
          <Text style={styles.dim}>Loading order…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centerFill}>
          <Ionicons name="alert-circle-outline" size={28} color="#9CA3AF" />
          <Text style={styles.emptyTitle}>Order not found</Text>
          <Text style={styles.dim}>It may have been removed.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 28 }}
        bounces
      >
        {/* Hero / Header */}
        <View style={styles.heroCard}>
          <Image
            source={{
              uri:
                order.heroImage ||
                "https://images.unsplash.com/photo-1550547660-d9450f859349?q=80&w=1200&auto=format&fit=crop",
            }}
            style={styles.heroImage}
          />
          <View style={styles.heroInfo}>
            <View style={styles.rowBetween}>
              <Text style={styles.title} numberOfLines={1}>
                {order.shopName || "Your Order"}
              </Text>
              <StatusPill status={order.status} />
            </View>
            <Text style={styles.subtle}>
              {formatDateTime(order.createdAt)} • {money(order.totalCents)}
            </Text>

            <View style={[styles.rowBetween, { marginTop: 8 }]}>
              <View style={styles.inlineMeta}>
                <Ionicons name="receipt-outline" size={14} color="#6B7280" />
                <Text style={styles.meta}>#{order.id.slice(0, 8)}</Text>
              </View>
              <TouchableOpacity
                onPress={() => navigation.navigate?.("HelpCenter")}
                style={styles.linkRow}
              >
                <Text style={styles.link}>Get help</Text>
                <Ionicons name="chevron-forward" size={16} color="#2563EB" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Status timeline */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Status</Text>
          <Timeline current={order.status} />
        </View>

        {/* Items */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Items</Text>
          {items.length === 0 ? (
            <Text style={styles.dim}>No items found.</Text>
          ) : (
            items.map((it) => (
              <View key={it.id} style={styles.itemRow}>
                <Image
                  source={{
                    uri:
                      it.imageUrl ||
                      "https://images.unsplash.com/photo-1542831371-d531d36971e6?q=80&w=1200&auto=format&fit=crop",
                  }}
                  style={styles.itemImg}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName} numberOfLines={1}>
                    {it.name}
                  </Text>
                  <Text style={styles.subtle}>
                    Qty {it.qty} • {money(it.unitPriceCents)}
                  </Text>
                </View>
                <Text style={styles.itemTotal}>
                  {money((it.unitPriceCents || 0) * (it.qty || 0))}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* Summary */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <Row label="Subtotal" value={money(order.subtotalCents)} />
          {order.feesCents > 0 && (
            <Row label="Fees" value={money(order.feesCents)} />
          )}
          <Row label="Total" value={money(order.totalCents)} bold />
        </View>

        {/* Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            onPress={reorder}
            style={[styles.primaryBtn, busy && { opacity: 0.7 }]}
            disabled={busy}
            activeOpacity={0.92}
          >
            <Ionicons name="bag-check" size={18} color="#fff" />
            <Text style={styles.primaryText}>Reorder</Text>
          </TouchableOpacity>

          {isUpcoming && (
            <TouchableOpacity
              onPress={cancelOrder}
              style={[styles.secondaryBtn, busy && { opacity: 0.7 }]}
              disabled={busy}
              activeOpacity={0.9}
            >
              <Ionicons name="close-circle" size={18} color="#111827" />
              <Text style={styles.secondaryText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ---------------- UI helpers ---------------- */

function money(cents?: number) {
  const v = (cents ?? 0) / 100;
  return `£${v.toFixed(2)}`;
}
function formatDateTime(ts?: Timestamp | null) {
  if (!ts) return "—";
  const d = ts.toDate();
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusMeta(status: OrderStatus): {
  label: string;
  bg: string;
  fg: string;
  border: string;
} {
  switch (status) {
    case "placed":
      return {
        label: "Placed",
        bg: "#EFF6FF",
        fg: "#1D4ED8",
        border: "#DBEAFE",
      };
    case "accepted":
      return {
        label: "Accepted",
        bg: "#ECFDF5",
        fg: "#047857",
        border: "#D1FAE5",
      };
    case "preparing":
      return {
        label: "Preparing",
        bg: "#FFFBEB",
        fg: "#B45309",
        border: "#FDE68A",
      };
    case "ready":
      return {
        label: "Ready",
        bg: "#EEF2FF",
        fg: "#4F46E5",
        border: "#E0E7FF",
      };
    case "out_for_delivery":
      return {
        label: "On the way",
        bg: "#F0FDFA",
        fg: "#0F766E",
        border: "#99F6E4",
      };
    case "completed":
    case "delivered":
      return {
        label: "Delivered",
        bg: "#F0FDF4",
        fg: "#15803D",
        border: "#BBF7D0",
      };
    case "cancelled":
      return {
        label: "Cancelled",
        bg: "#FEF2F2",
        fg: "#B91C1C",
        border: "#FECACA",
      };
    case "refunded":
      return {
        label: "Refunded",
        bg: "#F5F3FF",
        fg: "#6D28D9",
        border: "#DDD6FE",
      };
    default:
      return {
        label: "Status",
        bg: "#F3F4F6",
        fg: "#111827",
        border: "#E5E7EB",
      };
  }
}

function StatusPill({ status }: { status: OrderStatus }) {
  const m = statusMeta(status);
  return (
    <View
      style={[styles.pill, { backgroundColor: m.bg, borderColor: m.border }]}
    >
      <Text style={[styles.pillText, { color: m.fg }]}>{m.label}</Text>
    </View>
  );
}

function Row({
  label,
  value,
  bold = false,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, bold && { fontWeight: "800" }]}>
        {label}
      </Text>
      <Text style={[styles.rowValue, bold && { fontWeight: "800" }]}>
        {value}
      </Text>
    </View>
  );
}

function Timeline({ current }: { current: OrderStatus }) {
  const steps: { key: OrderStatus; label: string }[] = [
    { key: "placed", label: "Placed" },
    { key: "accepted", label: "Accepted" },
    { key: "preparing", label: "Preparing" },
    { key: "ready", label: "Ready" },
    { key: "out_for_delivery", label: "On the way" },
    { key: "delivered", label: "Delivered" },
  ];

  const currentIdx =
    steps.findIndex((s) => s.key === current) === -1
      ? steps.length - 1
      : steps.findIndex((s) => s.key === current);

  return (
    <View style={styles.timeline}>
      {steps.map((s, i) => {
        const done = i <= currentIdx;
        return (
          <View style={styles.timelineStep} key={s.key}>
            <View
              style={[styles.dot, done ? styles.dotDone : styles.dotTodo]}
            />
            {i < steps.length - 1 && (
              <View
                style={[styles.bar, done ? styles.barDone : styles.barTodo]}
              />
            )}
            <Text style={[styles.tlLabel, done && styles.tlLabelDone]}>
              {s.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/* ---------------- styles ---------------- */

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F6F7F9" },

  headerBtn: {
    marginRight: 8,
    backgroundColor: "#F2F3F5",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E5E7EB",
  },

  centerFill: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 24,
  },
  dim: { color: "#6B7280", fontSize: 13 },
  emptyTitle: { color: "#111827", fontWeight: "800", fontSize: 16 },

  heroCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#EAECEF",
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
      },
      android: { elevation: 1 },
    }),
  },
  heroImage: { width: "100%", height: 140, backgroundColor: "#F3F4F6" },
  heroInfo: { padding: 12, gap: 6 },

  title: { color: "#111827", fontSize: 20, fontWeight: "800" },
  subtle: { color: "#6B7280" },
  inlineMeta: { flexDirection: "row", alignItems: "center", gap: 6 },
  meta: { color: "#6B7280", fontSize: 12 },
  linkRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  link: { color: "#2563EB", fontWeight: "700" },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  pill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pillText: { fontSize: 12, fontWeight: "800" },

  sectionTitle: { color: "#111827", fontWeight: "800", marginBottom: 8 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#EAECEF",
    padding: 12,
    marginTop: 12,
  },

  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
  },
  itemImg: {
    width: 56,
    height: 42,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
  },
  itemName: { color: "#111827", fontWeight: "700" },
  itemTotal: { color: "#111827", fontWeight: "800" },

  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  rowLabel: { color: "#6B7280" },
  rowValue: { color: "#111827" },

  // timeline
  timeline: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  timelineStep: { alignItems: "center", flex: 1 },
  dot: { width: 10, height: 10, borderRadius: 999, marginBottom: 6 },
  dotDone: { backgroundColor: "#2563EB" },
  dotTodo: { backgroundColor: "#D1D5DB" },
  bar: {
    position: "absolute",
    top: 4,
    right: 0,
    left: "50%",
    width: "50%",
    height: 2,
  },
  barDone: { backgroundColor: "#2563EB" },
  barTodo: { backgroundColor: "#E5E7EB" },
  tlLabel: { fontSize: 11, color: "#6B7280" },
  tlLabelDone: { color: "#111827", fontWeight: "700" },

  // actions
  actionsRow: { flexDirection: "row", gap: 10, marginTop: 16 },
  primaryBtn: {
    flex: 1,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563EB",
    paddingVertical: 12,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: "#2563EB",
        shadowOpacity: 0.3,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 6 },
      },
      android: { elevation: 2 },
    }),
  },
  primaryText: { color: "#fff", fontWeight: "800" },
  secondaryBtn: {
    flex: 1,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E5E7EB",
  },
  secondaryText: { color: "#111827", fontWeight: "800" },
});
