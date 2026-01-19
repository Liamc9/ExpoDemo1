// screens/Liabilities.tsx — Light Theme + Split by Category (EUR-only)
import React, { useEffect, useMemo, useState } from "react";
import { View, Text, SectionList, Modal, TextInput, Pressable, Alert, Platform, TouchableOpacity, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { collection, addDoc, onSnapshot, updateDoc, deleteDoc, doc, query, orderBy } from "firebase/firestore";
import { db } from "../../firebase-config";

// ─── Light palette ──────────────────────────────────────────────────────────────
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
};

const shadow = Platform.select({
  ios: { shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
  android: { elevation: 3 },
});

// Categories
const LIAB_TYPES = ["mortgage", "loan", "credit", "overdraft", "tax", "other"] as const;

export default function Liabilities() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // add/edit modal
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    type: "mortgage",
    balance: "0",
    interestRate: "0",
    institution: "",
    notes: "",
  });

  // collapsed sections
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const q = query(collection(db, "liabilities"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const arr: any[] = [];
      snap.forEach((d) => arr.push({ id: d.id, ...d.data() }));
      setItems(arr);
      setLoading(false);
      setRefreshing(false);
    });
    return unsub;
  }, []);

  // EUR-only liabilities
  const eurItems = useMemo(() => items.filter((it) => (it.currency || "EUR") === "EUR"), [items]);

  // Overall total (EUR)
  const overallTotal = useMemo(() => sumBalances(eurItems), [eurItems]);

  // Build sections with per-category totals (EUR)
  const sections = useMemo(() => {
    const byType: Record<string, any[]> = {};
    for (const t of LIAB_TYPES) byType[t] = [];
    for (const it of eurItems) {
      const t = (it.type || "other").toString();
      (byType[t] || (byType[t] = [])).push(it);
    }
    return LIAB_TYPES.map((t) => {
      const data = byType[t] || [];
      return {
        title: t,
        total: sumBalances(data),
        data: collapsed[t] ? [] : data,
        count: data.length,
      };
    }).filter((s) => s.count > 0 || collapsed[s.title] === true);
  }, [eurItems, collapsed]);

  function toggleSection(title: string) {
    setCollapsed((prev) => ({ ...prev, [title]: !prev[title] }));
  }

  function openCreate() {
    setEditingId(null);
    setForm({ name: "", type: "mortgage", balance: "0", interestRate: "0", institution: "", notes: "" });
    setOpen(true);
  }

  function openEdit(row: any) {
    setEditingId(row.id);
    setForm({
      name: String(row.name || ""),
      type: String(row.type || "mortgage"),
      balance: String(row.balance ?? "0"),
      interestRate: String(row.interestRate ?? "0"),
      institution: String(row.institution || ""),
      notes: String(row.notes || ""),
    });
    setOpen(true);
  }

  async function save() {
    if (!form.name.trim()) return Alert.alert("Missing name", "Please enter a name for this liability.");
    const bal = Number(form.balance);
    if (isNaN(bal)) return Alert.alert("Invalid balance", "Balance must be a number.");
    const apr = Number(form.interestRate || 0);
    if (isNaN(apr)) return Alert.alert("Invalid rate", "Interest must be a number (e.g. 4.5).");

    try {
      if (editingId) {
        await updateDoc(doc(db, "liabilities", editingId), {
          name: form.name,
          type: form.type,
          currency: "EUR",
          balance: bal,
          interestRate: apr,
          institution: form.institution,
          notes: form.notes,
        });
      } else {
        await addDoc(collection(db, "liabilities"), {
          name: form.name,
          type: form.type,
          currency: "EUR",
          balance: bal,
          interestRate: apr,
          institution: form.institution,
          notes: form.notes,
          createdAt: Date.now(),
        });
      }
      setOpen(false);
      setEditingId(null);
      setForm({ name: "", type: "mortgage", balance: "0", interestRate: "0", institution: "", notes: "" });
    } catch (e: any) {
      Alert.alert("Save failed", e?.message || "Please try again.");
    }
  }

  async function remove(id: string) {
    Alert.alert("Delete liability?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteDoc(doc(db, "liabilities", id));
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
        <Text style={{ color: palette.text, fontSize: 28, fontWeight: "800" }}>Liabilities</Text>
        <Text style={{ color: palette.sub, marginTop: 4 }}>Euro only (€), grouped by category</Text>
      </View>

      {/* Overall total (EUR) */}
      <View style={{ paddingHorizontal: 16 }}>
        <View style={{ backgroundColor: palette.card, borderRadius: 14, borderWidth: 1, borderColor: palette.border, padding: 14, ...shadow }}>
          <Text style={{ color: palette.sub, marginBottom: 6 }}>Total owed</Text>
          <Text style={{ color: palette.text, fontSize: 26, fontWeight: "900" }}>€{formatMoney(overallTotal)}</Text>
        </View>
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
                <Text style={{ color: palette.text, fontSize: 16, fontWeight: "900" }}>{titleCase(section.title)}</Text>
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
                    <SmallChip icon="wallet-outline" label={String(item.type || "—")} />
                    {item.institution ? <SmallChip icon="business-outline" label={String(item.institution)} /> : null}
                    {item.interestRate ? <SmallChip icon="trending-up-outline" label={`${item.interestRate}% APR`} /> : null}
                  </View>
                  {item.notes ? (
                    <Text style={{ color: palette.sub, marginTop: 8 }} numberOfLines={2}>
                      {item.notes}
                    </Text>
                  ) : null}
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={{ color: palette.text, fontSize: 18, fontWeight: "900" }}>€{formatMoney(Number(item.balance || 0))}</Text>
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
              <Text style={{ color: palette.sub, marginTop: 8 }}>No liabilities yet. Tap “Add liability” to create one.</Text>
            </View>
          ) : null
        }
      />

      {/* Floating add button */}
      <TouchableOpacity
        onPress={openCreate}
        activeOpacity={0.9}
        style={{
          position: "absolute",
          right: 18,
          bottom: 24,
          backgroundColor: palette.primary,
          borderRadius: 28,
          paddingHorizontal: 18,
          paddingVertical: 12,
          flexDirection: "row",
          alignItems: "center",
          ...shadow,
        }}
      >
        <Ionicons name="add" size={18} color={palette.primaryText} />
        <Text style={{ color: palette.primaryText, fontWeight: "800", marginLeft: 6 }}>Add liability</Text>
      </TouchableOpacity>

      {/* Add/Edit Modal */}
      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, backgroundColor: palette.bg }}>
          <View style={{ paddingTop: 54, paddingHorizontal: 16, paddingBottom: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ color: palette.text, fontSize: 20, fontWeight: "900" }}>{editingId ? "Edit liability" : "New liability"}</Text>
            <TouchableOpacity onPress={() => setOpen(false)} style={{ padding: 8 }}>
              <Ionicons name="close" size={22} color={palette.text} />
            </TouchableOpacity>
          </View>

          <View style={{ padding: 16 }}>
            <Field label="Name" value={form.name} onChange={(t) => setForm({ ...form, name: t })} placeholder="e.g., BoI Mortgage, AIB Loan" />

            <Label text="Type" />
            <RowWrap>
              {LIAB_TYPES.map((t) => (
                <SelectableChip key={t} selected={form.type === t} onPress={() => setForm({ ...form, type: t })} label={titleCase(t)} />
              ))}
            </RowWrap>

            <Field label="Balance (€)" value={form.balance} onChange={(t) => setForm({ ...form, balance: t })} placeholder="0.00" numeric right={<Text style={{ color: palette.sub, fontWeight: "700" }}>EUR</Text>} />
            <Field label="Interest % (APR)" value={form.interestRate} onChange={(t) => setForm({ ...form, interestRate: t })} placeholder="e.g., 4.25" numeric />
            <Field label="Institution (optional)" value={form.institution} onChange={(t) => setForm({ ...form, institution: t })} placeholder="Bank / Lender" />
            <Field label="Notes (optional)" value={form.notes} onChange={(t) => setForm({ ...form, notes: t })} placeholder="Any notes…" multiline />

            <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
              <Button title="Cancel" onPress={() => setOpen(false)} variant="ghost" />
              <Button title={editingId ? "Save changes" : "Save liability"} onPress={save} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── UI helpers ────────────────────────────────────────────────────────────────
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

// ─── helpers ────────────────────────────────────────────────────────────────────
function formatMoney(n: number) {
  const fixed = (isFinite(n) ? n : 0).toFixed(2);
  const [i, d] = fixed.split(".");
  return i.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "." + d;
}
function sumBalances(arr: any[]) {
  return arr.reduce((acc, it) => acc + Number(it?.balance || 0), 0);
}
function titleCase(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
