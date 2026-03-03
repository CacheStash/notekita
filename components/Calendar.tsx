
import React, { useState } from 'react';
import { Note } from '../types';

interface CalendarProps {
  notes: Note[];
  onSelectDate: (date: Date | null) => void;
  onClose: () => void;
}

export const Calendar: React.FC<CalendarProps> = ({ notes, onSelectDate, onClose }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const days = daysInMonth(year, month);
  const firstDay = firstDayOfMonth(year, month);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const noteCounts: Record<string, number> = {};
  notes.forEach(note => {
    const date = new Date(note.createdAt);
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    noteCounts[key] = (noteCounts[key] || 0) + 1;
  });

  const monthNames = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-serif font-bold italic dark:text-white">Kalender Catatan</h2>
            <button 
              onClick={onClose}
              className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-slate-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex justify-between items-center mb-4">
            <button onClick={prevMonth} className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg text-slate-500">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <h3 className="font-bold dark:text-white">{monthNames[month]} {year}</h3>
            <button onClick={nextMonth} className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg text-slate-500">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map(d => (
              <div key={d} className="text-[10px] font-bold text-slate-400 uppercase tracking-wider py-2">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="h-12"></div>
            ))}
            {Array.from({ length: days }).map((_, i) => {
              const day = i + 1;
              const key = `${year}-${month}-${day}`;
              const count = noteCounts[key];
              const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();

              const isSelected = selectedDateKey === key;

              return (
                <div 
                  key={day} 
                  onClick={() => {
                    if (isSelected) {
                      setSelectedDateKey(null);
                      onSelectDate(null);
                    } else {
                      setSelectedDateKey(key);
                      onSelectDate(new Date(year, month, day));
                    }
                  }}
                  className={`h-12 flex flex-col items-center justify-center rounded-xl relative transition-colors cursor-pointer ${
                    isSelected ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' :
                    isToday ? 'bg-indigo-50 dark:bg-indigo-900/20 ring-1 ring-indigo-500' : 
                    'hover:bg-slate-50 dark:hover:bg-zinc-800'
                  }`}
                >
                  <span className={`text-xs font-medium ${
                    isSelected ? 'text-white' :
                    isToday ? 'text-indigo-600 dark:text-indigo-400' : 
                    'text-slate-700 dark:text-zinc-300'
                  }`}>
                    {day}
                  </span>
                  {count > 0 && (
                    <span className={`absolute top-1 right-1 w-4 h-4 text-[8px] flex items-center justify-center rounded-full font-bold ${
                      isSelected ? 'bg-white text-indigo-600' : 'bg-indigo-600 text-white'
                    }`}>
                      {count}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
