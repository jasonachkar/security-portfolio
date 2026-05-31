import { useEffect, useMemo, useState } from 'react';
import { geoNaturalEarth1, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import { motion, AnimatePresence } from 'framer-motion';

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

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
  classification: string;
  countryCode: string;
  pulseDuration: number;
}

const REGION_BLOBS = [
  { label: 'North America', d: 'M145 166 C180 115 255 95 324 132 C352 160 340 204 304 226 C250 257 178 237 145 198 Z' },
  { label: 'South America', d: 'M309 296 C350 302 377 345 362 404 C349 455 313 488 289 462 C267 433 278 390 257 354 C239 323 268 292 309 296 Z' },
  { label: 'Europe', d: 'M490 145 C529 124 579 132 594 164 C609 192 573 213 529 205 C486 197 458 168 490 145 Z' },
  { label: 'Africa', d: 'M519 235 C575 215 621 254 620 323 C619 390 568 430 527 393 C497 365 494 303 503 262 Z' },
  { label: 'Asia', d: 'M625 151 C724 102 853 135 875 203 C897 270 814 301 722 281 C648 266 586 205 625 151 Z' },
  { label: 'Australia', d: 'M778 369 C821 344 878 354 894 393 C872 426 804 432 769 405 C752 392 759 380 778 369 Z' },
];

function project([longitude, latitude]: [number, number]) {
  const x = ((longitude + 180) / 360) * 1000;
  const y = ((90 - latitude) / 180) * 520;
  return [Math.max(0, Math.min(1000, x)), Math.max(0, Math.min(520, y))] as const;
}

function jitter(value: number, index: number, spread: number) {
  const offset = ((index * 37) % 100) / 100 - 0.5;
  return value + offset * spread;
}

