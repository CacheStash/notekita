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
  const [isContentHidden, setIsContentHidden] = useState(false); // State baru
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase
        .from('notekita_settings')
        .select('app_pin, is_content_hidden')
        .eq('user_id', user.id)
        .single();
      
      if (data) {
        if (data.app_pin) {
          setPin(data.app_pin);
          setIsPinEnabled(true);
        }
        setIsContentHidden(!!data.is_content_hidden);
      }
    };
    fetchSettings();
  }, [user.id]);

  const handleSaveSettings = async () => {
    setLoading(true);
    const targetPin = isPinEnabled ? pin : null;

    if (isPinEnabled && pin.length !== 6) {
      alert('⚠️ PIN harus 6 digit angka');
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from('notekita_settings')
      .upsert({ 
        user_id: user.id, 
        app_pin: targetPin,
        is_content_hidden: isContentHidden // Simpan ke DB
      });

    if (error) {
      alert('❌ Gagal menyimpan: ' + error.message);
    } else {
      alert('✅ Pengaturan berhasil diperbarui!');
      onUpdateUser({ ...user, isPinEnabled, pin: targetPin || undefined, isContentHidden });
    }
    setLoading(false);
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) return alert('Password minimal 6 karakter');
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) alert(error.message);
    else { alert('Password diperbarui!'); setNewPassword(''); }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden">
        <div className="p-8 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-serif font-bold italic dark:text-white">Pengaturan</h2>
            <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-slate-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Sensor Global Toggle */}
          <div className="flex items-center justify-between bg-slate-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-slate-100 dark:border-zinc-800">
            <div>
              <h3 className="text-sm font-bold dark:text-white">Sensor Konten Global</h3>
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">Sembunyikan isi semua catatan</p>
            </div>
            <button 
              onClick={() => setIsContentHidden(!isContentHidden)}
              className={`w-10 h-5 rounded-full transition-colors relative ${isContentHidden ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-zinc-700'}`}
            >
              <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${isContentHidden ? 'right-1' : 'left-1'}`} />
            </button>
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
                type="text" maxLength={6} value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-center text-2xl font-bold tracking-[0.5em] focus:outline-none dark:text-white"
                placeholder="••••••"
              />
            )}
            <button onClick={handleSaveSettings} disabled={loading} className="w-full bg-indigo-600 text-white py-3 rounded-xl text-xs font-bold hover:bg-indigo-700 disabled:opacity-50">
              Simpan Pengaturan
            </button>
          </div>

          <hr className="border-slate-100 dark:border-zinc-800" />
          
          <div className="space-y-3">
             <h3 className="text-sm font-bold dark:text-white">Ganti Password</h3>
             <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-4 py-2 text-sm dark:text-white" placeholder="Password baru" />
             <button onClick={handleChangePassword} disabled={loading} className="w-full bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 py-2 rounded-xl text-xs font-bold">Ubah Password</button>
          </div>

          <button onClick={onLogout} className="w-full bg-red-50 dark:bg-red-900/10 text-red-600 py-3 rounded-xl text-xs font-bold">Logout</button>
        </div>
      </div>
    </div>
  );
};