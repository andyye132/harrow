import { useRef, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import USMap from './USMap';
import MapCameraControls from './MapControls';
import useStore from '../../store/useStore';

// Water color constants — used for both plane and canvas bg so no edge visible
const WATER_LIGHT = '#93c5fd';
const WATER_DARK = '#1e3a5f';

/** Animated water plane with subtle wave motion */
function WaterPlane({ isLight }) {
  const materialRef = useRef();

  useFrame(({ clock }) => {
    if (materialRef.current) {
      const t = clock.getElapsedTime();
      materialRef.current.opacity = isLight ? 0.55 + Math.sin(t * 0.5) * 0.03 : 0.7 + Math.sin(t * 0.5) * 0.04;
    }
  });

  return (
    <mesh position={[0, -0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[200, 200]} />
      <meshBasicMaterial
        ref={materialRef}
        color={isLight ? WATER_LIGHT : WATER_DARK}
        transparent
        opacity={isLight ? 0.55 : 0.7}
      />
    </mesh>
  );
}

/** Directional light that follows the camera so shading stays constant */
function CameraLight({ isLight }) {
  const lightRef = useRef();
  useFrame(({ camera }) => {
    if (lightRef.current) {
      // Position light relative to camera so surfaces always shade the same
      lightRef.current.position.copy(camera.position);
      lightRef.current.position.y += 5;
    }
  });
  return (
    <directionalLight
      ref={lightRef}
      intensity={isLight ? 0.6 : 0.45}
    />
  );
}

/** Invisible ground plane that deselects only on click (not drag) */
function ClickCatcher() {
  const setSelectedState = useStore(s => s.setSelectedState);
  const downPos = useRef(null);

  const onPointerDown = useCallback((e) => {
    downPos.current = { x: e.clientX, y: e.clientY };
  }, []);

  const onClick = useCallback((e) => {
    if (!downPos.current) return;
    const dx = e.clientX - downPos.current.x;
    const dy = e.clientY - downPos.current.y;
    // Only deselect if pointer barely moved (not a drag/rotate)
    if (Math.sqrt(dx * dx + dy * dy) < 5) {
      setSelectedState(null);
    }
    downPos.current = null;
  }, [setSelectedState]);

  return (
    <mesh
      position={[0, -0.06, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      onPointerDown={onPointerDown}
      onClick={onClick}
      visible={false}
    >
      <planeGeometry args={[200, 200]} />
      <meshBasicMaterial />
    </mesh>
  );
}

function SceneContent() {
  const theme = useStore(s => s.theme);
  const isLight = theme === 'light';

  return (
    <>
      {/* Even ambient light + camera-following directional = no shading shift on rotate */}
      <ambientLight intensity={isLight ? 0.85 : 0.65} />
      <CameraLight isLight={isLight} />
      <pointLight position={[-5, 5, -5]} intensity={0.15} color="#8b5cf6" />

      <WaterPlane isLight={isLight} />
      <USMap />
      <MapCameraControls />

      <ContactShadows
        position={[0, -0.01, 0]}
        opacity={isLight ? 0.1 : 0.2}
        blur={2.5}
        far={8}
      />

      <ClickCatcher />
    </>
  );
}

export default function MapCanvas() {
  const theme = useStore(s => s.theme);
  // Match canvas bg to water color so no edge is visible
  const bgColor = theme === 'light' ? WATER_LIGHT : WATER_DARK;

  return (
    <Canvas
      camera={{ position: [0, 7, 5], fov: 45, near: 0.1, far: 100 }}
      shadows
      style={{ background: bgColor }}
      gl={{ antialias: true, alpha: true }}
      onCreated={({ gl }) => {
        gl.setClearColor(bgColor, 1);
      }}
    >
      <SceneContent />
    </Canvas>
  );
}
