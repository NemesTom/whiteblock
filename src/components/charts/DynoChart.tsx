'use client';

import { useEffect, useMemo, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
  type Chart as ChartType,
  type ChartEvent,
} from 'chart.js';
import { useEngineStore, selectMetrics } from '@/store/useEngineStore';
import { animClock, useAnimRpm } from '@/lib/animClock';
import { BASE_ENGINES, ENGINE_STOCK_BOOST_PSI, ENGINE_STOCK_TURBO, dynoCurve, effectiveBoostTarget, maxRpm } from '@/lib/physics';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

/** Overlay plugin: sweep cursor + peak markers + redline, driven by a live ref. */
const cursorRef: {
  rpm: number;
  redline: number;
  peakHp: { x: number; y: number } | null;
  peakTq: { x: number; y: number } | null;
} = {
  rpm: 800,
  redline: 6500,
  peakHp: null,
  peakTq: null,
};

const dynoOverlay = {
  id: 'dynoOverlay',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  afterDatasetsDraw(chart: any) {
    const { ctx, scales } = chart as { ctx: CanvasRenderingContext2D; scales: Record<string, { getPixelForValue(v: number): number }> };
    const x = scales.x;
    const area = chart.chartArea;
    if (!x || !area) return;
    // Factory redline / limiter marker
    const rx = x.getPixelForValue(cursorRef.redline);
    if (rx >= area.left && rx <= area.right) {
      ctx.save();
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(rx, area.top);
      ctx.lineTo(rx, area.bottom);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#ef4444';
      ctx.font = '10px monospace';
      ctx.fillText('REDLINE', rx - 52, area.top + 12);
      ctx.restore();
    }
    // Sweep cursor
    const px = x.getPixelForValue(cursorRef.rpm);
    if (px >= area.left && px <= area.right) {
      ctx.save();
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(px, area.top);
      ctx.lineTo(px, area.bottom);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#fbbf24';
      ctx.font = '10px monospace';
      ctx.fillText(`${Math.round(cursorRef.rpm)} rpm`, px + 4, area.top + 12);
      ctx.restore();
    }
    // Peak markers
    const yHp = scales.y;
    const yTq = scales.y1;
    ctx.save();
    ctx.font = '10px monospace';
    if (cursorRef.peakHp && yHp) {
      const mx = x.getPixelForValue(cursorRef.peakHp.x);
      const my = yHp.getPixelForValue(cursorRef.peakHp.y);
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(mx, my, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillText(`${cursorRef.peakHp.y}`, mx + 7, my - 6);
    }
    if (cursorRef.peakTq && yTq) {
      const mx = x.getPixelForValue(cursorRef.peakTq.x);
      const my = yTq.getPixelForValue(cursorRef.peakTq.y);
      ctx.fillStyle = '#f472b6';
      ctx.beginPath();
      ctx.arc(mx, my, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillText(`${cursorRef.peakTq.y}`, mx + 7, my + 14);
    }
    ctx.restore();
  },
};

ChartJS.register(dynoOverlay);

export function DynoChart() {
  const engineId = useEngineStore((s) => s.engineId);
  const rodsId = useEngineStore((s) => s.rodsId);
  const headId = useEngineStore((s) => s.headId);
  const turboId = useEngineStore((s) => s.turboId);
  const manifoldId = useEngineStore((s) => s.manifoldId);
  const transmissionId = useEngineStore((s) => s.transmissionId);
  const sleevesId = useEngineStore((s) => s.sleevesId);
  const tuneId = useEngineStore((s) => s.tuneId);
  const clutchId = useEngineStore((s) => s.clutchId);
  const transCoolerId = useEngineStore((s) => s.transCoolerId);
  const boostPsi = useEngineStore((s) => s.boostPsi);
  const set = useEngineStore((s) => s.set);
  const liveRpm = useAnimRpm();
  /** Per-line visibility toggles (legend clicks work too). */
  const [hidden, setHidden] = useState<Record<string, boolean>>({ crank: true });
  const toggleLine = (key: string) => setHidden((h) => ({ ...h, [key]: !h[key] }));

  const cfg = useMemo(
    () => ({ engineId, rodsId, headId, turboId, manifoldId, transmissionId, sleevesId, tuneId, clutchId, transCoolerId, boostPsi }),
    [engineId, rodsId, headId, turboId, manifoldId, transmissionId, sleevesId, tuneId, clutchId, transCoolerId, boostPsi],
  );

  const m = useMemo(
    () =>
      selectMetrics({
        ...cfg,
        cutaway: false,
        cutawayAxis: 'x',
        cutawayOffset: 0.55,
        cutawayFlip: false,
        focusedPart: null,
        animPlaying: true,
        sweepEnabled: false,
        animRpm: 800,
        cycleHighlight: false,
        slowMo: false,
      }),
    [cfg],
  );

  // Ghosted stock baseline for the same engine.
  const baseline = useMemo(() => {
    const stockTurbo = ENGINE_STOCK_TURBO[engineId];
    return dynoCurve({
      engineId,
      rodsId: 'stock-n',
      headId: 'stock-n',
      turboId: stockTurbo,
      manifoldId: engineId === 'B5254T4' ? 'japanifold-s60r' : 'stock',
      transmissionId: 'm56',
      sleevesId: 'stock',
      tuneId: 'stock',
      clutchId: 'stock',
      transCoolerId: 'none',
      boostPsi: ENGINE_STOCK_BOOST_PSI[engineId],
      cutaway: false,
      cutawayAxis: 'x',
      cutawayOffset: 0.55,
      cutawayFlip: false,
      focusedPart: null,
      animPlaying: true,
      sweepEnabled: false,
      animRpm: 800,
      cycleHighlight: false,
      slowMo: false,
    });
  }, [engineId]);

  const engine = BASE_ENGINES[engineId];
  const effBoost = effectiveBoostTarget(cfg);

  const peakHp = m.curve.reduce((a, b) => (b.hp > a.hp ? b : a), m.curve[0]);
  const peakTq = m.curve.reduce((a, b) => (b.tqNm > a.tqNm ? b : a), m.curve[0]);
  // Overlay plugin reads this mutable singleton at draw time; assigned in
  // an effect so render stays pure.
  useEffect(() => {
    cursorRef.rpm = liveRpm;
    cursorRef.redline = engine.redlineRpm;
    cursorRef.peakHp = { x: peakHp.rpm, y: peakHp.hp };
    cursorRef.peakTq = { x: peakTq.rpm, y: peakTq.tqNm };
  });

  const data = {
    labels: m.curve.map((p) => p.rpm),
    datasets: [
      {
        label: 'Horsepower (WHP)',
        data: m.curve.map((p) => p.hp),
        borderColor: '#38bdf8',
        backgroundColor: 'rgba(56,189,248,0.2)',
        tension: 0.35,
        pointRadius: 0,
        yAxisID: 'y',
        hidden: !!hidden.whp,
      },
      {
        label: 'Horsepower (crank)',
        data: m.curve.map((p) => p.hpCrank),
        borderColor: '#fbbf24',
        backgroundColor: 'rgba(251,191,36,0.15)',
        borderDash: [2, 2],
        tension: 0.35,
        pointRadius: 0,
        yAxisID: 'y',
        hidden: !!hidden.crank,
      },
      {
        label: 'Torque (Nm)',
        data: m.curve.map((p) => p.tqNm),
        borderColor: '#f472b6',
        backgroundColor: 'rgba(244,114,182,0.2)',
        tension: 0.35,
        pointRadius: 0,
        yAxisID: 'y1',
        hidden: !!hidden.tq,
      },
      {
        label: 'Stock baseline (WHP)',
        data: baseline.map((p) => p.hp),
        borderColor: '#71717a',
        borderDash: [6, 5],
        tension: 0.35,
        pointRadius: 0,
        yAxisID: 'y',
        hidden: !!hidden.base,
      },
    ],
  };

  const onChartClick = (event: ChartEvent, _els: unknown, chart: ChartType<'line'>) => {
    const xScale = chart.scales.x as unknown as { getValueForPixel(px: number): number };
    const rpm = Math.round(xScale.getValueForPixel(event.x ?? 0) / 50) * 50;
    const clamped = Math.min(maxRpm({ tuneId, engineId }), Math.max(800, rpm));
    animClock.jumpTo(clamped);
    set({ animRpm: clamped, sweepEnabled: false });
  };

  return (
    <div className="flex h-full flex-col bg-zinc-950 text-zinc-100">
      <div className="grid grid-cols-2 gap-2 px-4 pt-2 text-xs sm:grid-cols-8">
        <Metric label="Displacement" value={`${m.displacementCc} cc`} />
        <Metric label="Compression" value={`${engine.compressionRatio}:1`} />
        <Metric label="Rod/Stroke" value={String(m.rodStrokeRatio)} />
        <Metric label="VE" value={`${m.volumetricEfficiency}%`} />
        <Metric label="Boost" value={`${effBoost.toFixed(1)} psi`} />
        <Metric label="Engine speed" value={`${Math.round(liveRpm)} rpm`} />
        <Metric label="Peak wheel" value={`${m.maxHp} WHP @ ${m.peakHpRpm}`} highlight />
        <Metric label="Peak crank" value={`${m.maxCrankHp} hp @ ${m.peakCrankHpRpm}`} />
      </div>
      <div className="flex items-center gap-1.5 px-4 pb-1 pt-1">
        <span className="text-[10px] uppercase tracking-wide text-zinc-500">Lines:</span>
        <LineChip active={!hidden.whp} color="#38bdf8" label="WHP" onClick={() => toggleLine('whp')} />
        <LineChip active={!hidden.crank} color="#fbbf24" label="Crank" onClick={() => toggleLine('crank')} />
        <LineChip active={!hidden.tq} color="#f472b6" label="Torque" onClick={() => toggleLine('tq')} />
        <LineChip active={!hidden.base} color="#71717a" label="Baseline" onClick={() => toggleLine('base')} />
      </div>
      <div className="min-h-0 flex-1 px-2 pb-2" title="Click to move the RPM cursor">
        <Line
          data={data}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 150 },
            onClick: onChartClick as (event: ChartEvent, elements: unknown, chart: ChartType<'line'>) => void,
            scales: {
              x: { title: { display: true, text: 'RPM (click to move cursor)' }, ticks: { maxTicksLimit: 10 } },
              y: { position: 'left', title: { display: true, text: 'WHP' } },
              y1: { position: 'right', title: { display: true, text: 'Nm' }, grid: { drawOnChartArea: false } },
            },
          }}
        />
      </div>
    </div>
  );
}

function Metric({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded px-2 py-1 ${highlight ? 'bg-sky-950' : 'bg-zinc-900'}`}>
      <div className="text-[10px] uppercase tracking-wide text-zinc-400">{label}</div>
      <div className={`font-mono text-sm font-bold ${highlight ? 'text-sky-300' : ''}`}>{value}</div>
    </div>
  );
}

function LineChip({ active, color, label, onClick }: { active: boolean; color: string; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold transition-opacity ${
        active ? 'border-zinc-600 bg-zinc-800 text-zinc-100' : 'border-zinc-800 bg-transparent text-zinc-500 opacity-60'
      }`}
    >
      <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </button>
  );
}
