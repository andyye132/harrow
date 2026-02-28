import { useRef, useEffect } from 'react';
import { CameraControls } from '@react-three/drei';
import useStore from '../../store/useStore';
import useGeoData from '../../hooks/useGeoData';
import { getStateCentroid } from '../../utils/geoToShape';

// Fixed camera offset from target (keeps the same viewing angle always)
const CAM_OFFSET = { x: 0, y: 5, z: 3.5 };
const DEFAULT_TARGET = [0, 0, -0.5];
// How much to pull toward the state vs stay at center (0=center, 1=state)
const LERP_FACTOR = 0.6;

function lerp(a, b, t) { return a + (b - a) * t; }

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
        // Blend between map center and state centroid so edge states
        // don't pull the camera too far from the rest of the map
        const tx = lerp(DEFAULT_TARGET[0], cx, LERP_FACTOR);
        const tz = lerp(DEFAULT_TARGET[2], cz, LERP_FACTOR);
        ref.current.setLookAt(
          tx + CAM_OFFSET.x, CAM_OFFSET.y, tz + CAM_OFFSET.z,
          tx, 0, tz,
          true
        );
      }
    } else {
      ref.current.setLookAt(
        DEFAULT_TARGET[0] + CAM_OFFSET.x,
        CAM_OFFSET.y + 2,
        DEFAULT_TARGET[2] + CAM_OFFSET.z + 1.5,
        ...DEFAULT_TARGET,
        true
      );
    }
  }, [selectedState, geoData]);

  return (
    <CameraControls
      ref={ref}
      makeDefault
      minDistance={2}
      maxDistance={15}
      minPolarAngle={0.2}
      maxPolarAngle={Math.PI / 2.2}
    />
  );
}
