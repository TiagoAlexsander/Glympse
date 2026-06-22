import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const supabaseUrl            = process.env.SUPABASE_URL             ?? 'https://example.supabase.co';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'sua-chave-service-role';
const supabaseAnonKey        = process.env.SUPABASE_ANON_KEY         ?? 'sua-chave-anon';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.SUPABASE_ANON_KEY) {
  console.warn('Variáveis do Supabase ausentes. Preencha o arquivo .env antes de usar o banco.');
}

// Cliente admin — service role key, para operações no banco e auth.admin.*
// NUNCA chame signInWithPassword neste cliente (mudaria o auth state e quebraria as queries)
export const supabase = createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Cliente de autenticação — anon key, usado apenas para login/logout/refresh do usuário
// Mantém o service role client isolado e as queries sempre com a service role
export const supabaseAuth = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});