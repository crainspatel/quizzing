'use client';

import React from 'react';
import { CardStatus, QuestionType, Quiz, Segment, QnA } from '@/types/quiz';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Image as ImageIcon, HelpCircle, Link as LinkIcon, CheckCircle2 } from 'lucide-react';

interface HostBoardProps {
  quiz: Quiz;
  cardStates: Record<string, CardStatus>;
  onSelectCard: (segment: Segment, qna: QnA, cardIndex: number) => void;
}

function getTypeIcon(type: QuestionType) {
  switch (type) {
    case 'CLUE_BASED':
      return <Search className="size-3.5 text-amber-400" />;
    case 'IMAGE_BASED':
      return <ImageIcon className="size-3.5 text-purple-400" />;
    case 'CONNECT':
      return <LinkIcon className="size-3.5 text-sky-400" />;
    case 'STANDARD':
    default:
      return <HelpCircle className="size-3.5 text-emerald-400" />;
  }
}

export function HostBoard({ quiz, cardStates, onSelectCard }: HostBoardProps) {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6 md:px-8">
      {/* Instructions header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-800">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Quiz Board Selection
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Select the card declared by teams. TV screen will transition to Curtain buffer until you reveal.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs border-zinc-700 bg-zinc-900 text-zinc-300">
            {quiz.segments.length} Segments
          </Badge>
          <Badge variant="outline" className="text-xs border-zinc-700 bg-zinc-900 text-zinc-300">
            {quiz.segments.reduce((acc, s) => acc + s.questions.length, 0)} Total Cards
          </Badge>
        </div>
      </div>

      {/* Grid of Columns */}
      <div
        className="grid gap-5"
        style={{
          gridTemplateColumns: `repeat(auto-fit, minmax(280px, 1fr))`,
        }}
      >
        {quiz.segments.map((segment) => (
          <div key={segment.id} className="flex flex-col gap-3 bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-4">
            {/* Segment Title */}
            <div className="border-b border-zinc-800 pb-2.5">
              <h3 className="font-bold text-base text-amber-400 line-clamp-1">
                {segment.title}
              </h3>
              {segment.description && (
                <p className="text-xs text-zinc-400 line-clamp-1 mt-0.5">
                  {segment.description}
                </p>
              )}
            </div>

            {/* QnA Cards */}
            <div className="flex flex-col gap-2.5">
              {segment.questions.map((q, idx) => {
                const stateKey = `${segment.id}:${q.id}`;
                const status = cardStates[stateKey] || 'AVAILABLE';
                const isDone = status === 'DISABLED';
                const isActive = status === 'ACTIVE';

                return (
                  <div
                    key={q.id}
                    className={`flex flex-col justify-between p-3.5 rounded-xl border transition-all ${
                      isDone
                        ? 'border-zinc-900 bg-zinc-950/40 opacity-40'
                        : isActive
                        ? 'border-amber-400 bg-amber-950/20 ring-1 ring-amber-400/50'
                        : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900/90'
                    }`}
                  >
                    {/* Header info */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-mono font-bold text-zinc-300">
                          Q{idx + 1}
                        </span>
                        <div className="size-5 rounded flex items-center justify-center bg-zinc-800">
                          {getTypeIcon(q.type)}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 font-mono text-xs">
                        <span className="font-bold text-amber-400">+{q.pointsRight}</span>
                        {q.pointsWrong !== 0 && (
                          <span className="text-rose-400">{q.pointsWrong}</span>
                        )}
                      </div>
                    </div>

                    {/* Question and Answer secret snippet */}
                    <div className="mb-3">
                      <p className="text-xs font-medium text-zinc-200 line-clamp-2 mb-1">
                        {q.prompt}
                      </p>
                      <p className="text-xs font-bold text-emerald-400 line-clamp-1 font-mono">
                        Ans: {q.answer}
                      </p>
                    </div>

                    {/* Button */}
                    <Button
                      size="sm"
                      disabled={isDone}
                      onClick={() => onSelectCard(segment, q, idx)}
                      className={`w-full font-semibold text-xs h-8 ${
                        isDone
                          ? 'bg-zinc-900 text-zinc-600'
                          : isActive
                          ? 'bg-amber-500 hover:bg-amber-600 text-zinc-950'
                          : 'bg-zinc-800 hover:bg-zinc-700 text-white'
                      }`}
                    >
                      {isDone ? (
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="size-3.5" /> Completed
                        </span>
                      ) : isActive ? (
                        'In Play (Reopen)'
                      ) : (
                        'Select Card'
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
