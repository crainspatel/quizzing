import Papa from 'papaparse';
import { Quiz, Segment, QnA, QuestionType } from '@/types/quiz';

export interface CSVRow {
  Segment?: string;
  Type?: string;
  Question?: string;
  Prompt?: string;
  Description?: string;
  Clue1?: string;
  Clue2?: string;
  Clue3?: string;
  Clue4?: string;
  Media?: string;
  RevealMedia?: string;
  MediaOnly?: string;
  Answer?: string;
  PointsRight?: string | number;
  PointsWrong?: string | number;
  Explanation?: string;
}

export function parseQuizCSV(csvContent: string, quizTitle = 'Imported Quiz'): { quiz: Quiz; errors: string[] } {
  const errors: string[] = [];

  const parsed = Papa.parse<CSVRow>(csvContent, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim(),
  });

  if (parsed.errors && parsed.errors.length > 0) {
    for (const err of parsed.errors) {
      errors.push(`Line ${err.row}: ${err.message}`);
    }
  }

  const rows = parsed.data;
  if (!rows || rows.length === 0) {
    return {
      quiz: {
        id: `quiz-${Date.now()}`,
        title: quizTitle,
        createdAt: new Date().toISOString(),
        segments: [],
      },
      errors: ['The CSV file contains no data rows.'],
    };
  }

  // Segment grouping map preserving first-occurrence order
  const segmentMap = new Map<string, QnA[]>();
  const segmentOrder: string[] = [];

  rows.forEach((row, index) => {
    const rowNum = index + 2; // header is line 1
    const rawSegment = row.Segment?.trim();
    const prompt = row.Question?.trim() ? row.Question : row.Prompt;
    const description = row.Description;
    const answer = row.Answer;

    if (!rawSegment && !prompt?.trim() && !answer?.trim()) {
      return; // Skip completely blank row
    }

    const segmentTitle = (rawSegment || 'General Trivia')
      .replace(/[\p{Extended_Pictographic}\uFE0F]/gu, '')
      .trim();

    if (!answer?.trim()) {
      errors.push(`Row ${rowNum}: Missing required "Answer" column.`);
      return;
    }

    let rawType = (row.Type?.trim().toUpperCase() || 'STANDARD') as QuestionType;
    if (!['STANDARD', 'CLUE_BASED', 'IMAGE_BASED', 'CONNECT'].includes(rawType)) {
      rawType = 'STANDARD';
    }

    const clues: string[] = [];
    if (row.Clue1?.trim()) clues.push(row.Clue1);
    if (row.Clue2?.trim()) clues.push(row.Clue2);
    if (row.Clue3?.trim()) clues.push(row.Clue3);
    if (row.Clue4?.trim()) clues.push(row.Clue4);

    const hasMedia = Boolean(row.Media?.trim());
    if (!prompt?.trim() && !hasMedia && clues.length === 0) {
      errors.push(`Row ${rowNum}: Add a question, image, or at least one clue.`);
      return;
    }

    // Auto-promote to CLUE_BASED if clues exist and type was STANDARD
    if (clues.length > 0 && rawType === 'STANDARD') {
      rawType = 'CLUE_BASED';
    }

    const pointsText = row.PointsRight == null ? '' : String(row.PointsRight).trim();
    const rawPointsRight = pointsText ? Number(pointsText) : 10;
    const pointsRight = Number.isFinite(rawPointsRight) ? rawPointsRight : 10;

    const pointsWrong = -Math.abs(pointsRight);

    const mediaRef = row.Media?.trim();
    const revealMediaRef = row.RevealMedia?.trim();

    const qna: QnA = {
      id: `qna-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
      type: rawType,
      prompt: prompt || '',
      description: description || undefined,
      clues: clues.length > 0 ? clues : undefined,
      mediaName: mediaRef || undefined,
      media: mediaRef && (/^(https?:|data:image\/|\/)/i.test(mediaRef)) ? mediaRef : undefined,
      revealMediaName: revealMediaRef || undefined,
      revealMedia: revealMediaRef && (/^(https?:|data:image\/|\/)/i.test(revealMediaRef)) ? revealMediaRef : undefined,
      displayMediaOnly: row.MediaOnly?.trim().toLowerCase() === 'true'
        || row.MediaOnly?.trim() === '1'
        || row.MediaOnly?.trim().toLowerCase() === 'yes'
        || (segmentTitle.toLowerCase().includes('logo') && rawType === 'IMAGE_BASED'),
      answer,
      pointsRight,
      pointsWrong,
      explanation: row.Explanation?.trim() ? row.Explanation : undefined,
    };

    if (!segmentMap.has(segmentTitle)) {
      segmentMap.set(segmentTitle, []);
      segmentOrder.push(segmentTitle);
    }
    segmentMap.get(segmentTitle)!.push(qna);
  });

  const segments: Segment[] = segmentOrder.map((title, sIdx) => ({
    id: `seg-${sIdx}-${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
    title,
    questions: segmentMap.get(title) || [],
  }));

  const quiz: Quiz = {
    id: `quiz-${Date.now()}`,
    title: quizTitle,
    createdAt: new Date().toISOString(),
    segments,
  };

  return { quiz, errors };
}

