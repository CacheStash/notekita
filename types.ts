
export type NoteCategory = 'Password' | 'ToDo' | 'Idea' | 'General' | 'Personal';

export interface Note {
  id: string;
  title: string;
  content: string;
  category: NoteCategory;
  isPrivate: boolean;
  createdAt: number;
  updatedAt: number;
}

export type Theme = 'light' | 'dark';
export type ViewMode = 'grid' | 'list';
export type SortBy = 'date' | 'title';
export type SortOrder = 'asc' | 'desc';

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  pin?: string;
  isPinEnabled: boolean;
}

export interface AppState {
  notes: Note[];
  theme: Theme;
  user: User | null;
}
