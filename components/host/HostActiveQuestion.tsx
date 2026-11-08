'use client';

import React, { useState, useEffect } from 'react';
import { Segment, QnA, TeamScore, DisplayCommand } from '@/types/quiz';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  Tv,
  ArrowLeft,
  Eye,
  Sparkles,
  Undo2,
} from 'lucide-react';
import { sounds } from '@/lib/sound';
import { ScreenQuestion } from '@/components/screen/ScreenQuestion';

function getAnswerSize(text: string): string {
  const length = text.trim().length;
  if (length > 180) return 'clamp(.78rem, .95vw, .9rem)';
  if (length > 110) return 'clamp(.85rem, 1.05vw, 1rem)';
  if (length > 60) return 'clamp(.95rem, 1.2vw, 1.15rem)';
  return 'clamp(1rem, 1.45vw, 1.35rem)';
}

interface HostActiveQuestionProps {
  segment: Segment;
  qna: QnA;
  cardIndex: number;
  teams: TeamScore[];
  currentDisplayCommand: DisplayCommand | null;
  onSendCommand: (cmd: DisplayCommand) => void;
  onUpdateClues: (clues: string[]) => void;
  onAwardScore: (teamName: string, delta: number) => void;
  onUndoScore: () => void;
  canUndo: boolean;
  onCompleteCard: () => void;
  onCancelCard: () => void;
  activeCardProgress?: { revealedClueIndices?: number[]; isQuestionShown?: boolean; isAnswerRevealed?: boolean };
}

