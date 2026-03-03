import React, { useState, useEffect } from 'react';
import { User, Theme } from '../types';
import { supabase } from '../services/supabase';

interface SettingsModalProps {
  user: User;
  onUpdateUser: (updatedUser: User) => void;
  onLogout: () => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ user, onUpdateUser, onLogout, onClose }) => {
  const [pin, setPin] = useState('');
  const [isPinEnabled, setIsPinEnabled] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });
  const [loading, setLoading] = useState(false);

  // Load Current PIN Settings from Database
  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase
        .from('notekita_settings')
        .select('app_pin')
        .eq('user_id', user.id)
        .single();
      
      if (data?.app_pin) {
        setPin(data.app_pin);
        setIsPinEnabled(true);
      }
    };
    fetchSettings();
  }, [user.id]);

  const showMsg = (text: string, type: 'success' | 'error' = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 3000);
  };

  const handleSavePin = async () => {
    setLoading(true);
    const targetPin = isPinEnabled ? pin : null;

    if (isPinEnabled && pin.length !== 6) {
      showMsg('PIN harus 6 digit angka', 'error');
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from('notekita_settings')
      .upsert({ 
        user_id: user.id, 
        app_pin: targetPin 
      });

    if (error) {
      console.error(error);
      alert('❌ Gagal menyimpan pengaturan: ' + error.message);
    } else {
      alert(isPinEnabled ? '✅ PIN Berhasil diaktifkan!' : '✅ PIN dinonaktifkan!');
      onUpdateUser({ ...user, isPinEnabled });
    }
    setLoading(false);
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      showMsg('Password minimal 6 karakter', 'error');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      showMsg(error.message, 'error');
    } else {
      showMsg('Password berhasil diperbarui!');
      setNewPassword('');
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden">
        <div className="p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-serif font-bold italic dark:text-white">Pengaturan</h2>
            <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-slate-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-6">
            {message.text && (
              <div className={`p-3 rounded-xl text-xs font-bold border ${message.type === 'error' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                {message.text}
              </div>
            )}

            {/* User Profile Info */}
            <div className="flex items-center space-x-4 bg-slate-50 dark:bg-zinc-800/50 p-4 rounded-2xl">
              <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">
                {user.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-bold dark:text-white">{user.username}</p>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Aktif</p>
              </div>
            </div>

            {/* PIN Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold dark:text-white">Keamanan PIN (6 Digit)</h3>
                <button 
                  onClick={() => setIsPinEnabled(!isPinEnabled)}
                  className={`w-10 h-5 rounded-full transition-colors relative ${isPinEnabled ? 'bg-indigo-600' : 'bg-slate-300'}`}
                >
                  <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${isPinEnabled ? 'right-1' : 'left-1'}`} />
                </button>
              </div>
              
              {isPinEnabled && (
                <input
                  type="text"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                  className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-center text-2xl font-bold tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-all"
                  placeholder="••••••"
                />
              )}
              <button 
                onClick={handleSavePin}
                disabled={loading}
                className="w-full bg-indigo-600 text-white py-2 rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                Simpan Konfigurasi PIN
              </button>
            </div>

            <hr className="border-slate-100 dark:border-zinc-800" />

            {/* Password Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold dark:text-white">Ganti Password</h3>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-all"
                placeholder="Password baru"
              />
              <button
                onClick={handleChangePassword}
                disabled={loading}
                className="w-full bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 py-2 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors disabled:opacity-50"
              >
                Ubah Password
              </button>
            </div>

            {/* Logout */}
            <button
              onClick={onLogout}
              className="w-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 py-3 rounded-xl text-xs font-bold hover:bg-red-100 transition-colors"
            >
              Keluar dari NoteKita
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};