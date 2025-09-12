import { useEffect, useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { db, auth } from "../firebase-config";
import {
  collection,
  doc,
  onSnapshot,
  getDoc,
  addDoc,
  serverTimestamp,
  writeBatch,
  updateDoc,
  increment,
  deleteDoc,
  orderBy,
  query,
} from "firebase/firestore";

type CartItem = {
  id: string;
  productId: string;
  name: string;
  unitPriceCents: number;
  qty: number;
  imageUrl?: string | null;
};

export default function Checkout({ navigation }: any) {
  const uid = auth.currentUser?.uid ?? null;

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<CartItem[]>([]);
  const [shopId, setShopId] = useState<string | null>(null);

  // live cart
  useEffect(() => {
    if (!uid) return;

    const cartRef = doc(db, "carts", uid);
    const unsubCart = onSnapshot(cartRef, (snap) => {
      setShopId(snap.exists() ? (snap.data().shopId as string) : null);
    });

    const itemsQ = query(
      collection(db, "carts", uid, "items"),
      orderBy("productId", "asc")
    );
    const unsubItems = onSnapshot(
      itemsQ,
      (snap) => {
        setItems(
          snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as any),
          })) as CartItem[]
        );
        setLoading(false);
      },
      () => setLoading(false)
    );

    return () => {
      unsubCart();
      unsubItems();
    };
  }, [uid]);

  const { count, subtotal } = useMemo(() => {
    let c = 0;
    let s = 0;
    for (const it of items) {
      const q = it.qty || 0;
      const p = it.unitPriceCents || 0;
      c += q;
      s += q * p;
    }
    return { count: c, subtotal: s };
  }, [items]);

  const feesCents = 0; // add fees here later
  const total = subtotal + feesCents;

  // qty controls
  const inc = useCallback(
    async (item: CartItem) => {
      if (!uid) return;
      const ref = doc(db, "carts", uid, "items", item.id);
      await updateDoc(ref, { qty: increment(1) });
    },
    [uid]
  );

  const dec = useCallback(
    async (item: CartItem) => {
      if (!uid) return;
      const ref = doc(db, "carts", uid, "items", item.id);
      if ((item.qty || 0) <= 1) {
        // delete when hitting 0
        await deleteDoc(ref);
      } else {
        await updateDoc(ref, { qty: increment(-1) });
      }
    },
    [uid]
  );

  const removeItem = useCallback(
    async (item: CartItem) => {
      if (!uid) return;
      await deleteDoc(doc(db, "carts", uid, "items", item.id));
    },
    [uid]
  );

  const placeOrder = useCallback(async () => {
    if (!uid) {
      Alert.alert("Sign in required", "Please sign in to place an order.");
      return;
    }
    if (!shopId || items.length === 0) {
      Alert.alert("Cart empty", "Add some products first.");
      return;
    }

    try {
      // create order
      const orderRef = await addDoc(collection(db, "orders"), {
        shopId,
        buyerUid: uid,
        status: "placed",
        subtotalCents: subtotal,
        feesCents,
        totalCents: total,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // write line items + clear cart in a batch
      const batch = writeBatch(db);

      for (const it of items) {
        const lineRef = doc(db, "orders", orderRef.id, "items", it.id);
        batch.set(lineRef, {
          productId: it.productId,
          name: it.name,
          unitPriceCents: it.unitPriceCents,
          qty: it.qty,
          imageUrl: it.imageUrl ?? null,
        });
      }

      // clear cart items
      for (const it of items) {
        batch.delete(doc(db, "carts", uid, "items", it.id));
      }

      // update cart doc (kept for future) or you could delete it
      batch.set(
        doc(db, "carts", uid),
        { updatedAt: serverTimestamp() },
        { merge: true }
      );

      await batch.commit();

      Alert.alert("Order placed 🎉", `Order ID: ${orderRef.id}`);
      navigation.goBack();
    } catch (e: any) {
      console.error(e);
      Alert.alert("Order failed", e?.message ?? "Please try again.");
    }
  }, [uid, shopId, items, subtotal, total]);

  const ItemRow = ({ item }: { item: CartItem }) => (
    <View style={styles.card}>
      <Image
        source={{
          uri:
            item.imageUrl ||
            "https://images.unsplash.com/photo-1542831371-d531d36971e6?q=80&w=1200&auto=format&fit=crop",
        }}
        style={styles.cardImage}
      />
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.cardSub}>
          £{((item.unitPriceCents ?? 0) / 100).toFixed(2)}
        </Text>

        <View style={styles.rowBetween}>
          <View style={styles.stepper}>
            <TouchableOpacity onPress={() => dec(item)} style={styles.stepBtn}>
              <Ionicons name="remove" size={16} />
            </TouchableOpacity>
            <Text style={styles.qty}>{item.qty ?? 0}</Text>
            <TouchableOpacity onPress={() => inc(item)} style={styles.stepBtn}>
              <Ionicons name="add" size={16} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={() => removeItem(item)}>
            <Ionicons name="trash-outline" size={18} color="#9FA2A7" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const Empty = () => (
    <View style={styles.centerFill}>
      <Ionicons name="cart-outline" size={28} color="#EDEEF1" />

      <Text style={styles.emptyTitle}>Your cart is empty</Text>
      <Text style={styles.dim}>Add items from a shop to see them here.</Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centerFill}>
          <ActivityIndicator />
          <Text style={styles.dim}>Loading your cart…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Top bar */}
      <View style={styles.topbar}>
        <Text style={styles.title}>Checkout</Text>
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.navBtn}
        >
          <Ionicons name="chevron-down" size={16} />
        </TouchableOpacity>
      </View>

      {/* Items */}
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        renderItem={ItemRow}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: 140,
          gap: 12,
        }}
        ListEmptyComponent={<Empty />}
      />

      {/* Cost summary + sticky bar */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Text style={styles.dim}>Subtotal</Text>
          <Text style={styles.sumVal}>£{(subtotal / 100).toFixed(2)}</Text>
        </View>
        {feesCents > 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.dim}>Fees</Text>
            <Text style={styles.sumVal}>£{(feesCents / 100).toFixed(2)}</Text>
          </View>
        )}
        <View style={[styles.summaryRow, { marginTop: 6 }]}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalVal}>£{(total / 100).toFixed(2)}</Text>
        </View>
      </View>

      {items.length > 0 ? (
        <TouchableOpacity
          style={styles.checkoutBar}
          activeOpacity={0.9}
          onPress={placeOrder}
        >
          <Ionicons name="bag-check" size={18} />
          <Text style={styles.checkoutText}>
            Place order • {count} item{count > 1 ? "s" : ""} • £
            {(total / 100).toFixed(2)}
          </Text>
          <View style={{ flex: 1 }} />
          <Ionicons name="chevron-forward" size={18} />
        </TouchableOpacity>
      ) : null}
    </SafeAreaView>
  );
}

