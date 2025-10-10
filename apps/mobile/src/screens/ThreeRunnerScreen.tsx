// screens/ThreeRunnerScreen.tsx
import React, { useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet, PixelRatio } from "react-native";
import { Canvas, useFrame } from "@react-three/fiber/native";
import * as THREE from "three";
import { PerspectiveCamera } from "@react-three/drei";

type Obstacle = {
  id: number;
  x: number; // lane offset
  y: number; // vertical offset (rarely used here)
  z: number; // distance forward (negative moves toward camera)
  size: [number, number, number];
};

const COLORS = {
  bg: "#0B1220",
  card: "#121a2b",
  text: "#E5E7EB",
  sub: "rgba(229,231,235,0.7)",
  accent: "#2ecc71",
  accentDim: "#1ea95a",
  danger: "#EF4444",
};

const LANES = [-2.4, 0, 2.4]; // three lanes
const SPAWN_Z = -80; // where new obstacles appear (far away)
const END_Z = 6; // collision when obstacle reaches >= END_Z
const SPEED_INITIAL = 0.65; // base forward speed
const SPEED_GROWTH = 0.00025; // gradual speed increase
const SPAWN_EVERY = 34; // frames between spawns
const PLAYER_Y = -0.4; // slight down from origin
const PLAYER_Z = 3.5;

function useGameLogic(running: boolean, onGameOver: (score: number) => void) {
  const frameRef = useRef(0);
  const speedRef = useRef(SPEED_INITIAL);
  const obstaclesRef = useRef<Obstacle[]>([]);
  const scoreRef = useRef(0);
  const laneRef = useRef(1); // 0,1,2

  // generate one obstacle (could be bars/walls/random sizes)
  const makeObstacle = (): Obstacle => {
    const lane = Math.floor(Math.random() * 3);
    const width = 1.1 + Math.random() * 0.6;
    const height = 1.0 + Math.random() * 1.1;
    const depth = 1.0 + Math.random() * 0.6;
    return {
      id: Date.now() + Math.random(),
      x: LANES[lane],
      y: 0,
      z: SPAWN_Z,
      size: [width, height, depth],
    };
  };

  // per-frame update used by the scene
  const step = () => {
    if (!running)
      return {
        lane: laneRef.current,
        obstacles: obstaclesRef.current,
        score: scoreRef.current,
        speed: speedRef.current,
      };

    frameRef.current += 1;
    speedRef.current += SPEED_GROWTH;

    // spawn cadence
    if (frameRef.current % SPAWN_EVERY === 0) {
      obstaclesRef.current.push(makeObstacle());
    }

    // advance obstacles toward camera
    const s = speedRef.current;
    obstaclesRef.current.forEach((o) => (o.z += s));

    // remove past-camera obstacles & score
    const before = obstaclesRef.current.length;
    obstaclesRef.current = obstaclesRef.current.filter((o) => o.z < END_Z + 2.5);
    const passed = before - obstaclesRef.current.length;
    if (passed > 0) scoreRef.current += passed * 10;

    // collision check (AABB vs player)
    const playerX = LANES[laneRef.current];
    const playerBox = new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(playerX, PLAYER_Y, PLAYER_Z),
      new THREE.Vector3(1.0, 1.0, 1.0) // ship hitbox
    );
    for (const o of obstaclesRef.current) {
      const box = new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(o.x, o.y, o.z), new THREE.Vector3(...o.size));
      if (box.intersectsBox(playerBox)) {
        onGameOver(scoreRef.current);
        break;
      }
    }

    return {
      lane: laneRef.current,
      obstacles: obstaclesRef.current,
      score: scoreRef.current,
      speed: speedRef.current,
    };
  };

  return { step };
}

