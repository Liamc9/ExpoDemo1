// screens/WaterSortScreen.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet, Dimensions, LayoutChangeEvent } from "react-native";

type ColorKey = "red" | "orange" | "yellow" | "green" | "teal" | "blue" | "indigo" | "purple" | "pink" | "brown" | "grey" | "lime" | "cyan" | "magenta" | "gold";

type Tube = ColorKey[]; // bottom -> top (last is the top color)
type Move = { from: number; to: number; amount: number };
type GameState = ColorKey[][];

const { width: W, height: H } = Dimensions.get("window");

// Visual palette
const INK: Record<ColorKey, string> = {
  red: "#ef4444",
  orange: "#fb923c",
  yellow: "#facc15",
  green: "#22c55e",
  teal: "#14b8a6",
  blue: "#3b82f6",
  indigo: "#6366f1",
  purple: "#a855f7",
  pink: "#ec4899",
  brown: "#a16207",
  grey: "#9ca3af",
  lime: "#84cc16",
  cyan: "#06b6d4",
  magenta: "#d946ef",
  gold: "#f59e0b",
};

const CAPACITY = 4;

// --- helpers
function clone(state: GameState): GameState {
  return state.map((t) => [...t]);
}

// can we pour from i -> j ? returns amount we can pour (0 means no)
function pourAmount(state: GameState, i: number, j: number): number {
  if (i === j) return 0;
  const src = state[i],
    dst = state[j];
  if (src.length === 0) return 0;
  if (dst.length === CAPACITY) return 0;

  const top = src[src.length - 1];

  // count contiguous top segment in src
  let k = src.length - 1,
    run = 1;
  while (k - 1 >= 0 && src[k - 1] === top) {
    k--;
    run++;
  }

  if (dst.length === 0) {
    // can pour up to space available
    return Math.min(run, CAPACITY - dst.length);
  } else {
    const dtop = dst[dst.length - 1];
    if (dtop !== top) return 0;
    // same color: as much as will fit
    return Math.min(run, CAPACITY - dst.length);
  }
}

function doPour(state: GameState, i: number, j: number, amount: number): GameState {
  const next = clone(state);
  const poured: ColorKey[] = [];
  for (let n = 0; n < amount; n++) {
    const c = next[i].pop() as ColorKey;
    poured.push(c);
  }
  // push in same order (top down) — last popped should be last pushed so order preserved
  for (let n = poured.length - 1; n >= 0; n--) next[j].push(poured[n]);
  return next;
}

function isSolved(state: GameState): boolean {
  return state.every((t) => t.length === 0 || (t.length === CAPACITY && t.every((c) => c === t[0])));
}

// build a solvable level by shuffling via valid legal pours starting from grouped colors
function makeLevel(colorCount: number): GameState {
  const keys = Object.keys(INK) as ColorKey[];
  const palette = keys.slice(0, colorCount);

  // Start grouped: each color fills a tube fully
  const tubes: GameState = palette.map((c) => Array(CAPACITY).fill(c));
  // Add two empties (classic)
  tubes.push([], []);

  // Shuffle by performing random valid pours that don't immediately undo
  let prev: Move | null = null;
  const rand = (n: number) => Math.floor(Math.random() * n);

  for (let step = 0; step < 400; step++) {
    const i = rand(tubes.length);
    const j = rand(tubes.length);
    if (i === j) continue;
    const amount = pourAmount(tubes, i, j);
    if (amount === 0) continue;
    // avoid instant reversal
    if (prev && prev.from === j && prev.to === i) continue;
    const after = doPour(tubes, i, j, Math.max(1, Math.min(amount, Math.random() < 0.6 ? amount : 1)));
    // Only accept mixes (avoid no-op pours that leave grouped state too tidy)
    tubes.splice(0, tubes.length, ...after);
    prev = { from: i, to: j, amount };
  }

  // Ensure not already solved
  if (isSolved(tubes)) return makeLevel(colorCount);
  return tubes;
}

// --- UI Components
function TubeView({ tube, index, selected, onPress, maxHeight }: { tube: Tube; index: number; selected: boolean; onPress: () => void; maxHeight: number }) {
  const segmentH = Math.min(42, Math.floor((maxHeight - 16) / CAPACITY));
  const totalH = segmentH * CAPACITY + 12;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.tube, { height: totalH, borderColor: selected ? "#2ecc71" : "rgba(255,255,255,0.15)", opacity: pressed ? 0.9 : 1 }]}>
      {/* Empty space on top */}
      <View style={{ flex: CAPACITY - tube.length }} />
      {/* Liquid segments from bottom to top */}
      {tube.map((c, idx) => (
        <View
          key={`${index}-${idx}-${c}-${tube.length}`}
          style={{
            height: segmentH,
            marginHorizontal: 6,
            marginVertical: 2,
            borderRadius: 6,
            backgroundColor: INK[c],
          }}
        />
      ))}
    </Pressable>
  );
}

