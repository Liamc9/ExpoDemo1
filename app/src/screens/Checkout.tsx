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
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { db, auth } from "../firebase-config";
import {
  collection,
  doc,
  onSnapshot,
  addDoc,
  serverTimestamp,
  writeBatch,
  updateDoc,
  increment,
  deleteDoc,
  orderBy,
  query,
} from "firebase/firestore";

// --- Stripe (Apple Pay) ---
import {
  PlatformPay,
  PlatformPayButton,
  confirmPlatformPayPayment,
  isPlatformPaySupported,
} from "@stripe/stripe-react-native";

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

  // Apple Pay support + in-flight payment state
  const [appleSupported, setAppleSupported] = useState(false);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    // Check if Apple Pay is supported on this device
    (async () => {
      try {
        const supported = await isPlatformPaySupported();
        setAppleSupported(Boolean(supported));
      } catch {
        setAppleSupported(false);
      }
    })();
  }, []);

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

  const feesCents = 0;
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

  // Persist order to Firestore (called after successful payment)
  const persistOrder = useCallback(async () => {
    if (!uid) {
      Alert.alert("Sign in required", "Please sign in to place an order.");
      return;
    }
    if (!shopId || items.length === 0) {
      Alert.alert("Cart empty", "Add some products first.");
      return;
    }

    try {
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

      for (const it of items) {
        batch.delete(doc(db, "carts", uid, "items", it.id));
      }

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

  // Existing non-Apple fallback (optional)
  const placeOrder = useCallback(async () => {
    // If you want to require payment always, you could remove this and force Apple Pay
    await persistOrder();
  }, [persistOrder]);

  // Apple Pay flow: pay, then persist order
  const payWithApplePay = useCallback(async () => {
    if (!uid) {
      Alert.alert("Sign in required", "Please sign in to place an order.");
      return;
    }
    if (!shopId || items.length === 0) {
      Alert.alert("Cart empty", "Add some products first.");
      return;
    }
    if (total <= 0) {
      Alert.alert("Nothing to pay", "Your total is £0.00");
      return;
    }
    try {
      setPaying(true);

      const base = process.env.EXPO_PUBLIC_API_BASE_URL!;
      const res = await fetch(`${base}/createPaymentIntent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: total, // minor units (pence)
          currency: "gbp",
          metadata: {
            buyerUid: uid,
            shopId: shopId!,
            itemCount: String(items.length),
          },
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.clientSecret) {
        throw new Error(json?.error || "Could not create payment intent");
      }

      const { error } = await confirmPlatformPayPayment(json.clientSecret, {
        applePay: {
          cartItems: [
            {
              label: "Subtotal",
              amount: (subtotal / 100).toFixed(2),
              paymentType: PlatformPay.PaymentType.Immediate,
            },
            ...(feesCents > 0
              ? [
                  {
                    label: "Fees",
                    amount: (feesCents / 100).toFixed(2),
                    paymentType: PlatformPay.PaymentType.Immediate,
                  } as const,
                ]
              : []),
            {
              label: "Total",
              amount: (total / 100).toFixed(2),
              paymentType: PlatformPay.PaymentType.Immediate,
            },
          ],
          merchantCountryCode: "GB",
          currencyCode: "GBP",
        },
      });

      if (error) {
        Alert.alert("Payment failed", error.message);
        setPaying(false);
        return;
      }

      // Payment confirmed — now write the order
      await persistOrder();
    } catch (e: any) {
      console.error(e);
      Alert.alert("Payment error", e?.message ?? "Please try again.");
    } finally {
      setPaying(false);
    }
  }, [uid, shopId, items, subtotal, feesCents, total, persistOrder]);

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
              <Ionicons name="remove" size={16} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.qty}>{item.qty ?? 0}</Text>
            <TouchableOpacity onPress={() => inc(item)} style={styles.stepBtn}>
              <Ionicons name="add" size={16} color="#111827" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={() => removeItem(item)}>
            <Ionicons name="trash-outline" size={18} color="#9AA1B2" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const Empty = () => (
    <View style={styles.centerFill}>
      <Ionicons name="cart-outline" size={28} color="#D1D5DB" />
      <Text style={styles.emptyTitle}>Your cart is empty</Text>
      <Text style={styles.dim}>Add items from a shop to see them here.</Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.centerFill}>
          <ActivityIndicator />
          <Text style={styles.dim}>Loading your cart…</Text>
        </View>
      </SafeAreaView>
    );
  }

  const canCheckout = items.length > 0 && total > 0;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Items */}
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        renderItem={ItemRow}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: 180,
          gap: 12,
        }}
        ListEmptyComponent={<Empty />}
      />

      {/* Cost summary + sticky card */}
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

        {/* Apple Pay button (iOS & supported) */}
        {Platform.OS === "ios" && appleSupported && canCheckout ? (
          <View style={{ marginTop: 12 }}>
            <PlatformPayButton
              type={PlatformPay.ButtonType.Buy}
              appearance={PlatformPay.ButtonStyle.Black}
              borderRadius={10}
              style={{ width: "100%", height: 50 }}
              onPress={payWithApplePay}
              disabled={paying}
            />
          </View>
        ) : null}
      </View>

      {/* Fallback CTA (Android or iOS without Apple Pay) */}
      {canCheckout ? (
        <TouchableOpacity
          style={[styles.checkoutBar, paying && { opacity: 0.6 }]}
          activeOpacity={0.92}
          onPress={
            Platform.OS === "ios" && appleSupported
              ? payWithApplePay
              : placeOrder
          }
          disabled={paying}
        >
          <Ionicons name="bag-check" size={18} color="#FFFFFF" />
          <Text style={styles.checkoutText}>
            {Platform.OS === "ios" && appleSupported
              ? "Pay with Apple Pay • "
              : "Place order • "}
            {count} item{count > 1 ? "s" : ""} • £{(total / 100).toFixed(2)}
          </Text>
          <View style={{ flex: 1 }} />
          <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      ) : null}
    </SafeAreaView>
  );
}

/* ---------------- styles ---------------- */
const CARD_RADIUS = 14;

const styles = StyleSheet.create({
  // light app background
  safe: { flex: 1, backgroundColor: "#F6F7F9", marginTop: 24 },

  dim: { color: "#6B7280", fontSize: 13 },
  emptyTitle: {
    color: "#111827",
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

  // white top bar with divider + shadow
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
  navBtn: {
    backgroundColor: "#F2F3F5",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E5E7EB",
  },

  // cards
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
    marginTop: 6,
  },

  // quantity stepper (light)
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F3F4F6",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E5E7EB",
  },
  stepBtn: {
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E5E7EB",
  },
  qty: {
    color: "#111827",
    fontWeight: "800",
    minWidth: 18,
    textAlign: "center",
  },

  // summary
  summaryCard: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 88,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#EAECEF",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
      },
      android: { elevation: 2 },
    }),
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 2,
  },
  sumVal: { color: "#111827", fontWeight: "700" },
  totalLabel: { color: "#111827", fontWeight: "800" },
  totalVal: { color: "#111827", fontWeight: "800" },

  // primary CTA
  checkoutBar: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#2563EB", // primary
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...Platform.select({
      ios: {
        shadowColor: "#2563EB",
        shadowOpacity: 0.35,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 8 },
      },
      android: { elevation: 6 },
    }),
  },
  checkoutText: { fontWeight: "800", color: "#FFFFFF" },
});
