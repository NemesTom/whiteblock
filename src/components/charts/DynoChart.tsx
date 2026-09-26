'use client';

import { useMemo } from 'react';
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
} from 'chart.js';
import { useEngineStore, selectMetrics } from '@/store/useEngineStore';
import { BASE_ENGINES } from '@/lib/physics';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export function DynoChart() {
  const sel = useEngineStore();
  const m = useMemo(
    () =>
      selectMetrics({
        engineId: sel.engineId,
        rodsId: sel.rodsId,
        headId: sel.headId,
        turboId: sel.turboId,
        manifoldId: sel.manifoldId,
        transmissionId: sel.transmissionId,
        sleevesId: sel.sleevesId,
        tuneId: sel.tuneId,
        clutchId: sel.clutchId,
        transCoolerId: sel.transCoolerId,
        boostPsi: sel.boostPsi,
        cutaway: sel.cutaway,
        focusedPart: sel.focusedPart,
      }),
    [sel],
  );
  const engine = BASE_ENGINES[sel.engineId];

  const data = {
    labels: m.curve.map((p) => p.rpm),
    datasets: [
      {
        label: 'Horsepower (WHP)',
        data: m.curve.map((p) => p.hp),
        borderColor: '#38bdf8',
        backgroundColor: 'rgba(56,189,248,0.2)',
        tension: 0.4,
        pointRadius: 0,
      },
      {
        label: 'Torque (Nm)',
        data: m.curve.map((p) => p.tqNm),
        borderColor: '#f472b6',
        backgroundColor: 'rgba(244,114,182,0.2)',
        tension: 0.4,
        pointRadius: 0,
      },
    ],
  };

  return (
    <div className="flex h-full flex-col bg-zinc-950 text-zinc-100">
      <div className="grid grid-cols-2 gap-2 px-4 pt-2 text-xs sm:grid-cols-5">
        <Metric label="Displacement" value={`${m.displacementCc} cc`} />
        <Metric label="Compression" value={`${engine.compressionRatio}:1`} />
        <Metric label="Rod/Stroke" value={String(m.rodStrokeRatio)} />
        <Metric label="VE" value={`${m.volumetricEfficiency}%`} />
        <Metric label="Peak" value={`${m.maxHp} WHP @ ${m.peakHpRpm}`} highlight />
      </div>
      <div className="min-h-0 flex-1 px-2 pb-2">
        <Line
          data={data}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 300 },
            scales: {
              x: { title: { display: true, text: 'RPM' }, ticks: { maxTicksLimit: 8 } },
              y: { title: { display: true, text: 'WHP / Nm' } },
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
