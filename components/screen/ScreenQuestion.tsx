'use client';

import React from 'react';
import { QuestionType } from '@/types/quiz';

function getPromptFontSize(prompt: string, preview: boolean): string {
  const length = prompt.trim().length;
  if (preview) {
    if (length > 500) return 'clamp(.625rem, 1.4cqw, 1rem)';
    if (length > 360) return 'clamp(.7rem, 1.8cqw, 1.15rem)';
    if (length > 260) return 'clamp(.85rem, 2.7cqw, 1.6rem)';
    return 'clamp(1.15rem, 3.4cqw, 1.9rem)';
  }
  if (length > 500) return 'clamp(1rem, 1.4vw, 1.55rem)';
  if (length > 360) return 'clamp(1.1rem, 1.8vw, 1.9rem)';
  if (length > 260) return 'clamp(1.35rem, 2.7vw, 2.8rem)';
  return 'clamp(1.55rem, 3.4vw, 3.2rem)';
}

function getAnswerFontSize(answer: string): string {
  const length = answer.trim().length;
  if (length > 150) return 'clamp(1rem, 1.8vw, 1.45rem)';
  if (length > 100) return 'clamp(1.15rem, 2.2vw, 1.8rem)';
  if (length > 60) return 'clamp(1.35rem, 2.8vw, 2.3rem)';
  return 'clamp(1.6rem, 3.5vw, 2.8rem)';
}

interface ScreenQuestionProps {
  segmentTitle: string;
  cardIndex: number;
  totalInSegment: number;
  prompt: string;
  description?: string;
  questionType: QuestionType;
  media?: string;
  revealMedia?: string;
  displayMediaOnly?: boolean;
  releaseYear?: string;
  pointsRight: number;
  pointsWrong: number;
  revealedClues: { index: number; text: string }[];
  revealedAnswer?: { answer: string; explanation?: string };
  totalCluesCount: number;
  preview?: boolean;
}

