import type { Metadata } from 'next';
import { Sidebar } from '@/components/ui/Sidebar';
import { CutawayToggle, CutawayPanel } from '@/components/ui/CutawayToggle';
import { AnimControls } from '@/components/ui/AnimControls';
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
          <div className="absolute right-4 top-4 z-10 flex flex-col items-end gap-2">
            <CutawayToggle />
            <CutawayPanel />
          </div>
          <AnimControls />
          <EngineScene />
        </div>
      </div>
      <div className="h-64 shrink-0 border-t border-zinc-800">
        <DynoChart />
      </div>
    </main>
  );
}
