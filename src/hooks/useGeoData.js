import { useState, useEffect } from 'react';
import { feature } from 'topojson-client';

const TOPO_URL = 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json';

export default function useGeoData() {
  const [geoData, setGeoData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(TOPO_URL)
      .then(res => res.json())
      .then(topology => {
        const states = feature(topology, topology.objects.states);
        setGeoData(states);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load geo data:', err);
        setLoading(false);
      });
  }, []);

  return { geoData, loading };
}
