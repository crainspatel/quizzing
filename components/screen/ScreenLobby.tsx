'use client';

import React from 'react';
import { Users, Tv, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ScreenLobbyProps {
  teams: string[];
}

export function ScreenLobby({ teams }: ScreenLobbyProps) {
  return (
    <div className="relative flex flex-col items-center justify-between min-h-screen w-full bg-[#08080a] text-zinc-100 p-8 md:p-14 select-none overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 size-[700px] bg-amber-500/10 rounded-full blur-[160px] pointer-events-none" />

      {/* Top Header */}
      <header className="relative z-10 flex items-center justify-between w-full border-b border-zinc-800/80 pb-6">
        <div className="flex items-center gap-3">
          <div className="size-3.5 rounded-full bg-amber-400 animate-pulse shadow-[0_0_12px_#f59e0b]" />
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white font-sans">
            KWIZZ<span className="text-amber-400">ING</span>
          </h1>
        </div>

        <Badge variant="outline" className="px-4 py-1.5 text-sm font-medium border-zinc-700 bg-zinc-900/90 text-zinc-300">
          <Tv className="size-4 mr-2 text-amber-400 inline" />
          TV STAGE READY
        </Badge>
      </header>

      {/* Center Welcome Stage */}
      <main className="relative z-10 flex flex-col items-center text-center max-w-3xl my-auto py-8">
        <div className="size-20 rounded-3xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(245,158,11,0.2)]">
          <Sparkles className="size-10 text-amber-400" />
        </div>

        <h2 className="text-5xl md:text-7xl font-black tracking-tight text-white mb-4">
          Welcome to Game Night! 🪔
        </h2>
        <p className="text-xl md:text-2xl text-zinc-400 max-w-2xl font-light mb-10">
          The host is preparing the quiz board. Assemble your teams and get ready to pounce!
        </p>

        {/* Registered Teams Display */}
        {teams.length > 0 && (
          <div className="w-full">
            <div className="flex items-center justify-center gap-2 text-xs font-mono uppercase text-zinc-500 mb-4 tracking-widest">
              <Users className="size-4 text-amber-400" />
              <span>Contending Teams ({teams.length})</span>
            </div>

            <div className="flex flex-wrap justify-center gap-3">
              {teams.map((name, i) => (
                <div
                  key={i}
                  className="px-5 py-3 rounded-2xl bg-zinc-900 border border-zinc-800 text-lg md:text-xl font-bold text-zinc-200 shadow-md"
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
      <footer className="relative z-10 flex items-center justify-between w-full border-t border-zinc-900 pt-5 text-xs font-mono text-zinc-500">
        <div>ZERO-BACKEND LIVING ROOM QUIZ ENGINE</div>
        <div>AWAITING HOST LAUNCH ON LAPTOP</div>
      </footer>
    </div>
  );
}
