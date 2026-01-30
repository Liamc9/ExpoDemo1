// screens/WordleScreen.tsx
import React, { useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet, Dimensions, Alert } from "react-native";

const { width: W } = Dimensions.get("window");

// ---- Brand-ish palette (Basil green accent)
const COLORS = {
  bg: "#0B1220",
  grid: "#1A2438",
  text: "#E5E7EB",
  sub: "rgba(229,231,235,0.7)",
  correct: "#2ecc71", // green
  present: "#DBA644", // amber
  absent: "#374151", // gray
  key: "#121a2b",
  keyText: "#E5E7EB",
  keyBorder: "#2a3552",
  overlay: "rgba(0,0,0,0.5)",
  card: "#121a2b",
};

// A tiny word list (answer bank). Add more 5-letter words as you like.
const ANSWERS = ["APPLE", "BRAIN", "CRANE", "DELTA", "EAGER", "FAITH", "GRASS", "HOUSE", "INPUT", "JELLY", "KNIFE", "LEMON", "MOTEL", "NURSE", "OPERA", "PIZZA", "QUART", "RIVER", "SUGAR", "TRUCK", "ULTRA", "VIVID", "WATER", "XENON", "YEAST", "ZEBRA", "ALERT", "BASIL", "CANDY", "DODGE", "EPOCH", "FROST", "GLASS", "HONEY", "IRONY", "JOKER", "KOALA", "LASER", "MANGO", "NOBLE", "OCEAN", "PASTA", "QUIET", "ROBIN", "SALAD", "TIGER", "UNCLE", "VINYL", "WEDGE", "YOUNG"];

// Keyboard layout
const ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "⌫"],
];

type CellState = "empty" | "pending" | "correct" | "present" | "absent";
type KBState = Record<string, "correct" | "present" | "absent" | undefined>;

const WORD_LEN = 5;
const MAX_TRIES = 6;

// Deterministic "word of the day" by local date
function pickWordOfDay(seedDate = new Date()): string {
  const dayStr = seedDate.toISOString().slice(0, 10); // YYYY-MM-DD
  let hash = 0;
  for (let i = 0; i < dayStr.length; i++) {
    hash = (hash * 31 + dayStr.charCodeAt(i)) >>> 0;
  }
  return ANSWERS[hash % ANSWERS.length];
}

// Proper duplicate-aware evaluation
function evaluateGuess(guess: string, answer: string): CellState[] {
  const res: CellState[] = Array(WORD_LEN).fill("absent");
  const a = answer.split("");
  const g = guess.split("");

  // Count letters in answer
  const counts: Record<string, number> = {};
  for (const ch of a) counts[ch] = (counts[ch] ?? 0) + 1;

  // First pass: correct
  for (let i = 0; i < WORD_LEN; i++) {
    if (g[i] === a[i]) {
      res[i] = "correct";
      counts[g[i]] -= 1;
    }
  }
  // Second pass: present
  for (let i = 0; i < WORD_LEN; i++) {
    if (res[i] === "correct") continue;
    const ch = g[i];
    if (counts[ch] > 0) {
      res[i] = "present";
      counts[ch] -= 1;
    } else {
      res[i] = "absent";
    }
  }
  return res;
}

