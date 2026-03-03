
import React, { useState } from 'react';
import { User } from '../types';

interface SettingsModalProps {
  user: User;
  onUpdateUser: (updatedUser: User) => void;
  onLogout: () => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ user, onUpdateUser, onLogout, onClose }) => {
  const [isPinEnabled, setIsPinEnabled] = useState(user.isPinEnabled);
  const [pin, setPin] = useState(user.pin || '');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleSaveSettings = () => {
    if (isPinEnabled && pin.length < 4) {
      setMessage('PIN minimal 4 digit');
      return;
    }

    const updatedUser = {
      ...user,
      isPinEnabled,
      pin: isPinEnabled ? pin : undefined
    };

    onUpdateUser(updatedUser);
    setMessage('Pengaturan disimpan!');
    setTimeout(() => setMessage(''), 3000);
  };

  const handleChangePassword = () => {
    if (newPassword.length < 6) {
      setMessage('Password minimal 6 karakter');
      return;
    }

    const updatedUser = {
      ...user,
      passwordHash: newPassword
    };

    onUpdateUser(updatedUser);
    setMessage('Password berhasil diubah!');
    setNewPassword('');
    setTimeout(() => setMessage(''), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden">
        <div className="p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-serif font-bold italic dark:text-white">Pengaturan</h2>
            <button 
              onClick={onClose}
              className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-slate-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {message && (
            <div className="mb-6 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 p-3 rounded-xl text-xs font-medium border border-emerald-100 dark:border-emerald-900/30">
              {message}
            </div>
          )}

          <div className="space-y-8">
            {/* PIN Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold dark:text-white">Keamanan PIN</h3>
                  <p className="text-xs text-slate-500">Minta PIN saat membuka catatan sensitif</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={isPinEnabled}
                    onChange={() => setIsPinEnabled(!isPinEnabled)}
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {isPinEnabled && (
                <input
                  type="password"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-all"
                  placeholder="Masukkan 4-6 digit PIN"
                />
              )}
              
              <button
                onClick={handleSaveSettings}
                className="w-full bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 py-2 rounded-xl text-xs font-bold hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors"
              >
                Simpan Pengaturan PIN
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
                className="w-full bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 py-2 rounded-xl text-xs font-bold hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors"
              >
                Ubah Password
              </button>
            </div>

            <hr className="border-slate-100 dark:border-zinc-800" />

            {/* Logout */}
            <button
              onClick={onLogout}
              className="w-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 py-3 rounded-xl text-sm font-bold hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
            >
              Keluar Akun
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
