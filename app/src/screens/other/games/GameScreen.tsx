// screens/GameScreen.tsx
import React, { useMemo, useRef, useState } from "react";
import { Dimensions, Pressable, StyleSheet, Text, View } from "react-native";
import { GameEngine } from "react-native-game-engine";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

// --- Tunables
const PLAYER_W = 50;
const PLAYER_H = 50;
const PLAYER_SPEED = 9;           // pixels per tick while holding
const START_FALL_SPEED = 4;       // obstacle fall speed
const SPEED_GROWTH = 0.0009;      // fall-speed growth per tick
const SPAWN_EVERY_TICKS = 45;     // how often we spawn a new obstacle
const OBSTACLE_MIN_W = 40;
const OBSTACLE_MAX_W = 110;

const COLORS = {
  bg: "#0B1220",
  fg: "#FFFFFF",
  sub: "rgba(255,255,255,0.7)",
  accent: "#2ecc71",
  accentDim: "#1ea95a",
  card: "#121a2b",
};

// ---------- Renderers
const Player = ({ position, size }: any) => {
  const [x, y] = position;
  const [w, h] = size;
  return (
    <View style={{
      position: "absolute", left: x, top: y, width: w, height: h,
      backgroundColor: COLORS.accent, borderRadius: 10
    }} />
  );
};

const Box = ({ position, size }: any) => {
  const [x, y] = position;
  const [w, h] = size;
  return (
    <View style={{
      position: "absolute", left: x, top: y, width: w, height: h,
      backgroundColor: COLORS.accentDim, borderRadius: 8
    }} />
  );
};

// ---------- Helpers
const rand = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const clamp = (val: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, val));

// Entities shape is a map of id -> entity object with a renderer
type Entities = {
  [key: string]: any;
  meta: {
    tick: number;
    fallSpeed: number;
    inputLeft: boolean;
    inputRight: boolean;
  };
};

function makeInitialEntities(): Entities {
  const playerId = "player";
  return {
    // Player entity
    [playerId]: {
      position: [SCREEN_W / 2 - PLAYER_W / 2, SCREEN_H - 140],
      size: [PLAYER_W, PLAYER_H],
      renderer: <Player />,
    },
    // Metadata & controls
    meta: {
      tick: 0,
      fallSpeed: START_FALL_SPEED,
      inputLeft: false,
      inputRight: false,
    },
  };
}

