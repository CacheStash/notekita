import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { supabase } from '../services/supabase';

interface SettingsModalProps {
 user: User;
  notes: import('../types').Note[];
  onImportNotes: (notes: import('../types').Note[]) => void;
  onUpdateUser: (updatedUser: User) => void;
  onLogout: () => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
  user, 
  notes, 
  onImportNotes, 
  onUpdateUser, 
  onLogout, 
  onClose 
}) => {
  const [pin, setPin] = useState('');
  const [isPinEnabled, setIsPinEnabled] = useState(false);
  const [isContentHidden, setIsContentHidden] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const downloadFile = (content: string, fileName: string, contentType: string) => {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = () => {
    if (notes.length === 0) return alert('Tidak ada catatan untuk diekspor.');
    const jsonStr = JSON.stringify(notes, null, 2);
    const dateStr = new Date().toISOString().split('T')[0];
    downloadFile(jsonStr, `notekita_backup_${dateStr}.json`, 'application/json');
  };

  const handleExportCSV = () => {
    if (notes.length === 0) return alert('Tidak ada catatan untuk diekspor.');
    const headers = ['id', 'title', 'content', 'category', 'isPrivate', 'createdAt', 'updatedAt'];
    const rows = notes.map(n => [
      n.id,
      `"${(n.title || '').replace(/"/g, '""')}"`,
      `"${(n.content || '').replace(/"/g, '""')}"`,
      `"${(n.category || '').replace(/"/g, '""')}"`,
      n.isPrivate ?? false,
      n.createdAt || '',
      n.updatedAt || ''
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const dateStr = new Date().toISOString().split('T')[0];
    downloadFile(csvContent, `notekita_notes_${dateStr}.csv`, 'text/csv;charset=utf-8;');
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        let importedList: import('../types').Note[] = [];

        if (file.name.endsWith('.json')) {
          const parsed = JSON.parse(text);
          if (!Array.isArray(parsed)) throw new Error('Format JSON harus berupa list/array.');
          importedList = parsed.map((item: any) => ({
            id: item.id || crypto.randomUUID(),
            title: item.title || '',
            content: item.content || '',
            category: item.category || 'General',
            isPrivate: !!item.isPrivate,
            createdAt: typeof item.createdAt === 'number' ? item.createdAt : Date.now(),
            updatedAt: typeof item.updatedAt === 'number' ? item.updatedAt : Date.now(),
          }));
        } else if (file.name.endsWith('.csv')) {
          const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
          if (lines.length <= 1) throw new Error('File CSV kosong.');
          
          for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
            if (cols.length >= 4) {
              const sanitize = (val: string) => (val || '').replace(/^"(.*)"$/, '$1').replace(/""/g, '"');
              importedList.push({
                id: sanitize(cols[0]) || crypto.randomUUID(),
                title: sanitize(cols[1]),
                content: sanitize(cols[2]),
                category: sanitize(cols[3]) || 'General',
                isPrivate: cols[4] === 'true',
                createdAt: Number(cols[5]) || Date.now(),
                updatedAt: Number(cols[6]) || Date.now(),
              });
            }
          }
        } else {
          alert('Format file tidak didukung! Gunakan .json atau .csv');
          return;
        }

        if (importedList.length === 0) throw new Error('Tidak ada data valid yang ditemukan.');
        onImportNotes(importedList);
      } catch (err: any) {
        alert('Gagal impor: ' + err.message);
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

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
<hr className="border-slate-100 dark:border-zinc-800" />

          {/* Section: Export & Import Data */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold dark:text-white">Backup & Restore</h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleExportJSON}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 hover:bg-slate-200 dark:hover:bg-zinc-700 transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                JSON Export
              </button>
              <button
                type="button"
                onClick={handleExportCSV}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 hover:bg-slate-200 dark:hover:bg-zinc-700 transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                CSV Export
              </button>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportFile}
              accept=".json,.csv"
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold border border-dashed border-slate-300 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800 transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              Import Data (.json / .csv)
            </button>
          </div>
          <button onClick={onLogout} className="w-full bg-red-50 dark:bg-red-900/10 text-red-600 py-3 rounded-xl text-xs font-bold">Logout</button>
        </div>
      </div>
    </div>
  );
};