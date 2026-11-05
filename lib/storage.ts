import { get, set, del, keys } from 'idb-keyval';
import { GameSession, Quiz, DisplayCommand } from '@/types/quiz';

const SESSION_KEY = 'kwizz_active_session_v2';
const LAST_COMMAND_KEY = 'kwizz_last_display_command_v2';
const SAVED_QUIZZES_PREFIX = 'kwizz_deck_';
const MEDIA_PREFIX = 'kwizz_media_';

// ─── LocalStorage (Synchronous Hot Snapshot) ───

export function saveSessionToLocalStorage(session: GameSession): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch (err) {
    console.error('Failed to save session to localStorage:', err);
  }
}

export function loadSessionFromLocalStorage(): GameSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as GameSession;
  } catch (err) {
    console.error('Failed to load session from localStorage:', err);
    return null;
  }
}

export function clearSessionFromLocalStorage(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SESSION_KEY);
}

export function saveLastDisplayCommand(command: DisplayCommand): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LAST_COMMAND_KEY, JSON.stringify(command));
  } catch (err) {
    console.error('Failed to save last display command:', err);
  }
}

export function loadLastDisplayCommand(): DisplayCommand | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LAST_COMMAND_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DisplayCommand;
  } catch (err) {
    console.error('Failed to load last display command:', err);
    return null;
  }
}

// ─── IndexedDB (Decks & Media Storage) ───

export async function saveQuizToIndexedDB(quiz: Quiz): Promise<void> {
  await set(`${SAVED_QUIZZES_PREFIX}${quiz.id}`, quiz);
}

export async function getQuizFromIndexedDB(quizId: string): Promise<Quiz | undefined> {
  return await get<Quiz>(`${SAVED_QUIZZES_PREFIX}${quizId}`);
}

export async function listSavedQuizzes(): Promise<Quiz[]> {
  const allKeys = await keys();
  const quizKeys = allKeys.filter((k) => typeof k === 'string' && k.startsWith(SAVED_QUIZZES_PREFIX));
  const quizzes: Quiz[] = [];
  for (const k of quizKeys) {
    const q = await get<Quiz>(k);
    if (q) quizzes.push(q);
  }
  return quizzes;
}

export async function deleteQuizFromIndexedDB(quizId: string): Promise<void> {
  await del(`${SAVED_QUIZZES_PREFIX}${quizId}`);
}

// Save media blob (e.g. data URL or base64) by filename
export async function saveMediaItem(filename: string, dataUrl: string): Promise<void> {
  await set(`${MEDIA_PREFIX}${filename.toLowerCase()}`, dataUrl);
}

export async function getMediaItem(filename: string): Promise<string | undefined> {
  return await get<string>(`${MEDIA_PREFIX}${filename.toLowerCase()}`);
}
