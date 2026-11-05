'use client';

import React, { useEffect, useRef } from 'react';
import { QuestionType } from '@/types/quiz';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, HelpCircle, Image as ImageIcon, Link as LinkIcon, Search, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

interface ScreenQuestionProps {
  segmentTitle: string;
  cardIndex: number;
  totalInSegment: number;
  prompt: string;
  questionType: QuestionType;
  media?: string;
  pointsRight: number;
  pointsWrong: number;
  revealedClues: { index: number; text: string }[];
  revealedAnswer?: { answer: string; explanation?: string };
  totalCluesCount: number;
}

export function ScreenQuestion({
  segmentTitle,
  cardIndex,
  totalInSegment,
  prompt,
  questionType,
  media,
  pointsRight,
  pointsWrong,
  revealedClues,
  revealedAnswer,
  totalCluesCount,
}: ScreenQuestionProps) {
  const hasFiredConfetti = useRef(false);

  useEffect(() => {
    if (revealedAnswer && !hasFiredConfetti.current) {
      hasFiredConfetti.current = true;
      try {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#F59E0B', '#10B981', '#3B82F6', '#EC4899', '#FFFFFF'],
        });
      } catch {
        // Safe fallback if canvas-confetti fails
      }
    }
  }, [revealedAnswer]);

  return (
    <div className="relative flex flex-col min-h-screen w-full bg-[#070709] text-zinc-100 p-8 md:p-14 justify-between select-none overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute -top-32 left-1/3 size-[700px] bg-amber-500/10 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute -bottom-32 right-1/4 size-[700px] bg-indigo-500/10 rounded-full blur-[160px] pointer-events-none" />

      {/* Top Bar Header */}
      <header className="relative z-10 flex items-center justify-between border-b border-zinc-800/80 pb-6">
        <div className="flex items-center gap-4">
          <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-4 py-1.5 text-base font-semibold">
            {segmentTitle}
          </Badge>
          <span className="text-zinc-400 font-mono text-sm">
            Question {cardIndex + 1} of {totalInSegment}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800">
            <span className="text-xs uppercase text-zinc-500 font-mono font-medium">Stakes:</span>
            <span className="text-xl font-black text-amber-400 font-mono">+{pointsRight}</span>
            {pointsWrong !== 0 && (
              <span className="text-base font-bold text-rose-400 font-mono">{pointsWrong}</span>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex flex-col gap-8 my-auto max-w-6xl mx-auto w-full py-8">
        {/* Question Prompt */}
        <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-8 md:p-10 shadow-2xl backdrop-blur-sm">
          <div className="flex items-center gap-2.5 text-amber-400 text-sm font-semibold tracking-wider uppercase mb-3 font-mono">
            {questionType === 'CLUE_BASED' && <Search className="size-4" />}
            {questionType === 'IMAGE_BASED' && <ImageIcon className="size-4" />}
            {questionType === 'CONNECT' && <LinkIcon className="size-4" />}
            {questionType === 'STANDARD' && <HelpCircle className="size-4" />}
            <span>{questionType.replace('_', ' ')} QUESTION</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
            {prompt}
          </h2>
        </div>

        {/* Media (if image-based) */}
        {media && (
          <div className="flex justify-center w-full max-h-[380px] rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950/80 p-2 shadow-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={media}
              alt="Question Visual"
              className="object-contain max-h-[360px] w-auto rounded-xl mx-auto"
            />
          </div>
        )}

        {/* Progressive Clues Section */}
        {totalCluesCount > 0 && (
          <div className="flex flex-col gap-3.5">
            <div className="text-xs uppercase tracking-widest text-zinc-500 font-mono font-semibold">
              Clues &amp; Insights ({revealedClues.length} of {totalCluesCount} Revealed)
            </div>

            <div className="grid gap-3.5 md:grid-cols-2">
              {Array.from({ length: totalCluesCount }).map((_, idx) => {
                const revealed = revealedClues.find((c) => c.index === idx);
                const isRevealed = Boolean(revealed);

                if (!isRevealed) {
                  return (
                    <div
                      key={idx}
                      className="flex items-center gap-3.5 p-4 rounded-xl border border-zinc-900 bg-zinc-950/50 text-zinc-600 transition-all"
                    >
                      <span className="size-7 rounded-lg bg-zinc-900 flex items-center justify-center font-mono text-xs font-semibold text-zinc-600">
                        {idx + 1}
                      </span>
                      <span className="font-mono text-sm tracking-widest text-zinc-700">
                        ••••••••••••••••••••••••••••••••
                      </span>
                    </div>
                  );
                }

                return (
                  <div
                    key={idx}
                    className="flex items-start gap-3.5 p-4 md:p-5 rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-950/30 via-zinc-900 to-zinc-900 text-zinc-100 shadow-lg shadow-amber-950/20 animate-in fade-in slide-in-from-bottom-2 duration-300"
                  >
                    <span className="size-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center font-mono text-xs font-bold text-amber-300 shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="text-lg md:text-xl font-medium leading-relaxed text-zinc-100">
                      {revealed?.text}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Answer Reveal Banner */}
        {revealedAnswer && (
          <div className="relative overflow-hidden rounded-2xl border-2 border-emerald-500/60 bg-gradient-to-br from-emerald-950/60 via-zinc-900 to-zinc-950 p-8 md:p-10 shadow-[0_0_60px_rgba(16,185,129,0.25)] animate-in zoom-in-95 duration-500">
            <div className="flex items-center gap-2.5 text-emerald-400 text-sm font-bold tracking-widest uppercase mb-2 font-mono">
              <CheckCircle2 className="size-5" />
              <span>Verified Answer</span>
              <Sparkles className="size-4 animate-spin" style={{ animationDuration: '4s' }} />
            </div>

            <h3 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight">
              {revealedAnswer.answer}
            </h3>

            {revealedAnswer.explanation && (
              <p className="mt-4 text-base md:text-lg text-emerald-200/80 font-normal border-t border-emerald-900/60 pt-4">
                {revealedAnswer.explanation}
              </p>
            )}
          </div>
        )}
      </main>

      {/* Footer safe status */}
      <footer className="relative z-10 flex items-center justify-between border-t border-zinc-900 pt-5 text-xs font-mono text-zinc-500">
        <div>DISPLAY SYNCHRONIZED</div>
        <div>HOST CONTROLS CLUE PROGRESSION &amp; SCORING</div>
      </footer>
    </div>
  );
}
