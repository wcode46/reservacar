import { createClient } from '@supabase/supabase-js';

// Variáveis lidas do .env (prefixo VITE_ é obrigatório para o Vite expor no client).
// Copie .env.example para .env e preencha com os dados do seu projeto Supabase.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  // Não quebra o app — apenas avisa. Útil enquanto o protótipo ainda roda em modo mock.
  console.warn(
    '[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY ausentes. ' +
    'Copie .env.example para .env e preencha. O app segue em modo mock até lá.'
  );
}

// Cliente único reutilizável em todo o app.
export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '');
