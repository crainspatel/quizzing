'use client';

import React, { useState, useEffect, useCallback, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  GameSession,
  Segment,
  QnA,
  TeamScore,
  CardStatus,
  DisplayCommand,
  ScoreEvent,
  DisplaySegmentInfo,
} from '@/types/quiz';
import { SAMPLE_QUIZ } from '@/lib/sample-quiz';
import {
  loadSessionFromLocalStorage,
  saveSessionToLocalStorage,
  saveLastDisplayCommand,
  loadLastDisplayCommand,
} from '@/lib/storage';
import { getSyncBus } from '@/lib/sync';
import { sounds } from '@/lib/sound';
import { HostHeader } from '@/components/host/HostHeader';
import { HostBoard } from '@/components/host/HostBoard';
import { HostActiveQuestion } from '@/components/host/HostActiveQuestion';
import { HostCardReview } from '@/components/host/HostCardReview';
import { Button } from '@/components/ui/button';
import { Trophy, X } from 'lucide-react';

function createDefaultSession(): GameSession {
  const defaultTeams: TeamScore[] = [
    { name: 'Quiz Wizards', score: 0 },
    { name: 'Lateral Thinkers', score: 0 },
    { name: 'Buzzing Bees', score: 0 },
  ];
  const initialCardStates: Record<string, CardStatus> = {};
  SAMPLE_QUIZ.segments.forEach((s) => {
    s.questions.forEach((q) => {
      initialCardStates[`${s.id}:${q.id}`] = 'AVAILABLE';
    });
  });

  return {
    id: 'default-session',
    quiz: SAMPLE_QUIZ,
    teams: defaultTeams,
    cardStates: initialCardStates,
    scoreHistory: [],
    lastUpdated: 0,
  };
}

function extractDisplaySegments(quiz: GameSession['quiz']): DisplaySegmentInfo[] {
  return quiz.segments.map((s) => ({
    id: s.id,
    title: s.title,
    questions: s.questions.map((q) => ({
      id: q.id,
      type: q.type,
      pointsRight: q.pointsRight,
      pointsWrong: q.pointsWrong,
    })),
  }));
}

function normalizeQuiz(quiz: GameSession['quiz']): GameSession['quiz'] {
  return {
    ...quiz,
    segments: quiz.segments.map((segment) => ({
      ...segment,
      title: segment.title.replace(/[\p{Extended_Pictographic}\uFE0F]/gu, '').trim(),
      questions: segment.questions.map((question) => ({
        ...question,
        displayMediaOnly: question.displayMediaOnly ?? (segment.title.toLowerCase().includes('logo') && question.type === 'IMAGE_BASED'),
        pointsWrong: -Math.abs(question.pointsRight),
      })),
    })),
  };
}

function makeRestoredQuestionCommand(session: GameSession): DisplayCommand | null {
  const activeCard = session.activeCard;
  if (!activeCard?.isQuestionShown) return null;
  const segment = session.quiz.segments.find((item) => item.id === activeCard.segmentId);
  const question = segment?.questions.find((item) => item.id === activeCard.qnaId);
  const cardIndex = segment?.questions.findIndex((item) => item.id === activeCard.qnaId) ?? -1;
  if (!segment || !question || cardIndex < 0) return null;

  return {
    type: 'RESTORE_QUESTION',
    question: {
      segmentTitle: segment.title,
      cardIndex,
      totalInSegment: segment.questions.length,
      prompt: question.prompt,
      description: question.description,
      questionType: question.type,
      media: question.media,
      revealMedia: question.revealMedia,
      displayMediaOnly: question.displayMediaOnly,
      releaseYear: question.releaseYear,
      pointsRight: question.pointsRight,
      pointsWrong: -Math.abs(question.pointsRight),
      clueCount: question.clues?.length ?? 0,
    },
    revealedClues: (activeCard.revealedClueIndices ?? []).flatMap((index) => {
      const text = question.clues?.[index];
      return text ? [{ index, text }] : [];
    }),
    revealedAnswer: activeCard.isAnswerRevealed
      ? { answer: question.answer, explanation: question.explanation }
      : undefined,
  };
}

