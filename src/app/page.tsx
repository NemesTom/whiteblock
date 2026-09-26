import type { Metadata } from 'next';
import { Sidebar } from '@/components/ui/Sidebar';
import { CutawayToggle } from '@/components/ui/CutawayToggle';
import { StatusBanner } from '@/components/ui/StatusBanner';
import { DynoChart } from '@/components/charts/DynoChart';
import { EngineScene } from '@/components/canvas/EngineScene';

export const metadata: Metadata = {
  title: 'Whiteblock Visualizer & Tuning Configurator',
  description: 'Interactive 3D Volvo Whiteblock tuning simulator with dyno and failure physics.',
};

export default function Page() {
  return (
    <main className="flex h-screen flex-col bg-black text-zinc-100">
      <StatusBanner />
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="h-64 shrink-0 overflow-hidden border-b border-zinc-800 lg:h-auto lg:border-b-0 lg:border-r">
          <Sidebar />
        </div>
        <div className="relative min-h-[320px] min-w-0 flex-1">
          <CutawayToggle />
          <EngineScene />
        </div>
      </div>
      <div className="h-64 shrink-0 border-t border-zinc-800">
        <DynoChart />
      </div>
    </main>
  );
}
