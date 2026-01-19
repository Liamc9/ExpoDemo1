// screens/Overview.tsx — Friendly Dashboard with Planned vs Actual (EUR-only)
import React, { useEffect, useMemo, useState } from "react";
import { View, Text, ActivityIndicator, ScrollView } from "react-native";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase-config";

const palette = {
  bg: "#F7F8FA",
  card: "#FFFFFF",
  text: "#0F172A",
  sub: "#64748B",
  primary: "#2563EB",
  border: "#E5E7EB",
  chipBg: "#F1F5F9",
  chipText: "#334155",
  good: "#16A34A",
  bad: "#EF4444",
};

export default function Overview() {
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState<any[]>([]);
  const [liabs, setLiabs] = useState<any[]>([]);
  const [txns, setTxns] = useState<any[]>([]);
  const [budget, setBudget] = useState<any[]>([]);
  const month = new Date().toISOString().slice(0, 7); // YYYY-MM

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [aSnap, lSnap, tSnap, bSnap] = await Promise.all([getDocs(collection(db, "assets")), getDocs(collection(db, "liabilities")), getDocs(collection(db, "transactions")), getDocs(collection(db, "budgetItems"))]);

      const a = aSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })).filter((x) => (x.currency || "EUR") === "EUR");
      const l = lSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })).filter((x) => (x.currency || "EUR") === "EUR");
      const t = tSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })).filter((x) => String(x.occurredOn || "").length >= 7 && (x.currency || "EUR") === "EUR");

      const b = bSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })).filter((x) => (x.currency || "EUR") === "EUR");

      setAssets(a);
      setLiabs(l);
      setTxns(t);
      setBudget(b);
      setLoading(false);
    })();
  }, []);

  // Net worth
  const totalAssets = useMemo(() => sumBalances(assets), [assets]);
  const totalLiabs = useMemo(() => sumBalances(liabs), [liabs]);
  const netWorth = useMemo(() => totalAssets - totalLiabs, [totalAssets, totalLiabs]);

  // Actuals (this month, EUR)
  const monthTxns = useMemo(() => txns.filter((t) => String(t.occurredOn).startsWith(month)), [txns, month]);
  const actualIncome = useMemo(() => monthTxns.reduce((s, x) => s + Math.max(0, Number(x.amount || 0)), 0), [monthTxns]);
  const actualExpense = useMemo(() => monthTxns.reduce((s, x) => s + Math.max(0, -Number(x.amount || 0)), 0), [monthTxns]);
  const actualNet = useMemo(() => actualIncome - actualExpense, [actualIncome, actualExpense]);

  // Planned (from budgetItems, EUR)
  const plannedIncome = useMemo(() => sumByType(budget, "income"), [budget]);
  const plannedExpense = useMemo(() => sumByType(budget, "expense"), [budget]);
  const plannedNet = useMemo(() => plannedIncome - plannedExpense, [plannedIncome, plannedExpense]);

  // Progress vs plan
  const incomePct = pct(actualIncome, plannedIncome);
  const expensePct = pct(actualExpense, plannedExpense);

  // Category variance (planned expenses per category vs actual expenses per category for the month)
  const expenseVar = useMemo(() => {
    const plannedMap = new Map<string, number>();
    for (const b of budget) {
      if (b.type === "expense") {
        const k = (b.category || "Other").toString();
        plannedMap.set(k, (plannedMap.get(k) || 0) + Number(b.amount || 0));
      }
    }
    const actualMap = new Map<string, number>();
    for (const t of monthTxns) {
      const amt = Number(t.amount || 0);
      if (amt < 0) {
        const k = (t.category || "Other").toString();
        actualMap.set(k, (actualMap.get(k) || 0) + Math.abs(amt));
      }
    }
    const cats = new Set<string>([...plannedMap.keys(), ...actualMap.keys()]);
    const rows = [...cats].map((c) => {
      const p = plannedMap.get(c) || 0;
      const a = actualMap.get(c) || 0;
      return { category: c, planned: p, actual: a, variance: a - p }; // positive = overspend
    });
    // Sort by absolute variance desc
    rows.sort((x, y) => Math.abs(y.variance) - Math.abs(x.variance));
    return rows.slice(0, 6);
  }, [budget, monthTxns]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: palette.bg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  const greeting = getGreeting();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: palette.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      {/* Greeting */}
      <Text style={{ color: palette.text, fontSize: 26, fontWeight: "900" }}>{greeting}</Text>
      <Text style={{ color: palette.sub, marginTop: 6 }}>Here’s your snapshot for {month}.</Text>

      {/* Net worth */}
      <Card title="Net worth">
        <BigNumber label="Total" value={netWorth} />
        <Row label="Assets" value={totalAssets} />
        <Row label="Liabilities" value={totalLiabs} negative />
        <Progress label="Funding level" numerator={totalAssets} denominator={Math.max(totalLiabs, 1)} helper="Assets vs. Liabilities" />
      </Card>

      {/* Planned vs Actual (month) */}
      <Card title="This month · Planned vs Actual">
        <Row2 leftLabel="Planned income" leftValue={plannedIncome} rightLabel="Actual income" rightValue={actualIncome} />
        <Bar label="Income progress" pct={incomePct} good />
        <Spacer8 />
        <Row2 leftLabel="Planned expenses" leftValue={plannedExpense} rightLabel="Actual expenses" rightValue={actualExpense} negativeRight />
        <Bar label="Expense usage" pct={expensePct} />
        <Divider />
        <Row label="Planned net" value={plannedNet} />
        <Row label="Actual net" value={actualNet} color={actualNet >= 0 ? palette.good : palette.bad} />
        <Row label="Net variance" value={actualNet - plannedNet} color={actualNet - plannedNet >= 0 ? palette.good : palette.bad} />
      </Card>

      {/* Category variances */}
      <Card title="Top category variances (expenses)">
        {expenseVar.length === 0 ? (
          <Text style={{ color: palette.sub }}>No categories yet.</Text>
        ) : (
          expenseVar.map((r) => (
            <View key={r.category} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 }}>
              <Text style={{ color: palette.text }}>{r.category}</Text>
              <Text style={{ color: r.variance > 0 ? palette.bad : palette.good, fontWeight: "900" }}>
                {r.variance > 0 ? "Overspend" : "Underspend"} €{formatMoney(Math.abs(r.variance))}
              </Text>
            </View>
          ))
        )}
      </Card>

      {/* Recent activity */}
      <Card title="Recent activity">
        {monthTxns
          .slice()
          .sort((a, b) => String(b.occurredOn).localeCompare(String(a.occurredOn)))
          .slice(0, 6)
          .map((x) => (
            <View key={x.id} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 }}>
              <Text style={{ color: palette.text }}>
                {x.occurredOn} · {x.payee || x.category || "—"}
              </Text>
              <Text style={{ color: Number(x.amount) >= 0 ? palette.good : palette.bad, fontWeight: "800" }}>
                {Number(x.amount) >= 0 ? "+" : "−"}€{formatMoney(Math.abs(Number(x.amount) || 0))}
              </Text>
            </View>
          ))}
        {monthTxns.length === 0 ? <Text style={{ color: palette.sub }}>No transactions this month.</Text> : null}
      </Card>
    </ScrollView>
  );
}

