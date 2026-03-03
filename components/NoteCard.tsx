
import React, { useState } from 'react';
import { Note, User, ViewMode } from '../types';

interface NoteCardProps {
  note: Note;
  user: User | null;
  viewMode?: ViewMode;
  onEdit: (note: Note) => void;
  onDelete: (id: string) => void;
}

export const NoteCard: React.FC<NoteCardProps> = ({ note, user, viewMode = 'grid', onEdit, onDelete }) => {
  const [showSensitive, setShowSensitive] = useState(!note.isPrivate);

  const handleToggleSensitive = () => {
    if (!showSensitive && note.isPrivate && user?.isPinEnabled && user.pin) {
      const enteredPin = window.prompt('Masukkan PIN untuk melihat catatan ini:');
      if (enteredPin === user.pin) {
        setShowSensitive(true);
      } else if (enteredPin !== null) {
        alert('PIN salah!');
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
    General: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
    Personal: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  };

  if (viewMode === 'list') {
    return (
      <div className="group bg-white dark:bg-zinc-800 p-4 rounded-xl border border-slate-200 dark:border-zinc-700 shadow-sm hover:shadow-md transition-all flex items-center justify-between">
        <div className="flex items-center space-x-4 flex-1 min-w-0">
          <span className={`flex-shrink-0 w-2 h-2 rounded-full ${categoryColors[note.category]?.split(' ')[0] || 'bg-slate-400'}`}></span>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold dark:text-white truncate">{note.title || 'Untitled Note'}</h3>
            <p className="text-xs text-slate-400 truncate">
              {note.isPrivate && !showSensitive ? '••••••••' : note.content.substring(0, 50)}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3 ml-4">
          <span className="text-[10px] text-slate-400 hidden sm:block">{formatDate(note.updatedAt)}</span>
          <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
             <button 
              onClick={() => {
                navigator.clipboard.writeText(note.content);
                alert('Konten disalin ke clipboard!');
              }}
              className="p-1.5 text-slate-400 hover:text-emerald-500 transition-colors"
              title="Salin isi"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
              </svg>
            </button>
            <button 
              onClick={() => onEdit(note)}
              className="p-1.5 text-slate-400 hover:text-indigo-500 transition-colors"
              title="Sunting"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
              </svg>
            </button>
            <button 
              onClick={() => onDelete(note.id)}
              className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
              title="Hapus"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-2.25a2.25 2.25 0 00-2.25-2.25h-4.5a2.25 2.25 0 00-2.25 2.25v2.25m6.75 0H9" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative bg-white dark:bg-zinc-800 p-6 rounded-2xl border border-slate-200 dark:border-zinc-700 shadow-sm hover:shadow-md transition-all duration-300">
      <div className="flex justify-between items-start mb-4">
        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${categoryColors[note.category] || categoryColors.General}`}>
          {note.category}
        </span>
        <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={() => {
              navigator.clipboard.writeText(note.content);
              alert('Konten disalin ke clipboard!');
            }}
            className="text-slate-400 hover:text-emerald-500 transition-colors"
            title="Salin isi"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
            </svg>
          </button>
          <button 
            onClick={() => onEdit(note)}
            className="text-slate-400 hover:text-indigo-500 transition-colors"
            title="Sunting"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
            </svg>
          </button>
          <button 
            onClick={() => onDelete(note.id)}
            className="text-slate-400 hover:text-red-500 transition-colors"
            title="Hapus"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-2.25a2.25 2.25 0 00-2.25-2.25h-4.5a2.25 2.25 0 00-2.25 2.25v2.25m6.75 0H9" />
            </svg>
          </button>
        </div>
      </div>

      <h3 className="text-lg font-bold mb-2 dark:text-white leading-tight">
        {note.title || 'Untitled Note'}
      </h3>

      <div className="mb-4">
        {note.isPrivate && !showSensitive ? (
          <div 
            onClick={handleToggleSensitive}
            className="cursor-pointer bg-slate-100 dark:bg-zinc-700/50 rounded-lg py-4 px-2 flex flex-col items-center justify-center text-xs text-slate-400"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mb-1">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
            </svg>
            Click to show private info
          </div>
        ) : (
          <div className="relative group/content">
            <p className="text-slate-600 dark:text-zinc-400 text-sm whitespace-pre-wrap leading-relaxed">
              {note.content}
            </p>
            {note.isPrivate && (
               <button 
                onClick={() => setShowSensitive(false)}
                className="absolute top-0 right-0 p-1 text-slate-300 hover:text-slate-500 transition-colors"
                title="Sembunyikan kembali"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>

      <div className="mt-auto pt-4 border-t border-slate-50 dark:border-zinc-700 flex flex-col space-y-1">
        <div className="flex items-center text-[10px] text-slate-400">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3 mr-1">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Dibuat: {formatDate(note.createdAt)}
        </div>
        {note.updatedAt !== note.createdAt && (
          <div className="flex items-center text-[10px] text-indigo-400">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3 mr-1">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            Edit terakhir: {formatDate(note.updatedAt)}
          </div>
        )}
      </div>
    </div>
  );
};
