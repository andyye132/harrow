import { useRef, useEffect } from 'react';
import { CameraControls } from '@react-three/drei';
import useStore from '../../store/useStore';
import useGeoData from '../../hooks/useGeoData';
import { getStateCentroid } from '../../utils/geoToShape';

// Default camera position: overhead angled view
const DEFAULT_POS = [0, 7, 5];
const DEFAULT_TARGET = [0, 0, -0.5];

export default function MapCameraControls() {
  const ref = useRef();
  const selectedState = useStore(s => s.selectedState);
  const { geoData } = useGeoData();

  useEffect(() => {
    if (!ref.current) return;

    if (selectedState && geoData) {
      const feature = geoData.features.find(f => f.id === selectedState);
      if (feature) {
        const [cx, cz] = getStateCentroid(feature);
        // Tilted perspective looking at the state
        ref.current.setLookAt(
          cx, 5, cz + 4,    // camera position
          cx, 0, cz,         // target
          true                // animate
        );
      }
    } else {
      // Reset to default
      ref.current.setLookAt(
        ...DEFAULT_POS,
        ...DEFAULT_TARGET,
        true
      );
    }
  }, [selectedState, geoData]);

  return (
    <CameraControls
      ref={ref}
      makeDefault
      minDistance={3}
      maxDistance={15}
      minPolarAngle={0.2}
      maxPolarAngle={Math.PI / 2.2}
    />
  );
}
