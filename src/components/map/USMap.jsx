import { useMemo } from 'react';
import useGeoData from '../../hooks/useGeoData';
import useStore from '../../store/useStore';
import StateMesh from './StateMesh';
import { FIPS_TO_ABBR } from '../../utils/geoToShape';

export default function USMap() {
  const { geoData, loading } = useGeoData();
  const stateYields = useStore(s => s.stateYields);

  const stateFeatures = useMemo(() => {
    if (!geoData) return [];
    return geoData.features;
  }, [geoData]);

  if (loading || !geoData) return null;

  return (
    <group>
      {stateFeatures.map(feature => {
        const abbr = FIPS_TO_ABBR[feature.id];
        const yieldData = abbr ? stateYields?.[abbr] : null;
        return (
          <StateMesh
            key={feature.id}
            feature={feature}
            yieldData={yieldData}
          />
        );
      })}
    </group>
  );
}
