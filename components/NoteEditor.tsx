import React, { useState, useEffect, useRef } from 'react';
import { Note } from '../types';
import { supabase } from '../services/supabase';

interface NoteEditorProps {
  note?: Note | null;
  onSave: (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => void;
  onClose: () => void;
}

const AutoResizeTextarea: React.FC<{ 
  value: string; 
  onChange: (val: string) => void; 
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  innerRef?: (el: HTMLTextAreaElement | null) => void;
}> = React.memo(({ value, onChange, onKeyDown, placeholder, innerRef }) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const adjustHeight = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }
  };

  // Gunakan useLayoutEffect agar perubahan tinggi sinkron dengan render (mencegah teks terpotong visual)
  React.useLayoutEffect(() => {
    adjustHeight();
  }, [value]);

  return (
    <textarea
      ref={(el) => {
        textareaRef.current = el;
        if (innerRef) innerRef(el);
      }}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      rows={1}
      className="w-full bg-transparent resize-none overflow-hidden focus:outline-none text-slate-900 dark:text-zinc-100 text-sm leading-relaxed py-1"
    />
  );
});

export const NoteEditor: React.FC<NoteEditorProps> = ({ note, onSave, onClose }) => {
  const [title, setTitle] = useState(note?.title || '');
  const [blocks, setBlocks] = useState<string[]>(['']);
  const [category, setCategory] = useState<string>(note?.category || 'General');
  const [isPrivate, setIsPrivate] = useState(note?.isPrivate || false);
  
  const [availableCategories, setAvailableCategories] = useState<{id: string, name: string}[]>([]);
  const [isManaging, setIsManaging] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  
  const textareaRefs = useRef<(HTMLTextAreaElement | null)[]>([]);

  const updateBlock = React.useCallback((index: number, newValue: string) => {
    setBlocks(prev => {
      const newBlocks = [...prev];
      newBlocks[index] = newValue;
      return newBlocks;
    });
  }, []);

  const handleKeyDown = React.useCallback((index: number, e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    const value = target.value;
    const cursorPos = target.selectionStart;

    if (e.key === 'Enter' && !e.shiftKey) {
      if (value.endsWith('\n') && cursorPos === value.length) {
        e.preventDefault();
        const cleanedBlock = value.replace(/\n$/, '');
        setBlocks(prev => {
          const newBlocks = [...prev];
          newBlocks[index] = cleanedBlock;
          newBlocks.splice(index + 1, 0, '');
          return newBlocks;
        });
        setTimeout(() => textareaRefs.current[index + 1]?.focus(), 0);
      }
    }

    if (e.key === 'Backspace' && cursorPos === 0 && index > 0) {
      e.preventDefault();
      setBlocks(prev => {
        const newBlocks = [...prev];
        const currentContent = newBlocks[index];
        const prevContent = newBlocks[index - 1];
        newBlocks[index - 1] = prevContent + currentContent;
        newBlocks.splice(index, 1);
        
        setTimeout(() => {
          const prevEl = textareaRefs.current[index - 1];
          if (prevEl) {
            prevEl.focus();
            prevEl.setSelectionRange(prevContent.length, prevContent.length);
          }
        }, 0);
        return newBlocks;
      });
    }
  }, []);

  useEffect(() => {
    const fetchCats = async () => {
      const { data } = await supabase.from('notekita_categories').select('*').order('name');
      if (data) setAvailableCategories(data);
    };
    fetchCats();

    if (note) {
      setTitle(note.title);
      // Membagi konten berdasarkan double newline tanpa menghapus baris kosong (Agar Full Text)
      const initialBlocks = note.content.split(/\n\n/);
      setBlocks(initialBlocks.length > 0 ? initialBlocks : ['']);
      setCategory(note.category);
      setIsPrivate(note.isPrivate);
    }
  }, [note]);

  const addCategory = async () => {
    if (!newCatName.trim()) return;
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser) {
      const { data } = await supabase.from('notekita_categories').insert([{ user_id: authUser.id, name: newCatName }]).select().single();
      if (data) {
        setAvailableCategories([...availableCategories, data]);
        setNewCatName('');
      }
    }
  };

  const deleteCategory = async (id: string, name: string) => {
    if (!confirm(`Hapus kategori "${name}"?`)) return;
    await supabase.from('notekita_categories').delete().eq('id', id);
    setAvailableCategories(availableCategories.filter(c => c.id !== id));
    if (category === name) setCategory('General');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    // Menggabungkan kembali tanpa membuang konten kosong (Unlimited Text Integrity)
    const finalContent = blocks.join('\n\n');
    onSave({ id: note?.id, title, content: finalContent, category, isPrivate });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[90vh]">
        <form onSubmit={handleSave} className="p-8 flex flex-col h-full overflow-hidden">
          <div className="flex justify-between items-center mb-6 shrink-0">
            <h2 className="text-xl font-serif font-bold italic dark:text-white">{note ? 'Sunting' : 'Baru'}</h2>
            <button type="button" onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          {/* pb-40 memastikan block terakhir bisa di-scroll sampai ke atas modal */}
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6 pb-40">
            <input 
              type="text" 
              placeholder="Judul Catatan..." 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              className="w-full bg-transparent text-2xl font-bold focus:outline-none dark:text-white border-b border-transparent focus:border-indigo-500 py-2" 
            />
            <div className="space-y-4">
              {blocks.map((block, index) => (
                <React.Fragment key={index}>
                  <AutoResizeTextarea 
                    innerRef={(el) => { textareaRefs.current[index] = el; }} 
                    value={block} 
                    onChange={(val) => updateBlock(index, val)} 
                    onKeyDown={(e) => handleKeyDown(index, e)} 
                    placeholder={index === 0 ? "Mulai menulis tanpa batas karakter..." : ""} 
                  />
                  {index < blocks.length - 1 && block.trim() !== '' && (
                    <div className="relative py-2 flex items-center justify-center select-none pointer-events-none">
                      <div className="w-full border-t border-dashed border-slate-100 dark:border-zinc-800" />
                      <span className="absolute px-2 bg-white dark:bg-zinc-900 text-[8px] font-bold text-slate-300 dark:text-zinc-700 uppercase tracking-[0.3em]">Break</span>
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          <div className="mt-6 space-y-4 shrink-0 bg-white dark:bg-zinc-900 pt-4 border-t border-slate-100 dark:border-zinc-800">
            <div className="flex flex-wrap items-center gap-2">
              {availableCategories.map((cat) => (
                <div key={cat.id} className="group relative">
                  <button type="button" onClick={() => setCategory(cat.name)} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${category === cat.name ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 text-slate-500 border-slate-100 dark:bg-zinc-800 dark:border-zinc-700'}`}>
                    {cat.name}
                  </button>
                  {isManaging && (
                    <button type="button" onClick={() => deleteCategory(cat.id, cat.name)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] shadow-lg hover:scale-110">×</button>
                  )}
                </div>
              ))}
              <button type="button" onClick={() => setIsManaging(!isManaging)} className="px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tighter bg-slate-100 dark:bg-zinc-800 text-slate-400 hover:text-indigo-500 transition-colors">
                {isManaging ? 'Selesai' : 'Manage'}
              </button>
            </div>
            
            {isManaging && (
              <div className="flex items-center space-x-2 animate-in slide-in-from-bottom-2 duration-200">
                <input type="text" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="Nama kategori baru..." className="flex-1 bg-slate-50 dark:bg-zinc-800 border border-slate-100 dark:border-zinc-700 rounded-xl px-4 py-2 text-xs focus:outline-none dark:text-white" />
                <button type="button" onClick={addCategory} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold">Tambah</button>
              </div>
            )}

            <button type="submit" className="w-full bg-slate-900 dark:bg-zinc-100 dark:text-zinc-900 text-white py-4 rounded-2xl font-bold hover:opacity-90 shadow-xl transition-all">Simpan Catatan</button>
          </div>
        </form>
      </div>
    </div>
  );
};