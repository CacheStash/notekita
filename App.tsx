import React, { useState, useEffect, useMemo } from 'react';
import { Note, Theme, User, ViewMode, SortBy, SortOrder } from './types'; 
import { ThemeToggle } from './components/ThemeToggle';
import { NoteCard } from './components/NoteCard';
import { NoteEditor } from './components/NoteEditor';
import { AuthModal } from './components/AuthModal';
import { SettingsModal } from './components/SettingsModal';
import { Calendar } from './components/Calendar';
import { supabase } from "./services/supabase";

const LockScreen = ({
  onUnlock,
  correctPin,
  onForgot,
}: {
  onUnlock: () => void;
  correctPin: string;
  onForgot: () => void;
}) => {
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  const handlePress = (num: string) => {
    if (input.length < 6) {
      const next = input + num;
      setInput(next);
      if (next.length === 6) {
        if (next === correctPin) {
          onUnlock();
        } else {
          setError(true);
          setShake(true);
          setTimeout(() => {
            setInput("");
            setShake(false);
            setError(false);
          }, 500);
        }
      }
    }
  };

  const handleDelete = () => setInput((prev) => prev.slice(0, -1));

  return (
    <div className="fixed inset-0 z-[100] bg-zinc-950 flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="mb-8 flex flex-col items-center">
        <div className="w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center mb-4 text-indigo-500">
          <div className="w-3 h-3 bg-indigo-500 rounded-full animate-pulse"></div>
        </div>
        <h2 className="text-xl font-bold text-white mb-2 font-serif italic">NoteKita Locked</h2>
        <p className="text-sm text-zinc-500">Masukkan 6-digit PIN</p>
      </div>
      <div className={`flex gap-4 mb-12 ${shake ? "animate-shake" : ""}`}>
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full transition-all duration-200 ${i < input.length ? (error ? "bg-red-500 scale-110" : "bg-indigo-500 scale-110") : "bg-white/10"}`}
          />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-6 w-full max-w-[280px]">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <button
            key={num}
            onClick={() => handlePress(num.toString())}
            className="w-16 h-16 rounded-full bg-white/5 hover:bg-white/10 text-xl font-bold text-white transition-all active:scale-95 flex items-center justify-center"
          >
            {num}
          </button>
        ))}
        <div className="w-16 h-16"></div>
        <button
          onClick={() => handlePress("0")}
          className="w-16 h-16 rounded-full bg-white/5 hover:bg-white/10 text-xl font-bold text-white transition-all active:scale-95 flex items-center justify-center"
        >
          0
        </button>
        <button
          onClick={handleDelete}
          className="w-16 h-16 rounded-full text-zinc-500 hover:text-red-400 transition-all active:scale-95 flex items-center justify-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9.75L14.25 12m0 0l2.25 2.25M14.25 12l2.25-2.25M14.25 12L12 14.25m-2.58 4.92l-6.375-6.375a1.125 1.125 0 010-1.59L9.42 4.83c.211-.211.498-.33.795-.33H19.5a2.25 2.25 0 012.25 2.25v10.5a2.25 2.25 0 01-2.25 2.25h-9.285a1.125 1.125 0 01-.795-.33z" />
          </svg>
        </button>
      </div>
      <button
        onClick={onForgot}
        className="mt-12 text-xs text-zinc-500 hover:text-indigo-500 tracking-widest uppercase font-bold transition-colors"
      >
        Lupa PIN? (Logout)
      </button>
      <style>{`@keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-10px); } 75% { transform: translateX(10px); } } .animate-shake { animation: shake 0.3s ease-in-out; }`}</style>
    </div>
  );
};

const App: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [categories, setCategories] = useState<{id: string, name: string}[]>([]); 
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
 
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [appPin, setAppPin] = useState<string>("");
  const [isLocked, setIsLocked] = useState(false);
  const [hasUnlockedSession, setHasUnlockedSession] = useState(() => {
    return sessionStorage.getItem("notekita_unlocked") === "true";
  });

  const lastLoadedUserId = React.useRef<string | null>(null);

  const loadCategories = async (userId: string) => {
    const { data } = await supabase
      .from('notekita_categories')
      .select('id, name')
      .eq('user_id', userId)
      .order('name');
    
    if (data && data.length > 0) {
      setCategories(data);
    } else {
      const defaults = ['General', 'Password', 'ToDo', 'Idea', 'Personal'];
      const inserts = defaults.map(name => ({ user_id: userId, name }));
      const { data: newData } = await supabase.from('notekita_categories').insert(inserts).select();
      if (newData) setCategories(newData);
    }
  };

  const loadDataFromSupabase = async (userId: string) => {
    // FIX: Tetap matikan loading meskipun user ID sama (mencegah stuck)
    if (lastLoadedUserId.current === userId) {
      setIsAuthLoading(false);
      setIsDataLoaded(true);
      return;
    }
    
    try {
      lastLoadedUserId.current = userId;
      setIsLoading(true);

      // Load Categories & Settings secara paralel
      const [catResult, settingsResult] = await Promise.all([
        loadCategories(userId),
        supabase.from('notekita_settings').select('app_pin, is_content_hidden').eq('user_id', userId).single()
      ]);

      const settings = settingsResult.data;

      if (settings?.app_pin) {
        setAppPin(settings.app_pin);
        const isUnlocked = sessionStorage.getItem("notekita_unlocked") === "true";
        if (!isUnlocked) setIsLocked(true);
      }

      setCurrentUser(prev => prev ? {
        ...prev,
        isPinEnabled: !!settings?.app_pin,
        pin: settings?.app_pin || undefined,
        isContentHidden: !!settings?.is_content_hidden
      } : null);

      const { data: userNotes } = await supabase
        .from('notekita_notes')
        .select('*')
        .order('updated_at', { ascending: false });

      if (userNotes) {
        setNotes(userNotes.map(n => ({
          id: n.id,
          title: n.title,
          content: n.content,
          category: n.category,
          isPrivate: n.is_private,
          createdAt: new Date(n.created_at).getTime(),
          updatedAt: new Date(n.updated_at).getTime(),
        })));
      }
    } catch (err) {
      console.error("Load Error:", err);
      lastLoadedUserId.current = null;
    } finally {
      setIsLoading(false);
      setIsDataLoaded(true);
      setIsAuthLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (session?.user) {
        const userData: User = {
          id: session.user.id,
          username: session.user.user_metadata?.display_name || session.user.email?.split('@')[0] || 'User',
          isPinEnabled: false,
          isContentHidden: false
        };
        setCurrentUser(userData);
        loadDataFromSupabase(session.user.id);
      } else {
        if (event === 'SIGNED_OUT' || event === 'INITIAL_SESSION') {
          handleLogoutLocal();
          setIsAuthLoading(false); // Pastikan loading mati jika tidak ada sesi
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleLogoutLocal = () => {
    lastLoadedUserId.current = null;
    sessionStorage.removeItem("notekita_unlocked");
    setHasUnlockedSession(false);
    setCurrentUser(null);
    setNotes([]);
    setCategories([]);
    setIsLocked(false);
    setIsSettingsModalOpen(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    handleLogoutLocal();
  };

  const onUnlockSuccess = () => {
    setIsLocked(false);
    setHasUnlockedSession(true);
    sessionStorage.setItem("notekita_unlocked", "true");
  };

  const [theme, setTheme] = useState<Theme>('light');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortBy>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [filter, setFilter] = useState<string>('All'); 
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<Date | null>(null);

  useEffect(() => {
    const savedTheme = localStorage.getItem('notekita_theme') as Theme;
    const savedViewMode = localStorage.getItem('notekita_view_mode') as ViewMode;
    
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    }
    if (savedViewMode) setViewMode(savedViewMode);
  }, []);

  useEffect(() => {
    localStorage.setItem('notekita_theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('notekita_view_mode', viewMode);
  }, [viewMode]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const saveNote = async (noteData: Omit<Note, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => {
    if (!currentUser) {
      alert("Anda harus login terlebih dahulu.");
      return;
    }
    
    setIsLoading(true);
    const notePayload = {
      user_id: currentUser.id,
      title: noteData.title,
      content: noteData.content,
      category: noteData.category,
      is_private: noteData.isPrivate,
      updated_at: new Date().toISOString(),
    };

    try {
      if (noteData.id) {
        const { error } = await supabase
          .from('notekita_notes')
          .update(notePayload)
          .eq('id', noteData.id);

        if (error) throw error;

        setNotes(prev => prev.map(n => 
          n.id === noteData.id ? { ...n, ...noteData, updatedAt: Date.now() } : n
        ));
      } else {
        const { data, error } = await supabase
          .from('notekita_notes')
          .insert([{ ...notePayload, created_at: new Date().toISOString() }])
          .select()
          .single();

        if (error) throw error;

        if (data) {
          const newNote: Note = {
            id: data.id,
            title: data.title,
            content: data.content,
            category: data.category,
            isPrivate: data.is_private,
            createdAt: new Date(data.created_at).getTime(),
            updatedAt: new Date(data.updated_at).getTime(),
          };
          setNotes(prev => [newNote, ...prev]);
        }
      }
      setEditingNote(null);
      setIsEditorOpen(false);
    } catch (err: any) {
      console.error("Gagal menyimpan catatan:", err);
      alert("❌ Gagal menyimpan: " + (err.message || "Terjadi kesalahan database"));
    } finally {
      setIsLoading(false);
    }
  };

  const deleteNote = async (id: string) => {
    if (window.confirm('Hapus catatan ini selamanya?')) {
      try {
        const { error } = await supabase
          .from('notekita_notes')
          .delete()
          .eq('id', id);

        if (error) throw error;
        setNotes(prev => prev.filter(n => n.id !== id));
      } catch (err: any) {
        alert("❌ Gagal menghapus: " + err.message);
      }
    }
  };

  const filteredNotes = useMemo(() => {
    return notes
      .filter(n => filter === 'All' || n.category === filter)
      .filter(n => 
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        n.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .filter(n => {
        if (!dateFilter) return true;
        const noteDate = new Date(n.createdAt);
        return noteDate.getFullYear() === dateFilter.getFullYear() &&
               noteDate.getMonth() === dateFilter.getMonth() &&
               noteDate.getDate() === dateFilter.getDate();
      })
      .sort((a, b) => {
        let comparison = 0;
        if (sortBy === 'date') {
          comparison = b.updatedAt - a.updatedAt;
        } else {
          comparison = a.title.localeCompare(b.title);
        }
        return sortOrder === 'desc' ? comparison : -comparison;
      });
  }, [notes, filter, searchQuery, sortBy, sortOrder, dateFilter]);

  if (isAuthLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950 text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
          <p className="text-xs font-bold tracking-widest text-zinc-500 uppercase italic">NoteKita: Memulihkan Sesi...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${theme === 'dark' ? 'bg-zinc-950 text-zinc-100' : 'bg-slate-50 text-slate-900'}`}>
      
      {isLocked && appPin && !hasUnlockedSession && (
        <LockScreen
          correctPin={appPin}
          onUnlock={onUnlockSuccess}
          onForgot={handleLogout}
        />
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-slate-200 dark:border-zinc-800">
        <div className="max-w-6xl mx-auto px-4 h-16 md:h-20 flex items-center justify-between gap-2">
          {/* Logo & Branding */}
          <div className="flex items-center space-x-2 shrink-0">
            <div className="w-9 h-9 md:w-10 md:h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 md:w-6 md:h-6">
                <path d="M11.644 1.59a.75.75 0 01.712 0l9.75 5.25a.75.75 0 010 1.32l-9.75 5.25a.75.75 0 01-.712 0l-9.75-5.25a.75.75 0 010-1.32l9.75-5.25z" />
                <path d="M3.265 10.602l7.668 4.129a1.25 1.25 0 001.134 0l7.668-4.13 1.37.739a.75.75 0 010 1.32l-9.75 5.25a.75.75 0 01-.712 0l-9.75-5.25a.75.75 0 010-1.32l1.37-.738z" />
                <path d="M3.265 14.352l7.668 4.129a1.25 1.25 0 001.134 0l7.668-4.13 1.37.739a.75.75 0 010 1.32l-9.75 5.25a.75.75 0 01-.712 0l-9.75-5.25a.75.75 0 010-1.32l1.37-.738z" />
              </svg>
            </div>
            <div className="flex flex-col">
              <h1 className="text-lg md:text-xl font-bold font-serif italic tracking-tight leading-none">NoteKita</h1>
              <p className="hidden sm:block text-[9px] md:text-[10px] uppercase font-bold tracking-[0.2em] text-slate-400 dark:text-zinc-500">Shared space ❤️</p>
            </div>
          </div>

          {/* Tools & Auth */}
          <div className="flex items-center space-x-1 md:space-x-3">
            {/* Desktop Search */}
            <div className="hidden md:flex bg-slate-100 dark:bg-zinc-900 rounded-full px-4 py-2 items-center border border-transparent focus-within:border-indigo-500 transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-slate-400 mr-2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input 
                type="text" 
                placeholder="Cari catatan..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-xs focus:outline-none w-32 lg:w-48 dark:text-zinc-300"
              />
            </div>
            
            <div className="flex items-center space-x-0.5 md:space-x-1">
              <button 
                onClick={() => setIsCalendarOpen(true)}
                className="p-2 text-slate-500 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-zinc-900 rounded-xl transition-all"
                title="Kalender"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 md:w-5.5 md:h-5.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" />
                </svg>
              </button>

              <ThemeToggle theme={theme} toggle={toggleTheme} />
              
              <button 
                onClick={() => currentUser ? setIsSettingsModalOpen(true) : setIsAuthModalOpen(true)}
                className="p-2 text-slate-500 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-zinc-900 rounded-xl transition-all"
                title="Pengaturan"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 md:w-5.5 md:h-5.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.127c-.332.183-.582.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>

            <div className="flex items-center space-x-2">
              {/* Sembunyikan + Baru di header pada mobile karena sudah ada FAB */}
              <button 
                onClick={() => setIsEditorOpen(true)}
                className="hidden sm:flex bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-indigo-600/20 hover:scale-105 active:scale-95 transition-all shrink-0"
              >
                + Baru
              </button>
              
              {!currentUser ? (
                <button 
                  onClick={() => setIsAuthModalOpen(true)}
                  className="p-2 bg-slate-100 dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 rounded-xl hover:text-indigo-500 transition-all"
                  title="Masuk / Daftar"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 md:w-6 md:h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                </button>
              ) : (
                <div className="w-9 h-9 md:w-10 md:h-10 bg-slate-100 dark:bg-zinc-900 rounded-xl flex items-center justify-center text-indigo-500 font-bold border border-slate-200 dark:border-zinc-800 text-sm md:text-base shrink-0">
                  {currentUser.username.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        
        {/* Categories Bar & Controls */}
        <div className="flex flex-col space-y-4 mb-8">
          {/* Mobile Search Bar - Muncul hanya di layar kecil */}
          <div className="md:hidden mb-2">
            <div className="flex bg-white dark:bg-zinc-900 rounded-2xl px-4 py-3 items-center border border-slate-200 dark:border-zinc-800 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500 transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-slate-400 mr-3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input 
                type="text" 
                placeholder="Cari catatan kamu..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-sm focus:outline-none flex-1 dark:text-zinc-300"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 md:justify-between md:overflow-x-auto md:no-scrollbar md:pb-2 md:-mx-4 md:px-4 lg:mx-0 lg:px-0">
            <div className="flex flex-wrap md:flex-nowrap gap-2 md:space-x-2">
              <button
                onClick={() => setFilter('All')}
                className={`whitespace-nowrap px-3 py-1.5 md:px-5 md:py-2 rounded-full text-[10px] md:text-xs font-semibold transition-all ${
                  filter === 'All'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-zinc-900'
                    : 'bg-white text-slate-500 border border-slate-200 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800 hover:border-slate-300'
                }`}
              >
                Semua
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setFilter(cat.name)}
                  className={`whitespace-nowrap px-3 py-1.5 md:px-5 md:py-2 rounded-full text-[10px] md:text-xs font-semibold transition-all ${
                    filter === cat.name
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-zinc-900'
                      : 'bg-white text-slate-500 border border-slate-200 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800 hover:border-slate-300'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-100 dark:border-zinc-900">
            <div className="flex items-center space-x-4">
              <div className="flex bg-white dark:bg-zinc-900 rounded-xl p-1 border border-slate-200 dark:border-zinc-800 shadow-sm">
                <button 
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-slate-100 dark:bg-zinc-800 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                  title="Grid View"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                  </svg>
                </button>
                <button 
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-slate-100 dark:bg-zinc-800 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                  title="List View"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                  </svg>
                </button>
              </div>

              <div className="flex items-center space-x-2 bg-white dark:bg-zinc-900 rounded-xl px-3 py-1.5 border border-slate-200 dark:border-zinc-800 shadow-sm">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Urut:</span>
                <select 
                  value={sortBy} 
                  onChange={(e) => setSortBy(e.target.value as SortBy)}
                  className="bg-transparent text-xs font-semibold focus:outline-none dark:text-zinc-300 cursor-pointer"
                >
                  <option value="date">Tanggal</option>
                  <option value="title">Judul</option>
                </select>
                <button 
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded text-slate-500"
                >
                  {sortOrder === 'desc' ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {dateFilter && (
          <div className="mb-6 flex items-center justify-between bg-indigo-50 dark:bg-indigo-900/20 px-4 py-2 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
            <div className="flex items-center text-xs font-bold text-indigo-600 dark:text-indigo-400">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 mr-2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" />
              </svg>
              Menampilkan catatan dari: {new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(dateFilter)}
            </div>
            <button 
              onClick={() => setDateFilter(null)}
              className="text-[10px] uppercase font-bold tracking-widest text-indigo-500 hover:text-indigo-400"
            >
              Hapus Filter
            </button>
          </div>
        )}

        {/* Notes Grid/List */}
        {filteredNotes.length > 0 ? (
          <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "flex flex-col space-y-3"}>
            {filteredNotes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                user={currentUser}
                viewMode={viewMode}
                onEdit={(n) => { setEditingNote(n); setIsEditorOpen(true); }}
                onDelete={deleteNote}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-24 h-24 bg-slate-100 dark:bg-zinc-900 rounded-full flex items-center justify-center mb-6 text-slate-300 dark:text-zinc-700">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-12 h-12">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold dark:text-white mb-2">Belum ada catatan</h3>
            <p className="text-slate-400 max-w-xs">Mulai berbagi informasi penting, password, atau to-do list bersama pasangan kamu.</p>
            <button 
              onClick={() => setIsEditorOpen(true)}
              className="mt-8 text-indigo-500 font-bold hover:underline"
            >
              Buat catatan pertama →
            </button>
          </div>
        )}
      </main>

      {/* Modals */}
      {isEditorOpen && (
        <NoteEditor
          note={editingNote}
          onSave={saveNote}
          onClose={() => { setIsEditorOpen(false); setEditingNote(null); }}
        />
      )}

      {isAuthModalOpen && (
        <AuthModal
          onLogin={() => setIsAuthModalOpen(false)}
          onClose={() => setIsAuthModalOpen(false)}
        />
      )}

      {isSettingsModalOpen && currentUser && (
        <SettingsModal
          user={currentUser}
          onUpdateUser={(updatedUser) => setCurrentUser(updatedUser)}
          onLogout={handleLogout}
          onClose={() => setIsSettingsModalOpen(false)}
        />
      )}

      {isCalendarOpen && (
        <Calendar
          notes={notes}
          onSelectDate={(date) => setDateFilter(date)}
          onClose={() => setIsCalendarOpen(false)}
        />
      )}

      {/* Floating Action Button */}
      <button 
        onClick={() => setIsEditorOpen(true)}
        className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full shadow-2xl flex items-center justify-center z-40 active:scale-95 transition-transform"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </button>
    </div>
  );
};

export default App;