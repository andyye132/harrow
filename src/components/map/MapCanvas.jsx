import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import USMap from './USMap';
import MapCameraControls from './MapControls';
import useStore from '../../store/useStore';

/** Animated water plane with subtle wave motion */
function WaterPlane({ isLight }) {
  const meshRef = useRef();
  const materialRef = useRef();

  useFrame(({ clock }) => {
    if (materialRef.current) {
      // Subtle opacity shimmer
      const t = clock.getElapsedTime();
      materialRef.current.opacity = isLight ? 0.35 + Math.sin(t * 0.5) * 0.03 : 0.5 + Math.sin(t * 0.5) * 0.04;
    }
  });

  return (
    <mesh
      ref={meshRef}
      position={[0, -0.03, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <planeGeometry args={[30, 30]} />
      <meshStandardMaterial
        ref={materialRef}
        color={isLight ? '#93c5fd' : '#1e3a5f'}
        transparent
        opacity={isLight ? 0.35 : 0.5}
        metalness={0.1}
        roughness={0.6}
      />
    </mesh>
  );
}

function SceneContent() {
  const setSelectedState = useStore(s => s.setSelectedState);
  const theme = useStore(s => s.theme);
  const isLight = theme === 'light';

  return (
    <>
      <ambientLight intensity={isLight ? 0.7 : 0.5} />
      <directionalLight
        position={[5, 10, 5]}
        intensity={isLight ? 1.0 : 0.8}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <pointLight position={[-5, 5, -5]} intensity={0.2} color="#8b5cf6" />
      <pointLight position={[3, 3, 3]} intensity={0.1} color="#a78bfa" />

      {/* Water surface */}
      <WaterPlane isLight={isLight} />

      <USMap />
      <MapCameraControls />

      <ContactShadows
        position={[0, -0.01, 0]}
        opacity={isLight ? 0.15 : 0.25}
        blur={2.5}
        far={8}
      />

      {/* Click on empty space to deselect */}
      <mesh
        position={[0, -0.06, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={() => setSelectedState(null)}
        visible={false}
      >
        <planeGeometry args={[30, 30]} />
        <meshBasicMaterial />
      </mesh>
    </>
  );
}

export default function MapCanvas() {
  const theme = useStore(s => s.theme);
  // Ocean-tinted background
  const bgColor = theme === 'light' ? '#dbeafe' : '#0c1929';

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
