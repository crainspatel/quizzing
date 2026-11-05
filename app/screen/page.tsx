'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { DisplayCommand, DisplaySegmentInfo, QuestionType, TeamScore, CardStatus } from '@/types/quiz';
import { getSyncBus } from '@/lib/sync';
import { loadLastDisplayCommand } from '@/lib/storage';
import { sounds } from '@/lib/sound';
import { ScreenLobby } from '@/components/screen/ScreenLobby';
import { ScreenCurtain } from '@/components/screen/ScreenCurtain';
import { ScreenBoard } from '@/components/screen/ScreenBoard';
import { ScreenQuestion } from '@/components/screen/ScreenQuestion';
import { ScreenScoreboard } from '@/components/screen/ScreenScoreboard';
import { Maximize2, Minimize2 } from 'lucide-react';

interface ActiveQuestionData {
  segmentTitle: string;
  cardIndex: number;
  totalInSegment: number;
  prompt: string;
  questionType: QuestionType;
  media?: string;
  pointsRight: number;
  pointsWrong: number;
  clueCount: number;
}

interface BoardData {
  segments: DisplaySegmentInfo[];
  cardStates: Record<string, CardStatus>;
  teams: TeamScore[];
}

export default function ScreenPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [command, setCommand] = useState<DisplayCommand | null>(null);
  const [revealedClues, setRevealedClues] = useState<{ index: number; text: string }[]>([]);
  const [revealedAnswer, setRevealedAnswer] = useState<{ answer: string; explanation?: string } | undefined>(undefined);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [activeQuestion, setActiveQuestion] = useState<ActiveQuestionData | null>(null);

  const [boardData, setBoardData] = useState<BoardData>({
    segments: [],
    cardStates: {},
    teams: [],
  });

  const handleIncomingCommand = useCallback((cmd: DisplayCommand) => {
    if (cmd.type === 'SHOW_QUESTION') {
      setActiveQuestion({
        segmentTitle: cmd.segmentTitle,
        cardIndex: cmd.cardIndex,
        totalInSegment: cmd.totalInSegment,
        prompt: cmd.prompt,
        questionType: cmd.questionType,
        media: cmd.media,
        pointsRight: cmd.pointsRight,
        pointsWrong: cmd.pointsWrong,
        clueCount: cmd.clueCount,
      });
      setRevealedClues([]);
      setRevealedAnswer(undefined);
      setCommand(cmd);
    } else if (cmd.type === 'REVEAL_CLUE') {
      setRevealedClues((prev) => {
        if (prev.some((c) => c.index === cmd.index)) return prev;
        return [...prev, { index: cmd.index, text: cmd.text }];
      });
      sounds.playClueReveal();
    } else if (cmd.type === 'REVEAL_ANSWER') {
      setRevealedAnswer({ answer: cmd.answer, explanation: cmd.explanation });
      sounds.playCorrect();
    } else if (cmd.type === 'SHOW_BOARD') {
      setBoardData({
        segments: cmd.segments,
        cardStates: cmd.cardStates,
        teams: cmd.teams,
      });
      setCommand(cmd);
    } else if (cmd.type === 'DISABLE_CARD') {
      const stateKey = `${cmd.segmentId}:${cmd.qnaId}`;
      setBoardData((prev) => ({
        ...prev,
        cardStates: {
          ...prev.cardStates,
          [stateKey]: 'DISABLED',
        },
      }));
    } else if (cmd.type === 'UPDATE_SCORES') {
      setBoardData((prev) => ({
        ...prev,
        teams: cmd.teams,
      }));
    } else {
      setCommand(cmd);
      if (cmd.type === 'SHOW_FINAL_SCORES') {
        sounds.playFanfare();
      }
    }
  }, []);

  useEffect(() => {
    setIsMounted(true);
    const cached = loadLastDisplayCommand();
    if (cached) {
      handleIncomingCommand(cached);
    }

    const bus = getSyncBus();
    const unsubscribe = bus.subscribe((msg) => {
      if (msg.kind === 'COMMAND') {
        handleIncomingCommand(msg.command);
      } else if (msg.kind === 'SYNC_RESPONSE' && msg.currentCommand) {
        handleIncomingCommand(msg.currentCommand);
      }
    });

    bus.requestSync();

    return () => {
      unsubscribe();
    };
  }, [handleIncomingCommand]);

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  }

  if (!isMounted) {
    return (
      <div className="relative min-h-screen w-full bg-[#070709] select-none">
        <ScreenCurtain />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full bg-[#070709] select-none">
      {/* Floating Fullscreen button on hover in top-right */}
      <button
        onClick={toggleFullscreen}
        aria-label="Toggle Fullscreen"
        className="fixed top-4 right-4 z-50 p-2.5 rounded-xl bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800/80 backdrop-blur-md transition-all opacity-40 hover:opacity-100"
      >
        {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
      </button>

      {/* Render Command Views */}
      {!command || command.type === 'SHOW_CURTAIN' ? (
        <ScreenCurtain />
      ) : command.type === 'SHOW_LOBBY' ? (
        <ScreenLobby teams={command.teams} />
      ) : command.type === 'SHOW_BOARD' ? (
        <ScreenBoard
          segments={boardData.segments}
          cardStates={boardData.cardStates}
          teams={boardData.teams}
        />
      ) : command.type === 'SHOW_QUESTION' || (activeQuestion && (command.type === 'REVEAL_CLUE' || command.type === 'REVEAL_ANSWER')) ? (
        activeQuestion ? (
          <ScreenQuestion
            segmentTitle={activeQuestion.segmentTitle}
            cardIndex={activeQuestion.cardIndex}
            totalInSegment={activeQuestion.totalInSegment}
            prompt={activeQuestion.prompt}
            questionType={activeQuestion.questionType}
            media={activeQuestion.media}
            pointsRight={activeQuestion.pointsRight}
            pointsWrong={activeQuestion.pointsWrong}
            revealedClues={revealedClues}
            revealedAnswer={revealedAnswer}
            totalCluesCount={activeQuestion.clueCount}
          />
        ) : (
          <ScreenCurtain />
        )
      ) : command.type === 'SHOW_SCOREBOARD' ? (
        <ScreenScoreboard teams={boardData.teams} />
      ) : command.type === 'SHOW_FINAL_SCORES' ? (
        <ScreenScoreboard teams={command.teams} isFinal winner={command.winner} />
      ) : (
        <ScreenCurtain />
      )}
    </div>
  );
}
