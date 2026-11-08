export type QuestionType = 'STANDARD' | 'CLUE_BASED' | 'IMAGE_BASED' | 'CONNECT';

export interface QnA {
  id: string;
  type: QuestionType;
  prompt: string;              // Question text or category title
  description?: string;        // Optional full question details shown with the prompt
  clues?: string[];            // Ordered hints (CLUE_BASED) or items (CONNECT)
  media?: string;              // Base64 or Blob URL for IMAGE_BASED
  mediaName?: string;          // Filename reference (e.g. poster.jpg)
  revealMedia?: string;        // Optional additional image shown with the answer
  revealMediaName?: string;    // Filename reference for the answer reveal image
  displayMediaOnly?: boolean;  // Show the media without prompt/type labels on the TV
  releaseYear?: string;       // Poster-card year shown with the question image
  answer: string;              // The verified answer
  pointsRight: number;         // Positive points (e.g. 10)
  pointsWrong: number;         // Negative points (e.g. -5)
  explanation?: string;        // Host-only trivia notes
}

export interface Segment {
  id: string;
  title: string;               // e.g. "Bollywood Connects", "Sports Rapid Fire"
  description?: string;        // Optional flavor text
  questions: QnA[];
}

export interface Quiz {
  id: string;
  title: string;
  createdAt: string;           // ISO 8601 string
  segments: Segment[];
}

export interface CurationPreset {
  id: string;
  name: string;
  quizSource: 'default' | 'festive' | 'custom';
  quiz?: Quiz;
  importedFileName?: string | null;
  boardCategories: string[][];
  includedCards: Record<string, boolean>;
  teams: string[];
  savedAt: number;
}

export type CardStatus = 'AVAILABLE' | 'ACTIVE' | 'DISABLED';

export interface CardState {
  segmentId: string;
  qnaId: string;
  status: CardStatus;
}

export interface TeamScore {
  name: string;
  score: number;
}

export interface ScoreEvent {
  id: string;
  teamName: string;
  delta: number;               // +10, -5, or custom override
  segmentId: string;
  qnaId: string;
  boardNumber?: number;
  segmentTitle?: string;
  questionPrompt?: string;
  timestamp: number;
}

export interface ActiveCardState {
  segmentId: string;
  qnaId: string;
  revealedClueCount: number;
  revealedClueIndices?: number[];
  isQuestionShown?: boolean;
  isAnswerRevealed: boolean;
}

export interface GameSession {
  id: string;
  quiz: Quiz;
  boards?: Quiz[];
  activeBoardIndex?: number;
  teams: TeamScore[];
  cardStates: Record<string, CardStatus>; // key: `${segmentId}:${qnaId}`
  scoreHistory: ScoreEvent[];
  activeCard?: ActiveCardState;
  lastUpdated: number;
}

export interface DisplayCardInfo {
  id: string;
  type: QuestionType;
  pointsRight: number;
  pointsWrong: number;
}

export interface DisplaySegmentInfo {
  id: string;
  title: string;
  questions: DisplayCardInfo[];
}

// ─── Display Commands (Host -> Screen) ───

export type DisplayCommand =
  | { type: 'SHOW_LOBBY'; teams: string[] }
  | {
      type: 'SHOW_BOARD';
      cardStates: Record<string, CardStatus>;
      segments: DisplaySegmentInfo[];
      teams: TeamScore[];
      boardNumber?: number;
    }
  | { type: 'SHOW_SELECTION'; segmentTitle: string; points: number }
  | { type: 'SHOW_CURTAIN' }
  | {
      type: 'SHOW_QUESTION';
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
  | {
      type: 'RESTORE_QUESTION';
      question: {
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
      };
      revealedClues: { index: number; text: string }[];
      revealedAnswer?: { answer: string; explanation?: string };
    }
  | { type: 'REVEAL_CLUE'; index: number; text: string }
  | { type: 'UPDATE_CLUE'; index: number; text: string }
  | { type: 'HIDE_CLUE'; index: number }
  | { type: 'REVEAL_ANSWER'; answer: string; explanation?: string }
  | { type: 'SHOW_SCOREBOARD'; teams: TeamScore[] }
  | { type: 'UPDATE_SCORES'; teams: TeamScore[] }
  | { type: 'DISABLE_CARD'; segmentId: string; qnaId: string }
  | { type: 'SHOW_FINAL_SCORES'; teams: TeamScore[]; winner: string };

// ─── Bidirectional Sync Protocol ───

export type SyncMessage =
  | { kind: 'COMMAND'; command: DisplayCommand }
  | { kind: 'REQUEST_SYNC' }
  | { kind: 'SYNC_RESPONSE'; currentCommand: DisplayCommand | null };