export default function WordleScreen() {
  const answer = useMemo(() => pickWordOfDay(), []);
  const [grid, setGrid] = useState<string[][]>(Array.from({ length: MAX_TRIES }, () => Array(WORD_LEN).fill("")));
  const [states, setStates] = useState<CellState[][]>(Array.from({ length: MAX_TRIES }, () => Array(WORD_LEN).fill("empty")));
  const [row, setRow] = useState(0);
  const [col, setCol] = useState(0);
  const [won, setWon] = useState(false);
  const [lost, setLost] = useState(false);
  const [kb, setKb] = useState<KBState>({});

  const currentWord = grid[row]?.join("") ?? "";

  const onKey = (key: string) => {
    if (won || lost) return;

    if (key === "ENTER") {
      if (col < WORD_LEN) return; // incomplete
      submit();
      return;
    }
    if (key === "⌫") {
      if (col > 0) {
        const next = grid.map((r) => [...r]);
        next[row][col - 1] = "";
        setGrid(next);
        setCol(col - 1);
      }
      return;
    }
    if (/^[A-Z]$/.test(key) && col < WORD_LEN) {
      const next = grid.map((r) => [...r]);
      next[row][col] = key;
      setGrid(next);
      setCol(col + 1);
      return;
    }
  };

  const submit = () => {
    const guess = currentWord;
    if (guess.length !== WORD_LEN) return;

    // (Optional) validate guess in dictionary. For simplicity we accept any 5 letters.
    const result = evaluateGuess(guess, answer);

    // Update cell states
    const nextStates = states.map((r) => [...r]);
    nextStates[row] = result;
    setStates(nextStates);

    // Update keyboard colors (only promote to stronger states)
    const kbNext: KBState = { ...kb };
    for (let i = 0; i < WORD_LEN; i++) {
      const ch = guess[i];
      const st = result[i];
      const cur = kbNext[ch];
      const rank = { absent: 0, present: 1, correct: 2 } as const;
      const newRank = st === "correct" ? 2 : st === "present" ? 1 : 0;
      const curRank = cur ? rank[cur] : -1;
      if (newRank > curRank) {
        if (st !== "empty" && st !== "pending") {
          kbNext[ch] = st as any;
        }
      }
    }
    setKb(kbNext);

    if (guess === answer) {
      setWon(true);
      return;
    }
    if (row === MAX_TRIES - 1) {
      setLost(true);
      return;
    }
    setRow(row + 1);
    setCol(0);
  };

  const reset = () => {
    // New round with the same daily answer (or change pickWordOfDay() to Date.now() for random)
    setGrid(Array.from({ length: MAX_TRIES }, () => Array(WORD_LEN).fill("")));
    setStates(Array.from({ length: MAX_TRIES }, () => Array(WORD_LEN).fill("empty")));
    setRow(0);
    setCol(0);
    setWon(false);
    setLost(false);
    setKb({});
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Wordle (Daily)</Text>

      {/* Grid */}
      <View style={styles.grid}>
        {grid.map((r, rIdx) => (
          <View key={rIdx} style={styles.row}>
            {r.map((ch, cIdx) => {
              const st = rIdx < row ? states[rIdx][cIdx] : rIdx === row && cIdx < col ? "pending" : "empty";
              return <Cell key={`${rIdx}-${cIdx}`} char={ch} state={st} />;
            })}
          </View>
        ))}
      </View>

      {/* Keyboard */}
      <View style={{ height: 16 }} />
      {ROWS.map((r, i) => (
        <View key={i} style={styles.kbRow}>
          {r.map((k) => (
            <Key key={k} label={k} state={kb[k]} onPress={() => onKey(k)} flex={k === "ENTER" || k === "⌫" ? 1.5 : 1} />
          ))}
        </View>
      ))}

      {/* Overlays */}
      {(won || lost) && (
        <View style={styles.overlay}>
          <View style={styles.card}>
            <Text style={styles.resultTitle}>{won ? "You Win!" : "Out of tries"}</Text>
            <Text style={styles.resultSub}>{won ? "Nice one 🎉" : `Answer: ${answer}`}</Text>
            <Pressable onPress={reset} style={styles.cta}>
              <Text style={styles.ctaText}>Play Again</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

// ---- UI bits
function Cell({ char, state }: { char: string; state: CellState }) {
  const bg = state === "correct" ? COLORS.correct : state === "present" ? COLORS.present : state === "absent" ? COLORS.absent : COLORS.grid;

  const borderColor = state === "empty" ? COLORS.keyBorder : "transparent";

  return (
    <View style={[styles.cell, { backgroundColor: bg, borderColor }]}>
      <Text style={styles.cellText}>{char}</Text>
    </View>
  );
}

function Key({ label, onPress, state, flex = 1 }: { label: string; onPress: () => void; state?: "correct" | "present" | "absent"; flex?: number }) {
  const bg = state === "correct" ? COLORS.correct : state === "present" ? COLORS.present : state === "absent" ? COLORS.absent : COLORS.key;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.key, { backgroundColor: bg, flex }, pressed && { opacity: 0.85 }]}>
      <Text style={styles.keyText}>{label}</Text>
    </Pressable>
  );
}

const CELL = Math.min(56, Math.floor((W - 40 - 4 * 6) / 5)); // responsive-ish

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, paddingTop: 24, paddingHorizontal: 16 },
  title: { color: COLORS.text, fontSize: 22, fontWeight: "800", textAlign: "center", marginBottom: 12 },
  grid: { alignSelf: "center", marginTop: 8 },
  row: { flexDirection: "row", gap: 6, marginBottom: 6 },
  cell: {
    width: CELL,
    height: CELL,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    borderWidth: 1,
  },
  cellText: { color: COLORS.text, fontSize: 22, fontWeight: "800" },
  kbRow: { flexDirection: "row", gap: 6, marginBottom: 8, paddingHorizontal: 6 },
  key: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.keyBorder,
  },
  keyText: { color: COLORS.keyText, fontWeight: "700" },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.overlay,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  card: { backgroundColor: COLORS.card, padding: 18, borderRadius: 18, width: "100%", maxWidth: 360, alignItems: "center" },
  resultTitle: { color: COLORS.text, fontWeight: "800", fontSize: 22, marginBottom: 8 },
  resultSub: { color: COLORS.sub, marginBottom: 16 },
  cta: { backgroundColor: COLORS.correct, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12 },
  ctaText: { color: "white", fontWeight: "800" },
});
// ---- END ----
