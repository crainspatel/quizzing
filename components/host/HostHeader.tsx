'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tv, Shield, Trophy, Volume2, VolumeX, ExternalLink } from 'lucide-react';
import { DisplayCommand } from '@/types/quiz';

interface HostHeaderProps {
  quizTitle: string;
  currentDisplayCommand: DisplayCommand | null;
  onShowBoard: () => void;
  onShowCurtain: () => void;
  onShowScoreboard: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export function HostHeader({
  quizTitle,
  currentDisplayCommand,
  onShowBoard,
  onShowCurtain,
  onShowScoreboard,
  isMuted,
  onToggleMute,
}: HostHeaderProps) {
  // Determine what the TV is showing
  let tvStatus = 'BOARD';
  let badgeColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';

  if (!currentDisplayCommand || currentDisplayCommand.type === 'SHOW_CURTAIN') {
    tvStatus = 'CURTAIN (SAFE)';
    badgeColor = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
  } else if (currentDisplayCommand.type === 'SHOW_QUESTION' || currentDisplayCommand.type === 'REVEAL_CLUE') {
    tvStatus = 'QUESTION ACTIVE';
    badgeColor = 'bg-sky-500/20 text-sky-300 border-sky-500/40';
  } else if (currentDisplayCommand.type === 'REVEAL_ANSWER') {
    tvStatus = 'ANSWER REVEALED';
    badgeColor = 'bg-purple-500/20 text-purple-300 border-purple-500/40';
  } else if (currentDisplayCommand.type === 'SHOW_SCOREBOARD' || currentDisplayCommand.type === 'SHOW_FINAL_SCORES') {
    tvStatus = 'SCOREBOARD';
    badgeColor = 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40';
  } else if (currentDisplayCommand.type === 'SHOW_LOBBY') {
    tvStatus = 'LOBBY';
    badgeColor = 'bg-zinc-800 text-zinc-300 border-zinc-700';
  }

  function openScreenTab() {
    window.open('/screen', '_blank', 'noopener,noreferrer');
  }

  return (
    <header className="sticky top-0 z-40 w-full bg-zinc-950/95 border-b border-zinc-800/80 backdrop-blur-md px-4 py-3 md:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3 max-w-7xl mx-auto">
        {/* Title and TV status */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="text-xs font-mono font-bold tracking-wider text-amber-400">
              HOST CONTROLLER
            </span>
            <h1 className="text-base md:text-lg font-bold text-white tracking-tight line-clamp-1">
              {quizTitle}
            </h1>
          </div>

          <Badge className={`ml-2 px-2.5 py-1 text-xs font-mono font-semibold border ${badgeColor}`}>
            <span className="size-2 rounded-full bg-current animate-ping mr-2 inline-block" />
            TV: {tvStatus}
          </Badge>
        </div>

        {/* Display Override Palette */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onShowBoard}
            className="border-zinc-800 hover:bg-zinc-900 text-zinc-300 hover:text-white"
          >
            <Tv data-icon="inline-start" />
            Show Board
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={onShowCurtain}
            className="border-zinc-800 hover:bg-zinc-900 text-amber-400/90 hover:text-amber-300"
          >
            <Shield data-icon="inline-start" />
            Curtain
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={onShowScoreboard}
            className="border-zinc-800 hover:bg-zinc-900 text-yellow-400/90 hover:text-yellow-300"
          >
            <Trophy data-icon="inline-start" />
            Scoreboard
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={onToggleMute}
            aria-label={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            className="text-zinc-400 hover:text-white px-2.5"
          >
            {isMuted ? <VolumeX className="size-4 text-rose-400" /> : <Volume2 className="size-4 text-emerald-400" />}
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={openScreenTab}
            title="Open TV screen route in new window"
            className="text-zinc-400 hover:text-white px-2.5"
          >
            <ExternalLink className="size-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