/* ---------------- styles ---------------- */
const CARD_RADIUS = 14;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0B0B0C" },
  dim: { color: "#A8ABB2", fontSize: 13 },
  emptyTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
    marginTop: 8,
  },
  centerFill: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    gap: 10,
  },

  topbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
  },
  title: { color: "#FFFFFF", fontSize: 22, fontWeight: "800" },
  navBtn: {
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.2,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 6 },
      },
      android: { elevation: 4 },
    }),
  },

  card: {
    flexDirection: "row",
    gap: 12,
    padding: 10,
    backgroundColor: "#0E0F13",
    borderRadius: CARD_RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#20232A",
  },
  cardImage: {
    width: 80,
    height: 60,
    borderRadius: 10,
    backgroundColor: "#1A1B1E",
  },
  cardTitle: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  cardSub: { color: "#A8ABB2", fontSize: 13 },

  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#15161A",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#23252A",
  },
  stepBtn: {
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  qty: {
    color: "#FFFFFF",
    fontWeight: "800",
    minWidth: 18,
    textAlign: "center",
  },

  summaryCard: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 88,
    backgroundColor: "#0E0F13",
    borderRadius: 12,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#20232A",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 2,
  },
  sumVal: { color: "#EDEEF1", fontWeight: "700" },
  totalLabel: { color: "#FFFFFF", fontWeight: "800" },
  totalVal: { color: "#FFFFFF", fontWeight: "800" },

  checkoutBar: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.25,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 8 },
      },
      android: { elevation: 6 },
    }),
  },
  checkoutText: { fontWeight: "800" },
});
