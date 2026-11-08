'use client';

import React from 'react';
import { Users, Tv, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ScreenLobbyProps {
  teams: string[];
}

export function ScreenLobby({ teams }: ScreenLobbyProps) {
  return (
    <div className="relative flex h-dvh max-h-dvh w-full flex-col items-center overflow-hidden bg-white p-4 text-slate-900 select-none sm:p-6 md:p-8">
      {/* Background ambient lighting */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 size-[700px] bg-amber-500/10 rounded-full blur-[160px] pointer-events-none" />

      {/* Top Header */}
      <header className="relative z-10 flex w-full shrink-0 items-center justify-between border-b border-zinc-800/80 pb-3 sm:pb-4">
        <div className="flex items-center gap-3">
          <div className="size-3.5 rounded-full bg-amber-400 shadow-[0_0_12px_#f59e0b]" />
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 font-sans">
            KWIZZ<span className="text-amber-400">ING</span>
          </h1>
        </div>

        <Badge variant="outline" className="px-4 py-1.5 text-sm font-medium border-slate-300 bg-slate-50 text-slate-700">
          <Tv className="size-4 mr-2 text-amber-400 inline" />
          TV STAGE READY
        </Badge>
      </header>

      {/* Center Welcome Stage */}
      <main className="relative z-10 flex min-h-0 w-full max-w-4xl flex-1 flex-col items-center justify-center overflow-hidden py-3 text-center">
        <div className="mb-3 flex size-12 shrink-0 items-center justify-center rounded-2xl border border-amber-500/40 bg-amber-500/20 shadow-[0_0_40px_rgba(245,158,11,0.2)] sm:mb-4 sm:size-16">
          <Sparkles className="size-6 text-amber-400 sm:size-8" />
        </div>

        <h2 className="mb-2 text-[clamp(1.8rem,5vw,4.5rem)] font-black tracking-tight text-white">
          Welcome to Game Night! 🪔
        </h2>
          <p className="mb-4 max-w-2xl text-sm font-light text-slate-600 sm:mb-6 sm:text-lg md:text-xl">
          The host is preparing the quiz board. Assemble your teams and get ready to pounce!
        </p>

        {/* Registered Teams Display */}
        {teams.length > 0 && (
          <div className="w-full">
            <div className="flex items-center justify-center gap-2 text-xs font-mono uppercase text-slate-500 mb-4 tracking-widest">
              <Users className="size-4 text-amber-400" />
              <span>Contending Teams ({teams.length})</span>
            </div>

            <div
              className="grid min-h-0 max-h-[45vh] grid-cols-2 gap-2 overflow-hidden sm:grid-cols-3"
              style={{ gridTemplateRows: `repeat(${Math.max(Math.ceil(teams.length / 3), 1)}, minmax(0, 1fr))` }}
            >
              {teams.map((name, i) => (
                <div
                  key={i}
                  className="flex min-h-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs font-bold text-slate-800 shadow-sm sm:text-base"
                >
                  <span className="text-amber-400 mr-2">#{i + 1}</span>
                  {name}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 flex w-full shrink-0 items-center justify-between border-t border-slate-200 pt-3 text-[10px] font-mono text-slate-500 sm:pt-4 sm:text-xs">
        <div>ZERO-BACKEND LIVING ROOM QUIZ ENGINE</div>
        <div>AWAITING HOST LAUNCH ON LAPTOP</div>
      </footer>
    </div>
  );
}
