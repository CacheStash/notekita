import React, { useState, useEffect, useRef } from 'react';
import { Note } from '../types';
import { supabase } from '../services/supabase';

interface NoteEditorProps {
  note?: Note | null;
  onSave: (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => void;
  onClose: () => void;
  categories?: { id: string; name: string }[];
  onCategoriesChange?: () => void;
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

// Helper deduplikasi kategori berdasarkan nama
const dedupeCategories = (list: { id?: string; name: string }[]) => {
  const seen = new Set<string>();
  const unique: { id: string; name: string }[] = [];
  const duplicateIds: string[] = [];

  for (const item of list) {
    const rawName = item?.name ? String(item.name).trim() : '';
    if (!rawName) continue;
    const lower = rawName.toLowerCase();
    if (seen.has(lower)) {
      if (item.id) duplicateIds.push(item.id);
    } else {
      seen.add(lower);
      unique.push({ id: item.id || rawName, name: rawName });
    }
  }

  return { unique, duplicateIds };
};

export const NoteEditor: React.FC<NoteEditorProps> = ({
  note,
  onSave,
  onClose,
  categories = [],
  onCategoriesChange,
}) => {
  const [title, setTitle] = useState(note?.title || '');
  const [blocks, setBlocks] = useState<string[]>(['']);
  const [category, setCategory] = useState<string>(note?.category || 'General');
  const [isPrivate, setIsPrivate] = useState(note?.isPrivate || false);
  
  const [availableCategories, setAvailableCategories] = useState<{ id: string; name: string }[]>(
    () => dedupeCategories(categories).unique
  );
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
    let isMounted = true;

    const fetchCats = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!isMounted) return;

        if (authUser) {
          const { data } = await supabase
            .from('notekita_categories')
            .select('id, name')
            .eq('user_id', authUser.id)
            .order('name');

          if (!isMounted) return;

          if (data && data.length > 0) {
            const { unique, duplicateIds } = dedupeCategories(data);
            setAvailableCategories(unique);

            // Bersihkan duplikat baris dari database Supabase secara background
            if (duplicateIds.length > 0) {
              supabase
                .from('notekita_categories')
                .delete()
                .in('id', duplicateIds)
                .then(() => onCategoriesChange?.());
            }
          } else if (categories.length > 0) {
            setAvailableCategories(dedupeCategories(categories).unique);
          }
        } else if (categories.length > 0) {
          setAvailableCategories(dedupeCategories(categories).unique);
        }
      } catch (err) {
        console.error('Error fetching categories:', err);
      }
    };

    fetchCats();

    if (note) {
      setTitle(note.title);
      // Membagi konten berdasarkan double newline tanpa menghapus baris kosong (Agar Full Text)
      const initialBlocks = note.content ? note.content.split(/\n\n/) : [''];
      setBlocks(initialBlocks.length > 0 ? initialBlocks : ['']);
      const cat = note.category || 'General';
      setCategory(cat);
      const isPass = cat.toLowerCase() === 'password' || cat.toLowerCase() === 'pass';
      setIsPrivate(note.isPrivate || isPass);
    } else {
      setTitle('');
      setBlocks(['']);
      setCategory('General');
      setIsPrivate(false);
    }

    return () => {
      isMounted = false;
    };
  }, [note, categories]);

  const addCategory = async () => {
    const trimmed = newCatName.trim();
    if (!trimmed) return;

    // Cegah duplikasi nama kategori
    if (availableCategories.some(c => c.name.toLowerCase() === trimmed.toLowerCase())) {
      setNewCatName('');
      return;
    }

    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser) {
      const { data, error } = await supabase
        .from('notekita_categories')
        .insert([{ user_id: authUser.id, name: trimmed }])
        .select()
        .single();

      if (!error && data) {
        setAvailableCategories(prev => dedupeCategories([...prev, data]).unique);
        setNewCatName('');
        onCategoriesChange?.();
      }
    }
  };

  const deleteCategory = async (id: string, name: string) => {
    if (!window.confirm(`Hapus kategori "${name}"?`)) return;

    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser) {
      await supabase
        .from('notekita_categories')
        .delete()
        .eq('user_id', authUser.id)
        .ilike('name', name);
    } else {
      await supabase.from('notekita_categories').delete().eq('id', id);
    }

    setAvailableCategories(prev => prev.filter(c => c.name.toLowerCase() !== name.toLowerCase()));
    if (category.toLowerCase() === name.toLowerCase()) {
      setCategory('General');
    }
    onCategoriesChange?.();
  };

  const handleClearContent = () => {
    const hasText = blocks.some(b => b.trim().length > 0);
    if (!hasText) return;

    if (window.confirm('Clear all note content?')) {
      setBlocks(['']);
      setTimeout(() => {
        textareaRefs.current[0]?.focus();
      }, 50);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    // Menggabungkan kembali tanpa membuang konten kosong (Unlimited Text Integrity)
    const finalContent = blocks.join('\n\n');
    const isPass = category.toLowerCase() === 'password' || category.toLowerCase() === 'pass';
    const finalIsPrivate = isPrivate || isPass;
    onSave({ id: note?.id, title, content: finalContent, category, isPrivate: finalIsPrivate });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[90vh]">
        <form onSubmit={handleSave} className="p-8 flex flex-col h-full overflow-hidden">
          <div className="flex justify-between items-center mb-6 shrink-0">
            <div className="flex items-center space-x-3">
              <h2 className="text-xl font-serif font-bold italic dark:text-white">
                {note ? 'Sunting' : 'Baru'}
              </h2>
              {blocks.some(b => b.trim().length > 0) && (
                <button 
                  type="button" 
                  onClick={handleClearContent}
                  title="Clear all note content"
                  className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold text-rose-500 hover:text-white bg-rose-50 hover:bg-rose-500 dark:bg-rose-950/40 dark:hover:bg-rose-600 border border-rose-200 dark:border-rose-900/60 transition-all duration-150 shadow-sm"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-3.5 h-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                  </svg>
                  <span>Clear Text</span>
                </button>
              )}
            </div>
            <button 
              type="button" 
              onClick={onClose} 
              className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-slate-400"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
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
                  <button 
                    type="button" 
                    onClick={() => {
                      setCategory(cat.name);
                      const isPass = cat.name.toLowerCase() === 'password' || cat.name.toLowerCase() === 'pass';
                      if (isPass) {
                        setIsPrivate(true);
                      }
                    }} 
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${
                      category.toLowerCase() === cat.name.toLowerCase() 
                        ? 'bg-indigo-600 text-white border-indigo-600' 
                        : 'bg-slate-50 text-slate-500 border-slate-100 dark:bg-zinc-800 dark:border-zinc-700'
                    }`}
                  >
                    {cat.name}
                  </button>
                  {isManaging && (
                    <button 
                      type="button" 
                      onClick={() => deleteCategory(cat.id, cat.name)} 
                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] shadow-lg hover:scale-110"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              <button 
                type="button" 
                onClick={() => setIsManaging(!isManaging)} 
                className="px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tighter bg-slate-100 dark:bg-zinc-800 text-slate-400 hover:text-indigo-500 transition-colors"
              >
                {isManaging ? 'Done' : 'Manage'}
              </button>
            </div>
            
            {isManaging && (
              <div className="flex items-center space-x-2 animate-in slide-in-from-bottom-2 duration-200">
                <input 
                  type="text" 
                  value={newCatName} 
                  onChange={(e) => setNewCatName(e.target.value)} 
                  placeholder="New category name..." 
                  className="flex-1 bg-slate-50 dark:bg-zinc-800 border border-slate-100 dark:border-zinc-700 rounded-xl px-4 py-2 text-xs focus:outline-none dark:text-white" 
                />
                <button 
                  type="button" 
                  onClick={addCategory} 
                  className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold"
                >
                  Add
                </button>
              </div>
            )}

            <button 
              type="submit" 
              className="w-full bg-slate-900 dark:bg-zinc-100 dark:text-zinc-900 text-white py-4 rounded-2xl font-bold hover:opacity-90 shadow-xl transition-all"
            >
              Simpan Catatan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
