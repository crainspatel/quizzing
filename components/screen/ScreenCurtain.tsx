'use client';

import React from 'react';
import { Sparkles, Tv } from 'lucide-react';

export function ScreenCurtain() {
  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen w-full bg-[#070709] overflow-hidden select-none">
      {/* Ambient background glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.12)_0%,transparent_65%)] pointer-events-none" />
      <div className="absolute -top-40 -right-40 size-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute -bottom-40 -left-40 size-96 bg-orange-600/10 rounded-full blur-3xl pointer-events-none animate-pulse" />

      {/* Center Stage Card */}
      <div className="relative z-10 flex flex-col items-center text-center px-8 py-12 max-w-2xl">
        <div className="relative flex items-center justify-center size-24 mb-6 rounded-3xl bg-gradient-to-br from-amber-500/20 to-orange-600/10 border border-amber-500/30 shadow-[0_0_50px_rgba(245,158,11,0.2)]">
          <Sparkles className="size-12 text-amber-400 animate-spin" style={{ animationDuration: '12s' }} />
        </div>

        <h1 className="text-6xl md:text-7xl font-black tracking-tight text-white mb-4 drop-shadow-sm font-sans">
          KWIZZ<span className="text-amber-400">ING</span>
        </h1>

        <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-zinc-900/80 border border-zinc-800 text-zinc-400 text-lg font-medium backdrop-blur-md">
          <span className="size-2.5 rounded-full bg-amber-400 animate-ping" />
          <span>Stage Ready • Awaiting Host</span>
        </div>

        <p className="mt-6 text-sm text-zinc-500 max-w-md">
          Living Room & Festive Quiz Engine • Answers remain spoiler-safe until revealed by Host.
        </p>
      </div>

      {/* Subtle Bottom Watermark */}
      <div className="absolute bottom-6 left-8 flex items-center gap-2 text-xs font-mono text-zinc-600">
        <Tv className="size-4 text-amber-500/60" />
        <span>DISPLAY MODE (/screen)</span>
      </div>
    </div>
  );
}