export default function ThreatMap() {
  const [cves, setCVEs] = useState<CVEItem[]>([]);
  const [noiseIPs, setNoiseIPs] = useState<NoiseIP[]>([]);
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [countryPaths, setCountryPaths] = useState<string[]>([]);
  const [selectedCVE, setSelectedCVE] = useState<CVEItem | null>(null);
  const [hoveredMarker, setHoveredMarker] = useState<MapMarker | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapLoading, setMapLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'cves' | 'noise'>('cves');

  useEffect(() => {
    const projection = geoNaturalEarth1().fitSize([1000, 520], { type: 'Sphere' });
    const path = geoPath(projection);

    fetch(GEO_URL)
      .then((response) => response.json())
      .then((topology) => {
        const collection = feature(topology, topology.objects.countries) as unknown as {
          features: Array<Record<string, unknown>>;
        };
        const paths = collection.features
          .map((country) => path(country as never))
          .filter((value): value is string => Boolean(value));
        setCountryPaths(paths);
      })
      .catch(() => setCountryPaths([]))
      .finally(() => setMapLoading(false));
  }, []);

  useEffect(() => {
    Promise.all([
      fetch('/api/threats/cves').then((response) => response.json()),
      fetch('/api/threats/noise').then((response) => response.json()),
    ])
      .then(([cveData, noiseData]) => {
        if (cveData.success) setCVEs(cveData.data);
        if (noiseData.success) {
          setNoiseIPs(noiseData.data);
          const ipMarkers: MapMarker[] = noiseData.data
            .filter((ip: NoiseIP) => COUNTRY_COORDS[ip.country_code])
            .map((ip: NoiseIP, index: number) => {
              const base = COUNTRY_COORDS[ip.country_code];
              return {
                id: `ip-${index}`,
                coordinates: [jitter(base[0], index, 12), jitter(base[1], index + 11, 8)] as [number, number],
                color:
                  ip.classification === 'malicious'
                    ? '#ff3366'
                    : ip.classification === 'benign'
                      ? '#00ff88'
                      : '#ffaa00',
                label: ip.ip,
                classification: ip.classification,
                countryCode: ip.country_code,
                pulseDuration: 2 + (index % 5) * 0.35,
              };
            });
          setMarkers(ipMarkers);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const counts = useMemo(
    () => ({
      malicious: markers.filter((marker) => marker.classification === 'malicious').length,
      suspicious: markers.filter((marker) => marker.classification === 'suspicious').length,
      benign: markers.filter((marker) => marker.classification === 'benign').length,
    }),
    [markers]
  );

  return (
    <div
      style={{
        height: '100vh',
        paddingTop: '52px',
        background: 'var(--bg-primary)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          padding: '0.75rem 1.5rem',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          gap: '1rem',
        }}
      >
        <div>
          <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ff3366' }}>
            Global Threat Intelligence
          </h2>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            NVD CVE feed and GreyNoise-style noisy IP feed. Sample data is labelled when live feeds are unreachable.
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1.1rem', fontSize: '0.74rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ color: '#ff3366' }}>{counts.malicious} malicious</span>
          <span style={{ color: '#ffaa00' }}>{counts.suspicious} suspicious</span>
          <span style={{ color: '#00ff88' }}>{counts.benign} benign</span>
          <span style={{ color: 'var(--text-muted)' }}>{cves.length} CVEs tracked</span>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#060d1a' }}>
          {(loading || mapLoading) && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#060d1a',
                zIndex: 10,
              }}
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  border: '3px solid #1e2d40',
                  borderTop: '3px solid #ff3366',
                }}
              />
            </div>
          )}

          <AnimatePresence>
            {hoveredMarker && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                style={{
                  position: 'absolute',
                  top: 16,
                  left: 16,
                  zIndex: 20,
                  background: 'rgba(10,14,26,0.95)',
                  border: `1px solid ${hoveredMarker.color}66`,
                  borderLeft: `3px solid ${hoveredMarker.color}`,
                  borderRadius: 8,
                  padding: '0.65rem 0.9rem',
                  pointerEvents: 'none',
                }}
              >
                <div style={{ color: hoveredMarker.color, fontWeight: 900, fontSize: '0.8rem', fontFamily: 'monospace' }}>
                  {hoveredMarker.label}
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {hoveredMarker.classification} - {hoveredMarker.countryCode}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <svg
            viewBox="0 0 1000 520"
            role="img"
            aria-label="Global threat activity map"
            style={{ width: '100%', height: '100%', display: 'block', background: '#060d1a' }}
          >
            <defs>
              <radialGradient id="threat-map-glow" cx="50%" cy="50%" r="70%">
                <stop offset="0%" stopColor="rgba(255,51,102,0.16)" />
                <stop offset="100%" stopColor="rgba(255,51,102,0)" />
              </radialGradient>
              <filter id="marker-glow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <rect width="1000" height="520" fill="#060d1a" />
            <ellipse cx="500" cy="260" rx="470" ry="220" fill="url(#threat-map-glow)" />

            {Array.from({ length: 11 }).map((_, index) => (
              <line
                key={`lat-${index}`}
                x1="40"
                x2="960"
                y1={50 + index * 42}
                y2={50 + index * 42}
                stroke="rgba(148, 163, 184, 0.08)"
                strokeWidth="1"
              />
            ))}
            {Array.from({ length: 13 }).map((_, index) => (
              <line
                key={`lon-${index}`}
                y1="35"
                y2="485"
                x1={60 + index * 73}
                x2={60 + index * 73}
                stroke="rgba(148, 163, 184, 0.08)"
                strokeWidth="1"
              />
            ))}

            {countryPaths.length > 0
              ? countryPaths.map((path, index) => (
                  <path
                    key={`country-${index}`}
                    d={path}
                    fill="#0f1e36"
                    stroke="#1e3a5f"
                    strokeWidth="0.45"
                    opacity="0.96"
                  />
                ))
              : REGION_BLOBS.map((region) => (
                  <path
                    key={region.label}
                    d={region.d}
                    fill="#0f1e36"
                    stroke="#1e3a5f"
                    strokeWidth="1.2"
                    opacity="0.96"
                  />
                ))}

            {markers.map((marker) => {
              const [x, y] = countryPaths.length > 0 ? project(marker.coordinates) : project(marker.coordinates);
              return (
                <motion.g
                  key={marker.id}
                  filter="url(#marker-glow)"
                  onMouseEnter={() => setHoveredMarker(marker)}
                  onMouseLeave={() => setHoveredMarker(null)}
                  style={{ cursor: 'pointer' }}
                >
                  <motion.circle
                    cx={x}
                    cy={y}
                    r={8}
                    fill={marker.color}
                    fillOpacity={0}
                    stroke={marker.color}
                    strokeWidth={1.5}
                    animate={{ r: [6, 15, 6], strokeOpacity: [0.85, 0, 0.85] }}
                    transition={{ repeat: Infinity, duration: marker.pulseDuration, ease: 'easeInOut' }}
                  />
                  <circle cx={x} cy={y} r={3.5} fill={marker.color} fillOpacity={0.92} />
                  <circle cx={x} cy={y} r={1.5} fill="#ffffff" opacity={0.9} />
                </motion.g>
              );
            })}
          </svg>

          <div
            style={{
              position: 'absolute',
              bottom: 12,
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              gap: '1.2rem',
              background: 'rgba(6,13,26,0.9)',
              border: '1px solid #1e2d40',
              borderRadius: 8,
              padding: '0.5rem 1rem',
              fontSize: '0.72rem',
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}
          >
            <span style={{ color: '#ff3366' }}>malicious</span>
            <span style={{ color: '#ffaa00' }}>suspicious</span>
            <span style={{ color: '#00ff88' }}>benign</span>
            <span style={{ color: '#64748b' }}>{countryPaths.length > 0 ? 'world-atlas country geometry' : 'fallback regional map'}</span>
          </div>
        </div>

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
                  background: activeTab === tab.id ? 'rgba(255,51,102,0.08)' : 'transparent',
                  borderBottom: activeTab === tab.id ? '2px solid #ff3366' : '2px solid transparent',
                  borderTop: 'none',
                  borderLeft: 'none',
                  borderRight: 'none',
                  color: activeTab === tab.id ? '#ff3366' : 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
            {activeTab === 'cves' &&
              cves.map((cve) => (
                <motion.div
                  key={cve.id}
                  whileHover={{ x: 2 }}
                  onClick={() => setSelectedCVE(selectedCVE?.id === cve.id ? null : cve)}
                  style={{
                    background: selectedCVE?.id === cve.id ? 'rgba(255,51,102,0.08)' : 'var(--bg-card)',
                    border: `1px solid ${selectedCVE?.id === cve.id ? '#ff3366' : 'var(--border)'}`,
                    borderLeft: `3px solid ${SEVERITY_COLOR[cve.severity] || '#64748b'}`,
                    borderRadius: '6px',
                    padding: '0.65rem 0.75rem',
                    marginBottom: '0.4rem',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent-cyan)', fontFamily: 'monospace' }}>
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
                      {cve.severity} {cve.cvssScore !== null ? `(${cve.cvssScore})` : ''}
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
                        style={{ marginTop: '0.5rem', fontSize: '0.68rem', color: 'var(--text-muted)', lineHeight: 1.5, overflow: 'hidden' }}
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
              noiseIPs.map((ip, index) => (
                <div
                  key={`${ip.ip}-${index}`}
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
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
                    {ip.name} - {ip.country_code}
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
