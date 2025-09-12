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
  doc,
  getDoc,
  collection,
  query,
  where,
  onSnapshot,
  setDoc,
  serverTimestamp,
  orderBy,
  increment,
} from "firebase/firestore";
import type { Product, Shop } from "../types";

type CartItem = {
  id: string;
  productId: string;
  name: string;
  unitPriceCents: number;
  qty: number;
  imageUrl?: string;
};

export default function Shop({ route, navigation }: any) {
  const { shopId } = route.params;
  const [shop, setShop] = useState<Shop | null>(null);
  const [loadingShop, setLoadingShop] = useState(true);

  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const uid = auth.currentUser?.uid ?? null;

  // --- subscribe to shop
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "shops", shopId),
      (s) => {
        setShop({ id: s.id, ...(s.data() as any) });
        setLoadingShop(false);
      },
      () => setLoadingShop(false)
    );
    return () => unsub();
  }, [shopId]);

  // --- subscribe products
  useEffect(() => {
    const pq = query(
      collection(db, "products"),
      where("shopId", "==", shopId),
      where("isActive", "==", true),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(
      pq,
      (s) => {
        setProducts(
          s.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Product[]
        );
        setLoadingProducts(false);
      },
      () => setLoadingProducts(false)
    );
    return () => unsub();
  }, [shopId]);

  // --- subscribe cart (only items for this shop)
  useEffect(() => {
    if (!uid) return;
    const itemsQ = query(
      collection(db, "carts", uid, "items")
      // optional: you can leave this unfiltered; we’ll filter by product data
      // but better to keep all and filter by cart.shopId below
    );
    const unsub = onSnapshot(itemsQ, async (snap) => {
      // We only want to show items when the cart belongs to this shopId
      const cartDoc = await getDoc(doc(db, "carts", uid));
      const belongsHere = cartDoc.exists() && cartDoc.data()?.shopId === shopId;
      if (!belongsHere) {
        setCartItems([]);
        return;
      }
      const items = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      })) as CartItem[];
      setCartItems(items);
    });
    return () => unsub();
  }, [uid, shopId]);

  // subtotal & count
  const { count, subtotal } = useMemo(() => {
    let c = 0;
    let s = 0;
    for (const it of cartItems) {
      c += it.qty || 0;
      s += (it.qty || 0) * (it.unitPriceCents || 0);
    }
    return { count: c, subtotal: s };
  }, [cartItems]);

  // --- add to cart (atomic, safe)
  const addToCart = useCallback(
    async (p: Product) => {
      if (!uid) {
        Alert.alert(
          "Sign in required",
          "Please sign in to add items to your cart."
        );
        return;
      }
      const cartRef = doc(db, "carts", uid);
      const itemRef = doc(db, "carts", uid, "items", p.id);

      const cartSnap = await getDoc(cartRef);
      if (!cartSnap.exists()) {
        // create the cart for this shop
        await setDoc(
          cartRef,
          { shopId, updatedAt: serverTimestamp() },
          { merge: true }
        );
      } else {
        const existingShop = cartSnap.data()?.shopId;
        if (existingShop && existingShop !== shopId) {
          Alert.alert(
            "Cart has items from another shop",
            "Clear your cart or checkout before adding items from a different shop."
          );
          return;
        }
      }

      await setDoc(
        itemRef,
        {
          productId: p.id,
          name: p.name,
          unitPriceCents: p.priceCents,
          imageUrl: (p as any).imageUrl || null,
          qty: increment(1), // atomic increment
        },
        { merge: true }
      );
      await setDoc(
        cartRef,
        { updatedAt: serverTimestamp(), shopId },
        { merge: true }
      );
    },
    [uid, shopId]
  );

  const ProductCard = ({ item }: { item: Product }) => (
    <View style={styles.card}>
      <Image
        source={{
          uri:
            (item as any).imageUrl ||
            "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?q=80&w=1200&auto=format&fit=crop",
        }}
        style={styles.cardImage}
      />
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.cardSubtitle} numberOfLines={1}>
          £{((item.priceCents ?? 0) / 100).toFixed(2)}
        </Text>

        <View style={styles.cardFooter}>
          <View style={styles.pillsRow}>
            {(item as any).tags?.slice(0, 2)?.map((t: string) => (
              <View key={t} style={styles.pill}>
                <Text style={styles.pillText}>{t}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity
            onPress={() => addToCart(item)}
            style={styles.addBtn}
            activeOpacity={0.9}
          >
            <Ionicons name="add" size={16} />
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const Header = () => (
    <View style={styles.header}>
      <Image
        source={{
          uri:
            shop?.coverUrl ||
            "https://images.unsplash.com/photo-1514933651103-005eec06c04b?q=80&w=1600&auto=format&fit=crop",
        }}
        style={styles.headerImage}
      />
      <View style={styles.headerOverlay} />
      <SafeAreaView style={{ position: "absolute", top: 0, left: 0, right: 0 }}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.navBtn}
          >
            <Ionicons name="chevron-back" size={18} />
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <TouchableOpacity
            onPress={() => navigation.navigate("Checkout")}
            style={styles.navBtn}
          >
            <Ionicons name="cart-outline" size={18} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <View style={styles.headerTextWrap}>
        <Text style={styles.shopName} numberOfLines={1}>
          {shop?.name || "Shop"}
        </Text>
        <Text style={styles.shopMeta} numberOfLines={1}>
          {(shop as any)?.tagline || "Homemade & local"} •{" "}
          {(shop as any)?.eta || "20–30 min"} •{" "}
          {(shop as any)?.priceBand || "££"}
        </Text>
      </View>
    </View>
  );

  const Empty = () =>
    loadingProducts ? (
      <View style={styles.centerFill}>
        <ActivityIndicator />
        <Text style={styles.dim}>Loading products…</Text>
      </View>
    ) : (
      <View style={styles.centerFill}>
        <Ionicons name="restaurant-outline" size={28} color="#EDEEF1" />
        <Text style={styles.emptyTitle}>No products yet</Text>
        <Text style={styles.dim}>Please check back later.</Text>
      </View>
    );

  return (
    <View style={styles.screen}>
      {/* Header */}
      <Header />

      {/* Products grid (2 columns) */}
      <FlatList
        data={products}
        keyExtractor={(i) => i.id}
        renderItem={ProductCard}
        numColumns={2}
        columnWrapperStyle={{ gap: 12, paddingHorizontal: 16 }}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 120, gap: 12 }}
        ListEmptyComponent={<Empty />}
      />

      {/* Sticky Checkout bar */}
      {count > 0 ? (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => navigation.navigate("Checkout")}
          style={styles.checkoutBar}
        >
          <Ionicons name="cart" size={18} />
          <Text style={styles.checkoutText}>
            {count} item{count > 1 ? "s" : ""} • £{(subtotal / 100).toFixed(2)}
          </Text>
          <View style={{ flex: 1 }} />
          <Ionicons name="chevron-forward" size={18} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

/* ---------------- styles ---------------- */
const CARD_RADIUS = 14;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#0B0B0C" },

  header: { height: 220, position: "relative" },
  headerImage: { width: "100%", height: "100%" },
  headerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  headerContent: {
    paddingHorizontal: 12,
    paddingTop: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
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
  headerTextWrap: {
    position: "absolute",
    bottom: 14,
    left: 16,
    right: 16,
  },
  shopName: { color: "#FFFFFF", fontSize: 24, fontWeight: "800" },
  shopMeta: { color: "#EDEEF1", opacity: 0.9, marginTop: 4 },

  // product cards
  card: {
    flex: 1,
    backgroundColor: "#0E0F13",
    borderRadius: CARD_RADIUS,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#20232A",
  },
  cardImage: { width: "100%", height: 120, backgroundColor: "#1A1B1E" },
  cardBody: { padding: 10, gap: 6 },
  cardTitle: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  cardSubtitle: { color: "#A8ABB2", fontSize: 13 },
  cardFooter: { flexDirection: "row", alignItems: "center", gap: 8 },
  pillsRow: { flexDirection: "row", gap: 6, flex: 1 },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#15161A",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#23252A",
  },
  pillText: { color: "#CACDD3", fontSize: 11, fontWeight: "700" },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addBtnText: { fontWeight: "800", fontSize: 12 },

  // empties / loading
  centerFill: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 40,
    gap: 8,
  },
  dim: { color: "#9FA2A7" },
  emptyTitle: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },

  // checkout bar
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
