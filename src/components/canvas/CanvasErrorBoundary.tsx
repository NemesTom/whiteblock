'use client';

import { Component, type ReactNode } from 'react';

interface State {
  error: Error | null;
}

interface Props {
  children: ReactNode;
  onReset?: () => void;
}

/**
 * Isolates the WebGL viewport: a 3D exception shows a fallback panel
 * with a reset action instead of unmounting the whole application
 * (sidebar, chart and state survive).
 */
export class CanvasErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error): void {
    console.error('[whiteblock] 3D view crashed:', error);
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-zinc-900 p-6 text-center text-zinc-200">
          <div className="text-sm font-bold">3D view crashed</div>
          <div className="max-w-md font-mono text-[11px] text-zinc-400">{this.state.error.message}</div>
          <button
            onClick={() => {
              this.setState({ error: null });
              this.props.onReset?.();
            }}
            className="rounded-full bg-sky-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-sky-500"
          >
            Reset 3D view
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
