import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export type UserRole = 'user' | 'admin';

export interface Profile {
  id: string;
  email: string;
  role: UserRole;
  full_name: string | null;
  avatar_url: string | null;
  storage_limit_mb: number;
  created_at: string;
}

export interface ConversionRecord {
  id: string;
  user_id: string;
  tool_id: string;
  tool_name: string;
  category: string;
  input_name: string;
  output_name: string;
  output_format: string;
  status: 'completed' | 'failed';
  file_size: number | null;
  created_at: string;
}
