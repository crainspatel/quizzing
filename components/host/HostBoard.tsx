'use client';

import React from 'react';
import { CardStatus, Quiz, Segment, QnA } from '@/types/quiz';
import { CheckCircle2, Eye } from 'lucide-react';

interface HostBoardProps {
  quiz: Quiz;
  cardStates: Record<string, CardStatus>;
  onSelectCard: (segment: Segment, qna: QnA, cardIndex: number) => void;
  onViewCard: (segment: Segment, qna: QnA, cardIndex: number) => void;
}

const categoryColors = [
  { border: 'border-emerald-200', heading: 'bg-emerald-100 text-emerald-950', card: 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-950' },
  { border: 'border-amber-200', heading: 'bg-amber-100 text-amber-950', card: 'bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-950' },
  { border: 'border-orange-200', heading: 'bg-orange-100 text-orange-950', card: 'bg-orange-50 hover:bg-orange-100 border-orange-200 text-orange-950' },
  { border: 'border-rose-200', heading: 'bg-rose-100 text-rose-950', card: 'bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-950' },
  { border: 'border-blue-200', heading: 'bg-blue-100 text-blue-950', card: 'bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-950' },
  { border: 'border-violet-200', heading: 'bg-violet-100 text-violet-950', card: 'bg-violet-50 hover:bg-violet-100 border-violet-200 text-violet-950' },
  { border: 'border-cyan-200', heading: 'bg-cyan-100 text-cyan-950', card: 'bg-cyan-50 hover:bg-cyan-100 border-cyan-200 text-cyan-950' },
];

export function HostBoard({ quiz, cardStates, onSelectCard, onViewCard }: HostBoardProps) {
  const categoryCount = Math.max(quiz.segments.length, 1);

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-7xl flex-col px-2 py-3 sm:px-3 md:px-5">
      <div className="mb-3 flex shrink-0 items-center justify-between border-b border-zinc-800 pb-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-white sm:text-xl">Host Board</h2>
          <p className="mt-0.5 text-xs text-zinc-400">Select a card, review its question, then choose when to show it.</p>
        </div>
        <span className="font-mono text-xs text-zinc-500">{quiz.segments.length} categories</span>
      </div>

      <div className="min-h-0 w-full flex-1 overflow-hidden pb-1">
        <div
          className="grid h-full w-full min-w-0 gap-2 sm:gap-2.5"
          style={{ gridTemplateColumns: `repeat(${categoryCount}, minmax(0, 1fr))` }}
        >
          {quiz.segments.map((segment, segmentIndex) => {
            const palette = categoryColors[segmentIndex % categoryColors.length];
            const titleSizeVw = 230 / (categoryCount * Math.max(segment.title.length, 1));
            return (
              <section key={segment.id} className={`flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-xl border bg-white sm:rounded-2xl ${palette.border}`}>
                <h3 className={`flex h-20 shrink-0 items-center justify-center px-1.5 text-center font-extrabold uppercase leading-tight tracking-[0.035em] sm:px-2 ${palette.heading}`}>
                  <span className="line-clamp-3 w-full break-normal [text-wrap:balance]" style={{ fontSize: `clamp(.8rem, ${titleSizeVw}vw, 1.125rem)` }}>{segment.title}</span>
                </h3>
                <div className="flex min-h-0 flex-1 flex-col gap-1.5 p-1 sm:gap-2 sm:p-1.5">
                  {segment.questions.map((question, cardIndex) => {
                    const stateKey = `${segment.id}:${question.id}`;
                    const status = cardStates[stateKey] || 'AVAILABLE';
                    const isDone = status === 'DISABLED';
                    const isActive = status === 'ACTIVE';

                    return (
                      <button
                        key={question.id}
                        type="button"
                        onClick={() => isDone ? onViewCard(segment, question, cardIndex) : onSelectCard(segment, question, cardIndex)}
                        aria-label={`${segment.title}, ${question.pointsRight} points${isDone ? ', completed; review question' : ''}`}
                        className={`group relative flex min-h-0 flex-1 items-center justify-center rounded-lg border font-mono text-[clamp(1.2rem,2.2vw,1.9rem)] font-black tracking-tight transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-300 sm:rounded-xl ${
                          isDone
                            ? 'cursor-pointer border-zinc-200 bg-zinc-100 text-zinc-500 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-900'
                            : isActive
                              ? 'border-amber-400 bg-amber-100 text-amber-950 ring-2 ring-amber-300'
                              : `${palette.card} shadow-sm hover:-translate-y-0.5 hover:shadow-md`
                        }`}
                      >
                        {isDone ? (
                          <span className="flex flex-col items-center gap-1">
                            <span>{question.pointsRight}</span>
                            <span className="flex items-center gap-1 font-sans text-[9px] font-bold uppercase tracking-wider"><CheckCircle2 aria-hidden="true" className="size-3" /><Eye aria-hidden="true" className="size-3" />Review</span>
                          </span>
                        ) : question.pointsRight}
                        {isActive && <span className="absolute bottom-1 text-[9px] font-sans font-bold uppercase tracking-wider">In play</span>}
                      </button>
                    );
                  })}
                  {segment.questions.length === 0 && <p className="m-auto text-center text-xs text-zinc-400">No cards in this category</p>}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