export function ScreenQuestion({
  segmentTitle,
  prompt,
  description,
  media,
  revealMedia,
  displayMediaOnly = false,
  releaseYear,
  pointsRight,
  revealedClues,
  revealedAnswer,
  preview = false,
}: ScreenQuestionProps) {
  const isLogoAnswer = displayMediaOnly || segmentTitle.toLowerCase().includes('logo');
  const showsAddressAnswerImage = segmentTitle.trim().toLowerCase() === 'let me address this';
  const finalAnswerImage = revealMedia && (isLogoAnswer || showsAddressAnswerImage) ? revealMedia : undefined;
  const compactPromptLineBreaks = segmentTitle.trim().toLowerCase() === 'two words one letter apart';

  return (
    <div className={`relative flex ${preview ? 'h-full max-h-full px-3 py-2' : 'h-dvh max-h-dvh px-4 py-4 sm:px-7 sm:py-6 md:px-10 md:py-7'} w-full flex-col overflow-hidden bg-[#f6f5f1] text-slate-950 select-none ${revealedAnswer ? 'uppercase' : ''}`}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_46%,rgba(255,255,255,0.96)_0%,rgba(255,255,255,0.55)_42%,rgba(246,245,241,0)_76%)]" />

      <header className={`relative z-10 mx-auto flex w-full max-w-7xl shrink-0 items-center justify-between gap-4 border-b border-slate-900/10 ${preview ? 'pb-2' : 'pb-4 sm:pb-5'}`}>
        <div className="min-w-0">
          <span className="mb-1 block text-[9px] font-bold uppercase tracking-[0.24em] text-slate-500 sm:text-[10px]">Category</span>
          <h1 className="line-clamp-1 text-left text-[clamp(1.15rem,2.8vw,2rem)] font-black leading-tight tracking-[-0.035em] text-slate-900">
            {segmentTitle}
          </h1>
        </div>
        <div className="flex shrink-0 items-baseline gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-white shadow-[0_8px_24px_rgba(15,23,42,0.16)] sm:gap-2.5 sm:px-5 sm:py-2.5">
          <span className="font-mono text-[clamp(1.25rem,3vw,2.1rem)] font-black leading-none tracking-tight text-amber-300">{pointsRight}</span>
          <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/65 sm:text-[10px]">Points</span>
        </div>
      </header>

      <main className={`relative z-10 mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col justify-center ${preview ? 'gap-2 py-2' : 'gap-4 py-4 sm:gap-5 sm:py-5'}`}>
        {revealedAnswer ? (
          <div className="answer-reveal-enter flex min-h-0 flex-1 flex-col items-center gap-3 sm:gap-4">
            <h2 className="shrink-0 text-center text-[clamp(1.35rem,2.5vw,2rem)] font-bold uppercase tracking-[0.16em] text-slate-500">Answer</h2>
            {!displayMediaOnly && (
              <section className="w-full shrink-0 rounded-2xl border border-slate-200/70 bg-white/70 px-5 py-3.5 text-center sm:px-8 sm:py-4.5">
                <p className="mx-auto max-w-5xl whitespace-pre-wrap text-[clamp(.95rem,1.8vw,1.45rem)] font-medium leading-relaxed tracking-[-0.015em] text-slate-600">{prompt}</p>
              </section>
            )}

            <section className={`flex min-h-0 w-full ${finalAnswerImage ? 'shrink-0 py-5 sm:py-6' : 'flex-1 py-5 sm:py-7'} flex-col items-center justify-center overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/90 px-6 text-center shadow-[0_18px_60px_rgba(15,23,42,0.08)] sm:px-12`}>
              <h2
                className="mx-auto max-w-6xl whitespace-pre-wrap text-balance font-extrabold uppercase leading-[1.12] tracking-[-0.025em] text-slate-950"
                style={{ fontSize: getAnswerFontSize(revealedAnswer.answer) }}
              >
                {revealedAnswer.answer}
              </h2>
            </section>

            {finalAnswerImage && (
              <div className={`flex ${preview ? 'h-[28%] min-h-[70px] max-h-[35%]' : 'h-[45vh] min-h-[220px] max-h-[520px]'} w-full shrink-0 items-center justify-center overflow-hidden rounded-[1.75rem] border border-slate-200/70 bg-white/90 p-2 shadow-[0_16px_48px_rgba(15,23,42,0.06)] sm:p-3`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={finalAnswerImage} alt="Answer visual" className="h-full max-h-full w-full rounded-xl object-contain" />
              </div>
            )}
          </div>
        ) : (
          <>
            {!displayMediaOnly && (
              <section className={`relative flex ${preview ? 'min-h-0 flex-1 px-4 py-3' : 'min-h-[34vh] flex-1 px-6 py-8 sm:px-12 sm:py-10'} flex-col items-center justify-center overflow-hidden rounded-[2rem] border border-white/90 bg-white/75 text-center shadow-[0_24px_90px_rgba(15,23,42,0.08)] ring-1 ring-slate-900/[0.035]`}>
                <div className="mx-auto flex w-full min-w-0 max-w-6xl flex-col items-center">
                  <h2
                    className="w-full min-w-0 max-w-full whitespace-pre-wrap break-words text-balance font-extrabold leading-[1.08] tracking-[-0.045em] text-slate-950"
                    style={{ fontSize: getPromptFontSize(prompt, preview) }}
                  >
                    {prompt.split(/\r?\n+/).filter((line) => line.length > 0).map((line, index) => (
                      <React.Fragment key={`${index}-${line.slice(0, 16)}`}>
                        {index > 0 && !compactPromptLineBreaks && <span aria-hidden="true" className="block h-[1em]" />}
                        <span className="block">{line}</span>
                      </React.Fragment>
                    ))}
                  </h2>
                  {description && <p className={`max-w-4xl whitespace-pre-wrap break-words text-[clamp(1rem,2vw,1.45rem)] leading-relaxed text-slate-600 ${preview ? 'mt-2' : 'mt-5 sm:mt-7'}`}>{description}</p>}
                </div>
              </section>
            )}

            {media && (
              <div className={`flex min-h-0 items-center justify-center overflow-hidden rounded-[1.75rem] border border-white/90 bg-white/85 p-2 shadow-[0_18px_60px_rgba(15,23,42,0.07)] sm:p-3 ${displayMediaOnly || preview ? 'flex-1' : 'max-h-[38vh]'} ${releaseYear ? 'flex-col' : ''}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={media}
                  alt={displayMediaOnly ? 'Poster image' : 'Question visual'}
                  className={`w-full rounded-xl object-contain ${releaseYear ? (displayMediaOnly || preview ? 'min-h-0 flex-1' : 'h-[calc(38vh-3rem)] max-h-full') : 'h-full max-h-full'}`}
                />
                {releaseYear && (
                  <span className="mt-1 shrink-0 text-[clamp(1rem,2vw,1.45rem)] font-medium leading-relaxed text-slate-600">
                    {releaseYear}
                  </span>
                )}
              </div>
            )}

            {revealedClues.length > 0 && (
              <section aria-label="Revealed clues" className="grid max-h-[26vh] shrink-0 grid-cols-1 gap-2 overflow-hidden sm:grid-cols-2 sm:gap-3">
                {revealedClues.map((clue) => (
                  <div key={clue.index} className="flex min-h-0 items-start gap-3 rounded-2xl border border-amber-200 bg-[#fffaf0] px-4 py-3 text-slate-900 shadow-[0_8px_26px_rgba(120,80,0,0.06)] sm:px-5 sm:py-4">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-amber-200/70 font-mono text-xs font-black text-amber-950">{clue.index + 1}</span>
                    <span className="line-clamp-3 text-left text-sm font-medium leading-relaxed sm:text-base">{clue.text}</span>
                  </div>
                ))}
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