export function exportQuizToCSV(quiz: Quiz): string {
  const rows: Record<string, string | number>[] = [];

  for (const seg of quiz.segments) {
    for (const q of seg.questions) {
      const row: Record<string, string | number> = {
        Segment: seg.title,
        Type: q.type,
        Question: q.prompt,
        Description: q.description || '',
        Clue1: q.clues?.[0] || '',
        Clue2: q.clues?.[1] || '',
        Clue3: q.clues?.[2] || '',
        Clue4: q.clues?.[3] || '',
        Media: q.mediaName || '',
        RevealMedia: q.revealMediaName || '',
        MediaOnly: q.displayMediaOnly ? 'true' : '',
        Answer: q.answer,
        PointsRight: q.pointsRight,
        PointsWrong: q.pointsWrong,
        Explanation: q.explanation || '',
      };
      rows.push(row);
    }
  }

  return Papa.unparse(rows, {
    quotes: true,
    header: true,
  });
}

export function generateTemplateCSV(): string {
  const exampleRows = [
    {
      Segment: 'Bollywood Connects',
      Type: 'CLUE_BASED',
      Question: 'Identify the blockbuster Bollywood film',
      Description: '',
      Clue1: 'Features an alien who arrives on Earth and loves eating paan',
      Clue2: 'Directed by Rajkumar Hirani, co-starring Anushka Sharma',
      Clue3: 'Aamir Khan plays the lead role',
      Clue4: 'His name is two letters',
      Media: '',
      RevealMedia: '',
      Answer: 'PK (2014)',
      PointsRight: 10,
      PointsWrong: -10,
      Explanation: 'First Indian film to cross ₹700 crore worldwide.',
    },
    {
      Segment: 'Bollywood Connects',
      Type: 'CONNECT',
      Question: 'What connects these 4 actors?',
      Description: '',
      Clue1: 'Shah Rukh Khan',
      Clue2: 'Deepika Padukone',
      Clue3: 'John Abraham',
      Clue4: 'Dimple Kapadia',
      Media: '',
      RevealMedia: '',
      Answer: 'Principal cast of the 2023 film Pathaan',
      PointsRight: 15,
      PointsWrong: -15,
      Explanation: 'Part of the YRF Spy Universe.',
    },
    {
      Segment: 'Sports Champions',
      Type: 'STANDARD',
      Question: 'Who was the first male cricketer to score a double century in ODI cricket?',
      Description: '',
      Clue1: '',
      Clue2: '',
      Clue3: '',
      Clue4: '',
      Media: '',
      RevealMedia: '',
      Answer: 'Sachin Tendulkar (2010 vs South Africa)',
      PointsRight: 10,
      PointsWrong: -10,
      Explanation: 'Scored 200* in Gwalior.',
    },
    {
      Segment: 'Diwali Festivities',
      Type: 'IMAGE_BASED',
      Question: 'Identify this iconic traditional earthenware lamp',
      Description: '',
      Clue1: '',
      Clue2: '',
      Clue3: '',
      Clue4: '',
      Media: 'diya.png',
      RevealMedia: '',
      Answer: 'Diya (Mitti ka Diya)',
      PointsRight: 15,
      PointsWrong: -15,
      Explanation: 'Lit on Amavasya night to dispel darkness.',
    },
  ];

  return Papa.unparse(exampleRows, {
    quotes: true,
    header: true,
  });
}
