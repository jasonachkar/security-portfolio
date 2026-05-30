import { useEffect, useState } from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup,
} from 'react-simple-maps';
import { motion, AnimatePresence } from 'framer-motion';

const GEO_URL =
  'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

const COUNTRY_COORDS: Record<string, [number, number]> = {
  US: [-95, 38],
  DE: [10, 51],
  CN: [104, 35],
  RU: [90, 61],
  BR: [-51, -14],
  NL: [5, 52],
  FR: [2, 46],
  GB: [-2, 54],
  IN: [78, 22],
  KR: [127, 36],
  JP: [138, 36],
  CA: [-96, 56],
  AU: [133, -27],
  SG: [103, 1],
  ZA: [25, -29],
  AR: [-64, -34],
  MX: [-102, 23],
  IT: [12, 42],
  ES: [-4, 40],
  PL: [19, 52],
  UA: [31, 49],
  TR: [35, 39],
  ID: [113, -5],
  NG: [8, 9],
  LT: [24, 55],
  XX: [0, 0],
};

const SEVERITY_COLOR: Record<string, string> = {
  CRITICAL: '#ff3366',
  HIGH: '#ff6b35',
  MEDIUM: '#ffaa00',
  LOW: '#00ff88',
  NONE: '#64748b',
};

interface CVEItem {
  id: string;
  description: string;
  cvssScore: number | null;
  severity: string;
  publishedDate: string;
}

interface NoiseIP {
  ip: string;
  classification: string;
  country_code: string;
  name: string;
  last_seen: string;
}

interface MapMarker {
  id: string;
  coordinates: [number, number];
  color: string;
  label: string;
}

