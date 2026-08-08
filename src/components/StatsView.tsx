import { MouseEvent, useMemo, useRef, useState } from "react";
import { useAppData } from "../context/AppDataContext";
import {
  dayKey,
  monthKey,
  monthLabel,
  weekKey,
  weekLabel,
} from "../format";
import { Game, GameSession } from "../types";

interface Props {
  game: Game;
}

type Granularity = "week" | "month";
const BUCKET_COUNT = { week: 8, month: 6 } as const;

function segmentDurations(session: GameSession) {
  const sorted = [...session.segments].sort((a, b) => a.createdAt - b.createdAt);
  return sorted.map((seg, i) => {
    const end =
      i < sorted.length - 1 ? sorted[i + 1].createdAt : (session.endedAt ?? seg.createdAt);
    return { modeId: seg.modeId, ms: Math.max(0, end - seg.createdAt) };
  });
}

function computeStreak(sessions: GameSession[]): number {
  const days = new Set(sessions.map((s) => dayKey(s.startedAt)));
  const today = new Date();
  const cursor = new Date(today);
  const todayKey = dayKey(today.getTime());
  if (!days.has(todayKey)) {
    cursor.setDate(cursor.getDate() - 1);
    if (!days.has(dayKey(cursor.getTime()))) return 0;
  }
  let count = 0;
  while (days.has(dayKey(cursor.getTime()))) {
    count += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}

export function StatsView({ game }: Props) {
  const { sessions, settings } = useAppData();
  const [granularity, setGranularity] = useState<Granularity>("week");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  const gameSessions = useMemo(
    () => sessions.filter((s) => s.game === game),
    [sessions, game],
  );
  const endedSessions = useMemo(
    () => gameSessions.filter((s) => s.endedAt !== null),
    [gameSessions],
  );

  const streak = useMemo(() => computeStreak(gameSessions), [gameSessions]);

  const modes = settings.customModes[game];

  const buckets = useMemo(() => {
    const keyFn = granularity === "week" ? weekKey : monthKey;
    const labelFn = granularity === "week" ? weekLabel : monthLabel;
    const count = BUCKET_COUNT[granularity];

    const bucketList: { key: string; label: string; totals: Record<string, number> }[] = [];

    if (granularity === "week") {
      const now = Date.now();
      for (let i = count - 1; i >= 0; i--) {
        const ts = now - i * 7 * 24 * 60 * 60 * 1000;
        bucketList.push({ key: keyFn(ts), label: labelFn(ts), totals: {} });
      }
    } else {
      const base = new Date();
      base.setDate(1);
      base.setHours(0, 0, 0, 0);
      for (let i = count - 1; i >= 0; i--) {
        const d = new Date(base);
        d.setMonth(d.getMonth() - i);
        bucketList.push({ key: keyFn(d.getTime()), label: labelFn(d.getTime()), totals: {} });
      }
    }

    for (const session of endedSessions) {
      const key = keyFn(session.startedAt);
      const bucket = bucketList.find((b) => b.key === key);
      if (!bucket) continue;
      for (const { modeId, ms } of segmentDurations(session)) {
        bucket.totals[modeId] = (bucket.totals[modeId] ?? 0) + ms;
      }
    }

    return bucketList;
  }, [endedSessions, granularity]);

  const CHART_W = 300;
  const CHART_H = 100;

  const maxMinutes = Math.max(
    1,
    ...buckets.flatMap((b) => Object.values(b.totals).map((ms) => ms / 60000)),
  );

  const pointX = (i: number) =>
    buckets.length > 1 ? (i / (buckets.length - 1)) * CHART_W : CHART_W / 2;
  const pointY = (minutes: number) =>
    CHART_H - (minutes / maxMinutes) * CHART_H;

  const lines = modes.map((mode) => {
    const points = buckets.map((b, i) => {
      const minutes = (b.totals[mode.id] ?? 0) / 60000;
      return { x: pointX(i), y: pointY(minutes), minutes };
    });
    return { mode, points };
  });

  function handleChartMouseMove(e: MouseEvent<HTMLDivElement>) {
    if (buckets.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const index = Math.round(ratio * (buckets.length - 1));
    setHoverIndex(Math.min(buckets.length - 1, Math.max(0, index)));
  }

  const hoverLeftPct =
    hoverIndex !== null && buckets.length > 1
      ? (hoverIndex / (buckets.length - 1)) * 100
      : 50;
  const tooltipLeftPct = Math.min(88, Math.max(12, hoverLeftPct));

  const totalMinutesAllTime = Math.round(
    endedSessions.reduce(
      (acc, s) => acc + segmentDurations(s).reduce((a, seg) => a + seg.ms, 0),
      0,
    ) / 60000,
  );

  return (
    <div className="stats-view">
      <div className="stats-cards">
        <div className="stats-card">
          <span className="stats-card-value">{streak}</span>
          <span className="stats-card-label">
            jour{streak > 1 ? "s" : ""} de suite
          </span>
        </div>
        <div className="stats-card">
          <span className="stats-card-value">{endedSessions.length}</span>
          <span className="stats-card-label">
            session{endedSessions.length > 1 ? "s" : ""} au total
          </span>
        </div>
        <div className="stats-card">
          <span className="stats-card-value">
            {totalMinutesAllTime >= 60
              ? `${Math.round(totalMinutesAllTime / 60)}h`
              : `${totalMinutesAllTime}min`}
          </span>
          <span className="stats-card-label">temps joue avec un mode</span>
        </div>
      </div>

      <div className="stats-chart-header">
        <span className="stats-chart-title">Temps joue par mode</span>
        <div className="theme-mode-grid stats-granularity">
          <button
            type="button"
            className={`theme-mode-card ${granularity === "week" ? "is-selected" : ""}`}
            onClick={() => setGranularity("week")}
          >
            Semaine
          </button>
          <button
            type="button"
            className={`theme-mode-card ${granularity === "month" ? "is-selected" : ""}`}
            onClick={() => setGranularity("month")}
          >
            Mois
          </button>
        </div>
      </div>

      <div
        className="stats-chart"
        ref={chartRef}
        onMouseMove={handleChartMouseMove}
        onMouseLeave={() => setHoverIndex(null)}
      >
        <svg
          className="stats-linechart"
          viewBox={`0 0 ${CHART_W} ${CHART_H}`}
          preserveAspectRatio="none"
        >
          <line
            x1={0}
            y1={CHART_H - 0.5}
            x2={CHART_W}
            y2={CHART_H - 0.5}
            className="stats-chart-axis"
          />
          {hoverIndex !== null && (
            <line
              x1={pointX(hoverIndex)}
              y1={0}
              x2={pointX(hoverIndex)}
              y2={CHART_H}
              className="stats-chart-crosshair"
            />
          )}
          {lines.map(({ mode, points }) => (
            <polyline
              key={mode.id}
              points={points.map((p) => `${p.x},${p.y}`).join(" ")}
              fill="none"
              stroke={mode.color}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {lines.map(({ mode, points }) =>
            points.map((p, i) => (
              <circle
                key={`${mode.id}-${i}`}
                cx={p.x}
                cy={p.y}
                r={hoverIndex === i ? 3.4 : 2.2}
                fill={mode.color}
                vectorEffect="non-scaling-stroke"
              />
            )),
          )}
        </svg>

        {hoverIndex !== null && (
          <div
            className="stats-tooltip"
            style={{ left: `${tooltipLeftPct}%` }}
          >
            <div className="stats-tooltip-date">{buckets[hoverIndex].label}</div>
            {lines.map(({ mode, points }) => (
              <div key={mode.id} className="stats-tooltip-row">
                <span
                  className="stats-legend-dot"
                  style={{ backgroundColor: mode.color }}
                />
                <span className="stats-tooltip-mode">{mode.label}</span>
                <span className="stats-tooltip-value">
                  {Math.round(points[hoverIndex].minutes)}min
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="stats-chart-labels">
        {buckets.map((bucket) => (
          <span key={bucket.key} className="stats-bar-label">
            {bucket.label}
          </span>
        ))}
      </div>

      <div className="stats-legend">
        {modes.map((m) => (
          <div key={m.id} className="stats-legend-item">
            <span className="stats-legend-dot" style={{ backgroundColor: m.color }} />
            {m.label}
          </div>
        ))}
      </div>
    </div>
  );
}
