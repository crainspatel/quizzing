'use client';

import React from 'react';
import { TeamScore } from '@/types/quiz';
import { Trophy, Medal, Crown, Sparkles } from 'lucide-react';

interface ScreenScoreboardProps {
  teams: TeamScore[];
  isFinal?: boolean;
  winner?: string;
}

export function ScreenScoreboard({ teams, isFinal, winner }: ScreenScoreboardProps) {
  const sortedTeams = [...teams].sort((a, b) => b.score - a.score);

  return (
    <div className="relative flex h-dvh max-h-dvh w-full flex-col overflow-hidden bg-white p-4 text-slate-900 select-none sm:p-6 md:p-8">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 size-[800px] bg-amber-500/10 rounded-full blur-[180px] pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 flex shrink-0 flex-col items-center border-b border-slate-200 pb-3 text-center sm:pb-4">
        <div className="flex items-center gap-3 mb-2">
          {isFinal ? (
          <Crown className="size-8 text-amber-400" />
          ) : (
            <Trophy className="size-7 text-amber-400" />
          )}
          <h1 className="text-[clamp(1.5rem,4vw,3.5rem)] font-black tracking-tight text-slate-900 font-sans">
            {isFinal ? 'FINAL CHAMPIONSHIP PODIUM' : 'OFFICIAL SCOREBOARD'}
          </h1>
        </div>
        <p className="text-xs text-slate-500 sm:text-sm">
          {isFinal
            ? `Grand Victory! Congratulations to ${winner || sortedTeams[0]?.name || 'the winners'}!`
            : 'Live Standings • Host will return to Board to continue'}
        </p>
      </header>

      {/* Main Leaderboard Section */}
      <main className="relative z-10 mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col justify-center overflow-hidden py-3 sm:py-4">
        <div
          className="grid min-h-0 flex-1 gap-2 sm:gap-3"
          style={{ gridTemplateRows: `repeat(${Math.max(sortedTeams.length, 1)}, minmax(0, 1fr))` }}
        >
          {sortedTeams.map((team, idx) => {
            const isFirst = idx === 0;
            const isSecond = idx === 1;
            const isThird = idx === 2;

            let rankColor = 'bg-zinc-800 text-zinc-400';
            let cardBorder = 'border-slate-200 bg-slate-50';
            let trophyIcon = null;

            if (isFirst) {
              rankColor = 'bg-amber-400 text-zinc-950 font-black shadow-[0_0_20px_#f59e0b]';
              cardBorder = 'border-amber-300 bg-amber-50 shadow-xl shadow-amber-100';
              trophyIcon = <Crown className="size-6 text-amber-400 shrink-0" />;
            } else if (isSecond) {
              rankColor = 'bg-zinc-300 text-zinc-950 font-bold';
              cardBorder = 'border-slate-300 bg-slate-50';
              trophyIcon = <Medal className="size-6 text-zinc-300 shrink-0" />;
            } else if (isThird) {
              rankColor = 'bg-amber-700 text-white font-bold';
              cardBorder = 'border-orange-200 bg-orange-50';
              trophyIcon = <Medal className="size-6 text-amber-600 shrink-0" />;
            }

            return (
              <div
                key={team.name}
                className={`flex min-h-0 items-center justify-between gap-2 overflow-hidden rounded-xl border p-2.5 shadow-md transition-all duration-300 sm:rounded-2xl sm:p-4 ${cardBorder}`}
              >
                <div className="flex items-center gap-4 md:gap-6">
                  <div className={`flex size-8 shrink-0 items-center justify-center rounded-lg font-mono text-sm sm:size-10 sm:text-lg ${rankColor}`}>
                    #{idx + 1}
                  </div>

                  <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                    {trophyIcon}
                  <span className="line-clamp-2 text-[clamp(.85rem,2vw,1.75rem)] font-extrabold tracking-tight text-slate-900">
                      {team.name}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[clamp(1.25rem,3vw,2.75rem)] font-black tracking-tight text-amber-400 font-mono">
                    {team.score}
                  </span>
                  <span className="text-xs uppercase font-mono text-zinc-500 font-semibold self-end mb-1.5">
                    PTS
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 flex shrink-0 items-center justify-between border-t border-slate-200 pt-3 text-[10px] font-mono text-slate-500 sm:pt-4 sm:text-xs">
        <div>STANDINGS CALCULATED REAL-TIME</div>
        <div className="flex items-center gap-1.5">
          <Sparkles className="size-4 text-amber-400/80" />
          <span>Scores driven by Host remote controller</span>
        </div>
      </footer>
    </div>
  );
}
