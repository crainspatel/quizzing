'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';

interface ScreenCurtainProps {
  selectedCard?: { segmentTitle: string; points: number };
}

export function ScreenCurtain({ selectedCard }: ScreenCurtainProps) {
  return (
    <div className="relative flex h-dvh max-h-dvh w-full flex-col items-center justify-center overflow-hidden bg-white text-slate-900 select-none">
      {/* Ambient background glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.12)_0%,transparent_65%)] pointer-events-none" />
      <div className="absolute -top-40 -right-40 size-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 size-96 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />

      {selectedCard ? (
        <div className="relative z-10 flex max-w-5xl flex-col items-center gap-5 px-6 text-center sm:gap-7">
          <h1 className="text-balance text-[clamp(2.25rem,7vw,5.5rem)] font-black leading-tight tracking-tight text-slate-900">
            {selectedCard.segmentTitle}
          </h1>
          <div className="rounded-3xl border border-amber-200 bg-amber-50 px-10 py-4 text-[clamp(3rem,9vw,6rem)] font-black leading-none tabular-nums tracking-tight text-amber-800 shadow-sm">
            {selectedCard.points}
          </div>
        </div>
      ) : (
        <>
          <div className="relative z-10 flex flex-col items-center text-center px-8 py-12 max-w-2xl">
            <div className="relative flex items-center justify-center size-24 mb-6 rounded-3xl bg-gradient-to-br from-amber-500/20 to-orange-600/10 border border-amber-500/30 shadow-[0_0_50px_rgba(245,158,11,0.2)]">
              <Sparkles className="size-12 text-amber-400" />
            </div>
            <h1 className="text-6xl md:text-7xl font-black tracking-tight text-slate-900 drop-shadow-sm font-sans">
              KWIZZ<span className="text-amber-400">ING</span>
            </h1>
          </div>
        </>
      )}
    </div>
  );
}
