'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Quiz, TeamScore, CardStatus, GameSession } from '@/types/quiz';
import { SAMPLE_QUIZ } from '@/lib/sample-quiz';
import { parseQuizCSV, generateTemplateCSV, exportQuizToCSV } from '@/lib/csv';
import {
  saveSessionToLocalStorage,
  loadSessionFromLocalStorage,
  saveMediaItem,
  saveLastDisplayCommand,
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
} from 'lucide-react';

export default function LobbyPage() {
  const router = useRouter();

  // Selected Quiz
  const [quiz, setQuiz] = useState<Quiz>(SAMPLE_QUIZ);
  const [isSampleSelected, setIsSampleSelected] = useState(true);

  // CSV import state
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [importedFileName, setImportedFileName] = useState<string | null>(null);

  // Teams state
  const [teams, setTeams] = useState<string[]>([
    'Diwali Dynamos 🪔',
    'Patakha Paltan 🎆',
    'Rocket Rascals 🚀',
  ]);
  const [newTeamName, setNewTeamName] = useState('');

  // Hydrate previous session using lazy state initialization (Vercel best practice)
  const [hasExistingSession] = useState(() => {
    const existing = loadSessionFromLocalStorage();
    return Boolean(existing && existing.quiz);
  });

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
        setQuiz(parsedQuiz);
        setIsSampleSelected(false);
        setImportedFileName(file.name);
      }
    };
    reader.readAsText(file);
  }

  async function handleMediaUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      reader.onload = async (event) => {
        const dataUrl = event.target?.result as string;
        if (dataUrl) {
          await saveMediaItem(file.name, dataUrl);
        }
      };
      reader.readAsDataURL(file);
    }
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

  function handleLaunchEngine() {
    if (teams.length < 1) {
      alert('Please add at least one team.');
      return;
    }

    // Build fresh game session
    const teamScores: TeamScore[] = teams.map((name) => ({ name, score: 0 }));
    const initialCardStates: Record<string, CardStatus> = {};

    quiz.segments.forEach((s) => {
      s.questions.forEach((q) => {
        initialCardStates[`${s.id}:${q.id}`] = 'AVAILABLE';
      });
    });

    const newSession: GameSession = {
      id: `session-${Date.now()}`,
      quiz,
      teams: teamScores,
      cardStates: initialCardStates,
      scoreHistory: [],
      lastUpdated: Date.now(),
    };

    saveSessionToLocalStorage(newSession);

    // Initial Display Command: Board view
    const displaySegments = quiz.segments.map((s) => ({
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
    });

    const bus = getSyncBus();
    bus.sendCommand({
      type: 'SHOW_BOARD',
      segments: displaySegments,
      cardStates: initialCardStates,
      teams: teamScores,
    });

    // Open TV Display tab
    window.open('/screen', '_blank', 'noopener,noreferrer');

    // Route current tab to /host
    router.push('/host');
  }

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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Preset Deck */}
              <div
                onClick={() => {
                  setQuiz(SAMPLE_QUIZ);
                  setIsSampleSelected(true);
                  setCsvErrors([]);
                  setImportedFileName(null);
                }}
                className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                  isSampleSelected
                    ? 'border-amber-400 bg-amber-950/20 ring-2 ring-amber-400/40 shadow-lg'
                    : 'border-zinc-800 hover:border-zinc-700 bg-zinc-950/50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-xs font-semibold">
                    Preloaded Ready-to-Play
                  </Badge>
                  {isSampleSelected && <CheckCircle2 className="size-4 text-amber-400" />}
                </div>

                <h3 className="font-bold text-lg text-white mb-1">
                  {SAMPLE_QUIZ.title}
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  4 Segments (Bollywood Connects, Sports Champions, Diwali Festivities, Science Curiosities) • 12 lateral questions with progressive clues.
                </p>
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
                  Question Media Images (Optional)
                </span>
                <span className="text-[11px] text-zinc-500">
                  If your CSV has filenames in the <code className="text-amber-400 font-mono">Media</code> column, select the matching image files here.
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

        {/* Section 2: Teams Setup */}
        <Card className="bg-zinc-900/80 border-zinc-800 shadow-2xl backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
              <Users className="size-5 text-amber-400" />
              Step 2: Name Your Teams &amp; Players
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
