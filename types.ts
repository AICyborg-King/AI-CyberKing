export enum Subject {
  MATH = 'Mathematics',
  SCIENCE = 'Science',
  HISTORY = 'History',
  LITERATURE = 'Literature',
  LANGUAGES = 'Languages',
  CS = 'Computer Science'
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number; // Index
  explanation: string;
}

export interface QuizData {
  title: string;
  description: string;
  questions: QuizQuestion[];
}

export interface VocabularyItem {
  term: string;
  phonetic: string;
  definition: string;
}

export interface StudyMaterial {
  title: string;
  content: string; // Markdown supported
  summary: string;
  vocabulary: VocabularyItem[];
}

export enum AppMode {
  DASHBOARD = 'DASHBOARD',
  TUTOR = 'TUTOR',
  LIBRARY = 'LIBRARY',
  QUIZ = 'QUIZ'
}