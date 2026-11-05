import Papa from 'papaparse';
import { Quiz, Segment, QnA, QuestionType } from '@/types/quiz';

export interface CSVRow {
  Segment?: string;
  Type?: string;
  Prompt?: string;
  Clue1?: string;
  Clue2?: string;
  Clue3?: string;
  Clue4?: string;
  Media?: string;
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
    const prompt = row.Prompt?.trim();
    const answer = row.Answer?.trim();

    if (!rawSegment && !prompt && !answer) {
      return; // Skip completely blank row
    }

    const segmentTitle = rawSegment || 'General Trivia';

    if (!prompt) {
      errors.push(`Row ${rowNum}: Missing required "Prompt" column.`);
      return;
    }

    if (!answer) {
      errors.push(`Row ${rowNum}: Missing required "Answer" column.`);
      return;
    }

    let rawType = (row.Type?.trim().toUpperCase() || 'STANDARD') as QuestionType;
    if (!['STANDARD', 'CLUE_BASED', 'IMAGE_BASED', 'CONNECT'].includes(rawType)) {
      rawType = 'STANDARD';
    }

    const clues: string[] = [];
    if (row.Clue1?.trim()) clues.push(row.Clue1.trim());
    if (row.Clue2?.trim()) clues.push(row.Clue2.trim());
    if (row.Clue3?.trim()) clues.push(row.Clue3.trim());
    if (row.Clue4?.trim()) clues.push(row.Clue4.trim());

    // Auto-promote to CLUE_BASED if clues exist and type was STANDARD
    if (clues.length > 0 && rawType === 'STANDARD') {
      rawType = 'CLUE_BASED';
    }

    const rawPointsRight = Number(row.PointsRight);
    const pointsRight = Number.isFinite(rawPointsRight) ? rawPointsRight : 10;

    let pointsWrong = -5;
    if (row.PointsWrong !== undefined && row.PointsWrong !== '') {
      const parsedWrong = Number(row.PointsWrong);
      if (Number.isFinite(parsedWrong)) {
        // Guarantee pointsWrong is stored as negative or 0
        pointsWrong = parsedWrong > 0 ? -parsedWrong : parsedWrong;
      }
    }

    const mediaRef = row.Media?.trim();

    const qna: QnA = {
      id: `qna-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
      type: rawType,
      prompt,
      clues: clues.length > 0 ? clues : undefined,
      mediaName: mediaRef || undefined,
      answer,
      pointsRight,
      pointsWrong,
      explanation: row.Explanation?.trim() || undefined,
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
        Prompt: q.prompt,
        Clue1: q.clues?.[0] || '',
        Clue2: q.clues?.[1] || '',
        Clue3: q.clues?.[2] || '',
        Clue4: q.clues?.[3] || '',
        Media: q.mediaName || '',
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
      Prompt: 'Identify the blockbuster Bollywood film',
      Clue1: 'Features an alien who arrives on Earth and loves eating paan',
      Clue2: 'Directed by Rajkumar Hirani, co-starring Anushka Sharma',
      Clue3: 'Aamir Khan plays the lead role',
      Clue4: 'His name is two letters',
      Media: '',
      Answer: 'PK (2014)',
      PointsRight: 10,
      PointsWrong: -5,
      Explanation: 'First Indian film to cross ₹700 crore worldwide.',
    },
    {
      Segment: 'Bollywood Connects',
      Type: 'CONNECT',
      Prompt: 'What connects these 4 actors?',
      Clue1: 'Shah Rukh Khan',
      Clue2: 'Deepika Padukone',
      Clue3: 'John Abraham',
      Clue4: 'Dimple Kapadia',
      Media: '',
      Answer: 'Principal cast of the 2023 film Pathaan',
      PointsRight: 15,
      PointsWrong: -5,
      Explanation: 'Part of the YRF Spy Universe.',
    },
    {
      Segment: 'Sports Champions',
      Type: 'STANDARD',
      Prompt: 'Who was the first male cricketer to score a double century in ODI cricket?',
      Clue1: '',
      Clue2: '',
      Clue3: '',
      Clue4: '',
      Media: '',
      Answer: 'Sachin Tendulkar (2010 vs South Africa)',
      PointsRight: 10,
      PointsWrong: 0,
      Explanation: 'Scored 200* in Gwalior.',
    },
    {
      Segment: 'Diwali Festivities',
      Type: 'IMAGE_BASED',
      Prompt: 'Identify this iconic traditional earthenware lamp',
      Clue1: '',
      Clue2: '',
      Clue3: '',
      Clue4: '',
      Media: 'diya.png',
      Answer: 'Diya (Mitti ka Diya)',
      PointsRight: 15,
      PointsWrong: -5,
      Explanation: 'Lit on Amavasya night to dispel darkness.',
    },
  ];

  return Papa.unparse(exampleRows, {
    quotes: true,
    header: true,
  });
}
