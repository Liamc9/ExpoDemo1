import { StatusBar } from "expo-status-bar";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  TextInput,
  FlatList,
} from "react-native";
import { useEffect, useState } from "react";
import { addNote, getNotes, clearNotes, type Note } from "./notes";

export default function App() {
  const [count, setCount] = useState(0);
  const [text, setText] = useState("");
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setNotes(await getNotes());
      setLoading(false);
    })();
  }, []);

  async function onAdd() {
    if (!text.trim()) return;
    const next = await addNote(text.trim());
    setNotes(next);
    setText("");
  }

  return (
    <View style={s.container}>
      <Text style={s.title}>Expo Mobile ✅</Text>

      <Pressable style={s.btn} onPress={() => setCount((c) => c + 1)}>
        <Text>Count: {count}</Text>
      </Pressable>

      <View style={{ height: 12 }} />

      <TextInput
        placeholder="Write a note..."
        value={text}
        onChangeText={setText}
        style={s.input}
        autoCapitalize="sentences"
      />

      <View style={s.row}>
        <Pressable style={s.btn} onPress={onAdd}>
          <Text>Add Note</Text>
        </Pressable>
        <Pressable
          style={s.btn}
          onPress={async () => {
            await clearNotes();
            setNotes([]);
          }}
        >
          <Text>Clear</Text>
        </Pressable>
        <Pressable
          style={s.btn}
          onPress={async () => setNotes(await getNotes())}
        >
          <Text>{loading ? "Loading..." : "Refresh"}</Text>
        </Pressable>
      </View>

      <FlatList
        style={{ marginTop: 12, width: "100%" }}
        data={notes}
        keyExtractor={(n) => n.id}
        renderItem={({ item }) => <Text style={s.note}>• {item.text}</Text>}
        ListEmptyComponent={!loading ? <Text>No notes yet</Text> : null}
      />

      <StatusBar style="auto" />
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 16,
  },
  title: { fontSize: 22, fontWeight: "700" },
  btn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
  },
  input: { width: "100%", borderWidth: 1, borderRadius: 10, padding: 10 },
  row: { flexDirection: "row", gap: 8 },
});
