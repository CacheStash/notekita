
import React, { useState, useEffect } from 'react';
import { Note, NoteCategory } from '../types';

interface NoteEditorProps {
  note?: Note | null;
  onSave: (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => void;
  onClose: () => void;
}

export const NoteEditor: React.FC<NoteEditorProps> = ({ note, onSave, onClose }) => {
  const [title, setTitle] = useState(note?.title || '');
  const [content, setContent] = useState(note?.content || '');
  const [category, setCategory] = useState<NoteCategory>(note?.category || 'General');
  const [isPrivate, setIsPrivate] = useState(note?.isPrivate || false);

  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content);
      setCategory(note.category);
      setIsPrivate(note.isPrivate);
    }
  }, [note]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: note?.id,
      title,
      content,
      category,
      isPrivate
    });
    onClose();
  };

  const categories: NoteCategory[] = ['General', 'Password', 'ToDo', 'Idea', 'Personal'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden">
        <form onSubmit={handleSubmit} className="p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-serif font-bold italic dark:text-white">
              {note ? 'Sunting Catatan' : 'Catatan Baru'}
            </h2>
            <button 
              type="button" 
              onClick={onClose}
              className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-slate-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <input
                type="text"
                placeholder="Judul"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-transparent text-xl font-bold focus:outline-none dark:text-white placeholder-slate-300 dark:placeholder-zinc-600 border-b border-transparent focus:border-indigo-500 transition-all py-2"
              />
            </div>

            <div>
              <textarea
                placeholder="Tulis apa saja di sini..."
                rows={6}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full bg-transparent resize-none focus:outline-none dark:text-zinc-300 placeholder-slate-300 dark:placeholder-zinc-700 leading-relaxed text-sm py-2"
              />
            </div>

            <div className="flex flex-wrap gap-2 pt-4">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    category === cat
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-500 dark:bg-zinc-800 dark:text-zinc-500 hover:bg-slate-200 dark:hover:bg-zinc-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between pt-6">
              <div className="flex space-x-4 items-center">
                <label className="flex items-center space-x-2 cursor-pointer group">
                  <div className={`w-10 h-6 rounded-full transition-colors relative ${isPrivate ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-zinc-700'}`}>
                    <input 
                      type="checkbox" 
                      className="hidden" 
                      checked={isPrivate} 
                      onChange={() => setIsPrivate(!isPrivate)} 
                    />
                    <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${isPrivate ? 'translate-x-4' : ''}`} />
                  </div>
                  <span className="text-xs text-slate-500 dark:text-zinc-400 group-hover:text-slate-700 dark:group-hover:text-zinc-300 transition-colors">
                    Sembunyikan isi (Sensitif)
                  </span>
                </label>
              </div>
            </div>
          </div>

          <div className="mt-8 flex space-x-3">
             <button
              type="submit"
              disabled={!content.trim()}
              className="flex-1 bg-slate-900 dark:bg-white dark:text-slate-900 text-white py-3 rounded-2xl font-bold hover:opacity-90 transition-opacity disabled:opacity-30"
            >
              Simpan Catatan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
