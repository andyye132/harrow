import { Canvas } from '@react-three/fiber';
import { ContactShadows } from '@react-three/drei';
import USMap from './USMap';
import MapCameraControls from './MapControls';
import useStore from '../../store/useStore';

function SceneContent() {
  const setSelectedState = useStore(s => s.setSelectedState);

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[5, 10, 5]}
        intensity={0.8}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <pointLight position={[-5, 5, -5]} intensity={0.3} color="#8b5cf6" />
      <pointLight position={[3, 3, 3]} intensity={0.15} color="#a78bfa" />

      <USMap />
      <MapCameraControls />

      <ContactShadows
        position={[0, -0.01, 0]}
        opacity={0.3}
        blur={2.5}
        far={8}
      />

      {/* Grid for depth */}
      <gridHelper args={[20, 40, '#1a1a1a', '#141414']} position={[0, -0.02, 0]} />

      {/* Click on empty space to deselect */}
      <mesh
        position={[0, -0.05, 0]}
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
  return (
    <Canvas
      camera={{ position: [0, 7, 5], fov: 45, near: 0.1, far: 100 }}
      shadows
      style={{ background: 'transparent' }}
      gl={{ antialias: true, alpha: true }}
      onCreated={({ gl }) => {
        gl.setClearColor('#0a0a0a', 1);
      }}
    >
      <SceneContent />
    </Canvas>
  );
}
