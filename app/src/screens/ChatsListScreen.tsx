import React, { useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

type ChatSummary = {
  id: string;
  title: string; // chat title or participant
  last: string; // last message preview
  when: string; // "2m", "Yesterday", etc.
  unread?: number; // badge
};

const MOCK_CHATS: ChatSummary[] = [
  {
    id: "a1",
    title: "General",
    last: "Welcome to the room 👋",
    when: "Just now",
    unread: 2,
  },
  { id: "b2", title: "Product Team", last: "Ship it tomorrow?", when: "2h" },
  {
    id: "c3",
    title: "Liam",
    last: "Let’s try Expo Router later",
    when: "Yesterday",
    unread: 1,
  },
];

export default function ChatsListScreen() {
  const navigation = useNavigation<any>();
  const data = useMemo(() => MOCK_CHATS, []);

  const renderItem = ({ item }: { item: ChatSummary }) => (
    <Pressable
      onPress={() =>
        navigation.navigate("Chat", { chatId: item.id, title: item.title })
      }
      style={({ pressed }) => [s.row, { opacity: pressed ? 0.7 : 1 }]}
    >
      <View style={s.avatar}>
        <Text style={s.avatarText}>{initials(item.title)}</Text>
      </View>

      <View style={{ flex: 1 }}>
        <View style={s.topLine}>
          <Text style={s.title}>{item.title}</Text>
          <Text style={s.when}>{item.when}</Text>
        </View>
        <Text style={s.sub} numberOfLines={1}>
          {item.last}
        </Text>
      </View>

      {item.unread ? (
        <View style={s.badge}>
          <Text style={s.badgeText}>{item.unread}</Text>
        </View>
      ) : (
        <Ionicons name="chevron-forward" size={18} color="#bbb" />
      )}
    </Pressable>
  );

  return (
    <SafeAreaView style={s.safe}>
      <FlatList
        data={data}
        keyExtractor={(it) => it.id}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={s.sep} />}
        contentContainerStyle={{ paddingVertical: 8 }}
      />
    </SafeAreaView>
  );
}

function initials(name: string) {
  const i = name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0]?.toUpperCase())
    .slice(0, 2)
    .join("");
  return i || "•";
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  row: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontWeight: "700" },
  topLine: { flexDirection: "row", alignItems: "center" },
  title: { fontSize: 16, fontWeight: "700", flex: 1 },
  when: { fontSize: 12, color: "#888" },
  sub: { fontSize: 13, color: "#666", marginTop: 2 },
  badge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: "tomato",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  badgeText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  sep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#eee",
    marginLeft: 66,
  },
});
