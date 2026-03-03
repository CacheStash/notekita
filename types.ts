export interface Category {
  id: string;
  name: string;
  user_id: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  category: string; // Sekarang merujuk pada nama kategori dinamis
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
  isPinEnabled: boolean;
  pin?: string;
  isContentHidden: boolean;
}

export interface AppState {
  notes: Note[];
  theme: Theme;
  user: User | null;
  categories: Category[]; // Menambahkan state kategori global
}