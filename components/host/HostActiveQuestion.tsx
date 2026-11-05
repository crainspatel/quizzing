'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Segment, QnA, TeamScore, DisplayCommand } from '@/types/quiz';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  Tv,
  ArrowLeft,
  Search,
  Eye,
  Sparkles,
  Undo2,
  AlertTriangle,
  HelpCircle,
  Link as LinkIcon,
  Image as ImageIcon,
} from 'lucide-react';
import { sounds } from '@/lib/sound';

interface HostActiveQuestionProps {
  segment: Segment;
  qna: QnA;
  cardIndex: number;
  teams: TeamScore[];
  currentDisplayCommand: DisplayCommand | null;
  onSendCommand: (cmd: DisplayCommand) => void;
  onAwardScore: (teamName: string, delta: number) => void;
  onUndoScore: () => void;
  canUndo: boolean;
  onCompleteCard: () => void;
  onCancelCard: () => void;
}

export function HostActiveQuestion({
  segment,
  qna,
  cardIndex,
  teams,
  currentDisplayCommand,
  onSendCommand,
  onAwardScore,
  onUndoScore,
  canUndo,
  onCompleteCard,
  onCancelCard,
}: HostActiveQuestionProps) {
  const [revealedClueIndices, setRevealedClueIndices] = useState<number[]>([]);
  const [localQuestionPushed, setLocalQuestionPushed] = useState(false);
  const [localAnswerPushed, setLocalAnswerPushed] = useState(false);

  // Hold-to-reveal answer state
  const [answerHoldProgress, setAnswerHoldProgress] = useState(0);
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Derived state (Vercel React best practice: derive during render, no effect)
  const isQuestionShownOnTV =
    localQuestionPushed ||
    currentDisplayCommand?.type === 'SHOW_QUESTION' ||
    currentDisplayCommand?.type === 'REVEAL_CLUE' ||
    currentDisplayCommand?.type === 'REVEAL_ANSWER';

  const isAnswerRevealedOnTV =
    localAnswerPushed || currentDisplayCommand?.type === 'REVEAL_ANSWER';

  const clues = qna.clues || [];
  const nextClueIndex = clues.findIndex((_, i) => !revealedClueIndices.includes(i));

  function triggerShowQuestionOnTV() {
    setLocalQuestionPushed(true);
    onSendCommand({
      type: 'SHOW_QUESTION',
      segmentTitle: segment.title,
      cardIndex,
      totalInSegment: segment.questions.length,
      prompt: qna.prompt,
      questionType: qna.type,
      media: qna.media,
      pointsRight: qna.pointsRight,
      pointsWrong: qna.pointsWrong,
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

  function revealNextClue() {
    if (nextClueIndex !== -1) {
      revealClue(nextClueIndex);
    }
  }

  function startHoldAnswer() {
    if (isAnswerRevealedOnTV) return;
    let progress = 0;
    setAnswerHoldProgress(10);

    holdTimerRef.current = setInterval(() => {
      progress += 25;
      setAnswerHoldProgress(progress);
      if (progress >= 100) {
        clearInterval(holdTimerRef.current!);
        holdTimerRef.current = null;
        triggerRevealAnswer();
      }
    }, 75);
  }

  function cancelHoldAnswer() {
    if (holdTimerRef.current) {
      clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    setAnswerHoldProgress(0);
  }

  function triggerRevealAnswer() {
    setLocalAnswerPushed(true);
    setAnswerHoldProgress(0);
    onSendCommand({
      type: 'REVEAL_ANSWER',
      answer: qna.answer,
      explanation: qna.explanation,
    });
    sounds.playCorrect();
  }

  // Keyboard shortcut handler
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
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
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  function handleScoreClick(teamName: string, delta: number) {
    onAwardScore(teamName, delta);
    if (delta > 0) {
      sounds.playCorrect();
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
    <div className="w-full max-w-5xl mx-auto px-4 py-6 md:px-8">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-zinc-800 mb-6">
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
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs"
        >
          <CheckCircle2 className="size-4 mr-1.5" />
          Complete Card &amp; Back to Board
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Question Details & TV Progression Controls (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* Question Prompt Card */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs uppercase font-mono font-bold text-amber-400 flex items-center gap-1.5">
                {qna.type === 'CLUE_BASED' && <Search className="size-3.5" />}
                {qna.type === 'IMAGE_BASED' && <ImageIcon className="size-3.5" />}
                {qna.type === 'CONNECT' && <LinkIcon className="size-3.5" />}
                {qna.type === 'STANDARD' && <HelpCircle className="size-3.5" />}
                {qna.type} QUESTION
              </span>

              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="font-bold text-amber-400">+{qna.pointsRight} pts</span>
                {qna.pointsWrong !== 0 && (
                  <span className="text-rose-400 font-bold">{qna.pointsWrong} pts</span>
                )}
              </div>
            </div>

            <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight leading-snug">
              {qna.prompt}
            </h2>

            {/* TV Push Trigger */}
            <div className="mt-4 pt-4 border-t border-zinc-800/80 flex items-center justify-between">
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
          </div>

          {/* Clues Section */}
          {clues.length > 0 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider font-mono">
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

              <div className="flex flex-col gap-3">
                {clues.map((clueText, idx) => {
                  const isRevealed = revealedClueIndices.includes(idx);

                  return (
                    <div
                      key={idx}
                      className={`flex items-start justify-between gap-3 p-3.5 rounded-xl border transition-all ${
                        isRevealed
                          ? 'border-amber-500/40 bg-amber-950/20 text-zinc-100'
                          : 'border-zinc-800 bg-zinc-950/40 text-zinc-400'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <span className={`size-6 rounded-md flex items-center justify-center font-mono text-xs font-bold shrink-0 mt-0.5 ${
                          isRevealed ? 'bg-amber-400 text-zinc-950' : 'bg-zinc-800 text-zinc-500'
                        }`}>
                          {idx + 1}
                        </span>
                        <p className="text-sm leading-relaxed">
                          {clueText}
                        </p>
                      </div>

                      <Button
                        size="sm"
                        variant={isRevealed ? 'ghost' : 'outline'}
                        disabled={isRevealed || !isQuestionShownOnTV}
                        onClick={() => revealClue(idx)}
                        className={`text-xs h-7 shrink-0 ${
                          isRevealed
                            ? 'text-emerald-400 hover:text-emerald-300'
                            : 'border-zinc-700 hover:border-amber-400 text-zinc-300'
                        }`}
                      >
                        {isRevealed ? 'On TV' : 'Reveal'}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Secret Answer Card & Reveal Action */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase font-mono font-bold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="size-4" />
                Host Verified Answer (Host Eyes Only)
              </span>

              {isAnswerRevealedOnTV && (
                <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs">
                  Revealed on TV Screen
                </Badge>
              )}
            </div>

            <div className="p-4 rounded-xl bg-zinc-950 border border-emerald-900/50 mb-4">
              <h4 className="text-xl md:text-2xl font-black text-emerald-300 tracking-tight">
                {qna.answer}
              </h4>
              {qna.explanation && (
                <p className="text-xs text-zinc-400 mt-2 border-t border-zinc-800 pt-2 font-mono">
                  {qna.explanation}
                </p>
              )}
            </div>

            {/* Answer Reveal Button with 300ms Hold Prevention */}
            {!isAnswerRevealedOnTV ? (
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onMouseDown={startHoldAnswer}
                  onMouseUp={cancelHoldAnswer}
                  onMouseLeave={cancelHoldAnswer}
                  onTouchStart={startHoldAnswer}
                  onTouchEnd={cancelHoldAnswer}
                  className="relative overflow-hidden w-full h-12 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm tracking-wide shadow-lg active:scale-[0.99] transition-all select-none cursor-pointer flex items-center justify-center gap-2"
                >
                  {/* Fill progress overlay */}
                  <div
                    className="absolute inset-0 bg-emerald-400/30 transition-all pointer-events-none"
                    style={{ width: `${answerHoldProgress}%` }}
                  />
                  <Sparkles className="size-4" />
                  <span>
                    {answerHoldProgress > 0
                      ? 'HOLDING... CONFIRMING REVEAL'
                      : 'HOLD TO REVEAL ANSWER ON TV (Hot-key: A)'}
                  </span>
                </button>
                <div className="flex items-center justify-center gap-1.5 text-[11px] text-zinc-500 font-mono">
                  <AlertTriangle className="size-3 text-amber-500" />
                  <span>Holding prevents accidental spoiler leaks on the big TV</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-emerald-300 text-xs font-semibold">
                <span>Answer is actively displayed with celebration on the TV screen.</span>
                <Sparkles className="size-4 text-emerald-400 animate-spin" style={{ animationDuration: '6s' }} />
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Scoring Pad & Team Controls (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl sticky top-20">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-800">
              <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 font-mono">
                Team Scoring Pad
              </h3>

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

            <div className="flex flex-col gap-3">
              {teams.map((team) => (
                <div
                  key={team.name}
                  className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/70 flex flex-col gap-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm tracking-tight line-clamp-1">
                      {team.name}
                    </span>
                    <span className="font-mono text-lg font-black text-amber-400">
                      {team.score} pts
                    </span>
                  </div>

                  {/* Point Action Buttons */}
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleScoreClick(team.name, qna.pointsRight)}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs h-8"
                    >
                      +{qna.pointsRight}
                    </Button>

                    <Button
                      size="sm"
                      disabled={qna.pointsWrong === 0}
                      onClick={() => handleScoreClick(team.name, qna.pointsWrong)}
                      className="bg-rose-900/60 hover:bg-rose-800 text-rose-200 font-mono font-bold text-xs h-8 border border-rose-800/50"
                    >
                      {qna.pointsWrong !== 0 ? qna.pointsWrong : '0'}
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCustomScore(team.name)}
                      className="border-zinc-700 hover:border-zinc-500 text-zinc-300 font-mono text-xs h-8"
                    >
                      Custom ±
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Keyboard Reference */}
            <div className="mt-6 pt-4 border-t border-zinc-800 text-[11px] font-mono text-zinc-500 flex flex-col gap-1">
              <div><kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">Space</kbd> Show / Reveal Next Hint</div>
              <div><kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">Hold A</kbd> Reveal Answer</div>
              <div><kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">Esc</kbd> Complete &amp; Return to Board</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
