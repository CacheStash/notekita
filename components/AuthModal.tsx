
import React, { useState } from 'react';
import { User } from '../types';
import { supabase } from '../services/supabase';

interface AuthModalProps {
  onLogin: (user: any) => void;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onLogin, onClose }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username || !password) {
      setError('Username dan password wajib diisi');
      return;
    }

    const email = `${username.toLowerCase()}@notekita.local`;

    if (isLogin) {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError('Username atau password salah');
      } else if (data.user) {
        onLogin({
          id: data.user.id,
          username: username,
          isPinEnabled: false // Akan diupdate di App.tsx setelah cek settings
        });
        onClose();
      }
    } else {
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: username } }
      });

      if (authError) {
        setError(authError.message);
      } else if (data.user) {
        onLogin({
          id: data.user.id,
          username: username,
          isPinEnabled: false
        });
        onClose();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden">
        <div className="p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-serif font-bold italic dark:text-white">
              {isLogin ? 'Masuk ke NoteKita' : 'Daftar Akun Baru'}
            </h2>
            <button 
              onClick={onClose}
              className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-slate-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-xl text-xs font-medium border border-red-100 dark:border-red-900/30">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-all"
                placeholder="Masukkan username"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-all"
                placeholder="Masukkan password"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-indigo-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all mt-4"
            >
              {isLogin ? 'Masuk' : 'Daftar'}
            </button>

            <div className="text-center mt-6">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-xs text-slate-500 hover:text-indigo-500 transition-colors"
              >
                {isLogin ? 'Belum punya akun? Daftar di sini' : 'Sudah punya akun? Masuk di sini'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
