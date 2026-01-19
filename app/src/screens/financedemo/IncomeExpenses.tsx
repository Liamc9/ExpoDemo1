// screens/IncomeExpenses.tsx — Monthly Income & Expenses (EUR-only)
import React, { useEffect, useMemo, useState } from "react";
import { View, Text, SectionList, Modal, TextInput, Pressable, Alert, Platform, TouchableOpacity, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { collection, addDoc, onSnapshot, updateDoc, deleteDoc, doc, query, orderBy } from "firebase/firestore";
import { db } from "../../firebase-config";

// ─── Light palette (same vibe as your other screens) ────────────────────────────
const palette = {
  bg: "#F7F8FA",
  card: "#FFFFFF",
  text: "#0F172A",
  sub: "#64748B",
  primary: "#2563EB",
  primaryText: "#FFFFFF",
  border: "#E5E7EB",
  chipBg: "#F1F5F9",
  chipText: "#334155",
  danger: "#EF4444",
  good: "#16A34A",
};

const shadow = Platform.select({
  ios: { shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
  android: { elevation: 3 },
});

const TYPES = ["income", "expense"] as const;

export default function IncomeExpenses() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // add/edit modal
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    type: "income",
    name: "",
    amount: "0",
    dayOfMonth: "",
    category: "",
    notes: "",
  });

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Store in one collection: "budgetItems"
    const q = query(collection(db, "budgetItems"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const arr: any[] = [];
      snap.forEach((d) => arr.push({ id: d.id, ...d.data() }));
      // Keep EUR-only if older items had other currencies
      setItems(arr.filter((x) => (x.currency || "EUR") === "EUR"));
      setLoading(false);
      setRefreshing(false);
    });
    return unsub;
  }, []);

  const monthLabel = new Date().toISOString().slice(0, 7); // YYYY-MM (display only)

  // Totals
  const totalIncome = useMemo(() => sumByType(items, "income"), [items]);
  const totalExpense = useMemo(() => sumByType(items, "expense"), [items]);
  const net = useMemo(() => totalIncome - totalExpense, [totalIncome, totalExpense]);

  // Sections: Income / Expenses
  const sections = useMemo(() => {
    const income = items.filter((x) => x.type === "income").sort(sortByDayThenName);
    const expense = items.filter((x) => x.type === "expense").sort(sortByDayThenName);
    return [
      {
        title: "Income",
        total: totalIncome,
        data: collapsed["Income"] ? [] : income,
        count: income.length,
      },
      {
        title: "Expenses",
        total: totalExpense,
        data: collapsed["Expenses"] ? [] : expense,
        count: expense.length,
      },
    ];
  }, [items, collapsed, totalIncome, totalExpense]);

  function toggleSection(title: string) {
    setCollapsed((p) => ({ ...p, [title]: !p[title] }));
  }

  function openCreate(which: "income" | "expense") {
    setEditingId(null);
    setForm({ type: which, name: "", amount: "0", dayOfMonth: "", category: "", notes: "" });
    setOpen(true);
  }

  function openEdit(row: any) {
    setEditingId(row.id);
    setForm({
      type: String(row.type || "income"),
      name: String(row.name || ""),
      amount: String(row.amount ?? "0"),
      dayOfMonth: String(row.dayOfMonth ?? ""),
      category: String(row.category || ""),
      notes: String(row.notes || ""),
    });
    setOpen(true);
  }

  async function save() {
    if (!form.name.trim()) return Alert.alert("Missing name", "Please enter a name.");
    const amt = Number(form.amount);
    if (isNaN(amt)) return Alert.alert("Invalid amount", "Amount must be a number.");
    const day = form.dayOfMonth ? Number(form.dayOfMonth) : null;
    if (day !== null && (isNaN(day) || day < 1 || day > 31)) return Alert.alert("Invalid day", "Use a day of month 1–31 or leave blank.");

    const payload = {
      type: form.type, // "income" | "expense"
      name: form.name,
      amount: amt, // monthly amount in EUR
      dayOfMonth: day,
      category: form.category,
      notes: form.notes,
      currency: "EUR",
    };

    try {
      if (editingId) {
        await updateDoc(doc(db, "budgetItems", editingId), payload);
      } else {
        await addDoc(collection(db, "budgetItems"), { ...payload, createdAt: Date.now() });
      }
      setOpen(false);
      setEditingId(null);
      setForm({ type: "income", name: "", amount: "0", dayOfMonth: "", category: "", notes: "" });
    } catch (e: any) {
      Alert.alert("Save failed", e?.message || "Please try again.");
    }
  }

  async function remove(id: string) {
    Alert.alert("Delete item?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteDoc(doc(db, "budgetItems", id));
          } catch (e: any) {
            Alert.alert("Delete failed", e?.message || "Please try again.");
          }
        },
      },
    ]);
  }

  return (
    <View style={{ flex: 1, backgroundColor: palette.bg }}>
      {/* Header */}
      <View style={{ paddingTop: 54, paddingHorizontal: 16, paddingBottom: 12 }}>
        <Text style={{ color: palette.text, fontSize: 28, fontWeight: "800" }}>Income & Expenses</Text>
        <Text style={{ color: palette.sub, marginTop: 4 }}>{monthLabel} · monthly plan (EUR)</Text>
      </View>

      {/* Totals card */}
      <View style={{ paddingHorizontal: 16 }}>
        <View style={{ backgroundColor: palette.card, borderRadius: 14, borderWidth: 1, borderColor: palette.border, padding: 14, ...shadow }}>
          <Row label="Income" value={totalIncome} color={palette.good} />
          <Row label="Expenses" value={totalExpense} color={palette.danger} />
          <Divider />
          <Row label="Net" value={net} color={net >= 0 ? palette.good : palette.danger} large />
        </View>
      </View>

      {/* Quick actions */}
      <View style={{ flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingTop: 12 }}>
        <QuickButton icon="add-circle-outline" title="Add income" onPress={() => openCreate("income")} />
        <QuickButton icon="remove-circle-outline" title="Add expense" onPress={() => openCreate("expense")} />
      </View>

      {/* Sectioned list */}
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled
        contentContainerStyle={{ padding: 16, paddingBottom: 120, paddingTop: 8 }}
        refreshControl={<RefreshControl refreshing={refreshing && !loading} onRefresh={() => setRefreshing(true)} tintColor={palette.primary} />}
        renderSectionHeader={({ section }) => (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => toggleSection(section.title)}
            style={{
              backgroundColor: palette.card,
              borderWidth: 1,
              borderColor: palette.border,
              borderRadius: 12,
              padding: 12,
              marginTop: 12,
              ...shadow,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={{ color: palette.text, fontSize: 16, fontWeight: "900" }}>{section.title}</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 6 }}>
                  <SmallChip icon="layers-outline" label={`${section.count} item${section.count === 1 ? "" : "s"}`} />
                </View>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ color: palette.text, fontWeight: "900" }}>€{formatMoney(section.total)}</Text>
                <Ionicons name={collapsed[section.title] ? "chevron-down" : "chevron-up"} size={18} color={palette.sub} style={{ marginTop: 6 }} />
              </View>
            </View>
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => openEdit(item)} activeOpacity={0.8}>
            <View style={{ backgroundColor: palette.card, borderRadius: 16, borderWidth: 1, borderColor: palette.border, padding: 14, marginTop: 8, ...shadow }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={{ color: palette.text, fontSize: 16, fontWeight: "800" }}>{item.name}</Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 6 }}>
                    {item.category ? <SmallChip icon="pricetags-outline" label={String(item.category)} /> : null}
                    {item.dayOfMonth ? <SmallChip icon="calendar-outline" label={`Day ${item.dayOfMonth}`} /> : null}
                  </View>
                  {item.notes ? (
                    <Text style={{ color: palette.sub, marginTop: 8 }} numberOfLines={2}>
                      {item.notes}
                    </Text>
                  ) : null}
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={{ color: item.type === "income" ? palette.good : palette.text, fontSize: 18, fontWeight: "900" }}>
                    {item.type === "income" ? "+" : "−"}€{formatMoney(Math.abs(Number(item.amount || 0)))}
                  </Text>
                  <Pressable onPress={() => remove(item.id)} style={{ padding: 6, marginTop: 6 }}>
                    <Ionicons name="trash-outline" size={18} color={palette.danger} />
                  </Pressable>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          !loading ? (
            <View style={{ padding: 16, alignItems: "center" }}>
              <Text style={{ color: palette.sub, marginTop: 8 }}>No items yet. Use the buttons above to add income or expense.</Text>
            </View>
          ) : null
        }
      />

      {/* Add/Edit Modal */}
      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, backgroundColor: palette.bg }}>
          <View style={{ paddingTop: 54, paddingHorizontal: 16, paddingBottom: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ color: palette.text, fontSize: 20, fontWeight: "900" }}>{editingId ? "Edit item" : "New item"}</Text>
            <TouchableOpacity onPress={() => setOpen(false)} style={{ padding: 8 }}>
              <Ionicons name="close" size={22} color={palette.text} />
            </TouchableOpacity>
          </View>

          <View style={{ padding: 16 }}>
            {/* Type selector */}
            <Label text="Type" />
            <RowWrap>
              {TYPES.map((t) => (
                <SelectableChip key={t} selected={form.type === t} onPress={() => setForm({ ...form, type: t })} label={t === "income" ? "Income" : "Expense"} />
              ))}
            </RowWrap>

            <Field label="Name" value={form.name} onChange={(t) => setForm({ ...form, name: t })} placeholder={form.type === "income" ? "e.g., Salary, Rent" : "e.g., Mortgage, Utilities"} />

            <Field label={`Amount (€ / month)`} value={form.amount} onChange={(t) => setForm({ ...form, amount: t })} placeholder="0.00" numeric right={<Text style={{ color: palette.sub, fontWeight: "700" }}>EUR</Text>} />

            <Field label="Day of month (optional)" value={form.dayOfMonth} onChange={(t) => setForm({ ...form, dayOfMonth: t })} placeholder="1–31" numeric />

            <Field label="Category (optional)" value={form.category} onChange={(t) => setForm({ ...form, category: t })} placeholder="e.g., Housing, Food, Transport" />

            <Field label="Notes (optional)" value={form.notes} onChange={(t) => setForm({ ...form, notes: t })} placeholder="Any notes…" multiline />

            <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
              <Button title="Cancel" onPress={() => setOpen(false)} variant="ghost" />
              <Button title={editingId ? "Save changes" : "Save item"} onPress={save} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Floating add buttons */}
      <FloatingAdd onPressIncome={() => openCreate("income")} onPressExpense={() => openCreate("expense")} />
    </View>
  );
}

