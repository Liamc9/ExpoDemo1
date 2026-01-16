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

// Light theme + warm accent to match the rest of your app
const COLORS = {
  bg: "#F8FAFC",
  card: "#FFFFFF",
  text: "#0B1220",
  subtext: "#64748B",
  border: "#E5E7EB",
  icon: "#111827",
  accent: "#fff",
  accentSoft: "#2ecc71",
  accentBorder: "#FFEAD5",
  chip: "#F1F5F9",
  chipText: "#334155",
  badgeBg: "#ECFDF5",
  badgeBorder: "#86EFAC",
  badgeText: "#065F46",
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
    const t = setTimeout(() => setRefreshing(false), 600);
    return () => clearTimeout(t);
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

  /* ---------- UI pieces ---------- */

  const Header = () => (
    <View>
      {/* Topbar */}
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

      {/* Category chips */}
      <FlatList
        data={CATEGORIES}
        keyExtractor={(i) => i}
        renderItem={renderChip}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsContainer}
      />
    </View>
  );

  const renderChip = ({ item }: { item: string }) => {
    const active = category === item;
    return (
      <TouchableOpacity
        onPress={() => setCategory(item)}
        style={[
          styles.chip,
          active && {
            backgroundColor: COLORS.accentSoft,
            borderColor: COLORS.accentBorder,
          },
        ]}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        activeOpacity={0.9}
      >
        <Text
          numberOfLines={1}
          style={[
            styles.chipText,
            active && { color: COLORS.accent, fontWeight: "800" },
          ]}
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
        {/* Cover */}
        <View style={styles.imageWrap}>
          <Image
            source={{
              uri:
                item.coverUrl ||
                "https://images.unsplash.com/photo-1542831371-d531d36971e6?q=80&w=1200&auto=format&fit=crop",
            }}
            style={styles.image}
          />
          <View style={styles.imageOverlay} />
          {/* “Open” badge */}
          <View style={styles.badge}>
            <Ionicons
              name="checkmark-circle"
              size={14}
              color={COLORS.badgeText}
            />
            <Text style={styles.badgeText}>Open</Text>
          </View>
        </View>

        {/* Body */}
        <View style={styles.cardBody}>
          <View style={styles.cardHeader}>
            <Text numberOfLines={1} style={styles.cardTitle}>
              {item.name}
            </Text>
            <View style={styles.rating}>
              <Ionicons name="star" size={12} color={COLORS.accent} />
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
      <FlatList
        data={filtered}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        ListHeaderComponent={<Header />}
        contentContainerStyle={{ paddingBottom: 32 }}
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
      {/* Removed the “Open a shop” floating button as requested */}
    </SafeAreaView>
  );
}

const CARD_RADIUS = 16;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },

  topbar: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
  },
  topbarOverline: {
    color: "#94A3B8",
    fontSize: 12,
    marginBottom: 2,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  topbarTitle: { color: COLORS.text, fontSize: 24, fontWeight: "800" },

  searchWrap: {
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.04,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
      },
      android: { elevation: 1 },
    }),
  },
  searchInput: { flex: 1, color: COLORS.text, fontSize: 15 },

  chipsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: "center",
    gap: 8,
  },
  chip: {
    height: 36,
    paddingHorizontal: 14,
    backgroundColor: COLORS.chip,
    borderRadius: 999,
    marginRight: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    justifyContent: "center",
  },
  chipText: { color: COLORS.chipText, fontSize: 13, fontWeight: "700" },

  cardWrap: { paddingHorizontal: 16, marginBottom: 14 },
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
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.08)",
  },
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
    borderColor: COLORS.badgeBorder,
  },
  badgeText: { color: COLORS.badgeText, fontSize: 12, fontWeight: "700" },

  cardBody: { padding: 12, gap: 6 },
  cardHeader: { flexDirection: "row", alignItems: "center" },
  cardTitle: { flex: 1, color: COLORS.text, fontSize: 17, fontWeight: "800" },
  rating: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.accentSoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.accentBorder,
  },
  ratingText: { color: COLORS.text, fontSize: 12, fontWeight: "800" },

  subtitle: { color: COLORS.subtext, fontSize: 13 },

  metaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 },
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
    paddingHorizontal: 16,
  },
  emptyTitle: { color: COLORS.text, fontSize: 16, fontWeight: "800" },
  emptySubtitle: { color: COLORS.subtext, fontSize: 13 },
});
