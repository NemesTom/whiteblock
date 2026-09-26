'use client';

import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

export function Accordion({ title, children, defaultOpen = false }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-zinc-800">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold tracking-wide text-zinc-100 hover:bg-zinc-900"
      >
        <span>{title}</span>
        <ChevronDown size={16} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="px-4 pb-4 pt-1">{children}</div>}
    </div>
  );
}

export function OptionButton({
  active,
  label,
  sub,
  onClick,
}: {
  active: boolean;
  label: string;
  sub?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`mb-1.5 w-full rounded-md border px-3 py-2 text-left text-xs transition-colors ${
        active
          ? 'border-sky-400 bg-sky-950 text-sky-100'
          : 'border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-500'
      }`}
    >
      <div className="font-semibold">{label}</div>
      {sub && <div className="mt-0.5 text-[11px] opacity-70">{sub}</div>}
    </button>
  );
}
