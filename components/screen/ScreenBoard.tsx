'use client';

import React from 'react';
import { CardStatus, DisplaySegmentInfo, QuestionType, TeamScore } from '@/types/quiz';
import { Search, Image as ImageIcon, HelpCircle, Link as LinkIcon, Tv, Trophy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ScreenBoardProps {
  segments: DisplaySegmentInfo[];
  cardStates: Record<string, CardStatus>;
  teams: TeamScore[];
}

function getTypeIcon(type: QuestionType) {
  switch (type) {
    case 'CLUE_BASED':
      return <Search className="size-5 text-amber-400" aria-label="Clue-based" />;
    case 'IMAGE_BASED':
      return <ImageIcon className="size-5 text-purple-400" aria-label="Image-based" />;
    case 'CONNECT':
      return <LinkIcon className="size-5 text-sky-400" aria-label="Connect" />;
    case 'STANDARD':
    default:
      return <HelpCircle className="size-5 text-emerald-400" aria-label="Standard" />;
  }
}

export function ScreenBoard({ segments, cardStates }: ScreenBoardProps) {
  return (
    <div className="relative flex flex-col min-h-screen w-full bg-[#08080a] text-zinc-100 p-4 md:p-8 select-none justify-between overflow-x-auto">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/4 size-[600px] bg-amber-500/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 size-[600px] bg-orange-600/5 rounded-full blur-[140px] pointer-events-none" />

      {/* Top Header Bar */}
      <header className="relative z-10 flex items-center justify-between border-b border-zinc-800/80 pb-4 mb-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="size-3 rounded-full bg-amber-400 shadow-[0_0_12px_#f59e0b]" />
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white font-sans">
            KWIZZ<span className="text-amber-400">ING</span> BOARD
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <Badge variant="outline" className="px-3 py-1 text-xs md:text-sm font-medium border-zinc-700 bg-zinc-900/90 text-zinc-300">
            <Tv className="size-3.5 mr-1.5 text-amber-400 inline" />
            Live TV Display
          </Badge>
          <div className="text-xs text-zinc-500 font-mono hidden sm:block">
            Scoreboard revealed between rounds by Host
          </div>
        </div>
      </header>

      {/* Main Grid Section */}
      <main className="relative z-10 my-auto py-2 w-full overflow-x-auto pb-6">
        <div
          className="grid gap-3 md:gap-4 min-w-full"
          style={{
            gridTemplateColumns: `repeat(${Math.max(segments.length, 1)}, minmax(180px, 1fr))`,
          }}
        >
          {segments.map((segment) => (
            <div key={segment.id} className="flex flex-col gap-4">
              {/* Segment Column Header */}
              <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 border border-zinc-800 rounded-xl p-4 text-center shadow-md">
                <h2 className="text-lg md:text-xl font-bold tracking-tight text-amber-300 line-clamp-2">
                  {segment.title}
                </h2>
                <div className="text-xs text-zinc-500 mt-1">
                  {segment.questions.length} Questions
                </div>
              </div>

              {/* Cards in Column */}
              <div className="flex flex-col gap-3.5">
                {segment.questions.map((q, idx) => {
                  const stateKey = `${segment.id}:${q.id}`;
                  const status = cardStates[stateKey] || 'AVAILABLE';
                  const isDisabled = status === 'DISABLED';
                  const isActive = status === 'ACTIVE';

                  if (isDisabled) {
                    return (
                      <div
                        key={q.id}
                        className="flex flex-col items-center justify-center min-h-[92px] md:min-h-[110px] rounded-xl border border-zinc-900 bg-zinc-950/40 text-zinc-700 select-none transition-all duration-300 opacity-30"
                      >
                        <span className="text-xs font-mono font-medium tracking-wider text-zinc-600">
                          Q{idx + 1} • COMPLETED
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={q.id}
                      className={`relative flex flex-col items-center justify-between p-4 min-h-[92px] md:min-h-[110px] rounded-xl border transition-all duration-300 shadow-lg ${
                        isActive
                          ? 'border-amber-400 bg-gradient-to-br from-amber-950/40 to-zinc-900 shadow-[0_0_30px_rgba(245,158,11,0.35)] ring-2 ring-amber-400/50 scale-[1.02]'
                          : 'border-zinc-800 hover:border-zinc-700 bg-gradient-to-br from-zinc-900/90 to-zinc-950 text-zinc-100 shadow-zinc-950/50'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-mono text-zinc-400 font-semibold">
                          Q{idx + 1}
                        </span>
                        <div className="size-7 flex items-center justify-center rounded-lg bg-zinc-800/80">
                          {getTypeIcon(q.type)}
                        </div>
                      </div>

                      <div className="flex items-baseline justify-center gap-2 mt-2">
                        <span className="text-2xl md:text-3xl font-black text-amber-400 font-mono tracking-tight">
                          +{q.pointsRight}
                        </span>
                        {q.pointsWrong !== 0 && (
                          <span className="text-sm md:text-base font-semibold text-rose-400 font-mono">
                            {q.pointsWrong}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Footer Info */}
      <footer className="relative z-10 flex items-center justify-between border-t border-zinc-900 pt-4 text-xs font-mono text-zinc-500">
        <div>CHOOSE A CARD FROM THE BOARD</div>
        <div className="flex items-center gap-2">
          <Trophy className="size-4 text-amber-400/80" />
          <span>Host holds master controls &amp; scores</span>
        </div>
      </footer>
    </div>
  );
}
