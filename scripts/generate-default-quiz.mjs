import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import Papa from 'papaparse';

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const csvPath = path.join(projectDir, 'Buzzing with Kvizzing Shortlist.csv');
const outputPath = path.join(projectDir, 'lib', 'docx-shortlist-quiz.ts');
const csv = (await readFile(csvPath, 'utf8')).replace(/^\uFEFF/, '');
const parsed = Papa.parse(csv, {
  header: true,
  skipEmptyLines: 'greedy',
  transformHeader: (header) => header.trim(),
});

if (parsed.errors.length) {
  throw new Error(parsed.errors.map((error) => error.message).join('\n'));
}

const segments = [];
const segmentMap = new Map();
const acceptedTypes = new Set(['STANDARD', 'CLUE_BASED', 'IMAGE_BASED', 'CONNECT']);
// Keep these IDs stable when category labels change so saved curation presets
// and existing game sessions can still match their selected categories.
const stableSegmentSlugs = new Map([
  ['2 Words 1 Letter Apart', 'this-not--this'],
  // Preserve category identity for saved presets created before the display title was pluralized.
  ['Mere Pass MAA hai (Mergers And Acquisitions)', 'mere-pass-maa-hai--merger-and-aquisition-'],
]);

for (const [index, row] of parsed.data.entries()) {
  const rawSegment = row.Segment?.trim();
  const prompt = row.Question?.trim() ? row.Question : row.Prompt || '';
  const answer = row.Answer || '';
  const mediaRef = row.Media?.trim() || '';
  const revealMediaRef = row.RevealMedia?.trim() || '';
  const clues = ['Clue1', 'Clue2', 'Clue3', 'Clue4']
    .map((column) => row[column] || '')
    .filter((clue) => clue.trim());

  if (!rawSegment && !prompt.trim() && !answer.trim()) continue;
  if (!answer.trim()) throw new Error(`CSV row ${index + 2} is missing Answer.`);
  if (!prompt.trim() && !mediaRef && clues.length === 0) {
    throw new Error(`CSV row ${index + 2} needs Question, Media, or at least one clue.`);
  }

  const title = rawSegment
    ? rawSegment.replace(/[\p{Extended_Pictographic}\uFE0F]/gu, '').trim() || 'General Trivia'
    : 'General Trivia';
  let segment = segmentMap.get(title);
  if (!segment) {
    const slug = stableSegmentSlugs.get(title) ?? title.toLowerCase().replace(/[^a-z0-9]/g, '-');
    segment = {
      id: `seg-${segments.length}-${slug}`,
      title,
      questions: [],
    };
    segmentMap.set(title, segment);
    segments.push(segment);
  }

  let type = (row.Type?.trim().toUpperCase() || 'STANDARD');
  if (!acceptedTypes.has(type)) type = 'STANDARD';
  if (clues.length && type === 'STANDARD') type = 'CLUE_BASED';

  const pointsText = row.PointsRight == null ? '' : String(row.PointsRight).trim();
  const parsedPoints = pointsText ? Number(pointsText) : 10;
  const pointsRight = Number.isFinite(parsedPoints) ? parsedPoints : 10;
  const mediaOnlyValue = row.MediaOnly?.trim().toLowerCase();
  const mediaOnly = ['true', '1', 'yes'].includes(mediaOnlyValue)
    || (title.toLowerCase().includes('logo') && type === 'IMAGE_BASED');

  const question = {
    id: `doc-card-${index + 1}`,
    type,
    prompt,
    answer,
    pointsRight,
    pointsWrong: -Math.abs(pointsRight),
  };
  const isMoviePosterCategory = /minimalist (hollywood|bollywood) poster/i.test(title);
  const yearMatch = isMoviePosterCategory ? answer.match(/\((\d{4}(?:[–-]\d{4})?)\)\s*$/) : null;
  if (yearMatch) question.releaseYear = yearMatch[1];
  const description = row.Description;
  if (description) question.description = description;
  if (clues.length) question.clues = clues;
  if (mediaRef) {
    question.mediaName = mediaRef;
    if (/^(https?:|data:image\/|\/)/i.test(mediaRef)) question.media = mediaRef;
  }
  if (revealMediaRef) {
    question.revealMediaName = revealMediaRef;
    if (/^(https?:|data:image\/|\/)/i.test(revealMediaRef)) question.revealMedia = revealMediaRef;
  }
  if (mediaOnly) question.displayMediaOnly = true;
  const explanation = row.Explanation;
  if (explanation) question.explanation = explanation;
  segment.questions.push(question);
}

if (!segments.length) throw new Error('The shortlist CSV has no valid question rows.');

const quiz = {
  id: 'buzzing-with-kvizzing-default',
  title: 'Buzzing with Kvizzing',
  createdAt: '2026-11-05T08:00:00.000Z',
  segments,
};
const generated = `// Generated from "Buzzing with Kvizzing Shortlist.csv". Edit the CSV, not this file.\nimport type { Quiz } from '@/types/quiz';\n\nexport const DOCX_SHORTLIST_QUIZ: Quiz = ${JSON.stringify(quiz, null, 2)};\n`;
await writeFile(outputPath, generated, 'utf8');
console.log(`Built-in quiz synced from CSV: ${segments.length} categories, ${segments.reduce((sum, segment) => sum + segment.questions.length, 0)} cards.`);
