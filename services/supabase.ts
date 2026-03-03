import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validasi Key: Lebih baik error di awal daripada crash di tengah jalan
if (!supabaseUrl || !supabaseKey) {
  console.error("⚠️ Supabase URL atau Key belum diset di environment variables!");
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseKey || 'placeholder-key'
);