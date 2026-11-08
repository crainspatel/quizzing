'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { DisplayCommand, DisplaySegmentInfo, QuestionType, TeamScore, CardStatus } from '@/types/quiz';
import { getSyncBus } from '@/lib/sync';
import { loadLastDisplayCommand, loadSessionFromLocalStorage } from '@/lib/storage';
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
  description?: string;
  questionType: QuestionType;
  media?: string;
  revealMedia?: string;
  displayMediaOnly?: boolean;
  releaseYear?: string;
  pointsRight: number;
  pointsWrong: number;
  clueCount: number;
}

interface BoardData {
  segments: DisplaySegmentInfo[];
  cardStates: Record<string, CardStatus>;
  teams: TeamScore[];
  boardNumber: number;
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
    boardNumber: 1,
  });

  const handleIncomingCommand = useCallback((cmd: DisplayCommand) => {
    if (cmd.type === 'SHOW_QUESTION') {
      setActiveQuestion({
        segmentTitle: cmd.segmentTitle,
        cardIndex: cmd.cardIndex,
        totalInSegment: cmd.totalInSegment,
        prompt: cmd.prompt,
        description: cmd.description,
        questionType: cmd.questionType,
        media: cmd.media,
        revealMedia: cmd.revealMedia,
        displayMediaOnly: cmd.displayMediaOnly,
        releaseYear: cmd.releaseYear,
        pointsRight: cmd.pointsRight,
        pointsWrong: cmd.pointsWrong,
        clueCount: cmd.clueCount,
      });
      setRevealedClues([]);
      setRevealedAnswer(undefined);
      setCommand(cmd);
    } else if (cmd.type === 'RESTORE_QUESTION') {
      setActiveQuestion(cmd.question);
      setRevealedClues(cmd.revealedClues);
      setRevealedAnswer(cmd.revealedAnswer);
      setCommand({ type: 'SHOW_QUESTION', ...cmd.question });
    } else if (cmd.type === 'SHOW_SELECTION') {
      setCommand(cmd);
    } else if (cmd.type === 'REVEAL_CLUE') {
      setRevealedClues((prev) => {
        if (prev.some((c) => c.index === cmd.index)) return prev;
        return [...prev, { index: cmd.index, text: cmd.text }];
      });
      sounds.playClueReveal();
    } else if (cmd.type === 'UPDATE_CLUE') {
      setRevealedClues((prev) => prev.map((clue) => clue.index === cmd.index ? { ...clue, text: cmd.text } : clue));
      setCommand(cmd);
    } else if (cmd.type === 'HIDE_CLUE') {
      setRevealedClues((prev) => prev.filter((clue) => clue.index !== cmd.index));
      setCommand(cmd);
    } else if (cmd.type === 'REVEAL_ANSWER') {
      setRevealedAnswer({ answer: cmd.answer, explanation: cmd.explanation });
      sounds.playAnswerReveal();
    } else if (cmd.type === 'SHOW_BOARD') {
      setBoardData({
        segments: cmd.segments,
        cardStates: cmd.cardStates,
        teams: cmd.teams,
        boardNumber: cmd.boardNumber ?? 1,
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
    } else if (cmd.type === 'SHOW_SCOREBOARD') {
      setBoardData((prev) => ({ ...prev, teams: cmd.teams }));
      setCommand(cmd);
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
    const session = loadSessionFromLocalStorage();
    if (cached) {
      const activeBoard = session?.boards?.[session.activeBoardIndex ?? 0] ?? session?.quiz;
      const activeCard = session?.activeCard;
      const cachedQuestionView = cached.type === 'SHOW_QUESTION' || cached.type === 'REVEAL_CLUE' || cached.type === 'UPDATE_CLUE' || cached.type === 'HIDE_CLUE' || cached.type === 'REVEAL_ANSWER';
      if (session && activeCard && activeCard.isQuestionShown && cachedQuestionView) {
        const segment = activeBoard?.segments.find((item) => item.id === activeCard.segmentId);
        const question = segment?.questions.find((item) => item.id === activeCard.qnaId);
        const cardIndex = segment?.questions.findIndex((item) => item.id === activeCard.qnaId) ?? -1;
        if (segment && question && cardIndex >= 0) {
          handleIncomingCommand({
            type: 'SHOW_QUESTION',
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
          });
          (activeCard.revealedClueIndices ?? []).forEach((index) => {
            const text = question.clues?.[index];
            if (text) handleIncomingCommand({ type: 'REVEAL_CLUE', index, text });
          });
          if (activeCard.isAnswerRevealed) {
            handleIncomingCommand({ type: 'REVEAL_ANSWER', answer: question.answer, explanation: question.explanation });
          }
        } else {
          handleIncomingCommand(cached);
        }
      } else if (cached.type === 'SHOW_BOARD' && session && activeBoard) {
        // The display command can lag behind the saved game after a board switch or refresh.
        // Rebuild from the active curated board so the screen always matches the host board.
        handleIncomingCommand({
          type: 'SHOW_BOARD',
          segments: activeBoard.segments.map((segment) => ({
            id: segment.id,
            title: segment.title,
            questions: segment.questions.map((question) => ({
              id: question.id,
              type: question.type,
              pointsRight: question.pointsRight,
              pointsWrong: -Math.abs(question.pointsRight),
            })),
          })),
          cardStates: session.cardStates,
          teams: session.teams,
          boardNumber: (session.activeBoardIndex ?? 0) + 1,
        });
      } else if ((cached.type === 'UPDATE_SCORES' || cached.type === 'DISABLE_CARD') && session) {
        if (activeCard) {
          handleIncomingCommand({ type: 'SHOW_CURTAIN' });
        } else if (activeBoard) {
          handleIncomingCommand({
            type: 'SHOW_BOARD',
            segments: activeBoard.segments.map((segment) => ({
              id: segment.id,
              title: segment.title,
              questions: segment.questions.map((question) => ({
                id: question.id,
                type: question.type,
                pointsRight: question.pointsRight,
                pointsWrong: -Math.abs(question.pointsRight),
              })),
            })),
            cardStates: session.cardStates,
            teams: session.teams,
            boardNumber: (session.activeBoardIndex ?? 0) + 1,
          });
        } else {
          handleIncomingCommand(cached);
        }
      } else {
        handleIncomingCommand(cached);
      }
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

  const isQuestionView = command?.type === 'SHOW_QUESTION'
    || Boolean(activeQuestion && command && ['REVEAL_CLUE', 'UPDATE_CLUE', 'HIDE_CLUE', 'REVEAL_ANSWER'].includes(command.type));
  const screenViewKey = command?.type === 'SHOW_SELECTION'
    ? `selection-${command.segmentTitle}-${command.points}`
    : isQuestionView
      ? `question-${activeQuestion?.segmentTitle}-${activeQuestion?.cardIndex}`
      : command?.type === 'SHOW_BOARD'
        ? `board-${boardData.boardNumber}`
        : command?.type === 'SHOW_SCOREBOARD'
          ? 'scoreboard'
          : command?.type === 'SHOW_FINAL_SCORES'
            ? 'final-scores'
            : command?.type ?? 'curtain';

  if (!isMounted) {
    return (
      <div className="relative h-dvh w-full overflow-hidden bg-white select-none">
        <ScreenCurtain />
      </div>
    );
  }

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-white select-none">
      {/* Floating Fullscreen button on hover in top-right */}
      <button
        onClick={toggleFullscreen}
        aria-label="Toggle Fullscreen"
        className="fixed top-4 right-4 z-50 rounded-xl border border-slate-300 bg-white/90 p-2.5 text-slate-600 opacity-40 backdrop-blur-md transition-all hover:bg-slate-100 hover:text-slate-900 hover:opacity-100"
      >
        {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
      </button>

      {/* Render Command Views */}
      <div key={screenViewKey} className="screen-view-enter h-full w-full">
        {!command || command.type === 'SHOW_CURTAIN' ? (
          <ScreenCurtain />
        ) : command.type === 'SHOW_SELECTION' ? (
          <ScreenCurtain selectedCard={command} />
        ) : command.type === 'SHOW_LOBBY' ? (
          <ScreenLobby teams={command.teams} />
        ) : command.type === 'SHOW_BOARD' ? (
          <ScreenBoard
            segments={boardData.segments}
            cardStates={boardData.cardStates}
            boardNumber={boardData.boardNumber}
          />
        ) : command.type === 'SHOW_QUESTION' || (activeQuestion && (command.type === 'REVEAL_CLUE' || command.type === 'UPDATE_CLUE' || command.type === 'HIDE_CLUE' || command.type === 'REVEAL_ANSWER')) ? (
          activeQuestion ? (
            <ScreenQuestion
              segmentTitle={activeQuestion.segmentTitle}
              cardIndex={activeQuestion.cardIndex}
              totalInSegment={activeQuestion.totalInSegment}
              prompt={activeQuestion.prompt}
              description={activeQuestion.description}
              questionType={activeQuestion.questionType}
              media={activeQuestion.media}
              revealMedia={activeQuestion.revealMedia}
              displayMediaOnly={activeQuestion.displayMediaOnly}
              releaseYear={activeQuestion.releaseYear}
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
    </div>
  );
}
