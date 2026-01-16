import React, { useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { RouteProp, useRoute } from "@react-navigation/native";

type Message = {
  id: string;
  author: "me" | "them";
  text: string;
  at: number; // timestamp
};

// Quick demo data per chat
const SEED: Record<string, Message[]> = {
  a1: [
    {
      id: "m1",
      author: "them",
      text: "Welcome to the room 👋",
      at: Date.now() - 2 * 60 * 1000,
    },
  ],
  b2: [
    {
      id: "m1",
      author: "them",
      text: "Ship it tomorrow?",
      at: Date.now() - 3 * 3600 * 1000,
    },
  ],
  c3: [
    {
      id: "m1",
      author: "them",
      text: "Let’s try Expo Router later",
      at: Date.now() - 86400000,
    },
  ],
};

type ChatRoute = RouteProp<{ Chat: { chatId: string; title: string } }, "Chat">;

export default function ChatScreen() {
  const { params } = useRoute<ChatRoute>();
  const { chatId } = params;

  const [messages, setMessages] = useState<Message[]>(
    (SEED[chatId] ?? []).sort((a, b) => a.at - b.at)
  );
  const [input, setInput] = useState("");
  const listRef = useRef<FlatList<Message>>(null);

  const send = () => {
    const text = input.trim();
    if (!text) return;
    const msg: Message = {
      id: String(Date.now()),
      author: "me",
      text,
      at: Date.now(),
    };
    setMessages((prev) => [...prev, msg]);
    setInput("");
    requestAnimationFrame(() =>
      listRef.current?.scrollToEnd({ animated: true })
    );
  };

  const renderItem = ({ item }: { item: Message }) => {
    const mine = item.author === "me";
    return (
      <View
        style={[
          s.bubbleRow,
          { justifyContent: mine ? "flex-end" : "flex-start" },
        ]}
      >
        <View
          style={[
            s.bubble,
            mine ? s.bubbleMe : s.bubbleThem,
            { maxWidth: "80%" },
          ]}
        >
          <Text style={[s.bubbleText, { color: mine ? "#fff" : "#111" }]}>
            {item.text}
          </Text>
        </View>
      </View>
    );
  };

  const ListHeader = useMemo(
    () => (
      <View style={s.header}>
        <Text style={s.headerTitle}>{params.title}</Text>
        <Text style={s.headerSub}>Online</Text>
      </View>
    ),
    [params.title]
  );

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: "padding", android: undefined })}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 12, paddingBottom: 8 }}
          ListHeaderComponent={ListHeader}
          onContentSizeChange={() =>
            listRef.current?.scrollToEnd({ animated: false })
          }
        />

        <View style={s.inputBar}>
          <Pressable style={s.iconBtn}>
            <Ionicons name="add-outline" size={20} />
          </Pressable>
          <TextInput
            style={s.input}
            value={input}
            onChangeText={setInput}
            placeholder="Message"
            returnKeyType="send"
            onSubmitEditing={send}
          />
          <Pressable style={s.iconBtn} onPress={send}>
            <Ionicons name="send-outline" size={18} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  header: { alignItems: "center", paddingVertical: 8 },
  headerTitle: { fontSize: 16, fontWeight: "700" },
  headerSub: { fontSize: 12, color: "#666", marginTop: 2 },

  bubbleRow: { flexDirection: "row", marginVertical: 4, paddingHorizontal: 8 },
  bubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#eaeaea",
  },
  bubbleMe: { backgroundColor: "#2563eb", borderColor: "#2563eb" },
  bubbleThem: { backgroundColor: "#f3f4f6" },
  bubbleText: { fontSize: 15 },

  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#eee",
    backgroundColor: "#fafafa",
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#eee",
  },
  input: {
    flex: 1,
    height: 40,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e6e6e6",
  },
});
