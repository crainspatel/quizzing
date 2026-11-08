'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Quiz, TeamScore, CardStatus, GameSession, CurationPreset } from '@/types/quiz';
import { SAMPLE_QUIZ, SAMPLE_FESTIVE_QUIZ } from '@/lib/sample-quiz';
import { parseQuizCSV, generateTemplateCSV, exportQuizToCSV } from '@/lib/csv';
import {
  saveSessionToLocalStorage,
  loadSessionFromLocalStorage,
  saveMediaItem,
  getMediaItem,
  saveLastDisplayCommand,
  loadCurationPresets,
  saveCurationPresets,
} from '@/lib/storage';
import { getSyncBus } from '@/lib/sync';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import {
  Sparkles,
  Upload,
  Download,
  Users,
  Plus,
  Trash2,
  Tv,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Play,
  RotateCcw,
  BookmarkPlus,
  ArrowUp,
  ArrowDown,
  GripVertical,
} from 'lucide-react';

async function hydrateQuizMedia(quiz: Quiz): Promise<Quiz> {
  return {
    ...quiz,
    segments: await Promise.all(quiz.segments.map(async (segment) => ({
      ...segment,
      questions: await Promise.all(segment.questions.map(async (question) => ({
        ...question,
        media: question.media ?? (question.mediaName ? await getMediaItem(question.mediaName) : undefined),
        revealMedia: question.revealMedia ?? (question.revealMediaName ? await getMediaItem(question.revealMediaName) : undefined),
      }))),
    }))),
  };
}

