import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  StyleSheet,
  Keyboard,
  SafeAreaView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";

type Item = { id: string; title: string; subtitle?: string; tags?: string[] };

const STORAGE_KEY = "recent_searches_v1";

// Demo dataset — replace with your API/data later
const DATA: Item[] = [
  { id: "1", title: "Getting started with Expo", subtitle: "Docs & tips", tags: ["expo", "setup"] },
  { id: "2", title: "React Navigation guide", subtitle: "Stacks & Tabs", tags: ["navigation"] },
  { id: "3", title: "AsyncStorage patterns", subtitle: "Persist state", tags: ["storage"] },
  { id: "4", title: "Plotly charts in RN", subtitle: "Data viz", tags: ["charts"] },
  { id: "5", title: "Dashboards in Expo", subtitle: "Layouts & cards", tags: ["ui", "cards"] },
  { id: "6", title: "Hermes & Reanimated", subtitle: "Perf + config", tags: ["perf"] },
];

export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState<string[]>([]);
  const [focused, setFocused] = useState(false);
  const [now, setNow] = useState(Date.now()); // simple key to reset list

  // Debounce
  const debounced = useDebounced(query, 200);

  // Load/save recent
  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) setRecent(JSON.parse(raw));
    })();
  }, []);

  const pushRecent = async (q: string) => {
    if (!q.trim()) return;
    const next = [q, ...recent.filter((r) => r !== q)].slice(0, 8);
    setRecent(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const clearRecent = async () => {
    setRecent([]);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([]));
  };

  const results = useMemo(() => {
    const q = debounced.trim().toLowerCase();
    if (!q) return [];
    return DATA.filter((it) => {
      const hay =
        `${it.title} ${it.subtitle ?? ""} ${(it.tags ?? []).join(" ")}`.toLowerCase();
      return hay.includes(q);
    });
  }, [debounced]);

  const onSubmit = () => {
    const q = query.trim();
    if (!q) return;
    pushRecent(q);
    Keyboard.dismiss();
    // keep results visible
  };

  const onChipPress = (q: string) => {
    setQuery(q);
    setTimeout(onSubmit, 0);
  };

  const renderItem = ({ item }: { item: Item }) => (
    <Pressable style={({ pressed }) => [s.row, { opacity: pressed ? 0.7 : 1 }]}>
      <View style={s.rowIcon}>
        <Ionicons name="document-text-outline" size={18} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.rowTitle}>{highlight(item.title, debounced)}</Text>
        {item.subtitle ? <Text style={s.rowSub}>{highlight(item.subtitle, debounced)}</Text> : null}
        {item.tags?.length ? (
          <View style={s.tagRow}>
            {item.tags.slice(0, 3).map((t) => (
              <View key={t} style={s.tag}>
                <Text style={s.tagText}>#{t}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color="#bbb" />
    </Pressable>
  );

  return (
    <SafeAreaView style={s.safe}>
      {/* Search bar */}
      <View style={s.searchBar}>
        <Ionicons name="search-outline" size={18} color="#777" />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search…"
          style={s.input}
          returnKeyType="search"
          onSubmitEditing={onSubmit}
          onFocus={() => setFocused(true)}
        />
        {!!query && (
          <Pressable onPress={() => setQuery("")}>
            <Ionicons name="close-circle" size={18} color="#aaa" />
          </Pressable>
        )}
      </View>

      {/* Suggestions / recent */}
      {!debounced && (
        <View style={s.section}>
          <View style={s.sectionHead}>
            <Text style={s.sectionTitle}>Recent</Text>
            {!!recent.length && (
              <Pressable onPress={clearRecent}>
                <Text style={s.clearLink}>Clear</Text>
              </Pressable>
            )}
          </View>

          {recent.length ? (
            <View style={s.chips}>
              {recent.map((r) => (
                <Pressable key={r} onPress={() => onChipPress(r)} style={s.chip}>
                  <Ionicons name="time-outline" size={14} color="#666" />
                  <Text style={s.chipText}>{r}</Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <Text style={s.emptySub}>No recent searches yet.</Text>
          )}

          <Text style={[s.sectionTitle, { marginTop: 16 }]}>Try</Text>
          <View style={s.chips}>
            {["Expo", "Navigation", "AsyncStorage"].map((t) => (
              <Pressable key={t} onPress={() => onChipPress(t)} style={s.chip}>
                <Ionicons name="sparkles-outline" size={14} color="#666" />
                <Text style={s.chipText}>{t}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {/* Results */}
      {!!debounced && (
        <FlatList
          key={now} // simple trick to force layout reset when needed
          data={results}
          keyExtractor={(it) => it.id}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={s.sep} />}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, paddingTop: 6 }}
          ListEmptyComponent={
            <View style={s.emptyBox}>
              <Ionicons name="search" size={20} color="#bbb" />
              <Text style={s.emptyTitle}>No results</Text>
              <Text style={s.emptySub}>Try a different keyword.</Text>
            </View>
          }
          keyboardShouldPersistTaps="handled"
        />
      )}
    </SafeAreaView>
  );
}

/* ---------- hooks & helpers ---------- */

function useDebounced<T>(value: T, delay = 250) {
  const [out, setOut] = useState(value);
  const t = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (t.current) clearTimeout(t.current);
    t.current = setTimeout(() => setOut(value), delay);
    return () => {
      if (t.current) clearTimeout(t.current);
    };
  }, [value, delay]);
  return out;
}

function highlight(text: string, q: string) {
  if (!q) return text;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i === -1) return text;
  const before = text.slice(0, i);
  const mid = text.slice(i, i + q.length);
  const after = text.slice(i + q.length);
  return (
    <Text>
      {before}
      <Text style={{ backgroundColor: "#ffedd5" }}>{mid}</Text>
      {after}
    </Text>
  );
}

/* ---------- styles ---------- */

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  searchBar: {
    height: 44,
    margin: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e6e6e6",
    backgroundColor: "#fafafa",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  input: { flex: 1, height: 44 },
  section: { paddingHorizontal: 16 },
  sectionHead: { flexDirection: "row", alignItems: "center" },
  sectionTitle: { fontSize: 14, fontWeight: "700", flex: 1 },
  clearLink: { color: "#2563eb", fontSize: 12, fontWeight: "600" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#f4f4f5",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#ececec",
    flexDirection: "row",
    gap: 6,
  },
  chipText: { fontSize: 13, color: "#333" },

  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  rowIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "#f1f1f1", alignItems: "center", justifyContent: "center",
  },
  rowTitle: { fontSize: 15, fontWeight: "700" },
  rowSub: { fontSize: 12, color: "#666", marginTop: 2 },
  tagRow: { flexDirection: "row", gap: 6, marginTop: 6 },
  tag: { backgroundColor: "#fff", borderColor: "#eee", borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
  tagText: { fontSize: 11, color: "#666" },

  sep: { height: StyleSheet.hairlineWidth, backgroundColor: "#eee", marginLeft: 64 },

  emptyBox: { alignItems: "center", marginTop: 32, gap: 6 },
  emptyTitle: { fontSize: 15, fontWeight: "700", marginTop: 6 },
  emptySub: { fontSize: 12, color: "#777" },
});
