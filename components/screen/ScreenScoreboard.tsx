'use client';

import React, { useEffect } from 'react';
import { TeamScore } from '@/types/quiz';
import { Trophy, Medal, Crown, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

interface ScreenScoreboardProps {
  teams: TeamScore[];
  isFinal?: boolean;
  winner?: string;
}

export function ScreenScoreboard({ teams, isFinal, winner }: ScreenScoreboardProps) {
  const sortedTeams = [...teams].sort((a, b) => b.score - a.score);

  useEffect(() => {
    if (isFinal) {
      try {
        const end = Date.now() + 3000;
        const interval: NodeJS.Timeout = setInterval(() => {
          if (Date.now() > end) {
            return clearInterval(interval);
          }
          confetti({
            startVelocity: 30,
            spread: 360,
            ticks: 60,
            origin: { x: Math.random(), y: Math.random() - 0.2 },
          });
        }, 300);
        return () => clearInterval(interval);
      } catch {
        // Fallback
      }
    }
  }, [isFinal]);

  return (
    <div className="relative flex flex-col min-h-screen w-full bg-[#070709] text-zinc-100 p-8 md:p-14 justify-between select-none overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 size-[800px] bg-amber-500/10 rounded-full blur-[180px] pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 flex flex-col items-center text-center border-b border-zinc-800/80 pb-6">
        <div className="flex items-center gap-3 mb-2">
          {isFinal ? (
            <Crown className="size-8 text-amber-400 animate-bounce" />
          ) : (
            <Trophy className="size-7 text-amber-400" />
          )}
          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white font-sans">
            {isFinal ? 'FINAL CHAMPIONSHIP PODIUM' : 'OFFICIAL SCOREBOARD'}
          </h1>
        </div>
        <p className="text-zinc-400 text-sm md:text-base">
          {isFinal
            ? `Grand Victory! Congratulations to ${winner || sortedTeams[0]?.name || 'the winners'}!`
            : 'Live Standings • Host will return to Board to continue'}
        </p>
      </header>

      {/* Main Leaderboard Section */}
      <main className="relative z-10 max-w-4xl mx-auto w-full my-auto py-8">
        <div className="flex flex-col gap-4">
          {sortedTeams.map((team, idx) => {
            const isFirst = idx === 0;
            const isSecond = idx === 1;
            const isThird = idx === 2;

            let rankColor = 'bg-zinc-800 text-zinc-400';
            let cardBorder = 'border-zinc-800 bg-zinc-900/80';
            let trophyIcon = null;

            if (isFirst) {
              rankColor = 'bg-amber-400 text-zinc-950 font-black shadow-[0_0_20px_#f59e0b]';
              cardBorder = 'border-amber-400/80 bg-gradient-to-r from-amber-950/40 via-zinc-900 to-zinc-900 shadow-xl shadow-amber-950/30';
              trophyIcon = <Crown className="size-6 text-amber-400 shrink-0" />;
            } else if (isSecond) {
              rankColor = 'bg-zinc-300 text-zinc-950 font-bold';
              cardBorder = 'border-zinc-700 bg-zinc-900/80';
              trophyIcon = <Medal className="size-6 text-zinc-300 shrink-0" />;
            } else if (isThird) {
              rankColor = 'bg-amber-700 text-white font-bold';
              cardBorder = 'border-amber-800/60 bg-zinc-900/80';
              trophyIcon = <Medal className="size-6 text-amber-600 shrink-0" />;
            }

            return (
              <div
                key={team.name}
                className={`flex items-center justify-between p-5 md:p-6 rounded-2xl border transition-all duration-300 ${cardBorder} shadow-lg`}
              >
                <div className="flex items-center gap-4 md:gap-6">
                  <div className={`size-10 md:size-12 rounded-xl flex items-center justify-center font-mono text-lg md:text-xl ${rankColor}`}>
                    #{idx + 1}
                  </div>

                  <div className="flex items-center gap-3">
                    {trophyIcon}
                    <span className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                      {team.name}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-3xl md:text-5xl font-black text-amber-400 font-mono tracking-tight">
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
      <footer className="relative z-10 flex items-center justify-between border-t border-zinc-900 pt-5 text-xs font-mono text-zinc-500">
        <div>STANDINGS CALCULATED REAL-TIME</div>
        <div className="flex items-center gap-1.5">
          <Sparkles className="size-4 text-amber-400/80" />
          <span>Scores driven by Host remote controller</span>
        </div>
      </footer>
    </div>
  );
}
