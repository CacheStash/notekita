import React, { useState, useEffect } from 'react';
import { Note, User, ViewMode } from '../types';

interface NoteCardProps {
  note: Note;
  user: User | null;
  viewMode?: ViewMode;
  onEdit: (note: Note) => void;
  onDelete: (id: string) => void;
}

export const NoteCard: React.FC<NoteCardProps> = ({ note, user, viewMode = 'grid', onEdit, onDelete }) => {
  // Cek apakah kategori merupakan Password / Pass (case-insensitive)
  const isPassCategory = !!note.category && (
    note.category.toLowerCase() === 'password' || 
    note.category.toLowerCase() === 'pass'
  );

  // Inisialisasi: Kategori Password/Pass atau isPrivate WAJIB default HIDE
  const [showSensitive, setShowSensitive] = useState(() => {
    if (user?.isContentHidden) return false;
    if (isPassCategory || note.isPrivate) return false;
    return true;
  });

  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (user?.isContentHidden) {
      setShowSensitive(false);
    }
  }, [user?.isContentHidden]);

  // Fungsi Proteksi PIN untuk Tindakan (Copy/Edit/Delete)
  const ensureUnlocked = (action: () => void) => {
    if (!showSensitive) {
      if (user?.isPinEnabled && user.pin) {
        const enteredPin = window.prompt('Enter PIN to access this action:');
        if (enteredPin === user.pin) {
          setShowSensitive(true);
          action();
        } else if (enteredPin !== null) {
          alert('⚠️ Incorrect PIN!');
        }
      } else {
        setShowSensitive(true);
        action();
      }
    } else {
      action();
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(note.content);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  const getCategoryColor = (cat: string) => {
    const lower = (cat || '').toLowerCase();
    if (lower === 'password' || lower === 'pass') {
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    }
    if (lower === 'todo') {
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    }
    if (lower === 'idea') {
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    }
    if (lower === 'general') {
      return 'bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-400';
    }
    if (lower === 'personal') {
      return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400';
    }
    return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400';
  };

  return (
    <div className={`group bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 p-6 flex flex-col transition-all duration-300 hover:shadow-xl relative ${viewMode === 'list' ? 'flex-row items-center py-4' : 'space-y-4'}`}>
      
      {/* UI Toast Pop-out */}
      {showToast && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[50] bg-emerald-500 text-white px-4 py-1.5 rounded-full text-[10px] font-bold shadow-lg animate-in fade-in zoom-in slide-in-from-top-2 duration-300">
          ✅ Copied to clipboard
        </div>
      )}

      <div className="flex-1">
        <div className="flex flex-col space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5">
              <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-lg ${getCategoryColor(note.category)}`}>
                {note.category}
              </span>
              {(isPassCategory || note.isPrivate) && (
                <span title="Protected Note" className="text-red-500 dark:text-red-400">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                </span>
              )}
            </div>
            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => ensureUnlocked(handleCopy)} className="p-2 text-slate-400 hover:text-emerald-500 rounded-xl transition-all" title="Copy Content">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" />
                </svg>
              </button>
              <button onClick={() => ensureUnlocked(() => onEdit(note))} className="p-2 text-slate-400 hover:text-indigo-500 rounded-xl transition-all" title="Edit Note">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>
              </button>
              <button onClick={() => ensureUnlocked(() => onDelete(note.id))} className="p-2 text-slate-400 hover:text-red-500 rounded-xl transition-all" title="Delete Note">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-1.123c0-.597-.474-1.106-1.072-1.106H10.57c-.598 0-1.072.499-1.072 1.106v1.123m9.96 0a48.667 48.667 0 00-7.5 0" /></svg>
              </button>
            </div>
          </div>
          <h3 className="text-lg font-bold font-serif dark:text-white line-clamp-1">{note.title}</h3>
          
          <div className="flex items-center justify-between mt-1">
            <p className="text-[9px] text-slate-400 dark:text-zinc-500 uppercase font-bold tracking-tighter">
              Created: {new Date(note.createdAt).toLocaleDateString('en-US')}
            </p>
            <p className="text-[9px] text-indigo-400 dark:text-indigo-500 uppercase font-bold tracking-tighter">
              Updated: {new Date(note.updatedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} • {new Date(note.updatedAt).toLocaleDateString('en-US')}
            </p>
          </div>
        </div>

        <div className="relative mt-3 border-t border-slate-50 dark:border-zinc-800 pt-2">
          <p className={`text-sm text-slate-600 dark:text-zinc-400 transition-all duration-300 ${!showSensitive ? 'blur-md select-none opacity-50' : ''} ${viewMode === 'grid' ? 'line-clamp-4' : 'line-clamp-1'}`}>
            {!showSensitive ? 'Protected content. Click eye icon to reveal.' : note.content}
          </p>
          <button 
            onClick={() => {
              if (!showSensitive) {
                ensureUnlocked(() => setShowSensitive(true));
              } else {
                setShowSensitive(false);
              }
            }} 
            title={showSensitive ? 'Hide content' : 'Reveal content'}
            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 p-2 rounded-full bg-indigo-600 text-white shadow-lg transition-transform hover:scale-110 active:scale-95 ${showSensitive ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </button>
          {showSensitive && (isPassCategory || note.isPrivate || user?.isContentHidden) && (
            <button onClick={() => setShowSensitive(false)} className="mt-2 text-[10px] font-bold text-indigo-500 uppercase tracking-tighter flex items-center hover:underline">
              Hide again
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
