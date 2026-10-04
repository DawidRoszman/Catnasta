"use client";
import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { easing } from "maath";
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
  const aspect = size.width / Math.max(size.height, 1);
  // Keep the whole table in frame on narrow screens by widening the vertical fov.
  const fov = THREE.MathUtils.clamp(
    THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(HORIZONTAL_FOV / 2)) / aspect)),
    38,
    80,
  );
  const base = useMemo(
    () => new THREE.Vector3(0, aspect < 1 ? 10.5 : 8.6, aspect < 1 ? 8.6 : 8.1),
    [aspect],
  );

  useFrame((state, delta) => {
    const camera = state.camera as THREE.PerspectiveCamera;
    if (camera.fov !== fov) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
    easing.damp3(
      camera.position,
      [base.x + state.pointer.x * 0.35, base.y + state.pointer.y * 0.15, base.z],
      0.6,
      delta,
    );
    camera.lookAt(LOOK_AT);
  });
  return null;
}

export type SceneProps = {
  layout: LayoutInput;
  stockCount: number;
  canDraw: boolean;
  canPickUp: boolean;
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
      dpr={[1, 2]}
      camera={{ position: [0, 8.6, 8.1], fov: 42, near: 0.1, far: 60 }}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
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
        shadow-camera-left={-7}
        shadow-camera-right={7}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      />
      <Table3D />
      {fontsReady && (
        <>
          <StockPile count={props.stockCount} active={props.canDraw} onClick={props.onStockClick} />
          <DiscardPile
            count={props.layout.discardCount}
            active={props.canPickUp}
            onClick={props.onDiscardClick}
          />
          <Cards layout={props.layout} stockCount={props.stockCount} onCardClick={props.onCardClick} />
        </>
      )}
    </Canvas>
    </>
  );
}