/** ---- Player ship */
function Ship({ lane }: { lane: number }) {
  const group = useRef<THREE.Group>(null);
  const targetX = LANES[lane];
  useFrame((_, dt) => {
    if (!group.current) return;
    const g = group.current;
    g.position.x += (targetX - g.position.x) * Math.min(1, dt * 10);
    g.rotation.z = THREE.MathUtils.lerp(g.rotation.z, -(targetX - g.position.x) * 0.15, 0.2);
    g.position.y = PLAYER_Y + Math.sin(performance.now() * 0.003) * 0.05;
  });

  return (
    <group ref={group} position={[LANES[lane], PLAYER_Y, PLAYER_Z]}>
      {/* nose */}
      <mesh castShadow position={[0, 0, -0.2]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.35, 0.9, 16]} />
        <meshStandardMaterial color={COLORS.accent} metalness={0.2} roughness={0.4} />
      </mesh>
      {/* body */}
      <mesh castShadow position={[0, 0, -0.7]}>
        <boxGeometry args={[0.5, 0.26, 0.8]} />
        <meshStandardMaterial color={COLORS.accentDim} />
      </mesh>
      {/* fins */}
      <mesh castShadow position={[0.35, 0, -0.7]} rotation={[0, 0, Math.PI / 6]}>
        <boxGeometry args={[0.3, 0.06, 0.6]} />
        <meshStandardMaterial color={COLORS.accentDim} />
      </mesh>
      <mesh castShadow position={[-0.35, 0, -0.7]} rotation={[0, 0, -Math.PI / 6]}>
        <boxGeometry args={[0.3, 0.06, 0.6]} />
        <meshStandardMaterial color={COLORS.accentDim} />
      </mesh>
    </group>
  );
}

/** ---- An obstacle block */
function ObstacleMesh({ x, y, z, size }: Obstacle) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (!ref.current) return;
    ref.current.position.set(x, y, z);
  });
  return (
    <mesh ref={ref}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={"#2a9d8f"} />
    </mesh>
  );
}

/** ---- scrolling “tunnel” floor for motion feel */
function Floor() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (!ref.current) return;
    ref.current.position.z += SPEED_INITIAL * 0.8;
    if (ref.current.position.z > 2) ref.current.position.z = -10;
  });
  return (
    <mesh ref={ref} position={[0, -1.2, -10]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[30, 24, 32, 12]} />
      <meshStandardMaterial color={"#0f172a"} />
    </mesh>
  );
}

/** ---- Main R3F scene */
function SceneContent({ running, onGameOver, setHud }: { running: boolean; onGameOver: (score: number) => void; setHud: React.Dispatch<React.SetStateAction<{ score: number; speed: number }>> }) {
  const { step } = useGameLogic(running, onGameOver);
  const [lane, setLane] = useState(1);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);

  // single frame loop
  useFrame(() => {
    const s = step();
    setLane(s.lane);
    setObstacles([...s.obstacles]);
    setHud({ score: s.score, speed: s.speed });
  });

  return (
    <>
      {/* camera & env */}
      <PerspectiveCamera makeDefault position={[0, 1.4, 6.8]} fov={65} />
      <color attach="background" args={[COLORS.bg]} />
      <fog attach="fog" args={[COLORS.bg, 6, 28]} />
      <ambientLight intensity={0.25} />
      <directionalLight position={[5, 6, 8]} intensity={0.9} />

      {/* visuals */}
      <Floor />
      <Ship lane={lane} />
      {obstacles.map((o) => (
        <ObstacleMesh key={o.id} {...o} />
      ))}
    </>
  );
}