export default function HostPage() {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [isMounted, setIsMounted] = useState(false);
  const [session, setSession] = useState<GameSession>(createDefaultSession);
  const [currentCommand, setCurrentCommand] = useState<DisplayCommand>(() => ({
    type: 'SHOW_BOARD',
    segments: extractDisplaySegments(SAMPLE_QUIZ),
    cardStates: {},
    teams: [],
    boardNumber: 1,
  }));

  const [isMuted, setIsMuted] = useState(false);
  const [isScoreLedgerOpen, setIsScoreLedgerOpen] = useState(false);

  // Active question modal / sub-view
  const [activeSelection, setActiveSelection] = useState<{
    segment: Segment;
    qna: QnA;
    cardIndex: number;
  } | null>(null);
  const [reviewSelection, setReviewSelection] = useState<{
    segment: Segment;
    qna: QnA;
    cardIndex: number;
  } | null>(null);

  // Push command to display via SyncBus and persist
  const pushDisplayCommand = useCallback((cmd: DisplayCommand) => {
    // Data-only sync messages must not replace the active view. The TV handles
    // score/card patches in place, so the host's view badge should too.
    if (cmd.type !== 'UPDATE_SCORES' && cmd.type !== 'DISABLE_CARD') {
      setCurrentCommand(cmd);
    }
    saveLastDisplayCommand(cmd);
    if (cmd.type === 'SHOW_QUESTION' || cmd.type === 'REVEAL_CLUE' || cmd.type === 'UPDATE_CLUE' || cmd.type === 'HIDE_CLUE' || cmd.type === 'REVEAL_ANSWER') {
      setSession((prev) => {
        if (!prev.activeCard) return prev;
        const revealedClueIndices = cmd.type === 'REVEAL_CLUE'
          ? [...new Set([...(prev.activeCard.revealedClueIndices ?? []), cmd.index])].sort((a, b) => a - b)
          : cmd.type === 'HIDE_CLUE'
            ? (prev.activeCard.revealedClueIndices ?? []).filter((index) => index !== cmd.index)
            : prev.activeCard.revealedClueIndices ?? [];
        return {
          ...prev,
          activeCard: {
            ...prev.activeCard,
            isQuestionShown: true,
            revealedClueIndices,
            revealedClueCount: revealedClueIndices.length,
            isAnswerRevealed: prev.activeCard.isAnswerRevealed || cmd.type === 'REVEAL_ANSWER',
          },
          lastUpdated: Date.now(),
        };
      });
    }
    const bus = getSyncBus();
    bus.sendCommand(cmd);
  }, []);

  // Hydrate from localStorage on client mount
  useEffect(() => {
    const loaded = loadSessionFromLocalStorage();
    if (loaded && loaded.quiz) {
      const boards = (loaded.boards?.length ? loaded.boards : [loaded.quiz]).map(normalizeQuiz);
      const activeBoardIndex = Math.min(Math.max(loaded.activeBoardIndex ?? 0, 0), boards.length - 1);
      const normalized = {
        ...loaded,
        boards,
        activeBoardIndex,
        quiz: boards[activeBoardIndex] ?? normalizeQuiz(loaded.quiz),
      };
      setSession(normalized);
      const activeCard = normalized.activeCard;
      if (activeCard) {
        const segment = normalized.quiz.segments.find((item) => item.id === activeCard.segmentId);
        const qna = segment?.questions.find((item) => item.id === activeCard.qnaId);
        const cardIndex = segment?.questions.findIndex((item) => item.id === activeCard.qnaId) ?? -1;
        if (segment && qna && cardIndex >= 0) setActiveSelection({ segment, qna, cardIndex });
      }
      const lastCmd = loadLastDisplayCommand();
      const isQuestionView = !lastCmd || lastCmd.type === 'SHOW_QUESTION' || lastCmd.type === 'REVEAL_CLUE' || lastCmd.type === 'UPDATE_CLUE' || lastCmd.type === 'HIDE_CLUE' || lastCmd.type === 'REVEAL_ANSWER';
      const restoredQuestion = isQuestionView ? makeRestoredQuestionCommand(normalized) : null;
      if (lastCmd) {
        setCurrentCommand(
          restoredQuestion ?? {
            ...lastCmd,
            ...(lastCmd.type === 'SHOW_BOARD' ? { segments: extractDisplaySegments(normalized.quiz), boardNumber: activeBoardIndex + 1 } : {}),
          },
        );
      } else {
        setCurrentCommand(restoredQuestion ?? {
          type: 'SHOW_BOARD',
          segments: extractDisplaySegments(normalized.quiz),
          cardStates: normalized.cardStates,
          teams: normalized.teams,
          boardNumber: activeBoardIndex + 1,
        });
      }
    } else {
      const def = createDefaultSession();
      setSession(def);
      setCurrentCommand({
        type: 'SHOW_BOARD',
        segments: extractDisplaySegments(def.quiz),
        cardStates: def.cardStates,
        teams: def.teams,
        boardNumber: 1,
      });
    }
    setIsMounted(true);
  }, []);

  // SyncBus listener & responder
  useEffect(() => {
    const bus = getSyncBus();
    const unsubscribe = bus.subscribe((msg) => {
      if (msg.kind === 'REQUEST_SYNC') {
        bus.respondSync(currentCommand || loadLastDisplayCommand());
      }
    });

    return () => {
      unsubscribe();
    };
  }, [currentCommand]);

  // Persist session whenever it changes, but ONLY after initial client mount has completed
  useEffect(() => {
    if (!isMounted) return;
    saveSessionToLocalStorage(session);
  }, [session, isMounted]);

  // Audio mute toggle
  function handleToggleMute() {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    sounds.setMuted(nextMuted);
  }

  // Display override handlers
  function handleShowBoard() {
    pushDisplayCommand({
      type: 'SHOW_BOARD',
      segments: extractDisplaySegments(session.quiz),
      cardStates: session.cardStates,
      teams: session.teams,
      boardNumber: (session.activeBoardIndex ?? 0) + 1,
    });
  }

  function handleShowCurtain() {
    pushDisplayCommand({ type: 'SHOW_CURTAIN' });
  }

  function handleShowScoreboard() {
    pushDisplayCommand({
      type: 'SHOW_SCOREBOARD',
      teams: session.teams,
    });
  }

  function handleShowScoreLedger() {
    setIsScoreLedgerOpen(true);
  }

  function handleShowFinalScores() {
    const sorted = [...session.teams].sort((a, b) => b.score - a.score);
    const winner = sorted[0]?.name || 'All Teams';
    pushDisplayCommand({
      type: 'SHOW_FINAL_SCORES',
      teams: session.teams,
      winner,
    });
  }

  // Card Selection -> Transitions TV to Curtain buffer for spoiler safety!
  function handleSelectCard(segment: Segment, qna: QnA, cardIndex: number) {
    setReviewSelection(null);
    // 1. Mark card ACTIVE
    const stateKey = `${segment.id}:${qna.id}`;
    setSession((prev) => ({
      ...prev,
      cardStates: {
        ...prev.cardStates,
        [stateKey]: 'ACTIVE',
      },
      activeCard: {
        segmentId: segment.id,
        qnaId: qna.id,
        revealedClueCount: 0,
        revealedClueIndices: [],
        isQuestionShown: false,
        isAnswerRevealed: false,
      },
      lastUpdated: Date.now(),
    }));

    // Keep the selected category and point value visible while the host prepares the prompt.
    pushDisplayCommand({ type: 'SHOW_SELECTION', segmentTitle: segment.title, points: qna.pointsRight });

    // 3. Open host controller for this question
    setActiveSelection({ segment, qna, cardIndex });
  }

  function handleViewCompletedCard(segment: Segment, qna: QnA, cardIndex: number) {
    setReviewSelection({ segment, qna, cardIndex });
  }

  function handleShowCompletedQuestionOnTV() {
    if (!reviewSelection) return;
    const { segment, qna, cardIndex } = reviewSelection;
    pushDisplayCommand({
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
      pointsWrong: -Math.abs(qna.pointsRight),
      clueCount: qna.clues?.length ?? 0,
    });
  }

  // Complete card -> Marks as DISABLED, puts TV back to Board
  function handleCompleteCard() {
    if (!activeSelection) return;

    const { segment, qna } = activeSelection;
    const stateKey = `${segment.id}:${qna.id}`;

    const updatedCardStates = {
      ...session.cardStates,
      [stateKey]: 'DISABLED' as CardStatus,
    };

    setSession((prev) => ({
      ...prev,
      cardStates: updatedCardStates,
      activeCard: undefined,
      lastUpdated: Date.now(),
    }));

    setActiveSelection(null);
    setReviewSelection(null);

    // Return TV to Board view with disabled card
    pushDisplayCommand({
      type: 'SHOW_BOARD',
      segments: extractDisplaySegments(session.quiz),
      cardStates: updatedCardStates,
      teams: session.teams,
      boardNumber: (session.activeBoardIndex ?? 0) + 1,
    });
  }

  // Cancel without completing -> Keeps card AVAILABLE, TV goes back to board
  function handleCancelCard() {
    if (!activeSelection) return;

    const { segment, qna } = activeSelection;
    const stateKey = `${segment.id}:${qna.id}`;

    const updatedCardStates = {
      ...session.cardStates,
      [stateKey]: 'AVAILABLE' as CardStatus,
    };

    setSession((prev) => ({
      ...prev,
      cardStates: updatedCardStates,
      activeCard: undefined,
      lastUpdated: Date.now(),
    }));

    setActiveSelection(null);
    setReviewSelection(null);

    pushDisplayCommand({
      type: 'SHOW_BOARD',
      segments: extractDisplaySegments(session.quiz),
      cardStates: updatedCardStates,
      teams: session.teams,
      boardNumber: (session.activeBoardIndex ?? 0) + 1,
    });
  }

  function handleUpdateClues(segmentId: string, qnaId: string, clues: string[]) {
    const updateQuiz = (quiz: GameSession['quiz']) => ({
      ...quiz,
      segments: quiz.segments.map((segment) => segment.id !== segmentId ? segment : ({
        ...segment,
        questions: segment.questions.map((question) => question.id === qnaId ? { ...question, clues: [...clues] } : question),
      })),
    });

    setSession((prev) => ({
      ...prev,
      quiz: updateQuiz(prev.quiz),
      boards: prev.boards?.map(updateQuiz),
      lastUpdated: Date.now(),
    }));
    setActiveSelection((prev) => prev?.qna.id === qnaId
      ? { ...prev, qna: { ...prev.qna, clues: [...clues] } }
      : prev);
  }

  // Award / Deduct score
  function handleAwardScore(teamName: string, delta: number) {
    const newHistoryEvent: ScoreEvent = {
      id: `score-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      teamName,
      delta,
      segmentId: activeSelection?.segment.id || 'general',
      qnaId: activeSelection?.qna.id || 'general',
      boardNumber: (session.activeBoardIndex ?? 0) + 1,
      segmentTitle: activeSelection?.segment.title || 'General',
      questionPrompt: activeSelection?.qna.prompt || 'Manual score adjustment',
      timestamp: Date.now(),
    };

    const updatedTeams = session.teams.map((t) => {
      if (t.name === teamName) {
        return { ...t, score: t.score + delta };
      }
      return t;
    });

    setSession((prev) => ({
      ...prev,
      teams: updatedTeams,
      scoreHistory: [...prev.scoreHistory, newHistoryEvent],
      lastUpdated: Date.now(),
    }));

    // Notify TV display of score update
    pushDisplayCommand({
      type: 'UPDATE_SCORES',
      teams: updatedTeams,
    });
  }

  // Undo last score event
  function handleUndoScore() {
    if (session.scoreHistory.length === 0) return;

    const lastEvent = session.scoreHistory[session.scoreHistory.length - 1];
    const updatedHistory = session.scoreHistory.slice(0, -1);

    const updatedTeams = session.teams.map((t) => {
      if (t.name === lastEvent.teamName) {
        return { ...t, score: t.score - lastEvent.delta };
      }
      return t;
    });

    setSession((prev) => ({
      ...prev,
      teams: updatedTeams,
      scoreHistory: updatedHistory,
      lastUpdated: Date.now(),
    }));

    pushDisplayCommand({
      type: 'UPDATE_SCORES',
      teams: updatedTeams,
    });
  }

  function handleSwitchBoard(boardIndex: number) {
    const boards = session.boards?.length ? session.boards : [session.quiz];
    const nextQuiz = boards[boardIndex];
    if (!nextQuiz || boardIndex === session.activeBoardIndex || activeSelection) return;
    setReviewSelection(null);
    setSession((prev) => ({ ...prev, quiz: nextQuiz, activeBoardIndex: boardIndex, lastUpdated: Date.now() }));
    pushDisplayCommand({
      type: 'SHOW_BOARD',
      segments: extractDisplaySegments(nextQuiz),
      cardStates: session.cardStates,
      teams: session.teams,
      boardNumber: boardIndex + 1,
    });
  }

  // Check if all cards are disabled
  const boards = session.boards?.length ? session.boards : [session.quiz];
  const ledgerRows = [...session.scoreHistory].reverse().map((event) => {
    const matched = boards.flatMap((board, boardIndex) => board.segments.flatMap((segment) =>
      segment.questions
        .filter((question) => segment.id === event.segmentId && question.id === event.qnaId)
        .map((question) => ({ boardNumber: boardIndex + 1, segmentTitle: segment.title, prompt: question.prompt })),
    ))[0];
    return {
      ...event,
      boardNumber: event.boardNumber ?? matched?.boardNumber,
      segmentTitle: event.segmentTitle ?? matched?.segmentTitle ?? 'Manual adjustment',
      questionPrompt: event.questionPrompt ?? matched?.prompt ?? 'Manual score adjustment',
    };
  });
  const totalCards = boards.reduce((total, board) => total + board.segments.reduce((acc, segment) => acc + segment.questions.length, 0), 0);
  const disabledCardsCount = Object.values(session.cardStates).filter((s) => s === 'DISABLED').length;
  const isAllCardsFinished = totalCards > 0 && disabledCardsCount === totalCards;
  const hostViewKey = activeSelection
    ? `question-${activeSelection.segment.id}-${activeSelection.qna.id}`
    : reviewSelection
      ? `review-${reviewSelection.segment.id}-${reviewSelection.qna.id}`
      : `board-${session.activeBoardIndex ?? 0}`;

  if (!isMounted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 text-zinc-100">
        <div className="flex items-center gap-3 text-amber-400 font-mono text-sm animate-pulse">
          <span className="size-2.5 rounded-full bg-amber-400 animate-ping" />
          <span>LOADING HOST CONTROLLER...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-x-hidden overflow-y-auto bg-zinc-950 text-zinc-100 selection:bg-amber-500/30">
      {/* Top Controller Header */}
      <HostHeader
        quizTitle={session.quiz.title}
        currentDisplayCommand={currentCommand}
        onShowBoard={handleShowBoard}
        onShowCurtain={handleShowCurtain}
        onShowScoreboard={handleShowScoreboard}
        onShowScoreLedger={handleShowScoreLedger}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
      />

      <div className="flex shrink-0 flex-wrap items-center justify-center gap-2 border-b border-zinc-800 bg-zinc-950 px-4 py-3">
        <span className="mr-2 text-xs font-bold uppercase tracking-wide text-zinc-500">Quiz boards</span>
        {boards.map((board, index) => {
          const boardTotal = board.segments.reduce((total, segment) => total + segment.questions.length, 0);
          const boardDone = board.segments.reduce((total, segment) => total + segment.questions.filter((question) =>
            session.cardStates[`${segment.id}:${question.id}`] === 'DISABLED',
          ).length, 0);
          const isCurrent = (session.activeBoardIndex ?? 0) === index;
          return (
            <Button
              key={board.id}
              size="sm"
              variant={isCurrent ? 'default' : 'outline'}
              disabled={Boolean(activeSelection)}
              onClick={() => handleSwitchBoard(index)}
              className={isCurrent
                ? 'bg-amber-400 font-bold text-zinc-950 hover:bg-amber-300'
                : 'border-zinc-700 text-zinc-300 hover:bg-zinc-800'}
            >
              Board {index + 1}
              <span className="ml-2 text-[11px] opacity-70">{boardDone}/{boardTotal}</span>
            </Button>
          );
        })}
        {activeSelection && <span className="text-[11px] text-zinc-500">Finish or cancel the active card to switch boards.</span>}
      </div>

      {/* Finished Game Banner */}
      {isAllCardsFinished && !activeSelection && (
        <div className="shrink-0 bg-gradient-to-r from-amber-950 via-zinc-900 to-amber-950 border-b border-amber-500/40 p-4 text-center">
          <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
            <div className="text-left">
              <h3 className="font-bold text-amber-300 text-sm md:text-base flex items-center gap-2">
                <Trophy className="size-5 text-amber-400" />
                All Quiz Cards Completed!
              </h3>
              <p className="text-xs text-zinc-400">
                Trigger the grand champion victory ceremony on the living room screen.
              </p>
            </div>
            <Button
              onClick={handleShowFinalScores}
              className="bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold text-xs"
            >
              Show Final Podium on TV
            </Button>
          </div>
        </div>
      )}

      {/* Main View: Active Question vs. Board View */}
      <main className="min-h-0 flex-1 overflow-hidden pb-2">
        <div key={hostViewKey} className="host-view-enter h-full min-h-0">
          {activeSelection ? (
            <HostActiveQuestion
            segment={activeSelection.segment}
            qna={activeSelection.qna}
            cardIndex={activeSelection.cardIndex}
            teams={session.teams}
            currentDisplayCommand={currentCommand}
            onSendCommand={pushDisplayCommand}
            onUpdateClues={(clues) => handleUpdateClues(activeSelection.segment.id, activeSelection.qna.id, clues)}
            onAwardScore={handleAwardScore}
            onUndoScore={handleUndoScore}
            canUndo={session.scoreHistory.length > 0}
            onCompleteCard={handleCompleteCard}
            onCancelCard={handleCancelCard}
            activeCardProgress={session.activeCard}
            />
          ) : reviewSelection ? (
            <HostCardReview
              segment={reviewSelection.segment}
              qna={reviewSelection.qna}
              cardIndex={reviewSelection.cardIndex}
              onClose={() => setReviewSelection(null)}
              onShowQuestionOnTV={handleShowCompletedQuestionOnTV}
            />
          ) : (
            <HostBoard
              quiz={session.quiz}
              cardStates={session.cardStates}
              onSelectCard={handleSelectCard}
              onViewCard={handleViewCompletedCard}
            />
          )}
        </div>
      </main>

      {isScoreLedgerOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onMouseDown={(event) => { if (event.target === event.currentTarget) setIsScoreLedgerOpen(false); }}
        >
          <section role="dialog" aria-modal="true" aria-labelledby="score-ledger-title" className="flex max-h-[85dvh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-950 shadow-2xl">
            <header className="flex shrink-0 items-center justify-between border-b border-zinc-800 px-5 py-4">
              <div>
                <h2 id="score-ledger-title" className="text-lg font-bold text-white">Host Score Ledger</h2>
                <p className="mt-0.5 text-xs text-zinc-400">Point changes by team and question. This view is host-only.</p>
              </div>
              <Button variant="ghost" size="icon-sm" aria-label="Close score ledger" onClick={() => setIsScoreLedgerOpen(false)}>
                <X className="size-4" />
              </Button>
            </header>
            <div className="min-h-0 overflow-auto">
              {ledgerRows.length === 0 ? (
                <p className="p-8 text-center text-sm text-zinc-400">No scoring events yet.</p>
              ) : (
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="sticky top-0 bg-zinc-900 text-[11px] uppercase tracking-wide text-zinc-400">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Time</th>
                      <th className="px-4 py-3 font-semibold">Team</th>
                      <th className="px-4 py-3 font-semibold">Points</th>
                      <th className="px-4 py-3 font-semibold">Board / Category / Question</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledgerRows.map((event) => (
                      <tr key={event.id} className="border-t border-zinc-800 align-top text-zinc-200">
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-zinc-400">{new Date(event.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</td>
                        <td className="px-4 py-3 font-semibold">{event.teamName}</td>
                        <td className={`whitespace-nowrap px-4 py-3 font-mono font-bold ${event.delta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{event.delta > 0 ? '+' : ''}{event.delta}</td>
                        <td className="px-4 py-3">
                          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-amber-400">{event.boardNumber ? `Board ${event.boardNumber} · ` : ''}{event.segmentTitle}</div>
                          <div className="leading-snug text-zinc-300">{event.questionPrompt}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </div>
      )}

      {/* Persistent Bottom Bar with Scores Summary & End Game */}
      <footer className="sticky bottom-0 z-30 w-full shrink-0 bg-zinc-950/95 border-t border-zinc-800/80 backdrop-blur-md px-4 py-2.5 md:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3 max-w-7xl mx-auto">
          {/* Quick Standings Preview */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-mono font-bold text-zinc-400 uppercase">
              Standings:
            </span>
            {session.teams.map((t, idx) => (
              <div
                key={t.name}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-xs"
              >
                <span className="text-zinc-500 font-mono">#{idx + 1}</span>
                <span className="font-semibold text-zinc-200">{t.name}:</span>
                <span className="font-black text-amber-400 font-mono">{t.score}</span>
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                if (confirm('Return to Lobby? Current session is saved.')) {
                  startTransition(() => {
                    router.push('/');
                  });
                }
              }}
              className="text-xs text-zinc-500 hover:text-zinc-300 h-7"
            >
              Lobby Setup
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
}