// ---------- Systems
const updateSystem = (entities: Entities, { time, dispatch }: any) => {
  const dt = Math.min(16, time?.delta ?? 16);
  const meta = entities.meta;
  const player = entities["player"];
  const [px, py] = player.position;

  // Move player by input
  let nx = px;
  if (meta.inputLeft) nx -= PLAYER_SPEED * (dt / 16);
  if (meta.inputRight) nx += PLAYER_SPEED * (dt / 16);
  nx = clamp(nx, 0, SCREEN_W - player.size[0]);
  player.position = [nx, py];

  // Spawn obstacles
  meta.tick += 1;
  if (meta.tick % SPAWN_EVERY_TICKS === 0) {
    const w = rand(OBSTACLE_MIN_W, OBSTACLE_MAX_W);
    const h = rand(24, 46);
    const id = `o_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
    entities[id] = {
      position: [rand(0, SCREEN_W - w), -50],
      size: [w, h],
      renderer: <Box />,
      _obstacle: true,
    };
  }

  // Move obstacles
  meta.fallSpeed += SPEED_GROWTH * dt;
  const fall = meta.fallSpeed * (dt / 16);

  Object.keys(entities).forEach(key => {
    const e = entities[key];
    if (e?._obstacle) {
      const [ox, oy] = e.position;
      e.position = [ox, oy + fall];
      // Cull off-screen
      if (oy > SCREEN_H + 80) {
        delete entities[key];
      }
    }
  });

  // Increment score over time
  dispatch({ type: "score-tick", delta: Math.round(dt / 32) });

  return entities;
};

const collisionSystem = (entities: Entities, { dispatch }: any) => {
  const player = entities["player"];
  const [px, py] = player.position;
  const [pw, ph] = player.size;
  const px2 = px + pw;
  const py2 = py + ph;

  for (const key of Object.keys(entities)) {
    const e = entities[key];
    if (!e?._obstacle) continue;

    const [ox, oy] = e.position;
    const [ow, oh] = e.size;
    const ox2 = ox + ow;
    const oy2 = oy + oh;

    const overlap = px < ox2 && px2 > ox && py < oy2 && py2 > oy;
    if (overlap) {
      dispatch({ type: "game-over" });
      break;
    }
  }
  return entities;
};

// ---------- Screen
export default function GameScreen() {
  const engineRef = useRef<GameEngine>(null);

  const [running, setRunning] = useState(true);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [pressedSide, setPressedSide] = useState<"left" | "right" | null>(null);

  const initialEntities = useMemo(() => makeInitialEntities(), []);
  const [entities, setEntities] = useState<Entities>(initialEntities);

  const onEvent = (e: any) => {
    if (!e) return;
    if (e.type === "score-tick") {
      setScore(s => s + (e.delta ?? 1));
    }
    if (e.type === "game-over") {
      setRunning(false);
      setBest(prev => Math.max(prev, score));
    }
  };

  const reset = () => {
    const fresh = makeInitialEntities();
    setEntities(fresh);
    setScore(0);
    setPressedSide(null);
    setRunning(true);
    (engineRef.current as any)?.swap(fresh);
  };

  // Input helpers mutate entities.meta flags (OK in RNGE)
    const setInput = (dir: "left" | "right" | "none") => {
      const ents = (engineRef.current as any)?.state?.entities as Entities | undefined;
      if (!ents) return;
      ents.meta.inputLeft = dir === "left";
      ents.meta.inputRight = dir === "right";
    };

  const handlePressIn = (side: "left" | "right") => {
    setPressedSide(side);
    setInput(side);
  };
  const handlePressOut = () => {
    setPressedSide(null);
    setInput("none");
  };

  return (
    <View style={styles.container}>
      <GameEngine
        ref={engineRef}
        style={styles.engine}
        systems={[updateSystem, collisionSystem]}
        entities={entities}
        running={running}
        onEvent={onEvent}
      />

      {/* HUD */}
      <View style={styles.hud}>
        <View style={styles.hudLeft}>
          <Text style={styles.score}>Score: <Text style={styles.scoreNum}>{score}</Text></Text>
          <Text style={styles.best}>Best: {best}</Text>
        </View>
        <Pressable
          onPress={() => setRunning(r => !r)}
          style={({ pressed }) => [styles.pauseBtn, pressed && { opacity: 0.8 }]}
        >
          <Text style={styles.pauseLabel}>{running ? "Pause" : "Resume"}</Text>
        </Pressable>
      </View>

      {/* Input overlays (left/right) */}
      <View style={styles.inputsRow} pointerEvents="box-none">
        <Pressable
          onPressIn={() => handlePressIn("left")}
          onPressOut={handlePressOut}
          style={[styles.inputSide, pressedSide === "left" && styles.inputActive]}
        />
        <Pressable
          onPressIn={() => handlePressIn("right")}
          onPressOut={handlePressOut}
          style={[styles.inputSide, pressedSide === "right" && styles.inputActive]}
        />
      </View>

      {/* Game Over overlay */}
      {!running && (
        <View style={styles.overlay}>
          <View style={styles.card}>
            <Text style={styles.title}>Game Over</Text>
            <Text style={styles.sub}>Score: <Text style={{ color: COLORS.fg }}>{score}</Text></Text>
            <Text style={styles.sub}>Best: <Text style={{ color: COLORS.fg }}>{best}</Text></Text>
            <Pressable onPress={reset} style={({ pressed }) => [styles.cta, pressed && { opacity: 0.9 }]}>
              <Text style={styles.ctaText}>Play Again</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  engine: { flex: 1 },
  hud: {
    position: "absolute",
    top: 16,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  hudLeft: {
    backgroundColor: COLORS.card,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  score: { color: COLORS.sub, fontSize: 12 },
  scoreNum: { color: COLORS.fg, fontSize: 16, fontWeight: "700" },
  best: { color: COLORS.sub, marginTop: 2, fontSize: 12 },
  pauseBtn: {
    backgroundColor: COLORS.card,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  pauseLabel: { color: COLORS.fg, fontWeight: "600" },
  inputsRow: {
    position: "absolute",
    left: 0, right: 0, bottom: 0,
    height: 160, flexDirection: "row",
  },
  inputSide: { flex: 1, backgroundColor: "transparent" },
  inputActive: { backgroundColor: "rgba(46, 204, 113, 0.08)" },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center", justifyContent: "center", paddingHorizontal: 24,
  },
  card: {
    width: "100%", maxWidth: 360, backgroundColor: COLORS.card,
    borderRadius: 20, padding: 18, alignItems: "center",
  },
  title: { color: COLORS.fg, fontWeight: "800", fontSize: 22, marginBottom: 6 },
  sub: { color: COLORS.sub, fontSize: 14, marginBottom: 16 },
  cta: { backgroundColor: COLORS.accent, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 14 },
  ctaText: { color: "white", fontWeight: "700" },
});