export function HostActiveQuestion({
  segment,
  qna,
  cardIndex,
  teams,
  currentDisplayCommand,
  onSendCommand,
  onUpdateClues,
  onAwardScore,
  onUndoScore,
  canUndo,
  onCompleteCard,
  onCancelCard,
  activeCardProgress,
}: HostActiveQuestionProps) {
  const [revealedClueIndices, setRevealedClueIndices] = useState<number[]>(activeCardProgress?.revealedClueIndices ?? []);
  const [localQuestionPushed, setLocalQuestionPushed] = useState(activeCardProgress?.isQuestionShown ?? false);
  const [localAnswerPushed, setLocalAnswerPushed] = useState(activeCardProgress?.isAnswerRevealed ?? false);
  const [customHint, setCustomHint] = useState('');

  // Derived state (Vercel React best practice: derive during render, no effect)
  const isQuestionShownOnTV =
    localQuestionPushed ||
    currentDisplayCommand?.type === 'SHOW_QUESTION' ||
    currentDisplayCommand?.type === 'REVEAL_CLUE' ||
    currentDisplayCommand?.type === 'UPDATE_CLUE' ||
    currentDisplayCommand?.type === 'HIDE_CLUE' ||
    currentDisplayCommand?.type === 'REVEAL_ANSWER';

  const isAnswerRevealedOnTV =
    localAnswerPushed || currentDisplayCommand?.type === 'REVEAL_ANSWER';

  const clues = qna.clues || [];
  const wrongPoints = -Math.abs(qna.pointsRight);
  const nextClueIndex = clues.findIndex((_, i) => !revealedClueIndices.includes(i));

  function triggerShowQuestionOnTV() {
    setLocalQuestionPushed(true);
    onSendCommand({
      type: 'SHOW_QUESTION',
      segmentTitle: segment.title,
      cardIndex,
      totalInSegment: segment.questions.length,
      prompt: qna.prompt,
      description: qna.description,
      questionType: qna.type,
      media: qna.media,
      revealMedia: qna.revealMedia,
      displayMediaOnly: qna.displayMediaOnly,
      releaseYear: qna.releaseYear,
      pointsRight: qna.pointsRight,
      pointsWrong: wrongPoints,
      clueCount: clues.length,
    });
  }

  function revealClue(index: number) {
    if (revealedClueIndices.includes(index) || !clues[index]) return;
    setRevealedClueIndices((prev) => [...prev, index]);
    onSendCommand({
      type: 'REVEAL_CLUE',
      index,
      text: clues[index],
    });
    sounds.playClueReveal();
  }

  function hideClue(index: number) {
    if (!revealedClueIndices.includes(index)) return;
    setRevealedClueIndices((prev) => prev.filter((revealedIndex) => revealedIndex !== index));
    onSendCommand({ type: 'HIDE_CLUE', index });
  }

  function editClue(index: number, text: string) {
    const updatedClues = clues.map((clue, clueIndex) => clueIndex === index ? text : clue);
    onUpdateClues(updatedClues);
    if (revealedClueIndices.includes(index)) {
      onSendCommand({ type: 'UPDATE_CLUE', index, text });
    }
  }

  function addCustomHint() {
    const text = customHint.trim();
    if (!text) return;
    onUpdateClues([...clues, text]);
    setCustomHint('');
  }

  function revealNextClue() {
    if (nextClueIndex !== -1) {
      revealClue(nextClueIndex);
    }
  }

  function triggerRevealAnswer() {
    if (isAnswerRevealedOnTV) return;
    setLocalAnswerPushed(true);
    onSendCommand({
      type: 'REVEAL_ANSWER',
      answer: qna.answer,
      explanation: qna.explanation,
    });
    sounds.playAnswerReveal();
  }

  // Keyboard shortcut handler
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target;
      if (target instanceof HTMLElement && target.closest('input, textarea, select, [contenteditable="true"], [role="textbox"]')) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        if (!isQuestionShownOnTV) {
          triggerShowQuestionOnTV();
        } else {
          revealNextClue();
        }
      } else if (e.code === 'Escape') {
        e.preventDefault();
        onCompleteCard();
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && !e.altKey && e.code === 'KeyA') {
        e.preventDefault();
        triggerRevealAnswer();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  function handleScoreClick(teamName: string, delta: number) {
    onAwardScore(teamName, delta);
    if (delta > 0) {
      sounds.playPositiveScore();
    } else if (delta < 0) {
      sounds.playWrong();
    }
  }

  function handleCustomScore(teamName: string) {
    const input = prompt(`Enter custom score delta for ${teamName} (e.g. 5, -3):`);
    if (!input) return;
    const num = Number(input);
    if (Number.isFinite(num)) {
      handleScoreClick(teamName, num);
    }
  }

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-7xl flex-col overflow-hidden px-3 py-2 lg:px-5">
      {/* Top Navigation Bar */}
      <div className="mb-2 flex shrink-0 items-center justify-between gap-1.5 border-b border-zinc-800 pb-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancelCard}
          className="text-zinc-400 hover:text-white"
        >
          <ArrowLeft className="size-4 mr-1.5" />
          Cancel &amp; Keep Available
        </Button>

        <div className="flex items-center gap-2">
          <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-xs font-semibold">
            {segment.title}
          </Badge>
          <span className="text-zinc-500 font-mono text-xs">
            Card Q{cardIndex + 1}
          </span>
        </div>

        <Button
          size="sm"
          onClick={onCompleteCard}
          title="Complete Card & Back to Board"
          className="whitespace-nowrap bg-emerald-600 text-[10px] font-semibold text-white hover:bg-emerald-700 sm:text-xs"
        >
          <CheckCircle2 className="mr-1 size-4" />
          Complete &amp; Back
        </Button>
      </div>

      {/* Keep the host-only answer visible without pushing the rest of the controls below the fold. */}
      <section className="mb-2 flex shrink-0 items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 sm:gap-4 sm:px-4">
        <div className="min-w-0 flex-1">
          <span className="mb-0.5 block text-[9px] font-bold uppercase tracking-wider text-emerald-400">Host Answer</span>
          <h2 className="line-clamp-2 whitespace-pre-wrap font-extrabold uppercase leading-tight text-emerald-200" style={{ fontSize: getAnswerSize(qna.answer) }}>{qna.answer}</h2>
          {qna.explanation && <p className="mt-0.5 line-clamp-1 text-[10px] leading-snug text-zinc-400">{qna.explanation}</p>}
        </div>
        {!isAnswerRevealedOnTV ? (
          <Button onClick={triggerRevealAnswer} className="h-9 shrink-0 bg-emerald-600 px-3 text-[10px] font-bold text-white hover:bg-emerald-500 sm:text-xs">
            <Sparkles className="mr-1.5 size-3.5" />
            Reveal Answer
          </Button>
        ) : (
          <Badge className="shrink-0 border border-emerald-500/40 bg-emerald-500/15 text-[10px] text-emerald-300">Revealed on TV</Badge>
        )}
      </section>

      <div className="grid min-h-0 flex-1 grid-cols-12 gap-2.5 overflow-hidden lg:gap-3">
        {/* Preview uses the exact same question renderer as the public screen. */}
        <div className="col-span-8 flex min-h-0 flex-col gap-2 xl:col-span-9">
          <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-zinc-800 shadow-xl [container-type:inline-size]">
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
              pointsWrong={wrongPoints}
              revealedClues={revealedClueIndices.flatMap((index) => clues[index] ? [{ index, text: clues[index] }] : [])}
              totalCluesCount={clues.length}
              preview
            />
          </div>

          {/* TV action stays in a fixed position across text and image cards. */}
          <div className="flex shrink-0 items-center justify-between gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2">
              <div className="flex items-center gap-2 text-xs font-mono">
                <Tv className="size-4 text-zinc-500" />
                <span className={isQuestionShownOnTV ? 'text-emerald-400 font-semibold' : 'text-amber-400'}>
                  {isQuestionShownOnTV ? 'Prompt visible on TV' : 'Hidden behind Curtain'}
                </span>
              </div>

              {!isQuestionShownOnTV ? (
                <Button
                  size="sm"
                  onClick={triggerShowQuestionOnTV}
                  className="bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold text-xs"
                >
                  <Eye className="size-3.5 mr-1" />
                  Show Question on TV (Space)
                </Button>
              ) : (
                <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 text-xs">
                  Active on TV
                </Badge>
              )}
          </div>

          {/* Clues Section */}
            <details className="shrink-0 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 shadow-xl">
              <summary className="cursor-pointer select-none px-3 py-2.5 text-xs font-bold text-zinc-200 marker:text-amber-400">
                Hints &amp; clues <span className="ml-1 font-mono font-normal text-zinc-500">({clues.length})</span>
              </summary>
              <div className="max-h-[32vh] overflow-y-auto overscroll-contain border-t border-zinc-800 p-3 sm:p-4">
              <div className="mb-2 flex shrink-0 items-center justify-between gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-200 font-mono">
                  Progressive Hints / Clues ({revealedClueIndices.length}/{clues.length} on TV)
                </h3>

                {nextClueIndex !== -1 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={revealNextClue}
                    disabled={!isQuestionShownOnTV}
                    className="border-amber-500/40 text-amber-400 hover:bg-amber-950/40 text-xs font-semibold h-7"
                  >
                    Reveal Next Clue (Space)
                  </Button>
                )}
              </div>

              <div className="pr-1">
                {clues.length > 0 ? <div className="flex flex-col gap-2">
                {clues.map((clueText, idx) => {
                  const isRevealed = revealedClueIndices.includes(idx);

                  return (
                    <div
                      key={idx}
                      className={`flex items-start justify-between gap-2 rounded-xl border p-2 transition-all ${
                        isRevealed
                          ? 'border-amber-500/40 bg-amber-950/20 text-zinc-100'
                          : 'border-zinc-800 bg-zinc-950/40 text-zinc-400'
                      }`}
                    >
                      <div className="flex min-w-0 flex-1 items-start gap-2">
                        <span className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md font-mono text-xs font-bold ${
                          isRevealed ? 'bg-amber-400 text-zinc-950' : 'bg-zinc-800 text-zinc-500'
                        }`}>
                          {idx + 1}
                        </span>
                        <textarea
                          aria-label={`Edit hint ${idx + 1}`}
                          value={clueText}
                          onChange={(event) => editClue(idx, event.target.value)}
                          rows={2}
                          className="min-h-9 w-full resize-none rounded-lg border border-zinc-800 bg-zinc-900/80 px-2.5 py-1.5 text-xs leading-relaxed text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30"
                        />
                      </div>

                      <Button
                        size="sm"
                        variant={isRevealed ? 'ghost' : 'outline'}
                        disabled={!isRevealed && !isQuestionShownOnTV}
                        onClick={() => isRevealed ? hideClue(idx) : revealClue(idx)}
                        className={`h-7 shrink-0 text-xs ${
                          isRevealed
                            ? 'text-amber-300 hover:bg-amber-950/40 hover:text-amber-200'
                            : 'border-zinc-700 hover:border-amber-400 text-zinc-300'
                        }`}
                      >
                        {isRevealed ? <><Undo2 className="mr-1 size-3" />Take Back</> : 'Reveal'}
                      </Button>
                    </div>
                  );
                })}
              </div> : <p className="py-3 text-center text-xs text-zinc-500">No hints for this question.</p>}
              </div>

              <div className="mt-2 shrink-0 border-t border-zinc-800 pt-2">
                <label htmlFor="custom-hint" className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-zinc-300">
                  Custom Hint
                </label>
                <div className="flex items-end gap-2">
                  <textarea
                    id="custom-hint"
                    aria-label="Write a custom hint"
                    value={customHint}
                    onChange={(event) => setCustomHint(event.target.value)}
                    placeholder="Write a hint for this question…"
                    rows={1}
                    className="min-h-9 flex-1 resize-none rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30"
                  />
                  <Button size="sm" onClick={addCustomHint} disabled={!customHint.trim()} className="h-9 bg-amber-500 font-bold text-zinc-950 hover:bg-amber-400">
                    Add Hint
                  </Button>
                </div>
              </div>
              </div>
            </details>

        </div>

        {/* Right Column: Scoring Pad & Team Controls (5 cols) */}
        <div className="col-span-4 flex min-h-0 flex-col xl:col-span-3">
          <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 p-2 shadow-xl sm:p-3">
            <div className="mb-2 flex shrink-0 items-center justify-between border-b border-zinc-800 pb-2">
              <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-200 font-mono">Scoring</h3>

              {canUndo && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onUndoScore}
                  className="text-zinc-400 hover:text-white text-xs h-7 px-2"
                >
                  <Undo2 className="size-3.5 mr-1" /> Undo
                </Button>
              )}
            </div>

            <div className="flex min-h-0 flex-1 flex-col justify-around gap-2 overflow-hidden">
              {teams.map((team) => (
                <div
                  key={team.name}
                  className="flex shrink-0 flex-col gap-1.5 rounded-xl border border-zinc-800 bg-zinc-950/70 p-2"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="min-w-0 truncate text-xs font-bold tracking-tight text-white">
                      {team.name}
                    </span>
                    <span className="shrink-0 whitespace-nowrap font-mono text-sm font-black text-amber-400" title={`${team.score} points`}>
                      {team.score}
                    </span>
                  </div>

                  {/* Point Action Buttons */}
                  <div className="grid grid-cols-3 gap-1.5">
                    <Button
                      size="sm"
                      onClick={() => handleScoreClick(team.name, qna.pointsRight)}
                      className="h-7 bg-emerald-600 text-[10px] font-mono font-bold text-white hover:bg-emerald-500"
                    >
                      +{qna.pointsRight}
                    </Button>

                    <Button
                      size="sm"
                      onClick={() => handleScoreClick(team.name, wrongPoints)}
                      className="h-7 border border-rose-800/50 bg-rose-900/60 text-[10px] font-mono font-bold text-rose-200 hover:bg-rose-800"
                    >
                      {wrongPoints}
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCustomScore(team.name)}
                      aria-label={`Custom score for ${team.name}`}
                      className="h-7 border-zinc-700 text-[10px] font-mono text-zinc-300 hover:border-zinc-500"
                    >
                      ±
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Keyboard Reference */}
            <div className="mt-auto hidden shrink-0 border-t border-zinc-800 pt-2 text-[10px] font-mono text-zinc-500 xl:flex xl:flex-col xl:gap-1">
              <div><kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">Space</kbd> Show / Reveal Next Hint</div>
              <div><kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">Ctrl/⌘ + Shift + A</kbd> Reveal Answer</div>
              <div><kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">Esc</kbd> Complete &amp; Return to Board</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
