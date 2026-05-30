import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface DataPoint {
  t: string;
  bytes: number;
  anomaly: boolean;
}

const THRESHOLD_BYTES = 5_000_000;
const NORMAL_MIN = 50_000;
const NORMAL_MAX = 800_000;

function randomNormal() {
  return Math.floor(NORMAL_MIN + Math.random() * (NORMAL_MAX - NORMAL_MIN));
}

function timeLabel(value: number) {
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function generateSeed(): DataPoint[] {
  const now = Date.now();
  return Array.from({ length: 20 }, (_, index) => {
    const isSpike = index === 14;
    return {
      t: timeLabel(now - (20 - index) * 2000),
      bytes: isSpike ? 7_500_000 : randomNormal(),
      anomaly: isSpike,
    };
  });
}

function formatBytes(value: number) {
  return value >= 1_000_000 ? `${(value / 1_000_000).toFixed(1)} MB` : `${Math.round(value / 1000)} KB`;
}

export function TrafficSparkline() {
  const [data, setData] = useState<DataPoint[]>(generateSeed);
  const [simulating, setSimulating] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const anomalies = useMemo(() => data.filter((point) => point.anomaly).length, [data]);

  const appendPoint = (bytes: number, anomaly: boolean) => {
    setData((previous) => [...previous.slice(1), { t: timeLabel(Date.now()), bytes, anomaly }]);
  };

  const triggerSpike = () => appendPoint(7_800_000, true);

  const toggleSim = () => {
    if (simulating) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setSimulating(false);
      return;
    }

    setSimulating(true);
    intervalRef.current = setInterval(() => {
      appendPoint(randomNormal(), false);
    }, 900);
  };

  useEffect(
    () => () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    },
    [],
  );

  return (
    <div className="traffic-chart">
      <div className="traffic-chart__header">
        <div className="traffic-chart__meta">
          <span>Source: 10.10.0.15 -&gt; 10.10.0.50:8080</span>
          {anomalies > 0 ? (
            <span className="traffic-chart__alert">
              {anomalies} traffic spike{anomalies > 1 ? 's' : ''} detected
            </span>
          ) : null}
        </div>
        <div className="traffic-chart__actions">
          <button type="button" className="btn btn--ghost btn--sm" onClick={triggerSpike}>
            Inject spike
          </button>
          <button
            type="button"
            className={`btn btn--sm ${simulating ? 'btn--ghost' : 'btn--primary'}`}
            onClick={toggleSim}
          >
            {simulating ? 'Pause' : 'Live sim'}
          </button>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={230}>
        <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="trafficGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--teal)" stopOpacity={0.35} />
              <stop offset="95%" stopColor="var(--teal)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 167, 196, 0.14)" />
          <XAxis dataKey="t" tick={{ fontSize: 11, fill: 'var(--text-mute)' }} minTickGap={20} />
          <YAxis
            tickFormatter={formatBytes}
            tick={{ fontSize: 11, fill: 'var(--text-mute)' }}
            width={70}
          />
          <Tooltip
            formatter={(value) => [formatBytes(Number(value ?? 0)), 'Bytes/window']}
            contentStyle={{
              background: 'rgba(19, 25, 36, 0.98)',
              border: '1px solid rgba(148, 167, 196, 0.26)',
              borderRadius: 10,
              color: 'var(--text)',
              fontSize: 12,
            }}
          />
          <ReferenceLine
            y={THRESHOLD_BYTES}
            stroke="var(--amber)"
            strokeDasharray="6 3"
            label={{ value: '5 MB threshold', fill: 'var(--amber)', fontSize: 11 }}
          />
          <Area
            type="monotone"
            dataKey="bytes"
            stroke="var(--teal)"
            strokeWidth={2}
            fill="url(#trafficGrad)"
            dot={(props: any) =>
              props.payload?.anomaly ? (
                <circle
                  key={props.key}
                  cx={props.cx}
                  cy={props.cy}
                  r={5}
                  fill="var(--amber)"
                  stroke="#0a0e15"
                  strokeWidth={2}
                />
              ) : (
                <circle key={props.key} cx={props.cx} cy={props.cy} r={0} fill="transparent" />
              )
            }
          />
        </AreaChart>
      </ResponsiveContainer>

      <div className="traffic-chart__legend">
        <span>Solid line: bytes/window</span>
        <span>Dashed line: 5 MB spike threshold</span>
        <span>Amber dot: anomaly event</span>
      </div>
    </div>
  );
}