// --- Main Screen
export default function WaterSortScreen() {
  const [colorsCount, setColorsCount] = useState(5); // increases with "Next"
  const [state, setState] = useState<GameState>(() => makeLevel(5));
  const [selection, setSelection] = useState<number | null>(null);
  const [moves, setMoves] = useState<Move[]>([]);
  const [animLock, setAnimLock] = useState(false);
  const [gridH, setGridH] = useState(Math.max(360, H * 0.44));

  useEffect(() => {
    setState(makeLevel(colorsCount));
    setSelection(null);
    setMoves([]);
  }, [colorsCount]);

  const tubesPerRow = Math.min(6, state.length);
  const tubeWidth = Math.min(80, Math.floor((W - 24 - (tubesPerRow - 1) * 10) / tubesPerRow));

  const onTubePress = (idx: number) => {
    if (animLock) return;
    if (selection === null) {
      if (state[idx].length === 0) return; // can't pick empty as source
      setSelection(idx);
      return;
    }
    // attempt pour selection -> idx
    if (selection === idx) {
      setSelection(null);
      return;
    }
    const amt = pourAmount(state, selection, idx);
    if (amt === 0) {
      // switch selection to new tube if it has content
      if (state[idx].length > 0) setSelection(idx);
      return;
    }

    // do animated pour (simple multi-step to look nicer)
    const steps = amt; // one unit at a time
    let cur = clone(state);
    setAnimLock(true);

    const applyStep = (step: number) => {
      cur = doPour(cur, selection, idx, 1);
      setState(cur);
      if (step < steps - 1) {
        setTimeout(() => applyStep(step + 1), 90);
      } else {
        setAnimLock(false);
        setMoves((ms) => [...ms, { from: selection, to: idx, amount: amt }]);
        setSelection(null);
      }
    };
    applyStep(0);
  };

  const resetLevel = () => {
    setState(makeLevel(colorsCount));
    setSelection(null);
    setMoves([]);
  };

  const undo = () => {
    if (animLock) return;
    const last = moves[moves.length - 1];
    if (!last) return;
    setMoves((m) => m.slice(0, m.length - 1));
    setState((s) => doPour(s, last.to, last.from, last.amount));
    setSelection(null);
  };

  const nextLevel = () => {
    setColorsCount((c) => Math.min(c + 1, 12));
  };

  const solved = useMemo(() => isSolved(state), [state]);

  const onGridLayout = (e: LayoutChangeEvent) => setGridH(e.nativeEvent.layout.height);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.topBar}>
        <Text style={styles.title}>Water Sort</Text>
        <Text style={styles.sub}>Fill each tube with a single color • Capacity {CAPACITY}</Text>
      </View>

      {/* Board */}
      <View style={styles.board} onLayout={onGridLayout}>
        <View style={[styles.grid, { gap: 10 }]}>
          {state.map((tube, i) => (
            <View key={i} style={{ width: tubeWidth }}>
              <TubeView tube={tube} index={i} selected={selection === i} onPress={() => onTubePress(i)} maxHeight={gridH > 0 ? gridH : Math.max(360, H * 0.44)} />
            </View>
          ))}
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <Pressable onPress={undo} style={({ pressed }) => [styles.btn, pressed && styles.pressed, { opacity: moves.length ? 1 : 0.6 }]} disabled={!moves.length}>
          <Text style={styles.btnText}>Undo</Text>
        </Pressable>
        <Pressable onPress={resetLevel} style={({ pressed }) => [styles.btn, pressed && styles.pressed]}>
          <Text style={styles.btnText}>Reset</Text>
        </Pressable>
        <Pressable onPress={nextLevel} style={({ pressed }) => [styles.btnAccent, pressed && styles.pressed]}>
          <Text style={styles.btnText}>Next</Text>
        </Pressable>
      </View>

      {/* Win overlay */}
      {solved && (
        <View style={styles.overlay}>
          <View style={styles.card}>
            <Text style={styles.winTitle}>Level Clear 🎉</Text>
            <Text style={styles.winSub}>Moves: {moves.length}</Text>
            <View style={{ height: 10 }} />
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable onPress={resetLevel} style={({ pressed }) => [styles.btn, pressed && styles.pressed, { minWidth: 110 }]}>
                <Text style={styles.btnText}>Replay</Text>
              </Pressable>
              <Pressable onPress={nextLevel} style={({ pressed }) => [styles.btnAccent, pressed && styles.pressed, { minWidth: 110 }]}>
                <Text style={styles.btnText}>Next +1</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const COLORS = {
  bg: "#0B1220",
  card: "#121a2b",
  text: "#E5E7EB",
  sub: "rgba(229,231,235,0.7)",
  accent: "#2ecc71",
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  topBar: { paddingTop: 18, paddingBottom: 8, paddingHorizontal: 16 },
  title: { color: COLORS.text, fontSize: 22, fontWeight: "800" },
  sub: { color: COLORS.sub, marginTop: 2 },
  board: { flex: 1, paddingHorizontal: 12, paddingVertical: 10 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "flex-end",
  },
  tube: {
    borderWidth: 2,
    borderRadius: 14,
    paddingVertical: 6,
    marginBottom: 10,
    backgroundColor: "rgba(255,255,255,0.03)",
    overflow: "hidden",
  },
  controls: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
  },
  btn: { backgroundColor: COLORS.card, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12 },
  btnAccent: { backgroundColor: COLORS.accent, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12 },
  pressed: { opacity: 0.85 },
  btnText: { color: "white", fontWeight: "800" },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  card: { backgroundColor: COLORS.card, padding: 18, borderRadius: 18, width: "100%", maxWidth: 360, alignItems: "center" },
  winTitle: { color: COLORS.text, fontWeight: "800", fontSize: 22, marginBottom: 6 },
  winSub: { color: COLORS.sub },
});
