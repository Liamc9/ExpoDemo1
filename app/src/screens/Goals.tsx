// screens/Goals.tsx
import React, { useEffect, useState } from "react";
import { View, Text, FlatList, Modal, TextInput, Pressable, Platform } from "react-native";
import { collection, addDoc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase-config";

export default function Goals() {
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", targetAmount: "1000", currency: "GBP", currentAmount: "0", dueDate: "", notes: "" });

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "goals"), (snap) => {
      const arr: any[] = [];
      snap.forEach((d) => arr.push({ id: d.id, ...d.data() }));
      setItems(arr);
    });
    return unsub;
  }, []);

  async function save() {
    await addDoc(collection(db, "goals"), {
      ...form,
      targetAmount: Number(form.targetAmount || 0),
      currentAmount: Number(form.currentAmount || 0),
      createdAt: Date.now(),
    });
    setOpen(false);
    setForm({ name: "", targetAmount: "1000", currency: "GBP", currentAmount: "0", dueDate: "", notes: "" });
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#0B1220", padding: 16 }}>
      <Pressable onPress={() => setOpen(true)} style={B.btn}>
        <Text style={B.txt}>Add</Text>
      </Pressable>

      <FlatList
        data={items}
        keyExtractor={(x) => x.id}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        renderItem={({ item }) => {
          const pct = item.targetAmount > 0 ? Math.min(100, Math.round((Number(item.currentAmount || 0) / Number(item.targetAmount || 1)) * 100)) : 0;
          return (
            <View style={C.card}>
              <Text style={C.title}>{item.name}</Text>
              <Text style={C.sub}>
                Target £{Number(item.targetAmount).toFixed(2)} · Due {item.dueDate || "—"}
              </Text>
              <View style={{ height: 8, backgroundColor: "#0f172a", borderRadius: 6, overflow: "hidden", marginTop: 8 }}>
                <View style={{ width: `${pct}%`, backgroundColor: "#2ECC71", height: "100%" }} />
              </View>
              <Text style={[C.title, { marginTop: 6 }]}>
                £{Number(item.currentAmount).toFixed(2)} ({pct}%)
              </Text>
            </View>
          );
        }}
      />

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, backgroundColor: "#0B1220", padding: 16, paddingTop: 50 }}>
          <Text style={{ color: "#E5E7EB", fontSize: 20, fontWeight: "800", marginBottom: 12 }}>New Goal</Text>
          <Field label="Name" value={form.name} onChange={(t) => setForm({ ...form, name: t })} />
          <Field label="Target Amount" value={form.targetAmount} onChange={(t) => setForm({ ...form, targetAmount: t })} numeric />
          <Field label="Current Amount" value={form.currentAmount} onChange={(t) => setForm({ ...form, currentAmount: t })} numeric />
          <Field label="Currency" value={form.currency} onChange={(t) => setForm({ ...form, currency: t })} />
          <Field label="Due (YYYY-MM)" value={form.dueDate} onChange={(t) => setForm({ ...form, dueDate: t })} />
          <Field label="Notes" value={form.notes} onChange={(t) => setForm({ ...form, notes: t })} />
          <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
            <Pressable onPress={() => setOpen(false)} style={[B.btn, { backgroundColor: "transparent", borderColor: "#1F2A44", borderWidth: 1 }]}>
              <Text style={B.txt}>Cancel</Text>
            </Pressable>
            <Pressable onPress={save} style={B.btn}>
              <Text style={B.txt}>Save</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Field({ label, value, onChange, numeric = false }: { label: string; value: string; onChange: (t: string) => void; numeric?: boolean }) {
  return (
    <View style={{ marginBottom: 8 }}>
      <Text style={{ color: "#A8B1C7", marginBottom: 6 }}>{label}</Text>
      <TextInput value={value} onChangeText={onChange} placeholderTextColor="#94A3B8" keyboardType={numeric ? (Platform.OS === "ios" ? "numbers-and-punctuation" : "numeric") : "default"} style={{ backgroundColor: "#0f172a", color: "#E5E7EB", borderWidth: 1, borderColor: "#1F2A44", borderRadius: 12, padding: 12 }} />
    </View>
  );
}

const C = {
  card: { backgroundColor: "#121A2B", borderColor: "#1F2A44", borderWidth: 1, borderRadius: 16, padding: 14 },
  title: { color: "#E5E7EB", fontWeight: "800" },
  sub: { color: "rgba(229,231,235,0.7)", marginTop: 4 },
} as const;

const B = {
  btn: { backgroundColor: "#2ECC71", paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, alignSelf: "flex-start" },
  txt: { color: "#0B1220", fontWeight: "800" },
} as const;