export default function ThreatMap() {
  const [cves, setCVEs] = useState<CVEItem[]>([]);
  const [noiseIPs, setNoiseIPs] = useState<NoiseIP[]>([]);
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [selectedCVE, setSelectedCVE] = useState<CVEItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'cves' | 'noise'>('cves');

  useEffect(() => {
    Promise.all([
      fetch('/api/threats/cves').then((r) => r.json()),
      fetch('/api/threats/noise').then((r) => r.json()),
    ])
      .then(([cveData, noiseData]) => {
        if (cveData.success) setCVEs(cveData.data);
        if (noiseData.success) {
          setNoiseIPs(noiseData.data);
          const ipMarkers: MapMarker[] = noiseData.data
            .filter((ip: NoiseIP) => COUNTRY_COORDS[ip.country_code])
            .map((ip: NoiseIP, i: number) => {
              const base = COUNTRY_COORDS[ip.country_code];
              return {
                id: `ip-${i}`,
                coordinates: [
                  base[0] + (Math.random() - 0.5) * 8,
                  base[1] + (Math.random() - 0.5) * 8,
                ] as [number, number],
                color:
                  ip.classification === 'malicious'
                    ? '#ff3366'
                    : ip.classification === 'benign'
                      ? '#00ff88'
                      : '#ffaa00',
                label: ip.ip,
              };
            });
          setMarkers(ipMarkers);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div
      style={{
        height: '100vh',
        paddingTop: '56px',
        background: 'var(--bg-primary)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '0.75rem 1.5rem',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <div>
          <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>
            🌐 Global Threat Intelligence
          </h2>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            Data from the NVD CVE database + GreyNoise community feed (sample set
            used when the live feeds are unreachable)
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.78rem' }}>
          <span style={{ color: '#ff3366' }}>● Malicious</span>
          <span style={{ color: '#ffaa00' }}>● Suspicious</span>
          <span style={{ color: '#00ff88' }}>● Benign</span>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Map */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          {loading && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--bg-primary)',
                zIndex: 10,
              }}
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                style={{
                  width: 32,
                  height: 32,
                  border: '3px solid var(--border)',
                  borderTop: '3px solid var(--accent-cyan)',
                  borderRadius: '50%',
                }}
              />
            </div>
          )}

          <ComposableMap
            projection="geoMercator"
            style={{ width: '100%', height: '100%', background: 'var(--bg-primary)' }}
          >
            <ZoomableGroup zoom={1} minZoom={0.8} maxZoom={8}>
              <Geographies geography={GEO_URL}>
                {({ geographies }) =>
                  geographies.map((geo) => (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      style={{
                        default: {
                          fill: '#111827',
                          stroke: '#1e2d40',
                          strokeWidth: 0.5,
                          outline: 'none',
                        },
                        hover: {
                          fill: '#1a2740',
                          stroke: '#00d4ff',
                          strokeWidth: 0.8,
                          outline: 'none',
                        },
                        pressed: { fill: '#1a2740', outline: 'none' },
                      }}
                    />
                  ))
                }
              </Geographies>

              {markers.map((marker) => (
                <Marker key={marker.id} coordinates={marker.coordinates}>
                  <motion.circle
                    r={4}
                    fill={marker.color}
                    fillOpacity={0.8}
                    stroke={marker.color}
                    strokeWidth={1}
                    animate={{ r: [4, 8, 4], fillOpacity: [0.8, 0.3, 0.8] }}
                    transition={{
                      repeat: Infinity,
                      duration: 2 + Math.random() * 2,
                      ease: 'easeInOut',
                    }}
                  />
                </Marker>
              ))}
            </ZoomableGroup>
          </ComposableMap>
        </div>

        {/* Right sidebar */}
        <div
          style={{
            width: '340px',
            flexShrink: 0,
            background: 'var(--bg-secondary)',
            borderLeft: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            {[
              { id: 'cves', label: `CVEs (${cves.length})` },
              { id: 'noise', label: `Noisy IPs (${noiseIPs.length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'cves' | 'noise')}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: activeTab === tab.id ? 'rgba(0,212,255,0.08)' : 'transparent',
                  borderBottom:
                    activeTab === tab.id
                      ? '2px solid var(--accent-cyan)'
                      : '2px solid transparent',
                  borderTop: 'none',
                  borderLeft: 'none',
                  borderRight: 'none',
                  color: activeTab === tab.id ? 'var(--accent-cyan)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* List */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
            {activeTab === 'cves' &&
              cves.map((cve) => (
                <motion.div
                  key={cve.id}
                  whileHover={{ x: 2 }}
                  onClick={() => setSelectedCVE(selectedCVE?.id === cve.id ? null : cve)}
                  style={{
                    background:
                      selectedCVE?.id === cve.id
                        ? 'rgba(0,212,255,0.08)'
                        : 'var(--bg-card)',
                    border: `1px solid ${
                      selectedCVE?.id === cve.id ? 'var(--accent-cyan)' : 'var(--border)'
                    }`,
                    borderLeft: `3px solid ${SEVERITY_COLOR[cve.severity] || '#64748b'}`,
                    borderRadius: '6px',
                    padding: '0.65rem 0.75rem',
                    marginBottom: '0.4rem',
                    cursor: 'pointer',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '0.25rem',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: 'var(--accent-cyan)',
                        fontFamily: 'monospace',
                      }}
                    >
                      {cve.id}
                    </span>
                    <span
                      style={{
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        color: SEVERITY_COLOR[cve.severity] || '#64748b',
                        background: `${SEVERITY_COLOR[cve.severity]}22`,
                        padding: '0.1rem 0.4rem',
                        borderRadius: '3px',
                      }}
                    >
                      {cve.severity}{' '}
                      {cve.cvssScore !== null ? `(${cve.cvssScore})` : ''}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                    {cve.description.slice(0, 90)}...
                  </div>
                  <AnimatePresence>
                    {selectedCVE?.id === cve.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        style={{
                          marginTop: '0.5rem',
                          fontSize: '0.68rem',
                          color: 'var(--text-muted)',
                          lineHeight: 1.5,
                          overflow: 'hidden',
                        }}
                      >
                        {cve.description}
                        <div style={{ marginTop: '0.4rem', opacity: 0.6 }}>
                          Published: {new Date(cve.publishedDate).toLocaleDateString()}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}

            {activeTab === 'noise' &&
              noiseIPs.map((ip, i) => (
                <div
                  key={i}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderLeft: `3px solid ${
                      ip.classification === 'malicious'
                        ? '#ff3366'
                        : ip.classification === 'benign'
                          ? '#00ff88'
                          : '#ffaa00'
                    }`,
                    borderRadius: '6px',
                    padding: '0.6rem 0.75rem',
                    marginBottom: '0.4rem',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                        fontFamily: 'monospace',
                      }}
                    >
                      {ip.ip}
                    </span>
                    <span
                      style={{
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        color:
                          ip.classification === 'malicious'
                            ? '#ff3366'
                            : ip.classification === 'benign'
                              ? '#00ff88'
                              : '#ffaa00',
                      }}
                    >
                      {ip.classification.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    {ip.name} — {ip.country_code}
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