// ─── UI pieces (inline, no external deps) ───────────────────────────────────────
function Row({ label, value, color, large = false }: { label: string; value: number; color?: string; large?: boolean }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 }}>
      <Text style={{ color: palette.sub }}>{label}</Text>
      <Text style={{ color: color || palette.text, fontWeight: "900", fontSize: large ? 22 : 16 }}>€{formatMoney(Math.abs(value || 0))}</Text>
    </View>
  );
}
function Divider() {
  return <View style={{ height: 1, backgroundColor: palette.border, marginVertical: 6 }} />;
}
function QuickButton({ icon, title, onPress }: { icon: any; title: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        backgroundColor: palette.card,
        borderWidth: 1,
        borderColor: palette.border,
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 12,
        alignItems: "center",
        flexDirection: "row",
        justifyContent: "center",
        gap: 6,
        opacity: pressed ? 0.95 : 1,
        ...shadow,
      })}
    >
      <Ionicons name={icon} size={18} color={palette.primary} />
      <Text style={{ color: palette.text, fontWeight: "800" }}>{title}</Text>
    </Pressable>
  );
}
function FloatingAdd({ onPressIncome, onPressExpense }: { onPressIncome: () => void; onPressExpense: () => void }) {
  return (
    <View style={{ position: "absolute", right: 18, bottom: 24, flexDirection: "row", gap: 10 }}>
      <TouchableOpacity onPress={onPressExpense} activeOpacity={0.9} style={{ backgroundColor: palette.card, borderWidth: 1, borderColor: palette.border, borderRadius: 28, paddingHorizontal: 14, paddingVertical: 10, flexDirection: "row", alignItems: "center", ...shadow }}>
        <Ionicons name="remove" size={18} color={palette.danger} />
        <Text style={{ color: palette.text, fontWeight: "800", marginLeft: 6 }}>Expense</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onPressIncome} activeOpacity={0.9} style={{ backgroundColor: palette.primary, borderRadius: 28, paddingHorizontal: 14, paddingVertical: 10, flexDirection: "row", alignItems: "center", ...shadow }}>
        <Ionicons name="add" size={18} color={palette.primaryText} />
        <Text style={{ color: palette.primaryText, fontWeight: "800", marginLeft: 6 }}>Income</Text>
      </TouchableOpacity>
    </View>
  );
}
function Button({ title, onPress, variant = "primary" }: { title: string; onPress: () => void; variant?: "primary" | "ghost" }) {
  const primary = variant === "primary";
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: primary ? palette.primary : "transparent",
        borderWidth: primary ? 0 : 1,
        borderColor: palette.border,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        opacity: pressed ? 0.9 : 1,
      })}
    >
      <Text style={{ color: primary ? palette.primaryText : palette.text, fontWeight: "800" }}>{title}</Text>
    </Pressable>
  );
}
function Field({ label, value, onChange, placeholder, numeric = false, multiline = false, right }: { label: string; value: string; onChange: (t: string) => void; placeholder?: string; numeric?: boolean; multiline?: boolean; right?: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Label text={label} />
      <View
        style={{
          backgroundColor: palette.card,
          borderWidth: 1,
          borderColor: palette.border,
          borderRadius: 12,
          paddingHorizontal: 12,
          paddingVertical: multiline ? 10 : 6,
          flexDirection: "row",
          alignItems: multiline ? "flex-start" : "center",
          ...shadow,
        }}
      >
        <TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={palette.sub} keyboardType={numeric ? (Platform.OS === "ios" ? "numbers-and-punctuation" : "numeric") : "default"} style={{ flex: 1, color: palette.text, paddingVertical: 8 }} multiline={multiline} />
        {right ? <View style={{ marginLeft: 8 }}>{right}</View> : null}
      </View>
    </View>
  );
}
function Label({ text }: { text: string }) {
  return <Text style={{ color: palette.sub, marginBottom: 6, fontWeight: "600" }}>{text}</Text>;
}
function RowWrap({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>{children}</View>;
}
function SelectableChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: selected ? palette.primary : palette.chipBg,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 999,
        borderWidth: selected ? 0 : 1,
        borderColor: palette.border,
        opacity: pressed ? 0.95 : 1,
      })}
    >
      <Text style={{ color: selected ? palette.primaryText : palette.chipText, fontWeight: "700" }}>{label}</Text>
    </Pressable>
  );
}
function SmallChip({ icon, label }: { icon: any; label: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: palette.chipBg, borderWidth: 1, borderColor: palette.border, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999, marginRight: 8, marginBottom: 8 }}>
      <Ionicons name={icon} size={14} color={palette.chipText} style={{ marginRight: 6 }} />
      <Text style={{ color: palette.chipText, fontWeight: "700" }}>{label}</Text>
    </View>
  );
}

// ─── helpers ───────────────────────────────────────────────────────────────────
function sumByType(arr: any[], type: "income" | "expense") {
  return arr.filter((x) => x.type === type).reduce((acc, it) => acc + Number(it?.amount || 0), 0);
}
function sortByDayThenName(a: any, b: any) {
  const ad = Number(a.dayOfMonth || 99);
  const bd = Number(b.dayOfMonth || 99);
  if (ad !== bd) return ad - bd;
  return String(a.name || "").localeCompare(String(b.name || ""));
}
function formatMoney(n: number) {
  const fixed = (isFinite(n) ? n : 0).toFixed(2);
  const [i, d] = fixed.split(".");
  return i.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "." + d;
}
