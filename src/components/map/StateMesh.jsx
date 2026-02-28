import { useRef, useMemo } from 'react';
import { useSpring, animated } from '@react-spring/three';
import * as THREE from 'three';
import { geoFeatureToShapes, FIPS_TO_ABBR } from '../../utils/geoToShape';
import { stateColor } from '../../utils/colorScales';
import useStore from '../../store/useStore';

const extrudeSettings = {
  depth: 0.05,
  bevelEnabled: true,
  bevelThickness: 0.003,
  bevelSize: 0.003,
  bevelSegments: 1,
};

export default function StateMesh({ feature, yieldData }) {
  const meshRef = useRef();
  const selectedState = useStore(s => s.selectedState);
  const hoveredState = useStore(s => s.hoveredState);
  const setSelectedState = useStore(s => s.setSelectedState);
  const setHoveredState = useStore(s => s.setHoveredState);
  const setPointerPosition = useStore(s => s.setPointerPosition);

  const stateId = feature.id;
  const abbr = FIPS_TO_ABBR[stateId];
  const isSelected = selectedState === stateId;
  const isHovered = hoveredState === stateId;
  const hasData = !!yieldData;

  const shapes = useMemo(() => geoFeatureToShapes(feature), [feature]);

  // Get average yield for color
  const avgYield = useMemo(() => {
    if (!yieldData?.crops) return 0;
    const crops = Object.values(yieldData.crops);
    if (crops.length === 0) return 0;
    const allYears = crops.flatMap(c => c.map(y => y.avg_yield));
    return allYears.reduce((a, b) => a + b, 0) / allYears.length;
  }, [yieldData]);

  const baseColor = stateColor(avgYield, hasData);

  const { scale, emissiveIntensity, posY } = useSpring({
    scale: isSelected ? 8 : isHovered ? 2.5 : 1,
    emissiveIntensity: isSelected ? 0.5 : isHovered ? 0.3 : 0,
    posY: isSelected ? 0.1 : 0,
    config: { mass: 1, tension: 280, friction: 40 },
  });

  const geometries = useMemo(() => {
    return shapes.map(shape => new THREE.ExtrudeGeometry(shape, extrudeSettings));
  }, [shapes]);

  const handlePointerOver = (e) => {
    e.stopPropagation();
    setHoveredState(stateId);
    document.body.style.cursor = 'pointer';
  };

  const handlePointerOut = () => {
    setHoveredState(null);
    document.body.style.cursor = 'default';
  };

  const handlePointerMove = (e) => {
    setPointerPosition({ x: e.clientX, y: e.clientY });
  };

  const handleClick = (e) => {
    e.stopPropagation();
    setSelectedState(stateId);
  };

  return (
    <animated.group
      position-y={posY}
    >
      {geometries.map((geo, i) => (
        <animated.mesh
          key={i}
          ref={i === 0 ? meshRef : undefined}
          geometry={geo}
          rotation={[-Math.PI / 2, 0, 0]}
          scale-z={scale}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
          onPointerMove={handlePointerMove}
          onClick={handleClick}
          castShadow
          receiveShadow
        >
          <animated.meshStandardMaterial
            color={baseColor}
            emissive="#8b5cf6"
            emissiveIntensity={emissiveIntensity}
            metalness={0.15}
            roughness={0.7}
            transparent
            opacity={hasData ? 1 : 0.4}
          />
        </animated.mesh>
      ))}
    </animated.group>
  );
}
