'use client';

import { ArrowLeft, Eye, Image as ImageIcon, Tv } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScreenQuestion } from '@/components/screen/ScreenQuestion';
import { QnA, Segment } from '@/types/quiz';

interface HostCardReviewProps {
  segment: Segment;
  qna: QnA;
  cardIndex: number;
  onClose: () => void;
  onShowQuestionOnTV: () => void;
}

export function HostCardReview({ segment, qna, cardIndex, onClose, onShowQuestionOnTV }: HostCardReviewProps) {
  const clues = qna.clues ?? [];

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-7xl flex-col overflow-hidden px-3 py-2 lg:px-5">
      <header className="mb-2 flex shrink-0 items-center justify-between gap-3 border-b border-zinc-800 pb-2">
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-zinc-300 hover:text-white">
            <ArrowLeft className="mr-1.5 size-4" />
            Back to Board
          </Button>
          <Button size="sm" onClick={onShowQuestionOnTV} className="bg-amber-400 font-bold text-zinc-950 hover:bg-amber-300">
            <Tv className="mr-1.5 size-4" />
            Show Question on TV
          </Button>
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-bold text-white">{segment.title}</span>
          <span className="shrink-0 font-mono text-xs text-zinc-400">{qna.pointsRight} points</span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-sky-800/70 bg-sky-950/60 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-sky-200">
          <Eye className="size-3" />
          Host review · read only
        </div>
      </header>

      <main className="grid min-h-0 flex-1 grid-cols-12 gap-3 overflow-hidden">
        <section aria-label="Question preview" className="col-span-8 min-h-0 overflow-hidden rounded-2xl border border-zinc-800 shadow-xl [container-type:inline-size] xl:col-span-9">
          <ScreenQuestion
            segmentTitle={segment.title}
            cardIndex={cardIndex}
            totalInSegment={segment.questions.length}
            prompt={qna.prompt}
            description={qna.description}
            questionType={qna.type}
            media={qna.media}
            revealMedia={qna.revealMedia}
            displayMediaOnly={qna.displayMediaOnly}
            releaseYear={qna.releaseYear}
            pointsRight={qna.pointsRight}
            pointsWrong={-Math.abs(qna.pointsRight)}
            revealedClues={[]}
            totalCluesCount={clues.length}
            preview
          />
        </section>

        <aside className="col-span-4 flex min-h-0 flex-col gap-2 overflow-hidden xl:col-span-3">
          <section className="shrink-0 rounded-2xl border border-emerald-800/70 bg-zinc-900 p-3 shadow-lg">
            <h2 className="mb-1 text-[9px] font-bold uppercase tracking-[0.2em] text-emerald-400">Answer</h2>
            <p className="break-words text-sm font-extrabold uppercase leading-snug text-emerald-100">{qna.answer}</p>
          </section>

          {qna.revealMedia && (
            <section className="flex h-[30%] min-h-[120px] max-h-[34%] shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-zinc-800 bg-white p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qna.revealMedia} alt="Answer visual" className="h-full max-h-full w-full rounded-xl object-contain" />
            </section>
          )}

          {qna.description && (
            <section className="shrink-0 rounded-xl border border-zinc-800 bg-zinc-900/80 p-3">
              <h2 className="mb-1 text-[9px] font-bold uppercase tracking-[0.18em] text-zinc-400">Additional detail</h2>
              <p className="whitespace-pre-wrap break-words text-xs leading-relaxed text-zinc-200">{qna.description}</p>
            </section>
          )}

          <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/80">
            <h2 className="shrink-0 border-b border-zinc-800 px-3 py-2 text-[9px] font-bold uppercase tracking-[0.18em] text-amber-300">
              Hints · {clues.length}
            </h2>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
              {clues.length > 0 ? clues.map((clue, index) => (
                <div key={`${index}-${clue.slice(0, 16)}`} className="flex items-start gap-2 rounded-lg border border-zinc-800 bg-zinc-950/70 p-2.5">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-amber-400/15 font-mono text-[10px] font-bold text-amber-300">{index + 1}</span>
                  <p className="whitespace-pre-wrap break-words text-xs leading-relaxed text-zinc-200">{clue}</p>
                </div>
              )) : (
                <div className="flex h-full items-center justify-center gap-2 text-xs text-zinc-500">
                  <ImageIcon className="size-4" />
                  No hints for this card
                </div>
              )}
            </div>
          </section>
        </aside>
      </main>
    </div>
  );
}