/* ───────────── UI bits ───────────── */
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ backgroundColor: palette.card, borderWidth: 1, borderColor: palette.border, borderRadius: 16, padding: 14, marginTop: 14 }}>
      <Text style={{ color: palette.text, fontWeight: "900", fontSize: 16, marginBottom: 8 }}>{title}</Text>
      {children}
    </View>
  );
}
function Row({ label, value, positive = false, negative = false, color }: { label: string; value: number; positive?: boolean; negative?: boolean; color?: string }) {
  const c = color || (positive ? palette.good : negative ? palette.bad : palette.text);
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 }}>
      <Text style={{ color: palette.sub }}>{label}</Text>
      <Text style={{ color: c, fontWeight: "900" }}>€{formatMoney(Math.abs(value || 0))}</Text>
    </View>
  );
}
function BigNumber({ label, value }: { label: string; value: number }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 6 }}>
      <Text style={{ color: palette.sub }}>{label}</Text>
      <Text style={{ color: palette.text, fontWeight: "900", fontSize: 28 }}>€{formatMoney(value || 0)}</Text>
    </View>
  );
}
function Progress({ label, numerator, denominator, helper }: { label: string; numerator: number; denominator: number; helper?: string }) {
  const ratio = Math.max(0, Math.min(1, numerator / (numerator + denominator)));
  return (
    <View style={{ marginTop: 8 }}>
      <Text style={{ color: palette.sub, marginBottom: 6 }}>
        {label}
        {helper ? ` — ${helper}` : ""}
      </Text>
      <View style={{ height: 10, backgroundColor: "#EEF2F7", borderRadius: 6, overflow: "hidden" }}>
        <View style={{ width: `${Math.round(ratio * 100)}%`, height: "100%", backgroundColor: palette.primary }} />
      </View>
      <Text style={{ color: palette.sub, marginTop: 6 }}>{Math.round(ratio * 100)}%</Text>
    </View>
  );
}
function Row2({ leftLabel, leftValue, rightLabel, rightValue, negativeRight = false }: { leftLabel: string; leftValue: number; rightLabel: string; rightValue: number; negativeRight?: boolean }) {
  return (
    <View style={{ flexDirection: "row", gap: 12 }}>
      <View style={{ flex: 1 }}>
        <Row label={leftLabel} value={leftValue} />
      </View>
      <View style={{ flex: 1 }}>
        <Row label={rightLabel} value={rightValue} negative={negativeRight} />
      </View>
    </View>
  );
}
function Bar({ label, pct, good = false }: { label: string; pct: number; good?: boolean }) {
  const clamp = Math.max(0, Math.min(1, isFinite(pct) ? pct : 0));
  const color = good ? palette.good : palette.primary;
  return (
    <View style={{ marginTop: 6 }}>
      <Text style={{ color: palette.sub, marginBottom: 6 }}>
        {label} — {Math.round(clamp * 100)}%
      </Text>
      <View style={{ height: 10, backgroundColor: "#EEF2F7", borderRadius: 6, overflow: "hidden" }}>
        <View style={{ width: `${Math.round(clamp * 100)}%`, height: "100%", backgroundColor: color }} />
      </View>
    </View>
  );
}
function Divider() {
  return <View style={{ height: 1, backgroundColor: palette.border, marginVertical: 8 }} />;
}
function Spacer8() {
  return <View style={{ height: 8 }} />;
}

/* ───────────── helpers ───────────── */
function sumBalances(arr: any[]) {
  return arr.reduce((acc, it) => acc + Number(it?.balance || 0), 0);
}
function sumByType(arr: any[], type: "income" | "expense") {
  return arr.filter((x) => x.type === type).reduce((acc, it) => acc + Number(it?.amount || 0), 0);
}
function pct(actual: number, planned: number) {
  if (!isFinite(planned) || planned <= 0) return actual > 0 ? 1 : 0;
  return actual / planned;
}
function formatMoney(n: number) {
  const fixed = (isFinite(n) ? n : 0).toFixed(2);
  const [i, d] = fixed.split(".");
  return i.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "." + d;
}
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning 👋";
  if (h < 18) return "Good afternoon 👋";
  return "Good evening 👋";
}
