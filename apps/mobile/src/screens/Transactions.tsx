// screens/Transactions.tsx
import React, { useEffect, useState } from "react";
import { View, Text, FlatList, Modal, TextInput, Pressable, Platform, Alert } from "react-native";
import { collection, addDoc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase-config";

export default function Transactions() {
  const [ym, setYm] = useState(new Date().toISOString().slice(0, 7));
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    occurredOn: new Date().toISOString().slice(0, 10),
    amount: "0",
    currency: "GBP",
    category: "General",
    payee: "",
    memo: "",
    accountId: "",
  });

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "transactions"), (snap) => {
      const arr: any[] = [];
      snap.forEach((d) => {
        const x = { id: d.id, ...d.data() } as any;
        if (String(x.occurredOn || "").startsWith(ym)) arr.push(x);
      });
      arr.sort((a, b) => String(b.occurredOn).localeCompare(String(a.occurredOn)));
      setItems(arr);
    });
    return unsub;
  }, [ym]);

  async function save() {
    if (!form.occurredOn) return Alert.alert("Date required");
    if (isNaN(Number(form.amount))) return Alert.alert("Amount must be a number");
    await addDoc(collection(db, "transactions"), { ...form, amount: Number(form.amount || 0), createdAt: Date.now() });
    setOpen(false);
    setForm({ occurredOn: new Date().toISOString().slice(0, 10), amount: "0", currency: "GBP", category: "General", payee: "", memo: "", accountId: "" });
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#0B1220", padding: 16 }}>
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
        <TextInput value={ym} onChangeText={setYm} placeholder="YYYY-MM" placeholderTextColor="#94A3B8" style={{ flex: 1, backgroundColor: "#0f172a", color: "#E5E7EB", borderWidth: 1, borderColor: "#1F2A44", borderRadius: 12, padding: 12 }} />
        <Pressable onPress={() => setOpen(true)} style={B.btn}>
          <Text style={B.txt}>Add</Text>
        </Pressable>
      </View>

      <FlatList
        data={items}
        keyExtractor={(x) => x.id}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        renderItem={({ item }) => (
          <View style={C.card}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={C.title}>{item.payee || item.category}</Text>
              <Text style={C.sub}>
                {item.occurredOn} · {item.category}
              </Text>
              {item.memo ? (
                <Text style={{ color: "rgba(229,231,235,0.7)", marginTop: 6 }} numberOfLines={2}>
                  {item.memo}
                </Text>
              ) : null}
            </View>
            <Text style={{ color: Number(item.amount) >= 0 ? "#2ECC71" : "#EF4444", fontWeight: "800" }}>£{Number(item.amount).toFixed(2)}</Text>
          </View>
        )}
      />

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, backgroundColor: "#0B1220", padding: 16, paddingTop: 50 }}>
          <Text style={{ color: "#E5E7EB", fontSize: 20, fontWeight: "800", marginBottom: 12 }}>Add Transaction</Text>
          <Field label="Date (YYYY-MM-DD)" value={form.occurredOn} onChange={(t) => setForm({ ...form, occurredOn: t })} />
          <Field label="Amount (+ income, - expense)" value={form.amount} onChange={(t) => setForm({ ...form, amount: t })} numeric />
          <Field label="Currency" value={form.currency} onChange={(t) => setForm({ ...form, currency: t })} />
          <Field label="Category" value={form.category} onChange={(t) => setForm({ ...form, category: t })} />
          <Field label="Payee" value={form.payee} onChange={(t) => setForm({ ...form, payee: t })} />
          <Field label="Memo" value={form.memo} onChange={(t) => setForm({ ...form, memo: t })} />
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
  card: {
    backgroundColor: "#121A2B",
    borderColor: "#1F2A44",
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: { color: "#E5E7EB", fontWeight: "800" },
  sub: { color: "rgba(229,231,235,0.7)", marginTop: 4 },
} as const;

const B = {
  btn: { backgroundColor: "#2ECC71", paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, alignSelf: "flex-start" },
  txt: { color: "#0B1220", fontWeight: "800" },
} as const;
