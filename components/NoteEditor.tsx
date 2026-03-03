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
      setTitle(note.title); setContent(note.content); setCategory(note.category); setIsPrivate(note.isPrivate);
    }
  }, [note]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Disalin!');
  };

// Split berdasarkan blok paragraf (teks yang dipisahkan oleh satu atau lebih baris kosong)
  const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim() !== '');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden">
        <form onSubmit={(e) => { e.preventDefault(); onSave({ id: note?.id, title, content, category, isPrivate }); onClose(); }} className="p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-serif font-bold italic dark:text-white">{note ? 'Sunting' : 'Baru'}</h2>
            <div className="flex items-center space-x-2">
              {/* Master Copy Button */}
              <button type="button" onClick={() => copyToClipboard(content)} className="p-2 text-slate-400 hover:text-indigo-500 rounded-full transition-colors" title="Copy All">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" /></svg>
              </button>
              <button type="button" onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-slate-400"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
          </div>

          <div className="space-y-4">
            <input type="text" placeholder="Judul" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-transparent text-xl font-bold focus:outline-none dark:text-white border-b border-transparent focus:border-indigo-500 py-2" />
            
            <div className="flex space-x-4">
              <textarea placeholder="Tulis..." rows={10} value={content} onChange={(e) => setContent(e.target.value)} className="flex-1 bg-transparent resize-none focus:outline-none dark:text-zinc-300 text-sm py-2 leading-relaxed" />
              
              {/* Paragraph Copy Sidebar */}
              <div className="w-8 flex flex-col space-y-2 pt-2 overflow-y-auto max-h-[250px]">
                {paragraphs.map((p, i) => (
                  <button key={i} type="button" onClick={() => copyToClipboard(p)} className="p-1.5 text-slate-300 hover:text-indigo-500 bg-slate-50 dark:bg-zinc-800 rounded-lg transition-all" title="Copy paragraph">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" /></svg>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-4">
              {['General', 'Password', 'ToDo', 'Idea', 'Personal'].map((cat) => (
                <button key={cat} type="button" onClick={() => setCategory(cat as NoteCategory)} className={`px-3 py-1.5 rounded-full text-xs font-medium ${category === cat ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 dark:bg-zinc-800'}`}>{cat}</button>
              ))}
            </div>
          </div>
          <button type="submit" disabled={!content.trim()} className="w-full mt-8 bg-slate-900 dark:bg-white dark:text-slate-900 text-white py-4 rounded-2xl font-bold hover:opacity-90 disabled:opacity-30">Simpan Catatan</button>
        </form>
      </div>
    </div>
  );
};