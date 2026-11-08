'use client';

import React from 'react';
import { CardStatus, DisplaySegmentInfo } from '@/types/quiz';

interface ScreenBoardProps {
  segments: DisplaySegmentInfo[];
  cardStates: Record<string, CardStatus>;
  boardNumber: number;
}

// Keep the public board's category and card treatments in step with HostBoard.
const CATEGORY_PALETTES = [
  { border: 'border-emerald-200', heading: 'bg-emerald-100 text-emerald-950', card: 'bg-emerald-50 border-emerald-200 text-emerald-950' },
  { border: 'border-amber-200', heading: 'bg-amber-100 text-amber-950', card: 'bg-amber-50 border-amber-200 text-amber-950' },
  { border: 'border-orange-200', heading: 'bg-orange-100 text-orange-950', card: 'bg-orange-50 border-orange-200 text-orange-950' },
  { border: 'border-rose-200', heading: 'bg-rose-100 text-rose-950', card: 'bg-rose-50 border-rose-200 text-rose-950' },
  { border: 'border-blue-200', heading: 'bg-blue-100 text-blue-950', card: 'bg-blue-50 border-blue-200 text-blue-950' },
  { border: 'border-violet-200', heading: 'bg-violet-100 text-violet-950', card: 'bg-violet-50 border-violet-200 text-violet-950' },
  { border: 'border-cyan-200', heading: 'bg-cyan-100 text-cyan-950', card: 'bg-cyan-50 border-cyan-200 text-cyan-950' },
];

export function ScreenBoard({ segments, cardStates, boardNumber }: ScreenBoardProps) {
  // The host can curate more than five categories per board; render the same set here.
  const visibleSegments = segments;
  const categoryCount = Math.max(visibleSegments.length, 1);

  return (
    <main className="flex h-dvh max-h-dvh w-full flex-col overflow-hidden bg-white px-2 py-3 text-slate-900 select-none sm:px-3 md:px-5">
      <header className="mx-auto flex h-12 w-full max-w-7xl shrink-0 items-center justify-between border-b border-slate-200 pb-2 sm:h-14">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-black tracking-tight sm:text-2xl">KWIZZING</h1>
          <span className="rounded-md bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-600 sm:px-3 sm:text-xs">
            Board {boardNumber}
          </span>
        </div>
      </header>

      <section
        aria-label="Quiz categories and question cards"
        className="mx-auto grid min-h-0 w-full max-w-7xl flex-1 items-stretch gap-2 pt-3 sm:gap-2.5 sm:pt-4"
        style={{ gridTemplateColumns: `repeat(${categoryCount}, minmax(0, 1fr))` }}
      >
        {visibleSegments.map((segment, segmentIndex) => {
          const palette = CATEGORY_PALETTES[segmentIndex % CATEGORY_PALETTES.length];
          const titleSizeVw = 230 / (categoryCount * Math.max(segment.title.length, 1));
          return (
            <section key={segment.id} className={`flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border bg-white sm:rounded-2xl ${palette.border}`}>
              <h2 className={`flex h-20 shrink-0 items-center justify-center px-1.5 text-center font-extrabold uppercase leading-tight tracking-[0.035em] sm:px-2 ${palette.heading}`}>
                <span className="line-clamp-3 w-full break-normal [text-wrap:balance]" style={{ fontSize: `clamp(.8rem, ${titleSizeVw}vw, 1.125rem)` }}>
                  {segment.title}
                </span>
              </h2>
              <div className="flex min-h-0 flex-1 flex-col gap-1.5 p-1 sm:gap-2 sm:p-1.5">
                {segment.questions.map((question) => {
                  const key = `${segment.id}:${question.id}`;
                  const status = cardStates[key] || 'AVAILABLE';
                  const isDone = status === 'DISABLED';
                  const isActive = status === 'ACTIVE';
                  return (
                    <div
                      key={question.id}
                      className={`relative flex min-h-0 flex-1 items-center justify-center rounded-lg border font-mono text-[clamp(1.2rem,2.2vw,1.9rem)] font-black tracking-tight sm:rounded-xl ${
                        isDone
                          ? 'border-zinc-200 bg-zinc-100 text-zinc-500 opacity-60'
                          : isActive
                            ? 'border-amber-400 bg-amber-100 text-amber-950 ring-2 ring-amber-300'
                            : `${palette.card} shadow-sm`
                      }`}
                    >
                      <span>{question.pointsRight}</span>
                      {isActive && <span className="absolute bottom-1 text-[9px] font-sans font-bold uppercase tracking-wider">In play</span>}
                    </div>
                  );
                })}
                {segment.questions.length === 0 && <p className="m-auto text-center text-xs text-zinc-400">No cards in this category</p>}
              </div>
            </section>
          );
        })}
      </section>
    </main>
  );
}
