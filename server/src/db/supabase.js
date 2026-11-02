import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY || 'placeholder-key';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) {
  if (process.env.NODE_ENV !== 'test') {
    console.warn('⚠️ [DB Warning] Missing SUPABASE_URL or SUPABASE_SECRET_KEY. Database operations will fail unless configured.');
  }
}

// Server-side client uses the secret key — never exposed to frontend
export const supabase = createClient(supabaseUrl, supabaseSecretKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