export default function LobbyPage() {
  const router = useRouter();

  // Selected Quiz
  const [quiz, setQuiz] = useState<Quiz>(SAMPLE_QUIZ);
  const [isSampleSelected, setIsSampleSelected] = useState(true);
  const [boardCategories, setBoardCategories] = useState<string[][]>(() => [
    SAMPLE_QUIZ.segments.slice(0, 5).map((segment) => segment.id),
    SAMPLE_QUIZ.segments.slice(5, 10).map((segment) => segment.id),
  ]);
  const [configuringBoard, setConfiguringBoard] = useState(0);
  const [includedCards, setIncludedCards] = useState<Record<string, boolean>>({});
  const [savedPresets, setSavedPresets] = useState<CurationPreset[]>([]);
  const [presetName, setPresetName] = useState('');
  const [presetNotice, setPresetNotice] = useState('');
  const [draggedCategoryId, setDraggedCategoryId] = useState<string | null>(null);
  const [dropTargetCategoryId, setDropTargetCategoryId] = useState<string | null>(null);

  // CSV import state
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [importedFileName, setImportedFileName] = useState<string | null>(null);

  // Teams state
  const [teams, setTeams] = useState<string[]>([
    'Quiz Wizards 🧙‍♂️',
    'Lateral Thinkers 💡',
    'Buzzing Bees 🐝',
  ]);
  const [newTeamName, setNewTeamName] = useState('');

  // Hydrate previous session in useEffect to prevent server/client hydration mismatch
  const [hasExistingSession, setHasExistingSession] = useState(false);

  function resetCurationForQuiz(nextQuiz: Quiz) {
    setQuiz(nextQuiz);
    setBoardCategories([
      nextQuiz.segments.slice(0, 5).map((segment) => segment.id),
      nextQuiz.segments.slice(5, 10).map((segment) => segment.id),
    ]);
    setIncludedCards({});
  }

  function cardSelectionKey(boardIndex: number, segmentId: string, questionId: string) {
    return `${boardIndex}:${segmentId}:${questionId}`;
  }

  function isCardSelected(boardIndex: number, segmentId: string, questionId: string) {
    return includedCards[cardSelectionKey(boardIndex, segmentId, questionId)] === true;
  }

  function toggleBoardCategory(boardIndex: number, segmentId: string) {
    setBoardCategories((previous) => {
      const next = previous.map((ids) => [...ids]);
      next[boardIndex] = next[boardIndex].includes(segmentId)
        ? next[boardIndex].filter((id) => id !== segmentId)
        : [...next[boardIndex], segmentId];
      return next;
    });
  }

  function moveBoardCategory(boardIndex: number, segmentId: string, direction: -1 | 1) {
    setBoardCategories((previous) => previous.map((categories, index) => {
      if (index !== boardIndex) return categories;
      const currentIndex = categories.indexOf(segmentId);
      const targetIndex = currentIndex + direction;
      if (currentIndex < 0 || targetIndex < 0 || targetIndex >= categories.length) return categories;
      const next = [...categories];
      [next[currentIndex], next[targetIndex]] = [next[targetIndex], next[currentIndex]];
      return next;
    }));
  }

  function placeBoardCategory(boardIndex: number, draggedId: string, targetId: string) {
    if (draggedId === targetId) return;
    setBoardCategories((previous) => previous.map((categories, index) => {
      if (index !== boardIndex) return categories;
      const fromIndex = categories.indexOf(draggedId);
      const toIndex = categories.indexOf(targetId);
      if (fromIndex < 0 || toIndex < 0) return categories;
      const next = [...categories];
      next.splice(fromIndex, 1);
      next.splice(toIndex, 0, draggedId);
      return next;
    }));
  }

  useEffect(() => {
    let isCurrent = true;
    void loadCurationPresets().then((presets) => {
      if (isCurrent) setSavedPresets(presets);
    }).catch((error) => console.error('Could not load saved curation presets:', error));
    const existing = loadSessionFromLocalStorage();
    if (existing && existing.quiz) {
      setHasExistingSession(true);
    }
    return () => { isCurrent = false; };
  }, []);

  async function handleSaveCurationPreset() {
    const name = presetName.trim();
    if (!name) return;

    const quizSource: CurationPreset['quizSource'] = quiz.id === SAMPLE_QUIZ.id
      ? 'default'
      : quiz.id === SAMPLE_FESTIVE_QUIZ.id
        ? 'festive'
        : 'custom';
    const existing = savedPresets.find((preset) => preset.name.toLowerCase() === name.toLowerCase());
    const preset: CurationPreset = {
      id: existing?.id ?? `curation-${crypto.randomUUID()}`,
      name,
      quizSource,
      ...(quizSource === 'custom' ? { quiz } : {}),
      importedFileName: quizSource === 'custom' ? importedFileName : null,
      boardCategories: boardCategories.map((categories) => [...categories]),
      includedCards: { ...includedCards },
      teams: [...teams],
      savedAt: Date.now(),
    };
    const nextPresets = [preset, ...savedPresets.filter((item) => item.id !== preset.id)];

    try {
      await saveCurationPresets(nextPresets);
      setSavedPresets(nextPresets);
      setPresetName('');
      setPresetNotice(`Saved “${name}”.`);
    } catch (error) {
      console.error('Could not save curation preset:', error);
      setPresetNotice('Could not save this setup. Please try again.');
    }
  }

  async function handleLoadCurationPreset(preset: CurationPreset) {
    const presetQuiz = preset.quizSource === 'default'
      ? SAMPLE_QUIZ
      : preset.quizSource === 'festive'
        ? SAMPLE_FESTIVE_QUIZ
        : preset.quiz;
    if (!presetQuiz) {
      setPresetNotice('This saved setup is missing its custom quiz deck.');
      return;
    }

    setQuiz(presetQuiz);
    setIsSampleSelected(preset.quizSource !== 'custom');
    setImportedFileName(preset.quizSource === 'custom' ? preset.importedFileName ?? null : null);
    setCsvErrors([]);
    setBoardCategories(preset.boardCategories.map((categories) => [...categories]));
    setIncludedCards({ ...preset.includedCards });
    setTeams([...preset.teams]);
    setConfiguringBoard(0);
    setPresetNotice(`Loaded “${preset.name}”.`);
  }

  async function handleDeleteCurationPreset(preset: CurationPreset) {
    const nextPresets = savedPresets.filter((item) => item.id !== preset.id);
    try {
      await saveCurationPresets(nextPresets);
      setSavedPresets(nextPresets);
      setPresetNotice(`Removed “${preset.name}”.`);
    } catch (error) {
      console.error('Could not delete curation preset:', error);
      setPresetNotice('Could not remove this saved setup. Please try again.');
    }
  }

  function resumeExistingSession() {
    router.push('/host');
  }

  function handleAddTeam() {
    const trimmed = newTeamName.trim();
    if (!trimmed) return;
    if (teams.includes(trimmed)) {
      alert('A team with this name already exists.');
      return;
    }
    setTeams([...teams, trimmed]);
    setNewTeamName('');
  }

  function handleRemoveTeam(index: number) {
    if (teams.length <= 2) {
      alert('A minimum of 2 teams is recommended for competition.');
    }
    setTeams(teams.filter((_, i) => i !== index));
  }

  function handleCSVUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const { quiz: parsedQuiz, errors } = parseQuizCSV(text, file.name.replace(/\.[^/.]+$/, ''));
      setCsvErrors(errors);

      if (parsedQuiz.segments.length > 0) {
        resetCurationForQuiz(parsedQuiz);
        setIsSampleSelected(false);
        setImportedFileName(file.name);
      }
    };
    reader.readAsText(file);
  }

  async function handleMediaUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    await Promise.all(Array.from(files).map((file) => new Promise<void>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const dataUrl = event.target?.result as string;
        if (!dataUrl) return reject(new Error(`Could not read ${file.name}`));
        try {
          await saveMediaItem(file.name, dataUrl);
          resolve();
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(reader.error ?? new Error(`Could not read ${file.name}`));
      reader.readAsDataURL(file);
    })));
    alert(`Loaded ${files.length} media file(s) into local browser storage.`);
  }

  function handleDownloadTemplate() {
    const csv = generateTemplateCSV();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kwizzing_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleExportActiveQuiz() {
    const csv = exportQuizToCSV(quiz);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${quiz.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleLaunchEngine() {
    if (teams.length < 1) {
      alert('Please add at least one team.');
      return;
    }

    for (let boardIndex = 0; boardIndex < 2; boardIndex++) {
      if (boardCategories[boardIndex].length < 5) {
        alert(`Board ${boardIndex + 1} needs at least five categories.`);
        setConfiguringBoard(boardIndex);
        return;
      }
      const emptyCategory = boardCategories[boardIndex].find((segmentId) => {
        const segment = quiz.segments.find((item) => item.id === segmentId);
        return !segment?.questions.some((question) => isCardSelected(boardIndex, segment.id, question.id));
      });
      if (emptyCategory) {
        const segment = quiz.segments.find((item) => item.id === emptyCategory);
        alert(`Choose at least one question for “${segment?.title ?? 'each selected category'}” on Board ${boardIndex + 1}.`);
        setConfiguringBoard(boardIndex);
        return;
      }
    }

    // Build fresh game session
    const teamScores: TeamScore[] = teams.map((name) => ({ name, score: 0 }));
    const initialCardStates: Record<string, CardStatus> = {};

    const quizWithMedia = await hydrateQuizMedia(quiz);
    const boards = boardCategories.map((segmentIds, boardIndex): Quiz => ({
      ...quizWithMedia,
      id: `${quizWithMedia.id}-board-${boardIndex + 1}`,
      title: `${quizWithMedia.title} — Board ${boardIndex + 1}`,
      segments: segmentIds.flatMap((segmentId) => {
        const source = quizWithMedia.segments.find((segment) => segment.id === segmentId);
        if (!source) return [];
        const segmentIdForBoard = `board-${boardIndex + 1}-${source.id}`;
        const questions = source.questions
          .filter((question) => isCardSelected(boardIndex, source.id, question.id))
          .map((question) => ({ ...question, id: `board-${boardIndex + 1}-${question.id}` }))
          .sort((a, b) => a.pointsRight - b.pointsRight);
        const segment = {
          ...source,
          id: segmentIdForBoard,
          title: source.title.replace(/[\p{Extended_Pictographic}\uFE0F]/gu, '').trim(),
          questions,
        };
        questions.forEach((question) => {
          initialCardStates[`${segment.id}:${question.id}`] = 'AVAILABLE';
        });
        return [segment];
      }),
    }));
    const activeQuiz = boards[0];

    const newSession: GameSession = {
      id: `session-${Date.now()}`,
      quiz: activeQuiz,
      boards,
      activeBoardIndex: 0,
      teams: teamScores,
      cardStates: initialCardStates,
      scoreHistory: [],
      lastUpdated: Date.now(),
    };

    saveSessionToLocalStorage(newSession);

    // Initial Display Command: Board view
    const displaySegments = activeQuiz.segments.map((s) => ({
      id: s.id,
      title: s.title,
      questions: s.questions.map((q) => ({
        id: q.id,
        type: q.type,
        pointsRight: q.pointsRight,
        pointsWrong: q.pointsWrong,
      })),
    }));

    saveLastDisplayCommand({
      type: 'SHOW_BOARD',
      segments: displaySegments,
      cardStates: initialCardStates,
      teams: teamScores,
      boardNumber: 1,
    });

    const bus = getSyncBus();
    bus.sendCommand({
      type: 'SHOW_BOARD',
      segments: displaySegments,
      cardStates: initialCardStates,
      teams: teamScores,
      boardNumber: 1,
    });

    // Open TV Display tab
    window.open('/screen', '_blank', 'noopener,noreferrer');

    // Route current tab to /host
    router.push('/host');
  }

  const configuredSegments = (boardCategories[configuringBoard] ?? []).flatMap((segmentId) => {
    const segment = quiz.segments.find((item) => item.id === segmentId);
    return segment ? [segment] : [];
  });
  const boardCardCounts = boardCategories.map((segmentIds, boardIndex) =>
    segmentIds.reduce((count, segmentId) => {
      const segment = quiz.segments.find((item) => item.id === segmentId);
      return count + (segment?.questions.filter((question) => isCardSelected(boardIndex, segmentId, question.id)).length ?? 0);
    }, 0),
  );

  return (
    <div className="relative min-h-screen bg-[#08080a] text-zinc-100 p-6 md:p-12 overflow-x-hidden">
      {/* Background ambient lighting */}
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 size-[900px] bg-amber-500/10 rounded-full blur-[200px] pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto flex flex-col gap-10">
        {/* Header Hero */}
        <div className="flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold mb-4">
            <Sparkles className="size-3.5" />
            <span>Zero-Backend Living Room &amp; Festive Quiz Engine</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-black tracking-tight text-white mb-4 font-sans">
            KWIZZ<span className="text-amber-400">ING</span>
          </h1>

          <p className="text-lg md:text-xl text-zinc-400 max-w-2xl font-normal leading-relaxed">
            Turn your laptop and TV into a high-stakes, lateral pub quiz show.
            Dual-screen separation, progressive clues, and zero servers or sign-ups.
          </p>

          {hasExistingSession && (
            <div className="mt-6 flex items-center gap-3">
              <Button
                onClick={resumeExistingSession}
                className="bg-zinc-800 hover:bg-zinc-700 text-amber-300 border border-amber-500/40 text-xs font-semibold"
              >
                <RotateCcw className="size-3.5 mr-1.5" />
                Resume Active Game Night
              </Button>
            </div>
          )}
        </div>

        {/* Section 1: Choose or Upload Deck */}
        <Card className="bg-zinc-900/80 border-zinc-800 shadow-2xl backdrop-blur-md">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                  <FileSpreadsheet className="size-5 text-amber-400" />
                  Step 1: Choose Your Quiz Deck
                </CardTitle>
                <CardDescription className="text-zinc-400 text-xs mt-1">
                  Play the preloaded Diwali &amp; Bollywood Pub Quiz or import your custom questionnaire spreadsheet.
                </CardDescription>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDownloadTemplate}
                  className="border-zinc-700 hover:bg-zinc-800 text-zinc-300 text-xs"
                >
                  <Download className="size-3.5 mr-1.5 text-zinc-400" />
                  CSV Template
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleExportActiveQuiz}
                  className="border-zinc-700 hover:bg-zinc-800 text-zinc-300 text-xs"
                >
                  <Download className="size-3.5 mr-1.5 text-zinc-400" />
                  Export CSV
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex flex-col gap-6">
            {/* Option Pills */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Preset Deck: Buzzing with Kvizzing */}
              <div
                onClick={() => {
                  resetCurationForQuiz(SAMPLE_QUIZ);
                  setIsSampleSelected(true);
                  setCsvErrors([]);
                  setImportedFileName(null);
                }}
                className={`p-5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                  isSampleSelected && quiz.id === SAMPLE_QUIZ.id
                    ? 'border-amber-400 bg-amber-950/20 ring-2 ring-amber-400/40 shadow-lg'
                    : 'border-zinc-800 hover:border-zinc-700 bg-zinc-950/50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-xs font-semibold">
                      Default Grand Deck
                    </Badge>
                    {isSampleSelected && quiz.id === SAMPLE_QUIZ.id && (
                      <CheckCircle2 className="size-4 text-amber-400" />
                    )}
                  </div>

                  <h3 className="font-bold text-lg text-white mb-1">
                    {SAMPLE_QUIZ.title}
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    11 categories from the supplied shortlist • 88 question cards.
                  </p>
                </div>
              </div>

              {/* Preset Deck: Festive Pub Quiz */}
              <div
                onClick={() => {
                  resetCurationForQuiz(SAMPLE_FESTIVE_QUIZ);
                  setIsSampleSelected(true);
                  setCsvErrors([]);
                  setImportedFileName(null);
                }}
                className={`p-5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                  isSampleSelected && quiz.id === SAMPLE_FESTIVE_QUIZ.id
                    ? 'border-amber-400 bg-amber-950/20 ring-2 ring-amber-400/40 shadow-lg'
                    : 'border-zinc-800 hover:border-zinc-700 bg-zinc-950/50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className="border-zinc-700 text-zinc-300 text-xs font-semibold">
                      Festive Quick Deck
                    </Badge>
                    {isSampleSelected && quiz.id === SAMPLE_FESTIVE_QUIZ.id && (
                      <CheckCircle2 className="size-4 text-amber-400" />
                    )}
                  </div>

                  <h3 className="font-bold text-lg text-white mb-1">
                    {SAMPLE_FESTIVE_QUIZ.title}
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    4 Segments (Bollywood Connects, Sports, Diwali Traditions, Science Curiosities) • 12 Questions.
                  </p>
                </div>
              </div>

              {/* Upload Custom CSV */}
              <div
                className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                  !isSampleSelected
                    ? 'border-amber-400 bg-amber-950/20 ring-2 ring-amber-400/40 shadow-lg'
                    : 'border-zinc-800 hover:border-zinc-700 bg-zinc-950/50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline" className="border-zinc-700 text-zinc-400 text-xs">
                    Custom Spreadsheet
                  </Badge>
                  {!isSampleSelected && <CheckCircle2 className="size-4 text-amber-400" />}
                </div>

                <div>
                  <h3 className="font-bold text-lg text-white mb-1">
                    {importedFileName ? importedFileName : 'Upload Custom CSV'}
                  </h3>
                  <p className="text-xs text-zinc-400 mb-3">
                    Import any RFC 4180 CSV with Segment, Type, Prompt, Clues, and Points.
                  </p>
                </div>

                <label className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white cursor-pointer transition-colors w-fit">
                  <Upload className="size-3.5" />
                  <span>Choose CSV File</span>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleCSVUpload}
                    className="sr-only"
                  />
                </label>
              </div>
            </div>

            {/* Optional Media upload beside CSV */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border border-zinc-800/80 bg-zinc-950/40">
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-zinc-200">
                  Question &amp; Answer Images (Optional)
                </span>
                <span className="text-[11px] text-zinc-500">
                  Match CSV filenames in <code className="text-amber-400 font-mono">Media</code> (question) or <code className="text-amber-400 font-mono">RevealMedia</code> (answer reveal) with the image files you select here.
                </span>
              </div>

              <label className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-zinc-700 hover:border-zinc-500 bg-zinc-900 text-xs text-zinc-300 cursor-pointer transition-colors">
                <Upload className="size-3.5" />
                <span>Upload Media Images</span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleMediaUpload}
                  className="sr-only"
                />
              </label>
            </div>

            {/* CSV Errors display */}
            {csvErrors.length > 0 && (
              <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs flex flex-col gap-1">
                <div className="flex items-center gap-2 font-bold text-rose-200">
                  <AlertCircle className="size-4 text-rose-400" />
                  <span>CSV Warnings ({csvErrors.length})</span>
                </div>
                {csvErrors.slice(0, 5).map((err, i) => (
                  <div key={i} className="font-mono text-[11px] text-rose-300/80">
                    • {err}
                  </div>
                ))}
              </div>
            )}

            {/* Deck Summary Preview */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-800">
              <span className="text-xs text-zinc-500 font-mono">Active Deck:</span>
              <span className="text-xs font-bold text-white">{quiz.title}</span>
              <Badge variant="outline" className="border-zinc-800 text-[11px] text-amber-400">
                {quiz.segments.length} Segments
              </Badge>
              <Badge variant="outline" className="border-zinc-800 text-[11px] text-emerald-400">
                {quiz.segments.reduce((acc, s) => acc + s.questions.length, 0)} Total Questions
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Curate both boards */}
        <Card className="bg-zinc-900/80 border-zinc-800 shadow-2xl backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-white">Step 2: Curate the Two Boards</CardTitle>
            <CardDescription className="text-zinc-400 text-xs">
              Choose at least five categories for each board, then choose the question cards teams will play. Selected cards appear in ascending point order.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <section className="rounded-2xl border border-amber-500/25 bg-amber-950/10 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h3 className="text-sm font-bold text-zinc-100">Saved curation setups</h3>
                  <p className="mt-1 text-[11px] text-zinc-400">
                    Save this deck, its two board selections, cards, and team names for quick reuse.
                  </p>
                </div>
                <div className="flex w-full gap-2 sm:max-w-md">
                  <Input
                    value={presetName}
                    onChange={(event) => setPresetName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        void handleSaveCurationPreset();
                      }
                    }}
                    placeholder="Name this quiz setup"
                    aria-label="Name this quiz setup"
                    className="h-9 border-zinc-700 bg-zinc-950 text-sm"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => void handleSaveCurationPreset()}
                    disabled={!presetName.trim()}
                    className="h-9 shrink-0 bg-amber-400 font-bold text-zinc-950 hover:bg-amber-300"
                  >
                    <BookmarkPlus className="mr-1.5 size-4" />
                    Save setup
                  </Button>
                </div>
              </div>

              {presetNotice && <p role="status" className="mt-2 text-[11px] text-emerald-300">{presetNotice}</p>}

              {savedPresets.length > 0 ? (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {savedPresets.map((preset) => {
                    const cardCountForBoard = (boardIndex: number) => Object.entries(preset.includedCards)
                      .filter(([key, selected]) => selected && key.startsWith(`${boardIndex}:`)).length;
                    return (
                      <div key={preset.id} className="flex min-w-0 items-stretch gap-2 rounded-xl border border-zinc-800 bg-zinc-950/70 p-2">
                        <button
                          type="button"
                          onClick={() => void handleLoadCurationPreset(preset)}
                          className="min-w-0 flex-1 rounded-lg px-2 py-1 text-left transition hover:bg-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                          aria-label={`Load saved setup ${preset.name}`}
                        >
                          <span className="block truncate text-sm font-bold text-white">{preset.name}</span>
                          <span className="mt-1 block truncate text-[10px] text-zinc-400">
                            {preset.quizSource === 'custom' ? preset.importedFileName || preset.quiz?.title || 'Custom deck' : preset.quizSource === 'festive' ? SAMPLE_FESTIVE_QUIZ.title : SAMPLE_QUIZ.title}
                          </span>
                          <span className="mt-1 block text-[10px] font-medium text-amber-300/80">
                            Board 1: {preset.boardCategories[0]?.length ?? 0} categories · {cardCountForBoard(0)} cards
                            <span className="mx-1.5 text-zinc-600">/</span>
                            Board 2: {preset.boardCategories[1]?.length ?? 0} categories · {cardCountForBoard(1)} cards
                          </span>
                        </button>
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          onClick={() => void handleDeleteCurationPreset(preset)}
                          aria-label={`Delete saved setup ${preset.name}`}
                          title={`Delete ${preset.name}`}
                          className="my-auto shrink-0 text-zinc-500 hover:bg-rose-950/50 hover:text-rose-300"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-3 rounded-lg border border-dashed border-zinc-800 px-3 py-2 text-[11px] text-zinc-500">
                  No saved setups yet. Name the current selection and save it here.
                </p>
              )}
              <p className="mt-2 text-[10px] text-zinc-600">Saving a name that already exists updates that setup. Saved locally in this browser.</p>
            </section>

            <div className="flex flex-wrap gap-2">
              {[0, 1].map((boardIndex) => (
                <Button
                  key={boardIndex}
                  type="button"
                  variant={configuringBoard === boardIndex ? 'default' : 'outline'}
                  onClick={() => setConfiguringBoard(boardIndex)}
                  className={configuringBoard === boardIndex
                    ? 'bg-amber-400 text-zinc-950 hover:bg-amber-300'
                    : 'border-zinc-700 text-zinc-300'}
                >
                  Board {boardIndex + 1}
                  <span className="ml-2 text-xs opacity-70">
                    {boardCategories[boardIndex]?.length ?? 0} categories · {boardCardCounts[boardIndex] ?? 0} cards
                  </span>
                </Button>
              ))}
            </div>

            {quiz.segments.length < 5 && (
              <p className="rounded-lg border border-amber-700/50 bg-amber-950/30 p-3 text-xs text-amber-200">
                This deck has fewer than five categories. Choose a deck with at least five categories to configure both boards.
              </p>
            )}

            <div className="grid gap-3 md:grid-cols-2">
              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-bold text-zinc-200">Available categories</h3>
                {quiz.segments.map((segment) => {
                  const selected = boardCategories[configuringBoard]?.includes(segment.id) ?? false;
                  const cardCount = segment.questions.filter((question) =>
                    isCardSelected(configuringBoard, segment.id, question.id),
                  ).length;
                  return (
                    <label
                      key={segment.id}
                      className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-3 transition-colors ${
                        selected ? 'border-amber-500/60 bg-amber-950/25' : 'border-zinc-800 bg-zinc-950/50 hover:border-zinc-700'
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleBoardCategory(configuringBoard, segment.id)}
                          className="size-4 accent-amber-400"
                        />
                        <span className="truncate text-sm font-semibold text-zinc-100">
                          {segment.title.replace(/[\p{Extended_Pictographic}\uFE0F]/gu, '').trim()}
                        </span>
                      </span>
                      <span className="shrink-0 text-[11px] text-zinc-500">
                        {cardCount}/{segment.questions.length} cards
                      </span>
                    </label>
                  );
                })}
              </div>

              <div className="flex min-h-64 flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
                <div>
                  <h3 className="text-sm font-bold text-zinc-200">Question cards for Board {configuringBoard + 1}</h3>
                  <p className="mt-1 text-[11px] text-zinc-500">Check cards to include. Drag a category header or use Up/Down to set its board position.</p>
                </div>
                {configuredSegments.length === 0 ? (
                  <p className="text-xs text-zinc-500">Choose a category on the left to curate its cards.</p>
                ) : configuredSegments.map((segment, categoryOrderIndex) => (
                  <section
                    key={segment.id}
                    draggable
                    onDragStart={(event) => {
                      const target = event.target as HTMLElement;
                      if (target.closest('button, input, label') && !target.closest('[data-category-drag-handle]')) {
                        event.preventDefault();
                        return;
                      }
                      event.dataTransfer.setData('text/plain', segment.id);
                      event.dataTransfer.effectAllowed = 'move';
                      setDraggedCategoryId(segment.id);
                    }}
                    onDragOver={(event) => {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = 'move';
                      setDropTargetCategoryId(segment.id);
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      const sourceId = event.dataTransfer.getData('text/plain') || draggedCategoryId;
                      if (sourceId) placeBoardCategory(configuringBoard, sourceId, segment.id);
                      setDraggedCategoryId(null);
                      setDropTargetCategoryId(null);
                    }}
                    className={`rounded-lg border p-3 transition-colors ${
                      dropTargetCategoryId === segment.id ? 'border-amber-400 bg-amber-950/20' : 'border-zinc-800'
                    } ${draggedCategoryId === segment.id ? 'opacity-50' : ''}`}
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center">
                        <button
                          type="button"
                          draggable
                          data-category-drag-handle
                          onDragStart={(event) => {
                            event.dataTransfer.setData('text/plain', segment.id);
                            event.dataTransfer.effectAllowed = 'move';
                            setDraggedCategoryId(segment.id);
                          }}
                          onDragEnd={() => {
                            setDraggedCategoryId(null);
                            setDropTargetCategoryId(null);
                          }}
                          aria-label={`Drag to reorder ${segment.title} on Board ${configuringBoard + 1}`}
                          title="Drag to reorder category"
                          className="mr-1.5 shrink-0 cursor-grab touch-none text-zinc-500 hover:text-amber-300 active:cursor-grabbing"
                        ><GripVertical className="size-4" /></button>
                        <h4 className="truncate text-xs font-bold text-amber-300">
                          <span className="mr-1.5 font-mono text-zinc-500">{String(categoryOrderIndex + 1).padStart(2, '0')}</span>
                          {segment.title.replace(/[\p{Extended_Pictographic}\uFE0F]/gu, '').trim()}
                        </h4>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-[10px] text-zinc-400 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                          onClick={() => moveBoardCategory(configuringBoard, segment.id, -1)}
                          disabled={categoryOrderIndex === 0}
                          aria-label={`Move ${segment.title} earlier on Board ${configuringBoard + 1}`}
                          title="Move category earlier on the board"
                        ><ArrowUp className="size-3" /><span>Up</span></button>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-[10px] text-zinc-400 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                          onClick={() => moveBoardCategory(configuringBoard, segment.id, 1)}
                          disabled={categoryOrderIndex === configuredSegments.length - 1}
                          aria-label={`Move ${segment.title} later on Board ${configuringBoard + 1}`}
                          title="Move category later on the board"
                        ><ArrowDown className="size-3" /><span>Down</span></button>
                        <button
                          type="button"
                          className="text-[10px] text-zinc-400 hover:text-white"
                          onClick={() => setIncludedCards((previous) => {
                            const next = { ...previous };
                            segment.questions.forEach((question) => { next[cardSelectionKey(configuringBoard, segment.id, question.id)] = true; });
                            return next;
                          })}
                        >Select all</button>
                        <button
                          type="button"
                          className="text-[10px] text-zinc-400 hover:text-white"
                          onClick={() => setIncludedCards((previous) => {
                            const next = { ...previous };
                            segment.questions.forEach((question) => { delete next[cardSelectionKey(configuringBoard, segment.id, question.id)]; });
                            return next;
                          })}
                        >Clear</button>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {[...segment.questions].sort((a, b) => a.pointsRight - b.pointsRight).map((question) => {
                        const selected = isCardSelected(configuringBoard, segment.id, question.id);
                        return (
                          <label key={question.id} className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 hover:bg-zinc-900">
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => setIncludedCards((previous) => {
                                const key = cardSelectionKey(configuringBoard, segment.id, question.id);
                                const next = { ...previous };
                                if (selected) delete next[key];
                                else next[key] = true;
                                return next;
                              })}
                              className="mt-0.5 size-3.5 accent-amber-400"
                            />
                            <span className="min-w-0 text-[11px] leading-snug text-zinc-300">
                              <strong className="mr-1 font-mono text-amber-400">{question.pointsRight}</strong>
                              {(question.type === 'IMAGE_BASED' || question.displayMediaOnly) && (
                                <strong className="mr-1.5 font-extrabold uppercase text-white">{question.answer}</strong>
                              )}
                              {question.prompt}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Teams Setup */}
        <Card className="bg-zinc-900/80 border-zinc-800 shadow-2xl backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
              <Users className="size-5 text-amber-400" />
              Step 3: Name Your Teams &amp; Players
            </CardTitle>
            <CardDescription className="text-zinc-400 text-xs">
              Define the teams competing in the living room. Scores will update dynamically on the big TV.
            </CardDescription>
          </CardHeader>

          <CardContent className="flex flex-col gap-4">
            {/* Teams List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {teams.map((teamName, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/70"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="size-6 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono text-xs font-bold flex items-center justify-center">
                      #{idx + 1}
                    </span>
                    <span className="text-sm font-bold text-zinc-200">
                      {teamName}
                    </span>
                  </div>

                  <button
                    onClick={() => handleRemoveTeam(idx)}
                    aria-label={`Remove ${teamName}`}
                    className="text-zinc-500 hover:text-rose-400 transition-colors p-1"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add Team Input */}
            <div className="flex items-center gap-2 max-w-md mt-2">
              <Input
                placeholder="Enter team name..."
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTeam();
                  }
                }}
                className="bg-zinc-950 border-zinc-800 text-sm h-10"
              />
              <Button
                onClick={handleAddTeam}
                variant="outline"
                className="border-zinc-700 hover:bg-zinc-800 text-zinc-200 text-xs h-10 shrink-0"
              >
                <Plus className="size-4 mr-1" />
                Add Team
              </Button>
            </div>
          </CardContent>

          <CardFooter className="pt-4 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-zinc-500 font-mono">
              <Tv className="size-4 text-amber-400" />
              <span>Two routes will launch: /host (laptop) &amp; /screen (TV via HDMI/AirPlay)</span>
            </div>

            <Button
              size="lg"
              onClick={handleLaunchEngine}
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-zinc-950 font-black text-sm px-8 shadow-xl shadow-amber-500/20 cursor-pointer"
            >
              <Play className="size-4 mr-2 fill-current" />
              Launch Quiz Stage 🚀
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
