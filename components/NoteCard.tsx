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
  // Inisialisasi berdasarkan sensor global atau isPrivate
  const [showSensitive, setShowSensitive] = useState(() => {
    if (user?.isContentHidden) return false;
    if (!note.isPrivate) return true;
    return sessionStorage.getItem("notekita_unlocked") === "true";
  });

  const [showToast, setShowToast] = useState(false); // State baru untuk toast

  useEffect(() => {
    if (user?.isContentHidden) setShowSensitive(false);
  }, [user?.isContentHidden]);

  // Fungsi Proteksi PIN untuk Tindakan (Copy/Edit/Delete)
  const ensureUnlocked = (action: () => void) => {
    if (!showSensitive) {
      if (user?.isPinEnabled && user.pin) {
        const enteredPin = window.prompt('Masukkan PIN untuk mengakses tindakan ini:');
        if (enteredPin === user.pin) {
          setShowSensitive(true); // Buka sensor (unhidden) setelah PIN sukses
          action();
        } else if (enteredPin !== null) {
          alert('⚠️ PIN salah!');
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
    setTimeout(() => setShowToast(false), 2000); // Hilang otomatis dalam 2 detik
  };

  const categoryColors: Record<string, string> = {
    Password: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    ToDo: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    Idea: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    General: 'bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-400',
    Personal: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  };

  return (
    <div className={`group bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 p-6 flex flex-col transition-all duration-300 hover:shadow-xl relative ${viewMode === 'list' ? 'flex-row items-center py-4' : 'space-y-4'}`}>
      
      {/* UI Toast Pop-out */}
      {showToast && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[50] bg-emerald-500 text-white px-4 py-1.5 rounded-full text-[10px] font-bold shadow-lg animate-in fade-in zoom-in slide-in-from-top-2 duration-300">
          ✅ Berhasil Disalin
        </div>
      )}

      <div className="flex-1">
        <div className="flex flex-col space-y-2">
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-lg ${categoryColors[note.category] || 'bg-indigo-100 text-indigo-700'}`}>
              {note.category}
            </span>
            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => ensureUnlocked(handleCopy)} className="p-2 text-slate-400 hover:text-emerald-500 rounded-xl transition-all" title="Copy Content">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" />
                </svg>
              </button>
              <button onClick={() => ensureUnlocked(() => onEdit(note))} className="p-2 text-slate-400 hover:text-indigo-500 rounded-xl transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>
              </button>
              <button onClick={() => ensureUnlocked(() => onDelete(note.id))} className="p-2 text-slate-400 hover:text-red-500 rounded-xl transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-1.123c0-.597-.474-1.106-1.072-1.106H10.57c-.598 0-1.072.499-1.072 1.106v1.123m9.96 0a48.667 48.667 0 00-7.5 0" /></svg>
              </button>
            </div>
          </div>
          <h3 className="text-lg font-bold font-serif dark:text-white line-clamp-1">{note.title}</h3>
          
          <div className="flex items-center justify-between mt-1">
            <p className="text-[9px] text-slate-400 dark:text-zinc-500 uppercase font-bold tracking-tighter">
              Dibuat: {new Date(note.createdAt).toLocaleDateString('id-ID')}
            </p>
            <p className="text-[9px] text-indigo-400 dark:text-indigo-500 uppercase font-bold tracking-tighter">
              Modif: {new Date(note.updatedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} • {new Date(note.updatedAt).toLocaleDateString('id-ID')}
            </p>
          </div>
        </div>

        <div className="relative mt-3 border-t border-slate-50 dark:border-zinc-800 pt-2">
          <p className={`text-sm text-slate-600 dark:text-zinc-400 transition-all duration-300 ${!showSensitive ? 'blur-md select-none opacity-50' : ''} ${viewMode === 'grid' ? 'line-clamp-4' : 'line-clamp-1'}`}>
            {!showSensitive ? 'Konten disensor. Klik ikon mata untuk melihat.' : note.content}
          </p>
          <button 
            onClick={() => {
              if (!showSensitive) {
                ensureUnlocked(() => setShowSensitive(true));
              } else {
                setShowSensitive(false);
              }
            }} 
            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 p-2 rounded-full bg-indigo-600 text-white shadow-lg ${showSensitive ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </button>
          {showSensitive && <button onClick={() => setShowSensitive(false)} className="mt-2 text-[10px] font-bold text-indigo-500 uppercase tracking-tighter flex items-center">Sembunyikan lagi</button>}
        </div>
      </div>
    </div>
  );
};