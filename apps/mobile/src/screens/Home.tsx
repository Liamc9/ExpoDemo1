import { useEffect, useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  SafeAreaView,
  TextInput,
  StatusBar,
  StyleSheet,
  RefreshControl,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { db } from "../firebase-config";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import type { Shop } from "../types";

const CATEGORIES = ["All", "Bakery", "Coffee", "Meals", "Desserts", "Crafts"];

const COLORS = {
  bg: "#F8FAFC",
  card: "#FFFFFF",
  text: "#0B1220",
  subtext: "#475569",
  border: "#E5E9F0",
  chip: "#EEF2FF",
  chipActive: "#DBEAFE",
  icon: "#1F2937",
  primary: "#2563EB",
  badgeBg: "#DCFCE7",
  badgeText: "#14532D",
};

export default function Home({ navigation }: any) {
  const [shops, setShops] = useState<Shop[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  useEffect(() => {
    const q = query(collection(db, "shops"), where("status", "==", "active"));
    const unsub = onSnapshot(q, (snap) => {
      setShops(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    });
    return () => unsub();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    const timer = setTimeout(() => setRefreshing(false), 700);
    return () => clearTimeout(timer);
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return shops.filter((s: any) => {
      const inCategory =
        category === "All" ||
        (s.categories &&
          s.categories
            .map((c: string) => c.toLowerCase())
            .includes(category.toLowerCase()));
      const matchesQuery =
        !q ||
        s.name?.toLowerCase().includes(q) ||
        s.slug?.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q);
      return inCategory && matchesQuery;
    });
  }, [shops, search, category]);

  /* ---------- UI renderers ---------- */
  const renderChip = ({ item }: { item: string }) => {
    const active = category === item;
    return (
      <TouchableOpacity
        onPress={() => setCategory(item)}
        style={[styles.chip, active && styles.chipActive]}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
      >
        <Text
          numberOfLines={1}
          style={[styles.chipText, active && styles.chipTextActive]}
        >
          {item}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate("Shop", { shopId: item.id })}
      activeOpacity={0.9}
      style={styles.cardWrap}
    >
      <View style={styles.card}>
        <View style={styles.imageWrap}>
          <Image
            source={{
              uri:
                item.coverUrl ||
                "https://images.unsplash.com/photo-1542831371-d531d36971e6?q=80&w=1200&auto=format&fit=crop",
            }}
            style={styles.image}
          />
          <View style={styles.badge}>
            <Ionicons
              name="checkmark-circle"
              size={14}
              color={COLORS.badgeText}
            />
            <Text style={styles.badgeText}>Open</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.cardHeader}>
            <Text numberOfLines={1} style={styles.cardTitle}>
              {item.name}
            </Text>
            <View style={styles.rating}>
              <Ionicons name="star" size={14} color={COLORS.primary} />
              <Text style={styles.ratingText}>
                {(item.rating ?? 4.8).toFixed(1)}
              </Text>
            </View>
          </View>

          <Text numberOfLines={1} style={styles.subtitle}>
            @{item.slug} •{" "}
            {item.shortTagline || item.tagline || "Homemade & local"}
          </Text>

          <View style={styles.metaRow}>
            <View style={styles.metaPill}>
              <Ionicons name="timer-outline" size={13} color={COLORS.subtext} />
              <Text style={styles.metaText}>{item.eta || "20–30 min"}</Text>
            </View>
            <View style={styles.metaPill}>
              <Ionicons
                name="pricetag-outline"
                size={13}
                color={COLORS.subtext}
              />
              <Text style={styles.metaText}>{item.priceBand || "££"}</Text>
            </View>
            {item.categories?.length ? (
              <View style={styles.metaPill}>
                <Ionicons
                  name="restaurant-outline"
                  size={13}
                  color={COLORS.subtext}
                />
                <Text numberOfLines={1} style={styles.metaText}>
                  {item.categories[0]}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      {/* Top bar (profile button removed) */}
      <View style={styles.topbar}>
        <Text style={styles.topbarOverline}>Discover</Text>
        <Text style={styles.topbarTitle}>Nearby Shops</Text>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={COLORS.subtext} />
        <TextInput
          placeholder="Search for bread, coffee, crafts…"
          placeholderTextColor="#94A3B8"
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
          returnKeyType="search"
        />
        {search ? (
          <TouchableOpacity
            onPress={() => setSearch("")}
            accessibilityLabel="Clear search"
          >
            <Ionicons name="close-circle" size={18} color={COLORS.subtext} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Category chips (consistent sizing) */}
      <FlatList
        data={CATEGORIES}
        keyExtractor={(i) => i}
        renderItem={renderChip}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsContainer}
      />

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons
              name="storefront-outline"
              size={28}
              color={COLORS.subtext}
            />
            <Text style={styles.emptyTitle}>No shops found</Text>
            <Text style={styles.emptySubtitle}>
              Try a different search or category.
            </Text>
          </View>
        }
      />

      {/* Floating CTA */}
      <TouchableOpacity
        onPress={() => navigation.navigate("CreateShop")}
        activeOpacity={0.9}
        style={styles.fab}
        accessibilityRole="button"
      >
        <Ionicons name="add" size={20} color="#FFFFFF" />
        <Text style={styles.fabText}>Open a shop</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const CARD_RADIUS = 16;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },

  topbar: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
  },
  topbarOverline: {
    color: "#64748B",
    fontSize: 12,
    marginBottom: 2,
    fontWeight: "600",
  },
  topbarTitle: { color: COLORS.text, fontSize: 22, fontWeight: "800" },

  searchWrap: {
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchInput: { flex: 1, color: COLORS.text, fontSize: 15 },

  chipsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    alignItems: "center",
  },
  chip: {
    height: 36, // <- consistent height
    paddingHorizontal: 14,
    backgroundColor: COLORS.chip,
    borderRadius: 999,
    marginRight: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    justifyContent: "center", // centers label vertically
  },
  chipActive: {
    backgroundColor: COLORS.chipActive,
    borderColor: "#BFDBFE",
  },
  chipText: { color: "#334155", fontSize: 13, fontWeight: "700" },
  chipTextActive: { color: COLORS.text },

  cardWrap: { marginBottom: 14 },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: CARD_RADIUS,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
      },
      android: { elevation: 2 },
    }),
  },
  imageWrap: { position: "relative" },
  image: { width: "100%", height: 160, backgroundColor: "#E2E8F0" },
  badge: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: COLORS.badgeBg,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#86EFAC",
  },
  badgeText: { color: COLORS.badgeText, fontSize: 12, fontWeight: "700" },

  cardBody: { padding: 12, gap: 6 },
  cardHeader: { flexDirection: "row", alignItems: "center" },
  cardTitle: { flex: 1, color: COLORS.text, fontSize: 17, fontWeight: "800" },
  rating: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  ratingText: { color: COLORS.text, fontSize: 12, fontWeight: "800" },

  subtitle: { color: COLORS.subtext, fontSize: 13 },

  metaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#F1F5F9",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  metaText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "600",
    maxWidth: 120,
  },

  empty: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 80,
    gap: 8,
  },
  emptyTitle: { color: COLORS.text, fontSize: 16, fontWeight: "800" },
  emptySubtitle: { color: COLORS.subtext, fontSize: 13 },

  fab: {
    position: "absolute",
    right: 16,
    bottom: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 999,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 6 },
      },
      android: { elevation: 4 },
    }),
  },
  fabText: { fontWeight: "800", fontSize: 14, color: "#FFFFFF" },
});
