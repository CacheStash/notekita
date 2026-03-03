import React, { useState, useEffect } from 'react';
import { User } from '../types';
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
  const [isContentHidden, setIsContentHidden] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // --- State Baru: Manajemen Kategori ---
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [newCatName, setNewCatName] = useState('');

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

    // Muat daftar kategori dari database
    const fetchCategories = async () => {
      const { data } = await supabase
        .from('notekita_categories')
        .select('id, name')
        .eq('user_id', user.id)
        .order('name');
      if (data) setCategories(data);
    };

    fetchSettings();
    fetchCategories();
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
        is_content_hidden: isContentHidden
      });

    if (error) {
      alert('❌ Gagal menyimpan: ' + error.message);
    } else {
      alert('✅ Pengaturan berhasil diperbarui!');
      onUpdateUser({ ...user, isPinEnabled, pin: targetPin || undefined, isContentHidden });
    }
    setLoading(false);
  };

  // --- Logic Tambah & Hapus Kategori ---
  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('notekita_categories')
      .insert([{ user_id: user.id, name: newCatName.trim() }])
      .select()
      .single();

    if (error) {
      alert('Gagal menambah kategori: ' + error.message);
    } else if (data) {
      setCategories([...categories, data]);
      setNewCatName('');
    }
    setLoading(false);
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Hapus kategori ini? Catatan lama akan tetap ada namun kategori tidak terpilih.')) return;
    setLoading(true);
    const { error } = await supabase
      .from('notekita_categories')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Gagal menghapus kategori: ' + error.message);
    } else {
      setCategories(categories.filter(c => c.id !== id));
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
      <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-serif font-bold italic dark:text-white">Pengaturan</h2>
            <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-slate-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Section: Kelola Kategori */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold dark:text-white">Kelola Kategori</h3>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <div key={cat.id} className="flex items-center bg-slate-50 dark:bg-zinc-800/50 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-zinc-700">
                  <span className="text-[11px] font-bold text-slate-600 dark:text-zinc-400 mr-2">{cat.name}</span>
                  <button 
                    onClick={() => handleDeleteCategory(cat.id)}
                    className="text-slate-300 hover:text-red-500 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3 h-3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
            <div className="flex space-x-2">
              <input
                type="text"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="Kategori baru..."
                className="flex-1 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-4 py-2 text-xs focus:outline-none dark:text-white"
              />
              <button 
                onClick={handleAddCategory}
                disabled={loading || !newCatName.trim()}
                className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-indigo-700 disabled:opacity-50"
              >
                Tambah
              </button>
            </div>
          </div>

          <hr className="border-slate-100 dark:border-zinc-800" />

          {/* Section: Sensor Global */}
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

          {/* Section: PIN Keamanan */}
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
          
          {/* Section: Ganti Password */}
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