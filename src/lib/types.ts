// Tipos do domínio Reservacar — espelham o schema em supabase/schema.sql.
// Ajuste conforme o schema evoluir; depois dá para gerar automaticamente com:
//   npx supabase gen types typescript --project-id <id> > src/lib/database.types.ts

export type PlanoId = 'Basic' | 'Plus' | 'Premium';
export type PropostaStatus = 'Active' | 'Completed' | 'Expired';
export type VisitaStatus = 'agendada' | 'compareceu' | 'cancelada' | 'no-show';

export interface Loja {
  id: string;
  nome: string;
  cnpj: string | null;
  email: string | null;
  telefone: string | null;
  endereco: string | null;
  cep: string | null;
  valor_minimo_sinal: number;
  plano: PlanoId;
  agenda_horarios: string[]; // ex: ["09:00","10:00",...]
  created_at: string;
}

export interface Vendedor {
  id: string;
  loja_id: string;
  nome: string;
  cargo: string;
  ativo: boolean;
  links_gerados: number;
  conversao: number;
  created_at: string;
}

export interface Proposta {
  id: string;
  loja_id: string;
  vendedor_id: string | null;
  title: string;
  ano: string | null;
  cor: string | null;
  motor: string | null;
  cambio: string | null;
  km: string | null;
  opcionais: string | null;
  fipe_value: number | null;
  valor_venda: number | null;
  sinal: number;
  expiracao: number; // minutos
  status: PropostaStatus;
  cliente_nome: string | null;
  fotos: string[]; // URLs públicas do Storage
  created_at: string;
}

export interface Visita {
  id: string;
  proposta_id: string;
  cliente_nome: string;
  whatsapp: string;
  dia: string; // ISO date
  hora: string; // "16:00"
  status: VisitaStatus;
  created_at: string;
}
