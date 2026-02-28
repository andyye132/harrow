import { useRef, useMemo } from 'react';
import { useSpring, animated } from '@react-spring/three';
import * as THREE from 'three';
import { geoFeatureToShapes, FIPS_TO_ABBR } from '../../utils/geoToShape';
import { stateColor } from '../../utils/colorScales';
import { getSeasonStatus } from '../../utils/cropStats';
import useStore from '../../store/useStore';

const extrudeSettings = {
  depth: 0.05,
  bevelEnabled: true,
  bevelThickness: 0.003,
  bevelSize: 0.003,
  bevelSegments: 1,
};

// Season-based color functions
function seasonColor(status, avgYield, hasData, theme) {
  if (!hasData) return theme === 'light' ? '#d4d4d4' : '#1e1e1e';
  const isLight = theme === 'light';

  switch (status) {
    case 'growing': {
      // Vibrant green scale based on yield
      const t = Math.max(0, Math.min(1, (avgYield - 30) / 220));
      return isLight
        ? `rgb(${Math.round(80 - t * 40)}, ${Math.round(160 + t * 60)}, ${Math.round(60 - t * 20)})`
        : `rgb(${Math.round(20 + t * 30)}, ${Math.round(100 + t * 100)}, ${Math.round(30 + t * 40)})`;
    }
    case 'harvest': {
      // Amber/gold scale based on yield
      const t = Math.max(0, Math.min(1, (avgYield - 30) / 220));
      return isLight
        ? `rgb(${Math.round(200 + t * 40)}, ${Math.round(150 + t * 30)}, ${Math.round(40 + t * 20)})`
        : `rgb(${Math.round(150 + t * 60)}, ${Math.round(100 + t * 50)}, ${Math.round(10 + t * 20)})`;
    }
    default:
      // Dormant: muted
      return stateColor(avgYield, hasData, theme);
  }
}

export default function StateMesh({ feature, yieldData }) {
  const meshRef = useRef();
  const selectedState = useStore(s => s.selectedState);
  const hoveredState = useStore(s => s.hoveredState);
  const theme = useStore(s => s.theme);
  const selectedMonth = useStore(s => s.selectedMonth);
  const chartCrop = useStore(s => s.chartCrop);
  const setSelectedState = useStore(s => s.setSelectedState);
  const setHoveredState = useStore(s => s.setHoveredState);
  const setPointerPosition = useStore(s => s.setPointerPosition);

  const stateId = feature.id;
  const isSelected = selectedState === stateId;
  const isHovered = hoveredState === stateId;
  const hasData = !!yieldData;

  const shapes = useMemo(() => geoFeatureToShapes(feature), [feature]);

  const avgYield = useMemo(() => {
    if (!yieldData?.crops) return 0;
    const crops = Object.values(yieldData.crops);
    if (crops.length === 0) return 0;
    const allYears = crops.flatMap(c => c.map(y => y.avg_yield));
    return allYears.reduce((a, b) => a + b, 0) / allYears.length;
  }, [yieldData]);

  // Get season status for selected crop and month
  const status = getSeasonStatus(chartCrop, selectedMonth);
  const baseColor = seasonColor(status, avgYield, hasData, theme);
  const isLight = theme === 'light';

  // During growing/harvest season, active states extrude a bit more
  const seasonExtrude = hasData && status !== 'dormant' ? 1.5 : 1;

  const { scale, emissiveIntensity, posY } = useSpring({
    scale: isSelected ? 8 : isHovered ? 2.5 : seasonExtrude,
    emissiveIntensity: isSelected ? 0.4 : isHovered ? 0.25 : (status === 'harvest' && hasData ? 0.1 : 0),
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

  // Emissive color: green glow during growing, amber during harvest
  const emissiveColor = status === 'harvest' ? '#d97706' : (isLight ? '#6d28d9' : '#8b5cf6');

  return (
    <animated.group position-y={posY}>
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
            emissive={emissiveColor}
            emissiveIntensity={emissiveIntensity}
            metalness={isLight ? 0.05 : 0.15}
            roughness={isLight ? 0.8 : 0.7}
            transparent
            opacity={hasData ? 1 : (isLight ? 0.6 : 0.4)}
          />
        </animated.mesh>
      ))}
    </animated.group>
  );
}
