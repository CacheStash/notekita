import { Note } from '../types';

// Helper Download File
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

// --- EXPORT JSON ---
export const exportToJSON = (notes: Note[]) => {
  if (notes.length === 0) {
    alert('Tidak ada catatan untuk diekspor!');
    return;
  }
  const jsonStr = JSON.stringify(notes, null, 2);
  const dateStr = new Date().toISOString().split('T')[0];
  downloadFile(jsonStr, `notekita_backup_${dateStr}.json`, 'application/json');
};

// --- EXPORT CSV ---
export const exportToCSV = (notes: Note[]) => {
  if (notes.length === 0) {
    alert('Tidak ada catatan untuk diekspor!');
    return;
  }

  // Header CSV sesuai schema Note
  const headers = ['id', 'title', 'content', 'category', 'isPrivate', 'createdAt', 'updatedAt'];
  
  // Format tiap baris & escape quotes
  const rows = notes.map(note => [
    note.id,
    `"${(note.title || '').replace(/"/g, '""')}"`,
    `"${(note.content || '').replace(/"/g, '""')}"`,
    `"${(note.category || '').replace(/"/g, '""')}"`,
    note.isPrivate ?? false,
    note.createdAt || '',
    note.updatedAt || ''
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  const dateStr = new Date().toISOString().split('T')[0];
  downloadFile(csvContent, `notekita_notes_${dateStr}.csv`, 'text/csv;charset=utf-8;');
};

// --- IMPORT JSON ---
export const importFromJSON = async (file: File): Promise<Partial<Note>[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        if (Array.isArray(parsed)) {
          resolve(parsed);
        } else {
          reject(new Error('Format file JSON harus berupa array catatan.'));
        }
      } catch (err) {
        reject(new Error('Gagal membaca file JSON (format tidak valid).'));
      }
    };
    reader.onerror = () => reject(new Error('Gagal membaca file.'));
    reader.readAsText(file);
  });
};