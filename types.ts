export enum ModuleType {
  DASHBOARD = 'DASHBOARD',
  VOCABULARY = 'VOCABULARY',
  GRAMMAR = 'GRAMMAR',
  LISTENING = 'LISTENING',
  SPEAKING = 'SPEAKING',
  PRONUNCIATION = 'PRONUNCIATION',
  LOOKUP = 'LOOKUP',
}

export interface VocabularyItem {
  word: string;
  pronunciation: string;
  definition: string;
  example: string;
  translation: string;
}

export interface WordDetails {
  pronunciation: string | null;
  translation: string | null;
}

export interface ListeningQuestion {
  question: string;
  options: string[];
  answer: string;
}

export interface ListeningExercise {
  dialogue: { speaker: string; line: string; translation: string }[];
  questions: ListeningQuestion[];
}

export interface ChatMessage {
  sender: 'user' | 'model';
  text: string;
  feedback?: string;
}

export interface TranscribedSpeech {
  transcription: string;
  feedback: string;
}

export interface IPASound {
  symbol: string;
  examples: string[];
  type: 'vowel' | 'consonant';
  description: string;
  imageUrl: string;
}

export interface PronunciationFeedback {
  type: 'correct' | 'incorrect' | 'info';
  message: string;
}

export interface LookupResult {
  word: string;
  pronunciation: string;
  translation: string;
  examples: string[];
  synonyms?: string[];
  antonyms?: string[];
}
