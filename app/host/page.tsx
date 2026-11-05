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
import { Button } from '@/components/ui/button';
import { Trophy } from 'lucide-react';

function createDefaultSession(): GameSession {
  const defaultTeams: TeamScore[] = [
    { name: 'Diwali Dynamos', score: 0 },
    { name: 'Patakha Paltan', score: 0 },
    { name: 'Rocket Rascals', score: 0 },
  ];
  const initialCardStates: Record<string, CardStatus> = {};
  SAMPLE_QUIZ.segments.forEach((s) => {
    s.questions.forEach((q) => {
      initialCardStates[`${s.id}:${q.id}`] = 'AVAILABLE';
    });
  });

  return {
    id: `session-${Date.now()}`,
    quiz: SAMPLE_QUIZ,
    teams: defaultTeams,
    cardStates: initialCardStates,
    scoreHistory: [],
    lastUpdated: Date.now(),
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

export default function HostPage() {
  const router = useRouter();
  const [, startTransition] = useTransition();

  // Lazy state initializers (Vercel React best practice)
  const [session, setSession] = useState<GameSession>(() => {
    const loaded = loadSessionFromLocalStorage();
    if (loaded && loaded.quiz) return loaded;
    return createDefaultSession();
  });

  const [currentCommand, setCurrentCommand] = useState<DisplayCommand>(() => {
    const lastCmd = loadLastDisplayCommand();
    if (lastCmd) return lastCmd;
    const loaded = loadSessionFromLocalStorage() || createDefaultSession();
    return {
      type: 'SHOW_BOARD',
      segments: extractDisplaySegments(loaded.quiz),
      cardStates: loaded.cardStates,
      teams: loaded.teams,
    };
  });

  const [isMuted, setIsMuted] = useState(false);

  // Active question modal / sub-view
  const [activeSelection, setActiveSelection] = useState<{
    segment: Segment;
    qna: QnA;
    cardIndex: number;
  } | null>(null);

  // Push command to display via SyncBus and persist
  const pushDisplayCommand = useCallback((cmd: DisplayCommand) => {
    setCurrentCommand(cmd);
    saveLastDisplayCommand(cmd);
    const bus = getSyncBus();
    bus.sendCommand(cmd);
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

  // Persist session whenever it changes
  useEffect(() => {
    saveSessionToLocalStorage(session);
  }, [session]);

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
        isAnswerRevealed: false,
      },
      lastUpdated: Date.now(),
    }));

    // 2. Put TV into Curtain buffer (Rule 3: No Accidental Spoilers!)
    pushDisplayCommand({ type: 'SHOW_CURTAIN' });

    // 3. Open host controller for this question
    setActiveSelection({ segment, qna, cardIndex });
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

    // Return TV to Board view with disabled card
    pushDisplayCommand({
      type: 'SHOW_BOARD',
      segments: extractDisplaySegments(session.quiz),
      cardStates: updatedCardStates,
      teams: session.teams,
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

    pushDisplayCommand({
      type: 'SHOW_BOARD',
      segments: extractDisplaySegments(session.quiz),
      cardStates: updatedCardStates,
      teams: session.teams,
    });
  }

  // Award / Deduct score
  function handleAwardScore(teamName: string, delta: number) {
    const newHistoryEvent: ScoreEvent = {
      id: `score-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      teamName,
      delta,
      segmentId: activeSelection?.segment.id || 'general',
      qnaId: activeSelection?.qna.id || 'general',
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

  // Check if all cards are disabled
  const totalCards = session.quiz.segments.reduce((acc, s) => acc + s.questions.length, 0);
  const disabledCardsCount = Object.values(session.cardStates).filter((s) => s === 'DISABLED').length;
  const isAllCardsFinished = totalCards > 0 && disabledCardsCount === totalCards;

  return (
    <div className="flex flex-col min-h-screen bg-zinc-950 text-zinc-100 selection:bg-amber-500/30">
      {/* Top Controller Header */}
      <HostHeader
        quizTitle={session.quiz.title}
        currentDisplayCommand={currentCommand}
        onShowBoard={handleShowBoard}
        onShowCurtain={handleShowCurtain}
        onShowScoreboard={handleShowScoreboard}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
      />

      {/* Finished Game Banner */}
      {isAllCardsFinished && !activeSelection && (
        <div className="bg-gradient-to-r from-amber-950 via-zinc-900 to-amber-950 border-b border-amber-500/40 p-4 text-center">
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
      <main className="flex-1 pb-16">
        {activeSelection ? (
          <HostActiveQuestion
            segment={activeSelection.segment}
            qna={activeSelection.qna}
            cardIndex={activeSelection.cardIndex}
            teams={session.teams}
            currentDisplayCommand={currentCommand}
            onSendCommand={pushDisplayCommand}
            onAwardScore={handleAwardScore}
            onUndoScore={handleUndoScore}
            canUndo={session.scoreHistory.length > 0}
            onCompleteCard={handleCompleteCard}
            onCancelCard={handleCancelCard}
          />
        ) : (
          <HostBoard
            quiz={session.quiz}
            cardStates={session.cardStates}
            onSelectCard={handleSelectCard}
          />
        )}
      </main>

      {/* Persistent Bottom Bar with Scores Summary & End Game */}
      <footer className="sticky bottom-0 z-30 w-full bg-zinc-950/95 border-t border-zinc-800/80 backdrop-blur-md px-4 py-2.5 md:px-8">
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