export default function ThreeRunnerScreen() {
  const [running, setRunning] = useState(true);
  const [hud, setHud] = useState({ score: 0, speed: SPEED_INITIAL });
  const [best, setBest] = useState(0);
  const [lane, setLane] = useState<0 | 1 | 2>(1);

  const moveLeft = () => setLane((l) => (l > 0 ? ((l - 1) as 0 | 1 | 2) : l));
  const moveRight = () => setLane((l) => (l < 2 ? ((l + 1) as 0 | 1 | 2) : l));

  const onGameOver = (score: number) => {
    setRunning(false);
    setBest((b) => Math.max(b, score));
  };

  const reset = () => {
    setHud({ score: 0, speed: SPEED_INITIAL });
    setLane(1);
    setRunning(true);
  };

  return (
    <View style={styles.container}>
      {/* 3D canvas */}
      <Canvas
        onCreated={(state) => {
          const renderer = state.gl as unknown as THREE.WebGLRenderer;

          renderer.setClearColor(new THREE.Color(COLORS.bg));

          const dpr = Math.min(PixelRatio.get?.() ?? 1, 1.5);
          if (renderer.setPixelRatio) renderer.setPixelRatio(dpr);

          renderer.shadowMap.enabled = true;
          renderer.shadowMap.type = (THREE as any).PCFSoftShadowMap;

          // Color / tone mapping – cast from THREE as any so TS doesn't complain
          const threeAny = THREE as any;
          if ("outputColorSpace" in renderer) {
            (renderer as any).outputColorSpace = threeAny.SRGBColorSpace;
          } else {
            (renderer as any).outputEncoding = threeAny.sRGBEncoding;
          }
          (renderer as any).toneMapping = threeAny.ACESFilmicToneMapping;
          (renderer as any).toneMappingExposure = 1.0;
        }}
      >
        <SceneContent running={running} onGameOver={onGameOver} setHud={setHud} />
      </Canvas>

      {/* HUD */}
      <View style={styles.hud}>
        <View style={styles.hudLeft}>
          <Text style={styles.score}>
            Score: <Text style={styles.scoreNum}>{hud.score}</Text>
          </Text>
          <Text style={styles.best}>Best: {best}</Text>
        </View>
        <Pressable onPress={() => setRunning((r) => !r)} style={({ pressed }) => [styles.pauseBtn, pressed && { opacity: 0.85 }]}>
          <Text style={styles.pauseLabel}>{running ? "Pause" : "Resume"}</Text>
        </Pressable>
      </View>

      {/* lane controls */}
      <View style={styles.controls}>
        <Pressable onPress={moveLeft} style={[styles.ctrl, lane === 0 && styles.ctrlActive]}>
          <Text style={styles.ctrlText}>◀</Text>
        </Pressable>
        <Pressable onPress={moveRight} style={[styles.ctrl, lane === 2 && styles.ctrlActive]}>
          <Text style={styles.ctrlText}>▶</Text>
        </Pressable>
      </View>

      {/* game over */}
      {!running && (
        <View style={styles.overlay}>
          <View style={styles.card}>
            <Text style={styles.title}>Game Over</Text>
            <Text style={styles.sub}>
              Score: <Text style={{ color: COLORS.text }}>{hud.score}</Text>
            </Text>
            <Text style={styles.sub}>
              Best: <Text style={{ color: COLORS.text }}>{best}</Text>
            </Text>
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
  scoreNum: { color: COLORS.text, fontSize: 16, fontWeight: "800" },
  best: { color: COLORS.sub, marginTop: 2, fontSize: 12 },
  pauseBtn: {
    backgroundColor: COLORS.card,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  pauseLabel: { color: COLORS.text, fontWeight: "700" },
  controls: {
    position: "absolute",
    bottom: 26,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
  },
  ctrl: {
    backgroundColor: COLORS.card,
    width: 74,
    height: 54,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  ctrlActive: { borderWidth: 2, borderColor: COLORS.accent },
  ctrlText: { color: COLORS.text, fontSize: 22, fontWeight: "800" },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: COLORS.card,
    padding: 18,
    borderRadius: 18,
    width: "100%",
    maxWidth: 360,
    alignItems: "center",
  },
  title: { color: COLORS.text, fontWeight: "800", fontSize: 22, marginBottom: 8 },
  sub: { color: COLORS.sub, marginBottom: 10 },
  cta: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 4,
  },
  ctaText: { color: "white", fontWeight: "800" },
});
