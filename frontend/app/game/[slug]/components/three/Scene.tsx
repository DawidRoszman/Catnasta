"use client";
import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { Canvas, useThree } from "@react-three/fiber";
import { ensureCardFonts } from "@/app/lib/cards/draw";
import Card3D from "./Card3D";
import TableSkeleton from "../TableSkeleton";
import Table3D from "./Table3D";
import { DiscardPile, StockPile } from "./Piles";
import {
  ClickTarget,
  LayoutInput,
  STOCK_POSITION,
  computeLayout,
  pileHeight,
} from "./tableLayout";

const LOOK_AT = new THREE.Vector3(0, 0, 0.3);
const HORIZONTAL_FOV = 66;

function CameraRig() {
  const size = useThree((state) => state.size);
  const get = useThree((state) => state.get);
  const aspect = size.width / Math.max(size.height, 1);

  // A fixed camera: it only moves when the window's shape changes. (Drifting with
  // the pointer looked nice but redrew the table on every mouse move.)
  useLayoutEffect(() => {
    const { camera: base, invalidate } = get();
    const camera = base as THREE.PerspectiveCamera;
    // Keep the whole table in frame on narrow screens by widening the vertical fov.
    camera.fov = THREE.MathUtils.clamp(
      THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(HORIZONTAL_FOV / 2)) / aspect)),
      38,
      80,
    );
    camera.position.set(0, aspect < 1 ? 10.5 : 8.6, aspect < 1 ? 8.6 : 8.1);
    camera.lookAt(LOOK_AT);
    camera.updateProjectionMatrix();
    invalidate();
  }, [aspect, get]);
  return null;
}

export type SceneProps = {
  layout: LayoutInput;
  stockCount: number;
  canDraw: boolean;
  /** The litterbox glows when it can be taken, or when a selected card can be dropped on it. */
  litterboxActive: boolean;
  onCardClick: (target: ClickTarget) => void;
  onStockClick: () => void;
  onDiscardClick: () => void;
};

function Cards({ layout, stockCount, onCardClick }: Pick<SceneProps, "layout" | "stockCount" | "onCardClick">) {
  const placements = useMemo(() => computeLayout(layout), [layout]);
  const spawn = useMemo(
    () => new THREE.Vector3(STOCK_POSITION.x, pileHeight(stockCount) + 0.05, STOCK_POSITION.z),
    [stockCount],
  );
  return (
    <>
      {placements.map((placement) => (
        <Card3D
          key={placement.key}
          card={placement.card}
          position={placement.position}
          quaternion={placement.quaternion}
          spawn={spawn}
          glow={placement.glow}
          hoverLift={placement.hoverLift}
          onClick={placement.target ? () => onCardClick(placement.target!) : undefined}
        />
      ))}
    </>
  );
}

export default function Scene(props: SceneProps) {
  const [fontsReady, setFontsReady] = useState(false);

  useEffect(() => {
    let active = true;
    ensureCardFonts().then(() => active && setFontsReady(true));
    return () => {
      active = false;
    };
  }, []);

  return (
    <>
    {!fontsReady && <TableSkeleton />}
    <Canvas
      shadows
      flat
      // Draw only when something moves or changes, not 60 times a second.
      frameloop="demand"
      // Full Retina resolution costs far more than it shows at this camera distance.
      dpr={[1, 1.5]}
      camera={{ position: [0, 8.6, 8.1], fov: 42, near: 0.1, far: 60 }}
      gl={{ antialias: true, powerPreference: "low-power" }}
      onPointerMissed={() => (document.body.style.cursor = "")}
      aria-label="Card table"
      id="game-canvas"
    >
      <color attach="background" args={["#06150f"]} />
      <fog attach="fog" args={["#06150f", 14, 26]} />
      <CameraRig />
      <hemisphereLight args={["#fff3dc", "#0b2a20", 1.1]} />
      <ambientLight intensity={0.35} color="#ffe9c7" />
      <directionalLight
        position={[3, 11, 5]}
        intensity={1.5}
        color="#fff1d6"
        castShadow
        shadow-mapSize={[2048, 2048]}
        // Wide enough for the bed, its bolster and the toys behind it.
        shadow-camera-left={-9}
        shadow-camera-right={9}
        shadow-camera-top={7.5}
        shadow-camera-bottom={-7.5}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      />
      <Table3D />
      {fontsReady && (
        <>
          <StockPile count={props.stockCount} active={props.canDraw} onClick={props.onStockClick} />
          <DiscardPile
            count={props.layout.discardCount}
            active={props.litterboxActive}
            onClick={props.onDiscardClick}
          />
          <Cards layout={props.layout} stockCount={props.stockCount} onCardClick={props.onCardClick} />
        </>
      )}
    </Canvas>
    </>
  );
}
