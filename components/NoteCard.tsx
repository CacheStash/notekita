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
  // Konten ditampilkan jika: 1. Bukan catatan private, atau 2. Sesi sudah di-unlock (sessionStorage)
  const [showSensitive, setShowSensitive] = useState(() => {
    if (!note.isPrivate) return true;
    return sessionStorage.getItem("notekita_unlocked") === "true";
  });

  // Sync ulang jika status session berubah di luar komponen
  useEffect(() => {
    if (note.isPrivate) {
      const isUnlocked = sessionStorage.getItem("notekita_unlocked") === "true";
      if (isUnlocked) setShowSensitive(true);
    }
  }, [note.isPrivate]);

  const handleToggleSensitive = () => {
    if (!showSensitive && note.isPrivate) {
      // Jika user punya PIN, minta verifikasi
      if (user?.isPinEnabled && user.pin) {
        const enteredPin = window.prompt('Masukkan PIN untuk melihat catatan sensitif ini:');
        if (enteredPin === user.pin) {
          setShowSensitive(true);
        } else if (enteredPin !== null) {
          alert('⚠️ PIN salah!');
        }
      } else {
        // Jika tidak ada PIN di akun, langsung buka
        setShowSensitive(true);
      }
    } else {
      setShowSensitive(!showSensitive);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Intl.DateTimeFormat('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(timestamp));
  };

  const categoryColors: Record<string, string> = {
    Password: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    ToDo: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    Idea: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    General: 'bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-400',
    Personal: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  };

  return (
    <div className={`group bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 p-6 flex flex-col transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/5 ${viewMode === 'list' ? 'flex-row items-center space-y-0 space-x-4 py-4' : 'space-y-4'}`}>
      <div className={`flex-1 ${viewMode === 'list' ? 'flex items-center justify-between' : ''}`}>
        <div className="flex flex-col space-y-2">
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-lg ${categoryColors[note.category]}`}>
              {note.category}
            </span>
            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => onEdit(note)} className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-xl transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                </svg>
              </button>
              <button onClick={() => onDelete(note.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-1.123c0-.597-.474-1.106-1.072-1.106H10.57c-.598 0-1.072.499-1.072 1.106v1.123m9.96 0a48.667 48.667 0 00-7.5 0" />
                </svg>
              </button>
            </div>
          </div>
          <h3 className="text-lg font-bold font-serif leading-tight dark:text-white line-clamp-1">{note.title}</h3>
        </div>

        <div className="relative mt-2">
          <p className={`text-sm text-slate-600 dark:text-zinc-400 leading-relaxed transition-all duration-300 ${!showSensitive ? 'blur-md select-none opacity-50' : ''} ${viewMode === 'grid' ? 'line-clamp-4' : 'line-clamp-1'}`}>
            {!showSensitive ? 'Konten ini disembunyikan. Klik ikon mata untuk melihat.' : note.content}
          </p>
          
          {/* Tombol Mata (Buka): Tersedia untuk semua catatan agar bisa di-toggle manual */}
          <button 
            onClick={handleToggleSensitive}
            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 p-2 rounded-full bg-indigo-600 text-white shadow-lg transition-transform active:scale-90 z-10 ${showSensitive ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
            title="Buka Catatan"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>

          {/* Tombol Sembunyikan Lagi: Auto muncul untuk semua catatan saat konten terbuka */}
          {showSensitive && (
            <button 
              onClick={() => setShowSensitive(false)}
              className="mt-2 flex items-center text-[10px] font-bold text-indigo-500 hover:text-indigo-400 uppercase tracking-tighter"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3 mr-1">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
              </svg>
              Sembunyikan lagi
            </button>
          )}
        </div>
      </div>

      <div className={`pt-4 border-t border-slate-50 dark:border-zinc-800 flex flex-col space-y-1 ${viewMode === 'list' ? 'border-t-0 border-l pl-4 pt-0 w-32' : ''}`}>
        <div className="flex items-center text-[10px] text-slate-400">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3 mr-1">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {formatDate(note.updatedAt)}
        </div>
      </div>
    </div>
  );
};