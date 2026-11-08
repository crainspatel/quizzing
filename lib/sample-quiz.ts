import { Quiz } from '@/types/quiz';
import { DOCX_SHORTLIST_QUIZ } from '@/lib/docx-shortlist-quiz';

const BUZZING_WITH_KVIZZING_QUIZ_RAW: Quiz = DOCX_SHORTLIST_QUIZ;

const SAMPLE_FESTIVE_QUIZ_RAW: Quiz = {
  id: 'sample-festive-pub-quiz',
  title: 'Diwali & House Party Pub Quiz 🪔',
  createdAt: '2026-11-03T22:58:00.000Z',
  segments: [
    {
      id: 'seg-bollywood',
      title: 'Bollywood Connects',
      description: 'Deduce the movie, characters, or common threads.',
      questions: [
        {
          id: 'bolly-1',
          type: 'CLUE_BASED',
          prompt: 'Identify the blockbuster Bollywood film from these clues',
          clues: [
            'The protagonist arrives on Earth without any clothes or spoken language.',
            'He develops an obsession with eating paan and wearing vibrant radio transistors.',
            'Directed by Rajkumar Hirani, co-starring Anushka Sharma and Sushant Singh Rajput.',
            'His name is simply two initials questioning his origin.',
          ],
          answer: 'PK (2014)',
          pointsRight: 10,
          pointsWrong: -5,
          explanation: 'PK was the first Indian film to gross over ₹700 crore worldwide.',
        },
        {
          id: 'bolly-2',
          type: 'CONNECT',
          prompt: 'What connects these 4 Bollywood actors?',
          clues: [
            'Shah Rukh Khan (Jim / RAW)',
            'Deepika Padukone (Rubina Mohsin)',
            'John Abraham (Jim)',
            'Dimple Kapadia (Nandini Grewal)',
          ],
          answer: 'Principal cast members of the YRF Spy Universe film "Pathaan" (2023)',
          pointsRight: 15,
          pointsWrong: -5,
          explanation: 'Pathaan kicked off the connected YRF Spy Universe phase in 2023.',
        },
        {
          id: 'bolly-3',
          type: 'CLUE_BASED',
          prompt: 'Name this high-energy comedy adventure',
          clues: [
            'A 40-year-old bachelor boards a train to Rameshwaram to immerse his grandfather\'s ashes.',
            'Features the famous catchphrase: "Don\'t underestimate the power of a common man!"',
            'Features the viral soundtrack "Lungi Dance" dedicated to Rajinikanth.',
          ],
          answer: 'Chennai Express (2013)',
          pointsRight: 10,
          pointsWrong: -5,
          explanation: 'Directed by Rohit Shetty starring SRK and Deepika Padukone.',
        },
      ],
    },
    {
      id: 'seg-sports',
      title: 'Sports & Champions',
      description: 'Records, iconic moments, and lateral sports trivia.',
      questions: [
        {
          id: 'sport-1',
          type: 'STANDARD',
          prompt: 'Who was the first male cricketer in history to score a double century (200*) in an ODI match?',
          answer: 'Sachin Tendulkar (vs South Africa at Gwalior, 24 Feb 2010)',
          pointsRight: 10,
          pointsWrong: 0,
          explanation: 'Tendulkar scored 200 not out off 147 balls, breaking Saeed Anwar and Charles Coventry\'s 194.',
        },
        {
          id: 'sport-2',
          type: 'CLUE_BASED',
          prompt: 'Identify the Indian sports legend from these clues',
          clues: [
            'Hails from Khandra village in Panipat, Haryana.',
            'Became the second Indian after Abhinav Bindra to win an individual Olympic gold medal.',
            'Set an 87.58m mark on his second attempt in Tokyo 2020.',
            'His signature victory throw is in Javelin.',
          ],
          answer: 'Neeraj Chopra',
          pointsRight: 10,
          pointsWrong: -5,
          explanation: 'Neeraj also won silver at Paris 2024 with an 89.45m throw.',
        },
        {
          id: 'sport-3',
          type: 'STANDARD',
          prompt: 'In standard competitive Kabaddi, how many active players from each team are on the court at the start of a match?',
          answer: '7 players',
          pointsRight: 5,
          pointsWrong: 0,
          explanation: 'Each squad consists of 12 players (7 on court and 5 reserves).',
        },
      ],
    },
    {
      id: 'seg-diwali',
      title: 'Diwali & Festivities',
      description: 'Traditions, mythology, sweets, and celebration trivia.',
      questions: [
        {
          id: 'diwali-1',
          type: 'CLUE_BASED',
          prompt: 'Identify the occasion or day within the 5-day Diwali festive cycle',
          clues: [
            'It marks the first official day of the Diwali festive period.',
            'Associated with the emergence of Lord Dhanvantari, physician of the gods.',
            'Considered an auspicious day to purchase gold, silver, or new kitchen utensils.',
          ],
          answer: 'Dhanteras (Dhanatrayodashi)',
          pointsRight: 15,
          pointsWrong: -10,
          explanation: 'Falls on the thirteenth lunar day of Krishna Paksha in the month of Ashvin/Kartik.',
        },
        {
          id: 'diwali-2',
          type: 'STANDARD',
          prompt: 'Which famous melt-in-mouth sweet, made of gram flour, ghee, sugar, and almond flakes, is also known as "Patisa" in northern India?',
          answer: 'Soan Papdi',
          pointsRight: 10,
          pointsWrong: -5,
          explanation: 'The classic house-party gift passed from one relative to another every Diwali!',
        },
        {
          id: 'diwali-3',
          type: 'CLUE_BASED',
          prompt: 'Mythology & Epics: Why do people light clay lamps (diyas) on Diwali night?',
          clues: [
            'It commemorates the return of an exiled king to his birthplace after 14 years.',
            'He had just defeated the demon king Ravana in Lanka.',
            'The citizens of this ancient kingdom illuminated the entire city with diyas on a moonless Amavasya night.',
          ],
          answer: 'Lord Rama\'s return to Ayodhya with Sita and Lakshmana',
          pointsRight: 20,
          pointsWrong: -10,
          explanation: 'The dark Amavasya night of Kartik was transformed into a city of light.',
        },
      ],
    },
    {
      id: 'seg-science',
      title: 'Science & World Curiosities',
      description: 'Lateral logic and surprising natural facts.',
      questions: [
        {
          id: 'sci-1',
          type: 'CONNECT',
          prompt: 'Identify the common program / entity connecting these names',
          clues: [
            'Project Mercury (1958-1963)',
            'Project Gemini (1961-1966)',
            'Apollo Program (1961-1972)',
            'Artemis Program (2017-present)',
          ],
          answer: 'NASA\'s crewed human spaceflight programs',
          pointsRight: 15,
          pointsWrong: -5,
          explanation: 'All named after ancient Greco-Roman deities representing phases of American spaceflight.',
        },
        {
          id: 'sci-2',
          type: 'CLUE_BASED',
          prompt: 'Identify this celestial body',
          clues: [
            'It is the second-largest planet in our Solar System.',
            'Its density is so low that it would theoretically float in a massive cosmic bathtub of water.',
            'It has 146 confirmed moons, with the largest named Titan.',
            'Recognized immediately by its prominent, majestic planetary ring system.',
          ],
          answer: 'Saturn',
          pointsRight: 10,
          pointsWrong: -5,
          explanation: 'Saturn\'s average density is 0.687 g/cm³, lower than water (1 g/cm³).',
        },
        {
          id: 'sci-3',
          type: 'STANDARD',
          prompt: 'Which mammal is the only one in the animal kingdom capable of true, self-powered sustained flight (not just gliding)?',
          answer: 'Bat (Order Chiroptera)',
          pointsRight: 10,
          pointsWrong: 0,
          explanation: 'Flying squirrels and sugar gliders only glide; bats have true powered flapping flight.',
        },
      ],
    },
  ],
};

function useMatchingWrongPoints(quiz: Quiz): Quiz {
  return {
    ...quiz,
    segments: quiz.segments.map((segment) => ({
      ...segment,
      questions: segment.questions.map((question) => ({
        ...question,
        displayMediaOnly: question.displayMediaOnly ?? (segment.title.toLowerCase().includes('logo') && question.type === 'IMAGE_BASED'),
        pointsWrong: -Math.abs(question.pointsRight),
      })),
    })),
  };
}

export const BUZZING_WITH_KVIZZING_QUIZ = useMatchingWrongPoints(BUZZING_WITH_KVIZZING_QUIZ_RAW);
export const SAMPLE_FESTIVE_QUIZ = useMatchingWrongPoints(SAMPLE_FESTIVE_QUIZ_RAW);

// Default export is Buzzing with Kvizzing!
export const SAMPLE_QUIZ: Quiz = BUZZING_WITH_KVIZZING_QUIZ;
