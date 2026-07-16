import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Car, Clock, ShieldCheck, ChevronRight, CheckCircle2, 
  Play, ChevronLeft, X, LogIn, BarChart2, Link as LinkIcon, 
  MessageCircle, Phone, Heart, Share, ArrowRight, ArrowUpRight, ArrowLeft, Shield,
  Bell, Send, Check, Copy, Sparkles, RefreshCw, Smartphone, Laptop, AlertCircle,
  TrendingUp, DollarSign, Users, Award, ShieldAlert, UploadCloud, Info, HelpCircle, CreditCard,
  CircleDollarSign, Settings, LogOut, Menu, PlusCircle, UserPlus, Search, FileText,
  ArrowUp, TrendingDown, Eye, Star, Trophy, Sun, Plus, Key, MapPin, ChevronDown, ChevronUp, Camera, PanelsTopLeft,
  LayoutGrid, LayoutList, Zap, CalendarClock, CalendarCheck
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from './lib/supabaseClient';


// --- UTILITY FUNCTIONS ---
const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

// Quebra o título vindo da FIPE em marca + modelo (destaque) e o restante
// (versão/motor) para uma diagramação no estilo Webmotors.
// Ex.: "BMW X1 SDRIVE 18i GP 1.5 TB Aut. 2023 Gasolina"
//   -> { marca: 'BMW', modelo: 'X1', resto: 'SDRIVE 18i GP 1.5 TB Aut.' }
// Exibe a quilometragem sempre com a unidade "km" (sem duplicar se já vier com ela).
const formatKm = (km: any) => {
  const s = String(km ?? '').trim();
  if (!s) return '';
  return /km/i.test(s) ? s : `${s} km`;
};

const FUEL_WORDS = ['Gasolina', 'Flex', 'Diesel', 'Híbrido', 'Hibrido', 'Elétrico', 'Eletrico', 'Etanol', 'Álcool', 'Alcool', 'GNV'];
// Marcas cujo nome tem 2 palavras: sem isso, "Land Rover Evoque" viraria
// marca="Land" / modelo="Rover". Comparação case-insensitive nos 2 primeiros tokens.
const COMPOUND_BRANDS = ['Land Rover', 'Alfa Romeo', 'Mercedes-Benz', 'Mercedes Benz', 'Aston Martin', 'Great Wall', 'Rolls-Royce', 'Rolls Royce'];
const parseVeiculoTitulo = (title: string) => {
  const tokens = String(title || '').trim().split(/\s+/).filter(Boolean);
  const twoWordBrand = COMPOUND_BRANDS.some(
    b => b.toLowerCase() === `${tokens[0] || ''} ${tokens[1] || ''}`.toLowerCase()
  );
  const brandLen = twoWordBrand ? 2 : 1;
  const marca = tokens.slice(0, brandLen).join(' ');
  const modelo = tokens[brandLen] || '';
  const resto = tokens.slice(brandLen + 1)
    .filter(t => !/^\d{4}$/.test(t) && !/^\(.*\)$/.test(t) && !FUEL_WORDS.includes(t))
    .join(' ');
  return { marca, modelo, resto };
};

// Teto de valor de um veículo: R$ 100 milhões. Evita preços absurdos no cadastro
// e estouro de layout no preview/link.
const MAX_VEHICLE_PRICE = 100_000_000;
const clampPrice = (value) => {
  const n = Number(value) || 0;
  if (n < 0) return 0;
  return n > MAX_VEHICLE_PRICE ? MAX_VEHICLE_PRICE : n;
};

// ===== Exportação do relatório da loja =====
// PDF: janela de impressão estilizada (o navegador salva como PDF, sem lib extra).
// Markdown: download direto de um .md. Cada exportação vira um log em
// localStorage, exibido na aba Configurações → Logs.
const EXPORT_LOGS_KEY = 'reservacar_export_logs';
const lerLogsExportacao = (): any[] => {
  try { return JSON.parse(localStorage.getItem(EXPORT_LOGS_KEY) || '[]'); } catch { return []; }
};
const registrarExportacao = (entry: { formato: string; qtd: number; loja: string }) => {
  try {
    const logs = lerLogsExportacao();
    logs.unshift({ ...entry, ts: new Date().toISOString() });
    localStorage.setItem(EXPORT_LOGS_KEY, JSON.stringify(logs.slice(0, 50)));
  } catch { /* sem localStorage a exportação segue, só não registra */ }
};

const STATUS_EXPORT_LABEL: any = { Active: 'Aguardando Sinal', Completed: 'PIX Recebido', Expired: 'Expirado', Pending: 'Pendente' };
const montarRelatorioLoja = (reservas: any[], empresa: any, reservasUsadas: number, totalPlano: number) => {
  const vendas = reservas.filter(r => r.status === 'Completed' || r.paidSignal);
  return {
    loja: {
      nome: empresa?.nome || '—', cnpj: empresa?.cnpj || '—',
      email: empresa?.email || '—', telefone: empresa?.telefone || '—',
      plano: empresa?.plano || '—',
    },
    geradoEm: new Date().toLocaleString('pt-BR'),
    stats: {
      total: reservas.length,
      ativas: reservas.filter(r => r.status === 'Active').length,
      vendas: vendas.length,
      expiradas: reservas.filter(r => r.status === 'Expired').length,
      sinais: vendas.reduce((a, r) => a + (Number(r.sinal) || 0), 0),
      conversao: reservas.length ? `${Math.round((vendas.length / reservas.length) * 100)}%` : '—',
      uso: `${reservasUsadas}/${totalPlano}`,
    },
    linhas: reservas.map(r => ({
      veiculo: r.title || '—',
      cliente: r.clienteNome || '—',
      vendedor: r.vendedores || '—',
      sinal: formatCurrency(Number(r.sinal) || 0),
      status: STATUS_EXPORT_LABEL[r.status] || r.status || '—',
      criado: r.created || '—',
    })),
  };
};

const gerarMarkdownRelatorio = (rel: ReturnType<typeof montarRelatorioLoja>) => {
  const md = [
    `# Relatório da loja — ${rel.loja.nome}`,
    ``,
    `Gerado em ${rel.geradoEm} pelo Reservacar.`,
    ``,
    `## Loja`,
    `- **CNPJ:** ${rel.loja.cnpj}`,
    `- **E-mail:** ${rel.loja.email}`,
    `- **Telefone:** ${rel.loja.telefone}`,
    `- **Plano:** ${rel.loja.plano} (uso: ${rel.stats.uso})`,
    ``,
    `## Resumo`,
    `| Indicador | Valor |`,
    `|---|---|`,
    `| Reservas criadas | ${rel.stats.total} |`,
    `| Aguardando sinal | ${rel.stats.ativas} |`,
    `| Vendas (PIX recebido) | ${rel.stats.vendas} |`,
    `| Expiradas | ${rel.stats.expiradas} |`,
    `| Sinais recebidos | ${formatCurrency(rel.stats.sinais)} |`,
    `| Conversão | ${rel.stats.conversao} |`,
    ``,
    `## Reservas`,
    `| Veículo | Cliente | Vendedor | Sinal | Status | Criado em |`,
    `|---|---|---|---|---|---|`,
    ...rel.linhas.map(l => `| ${l.veiculo} | ${l.cliente} | ${l.vendedor} | ${l.sinal} | ${l.status} | ${l.criado} |`),
    ``,
  ].join('\n');
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `reservacar-relatorio-${new Date().toISOString().slice(0, 10)}.md`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  return true;
};

const gerarPdfRelatorio = (rel: ReturnType<typeof montarRelatorioLoja>) => {
  // Iframe oculto + print(): dispara o diálogo "Salvar como PDF" do navegador
  // sem abrir popup (imune a bloqueadores). O iframe é removido no afterprint.
  const linhas = rel.linhas.map(l => `
    <tr><td>${l.veiculo}</td><td>${l.cliente}</td><td>${l.vendedor}</td><td class="num">${l.sinal}</td><td>${l.status}</td><td>${l.criado}</td></tr>`).join('');
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8" />
    <title>reservacar-relatorio-${new Date().toISOString().slice(0, 10)}</title>
    <style>
      * { box-sizing: border-box; margin: 0; }
      body { font-family: 'Manrope', -apple-system, 'Segoe UI', sans-serif; color: #141414; padding: 36px; }
      .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #141414; padding-bottom: 14px; margin-bottom: 20px; }
      h1 { font-size: 21px; letter-spacing: -0.02em; }
      .marca { font-size: 12px; font-weight: 800; background: #C1F11D; padding: 4px 10px; border-radius: 999px; }
      .meta { font-size: 11px; color: #5F5F5A; margin-top: 4px; }
      .kpis { display: flex; gap: 10px; flex-wrap: wrap; margin: 18px 0 22px; }
      .kpi { border: 1px solid #E5E5E2; border-radius: 12px; padding: 10px 14px; min-width: 110px; }
      .kpi b { display: block; font-size: 17px; }
      .kpi span { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #8A8A85; }
      table { width: 100%; border-collapse: collapse; font-size: 11px; }
      th { text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 0.08em; color: #8A8A85; border-bottom: 1px solid #E5E5E2; padding: 7px 8px; }
      td { border-bottom: 1px solid #F0F0EE; padding: 7px 8px; }
      td.num { font-weight: 700; white-space: nowrap; }
      .foot { margin-top: 24px; font-size: 10px; color: #8A8A85; }
      @media print { body { padding: 12px; } }
    </style></head><body>
    <div class="head">
      <div>
        <h1>Relatório da loja — ${rel.loja.nome}</h1>
        <div class="meta">CNPJ ${rel.loja.cnpj} · ${rel.loja.email} · ${rel.loja.telefone} · Plano ${rel.loja.plano} (uso ${rel.stats.uso})</div>
        <div class="meta">Gerado em ${rel.geradoEm}</div>
      </div>
      <span class="marca">Reservacar</span>
    </div>
    <div class="kpis">
      <div class="kpi"><span>Reservas</span><b>${rel.stats.total}</b></div>
      <div class="kpi"><span>Aguardando sinal</span><b>${rel.stats.ativas}</b></div>
      <div class="kpi"><span>Vendas (PIX)</span><b>${rel.stats.vendas}</b></div>
      <div class="kpi"><span>Expiradas</span><b>${rel.stats.expiradas}</b></div>
      <div class="kpi"><span>Sinais recebidos</span><b>${formatCurrency(rel.stats.sinais)}</b></div>
      <div class="kpi"><span>Conversão</span><b>${rel.stats.conversao}</b></div>
    </div>
    <table>
      <thead><tr><th>Veículo</th><th>Cliente</th><th>Vendedor</th><th>Sinal</th><th>Status</th><th>Criado em</th></tr></thead>
      <tbody>${linhas}</tbody>
    </table>
    <div class="foot">Documento gerado automaticamente pelo Reservacar. Use "Salvar como PDF" na janela de impressão.</div>
  </body></html>`;
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
  document.body.appendChild(iframe);
  const idoc = iframe.contentWindow?.document;
  if (!idoc) { iframe.remove(); return false; }
  idoc.open(); idoc.write(html); idoc.close();
  const limpar = () => iframe.remove();
  iframe.contentWindow?.addEventListener('afterprint', limpar);
  setTimeout(limpar, 120000); // fallback caso afterprint não dispare
  setTimeout(() => { iframe.contentWindow?.focus(); iframe.contentWindow?.print(); }, 350);
  return true;
};

// Eventos de atividade (proposta_eventos) — label por tipo e mapeamento para o feed.
const LABEL_EVENTO: Record<string, string> = {
  view: 'VISUALIZAÇÃO', visita: 'VISITA AGENDADA', foto: 'FOTOS ATUALIZADAS',
};
const tempoRelativoEvento = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'Agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  return d === 1 ? 'ontem' : `há ${d} dias`;
};
const mapEventoToItem = (row: any, time?: string) => ({
  id: `evt-${row.id}`,
  type: row.tipo,
  label: LABEL_EVENTO[row.tipo] || 'ATIVIDADE',
  text: row.descricao || `${row.titulo || 'Uma proposta'}.`,
  time: time ?? 'Agora',
});

const formatCPF = (v: string) => {
  v = v.replace(/\D/g, "");
  if (v.length > 11) v = v.substring(0, 11);
  return v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
          .replace(/(\d{3})(\d{3})(\d)/, "$1.$2.$3")
          .replace(/(\d{3})(\d)/, "$1.$2");
};

const formatCNPJ = (v: string) => {
  v = v.replace(/\D/g, "");
  if (v.length > 14) v = v.substring(0, 14);
  return v.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5")
          .replace(/(\d{2})(\d{3})(\d{3})(\d)/, "$1.$2.$3/$4")
          .replace(/(\d{2})(\d{3})(\d)/, "$1.$2.$3");
};

const formatPhone = (v: string) => {
  v = v.replace(/\D/g, "");
  if (v.length > 11) v = v.substring(0, 11);
  if (v.length > 10) {
    return v.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
  }
  return v.replace(/^(\d{2})(\d{4})(\d{4})$/, "($1) $2-$3");
};

const formatCEP = (v: string) => {
  v = v.replace(/\D/g, "");
  if (v.length > 8) v = v.substring(0, 8);
  return v.replace(/^(\d{5})(\d{3})$/, "$1-$2");
};


// Safe copy helper due to iframe sandbox constraints
const copyToClipboard = (text, callback) => {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text)
      .then(() => callback(true))
      .catch(() => {
        // Fallback
        const textArea = document.createElement("textarea");
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        try {
          document.execCommand('copy');
          callback(true);
        } catch (err) {
          callback(false);
        }
        document.body.removeChild(textArea);
      });
  } else {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      callback(true);
    } catch (err) {
      callback(false);
    }
    document.body.removeChild(textArea);
  }
};

// --- STATIC IMAGES PRESETS ---
const CAR_IMAGES = [
  { name: 'BMW Black Accent', url: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=800&q=80' },
  { name: 'Porsche Sleek Gray', url: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80' },
  { name: 'Audi Sport Red', url: 'https://images.unsplash.com/photo-1606016159991-dfe4f2746ad5?auto=format&fit=crop&w=800&q=80' },
  { name: 'Electric JAC White', url: 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&w=800&q=80' },
];

// --- FONTE ÚNICA DE VERDADE DOS PLANOS (consumida por Pricing, Assinatura e Checkout) ---
const PLANOS = {
  Basic: {
    nome: 'Basic',
    tag: 'Plano Básico',
    precoMensal: 159.90,
    precoAnual: 1599.00, // 2 meses grátis (mensal × 10)
    limite: 10,
    vendedores: '3',
    nota: 'Recomendado para pequenas lojas',
    suporte: 'E-mail',
    relatorios: false,
    destaque: false,
    recursos: ['10 links de reserva ativos', 'Até 3 vendedores', 'Painel ao vivo', 'Busca FIPE automática', 'Pix direto na conta', 'Suporte por e-mail'],
  },
  Plus: {
    nome: 'Plus',
    tag: 'Plano Recomendado',
    precoMensal: 239.90,
    precoAnual: 2399.00,
    limite: 30,
    vendedores: '10',
    nota: 'Melhor custo benefício',
    suporte: 'Prioritário',
    relatorios: true,
    destaque: true,
    recursos: ['30 links de reserva ativos', 'Até 10 vendedores', 'Painel ao vivo', 'Busca FIPE automática', 'Pix direto na conta', 'Relatórios avançados', 'Suporte prioritário'],
  },
  Premium: {
    nome: 'Premium',
    tag: 'Plano Corporativo',
    precoMensal: 349.90,
    precoAnual: 3499.00,
    limite: 50,
    vendedores: '∞',
    nota: 'Exposição máxima do showroom',
    suporte: '24h dedicado',
    relatorios: true,
    destaque: false,
    recursos: ['50 links de reserva ativos', 'Vendedores ilimitados', 'Painel ao vivo', 'Busca FIPE automática', 'Pix direto na conta', 'Relatórios avançados', 'Suporte 24h dedicado'],
  },
};
const PLANOS_ORDEM = ['Basic', 'Plus', 'Premium'];
const formatBRL = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const MOCK_BRANDS = [
  { codigo: 'BMW', nome: 'BMW' },
  { codigo: 'Audi', nome: 'Audi' },
  { codigo: 'Porsche', nome: 'Porsche' },
  { codigo: 'Chevrolet', nome: 'Chevrolet' },
  { codigo: 'Ford', nome: 'Ford' }
];

const MOCK_MODELS = {
  'BMW': [
    { codigo: '320i', nome: '320i Sport GP 2.0 Turbo' },
    { codigo: 'm3', nome: 'M3 Competition 510cv' },
    { codigo: 'ix', nome: 'iX M60 Elétrico' }
  ],
  'Audi': [
    { codigo: 'a3', nome: 'A3 Sedan Prestige 2.0 TFSI' },
    { codigo: 'rs4', nome: 'RS4 Avant V6 Twin-Turbo' },
    { codigo: 'etron', nome: 'e-tron S Sportback' }
  ],
  'Porsche': [
    { codigo: '911', nome: '911 Carrera S 3.0 Coupé' },
    { codigo: 'taycan', nome: 'Taycan 4S Elétrico' }
  ],
  'Chevrolet': [
    { codigo: 'tracker', nome: 'Tracker Premier 1.2 Turbo' }
  ],
  'Ford': [
    { codigo: 'mustang', nome: 'Mustang Mach 1 5.0 V8' }
  ]
};

const MOCK_YEARS = [
  { codigo: '2024-flex', nome: '2024 Flex', valor: 285000, comb: 'Flex' },
  { codigo: '2023-gas', nome: '2023 Gasolina', valor: 245000, comb: 'Gasolina' },
  { codigo: '2022-ele', nome: '2022 Elétrico', valor: 310000, comb: 'Elétrico' }
];

// --- MAIN APP COMPONENT ---
export default function App() {
  const [currentRoute, setCurrentRoute] = useState('home'); // home, login, hub, sales-stats, dashboard, preview, mobile-preview, assinar, cadastrar-reserva, configuracoes, checkout-plano

  // Tema Black (glassmorphism): camada de estilo à parte via classe no <html>
  // (overrides em index.css). O tema claro original fica intocado. Aplica-se ao
  // app autenticado; as telas PÚBLICAS (landing 'home' e 'login') ficam SEMPRE
  // no tema branco — o branco é o tema principal, inclusive no login.
  const [temaBlack, setTemaBlack] = useState(() => {
    try { return localStorage.getItem('reservacar_theme') === 'black'; } catch { return false; }
  });
  useEffect(() => {
    const rotaPublica = currentRoute === 'home' || currentRoute === 'login';
    document.documentElement.classList.toggle('theme-black', temaBlack && !rotaPublica);
    try { localStorage.setItem('reservacar_theme', temaBlack ? 'black' : 'light'); } catch { /* sem storage, tema só na sessão */ }
  }, [temaBlack, currentRoute]);
  const [activeReservation, setActiveReservation] = useState<any>(null); 
  const [toastMessage, setToastMessage] = useState<any>(null);
  const [previewOrigin, setPreviewOrigin] = useState('dashboard');
  const [draftToResume, setDraftToResume] = useState<any>(null); // rascunho reaberto p/ completar
  const [dashboardTab, setDashboardTab] = useState('ativos'); // aba ativa do painel de Reservas
  const [currentUserRole, setCurrentUserRole] = useState<'owner' | 'employee'>('owner');
  
  // Credit Plan state management
  const [totalReservasPlano, setTotalReservasPlano] = useState(30);
  const [reservasUsadas, setReservasUsadas] = useState(12);
  const [empresaLogada, setEmpresaLogada] = useState<any>({
    nome: 'BMW Premium SP',
    cnpj: '12.345.678/0001-90',
    email: 'vendedor@bmwpremium.com.br',
    telefone: '(11) 99999-8822',
    valorMinimoSinal: 1500,
    plano: 'Plus',
    planoAtivo: 'Plus',
    endereco: 'Av. das Nações Unidas, 12345',
    enderecoCobranca: 'Av. das Nações Unidas, 12345',
    cep: '04578-000',
    ramos: ['Luxo', 'Zero Kilômetro'],
    estoque: 120,
    vendedores: [
      { id: 1, nome: 'Carla Silva', cargo: 'Consultora Premium', ativo: true, dataCadastro: '31/05/2026', linksGerados: 14, conversao: 64 },
      { id: 2, nome: 'Roberto Oliveira', cargo: 'Gerente de Vendas', ativo: true, dataCadastro: '24/05/2026', linksGerados: 28, conversao: 71 },
      { id: 3, nome: 'Marcos Souza', cargo: 'Consultor de Vendas', ativo: true, dataCadastro: '28/05/2026', linksGerados: 9, conversao: 56 }
    ]
  });
  const [planoUpgrade, setPlanoUpgrade] = useState<string>('Plus');
  const [planoSelecionado, setPlanoSelecionado] = useState<string | null>(null);
  const [reservaParaGerenciar, setReservaParaGerenciar] = useState<any>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [mobileNotifOpen, setMobileNotifOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [mobileSearchQuery, setMobileSearchQuery] = useState('');
  const [sidebarCollapsed, setSidebarCollapsedState] = useState<boolean>(() => {
    try { return localStorage.getItem('sidebarCollapsed') === '1'; } catch { return false; }
  });
  const setSidebarCollapsed = (v: boolean) => {
    setSidebarCollapsedState(v);
    try { localStorage.setItem('sidebarCollapsed', v ? '1' : '0'); } catch {}
  };
  
  // Notificações reais — derivadas do estado das reservas (ver useMemo abaixo, após recentReservations).

  // Initial Seed for Reservations (idêntico aos prints!)
  const [recentReservations, setRecentReservations] = useState<any[]>([
    { 
      id: 1, title: 'Audi A3 1.6 3p 2002 Gasolina', duration: '60', created: '12:12:33 de 24/05/2026',
      anoText: '2002', corText: 'Prata', motorText: '1.6 Gasolina', fipeValue: 22000, valorVenda: 19780, km: '185.000', cambio: 'Manual',
      opcionais: 'Ar Condicionado, Vidro Elétrico, Alarme',
      fotos: 'https://images.unsplash.com/photo-1542282088-fe8426682b8f?auto=format&fit=crop&w=800&q=80',
      sinal: 1500, expiracao: 60, vendedores: 'Roberto Oliveira', video: '',
      laudoAprovado: true, status: 'Active', elapsedSeconds: 1200, // 60m - 20m = 1200s passados (40m restantes)
      clienteNome: 'Carlos Andrade', visualizandoAgora: true,
      logs: [
        { time: '12:12:33 de 24/05/2026', text: 'Proposta criada por Roberto Oliveira' },
        { time: '12:12:33 de 24/05/2026', text: 'Link de sinal ativado: R$ 1.500,00' },
        { time: 'Acesso', text: 'Visualizado via celular pelo Lead: Comprador' }
      ]
    },
    { 
      id: 2, title: 'JAC iEV 20 68cv 5p Aut. (Elétrico)', duration: '60', created: '12:16:33 de 24/05/2026',
      anoText: '2022', corText: 'Branco', motorText: '1.0 Elétrico', fipeValue: 81262, valorVenda: 78262, km: '8.200', cambio: 'Automático',
      opcionais: 'Ar Condicionado, Direção Elétrica, Vidro Elétrico, Airbag, Freio ABS, Central Multimídia',
      fotos: 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&w=800&q=80',
      sinal: 1500, expiracao: 60, vendedores: 'Carla Silva', video: '',
      laudoAprovado: true, status: 'Active', elapsedSeconds: 1306, // 60m - 38m14s = 1306s passados
      clienteNome: 'Não informado',
      logs: [
        { time: '12:16:33 de 24/05/2026', text: 'Proposta criada por Carla Silva' },
        { time: '12:16:33 de 24/05/2026', text: 'Link de sinal ativado: R$ 1.500,00' },
        { time: 'Acesso', text: 'Visualizado via celular pelo Lead: Comprador' }
      ]
    },
    { 
      id: 3, title: 'BMW 320i 2.0 Turbo 2023', duration: '30', created: '12:14:52 de 24/05/2026',
      anoText: '2023', corText: 'Preto', motorText: '2.0 Turbo', fipeValue: 230000, valorVenda: 214900, km: '12.000', cambio: 'Automático',
      opcionais: 'Teto Solar, Ar Condicionado Dual Zone, Bancos de Couro',
      fotos: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=800&q=80',
      sinal: 5000, expiracao: 30, vendedores: 'Marcos Souza', video: '',
      laudoAprovado: true, status: 'Completed', paidSignal: true, elapsedSeconds: 1800, // concluído
      clienteNome: 'Rafael Mendes',
      logs: [
        { time: '12:14:52 de 24/05/2026', text: 'Proposta criada por Marcos Souza' },
        { time: '12:14:52 de 24/05/2026', text: 'Link de sinal ativado: R$ 5.000,00' },
        { time: 'Acesso', text: 'Visualizado via celular pelo Lead: Comprador' },
        { time: '12:18:14 de 24/05/2026', text: 'Sinal de R$ 5.000,00 pago via PIX.' }
      ]
    },
    { 
      id: 4, title: 'Mercedes-Benz C200 2.0 Avantgarde 2018', duration: '60', created: '12:15:00 de 24/05/2026',
      anoText: '2018', corText: 'Azul', motorText: '2.0 Turbo', fipeValue: 145000, valorVenda: 139900, km: '48.000', cambio: 'Automático',
      opcionais: 'Teto Solar, Bancos de Couro, Sensor de Estacionamento',
      fotos: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=800&q=80',
      sinal: 3000, expiracao: 60, vendedores: 'Marcos Souza', video: '',
      laudoAprovado: true, status: 'Active', elapsedSeconds: 3345, // 60m - 55m45s = 3345s passados (255s restantes = 4m 15s)
      clienteNome: 'Fernanda Lima',
      logs: [
        { time: '12:15:00 de 24/05/2026', text: 'Proposta criada por Marcos Souza' },
        { time: '12:15:00 de 24/05/2026', text: 'Link de sinal ativado: R$ 3.000,00' },
        { time: 'Acesso', text: 'Visualizado via celular pelo Lead: Comprador' }
      ]
    }
  ]);

  // Eventos de atividade (Supabase Realtime + histórico 72h): view, visita, foto.
  const [eventosRealtime, setEventosRealtime] = useState<any[]>([]);

  // Contador de visitas agendadas (futuras) para o badge do menu "Agenda de Visitas".
  const [visitasCount, setVisitasCount] = useState(0);

  // Feed de atividade gerado a partir das reservas reais (sem mock): cada proposta
  // vira um evento de acordo com seu estado atual — sinal pago (PIX), prestes a
  // expirar (urgência) ou recém-criada (nova proposta). No topo entram as
  // visualizações ao vivo recebidas via Realtime.
  const liveNotifications = useMemo(() => {
    const derivadas = recentReservations.slice(0, 12).map((r: any) => {
      const remaining = (Number(r.expiracao) || 0) * 60 - (r.elapsedSeconds || 0);
      const isPaid = r.status === 'Completed' || r.paidSignal;
      const nomeCliente = r.clienteNome && !['Não informado', 'Cliente'].includes(r.clienteNome) ? r.clienteNome : '';
      const vendedor = r.vendedores ? String(r.vendedores).split(',')[0].trim() : '';
      if (isPaid) {
        return {
          id: `pix-${r.id}`, type: 'pix', label: 'PIX RECEBIDO',
          text: `Sinal de ${formatCurrency(Number(r.sinal) || 0)} ${nomeCliente ? `pago por ${nomeCliente}` : 'pago'} — ${r.title}.`,
          time: r.created || 'Agora',
        };
      }
      if (r.status === 'Active' && remaining > 0 && remaining < 300) {
        return {
          id: `urg-${r.id}`, type: 'urgente', label: 'URGÊNCIA',
          text: `Link ${nomeCliente ? `de ${nomeCliente} ` : ''}para ${r.title} expira em menos de 5 min.`,
          time: 'Agora',
        };
      }
      return {
        id: `new-${r.id}`, type: 'create', label: 'NOVA PROPOSTA',
        text: `${vendedor || 'A equipe'} gerou um link para ${r.title}${nomeCliente ? ` (cliente ${nomeCliente})` : ''}.`,
        time: r.created || 'Agora',
      };
    });
    return [...eventosRealtime, ...derivadas].slice(0, 15);
  }, [recentReservations, eventosRealtime]);

  // Resultados da busca mobile (mesma lógica do Topbar desktop).
  const mobileSearchResults = useMemo(() => {
    const q = mobileSearchQuery.trim().toLowerCase();
    if (!q) return { propostas: [], vendedores: [] };
    const propostas = recentReservations.filter((r: any) =>
      [r.title, r.clienteNome, r.vendedores].filter(Boolean).some((s: string) => s.toLowerCase().includes(q))
    ).slice(0, 8);
    const vendedores = (empresaLogada?.vendedores || []).filter((v: any) => (v.nome || '').toLowerCase().includes(q)).slice(0, 6);
    return { propostas, vendedores };
  }, [mobileSearchQuery, recentReservations, empresaLogada]);

  const showToast = (msg, type = 'info') => {
    setToastMessage({ text: msg, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const navigateTo = (route, origin = null) => {
    window.scrollTo(0, 0);
    setCurrentRoute(route);
    if (origin) {
      setPreviewOrigin(origin);
    }
  };

  // Carrega a loja do usuário autenticado (lojas + vendedores) e mapeia p/ o formato do app.
  const carregarLojaDoUsuario = async () => {
    if (!isSupabaseConfigured) return null;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: loja } = await supabase.from('lojas').select('*').eq('owner_id', user.id).maybeSingle();
    if (!loja) return null;
    const { data: vends } = await supabase.from('vendedores').select('*').eq('loja_id', loja.id).order('created_at');
    const mapped = {
      id: loja.id,
      nome: loja.nome,
      cnpj: loja.cnpj,
      email: loja.email || user.email,
      telefone: loja.telefone,
      valorMinimoSinal: Number(loja.valor_minimo_sinal) || 1500,
      plano: loja.plano,
      planoAtivo: loja.plano,
      endereco: loja.endereco,
      enderecoCobranca: loja.endereco,
      cep: loja.cep,
      ramos: [],
      estoque: 0,
      agendaHorarios: loja.agenda_horarios || HORARIOS_VISITA,
      vendedores: (vends || []).map((v: any) => ({
        id: v.id, nome: v.nome, cargo: v.cargo, ativo: v.ativo,
        dataCadastro: new Date(v.created_at).toLocaleDateString('pt-BR'),
        linksGerados: v.links_gerados, conversao: v.conversao,
      })),
    };
    setEmpresaLogada(mapped);

    // Carrega as propostas da loja do banco e mapeia p/ o formato da UI
    const { data: props } = await supabase.from('propostas').select('*').eq('loja_id', loja.id).order('created_at', { ascending: false });
    const propostas = (props || []).map((p: any) => mapPropostaToUI(p, mapped.vendedores));
    setRecentReservations(propostas);
    setReservasUsadas(propostas.length); // créditos usados = nº real de propostas da loja (não o mock de demo)
    return mapped;
  };

  // Mapeia uma linha de "propostas" (DB) para o formato de reserva usado na UI
  const mapPropostaToUI = (p: any, vendedores: any[] = []) => {
    const vendName = (vendedores.find((v: any) => v.id === p.vendedor_id) || {}).nome || '';
    return {
      id: p.id, loja_id: p.loja_id, title: p.title,
      anoText: p.ano, corText: p.cor, motorText: p.motor, cambio: p.cambio, km: p.km,
      combustivel: p.motor, opcionais: p.opcionais || '',
      fipeValue: clampPrice(p.fipe_value), valorVenda: clampPrice(p.valor_venda),
      sinal: Number(p.sinal) || 0,
      expiracao: p.expiracao, duration: String(p.expiracao),
      status: p.status, clienteNome: p.cliente_nome || 'Não informado',
      fotos: (p.fotos || []).join(','), vendedores: vendName,
      created: new Date(p.created_at).toLocaleString('pt-BR'),
      elapsedSeconds: 0, laudoAprovado: true, logs: [],
    };
  };

  // Publica uma proposta: persiste no banco (se autenticado) e atualiza a lista local
  const publicarProposta = async (r: any) => {
    if (isSupabaseConfigured && empresaLogada?.id) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const vend = (empresaLogada.vendedores || []).find((v: any) => (v.nome || '').trim().toLowerCase() === (r.vendedores || '').trim().toLowerCase());
        const fotosArr = String(r.fotos || '').split(',').map((s: string) => s.trim()).filter(Boolean);
        const { data, error } = await supabase.from('propostas').insert({
          loja_id: empresaLogada.id, vendedor_id: vend?.id || null,
          title: r.title, ano: r.anoText || null, cor: r.corText || null, motor: r.motorText || null,
          cambio: r.cambio || null, km: r.km || null, opcionais: r.opcionais || null,
          fipe_value: r.fipeValue || null, valor_venda: r.valorVenda || null,
          sinal: r.sinal || 0, expiracao: r.expiracao || 60, status: 'Active',
          cliente_nome: r.clienteNome || null, fotos: fotosArr,
        }).select().single();
        if (!error && data) {
          const saved = { ...r, id: data.id, created: new Date(data.created_at).toLocaleString('pt-BR') };
          setRecentReservations((prev: any) => [saved, ...prev]);
          return saved;
        }
      }
    }
    setRecentReservations((prev: any) => [r, ...prev]);
    return r;
  };

  // Pós-login: se já tem loja -> painel; senão -> onboarding (Assinar).
  const handleAuthenticated = async () => {
    setCurrentUserRole('owner');
    const loja = await carregarLojaDoUsuario();
    navigateTo(loja ? 'sales-stats' : 'assinar');
  };

  // Ao montar, se há sessão, pré-carrega a loja (sem forçar navegação).
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    carregarLojaDoUsuario().catch(() => {});
  }, []);

  // Sincronização reativa de créditos de acordo com o plano ativo
  useEffect(() => {
    const plano = empresaLogada?.planoAtivo || empresaLogada?.plano || 'Plus';
    if (plano === 'Basic') setTotalReservasPlano(10);
    else if (plano === 'Premium') setTotalReservasPlano(50);
    else setTotalReservasPlano(30); // Plus
  }, [empresaLogada?.planoAtivo, empresaLogada?.plano]);

  // Realtime: o lojista recebe na hora (sem refresh) cada evento da sua loja —
  // visualização do link, visita agendada pelo cliente e fotos adicionadas.
  useEffect(() => {
    const lojaId = empresaLogada?.id;
    if (!isSupabaseConfigured || !lojaId) return;
    const channel = supabase
      .channel(`eventos-${lojaId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'proposta_eventos', filter: `loja_id=eq.${lojaId}` },
        (payload: any) => {
          const row = payload?.new || {};
          const item = mapEventoToItem(row, 'Agora');
          setEventosRealtime((prev: any) => (
            prev.some((e: any) => e.id === item.id) ? prev : [item, ...prev].slice(0, 30)
          ));
          showToast(`${item.label}: ${item.text}`, 'info');
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [empresaLogada?.id]);

  // Histórico do feed de atividade: ao abrir o painel, carrega os eventos das
  // últimas 72h (sobrevive a refresh / outro dispositivo). Os eventos ao vivo
  // são prepended por cima (com dedupe por id).
  useEffect(() => {
    const lojaId = empresaLogada?.id;
    if (!isSupabaseConfigured || !lojaId) return;
    let cancelado = false;
    (async () => {
      const desde = new Date(Date.now() - 72 * 3600 * 1000).toISOString();
      const { data } = await supabase
        .from('proposta_eventos')
        .select('*')
        .eq('loja_id', lojaId)
        .gte('created_at', desde)
        .order('created_at', { ascending: false })
        .limit(30);
      if (!cancelado && data) {
        const historico = data.map((row: any) => mapEventoToItem(row, tempoRelativoEvento(row.created_at)));
        // Mescla preservando eventos ao vivo que tenham chegado antes do fetch resolver.
        setEventosRealtime((prev: any) => {
          const idsHist = new Set(historico.map((e: any) => e.id));
          const aoVivo = prev.filter((e: any) => !idsHist.has(e.id));
          return [...aoVivo, ...historico].slice(0, 30);
        });
      }
    })();
    return () => { cancelado = true; };
  }, [empresaLogada?.id]);

  // Contagem de visitas agendadas (de hoje em diante) para o badge do menu.
  // Recarrega ao trocar de loja e a cada novo evento (uma visita nova chega via Realtime).
  useEffect(() => {
    const lojaId = empresaLogada?.id;
    if (!isSupabaseConfigured || !lojaId) { setVisitasCount(0); return; }
    let cancelado = false;
    (async () => {
      const hojeISO = new Date().toISOString().slice(0, 10);
      const { count } = await supabase
        .from('visitas')
        .select('id, propostas!inner(loja_id)', { count: 'exact', head: true })
        .eq('propostas.loja_id', lojaId)
        .eq('status', 'agendada')
        .gte('dia', hojeISO);
      if (!cancelado) setVisitasCount(count || 0);
    })();
    return () => { cancelado = true; };
  }, [empresaLogada?.id, eventosRealtime.length]);

  const isLoggedRoute =['hub', 'sales-stats', 'dashboard', 'configuracoes', 'plano', 'checkout-plano', 'cadastrar-reserva', 'reserva-rapida', 'vendedores', 'relatorios', 'logs', 'visitas'].includes(currentRoute);

  // Link público da proposta para o cliente (?p=<id>) — renderiza só a proposta, sem app.
  const publicPropostaId = useMemo(() => new URLSearchParams(window.location.search).get('p'), []);
  if (publicPropostaId) {
    return (
      <div className="min-h-screen bg-[#F4F4F2] text-[#141414] font-sans selection:bg-[#C1F11D] selection:text-[#141414]">
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-[99] max-w-sm bg-white border border-[#E5E5E2] border-l-4 border-[#141414] text-[#141414] p-4 rounded-r-xl flex items-center gap-3 animate-bounce">
            <Sparkles className="text-[#141414] shrink-0" size={20} />
            <span className="text-sm font-medium">{toastMessage.text}</span>
          </div>
        )}
        <PublicPropostaView id={publicPropostaId} showToast={showToast} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#141414] font-sans selection:bg-[#C1F11D] selection:text-[#141414] transition-colors duration-200">

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[99] max-w-sm bg-white border border-[#E5E5E2] border-l-4 border-[#141414] text-[#141414] p-4 rounded-r-xl flex items-center gap-3 animate-bounce">
          <Sparkles className="text-[#141414] shrink-0" size={20} />
          <span className="text-sm font-medium">{toastMessage.text}</span>
        </div>
      )}

      {/* Hide standard navbar on logged-in routes, preview layouts, the home landing page and login page */}
      {!isLoggedRoute && currentRoute !== 'preview' && currentRoute !== 'mobile-preview' && currentRoute !== 'home' && currentRoute !== 'empresa' && currentRoute !== 'pricing' && currentRoute !== 'login' && (
        <Navbar currentRoute={currentRoute} navigateTo={navigateTo} />
      )}

      {/* Mobile Header for Logged-in Routes */}
      {isLoggedRoute && (
        <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-[#E5E5E2] z-40 flex items-center justify-between px-6">
          <button 
            onClick={() => setMobileSidebarOpen(true)}
            className="p-2 text-[#6F6F6A] hover:text-[#141414] transition"
          >
            <Menu size={24} />
          </button>
          <span className="font-extrabold text-[#141414] tracking-tight text-lg absolute left-1/2 -translate-x-1/2">Reservacar</span>
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => { setMobileSearchOpen(true); setMobileSearchQuery(''); }}
              className="p-2 text-[#6F6F6A] hover:text-[#141414] transition"
              aria-label="Buscar"
            >
              <Search size={21} />
            </button>
            <button
              onClick={() => setMobileNotifOpen(v => !v)}
              className="relative p-2 text-[#6F6F6A] hover:text-[#141414] transition"
              aria-label="Notificações"
            >
              <Bell size={22} />
              {liveNotifications.length > 0 && (
                <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">{liveNotifications.length}</span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Overlay de busca (mobile) */}
      {isLoggedRoute && mobileSearchOpen && (
        <div className="lg:hidden fixed inset-0 z-[60] bg-white flex flex-col">
          <div className="flex items-center gap-2 px-3 h-16 border-b border-[#E5E5E2] shrink-0">
            <button onClick={() => { setMobileSearchOpen(false); setMobileSearchQuery(''); }} className="p-2 text-[#6F6F6A] hover:text-[#141414] transition shrink-0" aria-label="Voltar">
              <ChevronLeft size={22} />
            </button>
            <div className="flex items-center gap-2 bg-[#F4F4F2] rounded-full px-4 h-11 flex-1 border border-transparent focus-within:border-[#D9D9D5] transition">
              <Search size={16} className="text-[#8A8A85] shrink-0" />
              <input
                autoFocus
                value={mobileSearchQuery}
                onChange={(e) => setMobileSearchQuery(e.target.value)}
                placeholder="Buscar propostas, vendedores..."
                className="flex-1 bg-transparent text-sm font-medium text-[#141414] outline-none placeholder:text-[#B9B9B4]"
              />
              {mobileSearchQuery && (
                <button onClick={() => setMobileSearchQuery('')} className="text-[#B9B9B4] hover:text-[#6F6F6A] shrink-0" aria-label="Limpar"><X size={16} /></button>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            {!mobileSearchQuery.trim() ? (
              <p className="text-xs text-[#8A8A85] font-medium px-3 py-10 text-center">Busque por propostas (carro, cliente ou vendedor) e vendedores da loja.</p>
            ) : (mobileSearchResults.propostas.length === 0 && mobileSearchResults.vendedores.length === 0) ? (
              <p className="text-xs text-[#8A8A85] font-medium px-3 py-10 text-center">Nenhum resultado para "{mobileSearchQuery}".</p>
            ) : (
              <>
                {mobileSearchResults.propostas.length > 0 && (
                  <div className="mb-2">
                    <span className="text-[10px] font-black text-[#B9B9B4] uppercase tracking-widest px-3 py-1.5 block">Propostas</span>
                    {mobileSearchResults.propostas.map((r: any) => (
                      <button
                        key={r.id}
                        onClick={() => { setActiveReservation && setActiveReservation(r); navigateTo('preview'); setMobileSearchOpen(false); setMobileSearchQuery(''); }}
                        className="w-full text-left flex items-center justify-between gap-3 px-3 py-3 rounded-2xl hover:bg-[#F4F4F2] active:bg-[#EBEBE8] transition"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-[#141414] truncate">{r.title}</p>
                          <p className="text-[11px] text-[#8A8A85] font-medium truncate">{r.vendedores || 'Sem vendedor'} · {r.clienteNome || 'Sem cliente'}</p>
                        </div>
                        <span className="text-xs font-bold text-[#141414] shrink-0">{formatCurrency(r.sinal || 0)}</span>
                      </button>
                    ))}
                  </div>
                )}
                {mobileSearchResults.vendedores.length > 0 && (
                  <div>
                    <span className="text-[10px] font-black text-[#B9B9B4] uppercase tracking-widest px-3 py-1.5 block">Vendedores</span>
                    {mobileSearchResults.vendedores.map((v: any) => (
                      <button
                        key={v.id}
                        onClick={() => { navigateTo('vendedores'); setMobileSearchOpen(false); setMobileSearchQuery(''); }}
                        className="w-full text-left flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-[#F4F4F2] active:bg-[#EBEBE8] transition"
                      >
                        <span className="w-8 h-8 rounded-full bg-[#141414] text-white text-[10px] font-bold flex items-center justify-center shrink-0">{(v.nome || '').split(' ').map((s: string) => s[0]).slice(0, 2).join('')}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-[#141414] truncate">{v.nome}</p>
                          <p className="text-[11px] text-[#8A8A85] font-medium truncate">{v.cargo || 'Vendedor'}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Painel de notificações (mobile) */}
      {isLoggedRoute && mobileNotifOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileNotifOpen(false)}></div>
          <div className="absolute top-16 left-0 right-0 bg-white shadow-xl max-h-[72vh] overflow-y-auto rounded-b-3xl">
            <div className="flex items-center justify-between px-5 py-4 sticky top-0 bg-white border-b border-[#EBEBE8] z-10">
              <div className="flex items-center gap-2">
                <span className="text-base font-extrabold text-[#141414]">Atividade</span>
                <span className="text-[10px] font-bold text-[#8A8A85] uppercase tracking-wider">últimas 72h</span>
              </div>
              <button onClick={() => setMobileNotifOpen(false)} className="text-[#8A8A85] hover:text-[#141414] transition p-1" aria-label="Fechar">
                <X size={18} />
              </button>
            </div>
            <div className="p-3 space-y-2">
              {liveNotifications.length === 0 ? (
                <p className="text-xs text-[#8A8A85] font-medium px-3 py-8 text-center">Nenhuma atividade ainda. Crie uma reserva para começar.</p>
              ) : liveNotifications.map((n: any) => (
                <div key={n.id} className="flex gap-2.5 px-3 py-3 rounded-2xl bg-[#F4F4F2] border border-[#E5E5E2]">
                  <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${n.type === 'urgente' ? 'bg-amber-500' : n.type === 'pix' ? 'bg-[#1E9E5A]' : 'bg-[#141414]'}`}></span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black text-[#8A8A85] uppercase tracking-wide">{n.label}</p>
                    <p className="text-xs font-semibold text-[#2A2A26] leading-snug mt-0.5">{n.text}</p>
                    <p className="text-[10px] text-[#B9B9B4] font-medium mt-1">{n.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Topbar global (desktop) for Logged-in Routes */}
      {isLoggedRoute && (
        <Topbar
          currentRoute={currentRoute}
          navigateTo={navigateTo}
          empresaLogada={empresaLogada}
          liveNotifications={liveNotifications}
          recentReservations={recentReservations}
          collapsed={sidebarCollapsed}
          setCollapsed={setSidebarCollapsed}
          showToast={showToast}
          setActiveReservation={setActiveReservation}
        />
      )}

      {/* Sidebar for Logged-in Routes */}
      {isLoggedRoute && (
        <Sidebar
          currentRoute={currentRoute}
          navigateTo={navigateTo}
          empresaLogada={empresaLogada}
          isOpen={mobileSidebarOpen}
          setIsOpen={setMobileSidebarOpen}
          reservasUsadas={reservasUsadas}
          totalReservasPlano={totalReservasPlano}
          recentReservations={recentReservations}
          showToast={showToast}
          currentUserRole={currentUserRole}
          collapsed={sidebarCollapsed}
          visitasCount={visitasCount}
        />
      )}

      <main className={`transition-all duration-300 ${isLoggedRoute ? `${sidebarCollapsed ? 'lg:pl-[72px]' : 'lg:pl-64'} pt-16` : ''}`}>
        {currentRoute === 'home' && <HomeView navigateTo={navigateTo} />}
        {currentRoute === 'empresa' && <EmpresaView navigateTo={navigateTo} />}
        {currentRoute === 'pricing' && <PricingView navigateTo={navigateTo} setPlanoSelecionado={setPlanoSelecionado} />}
        {currentRoute === 'login' && (
          <LoginView
            navigateTo={navigateTo}
            setCurrentUserRole={setCurrentUserRole}
            onAuthenticated={handleAuthenticated}
          />
        )}
        
        {currentRoute === 'hub' && (
          <HubView 
            navigateTo={navigateTo} 
            reservasUsadas={reservasUsadas} 
            totalReservasPlano={totalReservasPlano}
            liveNotifications={liveNotifications}
            empresaLogada={empresaLogada}
          />
        )}
        
        {currentRoute === 'sales-stats' && (
          <SalesStatsView
            navigateTo={navigateTo}
            temaBlack={temaBlack}
            reservasUsadas={reservasUsadas}
            totalReservasPlano={totalReservasPlano}
            recentReservations={recentReservations}
            setRecentReservations={setRecentReservations}
            liveNotifications={liveNotifications}
            showToast={showToast}
            empresaLogada={empresaLogada}
            setReservaParaGerenciar={setReservaParaGerenciar}
          />
        )}
        
        {currentRoute === 'dashboard' && (
          <DashboardView
            navigateTo={navigateTo}
            setActiveReservation={setActiveReservation}
            recentReservations={recentReservations}
            setRecentReservations={setRecentReservations}
            showToast={showToast}
            reservasUsadas={reservasUsadas}
            totalReservasPlano={totalReservasPlano}
            setReservaParaGerenciar={setReservaParaGerenciar}
            activeTab={dashboardTab}
            setActiveTab={setDashboardTab}
            setDraftToResume={setDraftToResume}
          />
        )}
        
        {currentRoute === 'preview' && (
          <PreviewView 
            reservation={activeReservation} 
            navigateTo={navigateTo} 
            showToast={showToast}
            recentReservations={recentReservations}
            setRecentReservations={setRecentReservations}
            setReservasUsadas={setReservasUsadas}
            reservasUsadas={reservasUsadas}
            totalReservasPlano={totalReservasPlano}
            empresaLogada={empresaLogada}
            setEmpresaLogada={setEmpresaLogada}
            previewOrigin={previewOrigin}
            publicarProposta={publicarProposta}
            setDraftToResume={setDraftToResume}
            setDashboardTab={setDashboardTab}
          />
        )}

        {currentRoute === 'mobile-preview' && (
          <MobileClientView
            reservation={activeReservation}
            navigateTo={navigateTo}
            showToast={showToast}
            recentReservations={recentReservations}
            setRecentReservations={setRecentReservations}
            setReservasUsadas={setReservasUsadas}
            reservasUsadas={reservasUsadas}
            totalReservasPlano={totalReservasPlano}
            empresaLogada={empresaLogada}
            setEmpresaLogada={setEmpresaLogada}
            previewOrigin={previewOrigin}
            publicarProposta={publicarProposta}
          />
        )}

        {currentRoute === 'assinar' && (
          <AssinaturaEmpresaView
            navigateTo={navigateTo}
            showToast={showToast}
            setTotalReservasPlano={setTotalReservasPlano}
            setReservasUsadas={setReservasUsadas}
            setEmpresaLogada={setEmpresaLogada}
            planoSelecionado={planoSelecionado}
          />
        )}

        {['configuracoes', 'vendedores', 'relatorios', 'logs', 'plano'].includes(currentRoute) && (
          <ConfiguracoesHub currentRoute={currentRoute} navigateTo={navigateTo} empresaLogada={empresaLogada}>
            {(currentRoute === 'configuracoes' || currentRoute === 'plano') && (
              <ConfiguracoesView
                embedded
                section={currentRoute === 'plano' ? 'plano' : 'geral'}
                navigateTo={navigateTo}
                showToast={showToast}
                empresaLogada={empresaLogada}
                setEmpresaLogada={setEmpresaLogada}
                totalReservasPlano={totalReservasPlano}
                setTotalReservasPlano={setTotalReservasPlano}
                setPlanoUpgrade={setPlanoUpgrade}
                temaBlack={temaBlack}
                setTemaBlack={setTemaBlack}
              />
            )}
            {currentRoute === 'vendedores' && (
              <VendedoresView embedded navigateTo={navigateTo} showToast={showToast} empresaLogada={empresaLogada} setEmpresaLogada={setEmpresaLogada} />
            )}
            {currentRoute === 'relatorios' && (
              <RelatorioDesempenhoView embedded recentReservations={recentReservations} empresaLogada={empresaLogada} showToast={showToast} />
            )}
            {currentRoute === 'logs' && (
              <RelatorioReservasView embedded navigateTo={navigateTo} showToast={showToast} recentReservations={recentReservations} setRecentReservations={setRecentReservations} />
            )}
          </ConfiguracoesHub>
        )}

        {currentRoute === 'checkout-plano' && (
          <CheckoutPlanoView 
            navigateTo={navigateTo} 
            showToast={showToast}
            empresaLogada={empresaLogada}
            setEmpresaLogada={setEmpresaLogada}
            planoUpgrade={planoUpgrade}
            setTotalReservasPlano={setTotalReservasPlano}
          />
        )}

        {currentRoute === 'cadastrar-reserva' && (
          <CadastroReservaClienteView
            navigateTo={navigateTo}
            showToast={showToast}
            setActiveReservation={setActiveReservation}
            empresaLogada={empresaLogada}
            totalReservasPlano={totalReservasPlano}
            reservasUsadas={reservasUsadas}
            initialDraft={draftToResume?.origin === 'cadastrar-reserva' ? draftToResume : null}
            onConsumeDraft={() => setDraftToResume(null)}
          />
        )}

        {currentRoute === 'visitas' && (
          <AgendaVisitasView
            navigateTo={navigateTo}
            showToast={showToast}
            empresaLogada={empresaLogada}
            recentReservations={recentReservations}
            setActiveReservation={setActiveReservation}
          />
        )}

        {currentRoute === 'reserva-rapida' && (
          <ReservaRapidaView
            navigateTo={navigateTo}
            showToast={showToast}
            setActiveReservation={setActiveReservation}
            empresaLogada={empresaLogada}
            totalReservasPlano={totalReservasPlano}
            reservasUsadas={reservasUsadas}
            initialDraft={draftToResume?.origin === 'reserva-rapida' ? draftToResume : null}
            onConsumeDraft={() => setDraftToResume(null)}
          />
        )}

      </main>
      {/* O rodapé agora é embutido na própria HomeView */}

      {reservaParaGerenciar && (
        <GerenciarReservaModal
          reserva={reservaParaGerenciar}
          currentUserRole={currentUserRole}
          showToast={showToast}
          onClose={() => setReservaParaGerenciar(null)}
          onSave={(updatedRes) => {
            setRecentReservations(prev => prev.map(res => res.id === updatedRes.id ? updatedRes : res));
            if (activeReservation && activeReservation.id === updatedRes.id) {
              setActiveReservation(updatedRes);
            }
            setReservaParaGerenciar(null);
            showToast('Alterações salvas com sucesso!', 'success');
          }}
          onCancelReserva={(resId) => {
            setRecentReservations(prev => prev.map(res => {
              if (res.id === resId) {
                const novosLogs = [...(res.logs || [])];
                novosLogs.push({
                  time: new Date().toLocaleTimeString('pt-BR') + ' de ' + new Date().toLocaleDateString('pt-BR'),
                  text: 'Reserva cancelada pelo vendedor.'
                });
                return { ...res, status: 'Expired', logs: novosLogs };
              }
              return res;
            }));
            if (activeReservation && activeReservation.id === resId) {
              setActiveReservation(prev => prev ? { ...prev, status: 'Expired', logs: [...(prev.logs || []), {
                time: new Date().toLocaleTimeString('pt-BR') + ' de ' + new Date().toLocaleDateString('pt-BR'),
                text: 'Reserva cancelada pelo vendedor.'
              }] } : null);
            }
            setReservaParaGerenciar(null);
            showToast('Reserva cancelada (expirada).', 'info');
          }}
        />
      )}
    </div>
  );
}

// --- MODAL DE GERENCIAMENTO DE RESERVA (F5) ---
function GerenciarReservaModal({ reserva, onClose, onSave, onCancelReserva, currentUserRole = 'owner', showToast = (..._a: any[]) => {} }) {
  const [sinal, setSinal] = useState(String(reserva.sinal || 0));
  const [status, setStatus] = useState(reserva.status || 'Active');
  const [vendedor, setVendedor] = useState(reserva.vendedores || '');
  const [fotos, setFotos] = useState<string[]>(String(reserva.fotos || reserva.foto || '').split(',').map(s => s.trim()).filter(Boolean));
  const [showPhotoSelector, setShowPhotoSelector] = useState(false);
  const [customUrl, setCustomUrl] = useState('');
  const [uploadingFotos, setUploadingFotos] = useState(false);

  const addFoto = (url: string) => {
    if (!url) return;
    if (fotos.length >= 8) { showToast('Limite de 8 fotos atingido. Remova uma para adicionar outra.', 'info'); return; }
    setFotos(prev => [...prev, url]);
  };
  const removeFoto = (i: number) => setFotos(prev => prev.filter((_, idx) => idx !== i));
  const uploadFotosModal = async (fileList: FileList | null) => {
    const arquivos = Array.from(fileList || []);
    if (arquivos.length === 0) return;
    if (!isSupabaseConfigured) { showToast('Supabase não configurado.', 'error'); return; }
    const espaco = 8 - fotos.length;
    if (espaco <= 0) { showToast('Limite de 8 fotos atingido.', 'info'); return; }
    setUploadingFotos(true);
    try {
      const novas: string[] = [];
      for (const file of arquivos.slice(0, espaco)) {
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
        const path = `propostas/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error } = await supabase.storage.from('veiculos').upload(path, file, { contentType: file.type });
        if (error) throw error;
        novas.push(supabase.storage.from('veiculos').getPublicUrl(path).data.publicUrl);
      }
      setFotos(prev => [...prev, ...novas]);
      showToast(`${novas.length} foto(s) enviada(s)!`, 'success');
    } catch (e: any) { showToast('Erro no upload: ' + (e?.message || 'tente novamente'), 'error'); }
    finally { setUploadingFotos(false); }
  };

  const handleSave = () => {
    const novosLogs = [...(reserva.logs || [])];
    const originalSignal = Number(reserva.sinal || 0);
    const newSignal = Number(sinal);

    const signalToSave = currentUserRole === 'owner' ? newSignal : originalSignal;
    const sellerToSave = currentUserRole === 'owner' ? vendedor : reserva.vendedores;

    if (currentUserRole === 'owner' && newSignal !== originalSignal) {
      novosLogs.push({
        time: new Date().toLocaleTimeString('pt-BR') + ' de ' + new Date().toLocaleDateString('pt-BR'),
        text: `Valor do sinal alterado de R$ ${originalSignal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} para R$ ${newSignal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      });
    }

    if (currentUserRole === 'owner' && vendedor !== reserva.vendedores) {
      novosLogs.push({
        time: new Date().toLocaleTimeString('pt-BR') + ' de ' + new Date().toLocaleDateString('pt-BR'),
        text: `Atendente responsável alterado para: ${vendedor}`
      });
    }

    if (status !== reserva.status) {
      const statusMap: any = {
        'Active': 'Aguardando Sinal',
        'Completed': 'Sinal Pago via PIX',
        'Expired': 'Expirada / Cancelada'
      };
      novosLogs.push({
        time: new Date().toLocaleTimeString('pt-BR') + ' de ' + new Date().toLocaleDateString('pt-BR'),
        text: `Status alterado para: ${statusMap[status] || status} por ${currentUserRole === 'owner' ? 'Dono' : 'Vendedor'}`
      });
    }

    const fotosStr = fotos.join(',');
    const fotosOriginais = String(reserva.fotos || '').split(',').map(s => s.trim()).filter(Boolean);
    const fotosAdicionadas = fotos.length - fotosOriginais.length;
    if (fotosStr !== (reserva.fotos || '')) {
      novosLogs.push({
        time: new Date().toLocaleTimeString('pt-BR') + ' de ' + new Date().toLocaleDateString('pt-BR'),
        text: `Fotos do veículo atualizadas por ${currentUserRole === 'owner' ? 'Dono' : 'Vendedor'}`
      });
    }

    // Persiste no banco quando a proposta veio do Supabase (id é uuid)
    if (isSupabaseConfigured && reserva.id && String(reserva.id).includes('-')) {
      supabase.from('propostas').update({ fotos, sinal: signalToSave, status }).eq('id', reserva.id).then(() => {});
      // Evento de atividade (Realtime) quando fotos foram ADICIONADAS via gerenciamento.
      if (fotosAdicionadas > 0 && reserva.loja_id) {
        supabase.from('proposta_eventos').insert({
          loja_id: reserva.loja_id, proposta_id: reserva.id, tipo: 'foto',
          titulo: reserva.title,
          descricao: `${fotosAdicionadas} ${fotosAdicionadas === 1 ? 'foto adicionada' : 'fotos adicionadas'} a ${reserva.title} — galeria com ${fotos.length}.`,
          meta: { qtd: fotosAdicionadas, total: fotos.length },
        }).then(() => {}, () => {});
      }
    }

    onSave({
      ...reserva,
      sinal: signalToSave,
      status: status,
      vendedores: sellerToSave,
      fotos: fotosStr,
      foto: fotos[0] || '',
      logs: novosLogs
    });
  };

  const formatCurrencyLocal = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const historico = reserva.logs && reserva.logs.length > 0 ? reserva.logs : [
    { time: reserva.created || 'Hoje', text: `Proposta criada por ${reserva.vendedores ? reserva.vendedores.split(',')[0] : 'Consultor'}` },
    { time: reserva.created || 'Hoje', text: `Link de sinal ativado: ${formatCurrencyLocal(reserva.sinal || 1500)}` },
  ];

  return (
    <div className="fixed inset-0 bg-[#141414]/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-[#E5E5E2] rounded-3xl p-6 md:p-8 max-w-lg w-full text-left relative max-h-[90vh] overflow-y-auto">
        <button 
          onClick={onClose}
          aria-label="Fechar"
          className="absolute top-4 right-4 text-[#B9B9B4] hover:text-[#141414] transition"
        >
          <X size={20} />
        </button>

        <h3 className="text-xl font-bold text-[#141414] mb-1 tracking-tight">Gerenciar Reserva</h3>
        <p className="text-[#8A8A85] text-xs mb-6 font-medium uppercase tracking-wider border-b border-[#EBEBE8] pb-2">
          {reserva.title}
        </p>

        <div className="space-y-5">
          {/* Info do Lead */}
          <div className="grid grid-cols-2 gap-4 bg-[#F4F4F2] border border-[#EBEBE8] p-4 rounded-2xl text-xs">
            <div>
              <span className="block text-[9px] text-[#B9B9B4] font-bold uppercase tracking-wider mb-1">Lead Associado</span>
              <strong className="text-[#2A2A26] text-sm font-semibold">{reserva.clienteNome || 'Não informado'}</strong>
            </div>
            <div>
              <span className="block text-[9px] text-[#B9B9B4] font-bold uppercase tracking-wider mb-1">Criado em</span>
              <strong className="text-[#2A2A26] text-sm font-semibold">{reserva.created}</strong>
            </div>
          </div>

          {/* Galeria de Fotos */}
          <div className="space-y-3 bg-[#F4F4F2] border border-[#EBEBE8] p-4 rounded-2xl">
            <label className="block text-[10px] font-black text-[#8A8A85] uppercase tracking-wider">Galeria / Fotos do Veículo</label>

            {/* Fotos atuais */}
            {fotos.length > 0 ? (
              <div className="grid grid-cols-4 gap-2">
                {fotos.map((url, i) => (
                  <div key={i} className="relative aspect-[4/3] rounded-lg overflow-hidden border border-[#E5E5E2] bg-white">
                    <img src={url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                    <button type="button" onClick={() => removeFoto(i)} aria-label={`Remover foto ${i + 1}`} className="absolute top-1 right-1 bg-black/70 hover:bg-black p-1 rounded-full text-white transition">
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-[#B9B9B4] font-medium italic">Nenhuma foto ainda — envie ou escolha um preset.</p>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <label className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${uploadingFotos ? 'bg-[#C1F11D]/15 text-[#141414] cursor-wait' : 'text-[#5F5F5A] bg-white border border-[#E5E5E2] hover:bg-[#F4F4F2] cursor-pointer'}`}>
                <input type="file" accept="image/*" multiple className="hidden" disabled={uploadingFotos} onChange={(e) => { uploadFotosModal(e.target.files); e.currentTarget.value = ''; }} />
                {uploadingFotos ? <RefreshCw size={14} className="animate-spin" /> : <UploadCloud size={14} className="text-[#141414]" />}
                <span>{uploadingFotos ? 'Enviando...' : 'Enviar foto'}</span>
              </label>
              <button
                type="button"
                onClick={() => setShowPhotoSelector(!showPhotoSelector)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-[#5F5F5A] bg-white border border-[#E5E5E2] hover:bg-[#F4F4F2] transition"
              >
                <Camera size={14} className="text-[#141414] " /> Presets / URL
              </button>
            </div>

            {showPhotoSelector && (
              <div className="bg-white border border-[#E5E5E2] p-4 rounded-xl space-y-4 transition duration-150 mt-2">
                <span className="block text-[10px] font-black text-[#8A8A85] uppercase tracking-wider">Adicionar preset</span>
                <div className="grid grid-cols-4 gap-2">
                  {CAR_IMAGES.map((img) => (
                    <button
                      key={img.url}
                      type="button"
                      onClick={() => addFoto(img.url)}
                      className="relative aspect-[4/3] rounded-lg overflow-hidden border-2 border-transparent hover:border-[#141414] transition"
                    >
                      <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>

                <div className="border-t border-[#EBEBE8] pt-3 space-y-2">
                  <span className="block text-[10px] font-black text-[#8A8A85] uppercase tracking-wider">Adicionar por URL</span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="https://exemplo.com/foto.jpg"
                      value={customUrl}
                      onChange={(e) => setCustomUrl(e.target.value)}
                      className="flex-1 bg-white border border-[#E5E5E2] rounded-xl px-3 py-2.5 text-xs text-[#2A2A26] outline-none focus:border-[#141414]"
                    />
                    <button
                      type="button"
                      onClick={() => { if (customUrl.trim()) { addFoto(customUrl.trim()); setCustomUrl(''); } }}
                      className="px-4 py-2.5 bg-[#141414] hover:bg-[#2A2A26] text-white rounded-xl text-xs font-bold transition"
                    >
                      Ok
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Valor do Sinal */}
          <div>
            <label className="block text-[10px] font-semibold text-[#8A8A85] uppercase tracking-wider mb-2">Valor do Sinal (R$)</label>
            {currentUserRole === 'owner' ? (
              <input 
                type="text" 
                value={sinal}
                onChange={(e) => setSinal(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-[#F4F4F2] border border-[#E5E5E2] rounded-xl px-4 py-3 text-sm font-semibold text-[#2A2A26] outline-none focus:border-[#141414] transition"
              />
            ) : (
              <div className="w-full bg-[#F4F4F2] border border-[#EBEBE8] rounded-xl px-4 py-3 text-sm font-semibold text-[#8A8A85] select-none">
                {formatCurrencyLocal(Number(sinal))}
              </div>
            )}
          </div>

          {/* Vendedor */}
          <div>
            <label className="block text-[10px] font-semibold text-[#8A8A85] uppercase tracking-wider mb-2">Atendente Responsável</label>
            {currentUserRole === 'owner' ? (
              <input 
                type="text" 
                value={vendedor}
                onChange={(e) => setVendedor(e.target.value)}
                className="w-full bg-[#F4F4F2] border border-[#E5E5E2] rounded-xl px-4 py-3 text-sm font-semibold text-[#2A2A26] outline-none focus:border-[#141414] transition"
              />
            ) : (
              <div className="w-full bg-[#F4F4F2] border border-[#EBEBE8] rounded-xl px-4 py-3 text-sm font-semibold text-[#8A8A85] select-none">
                {vendedor}
              </div>
            )}
          </div>

          {/* Status */}
          <div>
            <label className="block text-[10px] font-semibold text-[#8A8A85] uppercase tracking-wider mb-2">Status da Reserva</label>
            <select 
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full bg-[#F4F4F2] border border-[#E5E5E2] rounded-xl px-4 py-3 text-sm font-semibold text-[#2A2A26] outline-none focus:border-[#141414] transition"
            >
              <option value="Active">Aguardando Sinal</option>
              <option value="Completed">PIX Recebido</option>
              <option value="Expired">Expirado</option>
            </select>
          </div>

          {/* Histórico fictício */}
          <div>
            <span className="block text-[10px] font-black text-[#8A8A85] uppercase tracking-wider mb-3">Histórico da Proposta</span>
            <div className="space-y-3 bg-[#F4F4F2] border border-[#E5E5E2] p-4 rounded-2xl max-h-36 overflow-y-auto">
              {historico.map((log, index) => (
                <div key={index} className="flex items-start gap-2.5 text-xs text-[#5F5F5A]">
                  <span className="text-[10px] text-[#B9B9B4] mt-0.5">{log.time}</span>
                  <p className="font-semibold">{log.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Compartilhar com o cliente */}
          <div className="space-y-2 bg-[#141414] p-4 rounded-2xl">
            <span className="block text-[10px] font-black text-[#C1F11D] uppercase tracking-wider">Link para o cliente</span>
            <p className="text-[11px] text-white/50 font-medium leading-relaxed">Um único link responsivo — abre no celular (WhatsApp) ou no PC, se adaptando à tela.</p>
            <div className="flex gap-2 pt-0.5">
              <button
                type="button"
                onClick={() => {
                  const link = `${window.location.origin}?p=${reserva.id}`;
                  if (navigator.clipboard) navigator.clipboard.writeText(link).then(() => showToast('Link copiado!', 'success')).catch(() => showToast(link, 'info'));
                  else showToast(link, 'info');
                }}
                className="flex-1 bg-white/10 hover:bg-white/15 text-white text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition"
              >
                <Copy size={13} /> Copiar link
              </button>
              <button
                type="button"
                onClick={() => {
                  const link = `${window.location.origin}?p=${reserva.id}`;
                  const msg = encodeURIComponent(`Olá! Segue a proposta do ${reserva.title}: ${link}`);
                  window.open(`https://wa.me/?text=${msg}`, '_blank');
                }}
                className="flex-1 bg-[#C1F11D] hover:brightness-105 text-[#141414] text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition"
              >
                <MessageCircle size={13} /> WhatsApp
              </button>
            </div>
          </div>
        </div>

        {/* Rodapé Ações */}
        <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-[#EBEBE8] mt-6 justify-between">
          {status === 'Active' ? (
            <button
              onClick={() => onCancelReserva(reserva.id)}
              className="bg-rose-50 border border-rose-250 text-rose-700 hover:bg-rose-100 font-bold py-3.5 px-5 rounded-xl text-xs transition"
            >
              Cancelar Reserva
            </button>
          ) : (
            <div />
          )}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="bg-white border border-[#E5E5E2] text-[#5F5F5A] font-bold py-3.5 px-5 rounded-xl text-xs hover:bg-[#F4F4F2] transition"
            >
              Descartar
            </button>
            <button
              onClick={handleSave}
              className="bg-[#141414] hover:bg-[#2A2A26] text-[#F4F4F2] font-bold py-3.5 px-5 rounded-xl text-xs transition"
            >
              Salvar Alterações
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- SIDEBAR ---
function Sidebar({ currentRoute, navigateTo, empresaLogada, isOpen, setIsOpen, reservasUsadas = 0, totalReservasPlano = 30, recentReservations = [], showToast, currentUserRole = 'owner', collapsed = false, visitasCount = 0 }) {
  const operacoesItems = [
    { id: 'sales-stats', label: 'Painel de loja', icon: BarChart2 },
    { id: 'dashboard', label: 'Reservas', icon: LinkIcon },
    { id: 'visitas', label: 'Agenda de Visitas', icon: CalendarClock },
    { id: 'reserva-rapida', label: 'Reserva Rápida', icon: Zap },
  ];

  const gestaoItems = [
    { id: 'vendedores', label: 'Vendedores', icon: Users },
    { id: 'relatorios', label: 'Relatórios', icon: FileText },
  ];

  const handleNavigate = (route) => {
    navigateTo(route);
    setIsOpen(false);
  };

  const activePlano = empresaLogada?.planoAtivo || empresaLogada?.plano || 'Plus';
  const linksDisponiveis = totalReservasPlano - reservasUsadas;

  const renderNavGroup = (title: string, items: any[], isCol: boolean) => (
    <div className={`space-y-1.5 pt-4 ${isCol ? 'px-2' : 'px-4'}`}>
      {!isCol && <span className="text-[10px] font-black text-[#B9B9B4] uppercase tracking-widest px-3 mb-2 block">{title}</span>}
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = currentRoute === item.id || (item.id === 'configuracoes' && currentRoute === 'checkout-plano');
        const badgeValue = item.id === 'sales-stats' ? recentReservations.length : item.id === 'visitas' ? visitasCount : 0;
        const showBadge = badgeValue > 0;

        return (
          <button
            key={item.id}
            onClick={() => handleNavigate(item.id)}
            title={isCol ? item.label : undefined}
            className={`w-full flex items-center rounded-xl text-sm font-semibold transition duration-150 ${isCol ? 'justify-center px-0 py-3' : 'justify-between px-4 py-3'} ${
              isActive
                ? 'bg-[#C1F11D]/20 text-[#141414] border border-[#C1F11D]/30'
                : 'text-[#6F6F6A] hover:text-[#141414] hover:bg-[#F4F4F2] border border-transparent'
            }`}
          >
            <div className={`flex items-center ${isCol ? 'relative' : 'gap-3'}`}>
              <Icon size={18} className={isActive ? 'text-[#141414]' : 'text-[#8A8A85]'} />
              {!isCol && <span>{item.label}</span>}
              {isCol && showBadge && (
                <span className="absolute -top-1.5 -right-2 w-4 h-4 bg-[#C1F11D] text-[#141414] text-[9px] font-bold rounded-full flex items-center justify-center">{badgeValue}</span>
              )}
            </div>
            {!isCol && showBadge && (
              <span className="w-5 h-5 bg-[#C1F11D] text-[#141414] text-[10px] font-bold rounded-full flex items-center justify-center shrink-0">
                {badgeValue}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );

  const renderContent = (isCol: boolean) => (
    <div className="h-full flex flex-col justify-between bg-white text-[#2A2A26]">
      <div>
        {/* Brand Header (altura alinhada à topbar = 64px) */}
        <div className={`h-16 flex items-center border-b border-[#E5E5E2] ${isCol ? 'justify-center px-2' : 'gap-2.5 px-6'}`}>
          <div className="w-9 h-9 bg-[#141414] rounded-xl flex items-center justify-center shrink-0">
            <Car size={20} className="text-white" />
          </div>
          {!isCol && (
            <span className="text-xl font-black tracking-tight text-[#141414]">Reservacar</span>
          )}
        </div>

        {/* Store Info */}
        <div className={`bg-[#F4F4F2]/50 ${isCol ? 'px-2 py-4' : 'px-6 py-5'}`}>
          {!isCol && (
            <>
              <p className="text-sm font-bold text-[#2A2A26] truncate">{empresaLogada?.nome || 'BMW Premium SP'}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="w-2 h-2 rounded-full bg-[#C1F11D]"></span>
                <span className="text-[11px] font-bold text-[#8A8A85] uppercase tracking-wide">
                  {currentUserRole === 'owner' ? `Plano ${activePlano}` : 'Consultor / Vendedor'}
                </span>
              </div>
            </>
          )}

          {/* Botão de Atalho Criar Reserva */}
          <button
            type="button"
            onClick={() => {
              if (reservasUsadas >= totalReservasPlano) {
                showToast('Limite de propostas atingido pelo seu plano. Faça upgrade nas configurações!', 'error');
                return;
              }
              handleNavigate('cadastrar-reserva');
            }}
            aria-disabled={reservasUsadas >= totalReservasPlano}
            title={isCol ? 'Criar Reserva' : undefined}
            className={`w-full flex items-center justify-center gap-1.5 rounded-xl text-xs font-bold transition duration-150 ${isCol ? 'py-2.5' : 'mt-3.5 px-4 py-2.5'} ${
              reservasUsadas >= totalReservasPlano
                ? 'bg-[#E5E5E2] text-[#B9B9B4] cursor-not-allowed border border-[#D9D9D5]'
                : 'bg-[#141414] hover:bg-[#2A2A26] text-[#F4F4F2]'
            }`}
          >
            <Plus size={14} className={reservasUsadas >= totalReservasPlano ? 'text-[#B9B9B4]' : 'text-[#C1F11D]'} />
            {!isCol && <span>Criar Reserva</span>}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-4">
          {renderNavGroup('Operações', operacoesItems, isCol)}
          {currentUserRole === 'owner' && renderNavGroup('Gestão', gestaoItems, isCol)}
        </nav>
      </div>

      {/* Widget de Uso de Créditos */}
      {!isCol && (
        <div className="px-6 py-5 border-t border-[#E5E5E2] bg-[#F4F4F2]/50 text-left mt-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-black text-[#8A8A85] uppercase tracking-wider">Uso do Plano</span>
            <span className="text-[11px] font-black text-[#141414]">{reservasUsadas}/{totalReservasPlano}</span>
          </div>
          <div className="w-full bg-[#EBEBE8] h-2 rounded-full overflow-hidden">
            <div className="bg-[#141414] h-full rounded-full transition-[width] duration-[800ms] ease-out-expo" style={{ width: `${Math.min(100, Math.max(0, (reservasUsadas / totalReservasPlano) * 100))}%` }}></div>
          </div>
          <p className="text-xs text-[#6F6F6A] mt-2 font-semibold flex items-center gap-1.5">
            <LinkIcon size={13} className="text-[#B9B9B4] shrink-0" />
            {Math.max(0, linksDisponiveis)} {Math.max(0, linksDisponiveis) === 1 ? 'link disponível' : 'links disponíveis'}
          </p>
          {currentUserRole === 'owner' && (
            <button onClick={() => handleNavigate('plano')} className="w-full mt-3.5 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold text-[#141414] bg-[#C1F11D]/20 hover:bg-[#C1F11D]/35 transition duration-150 cursor-pointer">
              <ArrowUp size={14} className="stroke-[2.5px]" />
              <span>Fazer Upgrade de Plano</span>
            </button>
          )}
        </div>
      )}

      {/* Suporte e Configurações — sem fundo próprio: herda o da sidebar (igual aos
          itens de navegação). No tema claro era branco-sobre-branco (invisível); no
          tema black o bg-white virava uma camada de vidro extra = faixa cinza. */}
      <div className={`pt-3 pb-1 space-y-1 text-left ${isCol ? 'px-2' : 'px-4'}`}>
        <button
          onClick={() => showToast('Suporte Reservacar: Entre em contato pelo e-mail suporte@reservacar.com.br ou WhatsApp!', 'info')}
          title={isCol ? 'Suporte' : undefined}
          className={`w-full flex items-center rounded-xl text-sm font-semibold text-[#6F6F6A] hover:text-[#141414] hover:bg-[#F4F4F2] transition duration-150 cursor-pointer ${isCol ? 'justify-center py-3' : 'gap-3 px-4 py-3'}`}
        >
          <HelpCircle size={18} className="text-[#8A8A85]" />
          {!isCol && <span>Suporte</span>}
        </button>

        {currentUserRole === 'owner' && (
          <button
            onClick={() => handleNavigate('configuracoes')}
            title={isCol ? 'Configurações' : undefined}
            className={`w-full flex items-center rounded-xl text-sm font-semibold transition duration-150 cursor-pointer ${isCol ? 'justify-center py-3' : 'gap-3 px-4 py-3'} ${
              currentRoute === 'configuracoes' || currentRoute === 'plano' || currentRoute === 'checkout-plano'
                ? 'bg-[#C1F11D]/20 text-[#141414] border border-[#C1F11D]/30'
                : 'text-[#6F6F6A] hover:text-[#141414] hover:bg-[#F4F4F2] border border-transparent'
            }`}
          >
            <Settings size={18} className={currentRoute === 'configuracoes' || currentRoute === 'plano' || currentRoute === 'checkout-plano' ? 'text-[#141414]' : 'text-[#8A8A85]'} />
            {!isCol && <span>Configurações</span>}
          </button>
        )}
      </div>

      {/* Footer Section */}
      <div className={`pt-2 pb-4 border-t border-[#E5E5E2] bg-[#F4F4F2]/30 ${isCol ? 'px-2' : 'px-4'}`}>
        <button
          onClick={() => { supabase.auth.signOut().catch(() => {}); handleNavigate('home'); }}
          title={isCol ? 'Sair da Loja' : undefined}
          className={`w-full flex items-center rounded-xl text-sm font-bold text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition duration-150 ${isCol ? 'justify-center py-3' : 'gap-3 px-4 py-3'}`}
        >
          <LogOut size={18} />
          {!isCol && <span>Sair da Loja</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (Permanent) */}
      <aside className={`hidden lg:block fixed top-0 bottom-0 left-0 bg-white border-r border-[#E5E5E2] z-30 transition-all duration-300 ${collapsed ? 'w-[72px]' : 'w-64'}`}>
        {renderContent(collapsed)}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-[#141414]/40 backdrop-blur-sm transition-opacity duration-300" onClick={() => setIsOpen(false)}></div>
          <div className="drawer-panel-solid relative flex-1 flex flex-col max-w-xs w-full bg-white z-50 h-full">
            <div className="absolute top-4 right-4 z-10">
              <button onClick={() => setIsOpen(false)} aria-label="Fechar menu" className="p-2 rounded-xl text-[#8A8A85] hover:text-[#2A2A26] hover:bg-[#EBEBE8] transition">
                <X size={20} />
              </button>
            </div>
            {renderContent(false)}
          </div>
        </div>
      )}
    </>
  );
}

// --- CONFIGURAÇÕES HUB (área com abas estilo Workspace Settings) ---
const CONFIG_TABS = [
  { id: 'configuracoes', label: 'Geral' },
  { id: 'vendedores', label: 'Vendedores' },
  { id: 'plano', label: 'Plano' },
  { id: 'relatorios', label: 'Relatórios' },
  { id: 'logs', label: 'Logs' },
];
function ConfiguracoesHub({ currentRoute, navigateTo, empresaLogada, children }) {
  const slug = (empresaLogada?.nome || 'bmw-premium').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  return (
    <div className="pt-8 pb-20 px-6 md:px-12 max-w-[1600px] mx-auto text-left">
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold text-[#141414] tracking-tight">Configurações</h1>
        <p className="text-[#8A8A85] text-sm mt-1 font-medium">{empresaLogada?.nome || 'BMW Premium SP'} · reservacar.app/{slug}</p>
      </div>
      <div className="flex items-center gap-7 border-b border-[#E5E5E2] mb-8 overflow-x-auto">
        {CONFIG_TABS.map(t => {
          const active = currentRoute === t.id || (t.id === 'plano' && currentRoute === 'checkout-plano');
          return (
            <button key={t.id} onClick={() => navigateTo(t.id)}
              className={`relative pb-3 text-sm font-bold transition cursor-pointer whitespace-nowrap ${active ? 'text-[#141414]' : 'text-[#8A8A85] hover:text-[#141414]'}`}>
              {t.label}
              {active && <span className="absolute -bottom-px left-0 w-full h-0.5 bg-[#C1F11D] rounded-full"></span>}
            </button>
          );
        })}
      </div>
      {children}
    </div>
  );
}

// --- MINI SPARKLINE (KPI cards estilo Meridian) ---
function MiniSpark({ trend = 'up' }: { trend?: 'up' | 'down' }) {
  const up = 'M0 27 L14 23 L28 25 L42 17 L56 19 L70 11 L84 13 L100 5';
  const down = 'M0 7 L14 9 L28 8 L42 14 L56 12 L70 18 L84 21 L100 27';
  const d = trend === 'down' ? down : up;
  // Cor via currentColor + classe de texto: assim o tema black remapeia a linha
  // (text-[#141414] -> claro) e ela não some no card escuro. O rose é acento fixo.
  const colorClass = trend === 'down' ? 'text-[#E11D48]' : 'text-[#141414]';
  return (
    <svg viewBox="0 0 100 32" preserveAspectRatio="none" className={`w-full h-8 mt-3 -mb-1 ${colorClass}`}>
      <path d={`${d} L100 32 L0 32 Z`} fill="currentColor" fillOpacity="0.06" />
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// --- TOPBAR GLOBAL (app do lojista, estilo Meridian) ---
const ROUTE_LABELS: any = {
  hub: 'Painel de loja', 'sales-stats': 'Painel de loja', dashboard: 'Reservas',
  visitas: 'Agenda de Visitas',
  vendedores: 'Vendedores', relatorios: 'Relatórios', logs: 'Logs', configuracoes: 'Configurações',
  plano: 'Configurações', 'checkout-plano': 'Configurações', 'cadastrar-reserva': 'Nova proposta',
};

function Topbar({ currentRoute, navigateTo, empresaLogada, liveNotifications = [], recentReservations = [], collapsed, setCollapsed, showToast, setActiveReservation }) {
  const [query, setQuery] = useState('');
  const [openMenu, setOpenMenu] = useState<null | 'notif' | 'avatar' | 'search'>(null);
  const refreshedAt = useMemo(() => new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), []);

  const iniciais = (empresaLogada?.nome || 'BMW Premium SP').split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase();

  const resultados = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return { propostas: [], vendedores: [] };
    const propostas = recentReservations.filter((r: any) =>
      [r.title, r.clienteNome, r.vendedores].filter(Boolean).some((s: string) => s.toLowerCase().includes(q))
    ).slice(0, 5);
    const vendedores = (empresaLogada?.vendedores || []).filter((v: any) => v.nome.toLowerCase().includes(q)).slice(0, 4);
    return { propostas, vendedores };
  }, [query, recentReservations, empresaLogada]);

  const fechar = () => setOpenMenu(null);

  return (
    <header
      className="hidden lg:flex fixed top-0 right-0 h-16 bg-white border-b border-[#EBEBE8] z-40 items-center justify-between px-5 gap-4 transition-all duration-300"
      style={{ left: collapsed ? 72 : 256 }}
    >
      {/* Esquerda: toggle + breadcrumb */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Expandir menu' : 'Recolher menu'}
          className="p-2 rounded-lg text-[#8A8A85] hover:text-[#141414] hover:bg-[#F4F4F2] transition cursor-pointer"
        >
          <PanelsTopLeft size={18} />
        </button>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-[#8A8A85] font-semibold">{empresaLogada?.nome || 'BMW Premium SP'}</span>
          <span className="text-[#D9D9D5]">/</span>
          <span className="text-[#141414] font-bold">{ROUTE_LABELS[currentRoute] || 'Painel'}</span>
        </div>
      </div>

      {/* Centro: busca */}
      <div className="flex-1 max-w-md relative">
        <div className="flex items-center gap-2 bg-[#F4F4F2] rounded-full px-4 h-10 border border-transparent focus-within:border-[#D9D9D5] transition">
          <Search size={15} className="text-[#8A8A85] shrink-0" />
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpenMenu(e.target.value ? 'search' : null); }}
            onFocus={() => query && setOpenMenu('search')}
            placeholder="Buscar propostas, vendedores..."
            className="flex-1 bg-transparent text-sm font-medium text-[#141414] outline-none placeholder:text-[#B9B9B4]"
          />
          <span className="text-[10px] font-bold text-[#B9B9B4] bg-white border border-[#E5E5E2] rounded px-1.5 py-0.5 shrink-0">⌘K</span>
        </div>

        {openMenu === 'search' && query && (
          <div className="absolute top-12 left-0 w-full bg-white border border-[#E5E5E2] rounded-2xl shadow-xl p-2 z-50 max-h-80 overflow-y-auto">
            {resultados.propostas.length === 0 && resultados.vendedores.length === 0 && (
              <p className="text-xs text-[#8A8A85] font-medium px-3 py-3">Nenhum resultado para "{query}".</p>
            )}
            {resultados.propostas.length > 0 && (
              <div className="mb-1">
                <span className="text-[10px] font-black text-[#B9B9B4] uppercase tracking-widest px-3 py-1.5 block">Propostas</span>
                {resultados.propostas.map((r: any) => (
                  <button key={r.id} onClick={() => { setActiveReservation && setActiveReservation(r); navigateTo('preview'); setQuery(''); fechar(); }}
                    className="w-full text-left flex items-center justify-between gap-3 px-3 py-2 rounded-xl hover:bg-[#F4F4F2] transition cursor-pointer">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[#141414] truncate">{r.title}</p>
                      <p className="text-[11px] text-[#8A8A85] font-medium truncate">{r.vendedores} · {r.clienteNome || 'Sem cliente'}</p>
                    </div>
                    <span className="text-xs font-bold text-[#141414] shrink-0">{formatCurrency(r.sinal || 0)}</span>
                  </button>
                ))}
              </div>
            )}
            {resultados.vendedores.length > 0 && (
              <div>
                <span className="text-[10px] font-black text-[#B9B9B4] uppercase tracking-widest px-3 py-1.5 block">Vendedores</span>
                {resultados.vendedores.map((v: any) => (
                  <button key={v.id} onClick={() => { navigateTo('vendedores'); setQuery(''); fechar(); }}
                    className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-[#F4F4F2] transition cursor-pointer">
                    <span className="w-7 h-7 rounded-full bg-[#141414] text-white text-[10px] font-bold flex items-center justify-center shrink-0">{v.nome.split(' ').map((s: string) => s[0]).slice(0, 2).join('')}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[#141414] truncate">{v.nome}</p>
                      <p className="text-[11px] text-[#8A8A85] font-medium truncate">{v.cargo}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Direita: refreshed + notif + avatar */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="hidden xl:flex items-center gap-2 text-xs font-semibold text-[#8A8A85] mr-1">
          <span>Atualizado {refreshedAt}</span>
          <RefreshCw size={13} className="text-[#B9B9B4]" />
        </div>

        {/* Notificações */}
        <div className="relative">
          <button onClick={() => setOpenMenu(openMenu === 'notif' ? null : 'notif')}
            className="relative p-2 rounded-lg text-[#8A8A85] hover:text-[#141414] hover:bg-[#F4F4F2] transition cursor-pointer">
            <Bell size={18} />
            {liveNotifications.length > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">{liveNotifications.length}</span>
            )}
          </button>
          {openMenu === 'notif' && (
            <div className="absolute top-12 right-0 w-80 bg-white border border-[#E5E5E2] rounded-2xl shadow-xl p-2 z-50">
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-sm font-extrabold text-[#141414]">Atividade</span>
                <span className="text-[10px] font-bold text-[#8A8A85] uppercase tracking-wider">últimas 72h</span>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {liveNotifications.map((n: any) => (
                  <div key={n.id} className="flex gap-2.5 px-3 py-2.5 rounded-xl hover:bg-[#F4F4F2] transition">
                    <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${n.type === 'urgente' ? 'bg-amber-500' : n.type === 'pix' ? 'bg-[#1E9E5A]' : 'bg-[#141414]'}`}></span>
                    <div className="min-w-0">
                      <p className="text-[11px] font-black text-[#8A8A85] uppercase tracking-wide">{n.label}</p>
                      <p className="text-xs font-semibold text-[#2A2A26] leading-snug mt-0.5">{n.text}</p>
                      <p className="text-[10px] text-[#B9B9B4] font-medium mt-0.5">{n.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Avatar */}
        <div className="relative">
          <button onClick={() => setOpenMenu(openMenu === 'avatar' ? null : 'avatar')}
            className="flex items-center gap-1.5 cursor-pointer">
            <span className="w-9 h-9 rounded-full bg-[#141414] text-white text-xs font-black flex items-center justify-center">{iniciais}</span>
            <ChevronDown size={14} className="text-[#8A8A85]" />
          </button>
          {openMenu === 'avatar' && (
            <div className="absolute top-12 right-0 w-56 bg-white border border-[#E5E5E2] rounded-2xl shadow-xl p-2 z-50">
              <div className="px-3 py-2 border-b border-[#EBEBE8] mb-1">
                <p className="text-sm font-extrabold text-[#141414] truncate">{empresaLogada?.nome || 'BMW Premium SP'}</p>
                <p className="text-[11px] text-[#8A8A85] font-medium truncate">{empresaLogada?.email || 'contato@loja.com'}</p>
              </div>
              <button onClick={() => { navigateTo('configuracoes'); fechar(); }} className="w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold text-[#2A2A26] hover:bg-[#F4F4F2] transition cursor-pointer"><Settings size={16} className="text-[#8A8A85]" /> Configurações</button>
              <button onClick={() => { showToast('Suporte Reservacar: suporte@reservacar.com.br', 'info'); fechar(); }} className="w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold text-[#2A2A26] hover:bg-[#F4F4F2] transition cursor-pointer"><HelpCircle size={16} className="text-[#8A8A85]" /> Suporte</button>
              <button onClick={() => { supabase.auth.signOut().catch(() => {}); navigateTo('home'); fechar(); }} className="w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-bold text-rose-600 hover:bg-rose-50 transition cursor-pointer"><LogOut size={16} /> Sair da Loja</button>
            </div>
          )}
        </div>
      </div>

      {/* Backdrop para fechar dropdowns */}
      {openMenu && <div className="fixed inset-0 z-40" onClick={fechar}></div>}
    </header>
  );
}

// --- NAVBAR ---
function Navbar({ currentRoute, navigateTo }) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isTransparent = currentRoute === 'home' && !isScrolled;

  return (
    <nav className={`fixed w-full z-50 transition-all duration-300 ${
      isTransparent 
        ? 'bg-transparent border-b border-transparent' 
        : 'bg-white/95 backdrop-blur-md border-b border-[#E5E5E2]'
    }`}>
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <div className="flex items-center cursor-pointer gap-3" onClick={() => navigateTo('home')}>
            <div className="w-10 h-10 bg-[#141414] rounded-xl flex items-center justify-center">
              <Car size={22} className="text-white" />
            </div>
            <span className={`text-2xl font-black tracking-tight transition-colors duration-300 ${
              isTransparent ? 'text-white' : 'text-[#141414]'
            }`}>
              Reservacar
            </span>
          </div>
          
          <div className="flex space-x-6 items-center">
            {currentRoute === 'home' && (
              <>
                <button 
                  onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className={`text-sm font-semibold transition py-2 ${
                    isTransparent ? 'text-white/85 hover:text-white' : 'text-[#6F6F6A] hover:text-[#141414]'
                  }`}
                >
                  Pagina Inicial
                </button>
                <a 
                  href="#sobre"
                  className={`text-sm font-semibold transition py-2 ${
                    isTransparent ? 'text-white/85 hover:text-white' : 'text-[#6F6F6A] hover:text-[#141414]'
                  }`}
                >
                  Sobre nos
                </a>
                <a 
                  href="#precos"
                  className={`text-sm font-semibold transition py-2 ${
                    isTransparent ? 'text-white/85 hover:text-white' : 'text-[#6F6F6A] hover:text-[#141414]'
                  }`}
                >
                  Precos
                </a>
                <button 
                  onClick={() => navigateTo('assinar')}
                  className={`text-sm font-semibold transition py-2 ${
                    isTransparent ? 'text-white/85 hover:text-white' : 'text-[#6F6F6A] hover:text-[#141414]'
                  }`}
                >
                  Assinar
                </button>
                <a 
                  href="#contato"
                  className={`text-sm font-semibold transition py-2 ${
                    isTransparent ? 'text-white/85 hover:text-white' : 'text-[#6F6F6A] hover:text-[#141414]'
                  }`}
                >
                  Contato
                </a>
                <button 
                  onClick={() => navigateTo('login')}
                  className="flex items-center space-x-2 bg-[#141414] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#2A2A26] transition"
                >
                  <LogIn size={16} />
                  <span>Acesso Lojista</span>
                </button>
              </>
            )}
            {['hub', 'sales-stats', 'dashboard', 'assinar', 'configuracoes', 'checkout-plano', 'cadastrar-reserva'].includes(currentRoute) && (
              <>
                {!['cadastrar-reserva', 'assinar'].includes(currentRoute) && (
                  <>
                    <button
                      onClick={() => navigateTo('configuracoes')}
                      className={`p-2.5 rounded-xl transition flex items-center justify-center mr-2 border ${
                        currentRoute === 'configuracoes'
                          ? 'bg-[#C1F11D]/20 text-[#141414] border-[#C1F11D]/30'
                          : 'text-[#8A8A85] hover:text-[#141414] hover:bg-[#F4F4F2] border-transparent'
                      }`}
                      title="Configurações"
                    >
                      <Settings size={18} />
                    </button>
                    <button
                      onClick={() => navigateTo('sales-stats')}
                      className={`text-sm font-semibold transition mr-4 py-2 ${
                        currentRoute === 'hub' ? 'text-[#141414] font-bold' : 'text-[#6F6F6A] hover:text-[#141414]'
                      }`}
                    >
                      Painel Principal
                    </button>
                  </>
                )}
                <button
                  onClick={() => navigateTo('home')}
                  className="text-sm font-semibold bg-white hover:bg-[#F4F4F2] px-5 py-2.5 rounded-xl text-[#2A2A26] transition border border-[#E5E5E2]"
                >
                  Sair
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

// --- NUMBER TICKER ---
function NumberTicker({ value, className = "" }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) {
      setDisplayValue(value);
      return;
    }

    const end = value;
    const duration = 2000;
    const startTime = performance.now();

    const animate = (currentTime) => {
      const elapsedTime = currentTime - startTime;
      const progress = Math.min(elapsedTime / duration, 1);
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = Math.floor(easeProgress * end);
      
      setDisplayValue(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value]);

  const formatted = displayValue.toLocaleString('pt-BR');

  return <span className={className}>+{formatted}</span>;
}

// --- PRICING LANDING HERO ---
function PricingLandingHero({
  title,
  description,
  phone,
  price,
  availability,
  primaryAction,
  secondaryAction,
  trustedBy
}) {
  return (
    <div className="relative w-full bg-black border-b border-white/10 pt-28 lg:pt-36 pb-20 overflow-hidden text-center flex flex-col items-center">
      {/* Estilos locais para carrossel de logos e marquee de toasts */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scrollUp {
          0% { transform: translateY(0); }
          100% { transform: translateY(-50%); }
        }
        .animate-scroll-up {
          display: flex;
          flex-direction: column;
          gap: 12px;
          animation: scrollUp 18s linear infinite;
        }
        .animate-scroll-up:hover {
          animation-play-state: paused;
        }
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          display: flex;
          width: max-content;
          animation: marquee 25s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}} />
      
      <div className="max-w-4xl mx-auto px-6 w-full flex flex-col items-center">
        
        {/* Mockup do Celular centralizado no topo */}
        <div className="relative w-[280px] h-[230px] bg-black rounded-t-[40px] border-t-[8px] border-x-[8px] border-[#141414] shadow-2xl overflow-hidden mb-12 select-none flex flex-col">
          {/* Notch superior do iPhone */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-4 bg-[#141414] rounded-b-2xl z-30 flex items-center justify-center">
            <div className="w-2 h-2 bg-[#141414] rounded-full mr-1.5" />
            <div className="w-5 h-0.5 bg-[#141414] rounded-full" />
          </div>

          {/* Tela Interna */}
          <div className="relative flex-1 flex flex-col pt-7 px-3 bg-black">
            {/* Barra de Status */}
            <div className="flex justify-between items-center text-[8px] font-bold text-[#8A8A85] px-1 mb-4 z-20">
              <span>{phone?.time || "9:41"}</span>
              <div className="flex items-center gap-1">
                <Smartphone size={8} className="text-[#8A8A85]" />
                <span className="w-3 h-1.5 border border-[#8A8A85] rounded-sm bg-[#8A8A85]" />
              </div>
            </div>

            {/* Pista do Carrossel Vertical com máscara de fade */}
            <div className="relative flex-1 overflow-hidden pb-4">
              {/* Fade inferior da tela do celular */}
              <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black via-black/80 to-transparent z-10 pointer-events-none" />

              {/* Lista Animada de Carros Reservados (Push) subindo continuamente */}
              <div className="flex flex-col gap-3 animate-scroll-up">
                {/* Primeira metade */}
                {phone?.items && phone.items.map((item, index) => (
                  <div
                    key={`phone-orig-${item.id || index}`}
                    className="bg-[#0c0c0e] border border-white/5 p-3 rounded-2xl flex items-center justify-between text-left text-white w-full shadow-lg shrink-0"
                  >
                    <div className="flex items-center gap-2.5">
                      <div 
                        className="w-7 h-7 text-white rounded-full flex items-center justify-center shrink-0"
                        style={{ backgroundColor: item.color || "#8B5CF6" }}
                      >
                        <CircleDollarSign size={14} className="text-white" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-white block leading-tight">{item.name || "Veiculo Reservado"}</span>
                        <span className="text-[8px] text-[#B9B9B4] block mt-0.5">{item.time}</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-black text-white tracking-tight">{item.price}</span>
                  </div>
                ))}
                {/* Segunda metade duplicada */}
                {phone?.items && phone.items.map((item, index) => (
                  <div
                    key={`phone-dup-${item.id || index}`}
                    className="bg-[#0c0c0e] border border-white/5 p-3 rounded-2xl flex items-center justify-between text-left text-white w-full shadow-lg shrink-0"
                  >
                    <div className="flex items-center gap-2.5">
                      <div 
                        className="w-7 h-7 text-white rounded-full flex items-center justify-center shrink-0"
                        style={{ backgroundColor: item.color || "#8B5CF6" }}
                      >
                        <CircleDollarSign size={14} className="text-white" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-white block leading-tight">{item.name || "Veiculo Reservado"}</span>
                        <span className="text-[8px] text-[#B9B9B4] block mt-0.5">{item.time}</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-black text-white tracking-tight">{item.price}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Textos, Preços e Ações */}
        <h1 className="text-4xl md:text-5xl lg:text-[56px] font-extrabold leading-[1.1] text-white tracking-tighter mb-4 max-w-2xl">
          {title}
        </h1>
        
        <p className="text-sm md:text-base font-medium text-[#B9B9B4] mb-8 leading-relaxed max-w-xl">
          {description}
        </p>

        {/* Preço e Escassez */}
        {price && (
          <div className="flex flex-col items-center gap-1 mb-2">
            <div className="flex items-baseline gap-2.5">
              <span className="text-3xl md:text-4xl font-black text-white tracking-tight">{price.current}</span>
              <span className="text-sm font-medium text-[#8A8A85] line-through">{price.original}</span>
            </div>
          </div>
        )}

        {availability && (
          <div className="text-[10px] font-bold tracking-wider text-[#8A8A85] uppercase mb-8">
            {availability}
          </div>
        )}

        {/* Botões CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto">
          {primaryAction && (
            <button 
              onClick={primaryAction.onClick}
              className="w-full sm:w-auto bg-white text-black hover:bg-[#EBEBE8] px-8 py-3.5 rounded-full text-xs font-bold transition duration-250 border border-transparent shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            >
              {primaryAction.label}
            </button>
          )}
          {secondaryAction && (
            <button 
              onClick={secondaryAction.onClick}
              className="w-full sm:w-auto bg-transparent text-white hover:bg-white/5 px-8 py-3.5 rounded-full text-xs font-bold transition duration-250 border border-white/20 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9D9D5] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            >
              {secondaryAction.label}
            </button>
          )}
        </div>

        {/* Trusted By */}
        {trustedBy && (
          <div className="mt-16 w-full">
            <h4 className="text-[10px] font-black uppercase tracking-[0.25em] text-[#8A8A85] mb-6 block text-center">
              {trustedBy.heading}
            </h4>
            
            {/* Contêiner do Carrossel com máscara de fade nas laterais */}
            <div className="relative w-full overflow-hidden py-4 select-none">
              {/* Fade Esquerdo */}
              <div className="absolute left-0 top-0 bottom-0 w-20 md:w-32 bg-gradient-to-r from-black via-black/85 to-transparent z-10 pointer-events-none" />
              {/* Fade Direito */}
              <div className="absolute right-0 top-0 bottom-0 w-20 md:w-32 bg-gradient-to-l from-black via-black/85 to-transparent z-10 pointer-events-none" />
              
              {/* Pista do Carrossel (itens duplicados para loop contínuo) */}
              <div className="flex gap-16 md:gap-24 items-center animate-marquee whitespace-nowrap">
                {/* Primeira metade */}
                {trustedBy.logos.map((logo, idx) => (
                  <div key={`orig-${idx}`} className="text-[#8A8A85] hover:text-white transition duration-200 opacity-60 hover:opacity-100 shrink-0">
                    {logo}
                  </div>
                ))}
                {/* Segunda metade duplicada */}
                {trustedBy.logos.map((logo, idx) => (
                  <div key={`dup-${idx}`} className="text-[#8A8A85] hover:text-white transition duration-200 opacity-60 hover:opacity-100 shrink-0">
                    {logo}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function HomeView({ navigateTo }) {
  const [profile, setProfile] = useState('lojista'); // 'lojista' ou 'cliente'
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isServicesOpen, setIsServicesOpen] = useState(false);
  const isHeaderActive = isScrolled || isServicesOpen;

  const servicesTimeoutRef = useRef<any>(null);

  const handleServicesEnter = () => {
    if (servicesTimeoutRef.current) {
      clearTimeout(servicesTimeoutRef.current);
    }
    setIsServicesOpen(true);
  };

  const handleServicesLeave = () => {
    servicesTimeoutRef.current = setTimeout(() => {
      setIsServicesOpen(false);
    }, 250);
  };
  
  // Simulador de Economia
  const [carPrice, setCarPrice] = useState(120000); // R$ 120.000
  const [reservasMes, setReservasMes] = useState(10); // 10 reservas/mês
  const [payoutMethod, setPayoutMethod] = useState('pix_direto'); // pix_direto vs gateway
  
  // Estados para as push notifications animadas
  const [activePushIndex, setActivePushIndex] = useState(0);
  const [isPushVisible, setIsPushVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsPushVisible(false);
      setTimeout(() => {
        setActivePushIndex((prev) => (prev + 1) % 3);
        setIsPushVisible(true);
      }, 500);
    }, 4500);
    return () => clearInterval(interval);
  }, []);
  
  // Gerador de Fatura/Proposta Interativo
  const [invoiceCarName, setInvoiceCarName] = useState('BMW 320i M Sport 2024');
  const [invoiceSinal, setInvoiceSinal] = useState(5000);
  const [invoiceCurrency, setInvoiceCurrency] = useState('BRL');
  const [invoiceSendStatus, setInvoiceSendStatus] = useState('enviar'); // 'enviar', 'enviando', 'enviado'

  // FAQ
  const [activeFaq, setActiveFaq] = useState(null);

  // Contador de métricas
  const [bilhoes, setBilhoes] = useState(0);
  const [clientes, setClientes] = useState(0);
  const [aprovacao, setAprovacao] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 40) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    // Animação simples dos contadores ao carregar
    const duration = 1500;
    const steps = 30;
    const intervalTime = duration / steps;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      setBilhoes(Math.min((2.4 / steps) * step, 2.4));
      setClientes(Math.min(Math.floor((15 / steps) * step), 15));
      setAprovacao(Math.min(Math.floor((99.8 / steps) * step), 99.8));

      if (step >= steps) {
        clearInterval(timer);
      }
    }, intervalTime);

    return () => clearInterval(timer);
  }, []);

  // Lógica do Simulador
  const calculations = useMemo(() => {
    const volumeReservasTotal = carPrice * reservasMes; // volume financeiro de vendas simuladas
    
    // Com Reservacar: Assinatura fixa mensal de R$ 159 (taxa zero sobre Pix recebido)
    const custoReservacar = 159; 
    const valorRecebidoReservacar = volumeReservasTotal - custoReservacar;

    // Com Gateway Tradicional ou Intermediários de mercado (Média de 3% sobre transações de sinal Pix)
    // Média de sinal Pix exigido é 2.5% do carro
    const valorMedioSinal = carPrice * 0.025; 
    const totalSinalMes = valorMedioSinal * reservasMes;
    const taxaGateway = 0.0299; // 2.99% no Pix do gateway
    const custoGateway = totalSinalMes * taxaGateway;
    const valorRecebidoGateway = totalSinalMes - custoGateway;

    const economia = custoGateway - custoReservacar;

    return {
      volumeReservasTotal,
      totalSinalMes,
      custoReservacar,
      valorRecebidoReservacar,
      custoGateway,
      valorRecebidoGateway,
      economia: economia > 0 ? economia : 0
    };
  }, [carPrice, reservasMes]);

  const simulateInvoiceSend = () => {
    setInvoiceSendStatus('enviando');
    setTimeout(() => {
      setInvoiceSendStatus('enviado');
      setTimeout(() => {
        setInvoiceSendStatus('enviar');
      }, 3000);
    }, 1000);
  };

  const talentDashboard = (
    <>
      {/* Coluna 1: Balanço */}
      <div className="bg-white/5 p-5 rounded-xl border border-white/5 space-y-4">
        <span className="text-[11px] text-white/50 font-bold uppercase tracking-wider block">Sinais Pix Recebidos</span>
        <div className="space-y-1">
          <p className="text-3xl font-extrabold text-white">R$ 14.250,00</p>
          <p className="text-xs text-[#C1F11D] font-bold flex items-center gap-1">
            <TrendingUp size={14} /> +12% em relação ao mês anterior
          </p>
        </div>
        <div className="pt-2">
          <button 
            onClick={() => navigateTo('login')}
            className="w-full bg-[#C1F11D] text-[#141414] py-2 rounded-lg text-xs font-bold hover:bg-white transition-colors flex items-center justify-center gap-1"
          >
            <Send size={14} /> Acessar Painel Lojista
          </button>
        </div>
      </div>
      {/* Coluna 2: Faturas Ativas */}
      <div className="bg-white/5 p-5 rounded-xl border border-white/5 space-y-4 md:col-span-2">
        <div className="flex justify-between items-center">
          <span className="text-[11px] text-white/50 font-bold uppercase tracking-wider">Links de Reservas Recentes</span>
          <span className="text-[10px] text-[#C1F11D] bg-[#C1F11D]/10 px-2.5 py-0.5 rounded-full font-bold">Ativas</span>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg border border-white/5 hover:border-white/10 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-bold text-xs">BMW</div>
              <div>
                <p className="text-xs font-bold text-white">BMW 320i M Sport 2024</p>
                <p className="text-[10px] text-white/40">Sinal: R$ 5.000,00</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-white">R$ 269.000</p>
              <span className="text-[9px] text-[#C1F11D] font-bold">Reservado</span>
            </div>
          </div>
          <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg border border-white/5 hover:border-white/10 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-bold text-xs">JAC</div>
              <div>
                <p className="text-xs font-bold text-white">JAC iEV 20 68cv Aut.</p>
                <p className="text-[10px] text-white/40">Sinal: R$ 1.500,00</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-white">R$ 78.262</p>
              <span className="text-[9px] text-amber-400 font-bold">Aguardando Pix</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  const companyDashboard = (
    <>
      {/* Coluna 1: Estatísticas da Equipe */}
      <div className="bg-white/5 p-5 rounded-xl border border-white/5 space-y-4">
        <span className="text-[11px] text-white/50 font-bold uppercase tracking-wider block">Garantia e Segurança</span>
        <div className="space-y-1">
          <p className="text-3xl font-extrabold text-white">100% Protegido</p>
          <p className="text-xs text-[#C1F11D] font-bold flex items-center gap-1">
            <ShieldCheck size={14} /> Pix direto para a concessionária
          </p>
        </div>
        <div className="pt-2">
          <button 
            onClick={() => navigateTo('cadastrar-reserva')}
            className="w-full bg-white/10 text-white py-2 rounded-lg text-xs font-bold hover:bg-[#C1F11D] hover:text-[#141414] transition-all flex items-center justify-center gap-1"
          >
            <Sparkles size={14} /> Simular Minha Reserva
          </button>
        </div>
      </div>
      {/* Coluna 2: Pagamentos da Folha de Pagamento */}
      <div className="bg-white/5 p-5 rounded-xl border border-white/5 space-y-4 md:col-span-2">
        <div className="flex justify-between items-center">
          <span className="text-[11px] text-white/50 font-bold uppercase tracking-wider">Sua Proposta Recebida</span>
          <span className="text-[10px] text-[#C1F11D] bg-[#C1F11D]/10 px-2.5 py-0.5 rounded-full font-bold">Exclusiva</span>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg border border-white/5 hover:border-white/10 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-[#C1F11D]/10 flex items-center justify-center font-bold text-xs text-[#C1F11D]">VOLVO</div>
              <div>
                <p className="text-xs font-bold text-white">Volvo XC60 Hybrid 2024</p>
                <p className="text-[10px] text-white/40">Sinal Requerido: R$ 8.000,00</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-white">R$ 399.900</p>
              <span className="text-[9px] text-[#C1F11D] font-bold">Aguardando Seu Pix</span>
            </div>
          </div>
          <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg border border-white/5 hover:border-white/10 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-[#C1F11D]/10 flex items-center justify-center font-bold text-xs text-[#C1F11D]">TOYOTA</div>
              <div>
                <p className="text-xs font-bold text-white">Toyota Corolla Altis 2023</p>
                <p className="text-[10px] text-white/40">Sinal Pago: R$ 3.000,00</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-white">R$ 145.000</p>
              <span className="text-[9px] text-[#C1F11D] font-bold">Aprovado e Reservado</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="bg-[#F4F4F2] text-[#141414] font-sans overflow-x-hidden antialiased min-h-screen relative">
      <style dangerouslySetInnerHTML={{ __html: `
        .glass-header {
          background-color: rgba(255, 255, 255, 0.98);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(20, 20, 20, 0.08);
        }
        .circular-text-container {
          animation: rotateCircular 20s linear infinite;
        }
        @keyframes rotateCircular {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .premium-shadow {
          box-shadow: 0 20px 40px -15px rgba(20, 20, 20, 0.05);
        }
        .premium-shadow-dark {
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          display: flex;
          width: max-content;
          animation: marquee 25s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
        @keyframes verticalMarquee {
          0% { transform: translateY(0); }
          100% { transform: translateY(-50%); }
        }
        .animate-vertical-marquee {
          display: flex;
          flex-direction: column;
          animation: verticalMarquee 15s linear infinite;
        }
        .animate-vertical-marquee:hover {
          animation-play-state: paused;
        }
      `}} />

      {/* HEADER / NAVEGAÇÃO */}
      <header id="main-header" className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${isHeaderActive ? 'glass-header py-3.5 shadow-sm text-[#141414]' : 'py-5 text-white bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between relative">
          {/* Logo */}
          <a href="#" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="flex items-center gap-1.5 text-2xl font-extrabold tracking-tight">
            <div className="w-8 h-8 bg-[#C1F11D] rounded-lg flex items-center justify-center">
              <Car size={18} className="text-[#141414]" />
            </div>
            <span className="font-black">Reservacar</span>
            <span className="text-[10px] font-bold align-super text-[#C1F11D]">®</span>
          </a>

          {/* Menu Desktop */}
          <nav className={`hidden md:flex items-center gap-8 font-medium text-sm transition-colors duration-300 ${isHeaderActive ? 'text-[#141414]/90' : 'text-white/90'}`}>
            <a href="#features" className="hover:text-[#C1F11D] transition-colors duration-300">Funcionalidades</a>
            
            {/* Dropdown Serviços */}
            <div 
              className="py-2"
              onMouseEnter={handleServicesEnter}
              onMouseLeave={handleServicesLeave}
            >
              <button 
                type="button"
                className={`flex items-center gap-1.5 hover:text-[#C1F11D] transition-colors duration-300 font-medium text-sm bg-transparent border-none cursor-pointer outline-none ${isHeaderActive ? 'text-[#141414]/90' : 'text-white/90'}`}
              >
                <span>Serviços</span>
                <ChevronDown size={14} className={`transition-transform duration-300 ${isServicesOpen ? 'rotate-180 text-[#C1F11D]' : isHeaderActive ? 'text-[#141414]/50' : 'text-white/50'}`} />
              </button>
            </div>

            <a href="#" onClick={(e) => { e.preventDefault(); navigateTo('pricing'); }} className="hover:text-[#C1F11D] transition-colors duration-300">Pricing</a>
            <a href="#faq" className="hover:text-[#C1F11D] transition-colors duration-300">FAQ</a>
            <a href="#" onClick={(e) => { e.preventDefault(); navigateTo('empresa'); }} className="hover:text-[#C1F11D] transition-colors duration-300">Empresa</a>
          </nav>

          {/* Ações */}
          <div className="hidden md:flex items-center gap-4">
            <button 
              onClick={() => navigateTo('login')} 
              className={`text-sm font-semibold px-5 py-2.5 rounded-full transition-all duration-300 border cursor-pointer ${
                isHeaderActive 
                  ? 'border-[#141414]/30 text-[#141414] hover:border-[#141414]/80 hover:bg-[#141414]/10' 
                  : 'border border-white/30 text-white hover:border-white/80 hover:bg-white/10'
              }`}
            >
              Acesso Lojista
            </button>
            <button 
              onClick={() => navigateTo('assinar')} 
              className={`text-sm font-semibold px-6 py-2.5 rounded-full transition-all duration-300 shadow-md hover:shadow-lg cursor-pointer ${
                isHeaderActive 
                  ? 'bg-[#C1F11D] text-[#141414] hover:bg-[#141414] hover:text-white' 
                  : 'bg-[#C1F11D] text-[#141414] hover:bg-white hover:text-[#141414]'
              }`}
            >
              Assinar Reservacar
            </button>
          </div>

          {/* Botão Menu Mobile */}
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
            className={`md:hidden flex flex-col justify-between w-6 h-4 focus:outline-none z-50 cursor-pointer ${isHeaderActive ? 'text-[#141414]' : 'text-white'}`} 
            aria-label="Abrir Menu"
          >
            <span className={`w-full h-[2px] bg-current transition-all duration-300 ${isMobileMenuOpen ? 'translate-y-[7px] rotate-45' : ''}`}></span>
            <span className={`w-full h-[2px] bg-current transition-all duration-300 ${isMobileMenuOpen ? 'opacity-0' : ''}`}></span>
            <span className={`w-full h-[2px] bg-current transition-all duration-300 ${isMobileMenuOpen ? '-translate-y-[7px] -rotate-45' : ''}`}></span>
          </button>
        </div>

        {isServicesOpen && (
          <div 
            className="absolute top-full left-0 w-full bg-white border-b border-[#E5E5E2]/80 shadow-xl z-50 animate-[fadeIn_0.25s_ease-out-expo]"
            onMouseEnter={handleServicesEnter}
            onMouseLeave={handleServicesLeave}
          >
            <div 
              className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-12 gap-8 text-left relative text-[#141414]"
              style={{
                animation: 'fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
            >
              {/* Botão de Fechar discreto */}
              <button 
                onClick={() => setIsServicesOpen(false)}
                className="absolute top-4 right-4 text-[#B9B9B4] hover:text-[#5F5F5A] transition cursor-pointer p-1 rounded-full hover:bg-[#EBEBE8]"
                type="button"
                aria-label="Fechar menu"
              >
                <X size={16} />
              </button>

              {/* Coluna 1: Card de Destaque à Esquerda (4/12) */}
              <div className="col-span-4 flex flex-col justify-between border-r border-[#EBEBE8] pr-6">
                <div className="space-y-4">
                  <div className="rounded-xl overflow-hidden aspect-[16/10] bg-gradient-to-br from-[#141414] to-[#2E2E2A] border border-[#EBEBE8]">
                    <img 
                      src="https://i.imgur.com/cv0mLXh.jpeg" 
                      alt="Showroom Reservacar" 
                      className="w-full h-full object-cover opacity-90 hover:scale-102 transition-transform duration-700"
                    />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-[#141414] text-sm tracking-wider uppercase mb-1.5">Showroom Virtual</h4>
                    <p className="text-[#8A8A85] text-xs leading-relaxed font-semibold">
                      A plataforma inteligente para criar propostas, receber sinais Pix e vender veículos como um profissional.
                    </p>
                  </div>
                </div>
                <div className="pt-4">
                  <a 
                    href="#" 
                    onClick={(e) => { e.preventDefault(); setIsServicesOpen(false); navigateTo('login'); }}
                    className="inline-flex items-center gap-1 text-[#141414] hover:text-[#C1F11D] font-bold text-xs group transition-colors"
                  >
                    <span>Conhecer plataforma</span>
                    <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                  </a>
                </div>
              </div>

              {/* Coluna 2: Recursos (5/12) */}
              <div className="col-span-5 flex flex-col justify-between border-r border-[#EBEBE8] pr-6">
                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] font-black text-[#B9B9B4] uppercase tracking-widest block pb-1 border-b border-[#EBEBE8]">Recursos</span>
                  </div>
                  
                  <div className="space-y-3.5">
                    {/* Item 1: Criar proposta */}
                    <a 
                      href="#features" 
                      onClick={() => setIsServicesOpen(false)}
                      className="flex items-center gap-3.5 group/item text-[#8A8A85] hover:text-[#141414] transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-[#C1F11D]/15 text-[#141414] flex items-center justify-center shrink-0 group-hover/item:bg-[#C1F11D] transition-colors">
                        <Send size={14} />
                      </div>
                      <div>
                        <p className="font-bold text-xs text-[#141414] group-hover/item:text-[#141414]">Criar proposta</p>
                        <p className="text-[10px] text-[#8A8A85] leading-normal font-semibold">Gere propostas personalizadas pelo celular</p>
                      </div>
                    </a>

                    {/* Item 2: Sinal Pix imediato */}
                    <a 
                      href="#features" 
                      onClick={() => setIsServicesOpen(false)}
                      className="flex items-center gap-3.5 group/item text-[#8A8A85] hover:text-[#141414] transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-[#C1F11D]/15 text-[#141414] flex items-center justify-center shrink-0 group-hover/item:bg-[#C1F11D] transition-colors">
                        <DollarSign size={14} />
                      </div>
                      <div>
                        <p className="font-bold text-xs text-[#141414] group-hover/item:text-[#141414]">Sinal Pix imediato</p>
                        <p className="text-[10px] text-[#8A8A85] leading-normal font-semibold">Receba sinais Pix direto na sua conta</p>
                      </div>
                    </a>

                    {/* Item 3: Garantia de reserva */}
                    <a 
                      href="#features" 
                      onClick={() => setIsServicesOpen(false)}
                      className="flex items-center gap-3.5 group/item text-[#8A8A85] hover:text-[#141414] transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-[#C1F11D]/15 text-[#141414] flex items-center justify-center shrink-0 group-hover/item:bg-[#C1F11D] transition-colors">
                        <ShieldCheck size={14} />
                      </div>
                      <div>
                        <p className="font-bold text-xs text-[#141414] group-hover/item:text-[#141414]">Garantia de reserva</p>
                        <p className="text-[10px] text-[#8A8A85] leading-normal font-semibold">Segurança jurídica para lojistas e clientes</p>
                      </div>
                    </a>

                    {/* Item 4: Links temporários */}
                    <a 
                      href="#features" 
                      onClick={() => setIsServicesOpen(false)}
                      className="flex items-center gap-3.5 group/item text-[#8A8A85] hover:text-[#141414] transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-[#C1F11D]/15 text-[#141414] flex items-center justify-center shrink-0 group-hover/item:bg-[#C1F11D] transition-colors">
                        <LinkIcon size={14} />
                      </div>
                      <div>
                        <p className="font-bold text-xs text-[#141414] group-hover/item:text-[#141414]">Links temporários</p>
                        <p className="text-[10px] text-[#8A8A85] leading-normal font-semibold">Gatilho de urgência com cronômetro regressivo</p>
                      </div>
                    </a>

                    {/* Item 5: Painel de estoque */}
                    <a 
                      href="#features" 
                      onClick={() => setIsServicesOpen(false)}
                      className="flex items-center gap-3.5 group/item text-[#8A8A85] hover:text-[#141414] transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-[#C1F11D]/15 text-[#141414] flex items-center justify-center shrink-0 group-hover/item:bg-[#C1F11D] transition-colors">
                        <Car size={14} />
                      </div>
                      <div>
                        <p className="font-bold text-xs text-[#141414] group-hover/item:text-[#141414]">Painel de estoque</p>
                        <p className="text-[10px] text-[#8A8A85] leading-normal font-semibold">Acompanhe veículos reservados em tempo real</p>
                      </div>
                    </a>
                  </div>
                </div>
              </div>

              {/* Coluna 3: Preços (3/12) */}
              <div className="col-span-3 flex flex-col justify-start">
                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] font-black text-[#B9B9B4] uppercase tracking-widest block pb-1 border-b border-[#EBEBE8]">Preços</span>
                  </div>
                  
                  <div className="pt-2">
                    <a
                      href="#"
                      onClick={(e) => { e.preventDefault(); setIsServicesOpen(false); navigateTo('pricing'); }}
                      className="group flex flex-col gap-1 text-[#8A8A85] hover:text-[#141414] transition-colors p-2 rounded-xl hover:bg-[#F4F4F2]"
                    >
                      <span className="font-extrabold text-xs text-[#141414] group-hover:text-[#141414] transition-colors">Planos e tarifas</span>
                      <span className="text-[10px] text-[#8A8A85] leading-relaxed font-semibold">Compare a economia em relação a intermediários</span>
                    </a>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}
      </header>

      {/* MENU MOBILE OVERLAY */}
      <div className={`fixed inset-0 bg-[#141414] text-[#F4F4F2] z-40 flex flex-col justify-between p-8 pt-32 transition-all duration-500 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <nav className="flex flex-col gap-6 text-2xl font-bold">
          <a href="#features" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-[#C1F11D] transition-colors duration-300 inline-block">Funcionalidades</a>
          <a href="#simulator" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-[#C1F11D] transition-colors duration-300 inline-block">Simulador de Taxas</a>
          <a href="#" onClick={(e) => { e.preventDefault(); setIsMobileMenuOpen(false); navigateTo('pricing'); }} className="hover:text-[#C1F11D] transition-colors duration-300 inline-block">Pricing</a>
          <a href="#faq" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-[#C1F11D] transition-colors duration-300 inline-block">Perguntas Frequentes</a>
          <a href="#" onClick={(e) => { e.preventDefault(); setIsMobileMenuOpen(false); navigateTo('empresa'); }} className="hover:text-[#C1F11D] transition-colors duration-300 inline-block">Empresa</a>
        </nav>
        <div className="flex flex-col gap-4 mt-auto">
          <button onClick={() => { setIsMobileMenuOpen(false); navigateTo('login'); }} className="w-full text-center border border-white/20 text-white font-semibold py-3.5 rounded-full hover:bg-white/10 transition-colors">Acesso Lojista</button>
          <button onClick={() => { setIsMobileMenuOpen(false); navigateTo('assinar'); }} className="w-full text-center bg-[#C1F11D] text-[#141414] font-semibold py-3.5 rounded-full hover:bg-white transition-colors">Assinar Reservacar</button>
        </div>
      </div>

      {/* HERO SECTION */}
      <section className="relative bg-[#141414] text-[#F4F4F2] pt-36 pb-32 md:pt-48 md:pb-44 overflow-hidden">
        {/* Vídeo de Fundo */}
        <div className="absolute inset-0 w-full h-full overflow-hidden z-0">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover opacity-30"
          >
            <source src="/video/hero-reserva.mp4" type="video/mp4" />
            Seu navegador não suporta vídeos.
          </video>
          {/* Overlay de contraste do design system */}
          <div className="absolute inset-0 bg-[#141414]/65"></div>
          {/* Detalhes de Fundo (Glow sutil) */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#C1F11D]/10 rounded-full blur-[120px] pointer-events-none"></div>
        </div>

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="flex flex-col items-center text-center">
            
            {/* Alternador de Perfil */}
            <div className="inline-flex bg-white/5 p-1 rounded-full mb-8 border border-white/10 premium-shadow">
              <button 
                onClick={() => setProfile('lojista')} 
                className={`px-6 py-2.5 rounded-full font-semibold text-sm transition-all duration-300 ${profile === 'lojista' ? 'bg-[#C1F11D] text-[#141414]' : 'text-white/70 hover:text-white'}`}
              >
                Para Lojistas
              </button>
              <button 
                onClick={() => setProfile('cliente')} 
                className={`px-6 py-2.5 rounded-full font-semibold text-sm transition-all duration-300 ${profile === 'cliente' ? 'bg-[#C1F11D] text-[#141414]' : 'text-white/70 hover:text-white'}`}
              >
                Para Clientes
              </button>
            </div>

            {/* Título Hero */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight max-w-4xl leading-[1.1] mb-6 transition-all duration-300">
              {profile === 'lojista' ? (
                <>Vendas e reservas digitais de veículos com <span className="text-[#C1F11D]">garantia de sinal Pix</span>.</>
              ) : (
                <>Garanta seu próximo carro antes de ir <span className="text-[#C1F11D]">ao showroom</span>.</>
              )}
            </h1>
            
            {/* Subtítulo */}
            <p className="text-[#B9B9B4] text-lg sm:text-xl max-w-2xl mb-10 leading-relaxed font-semibold">
              {profile === 'lojista' ? (
                "Sua vitrine digital sob medida. Compartilhe o link da proposta pelo WhatsApp, receba o sinal Pix diretamente na sua conta e segure a venda instantaneamente."
              ) : (
                "Recebeu uma proposta exclusiva da concessionária? Faça a reserva via Pix de forma 100% segura e evite que o veículo seja vendido para outro interessado."
              )}
            </p>

            {/* CTAs principais */}
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
              <button 
                onClick={() => navigateTo('cadastrar-reserva')} 
                className="w-full sm:w-auto bg-[#C1F11D] text-[#141414] text-base font-bold px-8 py-4 rounded-full hover:bg-white hover:scale-105 transition-all duration-300 shadow-lg shadow-[#C1F11D]/10 cursor-pointer"
              >
                Simular Reserva (Cliente)
              </button>
              <button 
                onClick={() => navigateTo('assinar')} 
                className="w-full sm:w-auto border border-white/20 text-white hover:bg-white/5 text-base font-bold px-8 py-4 rounded-full transition-all duration-300 cursor-pointer"
              >
                Assinar Reservacar
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* MARCAS PARCEIRAS */}
      <section className="py-12 bg-[#F4F4F2] border-y border-[rgba(20,20,20,0.08)]">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-[#8A8A85] mb-8">
            Utilizado por lojas de todas as marcas e capitais
          </p>
          
          {/* Contêiner do Carrossel com máscara de fade nas laterais */}
          <div className="relative w-full overflow-hidden py-4 select-none">
            {/* Fade Esquerdo */}
            <div className="absolute left-0 top-0 bottom-0 w-20 md:w-32 bg-gradient-to-r from-[#F4F4F2] via-[#F4F4F2]/80 to-transparent z-10 pointer-events-none" />
            {/* Fade Direito */}
            <div className="absolute right-0 top-0 bottom-0 w-20 md:w-32 bg-gradient-to-l from-[#F4F4F2] via-[#F4F4F2]/80 to-transparent z-10 pointer-events-none" />
            
            {/* Pista do Carrossel (itens duplicados para loop contínuo) */}
            <div className="flex gap-16 md:gap-24 items-center animate-marquee whitespace-nowrap">
              {/* Primeira metade */}
              <div className="flex gap-16 md:gap-24 shrink-0">
                <div className="flex items-center gap-2 font-bold text-lg text-[#141414]/60 hover:text-[#141414] transition duration-200"><Car className="w-5 h-5" /> Audi Center</div>
                <div className="flex items-center gap-2 font-bold text-lg text-[#141414]/60 hover:text-[#141414] transition duration-200"><Car className="w-5 h-5" /> BMW Premium</div>
                <div className="flex items-center gap-2 font-bold text-lg text-[#141414]/60 hover:text-[#141414] transition duration-200"><Car className="w-5 h-5" /> Toyota Elite</div>
                <div className="flex items-center gap-2 font-bold text-lg text-[#141414]/60 hover:text-[#141414] transition duration-200"><Car className="w-5 h-5" /> Porsche Service</div>
                <div className="flex items-center gap-2 font-bold text-lg text-[#141414]/60 hover:text-[#141414] transition duration-200">
                  <span className="text-xs bg-[#E5E5E2] px-1.5 py-0.5 rounded text-[#2A2A26] font-black">PIX</span> Liquidação Imediata
                </div>
              </div>
              {/* Segunda metade duplicada para o loop perfeito */}
              <div className="flex gap-16 md:gap-24 shrink-0">
                <div className="flex items-center gap-2 font-bold text-lg text-[#141414]/60 hover:text-[#141414] transition duration-200"><Car className="w-5 h-5" /> Audi Center</div>
                <div className="flex items-center gap-2 font-bold text-lg text-[#141414]/60 hover:text-[#141414] transition duration-200"><Car className="w-5 h-5" /> BMW Premium</div>
                <div className="flex items-center gap-2 font-bold text-lg text-[#141414]/60 hover:text-[#141414] transition duration-200"><Car className="w-5 h-5" /> Toyota Elite</div>
                <div className="flex items-center gap-2 font-bold text-lg text-[#141414]/60 hover:text-[#141414] transition duration-200"><Car className="w-5 h-5" /> Porsche Service</div>
                <div className="flex items-center gap-2 font-bold text-lg text-[#141414]/60 hover:text-[#141414] transition duration-200">
                  <span className="text-xs bg-[#E5E5E2] px-1.5 py-0.5 rounded text-[#2A2A26] font-black">PIX</span> Liquidação Imediata
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* SEÇÃO DE RECURSOS (FEATURES) — linha de valores rápidos estilo PicPay */}
      <section id="features" className="py-20 md:py-28 bg-[#F4F4F2]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl mb-14">
            <span className="text-xs font-extrabold uppercase tracking-widest text-[#8A8A85] block mb-4">Para sua loja</span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight text-[#141414] leading-[1.1]">
              O Reservacar ajuda você a vender de onde você estiver
            </h2>
          </div>

          {/* Grid de 4 colunas concisas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 border-t border-[rgba(20,20,20,0.1)] pt-12">
            {[
              { icon: Smartphone, title: 'Proposta digital', text: 'Monte a proposta do veículo em segundos e envie pelo WhatsApp.' },
              { icon: CircleDollarSign, title: 'Sinal via Pix', text: 'O cliente paga o sinal direto na sua conta, sem comissão.' },
              { icon: ShieldCheck, title: 'Reserva garantida', text: 'O veículo fica travado para o comprador no ato do pagamento.' },
              { icon: BarChart2, title: 'Painel ao vivo', text: 'Acompanhe propostas, sinais e equipe em tempo real.' },
            ].map((item, i) => (
              <div key={i} className="space-y-3">
                <div className="w-12 h-12 rounded-xl bg-[#C1F11D]/20 flex items-center justify-center">
                  <item.icon size={22} className="text-[#141414]" />
                </div>
                <h4 className="font-extrabold text-[#141414] text-base">{item.title}</h4>
                <p className="text-[#8A8A85] text-sm leading-relaxed font-medium">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAIXA VERDE FULL-WIDTH — venda online ou presencial (estilo PicPay) */}
      <section id="propostas-fluxo" className="py-20 md:py-28 bg-[#141414] text-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Coluna texto */}
            <div className="space-y-8">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight text-white leading-[1.1]">
                Feche a venda em menos de 60 segundos
              </h2>
              <ul className="space-y-5">
                {[
                  'Monte a proposta com preço FIPE preenchido automaticamente.',
                  'Gere um link exclusivo com cronômetro de urgência e botão Pix.',
                  'Receba o sinal direto na conta e trave a reserva na hora.',
                ].map((t, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 size={22} className="text-[#C1F11D] shrink-0 mt-0.5" />
                    <span className="text-[#E5E5E0] text-base md:text-lg font-medium leading-relaxed">{t}</span>
                  </li>
                ))}
              </ul>
              <div className="flex flex-col sm:flex-row gap-4 pt-2">
                <button
                  onClick={() => navigateTo('assinar')}
                  className="w-full sm:w-auto bg-[#C1F11D] text-[#141414] font-extrabold text-sm px-8 py-3.5 rounded-full hover:bg-white hover:scale-105 transition-all duration-300 shadow-lg shadow-[#C1F11D]/10 cursor-pointer"
                >
                  Assinar Reservacar
                </button>
                <button
                  onClick={() => navigateTo('login')}
                  className="w-full sm:w-auto bg-transparent border border-white/20 hover:border-white text-white hover:bg-white/5 font-extrabold text-sm px-8 py-3.5 rounded-full transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Ver demonstração</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
            {/* Coluna imagem */}
            <div className="relative rounded-[24px] overflow-hidden aspect-[4/3] shadow-2xl border border-white/10">
              <img
                src="https://i.imgur.com/mtCb0l9.jpeg"
                alt="Vendedor fechando uma reserva pelo celular"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* CARDS EMPILHADOS — recursos principais (estilo "Crédito disponível" PicPay) */}
      <section id="simulator" className="py-20 md:py-28 bg-[#F4F4F2] text-[#141414]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl mb-12">
            <span className="text-xs font-extrabold uppercase tracking-widest text-[#8A8A85] block mb-4">Recursos</span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight text-[#141414] leading-[1.1]">
              Tudo que sua loja precisa para vender mais
            </h2>
          </div>

          <div className="space-y-6">
            {[
              {
                dark: false,
                tag: 'Pix direto',
                title: 'Sinal na sua conta, sem comissão',
                text: 'O cliente paga o sinal via Pix diretamente na proposta. O dinheiro cai na conta da sua loja na hora — você paga só a assinatura fixa mensal.',
                cta: 'Assinar Reservacar', action: () => navigateTo('assinar'),
                img: 'https://i.imgur.com/bQ0jZH2.jpeg',
              },
              {
                dark: true,
                tag: 'Link inteligente',
                title: 'Proposta com cronômetro de urgência',
                text: 'Cada link tem countdown regressivo, valor do sinal e botão Pix. O gatilho de escassez acelera a decisão do comprador.',
                cta: 'Ver demonstração', action: () => navigateTo('login'),
                img: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=800&q=80',
              },
              {
                dark: false,
                tag: 'Painel ao vivo',
                title: 'Acompanhe sua equipe em tempo real',
                text: 'Veja propostas abertas, sinais recebidos e o desempenho de cada vendedor num só painel, atualizado ao vivo.',
                cta: 'Simular reserva', action: () => navigateTo('cadastrar-reserva'),
                img: 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&w=800&q=80',
              },
            ].map((c, i) => (
              <div
                key={i}
                className={`grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center rounded-[28px] p-8 md:p-12 border ${
                  c.dark
                    ? 'bg-[#141414] text-white border-white/10'
                    : 'bg-white text-[#141414] border-[rgba(20,20,20,0.08)] premium-shadow'
                } ${i % 2 === 1 ? 'md:[&>*:first-child]:order-2' : ''}`}
              >
                <div className="space-y-4">
                  <span className={`text-xs font-extrabold uppercase tracking-widest ${c.dark ? 'text-[#C1F11D]' : 'text-[#8A8A85]'}`}>{c.tag}</span>
                  <h3 className={`text-2xl md:text-3xl font-black tracking-tight leading-tight ${c.dark ? 'text-white' : 'text-[#141414]'}`}>{c.title}</h3>
                  <p className={`text-sm md:text-base leading-relaxed font-medium ${c.dark ? 'text-[#B9B9B4]' : 'text-[#8A8A85]'}`}>{c.text}</p>
                  <button
                    onClick={c.action}
                    className={`inline-flex items-center gap-2 font-extrabold text-sm px-7 py-3 rounded-full transition-all duration-300 cursor-pointer mt-2 ${
                      c.dark
                        ? 'bg-[#C1F11D] text-[#141414] hover:bg-white'
                        : 'bg-[#141414] text-[#F4F4F2] hover:bg-[#C1F11D] hover:text-[#141414]'
                    }`}
                  >
                    <span>{c.cta}</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
                <div className="relative rounded-[20px] overflow-hidden aspect-[4/3] shadow-lg">
                  <img src={c.img} alt={c.title} className="w-full h-full object-cover" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* METRICAS */}
      <section id="stats" className="py-24 bg-[#F4F4F2] border-b border-[rgba(20,20,20,0.08)]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
            <div className="space-y-3 p-6 bg-white rounded-2xl border border-[rgba(20,20,20,0.08)] premium-shadow">
              <div className="w-12 h-12 bg-[#C1F11D]/20 text-[#141414] rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h3 className="text-4xl md:text-5xl font-extrabold tracking-tight text-[#141414]">
                R$ {bilhoes.toFixed(1)}M+
              </h3>
              <p className="text-xs uppercase tracking-wider font-extrabold text-[#8A8A85]">Sinais Processados (BRL)</p>
            </div>
            <div className="space-y-3 p-6 bg-white rounded-2xl border border-[rgba(20,20,20,0.08)] premium-shadow">
              <div className="w-12 h-12 bg-[#C1F11D]/20 text-[#141414] rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-4xl md:text-5xl font-extrabold tracking-tight text-[#141414]">
                {clientes}k+
              </h3>
              <p className="text-xs uppercase tracking-wider font-extrabold text-[#8A8A85]">Carros Reservados Ativos</p>
            </div>
            <div className="space-y-3 p-6 bg-white rounded-2xl border border-[rgba(20,20,20,0.08)] premium-shadow">
              <div className="w-12 h-12 bg-[#C1F11D]/20 text-[#141414] rounded-full flex items-center justify-center mx-auto mb-4">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-4xl md:text-5xl font-extrabold tracking-tight text-[#141414]">
                {aprovacao.toFixed(1)}%
              </h3>
              <p className="text-xs uppercase tracking-wider font-extrabold text-[#8A8A85]">Aprovação Legal e Conformidade</p>
            </div>
          </div>
        </div>
      </section>

      {/* DECLARAÇÃO DE FECHAMENTO (estilo "Com PicPay, descomplicada") */}
      <section className="py-24 md:py-36 bg-[#F4F4F2] text-center">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-[#141414] leading-[1.05]">
            Com o Reservacar,<br />vender carro é <span className="text-[#C1F11D] [text-shadow:0_1px_0_rgba(20,20,20,0.15)]">descomplicado</span>.
          </h2>
          <p className="text-[#8A8A85] text-base md:text-lg font-medium mt-6 max-w-xl mx-auto leading-relaxed">
            Proposta, sinal Pix e reserva garantida em um só lugar. Comece hoje mesmo.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
            <button
              onClick={() => navigateTo('assinar')}
              className="w-full sm:w-auto bg-[#141414] text-[#F4F4F2] font-extrabold text-base px-8 py-4 rounded-full hover:bg-[#C1F11D] hover:text-[#141414] hover:scale-105 transition-all duration-300 cursor-pointer"
            >
              Assinar Reservacar
            </button>
            <button
              onClick={() => navigateTo('cadastrar-reserva')}
              className="w-full sm:w-auto border border-[#141414]/20 text-[#141414] hover:bg-[#141414]/5 font-extrabold text-base px-8 py-4 rounded-full transition-all duration-300 cursor-pointer"
            >
              Simular reserva
            </button>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 md:py-32 bg-[#F4F4F2]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            
            {/* Coluna da Esquerda: Card Escuro */}
            <div className="lg:col-span-5 bg-[#141414] rounded-[32px] p-8 md:p-12 text-[#F4F4F2] flex flex-col justify-between min-h-[380px] lg:min-h-full shadow-xl">
              <div>
                <span className="text-xs uppercase font-extrabold tracking-widest text-[#C1F11D] block mb-4">FAQ</span>
                <h2 className="text-4xl md:text-5xl font-normal text-white tracking-tight leading-[1.15] font-serif">
                  Perguntas<br />Frequentes
                </h2>
              </div>
              
              <div className="flex flex-wrap gap-4 mt-12">
                <a 
                  href="#features"
                  className="px-6 py-3 border border-white/20 hover:bg-white/5 text-white font-bold text-xs rounded-xl transition-all duration-300 text-center flex-1 sm:flex-none cursor-pointer"
                >
                  Saiba mais
                </a>
                <button 
                  onClick={() => navigateTo('login')}
                  className="px-6 py-3 bg-white text-[#141414] font-bold text-xs rounded-xl hover:bg-[#C1F11D] hover:text-[#141414] transition-all duration-300 text-center flex-1 sm:flex-none cursor-pointer"
                >
                  Fale conosco
                </button>
              </div>
            </div>

            {/* Coluna da Direita: Lista de Accordions */}
            <div className="lg:col-span-7 space-y-4 flex flex-col justify-center">
              {(() => {
                const faqs = [
                  {
                    question: "Como o Reservacar garante a segurança da reserva?",
                    answer: "O Reservacar gera Qr Codes de Pix dinâmicos vinculados diretamente à conta bancária de sua própria concessionária ou lojista. O dinheiro cai diretamente na sua conta, e o sistema detecta o pagamento de forma instantânea para atualizar a vitrine digital."
                  },
                  {
                    question: "Preciso pagar comissão sobre os veículos reservados?",
                    answer: "Não! Diferente de outros portais, nós cobramos apenas uma assinatura mensal fixa de R$ 159. Todas as reservas e sinais Pix gerados em suas propostas vão inteiramente para a conta de sua empresa, sem taxas de intermediação."
                  },
                  {
                    question: "Como funciona o cronômetro psicológico da proposta?",
                    answer: "Cada link de proposta enviado ao cliente possui um cronômetro regressivo psicológico configurado pela sua equipe de vendas (ex: 20 minutos). Isso gera um gatilho de escassez e urgência para motivar a reserva rápida do sinal via Pix."
                  }
                ];

                return faqs.map((faq, index) => (
                  <div 
                    key={index}
                    className="bg-white rounded-[20px] shadow-sm hover:shadow-md transition-all duration-300 border border-[rgba(20,20,20,0.05)] overflow-hidden"
                  >
                    <button 
                      onClick={() => setActiveFaq(activeFaq === index ? null : index)}
                      className="w-full text-left p-6 sm:p-8 flex justify-between items-center focus:outline-none select-none cursor-pointer gap-4"
                    >
                      <span className="font-bold text-sm sm:text-base md:text-lg text-[#141414] leading-snug">
                        {faq.question}
                      </span>
                      <span className="text-xl sm:text-2xl font-light text-[#141414] shrink-0 select-none">
                        {activeFaq === index ? '−' : '+'}
                      </span>
                    </button>
                    <div 
                      className={`grid transition-all duration-300 ease-in-out ${
                        activeFaq === index 
                          ? 'grid-rows-[1fr] opacity-100' 
                          : 'grid-rows-[0fr] opacity-0'
                      }`}
                    >
                      <div className="overflow-hidden">
                        <p className="px-6 sm:px-8 pb-6 sm:pb-8 text-xs sm:text-sm md:text-base text-[#8A8A85] leading-relaxed">
                          {faq.answer}
                        </p>
                      </div>
                    </div>
                  </div>
                ));
              })()}
            </div>

          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#141414] text-[#F4F4F2] pt-20 pb-10 border-t border-white/10 relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 mb-16">
            <div className="lg:col-span-2 space-y-6">
              <div className="text-2xl font-extrabold tracking-tight flex items-center gap-1">
                <span className="font-black text-white">Reservacar</span>
                <span className="text-xs font-bold align-super text-[#C1F11D]">®</span>
              </div>
              <p className="text-[#8A8A85] text-sm max-w-sm leading-relaxed">
                Infraestrutura digital completa para concessionárias e lojistas de automóveis gerenciarem suas propostas, coletarem sinais Pix e fecharem mais vendas.
              </p>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-extrabold uppercase tracking-widest text-[#C1F11D]">Funcionalidades</h4>
              <ul className="space-y-2.5 text-sm text-[#8A8A85]">
                <li><button onClick={() => navigateTo('cadastrar-reserva')} className="hover:text-white transition-colors">Simular Reserva</button></li>
                <li><button onClick={() => navigateTo('assinar')} className="hover:text-white transition-colors">Planos de Assinatura</button></li>
                <li><button onClick={() => navigateTo('login')} className="hover:text-white transition-colors">Login Lojista</button></li>
              </ul>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-extrabold uppercase tracking-widest text-[#C1F11D]">Recursos</h4>
              <ul className="space-y-2.5 text-sm text-[#8A8A85]">
                <li><a href="#" className="hover:text-white transition-colors">Central de Ajuda</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Políticas de Uso</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Calculadora de Taxa</a></li>
              </ul>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-extrabold uppercase tracking-widest text-[#C1F11D]">Jurídico</h4>
              <ul className="space-y-2.5 text-sm text-[#8A8A85]">
                <li><a href="#" className="hover:text-white transition-colors">Política de Privacidade</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Termos de Serviço</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Regulação LGPD</a></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-[#8A8A85] font-medium">
            <p>&copy; 2026 Reservacar. Todos os direitos reservados. Todas as marcas registradas de veículos pertencem aos seus respectivos proprietários.</p>
            <div className="flex items-center gap-2">
              <span>Segurança e Criptografia Pix direta de ponta a ponta</span>
              <Shield className="w-4 h-4 text-[#C1F11D]" />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// --- NEW COMPONENT: FOOTER (Estilo Revolut escuro) ---
function Footer({ navigateTo }) {
  return (
    <footer className="bg-[#0f172a] text-[#B9B9B4] pt-20 pb-12 border-t border-[#2A2A26]">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        
        <div className="mb-16 text-left">
          <span className="text-xs font-bold text-[#C1F11D] uppercase tracking-widest block mb-3">PRONTO PARA ACELERAR?</span>
          <h2 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-4 max-w-2xl leading-tight">
            Revolucione as vendas do seu showroom de veículos.
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16 border-t border-b border-[#2A2A26] py-12 text-left">
          <div>
            <h4 className="text-white font-bold text-sm mb-4">Plataforma</h4>
            <ul className="space-y-2 text-xs">
              <li><button onClick={() => navigateTo('home')} className="hover:text-white transition">Início</button></li>
              <li><button onClick={() => navigateTo('assinar')} className="hover:text-white transition">Planos</button></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-white font-bold text-sm mb-4">Parcerias</h4>
            <ul className="space-y-2 text-xs">
              <li><a href="#" className="hover:text-white transition">Multimarcas</a></li>
              <li><a href="#" className="hover:text-white transition">Concessionárias Premium</a></li>
              <li><a href="#" className="hover:text-white transition">Integradores CRM</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold text-sm mb-4">Empresa</h4>
            <ul className="space-y-2 text-xs">
              <li><a href="#" className="hover:text-white transition">Sobre Nós</a></li>
              <li><a href="#" className="hover:text-white transition">Carreiras</a></li>
              <li><a href="#" className="hover:text-white transition">Contato</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold text-sm mb-4">Suporte</h4>
            <ul className="space-y-2 text-xs">
              <li><a href="#" className="hover:text-white transition">Central de Ajuda</a></li>
              <li><a href="#" className="hover:text-white transition">Status do Sistema</a></li>
              <li><a href="#" className="hover:text-white transition">Segurança Pix</a></li>
            </ul>
          </div>
        </div>

        {/* Textos legais pequenos e direitos autorais */}
        <div className="text-left text-[11px] text-[#8A8A85] leading-relaxed space-y-4">
          <p>
            O Reservacar é uma plataforma de tecnologia voltada para a otimização e aceleração de processos comerciais em concessionárias multimarcas de seminovos. Não somos uma instituição financeira ou intermediador direto de pagamentos. As transações financeiras (sinais via Pix) são liquidadas diretamente entre o comprador final (lead) e a concessionária parceira através dos provedores de pagamento integrados à conta bancária de cada concessionária, sob total responsabilidade dos envolvidos.
          </p>
          <p>
            A segurança dos dados é garantida através de segurança avançada e conformidade total com a Lei Geral de Proteção de Dados (LGPD). A expiração dos cronômetros e a trava de showroom são lógicas simuladas configuradas livremente pelas equipes comerciais a fim de otimizar sua taxa de conversão local.
          </p>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pt-8 border-t border-[#2A2A26] gap-4 mt-8">
            <span className="text-[11px] font-semibold text-[#6F6F6A]">© 2026 Reservacar Ltda. Todos os direitos reservados. CNPJ 12.345.678/0001-90.</span>
            <div className="flex gap-4 text-xs font-semibold">
              <a href="#" className="hover:text-white transition">Privacidade</a>
              <a href="#" className="hover:text-white transition">Termos</a>
              <a href="#" className="hover:text-white transition">Cookies</a>
            </div>
          </div>
        </div>

      </div>
    </footer>
  );
}

// --- SUB-COMPONENTS FOR OUTRAS SOLUÇOES (EMPRESA VIEW) ---
function LinkGeneratorPreview({ navigateTo }) {
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

  const handleCopy = (e) => {
    e.preventDefault();
    copyToClipboard("https://reservacar.com.br/reserva/bmw-320i-xyz", (success) => {
      if (success) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    });
  };

  const handleShare = () => {
    setShared(true);
    setTimeout(() => setShared(false), 2000);
  };

  return (
    <div className="grid-bg-dark p-8 rounded-2xl border border-[#141414] flex flex-col justify-between hover:border-[#2A2A26] transition-colors duration-200 text-white min-h-[460px]">
      <div className="space-y-6">
        <div className="w-12 h-12 bg-white/10 text-[#C1F11D] rounded-xl flex items-center justify-center">
          <LinkIcon className="w-6 h-6" />
        </div>
        <div className="space-y-2">
          <h4 className="text-lg font-bold text-white">Gerador de Links de Reserva</h4>
          <p className="text-sm text-[#B9B9B4] leading-relaxed">
            Crie propostas personalizadas com FIPE, urgência e Pix integrado em menos de 60 segundos.
          </p>
        </div>
        
        {/* Preview da Interface do Link */}
        <div className="bg-white border border-white/10 rounded-xl p-4 space-y-4 text-[#141414] shadow-xl">
          <span className="text-[10px] font-bold text-[#6b7c77] uppercase tracking-wider block text-left">Link de Reserva Gerado</span>
          <div className="flex items-center justify-between bg-[#F4F4F2] border border-[#E5E5E2] rounded-lg px-3 py-2.5">
            <div className="flex items-center gap-2 overflow-hidden w-full">
              <LinkIcon className="w-4 h-4 text-[#6b7c77] shrink-0" />
              <span className="text-xs text-[#0f172a] truncate">reservacar.com/reserva/bmw...</span>
            </div>
            <button 
              onClick={handleCopy}
              className="text-[#B9B9B4] hover:text-[#141414] transition-colors p-1"
              title="Copiar Link"
            >
              {copied ? <Check className="w-4 h-4 text-[#141414]" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <button 
            onClick={handleShare}
            className="w-full bg-[#141414] hover:bg-[#C1F11D] hover:text-[#141414] text-white text-xs font-bold py-3 rounded-lg transition-colors duration-200"
          >
            {shared ? "Compartilhado!" : "Compartilhar"}
          </button>
        </div>
      </div>

      <a 
        href="#" 
        onClick={(e) => { e.preventDefault(); navigateTo('cadastrar-reserva'); }} 
        className="inline-flex items-center gap-1.5 text-xs font-bold text-white hover:text-[#C1F11D] transition-colors pt-6"
      >
        Conhecer funcionalidade
        <ArrowRight size={14} />
      </a>
    </div>
  );
}

function LiveDashboardPreview({ navigateTo }) {
  const [proposalActive, setProposalActive] = useState(true);

  return (
    <div className="grid-bg-light p-8 rounded-2xl border border-[rgba(20,20,20,0.06)] flex flex-col justify-between hover:border-[#D9D9D5] transition-colors duration-200 text-[#141414] min-h-[460px]">
      <div className="space-y-6">
        <div className="w-12 h-12 bg-[#C1F11D]/20 text-[#141414] rounded-xl flex items-center justify-center">
          <BarChart2 className="w-6 h-6" />
        </div>
        <div className="space-y-2">
          <h4 className="text-lg font-bold text-[#141414]">Painel de vendas</h4>
          <p className="text-sm text-[#6b7c77] leading-relaxed">
            Acompanhe propostas ativas, visualize o fluxo do cliente e registre pagamentos em tempo real.
          </p>
        </div>

        {/* Preview da Interface de Status */}
        <div className="bg-white border border-[rgba(20,20,20,0.06)] rounded-xl p-4 space-y-3 shadow-xl">
          <div className="flex items-center justify-between bg-white border border-[#e2e8f0] rounded-lg p-3">
            <span className="text-xs font-bold text-[#0f172a]">Status da Proposta</span>
            <div className="flex items-center gap-3">
              <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${proposalActive ? 'text-[#141414] bg-[#C1F11D]/15' : 'text-[#8A8A85] bg-[#EBEBE8]'}`}>
                {proposalActive ? "Ativa" : "Inativa"}
              </span>
              <button 
                onClick={() => setProposalActive(!proposalActive)}
                className={`w-10 h-6 flex items-center rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${proposalActive ? 'bg-[#141414]' : 'bg-[#E5E5E2]'}`}
                aria-label="Alternar status da proposta"
              >
                <div className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-200 ${proposalActive ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between bg-white border border-[#e2e8f0] rounded-lg p-3">
            <span className="text-xs font-bold text-[#0f172a]">Status do Pix</span>
            <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${proposalActive ? 'text-amber-800 bg-amber-50' : 'text-rose-800 bg-rose-50'}`}>
              {proposalActive ? "Pendente" : "Cancelada"}
            </span>
          </div>
        </div>
      </div>

      <a 
        href="#" 
        onClick={(e) => { e.preventDefault(); navigateTo('login'); }} 
        className="inline-flex items-center gap-1.5 text-xs font-bold text-[#141414] hover:text-[#C1F11D] transition-colors pt-6"
      >
        Conhecer funcionalidade
        <ArrowRight size={14} />
      </a>
    </div>
  );
}

function RankingGamificationPreview({ navigateTo }) {
  return (
    <div className="bg-[#C1F11D] p-8 rounded-2xl border border-[#C1F11D] hover:brightness-[1.01] transition-all duration-200 md:col-span-2 text-[#141414] relative overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
        
        {/* Esquerda: Informações */}
        <div className="lg:col-span-6 space-y-6 text-left">
          <div className="space-y-3">
            <h4 className="text-2xl font-bold text-[#141414] flex items-center gap-2.5">
              <div className="w-8 h-8 bg-[#141414] rounded-lg flex items-center justify-center text-[#C1F11D] shrink-0">
                <Trophy className="w-4 h-4 fill-current" />
              </div>
              Ranking e Gamificação
            </h4>
            <p className="text-sm text-[#141414]/80 leading-relaxed">
              Motive sua equipe com metas, ranking de vendedores e badges de performance por período.
            </p>
          </div>

          <button 
            onClick={() => navigateTo('login')}
            className="bg-[#141414] hover:bg-white hover:text-[#141414] text-[#C1F11D] text-xs font-bold px-6 py-3 rounded-full transition-colors duration-200 focus:outline-none shadow-md"
          >
            Conhecer funcionalidade
          </button>

          <div className="space-y-3.5 pt-4 border-t border-[#141414]/10">
            <div className="flex items-center gap-2.5 text-xs font-bold text-[#141414]">
              {/* Ícone de toggle/barra simulado */}
              <div className="w-8 h-4 bg-[#141414] rounded-full p-0.5 flex items-center justify-end shrink-0">
                <div className="bg-white w-3 h-3 rounded-full" />
              </div>
              <span>Metas e objetivos de equipe.</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs font-bold text-[#141414]">
              <Star className="w-5 h-5 text-[#141414] shrink-0" />
              <span>Badges e medalhas de conquista.</span>
            </div>
          </div>
        </div>

        {/* Direita: Preview Visual */}
        <div className="lg:col-span-6 bg-white border border-[#141414]/10 rounded-xl p-4 space-y-4 shadow-xl">
          <div className="flex justify-between items-center pb-2 border-b border-[#EBEBE8]">
            <div className="w-16 h-2 bg-[#EBEBE8] rounded"></div>
            <div className="w-10 h-2 bg-[#EBEBE8] rounded"></div>
          </div>

          <div className="space-y-2.5">
            <span className="text-[10px] font-bold text-[#6b7c77] uppercase tracking-wider block mb-1 text-left">Top 3 Vendedores</span>
            
            {/* Carlos Pereira */}
            <div className="flex items-center justify-between bg-white border border-[#EBEBE8] rounded-lg p-2.5 hover:translate-x-1 transition-transform duration-200">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-50 text-blue-800 font-bold rounded-full flex items-center justify-center text-[10px]">
                  CP
                </div>
                <span className="text-xs font-bold text-[#2A2A26]">Carlos Pereira</span>
              </div>
              <span className="text-xs font-extrabold text-[#B9B9B4]">#1</span>
            </div>

            {/* Ana Souza */}
            <div className="flex items-center justify-between bg-white border border-[#EBEBE8] rounded-lg p-2.5 hover:translate-x-1 transition-transform duration-200">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-[#C1F11D]/15 text-[#141414] font-bold rounded-full flex items-center justify-center text-[10px]">
                  AS
                </div>
                <span className="text-xs font-bold text-[#2A2A26]">Ana Souza</span>
              </div>
              <span className="text-xs font-extrabold text-[#B9B9B4]">#2</span>
            </div>

            {/* Badge */}
            <div className="flex items-center justify-between bg-white border border-[#EBEBE8] rounded-lg p-2.5">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 bg-[#C1F11D]/10 rounded flex items-center justify-center text-[#C1F11D] shrink-0">
                  <Trophy className="w-4 h-4 fill-current" />
                </div>
                <span className="text-xs font-bold text-[#2A2A26]">Badge de Performance (Mês)</span>
              </div>
              <div className="w-6 h-6 bg-[#C1F11D] rounded flex items-center justify-center">
                <Star className="w-3.5 h-3.5 text-[#141414] fill-[#141414]" />
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// --- EMPRESA VIEW ---
// --- HEADER COMPARTILHADO (home / empresa / pricing) ---
function SiteHeader({ navigateTo, activePage = '' }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isServicesOpen, setIsServicesOpen] = useState(false);
  const isHeaderActive = isScrolled || isServicesOpen;

  const servicesTimeoutRef = useRef<any>(null);

  const handleServicesEnter = () => {
    if (servicesTimeoutRef.current) {
      clearTimeout(servicesTimeoutRef.current);
    }
    setIsServicesOpen(true);
  };

  const handleServicesLeave = () => {
    servicesTimeoutRef.current = setTimeout(() => {
      setIsServicesOpen(false);
    }, 250);
  };

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 40) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleHomeAnchor = (anchorId: string) => {
    navigateTo('home');
    setTimeout(() => {
      const element = document.getElementById(anchorId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }, 150);
  };

  const navLink = (active: boolean) => active
    ? 'text-[#C1F11D] font-bold transition-colors duration-300 font-extrabold'
    : 'hover:text-[#C1F11D] transition-colors duration-300';

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .glass-header {
          background-color: rgba(255, 255, 255, 0.98);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(20, 20, 20, 0.08);
        }
      `}} />

      {/* HEADER / NAVEGAÇÃO */}
      <header id="main-header" className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${isHeaderActive ? 'glass-header py-3.5 shadow-sm text-[#141414]' : 'py-5 text-white bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between relative">
          {/* Logo */}
          <a href="#" onClick={(e) => { e.preventDefault(); navigateTo('home'); }} className="flex items-center gap-1.5 text-2xl font-extrabold tracking-tight">
            <div className="w-8 h-8 bg-[#C1F11D] rounded-lg flex items-center justify-center">
              <Car size={18} className="text-[#141414]" />
            </div>
            <span className="font-black">Reservacar</span>
            <span className="text-[10px] font-bold align-super text-[#C1F11D]">®</span>
          </a>

          {/* Menu Desktop */}
          <nav className={`hidden md:flex items-center gap-8 font-medium text-sm transition-colors duration-300 ${isHeaderActive ? 'text-[#141414]/90' : 'text-white/90'}`}>
            <a href="#" onClick={(e) => { e.preventDefault(); handleHomeAnchor('features'); }} className="hover:text-[#C1F11D] transition-colors duration-300">Funcionalidades</a>

            {/* Dropdown Serviços */}
            <div
              className="py-2"
              onMouseEnter={handleServicesEnter}
              onMouseLeave={handleServicesLeave}
            >
              <button
                type="button"
                className={`flex items-center gap-1.5 hover:text-[#C1F11D] transition-colors duration-300 font-medium text-sm bg-transparent border-none cursor-pointer outline-none ${isHeaderActive ? 'text-[#141414]/90' : 'text-white/90'}`}
              >
                <span>Serviços</span>
                <ChevronDown size={14} className={`transition-transform duration-300 ${isServicesOpen ? 'rotate-180 text-[#C1F11D]' : isHeaderActive ? 'text-[#141414]/50' : 'text-white/50'}`} />
              </button>
            </div>

            <a href="#" onClick={(e) => { e.preventDefault(); navigateTo('pricing'); }} className={navLink(activePage === 'pricing')}>Pricing</a>
            <a href="#" onClick={(e) => { e.preventDefault(); handleHomeAnchor('faq'); }} className="hover:text-[#C1F11D] transition-colors duration-300">FAQ</a>
            <a href="#" onClick={(e) => { e.preventDefault(); activePage === 'empresa' ? window.scrollTo({ top: 0, behavior: 'smooth' }) : navigateTo('empresa'); }} className={navLink(activePage === 'empresa')}>Empresa</a>
          </nav>

          {/* Ações */}
          <div className="hidden md:flex items-center gap-4">
            <button
              onClick={() => navigateTo('login')}
              className={`text-sm font-semibold px-5 py-2.5 rounded-full transition-all duration-300 border cursor-pointer ${
                isHeaderActive
                  ? 'border-[#141414]/30 text-[#141414] hover:border-[#141414]/80 hover:bg-[#141414]/10'
                  : 'border border-white/30 text-white hover:border-white/80 hover:bg-white/10'
              }`}
            >
              Acesso Lojista
            </button>
            <button
              onClick={() => navigateTo('assinar')}
              className={`text-sm font-semibold px-6 py-2.5 rounded-full transition-all duration-300 shadow-md hover:shadow-lg cursor-pointer ${
                isHeaderActive
                  ? 'bg-[#C1F11D] text-[#141414] hover:bg-[#141414] hover:text-white'
                  : 'bg-[#C1F11D] text-[#141414] hover:bg-white hover:text-[#141414]'
              }`}
            >
              Assinar Reservacar
            </button>
          </div>

          {/* Botão Menu Mobile */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={`md:hidden flex flex-col justify-between w-6 h-4 focus:outline-none z-50 cursor-pointer ${isHeaderActive ? 'text-[#141414]' : 'text-white'}`}
            aria-label="Abrir Menu"
          >
            <span className={`w-full h-[2px] bg-current transition-all duration-300 ${isMobileMenuOpen ? 'translate-y-[7px] rotate-45' : ''}`}></span>
            <span className={`w-full h-[2px] bg-current transition-all duration-300 ${isMobileMenuOpen ? 'opacity-0' : ''}`}></span>
            <span className={`w-full h-[2px] bg-current transition-all duration-300 ${isMobileMenuOpen ? '-translate-y-[7px] -rotate-45' : ''}`}></span>
          </button>
        </div>

        {isServicesOpen && (
          <div 
            className="absolute top-full left-0 w-full bg-white border-b border-[#E5E5E2]/80 shadow-xl z-50 animate-[fadeIn_0.25s_ease-out-expo]"
            onMouseEnter={handleServicesEnter}
            onMouseLeave={handleServicesLeave}
          >
            <div 
              className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-12 gap-8 text-left relative text-[#141414]"
              style={{
                animation: 'fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
            >
              {/* Botão de Fechar discreto */}
              <button 
                onClick={() => setIsServicesOpen(false)}
                className="absolute top-4 right-4 text-[#B9B9B4] hover:text-[#5F5F5A] transition cursor-pointer p-1 rounded-full hover:bg-[#EBEBE8]"
                type="button"
                aria-label="Fechar menu"
              >
                <X size={16} />
              </button>

              {/* Coluna 1: Card de Destaque à Esquerda (4/12) */}
              <div className="col-span-4 flex flex-col justify-between border-r border-[#EBEBE8] pr-6">
                <div className="space-y-4">
                  <div className="rounded-xl overflow-hidden aspect-[16/10] bg-gradient-to-br from-[#141414] to-[#2E2E2A] border border-[#EBEBE8]">
                    <img 
                      src="https://i.imgur.com/cv0mLXh.jpeg" 
                      alt="Showroom Reservacar" 
                      className="w-full h-full object-cover opacity-90 hover:scale-102 transition-transform duration-700"
                    />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-[#141414] text-sm tracking-wider uppercase mb-1.5">Showroom Virtual</h4>
                    <p className="text-[#8A8A85] text-xs leading-relaxed font-semibold">
                      A plataforma inteligente para criar propostas, receber sinais Pix e vender veículos como um profissional.
                    </p>
                  </div>
                </div>
                <div className="pt-4">
                  <a 
                    href="#" 
                    onClick={(e) => { e.preventDefault(); setIsServicesOpen(false); navigateTo('login'); }}
                    className="inline-flex items-center gap-1 text-[#141414] hover:text-[#C1F11D] font-bold text-xs group transition-colors"
                  >
                    <span>Conhecer plataforma</span>
                    <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                  </a>
                </div>
              </div>

              {/* Coluna 2: Recursos (5/12) */}
              <div className="col-span-5 flex flex-col justify-between border-r border-[#EBEBE8] pr-6">
                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] font-black text-[#B9B9B4] uppercase tracking-widest block pb-1 border-b border-[#EBEBE8]">Recursos</span>
                  </div>
                  
                  <div className="space-y-3.5">
                    {/* Item 1: Criar proposta */}
                    <a 
                      href="#" 
                      onClick={(e) => { e.preventDefault(); setIsServicesOpen(false); handleHomeAnchor('features'); }}
                      className="flex items-center gap-3.5 group/item text-[#8A8A85] hover:text-[#141414] transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-[#C1F11D]/15 text-[#141414] flex items-center justify-center shrink-0 group-hover/item:bg-[#C1F11D] transition-colors">
                        <Send size={14} />
                      </div>
                      <div>
                        <p className="font-bold text-xs text-[#141414] group-hover/item:text-[#141414]">Criar proposta</p>
                        <p className="text-[10px] text-[#8A8A85] leading-normal font-semibold">Gere propostas personalizadas pelo celular</p>
                      </div>
                    </a>

                    {/* Item 2: Sinal Pix imediato */}
                    <a 
                      href="#" 
                      onClick={(e) => { e.preventDefault(); setIsServicesOpen(false); handleHomeAnchor('features'); }}
                      className="flex items-center gap-3.5 group/item text-[#8A8A85] hover:text-[#141414] transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-[#C1F11D]/15 text-[#141414] flex items-center justify-center shrink-0 group-hover/item:bg-[#C1F11D] transition-colors">
                        <DollarSign size={14} />
                      </div>
                      <div>
                        <p className="font-bold text-xs text-[#141414] group-hover/item:text-[#141414]">Sinal Pix imediato</p>
                        <p className="text-[10px] text-[#8A8A85] leading-normal font-semibold">Receba sinais Pix direto na sua conta</p>
                      </div>
                    </a>

                    {/* Item 3: Garantia de reserva */}
                    <a 
                      href="#" 
                      onClick={(e) => { e.preventDefault(); setIsServicesOpen(false); handleHomeAnchor('features'); }}
                      className="flex items-center gap-3.5 group/item text-[#8A8A85] hover:text-[#141414] transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-[#C1F11D]/15 text-[#141414] flex items-center justify-center shrink-0 group-hover/item:bg-[#C1F11D] transition-colors">
                        <ShieldCheck size={14} />
                      </div>
                      <div>
                        <p className="font-bold text-xs text-[#141414] group-hover/item:text-[#141414]">Garantia de reserva</p>
                        <p className="text-[10px] text-[#8A8A85] leading-normal font-semibold">Segurança jurídica para lojistas e clientes</p>
                      </div>
                    </a>

                    {/* Item 4: Links temporários */}
                    <a 
                      href="#" 
                      onClick={(e) => { e.preventDefault(); setIsServicesOpen(false); handleHomeAnchor('features'); }}
                      className="flex items-center gap-3.5 group/item text-[#8A8A85] hover:text-[#141414] transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-[#C1F11D]/15 text-[#141414] flex items-center justify-center shrink-0 group-hover/item:bg-[#C1F11D] transition-colors">
                        <LinkIcon size={14} />
                      </div>
                      <div>
                        <p className="font-bold text-xs text-[#141414] group-hover/item:text-[#141414]">Links temporários</p>
                        <p className="text-[10px] text-[#8A8A85] leading-normal font-semibold">Gatilho de urgência com cronômetro regressivo</p>
                      </div>
                    </a>

                    {/* Item 5: Painel de estoque */}
                    <a 
                      href="#" 
                      onClick={(e) => { e.preventDefault(); setIsServicesOpen(false); handleHomeAnchor('features'); }}
                      className="flex items-center gap-3.5 group/item text-[#8A8A85] hover:text-[#141414] transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-[#C1F11D]/15 text-[#141414] flex items-center justify-center shrink-0 group-hover/item:bg-[#C1F11D] transition-colors">
                        <Car size={14} />
                      </div>
                      <div>
                        <p className="font-bold text-xs text-[#141414] group-hover/item:text-[#141414]">Painel de estoque</p>
                        <p className="text-[10px] text-[#8A8A85] leading-normal font-semibold">Acompanhe veículos reservados em tempo real</p>
                      </div>
                    </a>
                  </div>
                </div>
              </div>

              {/* Coluna 3: Preços (3/12) */}
              <div className="col-span-3 flex flex-col justify-start">
                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] font-black text-[#B9B9B4] uppercase tracking-widest block pb-1 border-b border-[#EBEBE8]">Preços</span>
                  </div>
                  
                  <div className="pt-2">
                    <a 
                      href="#"
                      onClick={(e) => { e.preventDefault(); setIsServicesOpen(false); navigateTo('pricing'); }}
                      className="group flex flex-col gap-1 text-[#8A8A85] hover:text-[#141414] transition-colors p-2 rounded-xl hover:bg-[#F4F4F2]"
                    >
                      <span className="font-extrabold text-xs text-[#141414] group-hover:text-[#141414] transition-colors">Planos e tarifas</span>
                      <span className="text-[10px] text-[#8A8A85] leading-relaxed font-semibold">Compare a economia em relação a intermediários</span>
                    </a>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}
      </header>

      {/* MENU MOBILE OVERLAY */}
      <div className={`fixed inset-0 bg-[#141414] text-[#F4F4F2] z-40 flex flex-col justify-between p-8 pt-32 transition-all duration-500 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <nav className="flex flex-col gap-6 text-2xl font-bold">
          <a href="#" onClick={(e) => { e.preventDefault(); setIsMobileMenuOpen(false); handleHomeAnchor('features'); }} className="hover:text-[#C1F11D] transition-colors duration-300 inline-block">Funcionalidades</a>
          <a href="#" onClick={(e) => { e.preventDefault(); setIsMobileMenuOpen(false); handleHomeAnchor('simulator'); }} className="hover:text-[#C1F11D] transition-colors duration-300 inline-block">Simulador de Taxas</a>
          <a href="#" onClick={(e) => { e.preventDefault(); setIsMobileMenuOpen(false); navigateTo('pricing'); }} className="hover:text-[#C1F11D] transition-colors duration-300 inline-block">Pricing</a>
          <a href="#" onClick={(e) => { e.preventDefault(); setIsMobileMenuOpen(false); handleHomeAnchor('faq'); }} className="hover:text-[#C1F11D] transition-colors duration-300 inline-block">Perguntas Frequentes</a>
          <a href="#" onClick={(e) => { e.preventDefault(); setIsMobileMenuOpen(false); activePage === 'empresa' ? window.scrollTo({ top: 0, behavior: 'smooth' }) : navigateTo('empresa'); }} className="text-[#C1F11D] transition-colors duration-300 inline-block">Empresa</a>
        </nav>
        <div className="flex flex-col gap-4 mt-auto">
          <button onClick={() => { setIsMobileMenuOpen(false); navigateTo('login'); }} className="w-full text-center border border-white/20 text-white font-semibold py-3.5 rounded-full hover:bg-white/10 transition-colors">Acesso Lojista</button>
          <button onClick={() => { setIsMobileMenuOpen(false); navigateTo('assinar'); }} className="w-full text-center bg-[#C1F11D] text-[#141414] font-semibold py-3.5 rounded-full hover:bg-white transition-colors">Assinar Reservacar</button>
        </div>
      </div>
    </>
  );
}

// --- ABOUT / EMPRESA VIEW ---
function EmpresaView({ navigateTo }) {
  return (
    <div className="bg-[#F4F4F2] text-[#141414] font-sans overflow-x-hidden antialiased min-h-screen relative text-left">
      <style dangerouslySetInnerHTML={{ __html: `
        .premium-shadow {
          box-shadow: 0 20px 40px -15px rgba(20, 20, 20, 0.05);
        }
        .premium-shadow-dark {
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }
        .grid-bg-dark {
          background-color: #141414;
        }
        .grid-bg-light {
          background-color: #f9f9f6;
        }
      `}} />

      <SiteHeader navigateTo={navigateTo} activePage="empresa" />

      {/* HERO SECTION (texto direto, sem ilustração) */}
      <section className="relative bg-[#141414] text-[#F4F4F2] pt-40 pb-24 md:pt-52 md:pb-32 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#C1F11D]/10 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="max-w-3xl mx-auto px-6 relative z-10 text-center space-y-7">
          <div className="inline-flex items-center gap-2 bg-[#C1F11D]/20 text-[#C1F11D] px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest">
            Quem somos
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.1] text-white">
            Transformamos interesse em sinal — <span className="text-[#C1F11D]">na hora certa</span>
          </h1>
          <p className="text-[#B9B9B4] text-lg leading-relaxed max-w-2xl mx-auto">
            O lead some antes de fechar. O Reservacar cria a urgência e o compromisso que faltavam, conectando o interesse ao sinal via Pix em minutos.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <button
              onClick={() => navigateTo('cadastrar-reserva')}
              className="w-full sm:w-auto bg-[#C1F11D] text-[#141414] hover:bg-white transition-all duration-300 font-bold px-8 py-4 rounded-full text-sm cursor-pointer"
            >
              Criar meu primeiro link
            </button>
            <button
              onClick={() => navigateTo('login')}
              className="w-full sm:w-auto border border-white/20 text-white hover:bg-white/5 transition-all duration-300 font-bold px-8 py-4 rounded-full text-sm cursor-pointer"
            >
              Falar com a equipe
            </button>
          </div>
        </div>
      </section>

      {/* SEÇÃO PROBLEMA (curta) */}
      <section className="py-20 bg-[#F4F4F2] text-[#141414] text-center border-y border-[rgba(20,20,20,0.06)]">
        <div className="max-w-3xl mx-auto px-6 space-y-5">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight leading-tight">
            A indecisão do comprador custa caro para quem vende
          </h2>
          <p className="text-[#8A8A85] text-lg leading-relaxed">
            O cliente sai "para pensar" e não volta. A solução não é pressionar mais: é criar o compromisso certo, na hora certa, com a ferramenta certa.
          </p>
        </div>
      </section>

      {/* SEÇÃO NÚMEROS (única, ícones lucide) */}
      <section className="py-20 md:py-28 bg-[#141414] text-[#F4F4F2]">
        <div className="max-w-7xl mx-auto px-6 text-center space-y-14">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight leading-tight max-w-2xl mx-auto">
            Resultado que dá para medir
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
            {[
              { icon: TrendingUp, num: '+73%', title: 'Conversão com urgência', text: 'Propostas com countdown convertem 73% mais que abordagens sem prazo.' },
              { icon: Clock, num: '1h 48m', title: 'Velocidade de fechamento', text: 'Do link ao sinal via Pix, nossos clientes fecham em menos de 2 horas.' },
              { icon: DollarSign, num: 'R$ 2,1Bi', title: 'Em veículos reservados', text: 'Volume de propostas geradas e sinais confirmados desde o lançamento.' },
            ].map((p, i) => (
              <div key={i} className="bg-white/5 p-8 rounded-2xl border border-white/5 space-y-4 hover:border-white/10 transition-all duration-300">
                <div className="w-12 h-12 bg-[#C1F11D]/10 text-[#C1F11D] rounded-xl flex items-center justify-center">
                  <p.icon size={24} />
                </div>
                <span className="text-4xl font-black text-[#C1F11D] block">{p.num}</span>
                <h4 className="text-lg font-bold text-white">{p.title}</h4>
                <p className="text-sm text-[#B9B9B4] leading-relaxed">{p.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SEÇÃO QUOTE / CASE (sem ilustração, centralizado) */}
      <section className="py-20 md:py-28 bg-[#F4F4F2] text-[#141414] border-t border-[rgba(20,20,20,0.06)]">
        <div className="max-w-3xl mx-auto px-6 text-center space-y-6">
          <div className="flex items-center justify-center gap-2 text-xs font-extrabold uppercase tracking-widest text-[#8A8A85]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#C1F11D] inline-block"></span>
            BMW Premium SP
          </div>
          <blockquote className="text-xl md:text-3xl font-bold italic text-[#141414] leading-relaxed">
            "Nosso time parou de perder leads para o silêncio. Em 3 meses, a conversão saiu de 34% para 71%."
          </blockquote>
          <p className="text-sm font-bold text-[#8A8A85]">
            Marcos Souza — Gerente Comercial, BMW Premium SP
          </p>
        </div>
      </section>

      {/* SEÇÃO COMO FUNCIONA */}
      <section className="py-24 bg-white text-[#141414]">
        <div className="max-w-7xl mx-auto px-6 text-center space-y-16">
          <div className="max-w-3xl mx-auto space-y-4">
            <span className="text-xs font-extrabold uppercase tracking-widest text-[#8A8A85] block">Nosso processo</span>
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-tight">
              Como o Reservacar funciona na prática
            </h2>
            <p className="text-[#8A8A85] text-lg leading-relaxed">
              Veja como ajudamos vendedores e concessionárias a transformar interesse em comprometimento financeiro real.
            </p>
          </div>

          {/* Passos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
            {/* Passo 1 */}
            <div className="grid-bg-dark p-10 rounded-3xl border border-[#141414] flex flex-col justify-between hover:border-[#2A2A26] transition-colors duration-200 min-h-[280px] text-white">
              <div className="flex justify-between items-start w-full">
                <h4 className="text-2xl font-bold tracking-tight">Cadastro do veículo</h4>
                <div className="relative text-white/90 shrink-0">
                  <Car className="w-10 h-10" />
                  <div className="absolute -top-1.5 -right-1.5 bg-[#C1F11D] text-[#141414] rounded-full p-0.5 border border-[#141414]">
                    <Check className="w-3 h-3 stroke-[3.5]" />
                  </div>
                </div>
              </div>
              <p className="text-sm text-[#D9D9D5] leading-relaxed pt-16">
                O vendedor seleciona a marca, modelo e ano. O sistema busca o preço FIPE automaticamente e preenche os dados da proposta.
              </p>
            </div>

            {/* Passo 2 */}
            <div className="bg-[#C1F11D] p-10 rounded-3xl flex flex-col justify-between hover:brightness-[1.01] transition-all duration-200 min-h-[280px] text-[#141414]">
              <div className="flex justify-between items-start w-full">
                <h4 className="text-2xl font-bold tracking-tight text-[#141414]">Geração do link</h4>
                <div className="relative text-[#141414] shrink-0">
                  <LinkIcon className="w-10 h-10 rotate-45" />
                  <div className="absolute -bottom-1 -right-1.5 text-[#141414]">
                    <Send className="w-4 h-4 rotate-45 fill-[#141414]" />
                  </div>
                </div>
              </div>
              <p className="text-sm text-[#141414]/90 leading-relaxed pt-16">
                Um link exclusivo é criado com countdown de urgência, valor do sinal e botão de Pix. Tudo em menos de 60 segundos.
              </p>
            </div>

            {/* Passo 3 */}
            <div className="grid-bg-dark p-10 rounded-3xl border border-[#141414] flex flex-col justify-between hover:border-[#2A2A26] transition-colors duration-200 min-h-[280px] text-white">
              <div className="flex justify-between items-start w-full">
                <h4 className="text-2xl font-bold tracking-tight">Compartilhamento</h4>
                <div className="relative text-white/90 shrink-0">
                  <MessageCircle className="w-10 h-10" />
                  <div className="absolute -top-1.5 -right-1.5 bg-[#C1F11D] text-[#141414] rounded-full p-0.5 border border-[#141414]">
                    <Send className="w-3 h-3 stroke-[2.5]" />
                  </div>
                </div>
              </div>
              <p className="text-sm text-[#D9D9D5] leading-relaxed pt-16">
                O vendedor envia o link pelo WhatsApp. O comprador acessa a proposta personalizada e vê o cronômetro contando.
              </p>
            </div>

            {/* Passo 4 */}
            <div className="bg-[#C1F11D] p-10 rounded-3xl flex flex-col justify-between hover:brightness-[1.01] transition-all duration-200 min-h-[280px] text-[#141414]">
              <div className="flex justify-between items-start w-full">
                <h4 className="text-2xl font-bold tracking-tight text-[#141414]">Sinal confirmado</h4>
                <div className="relative text-[#141414] shrink-0">
                  <ShieldCheck className="w-10 h-10" />
                  <div className="absolute -top-1.5 -right-1.5 text-[#141414]">
                    <Sparkles className="w-4 h-4 fill-current" />
                  </div>
                </div>
              </div>
              <p className="text-sm text-[#141414]/90 leading-relaxed pt-16">
                O comprador paga o sinal via Pix diretamente na página. O vendedor recebe a notificação em tempo real no painel.
              </p>
            </div>
          </div>

          <div className="pt-8">
            <button 
              onClick={() => navigateTo('login')}
              className="mx-auto bg-[#141414] text-[#C1F11D] hover:bg-[#C1F11D] hover:text-[#141414] transition-all duration-300 font-bold px-8 py-4 rounded-full flex items-center justify-center gap-2 shadow-lg shadow-[#141414]/10 text-sm cursor-pointer"
            >
              <PlusCircle size={16} />
              Criar minha conta grátis
            </button>
          </div>
        </div>
      </section>

      {/* SEÇÃO OUTRAS SOLUÇÕES */}
      <section className="py-24 bg-[#F4F4F2] text-[#141414] border-b border-[rgba(20,20,20,0.06)]">
        <div className="max-w-7xl mx-auto px-6 text-center space-y-16">
          <div className="max-w-3xl mx-auto space-y-4">
            <span className="text-xs font-extrabold uppercase tracking-widest text-[#8A8A85] block">Conheça outras soluções</span>
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-tight">
              Tudo que você precisa para vender mais
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
            <LinkGeneratorPreview navigateTo={navigateTo} />
            <LiveDashboardPreview navigateTo={navigateTo} />
            <RankingGamificationPreview navigateTo={navigateTo} />
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#141414] text-[#F4F4F2] py-16 text-left">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            {/* Coluna 1 */}
            <div className="space-y-4">
              <div className="flex items-center gap-1.5 text-xl font-extrabold tracking-tight">
                <div className="w-8 h-8 bg-[#C1F11D] rounded-lg flex items-center justify-center">
                  <Car size={18} className="text-[#141414]" />
                </div>
                <span className="font-black">Reservacar</span>
              </div>
              <p className="text-xs text-[#8A8A85] leading-relaxed">
                Acelere o seu processo de vendas e elimine a hesitação. Propostas personalizadas com fechamento imediato via Pix direto.
              </p>
            </div>
            
            {/* Coluna 2 */}
            <div className="space-y-4">
              <h4 className="text-white font-bold text-sm">Empresa</h4>
              <ul className="space-y-2 text-xs text-[#8A8A85]">
                <li><a href="#" onClick={(e) => { e.preventDefault(); navigateTo('home'); }} className="hover:text-white transition">Início</a></li>
                <li><a href="#" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-white transition">Sobre Nós</a></li>
                <li><a href="#" onClick={(e) => { e.preventDefault(); navigateTo('assinar'); }} className="hover:text-white transition">Planos</a></li>
              </ul>
            </div>

            {/* Coluna 3 */}
            <div className="space-y-4">
              <h4 className="text-white font-bold text-sm">Links Úteis</h4>
              <ul className="space-y-2 text-xs text-[#8A8A85]">
                <li><a href="#" onClick={(e) => { e.preventDefault(); navigateTo('login'); }} className="hover:text-white transition">Acesso Lojista</a></li>
                <li><a href="#" onClick={(e) => { e.preventDefault(); navigateTo('cadastrar-reserva'); }} className="hover:text-white transition">Simulador Cliente</a></li>
              </ul>
            </div>

            {/* Coluna 4 */}
            <div className="space-y-4">
              <h4 className="text-white font-bold text-sm">Suporte</h4>
              <ul className="space-y-2 text-xs text-[#8A8A85]">
                <li><a href="mailto:suporte@reservacar.com.br" className="hover:text-white transition">suporte@reservacar.com.br</a></li>
                <li><span className="text-[10px] bg-white/5 text-[#C1F11D] px-2.5 py-1 rounded-full font-bold inline-block">Atendimento 24h</span></li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pt-8 border-t border-white/5 gap-4 mt-12">
            <span className="text-[11px] font-semibold text-[#6F6F6A]">© 2026 Reservacar Ltda. Todos os direitos reservados. CNPJ 12.345.678/0001-90.</span>
            <div className="flex gap-4 text-xs font-semibold text-[#8A8A85]">
              <a href="#" className="hover:text-white transition">Privacidade</a>
              <a href="#" className="hover:text-white transition">Termos</a>
              <a href="#" className="hover:text-white transition">Cookies</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// --- LOGIN VIEW ---
function LoginView({ navigateTo, setCurrentUserRole, onAuthenticated }) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'error' | 'info'; text: string } | null>(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg(null);
    if (!isSupabaseConfigured) {
      setMsg({ type: 'error', text: 'Supabase não configurado — preencha o .env e reinicie o dev.' });
      return;
    }
    setLoading(true);
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email: email.trim(), password });
        if (error) throw error;
        setMsg({ type: 'info', text: 'Conta criada! Enviamos um link de confirmação ao seu e-mail. Confirme e depois faça login.' });
        setMode('login');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        await onAuthenticated();
      }
    } catch (err: any) {
      const m = String(err?.message || 'Erro inesperado');
      setMsg({
        type: 'error',
        text: m.includes('Email not confirmed') ? 'E-mail ainda não confirmado. Verifique sua caixa de entrada.'
          : m.includes('Invalid login') ? 'E-mail ou senha inválidos.'
          : m.includes('already registered') ? 'Este e-mail já tem conta. Faça login.'
          : m,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-[#F4F4F2]">
      
      {/* Coluna Esquerda: Banner Visual do Showroom */}
      <div className="hidden lg:flex flex-col justify-between p-16 bg-[#141414] relative overflow-hidden text-left min-h-screen">
        {/* Fundo puramente sólido sem linhas verticais decorativas ou glows/blur decorativos (removidos por solicitação do usuário) */}

        {/* Logo superior */}
        <div className="z-10">
          <a href="#" onClick={(e) => { e.preventDefault(); navigateTo('home'); }} className="flex items-center gap-1.5 text-2xl font-extrabold tracking-tight text-white">
            <div className="w-8 h-8 bg-[#C1F11D] rounded-lg flex items-center justify-center">
              <Car size={18} className="text-[#141414]" />
            </div>
            <span className="font-black">Reservacar</span>
            <span className="text-[10px] font-bold align-super text-[#C1F11D]">®</span>
          </a>
        </div>

        {/* Mensagem Principal */}
        <div className="z-10 max-w-xl my-auto">
          <h1 className="text-4xl lg:text-5xl font-black text-white leading-[1.1] tracking-tight">
            Acelerador de escassez e reservas digitais para o seu showroom.
          </h1>
          <p className="text-[#B9B9B4] text-sm mt-6 leading-relaxed max-w-md">
            A plataforma definitiva para concessionárias e lojistas gerenciarem propostas de reserva com agilidade, segurança e inteligência de vendas.
          </p>
        </div>

        {/* Direitos Autorais na base */}
        <div className="z-10 flex items-center justify-between text-xs text-[#8A8A85] font-medium">
          <span>© {new Date().getFullYear()} Reservacar S.A.</span>
          <div className="flex gap-4">
            <a href="#" className="hover:text-[#D9D9D5] transition">Privacidade</a>
            <a href="#" className="hover:text-[#D9D9D5] transition">Termos</a>
          </div>
        </div>
      </div>

      {/* Coluna Direita: Formulário de Login */}
      <div className="flex flex-col justify-center px-8 sm:px-16 lg:px-24 bg-[#F4F4F2] relative min-h-screen text-left">
        {/* Logo visível apenas no mobile */}
        <div className="lg:hidden absolute top-8 left-8">
          <a href="#" onClick={(e) => { e.preventDefault(); navigateTo('home'); }} className="flex items-center gap-1.5 text-xl font-extrabold tracking-tight text-[#141414]">
            <div className="w-8 h-8 bg-[#141414] rounded-lg flex items-center justify-center">
              <Car size={16} className="text-[#C1F11D]" />
            </div>
            <span className="font-black">Reservacar</span>
          </a>
        </div>

        <div className="w-full max-w-md mx-auto space-y-8">
          {/* Cabeçalho do Formulário (Ícone e Título) */}
          <div className="space-y-3">
            {/* Ícone de sol decorativo igual ao anexo */}
            <div className="w-10 h-10 bg-amber-500/10 text-amber-600 rounded-full flex items-center justify-center">
              <Sun size={20} className="stroke-[2px]" />
            </div>
            <div className="space-y-1">
              <h2 className="text-3xl font-black text-[#141414] tracking-tight">Acesso Lojista</h2>
              <p className="text-[#8A8A85] font-medium text-sm">
                Bem-vindo ao Reservacar. Faça login na sua conta corporativa.
              </p>
            </div>
          </div>

          {/* Seletor Entrar / Criar conta */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-[#EBEBE8] rounded-2xl border border-[#E5E5E2]">
            <button
              type="button"
              onClick={() => { setMode('login'); setMsg(null); }}
              className={`py-3 px-4 rounded-xl text-xs font-bold transition-all duration-150 ${
                mode === 'login' ? 'bg-[#141414] text-[#C1F11D]' : 'text-[#8A8A85] hover:text-[#141414] bg-transparent'
              }`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setMsg(null); }}
              className={`py-3 px-4 rounded-xl text-xs font-bold transition-all duration-150 ${
                mode === 'signup' ? 'bg-[#141414] text-[#C1F11D]' : 'text-[#8A8A85] hover:text-[#141414] bg-transparent'
              }`}
            >
              Criar conta
            </button>
          </div>

          {msg && (
            <div className={`rounded-2xl px-4 py-3 text-xs font-semibold leading-relaxed ${
              msg.type === 'error' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-[#C1F11D]/15 text-[#141414] border border-[#C1F11D]/40'
            }`}>
              {msg.text}
            </div>
          )}

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#8A8A85] uppercase tracking-wider">
                E-mail Corporativo
              </label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white border border-[#E5E5E2] rounded-2xl px-4 py-3.5 text-[#2A2A26] focus:border-[#141414] focus:ring-1 focus:ring-[#141414] focus:outline-none transition font-medium"
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-bold text-[#8A8A85] uppercase tracking-wider">
                  Senha
                </label>
                <a href="#" className="text-xs font-semibold text-[#141414] hover:underline">
                  Esqueceu a senha?
                </a>
              </div>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white border border-[#E5E5E2] rounded-2xl px-4 py-3.5 text-[#2A2A26] focus:border-[#141414] focus:ring-1 focus:ring-[#141414] focus:outline-none transition font-medium"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#141414] hover:bg-[#2A2A26] text-white font-bold rounded-2xl py-4 mt-2 transition duration-200 shadow-sm flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading && <RefreshCw size={16} className="animate-spin" />}
              {loading ? 'Aguarde...' : mode === 'signup' ? 'Criar conta' : 'Entrar no Sistema'}
            </button>
          </form>

          {/* Rodapé do mobile */}
          <div className="lg:hidden text-center text-xs text-[#B9B9B4] font-medium pt-8">
            © {new Date().getFullYear()} Reservacar S.A.
          </div>
        </div>
      </div>

    </div>
  );
}

// --- HUB VIEW (CHOOSE PANEL) ---
function HubView({ navigateTo, reservasUsadas, totalReservasPlano, liveNotifications, empresaLogada }) {
  const reservasDisponiveis = totalReservasPlano - reservasUsadas;
  const percentagemUso = Math.min((reservasUsadas / totalReservasPlano) * 100, 100);

  return (
    <div className="min-h-screen pt-32 pb-20 px-6 md:px-12 bg-[#f8f9fa] flex flex-col items-center">
      <div className="w-full max-w-[1600px] mb-8 text-left">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-[#141414] tracking-tight">Olá, Marcos</h1>
            <p className="text-[#8A8A85] text-sm mt-1 font-medium">
              {empresaLogada?.nome || 'BMW Premium SP'} · Central de Vendas
            </p>
          </div>
          <div className="bg-[#C1F11D] border border-[#141414]/25 rounded-full px-4 py-2 flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-[#141414] animate-pulse"></span>
            <span className="font-extrabold text-[#141414] uppercase tracking-wider">Showroom conectado</span>
          </div>
        </div>

        {/* Credit System Visual Widget */}
        <div className="mt-8 bg-white border border-[#E5E5E2] rounded-3xl p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-8 relative overflow-hidden">
          {/* Left Column: Plano Info */}
          <div className="flex flex-col min-w-[200px]">
            <span className="text-[10px] font-semibold text-[#B9B9B4] uppercase tracking-widest mb-1.5">PLANO ATUAL</span>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl font-bold text-[#141414] tracking-tight">
                {empresaLogada?.planoAtivo || 'Plus'}
              </span>
              <span className="border border-[#C1F11D]/30 bg-[#C1F11D]/20 text-[#141414] text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                ATIVO
              </span>
            </div>
            <p className="text-xs text-[#B9B9B4] font-medium">Renova-se em 10/06/2026</p>
          </div>

          {/* Middle Column: Credits Progress */}
          <div className="w-full md:max-w-md flex-1 text-left">
            <div className="flex justify-between items-center text-[10px] font-bold text-[#6F6F6A] mb-1.5 uppercase tracking-wider">
              <span>USO DO PLANO</span>
              <span className="text-[#141414] text-xs font-bold">{reservasUsadas}/{totalReservasPlano}</span>
            </div>
            <div className="w-full bg-[#EBEBE8]/80 h-2.5 rounded-full overflow-hidden mb-2 border border-[#E5E5E2]/60">
              <div 
                className="h-full rounded-full transition-all duration-1000 bg-[#141414]" 
                style={{ width: `${percentagemUso}%` }}
              ></div>
            </div>
            <p className="text-[10px] font-bold text-[#5F5F5A] uppercase tracking-wider">
              {reservasDisponiveis} LINKS DISPONÍVEIS
            </p>
          </div>

          {/* Right Column: Upgrade Button */}
          <div className="w-full md:w-auto flex justify-end md:justify-start">
            <button 
              onClick={() => navigateTo('configuracoes')}
              className="w-full md:w-auto bg-[#141414] hover:bg-[#2A2A26] text-[#F4F4F2] font-bold text-xs px-6 py-3.5 rounded-xl transition duration-200 flex items-center justify-center gap-2 uppercase tracking-wider"
            >
              <ArrowUp size={14} className="stroke-[2.5px]" /> Fazer upgrade
            </button>
          </div>
        </div>
      </div>

      {/* Grid of Key Performance Indicators (SaaS Style) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 w-full max-w-[1600px] text-left">
        <div className="bg-white border border-[#E5E5E2] p-6 rounded-3xl">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-semibold text-[#B9B9B4] uppercase tracking-widest">PROPOSTAS ATIVAS</span>
            <div className="w-8 h-8 bg-[#C1F11D]/20 text-[#141414] rounded-lg flex items-center justify-center shrink-0">
              <LinkIcon size={16} />
            </div>
          </div>
          <span className="block text-3xl font-bold tracking-tight text-[#141414] mb-1">7</span>
          <span className="text-xs text-[#141414] font-bold flex items-center gap-1">
            <ArrowUpRight size={14} className="stroke-[2.5px]" /> 3 novas hoje
          </span>
        </div>
        
        <div className="bg-white border border-[#E5E5E2] p-6 rounded-3xl">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-semibold text-[#B9B9B4] uppercase tracking-widest">TAXA DE CONVERSÃO</span>
            <div className="w-8 h-8 bg-[#C1F11D]/15 text-[#141414] rounded-lg flex items-center justify-center shrink-0 border border-[#C1F11D]/30">
              <TrendingUp size={16} />
            </div>
          </div>
          <span className="block text-3xl font-bold tracking-tight text-[#141414] mb-1">71%</span>
          <span className="text-xs text-[#141414] font-bold flex items-center gap-1">
            <ArrowUpRight size={14} className="stroke-[2.5px]" /> +8% vs mês anterior
          </span>
        </div>

        <div className="bg-white border border-[#E5E5E2] p-6 rounded-3xl">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-semibold text-[#B9B9B4] uppercase tracking-widest">SINAL EM CAIXA</span>
            <div className="w-8 h-8 bg-[#C1F11D]/20 text-[#141414] rounded-lg flex items-center justify-center shrink-0">
              <DollarSign size={16} />
            </div>
          </div>
          <span className="block text-3xl font-bold tracking-tight text-[#141414] mb-1">R$ 42k</span>
          <span className="text-xs text-[#B9B9B4] font-medium">Este mês</span>
        </div>

        <div className="bg-white border border-[#E5E5E2] p-6 rounded-3xl">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-semibold text-[#B9B9B4] uppercase tracking-widest">VELOCIDADE MÉDIA</span>
            <div className="w-8 h-8 bg-[#C1F11D]/20 text-[#141414] rounded-lg flex items-center justify-center shrink-0">
              <Clock size={16} />
            </div>
          </div>
          <span className="block text-3xl font-bold tracking-tight text-[#141414] mb-1">1h 48m</span>
          <span className="text-xs text-[#141414] font-bold flex items-center gap-1">
            <ArrowUpRight size={14} className="stroke-[2.5px]" /> Fechamento rápido
          </span>
        </div>
      </div>

      <div className="w-full max-w-[1600px] grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
        
        {/* Module Choice Column (Spans 2 columns on desktop) */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6 items-stretch">
          <button 
            onClick={() => navigateTo('sales-stats')}
            className="bg-white border border-[#E5E5E2] rounded-[32px] p-8 flex flex-col items-start hover:border-[#B9B9B4] transition duration-200 group text-left"
          >
            <div className="flex items-center gap-1.5 text-[#141414] bg-[#C1F11D] border border-[#141414]/10 px-3 py-1.5 rounded-xl text-[9px] font-bold uppercase tracking-wider mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-[#141414] animate-ping"></span>
              Atividade ao vivo
            </div>
            <div className="w-14 h-14 bg-[#C1F11D]/20 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-[#141414] transition duration-200">
              <BarChart2 size={24} className="text-[#141414] group-hover:text-white transition duration-200" />
            </div>
            <h2 className="text-xl font-bold text-[#141414] mb-2 group-hover:text-[#141414] transition duration-200">Painel de vendas</h2>
            <p className="text-[#8A8A85] font-medium text-xs leading-relaxed mb-8">Acompanhe propostas ativas, visualize o fluxo do cliente e registre pagamentos em tempo real.</p>
            <div className="mt-auto w-10 h-10 border border-[#E5E5E2] rounded-full flex items-center justify-center group-hover:bg-[#141414] group-hover:text-white transition duration-200">
              <ArrowRight size={16} />
            </div>
          </button>

          <button 
            onClick={() => navigateTo('dashboard')}
            className="bg-white border border-[#E5E5E2] rounded-[32px] p-8 flex flex-col items-start hover:border-[#B9B9B4] transition duration-200 group text-left"
          >
            <div className="w-14 h-14 bg-[#C1F11D]/20 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-[#141414] transition duration-200 mt-[46px]">
              <LinkIcon size={24} className="text-[#141414] group-hover:text-white transition duration-200" />
            </div>
            <h2 className="text-xl font-bold text-[#141414] mb-2 group-hover:text-[#141414] transition duration-200">Nova proposta</h2>
            <p className="text-[#8A8A85] font-medium text-xs leading-relaxed mb-8">Crie páginas de reserva instantâneas, consulte tabela FIPE e monte checklists por lead.</p>
            <div className="mt-auto w-10 h-10 border border-[#E5E5E2] rounded-full flex items-center justify-center group-hover:bg-[#141414] group-hover:text-white transition duration-200">
              <ArrowRight size={16} />
            </div>
          </button>
        </div>

        {/* Live Notification Activity Ticker */}
        <div className="bg-white border border-[#E5E5E2] rounded-[32px] p-6 flex flex-col h-full min-h-[350px]">
          <div className="flex justify-between items-center mb-6 border-b border-[#EBEBE8] pb-4">
            <h3 className="text-[10px] font-bold text-[#B9B9B4] uppercase tracking-widest flex items-center gap-1.5">
              <Bell size={14} className="text-[#141414]" />
              Notificações
            </h3>
            <span className="flex items-center gap-1 text-[9px] font-bold text-[#141414] uppercase tracking-wider bg-[#C1F11D]/15 px-2 py-1 rounded-md border border-[#C1F11D]/30">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C1F11D] animate-pulse"></span>
              Ao vivo
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 max-h-[360px] pr-1">
            {liveNotifications.map(notif => {
              let labelColor = 'text-[#141414]';
              let bgColor = 'bg-[#C1F11D]/10';
              if (notif.type === 'pix') {
                labelColor = 'text-[#141414]';
                bgColor = 'bg-[#C1F11D]/10';
              } else if (notif.type === 'urgente') {
                labelColor = 'text-amber-700';
                bgColor = 'bg-amber-50/30';
              } else if (notif.type === 'create') {
                labelColor = 'text-[#141414]';
                bgColor = 'bg-[#C1F11D]/10';
              }
              
              return (
                <div key={notif.id} className="text-xs bg-[#F4F4F2] border border-[#E5E5E2] p-4 rounded-2xl flex flex-col gap-1 relative hover:border-[#D9D9D5] transition-colors duration-200 animate-fade-in-down">
                  <div className="flex items-center gap-1.5 font-bold uppercase text-[9px] tracking-wider">
                    <span className={labelColor}>{notif.label || 'ATIVIDADE'}</span>
                  </div>
                  <p className="font-semibold text-[#2A2A26] text-[11px] leading-snug mt-1.5 pr-14">{notif.text}</p>
                  <span className="text-[9px] text-[#B9B9B4] font-medium absolute bottom-3 right-4">{notif.time}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- SALES STATS VIEW (LIVE FEED) ---
function SalesStatsView({ navigateTo, temaBlack = false, reservasUsadas, totalReservasPlano, recentReservations, setRecentReservations, liveNotifications, showToast, empresaLogada, setReservaParaGerenciar }) {
  const reservasDisponiveis = totalReservasPlano - reservasUsadas;

  // Acha a proposta ativa mais urgente para exibir no cabeçalho
  const urgenteReserva = useMemo(() => {
    const ativas = recentReservations.filter((r: any) => r.status === 'Active');
    if (ativas.length === 0) return null;
    
    return ativas.reduce((maisUrgente: any, atual: any) => {
      const restMaisUrgente = maisUrgente.expiracao * 60 - (maisUrgente.elapsedSeconds || 0);
      const restAtual = atual.expiracao * 60 - (atual.elapsedSeconds || 0);
      return restAtual < restMaisUrgente ? atual : maisUrgente;
    });
  }, [recentReservations]);

  const tempoRestanteSegundos = urgenteReserva 
    ? (urgenteReserva.expiracao * 60 - (urgenteReserva.elapsedSeconds || 0)) 
    : 0;

  const obterNomeSimplificado = (title: string) => {
    if (!title) return '';
    const partes = title.split(' ');
    let p1 = partes[0] === 'Mercedes-Benz' ? 'Mercedes' : partes[0];
    let p2 = partes[1] || '';
    return `${p1} ${p2}`.trim();
  };

  // Tempo restante legível: 5h 56m / 7m 04s / 12s (evita "356m 41s")
  const formatTempoRestante = (segundos: number) => {
    const h = Math.floor(segundos / 3600);
    const m = Math.floor((segundos % 3600) / 60);
    const s = segundos % 60;
    if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m`;
    if (m > 0) return `${m}m ${s.toString().padStart(2, '0')}s`;
    return `${s}s`;
  };

  // Ticker de atividade: a faixa do topo (desktop e mobile) cicla a reserva
  // ativa + as últimas notificações do sino, deslizando da direita p/ esquerda.
  // Quando só há 1 item, fica estático (sem slide), mantendo o dot piscando.
  const tickerItems: any[] = [];
  if (urgenteReserva && tempoRestanteSegundos > 0) {
    tickerItems.push({ key: 'reserva', tipo: 'reserva', urgent: tempoRestanteSegundos < 300 });
  }
  (liveNotifications || []).slice(0, 6).forEach((n: any) => {
    tickerItems.push({ key: n.id, tipo: n.type, label: n.label, text: n.text, urgent: n.type === 'urgente' });
  });
  const [tickerIdx, setTickerIdx] = useState(0);
  useEffect(() => {
    if (tickerItems.length <= 1) { setTickerIdx(0); return; }
    const t = setInterval(() => setTickerIdx((i) => (i + 1) % tickerItems.length), 4000);
    return () => clearInterval(t);
  }, [tickerItems.length]);
  const tIdx = tickerItems.length ? tickerIdx % tickerItems.length : 0;
  const tItem = tickerItems[tIdx];
  const tAnim = tickerItems.length > 1 ? 'animate-ticker-in' : '';
  const tNome = urgenteReserva ? obterNomeSimplificado(urgenteReserva.title) : '';
  const tLabel = tItem
    ? (tItem.tipo === 'reserva' ? (tItem.urgent ? 'Expira em instantes' : 'Reserva ativa') : tItem.label)
    : '';


  // Timer regressivo a cada segundo para decrementar o tempo de expiração simulado das propostas ativas.
  // Ao esgotar o tempo, a proposta expira SOZINHA (o cliente já vê o link como expirado; o painel
  // precisa refletir o mesmo estado). Sem propostas ativas, devolve a mesma referência para o React
  // pular o re-render (evita repintar o painel inteiro a cada segundo à toa).
  useEffect(() => {
    const timer = setInterval(() => {
      setRecentReservations((prev: any) => {
        let mudou = false;
        const next = prev.map((res: any) => {
          if (res.status !== 'Active') return res;
          mudou = true;
          const limit = res.expiracao * 60;
          const elapsed = res.elapsedSeconds || 0;
          if (elapsed < limit) {
            return { ...res, elapsedSeconds: elapsed + 1 };
          }
          return {
            ...res,
            status: 'Expired',
            logs: [...(res.logs || []), {
              time: new Date().toLocaleTimeString('pt-BR') + ' de ' + new Date().toLocaleDateString('pt-BR'),
              text: 'Link expirado automaticamente ao fim do cronômetro.'
            }]
          };
        });
        return mudou ? next : prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [setRecentReservations]);

  // Estados de Filtro e Ordenação
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'aguardando' | 'urgentes' | 'confirmados'>('todos');
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
  // Layout dos KPIs no mobile: empilhado (1 por linha, default) ou grade (2 por linha).
  const [kpiLayout, setKpiLayout] = useState<'stack' | 'grid'>(() => {
    try { return (localStorage.getItem('kpiLayout') as 'stack' | 'grid') || 'stack'; } catch { return 'stack'; }
  });
  const changeKpiLayout = (v: 'stack' | 'grid') => {
    setKpiLayout(v);
    try { localStorage.setItem('kpiLayout', v); } catch {}
  };

  // Cálculos 100% dinâmicos baseados no estado real das reservas
  const totalResgatesAtivos = recentReservations.filter(r => r.status === 'Active').length;
  const totalCriadasAcumulado = recentReservations.length;
  // Modal de confirmação da exportação do relatório da loja (PDF/Markdown)
  const [exportarAberto, setExportarAberto] = useState(false);
  const confirmarExportacao = (formato: 'pdf' | 'markdown') => {
    const rel = montarRelatorioLoja(recentReservations, empresaLogada, reservasUsadas, totalReservasPlano);
    const ok = formato === 'pdf' ? gerarPdfRelatorio(rel) : gerarMarkdownRelatorio(rel);
    if (!ok) {
      showToast('O navegador bloqueou a janela do PDF. Libere pop-ups e tente de novo.', 'error');
      return;
    }
    registrarExportacao({ formato, qtd: rel.linhas.length, loja: rel.loja.nome });
    showToast(formato === 'pdf' ? 'Relatório aberto para impressão/PDF.' : 'Relatório Markdown baixado.', 'success');
    setExportarAberto(false);
  };
  const concluidasAcumuladas = recentReservations.filter(r => r.status === 'Completed' || r.paidSignal).length;
  const conversaoLiquida = totalCriadasAcumulado > 0 
    ? Math.round((concluidasAcumuladas / totalCriadasAcumulado) * 100) 
    : 0;

  const totalSinalCaixa = recentReservations
    .filter(r => r.status === 'Completed' || r.paidSignal)
    .reduce((acc, r) => acc + (Number(r.sinal) || 0), 0);
  const formatSinalCaixa = totalSinalCaixa >= 1000 
    ? `R$ ${(totalSinalCaixa / 1000).toFixed(1)}k` 
    : `R$ ${totalSinalCaixa}`;

  // 4. Velocidade Média: elapsedSeconds médio das propostas pagas, com 1h 48m de fallback
  const reservasPagas = recentReservations.filter(r => r.status === 'Completed' || r.paidSignal);
  const mediaSegundos = reservasPagas.length > 0
    ? reservasPagas.reduce((acc, r) => acc + (r.elapsedSeconds || 0), 0) / reservasPagas.length
    : 6480; // 1h 48m (108 minutos)

  const formatVelocidadeMedia = (segundos) => {
    const horas = Math.floor(segundos / 3600);
    const minutos = Math.floor((segundos % 3600) / 60);
    if (horas > 0) return `${horas}h ${minutos}m`;
    return `${minutos}m`;
  };
  const velocidadeMediaText = formatVelocidadeMedia(mediaSegundos);

  // Contadores para os badges das abas
  const countTodos = recentReservations.length;
  const countAguardando = recentReservations.filter(r => r.status === 'Active' && (r.expiracao * 60 - (r.elapsedSeconds || 0)) >= 300).length;
  const countUrgentes = recentReservations.filter(r => r.status === 'Active' && (r.expiracao * 60 - (r.elapsedSeconds || 0)) < 300).length;
  const countConfirmados = recentReservations.filter(r => r.status === 'Completed' || r.paidSignal).length;

  // Filtragem da lista
  const filteredReservations = recentReservations.filter((res) => {
    const isCompleted = res.status === 'Completed' || res.paidSignal;
    const totalSeconds = res.expiracao * 60;
    const remainingSeconds = totalSeconds - (res.elapsedSeconds || 0);
    const isUrgente = res.status === 'Active' && remainingSeconds < 300;
    const isAguardando = res.status === 'Active' && remainingSeconds >= 300;

    if (filtroStatus === 'aguardando') return isAguardando;
    if (filtroStatus === 'urgentes') return isUrgente;
    if (filtroStatus === 'confirmados') return isCompleted;
    return true; // 'todos'
  });

  const totalExpiradas = recentReservations.filter(r => r.status === 'Expired').length;

  // Distribuição de receita pelos dias da semana baseado no caixa real para simular reatividade perfeita
  const totalCaixaReal = totalSinalCaixa;
  const diasSemana = useMemo(() => {
    const proporcoes = [0.05, 0.10, 0.12, 0.15, 0.25, 0.30, 0.03];
    const nomes = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
    const valores = nomes.map((label, idx) => {
      const valor = totalCaixaReal * proporcoes[idx];
      return { label, valor };
    });
    const maxVal = Math.max(...valores.map(v => v.valor), 1);
    return valores.map(v => ({
      ...v,
      porcentagem: Math.max(8, Math.round((v.valor / maxVal) * 100))
    }));
  }, [totalCaixaReal]);

  // Parâmetros do gráfico de linha SVG
  const chartWidth = 600;
  const chartHeight = 200;
  const paddingX = 40;
  const paddingY = 25;

  // Cores do gráfico conscientes do tema: as cores são atributos SVG (não
  // classes), então o remapeamento CSS do .theme-black não as alcança — sem
  // isto, a linha/área/pontos escuros somem no card de vidro escuro e o grid
  // branco fica berrante. No black a linha inverte p/ clara e o anel dos pontos
  // p/ escuro (o inverso da linha, p/ separar o ponto do card).
  const chartColors = temaBlack
    ? { line: '#F4F4F2', area: '#F4F4F2', grid: 'rgba(255,255,255,0.09)', dot: '#F4F4F2', dotRing: '#131316' }
    : { line: '#141414', area: '#141414', grid: '#F1F5F9', dot: '#141414', dotRing: '#FFFFFF' };

  const chartPoints = useMemo(() => {
    return diasSemana.map((dia, idx) => {
      const x = paddingX + ((chartWidth - 2 * paddingX) / 6) * idx;
      // Invertermos o eixo Y: 100% de porcentagem fica no topo (paddingY), 0% fica na base (chartHeight - paddingY)
      const y = paddingY + (chartHeight - 2 * paddingY) * (1 - dia.porcentagem / 100);
      return { x, y, ...dia, index: idx };
    });
  }, [diasSemana]);

  const linePath = useMemo(() => {
    if (chartPoints.length === 0) return '';
    return chartPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  }, [chartPoints]);

  const areaPath = useMemo(() => {
    if (chartPoints.length === 0) return '';
    const firstPoint = chartPoints[0];
    const lastPoint = chartPoints[chartPoints.length - 1];
    return `M ${firstPoint.x} ${chartHeight - paddingY} ` +
      chartPoints.map(p => `L ${p.x} ${p.y}`).join(' ') +
      ` L ${lastPoint.x} ${chartHeight - paddingY} Z`;
  }, [chartPoints]);

  // Ranking de vendedores calculados dinamicamente
  const rankingVendedores = useMemo(() => {
    const nomes = (empresaLogada?.vendedores || [])
      .map((v: any) => v?.nome)
      .filter((nome: any) => typeof nome === 'string' && nome.trim().length > 0);
    const dados = nomes.map((nome: string) => {
      const reservasDoVendedor = recentReservations.filter((r: any) => r.vendedores === nome || (r.vendedores && r.vendedores.includes(nome)));
      const total = reservasDoVendedor.length;
      const pagas = reservasDoVendedor.filter((r: any) => r.status === 'Completed' || r.paidSignal).length;
      const conversao = total > 0 ? Math.round((pagas / total) * 100) : 0;
      return { nome, total, pagas, conversao };
    });
    return dados.sort((a, b) => b.conversao - a.conversao);
  }, [recentReservations, empresaLogada]);

  // Simulator helpers
  const handleSimulatePayment = (resId, clientName) => {
    setRecentReservations((prev: any) => prev.map(item => {
      if (item.id === resId) {
        const novosLogs = [...(item.logs || [])];
        novosLogs.push({
          time: new Date().toLocaleTimeString('pt-BR') + ' de ' + new Date().toLocaleDateString('pt-BR'),
          text: `Sinal de R$ ${Number(item.sinal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} pago via PIX.`
        });
        return { ...item, status: 'Completed', paidSignal: true, logs: novosLogs };
      }
      return item;
    }));
    showToast(`Pagamento do sinal confirmado para ${clientName}!`, 'success');
  };

  const handleSimulateTimeExpiration = (resId) => {
    setRecentReservations((prev: any) => prev.map(item => {
      if (item.id === resId) {
        const novosLogs = [...(item.logs || [])];
        novosLogs.push({
          time: new Date().toLocaleTimeString('pt-BR') + ' de ' + new Date().toLocaleDateString('pt-BR'),
          text: 'Link de proposta expirado por inatividade.'
        });
        return { ...item, status: 'Expired', elapsedSeconds: item.expiracao * 60, logs: novosLogs };
      }
      return item;
    }));
    showToast(`Proposta expirada.`, 'info');
  };

  return (
    <div className="pt-8 pb-20 px-6 md:px-12 max-w-[1600px] mx-auto">
      {/* Header estilo Meridian Overview */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 text-left">
        <div>
          <h1 className="text-3xl font-extrabold text-[#141414] tracking-tight">Painel da loja</h1>
          <p className="text-[#8A8A85] text-sm mt-1 font-medium">Atividade comercial em tempo real</p>
        </div>
        <div className="hidden lg:flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Ticker estilo push (mesmo visual do card mobile, condensado): card escuro
              com ícone, label uppercase e texto animado. h-10 = mesma altura dos
              botões Exportar/Nova proposta (text-sm + py-2.5 = 40px). */}
          {tItem && (
            <div className="flex items-center gap-2.5 rounded-xl bg-[#141414] pl-1.5 pr-4 h-10 max-w-[560px]">
              <span className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                <Clock size={14} className="text-[#C1F11D]" />
              </span>
              <div className="min-w-0 flex-1">
                <div key={tIdx} className={tAnim}>
                  <div className="flex items-center gap-1.5 leading-none">
                    <span className={`w-1 h-1 rounded-full shrink-0 ${tItem.urgent ? 'bg-rose-400 animate-pulse' : 'bg-[#C1F11D] animate-pulse'}`}></span>
                    <span className="text-[8px] font-black uppercase tracking-widest text-white/60 leading-none">{tLabel}</span>
                  </div>
                  {tItem.tipo === 'reserva' ? (
                    <p className="text-[13px] leading-tight font-bold text-white truncate">
                      {tNome}
                      <span className="text-white/65 font-semibold"> expira em </span>
                      <span className={tItem.urgent ? 'text-rose-400' : 'text-[#C1F11D]'}>{formatTempoRestante(tempoRestanteSegundos)}</span>
                    </p>
                  ) : (
                    <p className="text-[13px] leading-tight font-bold text-white truncate">{tItem.text}</p>
                  )}
                </div>
              </div>
            </div>
          )}
          <button onClick={() => setExportarAberto(true)} className="flex-1 sm:flex-none flex items-center justify-center gap-2 h-10 bg-white border border-[#E5E5E2] hover:border-[#B9B9B4] text-[#2A2A26] text-sm font-bold px-4 rounded-xl transition cursor-pointer">
            <UploadCloud size={15} /> Exportar
          </button>
          <button onClick={() => navigateTo('dashboard')} className="flex-1 sm:flex-none flex items-center justify-center gap-2 h-10 bg-[#141414] hover:bg-[#2A2A26] text-white text-sm font-bold px-4 rounded-xl transition cursor-pointer whitespace-nowrap">
            <Plus size={15} className="text-[#C1F11D]" /> Nova proposta
          </button>
        </div>
      </div>

      {/* Vitrine da loja (só desktop; o mobile tem o card próprio mais abaixo):
          o carro entra dirigindo da direita (fora da tela) e para de perfil.
          Vídeo espelhado (nariz p/ esquerda) tocando SEM loop na janela 2.5s→5.2s;
          o slide CSS (.animate-vitrine-drive) dura o mesmo que a reprodução, então
          as rodas param junto com o movimento. Fundo = tom de lima do vídeo. */}
      <div
        className="theme-light-island hidden lg:block relative overflow-hidden rounded-[32px] border border-[#E5E5E2] mb-8 h-[280px]"
        style={{ background: '#BDBE30' }}
      >
        <div className="absolute inset-y-0 right-0 h-full aspect-[16/7] animate-vitrine-drive">
          <video
            src="/video/vitrine-loop.mp4"
            autoPlay
            muted
            playsInline
            onLoadedMetadata={(e) => { e.currentTarget.currentTime = 2.5; }}
            onTimeUpdate={(e) => { const v = e.currentTarget; if (v.currentTime >= 5.2 && !v.paused) v.pause(); }}
            className="w-full h-full object-cover -scale-x-100"
          />
          <div className="absolute inset-y-0 left-0 w-28 bg-gradient-to-r from-[#BDBE30] to-transparent"></div>
        </div>
        <div className="relative z-10 h-full flex flex-col justify-between p-8 text-left max-w-[52%]">
          <div>
            <span className="block text-[11px] font-black uppercase tracking-[0.25em] text-[#141414]/70">
              {empresaLogada?.nome || 'Sua loja'} · Vitrine digital
            </span>
            <div className="flex items-end gap-4 mt-2">
              <span className="text-[84px] font-extrabold text-[#141414] leading-[0.85] tracking-tight tabular-nums">
                {totalCriadasAcumulado}
              </span>
              <span className="pb-1.5 text-sm font-bold text-[#141414]/75 leading-snug">
                veículos<br />cadastrados
              </span>
            </div>
          </div>
          {/* Chips entram em cascata enquanto o carro freia (delays casados com o slide) */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 bg-[#141414] text-white text-[11px] font-bold px-3.5 py-2 rounded-full animate-fade-in-down" style={{ animationDelay: '1.7s', animationFillMode: 'both' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-[#C1F11D] animate-pulse"></span>
              {recentReservations.filter((r: any) => r.status === 'Active').length} reservas ativas
            </span>
            <span className="inline-flex items-center gap-2 bg-white/70 border border-[#141414]/10 text-[#141414] text-[11px] font-bold px-3.5 py-2 rounded-full animate-fade-in-down" style={{ animationDelay: '2.0s', animationFillMode: 'both' }}>
              {countConfirmados} PIX {countConfirmados === 1 ? 'recebido' : 'recebidos'}
            </span>
            <span className="inline-flex items-center gap-2 bg-white/70 border border-[#141414]/10 text-[#141414] text-[11px] font-bold px-3.5 py-2 rounded-full animate-fade-in-down" style={{ animationDelay: '2.3s', animationFillMode: 'both' }}>
              {Math.max(0, reservasDisponiveis)} links disponíveis
            </span>
          </div>
        </div>
      </div>

      {/* Bloco mobile: reserva ativa + uso do plano + placeholder + ações (espelha o layout do app no celular) */}
      <div className="lg:hidden space-y-4 mb-8">
        {/* Faixa de reserva ativa — abaixo do título, com as cores do design system */}
        {tItem && (
          <div className="flex items-center gap-3 rounded-2xl bg-[#141414] px-4 py-3">
            <span className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <Clock size={17} className="text-[#C1F11D]" />
            </span>
            <div className="min-w-0 flex-1">
              <div key={tIdx} className={tAnim}>
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${tItem.urgent ? 'bg-rose-400 animate-pulse' : 'bg-[#C1F11D] animate-pulse'}`}></span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/60">{tLabel}</span>
                </div>
                {tItem.tipo === 'reserva' ? (
                  <p className="text-sm font-bold text-white truncate mt-0.5">
                    {tNome}
                    <span className="text-white/65 font-semibold"> expira em </span>
                    <span className={tItem.urgent ? 'text-rose-400' : 'text-[#C1F11D]'}>{formatTempoRestante(tempoRestanteSegundos)}</span>
                  </p>
                ) : (
                  <p className="text-sm font-bold text-white truncate mt-0.5">{tItem.text}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Uso do plano */}
        <div className="bg-white border border-[#E5E5E2] rounded-3xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold text-[#8A8A85] uppercase tracking-widest">Uso do plano</span>
            <span className="text-xs font-black text-[#141414]">{reservasUsadas}/{totalReservasPlano}</span>
          </div>
          <div className="w-full bg-[#EBEBE8] h-2 rounded-full overflow-hidden">
            <div
              className="bg-[#141414] h-full rounded-full transition-[width] duration-700 ease-out"
              style={{ width: `${Math.min(100, Math.max(0, (reservasUsadas / totalReservasPlano) * 100))}%` }}
            ></div>
          </div>
          <div className="flex items-center justify-between gap-3 mt-3">
            <span className="text-xs font-semibold text-[#6F6F6A] flex items-center gap-1.5">
              <LinkIcon size={13} className="text-[#B9B9B4] shrink-0" />
              {Math.max(0, reservasDisponiveis)} {Math.max(0, reservasDisponiveis) === 1 ? 'link disponível' : 'links disponíveis'}
            </span>
            {reservasDisponiveis <= 2 && (
              <button
                onClick={() => navigateTo('configuracoes')}
                className="text-[10px] font-black uppercase tracking-wider text-[#141414] bg-[#C1F11D] px-3 py-1.5 rounded-full active:scale-95 transition cursor-pointer"
              >
                Fazer upgrade
              </button>
            )}
          </div>
        </div>

        {/* Veículos cadastrados: contador por cima do carro (gradiente lima do design system) */}
        <div
          className="rounded-3xl overflow-hidden h-[210px] border border-[#E5E5E2] relative"
          style={{ background: 'radial-gradient(120% 120% at 50% 0%, #d8f750 0%, #eafbb0 42%, #ffffff 100%)' }}
        >
          {/* Contador de unidades (propostas cadastradas) */}
          <div className="absolute top-5 left-5 z-10 text-left">
            <span className="block text-[11px] font-black uppercase tracking-[0.2em] text-[#141414]/75">Und</span>
            <span className="block text-6xl font-extrabold text-[#141414] leading-none tracking-tight tabular-nums mt-0.5">{totalCriadasAcumulado}</span>
          </div>
          <img
            src="/img/placeholder-car.png"
            alt="Volvo EX30 — veículo em destaque"
            loading="lazy"
            className="absolute bottom-0 right-0 h-[135%] w-auto max-w-none object-contain object-bottom translate-x-[16%] drop-shadow-[0_18px_24px_rgba(20,20,20,0.18)]"
          />
        </div>

        {/* Ações */}
        <div className="flex gap-3">
          <button
            onClick={() => setExportarAberto(true)}
            className="flex-1 flex items-center justify-center gap-2 bg-white border border-[#E5E5E2] text-[#2A2A26] text-sm font-bold px-4 py-3 rounded-2xl active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141414]/15 cursor-pointer"
          >
            <UploadCloud size={15} /> Exportar
          </button>
          <button
            onClick={() => navigateTo('dashboard')}
            className="flex-1 flex items-center justify-center gap-2 bg-[#141414] text-white text-sm font-bold px-4 py-3 rounded-2xl active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141414]/25 cursor-pointer"
          >
            <Plus size={15} className="text-[#C1F11D]" /> Nova proposta
          </button>
        </div>
      </div>

      {/* Toggle de visualização dos KPIs (só mobile): empilhado ou grade */}
      <div className="lg:hidden flex items-center justify-end gap-1 mb-3">
        <span className="text-[10px] font-bold text-[#B9B9B4] uppercase tracking-wider mr-1">Exibir</span>
        <button
          onClick={() => changeKpiLayout('stack')}
          aria-label="Empilhado (1 por linha)"
          aria-pressed={kpiLayout === 'stack'}
          className={`p-2 rounded-lg border transition ${kpiLayout === 'stack' ? 'bg-[#141414] border-[#141414] text-[#C1F11D]' : 'bg-white border-[#E5E5E2] text-[#8A8A85] hover:text-[#141414]'}`}
        >
          <LayoutList size={16} />
        </button>
        <button
          onClick={() => changeKpiLayout('grid')}
          aria-label="Grade (2 por linha)"
          aria-pressed={kpiLayout === 'grid'}
          className={`p-2 rounded-lg border transition ${kpiLayout === 'grid' ? 'bg-[#141414] border-[#141414] text-[#C1F11D]' : 'bg-white border-[#E5E5E2] text-[#8A8A85] hover:text-[#141414]'}`}
        >
          <LayoutGrid size={16} />
        </button>
      </div>

      {/* Grid Bento de KPIs (Estilo Dashboard-4 Commerce) */}
      <div className={`grid gap-4 mb-8 text-left lg:grid-cols-4 ${kpiLayout === 'grid' ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {/* Card 1: Receita Real */}
        <div className="bg-white border border-[#E5E5E2] p-6 rounded-3xl">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-semibold text-[#B9B9B4] uppercase tracking-widest">SINAL EM CAIXA</span>
            <div className="w-8 h-8 bg-[#C1F11D]/20 text-[#141414] rounded-lg flex items-center justify-center shrink-0">
              <DollarSign size={16} />
            </div>
          </div>
          <span className="block text-3xl font-bold tracking-tight text-[#141414] mb-1">{formatSinalCaixa}</span>
          <span className="text-xs text-[#141414] font-bold flex items-center gap-1">
            <ArrowUpRight size={14} className="stroke-[2.5px]"/> Este mês corrente
          </span>
          <MiniSpark trend="up" />
        </div>

        {/* Card 2: Clientes Ativos */}
        <div className="bg-white border border-[#E5E5E2] p-6 rounded-3xl">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-semibold text-[#B9B9B4] uppercase tracking-widest">RESGATES ATIVOS</span>
            <div className="w-8 h-8 bg-[#C1F11D]/20 text-[#141414] rounded-lg flex items-center justify-center shrink-0">
              <Users size={16} />
            </div>
          </div>
          <span className="block text-3xl font-bold tracking-tight text-[#141414] mb-1">{totalResgatesAtivos}</span>
          <span className="text-xs text-[#141414] font-bold flex items-center gap-1">
            <ArrowUpRight size={14} className="stroke-[2.5px]"/> 3 novas hoje
          </span>
          <MiniSpark trend="up" />
        </div>

        {/* Card 3: Links Expirados */}
        <div className="bg-white border border-[#E5E5E2] p-6 rounded-3xl">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-semibold text-[#B9B9B4] uppercase tracking-widest">LINKS EXPIRADOS</span>
            <div className="w-8 h-8 bg-rose-50 text-rose-600 rounded-lg flex items-center justify-center shrink-0 border border-rose-100">
              <ShieldAlert size={16} />
            </div>
          </div>
          <span className="block text-3xl font-bold tracking-tight text-[#141414] mb-1">{totalExpiradas}</span>
          <span className="text-xs text-[#B9B9B4] font-medium">Por inatividade de leads</span>
          <MiniSpark trend="down" />
        </div>

        {/* Card 4: Taxa de Conversão */}
        <div className="bg-white border border-[#E5E5E2] p-6 rounded-3xl">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-semibold text-[#B9B9B4] uppercase tracking-widest">CONVERSÃO LÍQUIDA</span>
            <div className="w-8 h-8 bg-[#C1F11D]/15 text-[#141414] rounded-lg flex items-center justify-center shrink-0 border border-[#C1F11D]/30">
              <TrendingUp size={16} />
            </div>
          </div>
          <span className="block text-3xl font-bold tracking-tight text-[#141414] mb-1">{conversaoLiquida}%</span>
          <span className="text-xs text-[#B9B9B4] font-medium">
            Baseado em {totalCriadasAcumulado} propostas
          </span>
          <MiniSpark trend="up" />
        </div>
      </div>

      {/* Ranking de Vendedores + Velocidade Média (lado a lado, sem rail lateral) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 text-left">
        {/* Card de Ranking de Vendedores */}
        <div className="bg-white border border-[#E5E5E2] p-6 rounded-3xl text-left">
          <h3 className="font-bold text-[#2A2A26] text-sm mb-1">Ranking de Vendedores</h3>
          <p className="text-[10px] text-[#B9B9B4] font-medium mb-4">Conversão real baseada em propostas</p>

          {rankingVendedores.length > 0 ? (
            <div className="space-y-4">
              {rankingVendedores.map((vend) => (
                <div key={vend.nome} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-[#5F5F5A]">{vend.nome.split(' ')[0]}</span>
                    <span className="text-[#8A8A85] font-bold">{vend.conversao}% ({vend.pagas}/{vend.total})</span>
                  </div>
                  <div className="w-full bg-[#EBEBE8] h-1.5 rounded-full overflow-hidden border border-[#E5E5E2]/50">
                    <div
                      className="bg-[#141414] h-full rounded-full transition-all duration-500"
                      style={{ width: `${vend.conversao}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center text-center gap-2 py-6">
              <Users size={20} className="text-[#B9B9B4]" />
              <p className="text-xs font-semibold text-[#6F6F6A]">Nenhum vendedor cadastrado</p>
              <button
                onClick={() => navigateTo('vendedores')}
                className="text-[11px] font-bold text-[#141414] bg-[#C1F11D]/25 hover:bg-[#C1F11D]/40 px-3 py-1.5 rounded-full transition cursor-pointer"
              >
                Adicionar vendedor
              </button>
            </div>
          )}
        </div>

        {/* Card Auxiliar: Velocidade Média de Vendas */}
        <div className="bg-white border border-[#E5E5E2] p-6 rounded-3xl text-left">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-[#2A2A26] text-sm">Velocidade Média</h3>
            <Clock size={16} className="text-[#141414] shrink-0" />
          </div>
          <span className="block text-3xl font-bold tracking-tight text-[#141414] mb-1">{velocidadeMediaText}</span>
          <p className="text-[10px] text-[#B9B9B4] font-medium leading-relaxed">
            Tempo médio de fechamento medido entre a ativação do link e a confirmação do sinal.
          </p>
        </div>
      </div>

      {/* Lista de reservas (largura total) */}
      <div className="space-y-6 text-left">
          {/* Gráfico de receita removido (vazio); bloco oculto preservado */}
          <div className="hidden">
            <div>
              <h3 className="font-bold text-[#2A2A26] text-sm">Tendência de Receita Semanal</h3>
              <p className="text-[10px] text-[#B9B9B4] font-medium">Sinais pagos distribuídos proporcionalmente nos dias da semana</p>
            </div>
            
            {/* Gráfico de Linha e Área Animado Interativo */}
            <div className="relative w-full h-48 mt-4">
              <svg 
                viewBox={`0 0 ${chartWidth} ${chartHeight}`} 
                className="w-full h-full overflow-visible"
              >
                <defs>
                  {/* Gradiente da área preenchida */}
                  <linearGradient id="chartAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={chartColors.area} stopOpacity="0.25" />
                    <stop offset="100%" stopColor={chartColors.area} stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Linhas de Grade de Background */}
                <line 
                  x1={paddingX} 
                  y1={paddingY} 
                  x2={chartWidth - paddingX} 
                  y2={paddingY} 
                  stroke={chartColors.grid}
                  strokeWidth="1" 
                />
                <line 
                  x1={paddingX} 
                  y1={paddingY + (chartHeight - 2 * paddingY) / 2} 
                  x2={chartWidth - paddingX} 
                  y2={paddingY + (chartHeight - 2 * paddingY) / 2} 
                  stroke={chartColors.grid}
                  strokeDasharray="4 4" 
                  strokeWidth="1" 
                />
                <line 
                  x1={paddingX} 
                  y1={chartHeight - paddingY} 
                  x2={chartWidth - paddingX} 
                  y2={chartHeight - paddingY} 
                  stroke={chartColors.grid}
                  strokeWidth="1" 
                />

                {/* Área Preenchida com Animação */}
                <path 
                  d={areaPath} 
                  fill="url(#chartAreaGrad)" 
                  className="animate-fade-in-area" 
                />

                {/* Linha do Gráfico com Animação de Entrada */}
                <path 
                  d={linePath}
                  fill="none"
                  stroke={chartColors.line}
                  strokeWidth="3.5"
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  className="chart-line animate-draw-line" 
                />

                {/* Rótulos do Eixo X (Dias da Semana) */}
                {chartPoints.map((p) => (
                  <text 
                    key={`label-${p.index}`}
                    x={p.x} 
                    y={chartHeight - 5} 
                    textAnchor="middle" 
                    className="text-[10px] font-bold fill-[#B9B9B4] uppercase select-none"
                  >
                    {p.label}
                  </text>
                ))}

                {/* Pontos de Dados Interativos */}
                {chartPoints.map((p) => {
                  const isHovered = hoveredPoint === p.index;
                  return (
                    <g key={`point-group-${p.index}`}>
                      {/* Anel Pulsante (Apenas no ponto hovered) */}
                      {isHovered && (
                        <circle 
                          cx={p.x} 
                          cy={p.y} 
                          r={12} 
                          fill="#C1F11D" 
                          className="animate-pulse-ring origin-center pointer-events-none" 
                        />
                      )}

                      {/* Ponto Visual */}
                      <circle 
                        cx={p.x} 
                        cy={p.y} 
                        r={isHovered ? 6 : 4}
                        fill={isHovered ? '#C1F11D' : chartColors.dot}
                        stroke={chartColors.dotRing}
                        strokeWidth={isHovered ? 2 : 1.5} 
                        className="transition-all duration-200 ease-out pointer-events-none"
                      />

                      {/* Área de Hover Invisível para Acessibilidade e Toque */}
                      <circle 
                        cx={p.x} 
                        cy={p.y} 
                        r={20} 
                        fill="transparent" 
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredPoint(p.index)}
                        onMouseLeave={() => setHoveredPoint(null)}
                        tabIndex={0}
                        aria-label={`Receita para ${p.label}: ${formatCurrency(p.valor)}`}
                        onFocus={() => setHoveredPoint(p.index)}
                        onBlur={() => setHoveredPoint(null)}
                      />
                    </g>
                  );
                })}
              </svg>

              {/* Tooltip HTML Posicionado Absolutamente */}
              {hoveredPoint !== null && (
                <div 
                  className="absolute bg-[#141414] text-white p-3 rounded-2xl shadow-xl border border-[#2A2A26] text-xs pointer-events-none transition-all duration-200 z-30 flex flex-col gap-0.5 whitespace-nowrap"
                  style={{
                    left: `${(chartPoints[hoveredPoint].x / chartWidth) * 100}%`,
                    top: `${(chartPoints[hoveredPoint].y / chartHeight) * 100}%`,
                    transform: 'translate(-50%, -120%)',
                  }}
                >
                  {/* Seta do tooltip */}
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-[#141414] border-r border-b border-[#2A2A26]" />
                  
                  <span className="text-[9px] font-bold text-[#B9B9B4] uppercase tracking-wider">{chartPoints[hoveredPoint].label}</span>
                  <span className="font-bold text-sm text-[#C1F11D]">
                    {formatCurrency(chartPoints[hoveredPoint].valor)}
                  </span>
                  <span className="text-[9px] text-[#B9B9B4]">
                    {chartPoints[hoveredPoint].porcentagem}% da receita
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Abas e Filtros */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-t border-[#E5E5E2] pt-6">
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={() => setFiltroStatus('todos')}
                className={`px-4 py-2 rounded-full text-xs font-bold transition flex items-center gap-1.5 uppercase tracking-wider ${
                  filtroStatus === 'todos' 
                    ? 'bg-[#141414] text-white' 
                    : 'bg-white border border-[#E5E5E2] text-[#6F6F6A] hover:border-[#D9D9D5]'
                }`}
              >
                Todos <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${filtroStatus === 'todos' ? 'bg-[#2A2A26] text-white' : 'bg-[#EBEBE8] text-[#8A8A85]'}`}>{countTodos}</span>
              </button>
              <button 
                onClick={() => setFiltroStatus('aguardando')}
                className={`px-4 py-2 rounded-full text-xs font-bold transition flex items-center gap-1.5 uppercase tracking-wider ${
                  filtroStatus === 'aguardando' 
                    ? 'bg-[#141414] text-white' 
                    : 'bg-white border border-[#E5E5E2] text-[#6F6F6A] hover:border-[#D9D9D5]'
                }`}
              >
                Aguardando sinal <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${filtroStatus === 'aguardando' ? 'bg-[#2A2A26] text-white' : 'bg-[#EBEBE8] text-[#8A8A85]'}`}>{countAguardando}</span>
              </button>
              <button 
                onClick={() => setFiltroStatus('urgentes')}
                className={`px-4 py-2 rounded-full text-xs font-bold transition flex items-center gap-1.5 uppercase tracking-wider ${
                  filtroStatus === 'urgentes' 
                    ? 'bg-[#141414] text-white' 
                    : 'bg-white border border-[#E5E5E2] text-[#6F6F6A] hover:border-[#D9D9D5]'
                }`}
              >
                Urgentes <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${filtroStatus === 'urgentes' ? 'bg-[#2A2A26] text-white' : 'bg-[#EBEBE8] text-[#8A8A85]'}`}>{countUrgentes}</span>
              </button>
              <button 
                onClick={() => setFiltroStatus('confirmados')}
                className={`px-4 py-2 rounded-full text-xs font-bold transition flex items-center gap-1.5 uppercase tracking-wider ${
                  filtroStatus === 'confirmados' 
                    ? 'bg-[#141414] text-white' 
                    : 'bg-white border border-[#E5E5E2] text-[#6F6F6A] hover:border-[#D9D9D5]'
                }`}
              >
                Confirmados <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${filtroStatus === 'confirmados' ? 'bg-[#2A2A26] text-white' : 'bg-[#EBEBE8] text-[#8A8A85]'}`}>{countConfirmados}</span>
              </button>
            </div>
            
            <button className="bg-white border border-[#E5E5E2] hover:border-[#B9B9B4] hover:bg-[#F4F4F2] text-[#5F5F5A] font-bold text-xs px-4 py-2 rounded-xl transition flex items-center gap-2 cursor-pointer">
              <TrendingDown size={14} /> Ordenar por expiração
            </button>
          </div>

          {/* Lista de Transações/Propostas Remodeladas (grid de 2 colunas em telas largas) */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
            {filteredReservations.length > 0 ? (
              filteredReservations.map((res) => {
                const isCompleted = res.status === 'Completed' || res.paidSignal;
                const isExpired = res.status === 'Expired';
                
                // Timer
                const totalSeconds = res.expiracao * 60;
                const remainingSeconds = Math.max(0, totalSeconds - (res.elapsedSeconds || 0));
                const pad2 = (n: number) => n.toString().padStart(2, '0');
                const hrs = Math.floor(remainingSeconds / 3600);
                const mins = Math.floor((remainingSeconds % 3600) / 60);
                const secs = remainingSeconds % 60;
                const timerText = hrs > 0 ? `${pad2(hrs)}:${pad2(mins)}:${pad2(secs)}` : `${pad2(mins)}:${pad2(secs)}`;
                const progressPercent = (remainingSeconds / totalSeconds) * 100;
                const isUrgente = !isCompleted && !isExpired && remainingSeconds < 300;

                return (
                  <div key={res.id} className="bg-white border border-[#E5E5E2] rounded-3xl p-5 hover:border-[#D9D9D5] transition duration-200 flex flex-col gap-4 text-left">
                    {/* Info Vendedor e Status */}
                    <div className="flex flex-wrap justify-between items-center gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-bold uppercase tracking-wider bg-[#EBEBE8] text-[#6F6F6A] px-2.5 py-1 rounded-md">
                          Vendedor: {res.vendedores ? res.vendedores.split(' ')[0] : 'Consultor'}
                        </span>
                        {res.clienteNome && res.clienteNome !== 'Não informado' && (
                          <span className="text-[9px] font-bold uppercase tracking-wider bg-[#C1F11D]/20 text-[#141414] px-2.5 py-1 rounded-md">
                            Cliente: {res.clienteNome}
                          </span>
                        )}
                      </div>
                      
                      {/* Status Badge */}
                      {isCompleted ? (
                        <span className="text-[10px] font-bold text-[#141414] uppercase tracking-wide flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#C1F11D]"></span> PIX Recebido
                        </span>
                      ) : isExpired ? (
                        <span className="text-[10px] font-bold text-[#B9B9B4] uppercase tracking-wide flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#B9B9B4]"></span> Link Expirado
                        </span>
                      ) : isUrgente ? (
                        <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wide flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span> Crítico
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wide flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Aguardando Sinal
                        </span>
                      )}
                    </div>

                    {/* Bloco do Carro e Preço */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-t border-[#EBEBE8] pt-4">
                      <div className="flex items-center gap-4">
                        {res.fotos && (
                          <img
                            src={String(res.fotos).split(',')[0].trim()}
                            alt={res.title}
                            className="w-14 h-14 rounded-2xl object-cover border border-[#E5E5E2] shrink-0 animate-fade-in-down"
                          />
                        )}
                        <div>
                          <h4 className="font-bold text-base text-[#141414] tracking-tight leading-snug">{res.title}</h4>
                          <p className="text-[11px] text-[#B9B9B4] font-medium mt-0.5">
                            FIPE: {formatCurrency(res.fipeValue)} • Venda: <span className="font-bold text-[#5F5F5A]">{formatCurrency(res.valorVenda)}</span>
                          </p>
                        </div>
                      </div>

                      {/* Valor do Sinal Exigido */}
                      <div className="text-left md:text-right shrink-0">
                        <span className="block text-[9px] font-black text-[#B9B9B4] uppercase tracking-widest">Sinal Exigido</span>
                        <span className="font-black text-xl text-[#141414] tracking-tight">
                          {formatCurrency(res.sinal)}
                        </span>
                      </div>
                    </div>

                    {/* Banner de Visualização Ativa */}
                    {res.visualizandoAgora && !isCompleted && !isExpired && (
                      <div className="bg-[#C1F11D]/10 border border-[#C1F11D]/25 rounded-xl px-4 py-2.5 flex items-center gap-2 text-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#141414] animate-ping"></span>
                        <span className="font-bold text-[#141414] text-[10px] uppercase tracking-wider">Lead visualizando a proposta neste momento</span>
                      </div>
                    )}

                    {/* Timer do Link se Ativo */}
                    {!isCompleted && !isExpired && (
                      <div className="space-y-1.5 border-t border-[#EBEBE8] pt-4">
                        <div className="flex justify-between items-center text-[9px] font-bold text-[#B9B9B4] uppercase tracking-wider">
                          <span>Expiração do Link</span>
                          <span className={`text-[11px] font-bold ${isUrgente ? 'text-rose-600' : 'text-[#6F6F6A]'}`}>{timerText}</span>
                        </div>
                        <div className="w-full bg-[#EBEBE8] h-1.5 rounded-full overflow-hidden border border-[#E5E5E2]/50">
                          <div 
                            className={`h-full rounded-full transition-all duration-1000 origin-left transform ${isUrgente ? 'bg-rose-600' : 'bg-[#141414]'}`} 
                            style={{ width: `${progressPercent}%` }}
                          ></div>
                        </div>
                      </div>
                    )}

                    {/* Botões de Ação */}
                    <div className="flex flex-wrap justify-end gap-2 border-t border-[#EBEBE8] pt-4">
                      {!isCompleted && !isExpired && (
                        <>
                          <button 
                            onClick={() => handleSimulatePayment(res.id, res.clienteNome || 'Cliente')}
                            className="bg-[#C1F11D] text-[#141414] hover:bg-[#b0e040] font-bold text-[10px] px-4 py-2.5 rounded-xl transition uppercase tracking-wider cursor-pointer"
                          >
                            Confirmar PIX
                          </button>
                          <button 
                            onClick={() => handleSimulateTimeExpiration(res.id)}
                            className="bg-white border border-[#E5E5E2] text-[#6F6F6A] hover:bg-[#F4F4F2] font-bold text-[10px] px-4 py-2.5 rounded-xl transition uppercase tracking-wider cursor-pointer"
                          >
                            Expirar
                          </button>
                        </>
                      )}
                      <button 
                        onClick={() => {
                          window.open(`https://api.whatsapp.com/send?text=Sua%20proposta%20exclusiva%20Reservacar%20para%20o%20veículo%20${encodeURIComponent(res.title)}%20está%20pronta!`, '_blank');
                        }}
                        className="bg-[#25D366] hover:bg-[#20BA5A] text-white font-bold text-[10px] px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 uppercase tracking-wider cursor-pointer"
                      >
                        WhatsApp
                      </button>
                      <button 
                        onClick={() => setReservaParaGerenciar(res)}
                        className="bg-[#141414] hover:bg-black text-white font-bold text-[10px] px-4 py-2.5 rounded-xl transition uppercase tracking-wider cursor-pointer"
                      >
                        Gerenciar
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="xl:col-span-2 bg-white border border-[#E5E5E2] rounded-[32px] p-12 text-center">
                <Clock size={48} className="mx-auto text-[#D9D9D5] mb-4" />
                <h4 className="text-lg font-bold text-[#2A2A26]">Nenhuma proposta encontrada</h4>
                <p className="text-[#8A8A85] text-xs mt-1">Nenhuma proposta de reserva atende ao filtro de status selecionado.</p>
              </div>
            )}
          </div>
        </div>

      {/* Modal de confirmação da exportação */}
      {exportarAberto && (
        <div className="fixed inset-0 z-[80] bg-black/40 flex items-center justify-center p-4" onClick={() => setExportarAberto(false)}>
          <div
            role="dialog"
            aria-label="Exportar relatório da loja"
            className="bg-white rounded-3xl border border-[#E5E5E2] max-w-md w-full p-6 md:p-7 text-left animate-fade-in-down"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h3 className="text-xl font-black text-[#141414] tracking-tight">Exportar relatório da loja</h3>
                <p className="text-xs text-[#8A8A85] font-medium mt-1">Resumo completo de {empresaLogada?.nome || 'sua loja'} gerado agora.</p>
              </div>
              <button onClick={() => setExportarAberto(false)} aria-label="Fechar" className="text-[#B9B9B4] hover:text-[#141414] transition p-1 shrink-0">
                <X size={18} />
              </button>
            </div>

            <div className="bg-[#F4F4F2] border border-[#EBEBE8] rounded-2xl p-4 space-y-2 mb-5">
              <span className="block text-[9px] font-black uppercase tracking-widest text-[#8A8A85]">O que vai no relatório</span>
              {[
                'Dados da loja (CNPJ, contato e plano)',
                `Indicadores: reservas, vendas PIX, sinais recebidos e conversão`,
                `Tabela com as ${recentReservations.length} propostas (veículo, cliente, vendedor, sinal, status)`,
              ].map((t, i) => (
                <div key={i} className="flex items-start gap-2 text-xs font-semibold text-[#2A2A26]">
                  <Check size={13} className="text-[#141414] mt-0.5 shrink-0" /> {t}
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <button
                onClick={() => confirmarExportacao('markdown')}
                className="flex-1 flex items-center justify-center gap-2 bg-white border border-[#E5E5E2] hover:border-[#B9B9B4] text-[#2A2A26] text-sm font-bold h-11 rounded-xl transition cursor-pointer"
              >
                <FileText size={15} /> Markdown (.md)
              </button>
              <button
                onClick={() => confirmarExportacao('pdf')}
                className="flex-1 flex items-center justify-center gap-2 bg-[#141414] hover:bg-[#2A2A26] text-white text-sm font-bold h-11 rounded-xl transition cursor-pointer"
              >
                <UploadCloud size={15} className="text-[#C1F11D]" /> Gerar PDF
              </button>
            </div>
            <p className="text-[10px] text-[#B9B9B4] font-medium mt-3 text-center">Cada exportação fica registrada em Configurações → Logs.</p>
          </div>
        </div>
      )}

    </div>
  );
}

// --- DASHBOARD VIEW (CREATOR FORM) ---
function DashboardView({ navigateTo, setActiveReservation, recentReservations, setRecentReservations, showToast, reservasUsadas, totalReservasPlano, setReservaParaGerenciar, activeTab = 'ativos', setActiveTab = (_t: string) => {}, setDraftToResume = (_d: any) => {} }) {
  const drafts = recentReservations.filter((r: any) => r.status === 'Draft');
  const ativos = recentReservations.filter((r: any) => r.status === 'Active' || r.status === 'Completed');
  const inativos = recentReservations.filter((r: any) => r.status === 'Expired');

  const TABS = [
    { id: 'ativos', label: 'Ativos', count: ativos.length },
    { id: 'inativos', label: 'Inativos', count: inativos.length },
    { id: 'rascunhos', label: 'Rascunhos', count: drafts.length },
  ];

  const resumeDraft = (res: any) => {
    setRecentReservations((prev: any) => prev.filter((r: any) => r.id !== res.id));
    setDraftToResume(res);
    navigateTo(res.origin === 'reserva-rapida' ? 'reserva-rapida' : 'cadastrar-reserva');
  };

  const criarReserva = () => {
    if (reservasUsadas >= totalReservasPlano) {
      showToast('Limite de créditos de reserva atingido pelo seu plano. Faça upgrade nas configurações!', 'error');
      return;
    }
    navigateTo('cadastrar-reserva');
  };

  const StatusPill = ({ status }: { status: string }) => {
    if (status === 'Completed') return <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-700"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> PIX Recebido</span>;
    if (status === 'Expired') return <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-rose-600"><span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Expirado</span>;
    return <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-amber-600"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Aguardando Sinal</span>;
  };

  const ReservaCard = ({ res }: { res: any }) => (
    <div className={`bg-white border rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden group transition-colors duration-200 ${res.status === 'Completed' ? 'border-emerald-200' : 'border-[#E5E5E2] hover:border-[#B9B9B4]'}`}>
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <StatusPill status={res.status} />
          <span className="text-[10px] text-[#8A8A85] font-semibold">{res.created?.split(' ')[0] || 'Hoje'}</span>
        </div>
        <h4 className="font-bold text-base text-[#141414] tracking-tight leading-snug mb-1">{res.title || `${res.marcaText} ${res.modeloText}`}</h4>
        {res.clienteNome && !['Não informado', 'Cliente'].includes(res.clienteNome) && (
          <p className="text-[11px] text-[#8A8A85] font-semibold mb-4">Cliente: {res.clienteNome}</p>
        )}
        <div className="bg-[#F4F4F2] border border-[#E5E5E2] p-4 rounded-2xl flex items-center justify-between gap-2 text-xs font-semibold text-[#5F5F5A] mb-6 mt-3">
          <div className="flex flex-col">
            <span className="text-[9px] text-[#8A8A85] uppercase tracking-wider font-bold">Sinal Requerido</span>
            <span className="text-sm font-bold text-[#141414]">{formatCurrency(res.sinal || 1500)}</span>
          </div>
          <div className="w-px h-8 bg-[#E5E5E2]"></div>
          <div className="flex flex-col">
            <span className="text-[9px] text-[#8A8A85] uppercase tracking-wider font-bold">Tempo Limiar</span>
            <span className="text-sm font-bold text-[#2A2A26]">{res.duration || 60}m</span>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-2 mt-auto pt-4 border-t border-[#EBEBE8]">
        <div className="flex gap-2">
          <button onClick={() => { setActiveReservation(res); navigateTo('preview', 'dashboard'); }}
            className="flex-1 bg-white border border-[#E5E5E2] text-[#5F5F5A] text-[11px] font-bold py-2.5 rounded-xl hover:bg-[#F4F4F2] hover:text-[#141414] transition flex items-center justify-center gap-1">
            <Laptop size={12} /> Desktop
          </button>
          <button onClick={() => { setActiveReservation(res); navigateTo('mobile-preview', 'dashboard'); }}
            className="flex-1 bg-white border border-[#E5E5E2] text-[#5F5F5A] text-[11px] font-bold py-2.5 rounded-xl hover:bg-[#F4F4F2] hover:text-[#141414] transition flex items-center justify-center gap-1">
            <Smartphone size={12} /> Mobile Sim
          </button>
        </div>
        <button onClick={() => setReservaParaGerenciar(res)}
          className="w-full bg-[#141414] hover:bg-[#2A2A26] text-white text-[11px] font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-1.5">
          <Settings size={12} /> Gerenciar Reserva
        </button>
      </div>
    </div>
  );

  const DraftCard = ({ res }: { res: any }) => (
    <div className="bg-white border border-dashed border-[#D9D9D5] rounded-3xl p-6 flex flex-col justify-between transition-colors hover:border-[#141414]">
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-[#8A8A85]"><span className="w-1.5 h-1.5 rounded-full bg-[#B9B9B4]"></span> Rascunho</span>
          <span className="text-[10px] text-[#8A8A85] font-semibold">{res.origin === 'reserva-rapida' ? 'Reserva Rápida' : 'Reserva'}</span>
        </div>
        <h4 className="font-bold text-base text-[#141414] tracking-tight leading-snug mb-1">{res.title || 'Reserva sem título'}</h4>
        {res.clienteNome && !['Não informado', 'Cliente'].includes(res.clienteNome) && (
          <p className="text-[11px] text-[#8A8A85] font-semibold mb-2">Cliente: {res.clienteNome}</p>
        )}
        <p className="text-xs text-[#8A8A85] font-medium mt-2 mb-5">Cadastro não concluído. Continue de onde parou para gerar o link.</p>
      </div>
      <button onClick={() => resumeDraft(res)}
        className="w-full bg-[#141414] hover:bg-[#2A2A26] text-white text-[11px] font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-1.5">
        Continuar cadastro <ChevronRight size={13} />
      </button>
    </div>
  );

  const EmptyState = ({ title, sub }: { title: string; sub: string }) => (
    <div className="bg-white border border-[#E5E5E2] rounded-3xl py-16 px-8 text-center max-w-xl mx-auto">
      <div className="w-14 h-14 rounded-2xl bg-[#F4F4F2] border border-[#E5E5E2] flex items-center justify-center mx-auto mb-5">
        <Car className="text-[#B9B9B4]" size={26} />
      </div>
      <h4 className="font-extrabold text-[#141414] text-lg mb-2">{title}</h4>
      <p className="text-xs text-[#8A8A85] leading-relaxed font-medium mb-6 max-w-xs mx-auto">{sub}</p>
      <button onClick={criarReserva}
        className={`font-bold text-xs px-6 py-3 rounded-xl transition ${reservasUsadas >= totalReservasPlano ? 'bg-[#E5E5E2] text-[#B9B9B4] cursor-not-allowed border border-[#D9D9D5]' : 'bg-[#141414] hover:bg-[#2A2A26] text-[#F4F4F2]'}`}>
        Criar Reserva
      </button>
    </div>
  );

  return (
    <div className="pt-8 pb-16 px-6 md:px-12 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-[#141414] tracking-tight">Reservas</h1>
          <p className="text-[#8A8A85] text-sm mt-1 font-medium">Minhas reservas</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={criarReserva}
            className={`text-xs font-bold px-4 py-2.5 rounded-xl transition ${reservasUsadas >= totalReservasPlano ? 'bg-[#E5E5E2] text-[#B9B9B4] cursor-not-allowed border border-[#D9D9D5]' : 'bg-[#141414] hover:bg-[#2A2A26] text-[#F4F4F2]'}`}>
            + Criar Reserva
          </button>
        </div>
      </div>

      {/* Tabs estilo Configurações */}
      <div className="flex items-center gap-7 border-b border-[#E5E5E2] mb-8 overflow-x-auto">
        {TABS.map(t => {
          const active = activeTab === t.id;
          return (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`relative pb-3 text-sm font-bold transition cursor-pointer whitespace-nowrap flex items-center gap-2 ${active ? 'text-[#141414]' : 'text-[#8A8A85] hover:text-[#141414]'}`}>
              {t.label}
              {t.count != null && t.count > 0 && (
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${active ? 'bg-[#141414] text-white' : 'bg-[#E5E5E2] text-[#8A8A85]'}`}>{t.count}</span>
              )}
              {active && <span className="absolute -bottom-px left-0 w-full h-0.5 bg-[#C1F11D] rounded-full"></span>}
            </button>
          );
        })}
      </div>

      <div className="space-y-6">
        {activeTab === 'ativos' && (
          ativos.length > 0
            ? <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{ativos.map((res: any) => <ReservaCard key={res.id} res={res} />)}</div>
            : <EmptyState title="Você ainda não tem reservas" sub="Crie sua primeira reserva e comece a vender." />
        )}

        {activeTab === 'inativos' && (
          inativos.length > 0
            ? <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{inativos.map((res: any) => <ReservaCard key={res.id} res={res} />)}</div>
            : <EmptyState title="Nenhuma reserva inativa" sub="Reservas expiradas ou canceladas aparecem aqui." />
        )}

        {activeTab === 'rascunhos' && (
          drafts.length > 0
            ? <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{drafts.map((res: any) => <DraftCard key={res.id} res={res} />)}</div>
            : <EmptyState title="Nenhum rascunho salvo" sub="Ao voltar de uma reserva sem concluir, ela fica salva aqui para você terminar depois." />
        )}
      </div>
    </div>
  );
}

// --- CLIENT PREVIEW VIEW (DESKTOP VERSION) ---
function PreviewView({
  reservation,
  navigateTo,
  showToast,
  recentReservations = [],
  setRecentReservations,
  setReservasUsadas,
  reservasUsadas = 0,
  totalReservasPlano = 30,
  empresaLogada,
  setEmpresaLogada,
  previewOrigin,
  publicarProposta,
  setDraftToResume = (_d: any) => {},
  setDashboardTab = (_t: string) => {},
  publicMode = false
}) {
  const data = reservation || {
    title: 'BMW 320i Sport GP 2.0 Turbo ActiveFlex',
    anoText: '2024', corText: 'Preto Safira', motorText: '2.0 TwinPower Turbo', fipeValue: 285000, valorVenda: 269000,
    km: '4.500', cambio: 'ZF 8 marchas', combustivel: 'Flex',
    opcionais: 'Ar Condicionado Dual Zone, Interior Mocha, Faróis Full LED, Teto Solar, Painel Curvo BMW Live Cockpit',
    fotos: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=800&q=80',
    video: 'https://www.youtube.com/embed/PJgQ2V20jiY',
    sinal: 5000, expiracao: 30, vendedores: 'Marcos Freitas, Roberto Oliveira',
    laudoAprovado: true
  };

  const [timeLeft, setTimeLeft] = useState(data.expiracao * 60); 
  const [showPixModal, setShowPixModal] = useState(false);
  const [selectedVendedor, setSelectedVendedor] = useState('');

  useEffect(() => {
    if (reservation && setRecentReservations) {
      setRecentReservations((prev: any) => prev.map((res: any) => {
        if (res.id === reservation.id) {
          const novosLogs = [...(res.logs || [])];
          const alreadyLoggedView = novosLogs.some(l => l.text.includes('visualizada') || l.text.includes('Visualizado'));
          if (!alreadyLoggedView) {
            novosLogs.push({
              time: new Date().toLocaleTimeString('pt-BR') + ' de ' + new Date().toLocaleDateString('pt-BR'),
              text: `Proposta visualizada via ${previewOrigin === 'dashboard' ? 'computador (Painel)' : 'celular (Cliente)'} pelo Lead.`
            });
            return { ...res, logs: novosLogs };
          }
        }
        return res;
      }));
    }
  }, [reservation?.id, setRecentReservations]);
  
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showVideo, setShowVideo] = useState(false);

  // Agendamento de visita (slot picker + sheet — mesmo fluxo da visão mobile)
  const [slotInfo, setSlotInfo] = useState<any>(null);
  const [showAgendarSheet, setShowAgendarSheet] = useState(false);

  const handleVisitaConfirmada = (nomeCliente, slot) => {
    showToast(`Visita de ${nomeCliente} confirmada para ${slot.diaLabel} às ${slot.hora}!`, 'success');
    if (reservation && setRecentReservations) {
      setRecentReservations((prev: any) => prev.map((res: any) => {
        if (res.id === reservation.id) {
          const novosLogs = [...(res.logs || [])];
          novosLogs.push({
            time: new Date().toLocaleTimeString('pt-BR') + ' de ' + new Date().toLocaleDateString('pt-BR'),
            text: `Visita agendada por ${nomeCliente} para ${slot.diaLabel} às ${slot.hora}.`
          });
          return { ...res, logs: novosLogs, clienteNome: nomeCliente };
        }
        return res;
      }));
    }
  };

  const economia = data.fipeValue - data.valorVenda;
  const photosArray = data.fotos ? data.fotos.split(',').map((url: any) => url.trim()).filter(Boolean) : ['https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=800&q=80'];

  const isPrePublish = reservation && !recentReservations.some((r: any) => r.id === reservation.id);
  const flowRoute = reservation?.origin === 'reserva-rapida' ? 'reserva-rapida' : 'cadastrar-reserva';

  // Voltar (pré-publicação): salva como rascunho na aba Rascunhos para concluir depois.
  const handleBackToDraft = () => {
    if (isPrePublish && reservation && setRecentReservations) {
      setRecentReservations((prev: any) => prev.some((r: any) => r.id === reservation.id) ? prev : [{ ...reservation, status: 'Draft' }, ...prev]);
      setDashboardTab && setDashboardTab('rascunhos');
      showToast('Rascunho salvo. Conclua quando quiser na aba Rascunhos.', 'info');
      navigateTo('dashboard');
    } else {
      navigateTo(previewOrigin);
    }
  };
  // Editar agora: reabre o fluxo de origem já preenchido com os dados atuais.
  const handleEditCadastro = () => {
    setDraftToResume && setDraftToResume(reservation);
    navigateTo(flowRoute);
  };

  const publishingRef = useRef(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const handlePublish = async () => {
    if (publishingRef.current) return; // evita publicação dupla (duplo clique / reentrância)
    if (reservasUsadas >= totalReservasPlano) {
      showToast('Limite de links do plano atingido pela concessionária.', 'error');
      return;
    }
    publishingRef.current = true;
    setIsPublishing(true);
    try {
      if (publicarProposta) { await publicarProposta(reservation); } else { setRecentReservations([reservation, ...recentReservations]); }
      setReservasUsadas((prev: any) => prev + 1);

      // Incrementa linksGerados do vendedor associado à proposta
      if (setEmpresaLogada && reservation?.vendedores) {
        setEmpresaLogada((prevEmpresa: any) => {
          const vendedoresAtualizados = prevEmpresa.vendedores.map((v: any) => {
            if (v.nome.trim().toLowerCase() === reservation.vendedores.trim().toLowerCase()) {
              return {
                ...v,
                linksGerados: (v.linksGerados || 0) + 1
              };
            }
            return v;
          });
          return { ...prevEmpresa, vendedores: vendedoresAtualizados };
        });
      }

      showToast('Link de reserva criado e publicado com sucesso!', 'success');
      setDashboardTab && setDashboardTab('ativos');
      navigateTo('dashboard');
    } catch {
      publishingRef.current = false;
      setIsPublishing(false);
      showToast('Não foi possível publicar a proposta. Tente novamente.', 'error');
    }
  };

  useEffect(() => {
    if (timeLeft <= 0) return;
    const intervalId = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(intervalId);
  }, [timeLeft]);

  const formatTime = (seconds) => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    // Mostra horas só quando a expiração passa de 60min (ex.: 6h -> 05:59:01, não 359:01)
    return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  };

  const progressPercent = (timeLeft / (data.expiracao * 60)) * 100;

  return (
    <div className={`min-h-screen bg-[#F4F4F2] text-[#141414] flex flex-col items-center pb-24 px-6 relative ${publicMode ? 'pt-0' : 'pt-12'}`}>
      {publicMode ? (
        <header className="self-stretch bg-white border-b border-[#E5E5E2] sticky top-0 z-30 -mx-6 px-6 mb-10">
          <div className="max-w-5xl mx-auto py-4 flex items-center gap-3">
            <div className="w-9 h-9 bg-[#141414] rounded-xl flex items-center justify-center shrink-0">
              <Car size={18} className="text-[#C1F11D]" />
            </div>
            <span className="font-extrabold text-base tracking-tight text-[#141414] truncate">
              {empresaLogada?.nome || 'Showroom'}
            </span>
          </div>
        </header>
      ) : (
        <button
          onClick={isPrePublish ? handleBackToDraft : () => navigateTo(previewOrigin)}
          className="absolute top-6 left-6 text-[#6F6F6A] hover:text-[#141414] font-semibold flex items-center text-sm transition z-20 bg-white border border-[#E5E5E2] px-4 py-2 rounded-xl"
        >
          <ChevronLeft size={16} className="mr-1"/> {isPrePublish ? 'Salvar rascunho e sair' : 'Voltar ao Sistema'}
        </button>
      )}

      {isPrePublish && (
        <div className="w-full max-w-5xl bg-white border border-[#E5E5E2] p-5 rounded-3xl flex flex-col sm:flex-row justify-between items-center gap-4 mt-12 relative overflow-hidden">
          <div className="text-left">
            <h4 className="font-extrabold text-sm text-[#141414] flex items-center gap-1.5">
              <Sparkles className="text-[#141414]" size={16} /> Modo Pré-visualização da Reserva
            </h4>
            <p className="text-xs text-[#8A8A85] mt-1 font-medium">Você está visualizando a proposta antes de ativá-la. Confirme abaixo para gerar o link.</p>
          </div>
          <div className="flex gap-3 shrink-0">
            <button
              onClick={handleEditCadastro}
              className="bg-white hover:bg-[#F4F4F2] text-[#5F5F5A] font-bold text-xs px-5 py-3 rounded-xl transition border border-[#E5E5E2]"
            >
              Editar Cadastro
            </button>
            <button
              onClick={handlePublish}
              disabled={isPublishing}
              className="bg-[#141414] hover:bg-[#2A2A26] text-[#F4F4F2] font-bold text-xs px-5 py-3 rounded-xl transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isPublishing ? 'Publicando...' : 'Confirmar e Publicar Proposta'}
            </button>
          </div>
        </div>
      )}

      <div className={`w-full max-w-5xl ${publicMode ? 'mt-0' : 'mt-12'}`}>

        {/* Header proposal segment */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="bg-[#141414] text-[#F4F4F2] px-3.5 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest mb-4 inline-block">
              PROPOSTA DE RESERVA
            </span>
            {(() => { const tv = parseVeiculoTitulo(data.title); return (
              <>
                <h1 className="text-4xl font-extrabold tracking-tight text-[#141414] leading-tight break-words">{tv.marca} {tv.modelo}</h1>
                {tv.resto && <p className="text-sm font-medium text-[#8A8A85] uppercase tracking-wide mt-1.5">{tv.resto}</p>}
              </>
            ); })()}
          </div>
          {data.laudoAprovado && (
            <div className="bg-[#C1F11D]/15 border border-[#C1F11D]/30 text-[#141414] px-4 py-2 rounded-full flex items-center shrink-0 self-start md:self-auto">
              <Shield size={18} className="mr-2 text-[#141414] animate-pulse" />
              <span className="font-bold text-xs uppercase tracking-wider">Veículo com Laudo Cautelar Verificado</span>
            </div>
          )}
        </div>

        {/* Countdown Urgency Block */}
        <div className="mb-10 bg-[#141414] p-6 rounded-3xl shadow-xl">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-bold text-[#B9B9B4] uppercase tracking-widest flex items-center gap-2">
              <Clock size={14} className="text-[#C1F11D] animate-spin" style={{ animationDuration: '4s' }} />
              Tempo limite para garantir esta oferta exclusiva de showroom
            </span>
            <span className="text-3xl font-black text-[#C1F11D]">{formatTime(timeLeft)}</span>
          </div>
          <div className="w-full bg-white/10 h-3 rounded-full overflow-hidden">
            <div className="bg-[#C1F11D] h-full transition-all duration-1000 ease-linear" style={{ width: `${progressPercent}%` }}></div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* Gallery and Car specs */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white rounded-3xl p-4 flex flex-col items-center relative overflow-hidden border border-[#E5E5E2]">
              
              <div className="w-full h-64 md:h-[400px] relative rounded-2xl overflow-hidden bg-[#F4F4F2] border border-[#E5E5E2]">
                <div 
                  className="flex w-full h-full transition-transform duration-500 ease-in-out"
                  style={{ transform: `translateX(-${currentPhotoIndex * 100}%)` }}
                >
                  {photosArray.map((url, index) => (
                    <img 
                      key={index}
                      src={url} 
                      alt={`Foto do veículo ${index + 1}`} 
                      className="w-full h-full object-cover shrink-0" 
                    />
                  ))}
                </div>
              </div>
              
              {photosArray.length > 1 && (
                <>
                  <button 
                    onClick={() => setCurrentPhotoIndex(prev => (prev - 1 + photosArray.length) % photosArray.length)} 
                    className="absolute left-8 top-1/2 -translate-y-1/2 bg-white/90 text-[#2A2A26] p-3 rounded-full border border-[#E5E5E2] cursor-pointer hover:bg-white transition"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button 
                    onClick={() => setCurrentPhotoIndex(prev => (prev + 1) % photosArray.length)} 
                    className="absolute right-8 top-1/2 -translate-y-1/2 bg-white/90 text-[#2A2A26] p-3 rounded-full border border-[#E5E5E2] cursor-pointer hover:bg-white transition"
                  >
                    <ChevronRight size={20} />
                  </button>
                  <div className="flex space-x-2 mt-5 z-20">
                    {photosArray.map((_, index) => (
                      <button 
                        key={index}
                        onClick={() => setCurrentPhotoIndex(index)}
                        className={`w-2.5 h-2.5 rounded-full transition-all ${currentPhotoIndex === index ? 'bg-[#141414] w-6' : 'bg-[#E5E5E2] hover:bg-[#D9D9D5]'}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="bg-white rounded-3xl p-8 border border-[#E5E5E2]">
              <h3 className="text-xl font-bold mb-6 text-[#141414] tracking-tight">Ficha Técnica e Destaques</h3>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                <div className="bg-[#F4F4F2] p-4 rounded-2xl border border-[#E5E5E2]">
                  <span className="block text-[11px] font-bold text-[#8A8A85] uppercase tracking-widest mb-1">Ano</span>
                  <span className="font-extrabold text-base text-[#141414]">{data.anoText || 'N/D'}</span>
                </div>
                <div className="bg-[#F4F4F2] p-4 rounded-2xl border border-[#E5E5E2]">
                  <span className="block text-[11px] font-bold text-[#8A8A85] uppercase tracking-widest mb-1">Cor</span>
                  <span className="font-extrabold text-base text-[#141414]">{data.corText || 'N/D'}</span>
                </div>
                <div className="bg-[#F4F4F2] p-4 rounded-2xl border border-[#E5E5E2]">
                  <span className="block text-[11px] font-bold text-[#8A8A85] uppercase tracking-widest mb-1">Câmbio</span>
                  <span className="font-extrabold text-base text-[#141414]">{data.cambio || 'Automático'}</span>
                </div>
                <div className="bg-[#F4F4F2] p-4 rounded-2xl border border-[#E5E5E2]">
                  <span className="block text-[11px] font-bold text-[#8A8A85] uppercase tracking-widest mb-1">Motor</span>
                  <span className="font-extrabold text-base text-[#141414]">{data.motorText || 'N/D'}</span>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-4 mb-8">
                <div className="w-full md:w-1/3 bg-[#F4F4F2] border border-[#E5E5E2] p-5 rounded-2xl flex flex-col justify-center">
                  <span className="text-[11px] font-bold text-[#8A8A85] uppercase tracking-widest mb-1">Média FIPE Oficial</span>
                  <span className="font-black text-xl text-[#2A2A26]">{formatCurrency(data.fipeValue)}</span>
                </div>
                {economia > 0 && (
                  <div className="w-full md:w-2/3 bg-[#C1F11D]/10 border border-[#C1F11D]/20 rounded-2xl p-5 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-[#141414] uppercase tracking-widest block mb-0.5">Oportunidade de Mercado</span>
                      <span className="font-black text-lg text-[#141414]">Abaixo da tabela oficial</span>
                    </div>
                    <span className="bg-[#141414] text-[#F4F4F2] font-extrabold text-xs px-3.5 py-2 rounded-full">
                      Você economiza {formatCurrency(economia)}
                    </span>
                  </div>
                )}
              </div>

              <h4 className="text-xs font-bold text-[#8A8A85] uppercase tracking-widest mb-4">Opcionais inclusos</h4>
              <div className="flex flex-wrap gap-2">
                {data.opcionais.split(',').map((opt, i) => (
                  <span key={i} className="bg-[#F4F4F2] border border-[#E5E5E2] text-[#5F5F5A] px-4 py-2 rounded-full text-xs font-semibold">
                    {opt.trim()}
                  </span>
                ))}
              </div>

              {/* Concessionária info */}
              <div className="border-t border-[#E5E5E2] pt-6 mt-6">
                <h4 className="text-xs font-black text-[#141414] uppercase tracking-widest mb-4">Sobre a Loja</h4>
                <div className="bg-[#F4F4F2] border border-[#E5E5E2] rounded-2xl p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="block text-[10px] text-[#8A8A85] font-bold uppercase tracking-wider mb-0.5">Razão Social</span>
                    <span className="text-sm font-semibold text-[#2A2A26]">{empresaLogada?.nome || 'BMW Premium SP'}</span>
                  </div>
                  {empresaLogada?.cnpj && (
                    <div>
                      <span className="block text-[10px] text-[#8A8A85] font-bold uppercase tracking-wider mb-0.5">CNPJ</span>
                      <span className="text-sm font-semibold text-[#2A2A26]">{empresaLogada.cnpj}</span>
                    </div>
                  )}
                  {empresaLogada?.email && (
                    <div>
                      <span className="block text-[10px] text-[#8A8A85] font-bold uppercase tracking-wider mb-0.5">E-mail de Contato</span>
                      <span className="text-sm font-semibold text-[#2A2A26]">{empresaLogada.email}</span>
                    </div>
                  )}
                  {empresaLogada?.telefone && (
                    <div>
                      <span className="block text-[10px] text-[#8A8A85] font-bold uppercase tracking-wider mb-0.5">Telefone Comercial</span>
                      <span className="text-sm font-semibold text-[#2A2A26]">{empresaLogada.telefone}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Pricing Signal Booking card */}
          <div>
            <div className="sticky top-24 space-y-6">
            {/* AGENDAMENTO DE VISITA (mesmo fluxo da visão mobile) */}
            <div>
              <SlotPickerCard titulo={data.title} onSelect={setSlotInfo} horarios={empresaLogada?.agendaHorarios} />
              {slotInfo && (
                <button
                  onClick={() => setShowAgendarSheet(true)}
                  className="w-full -mt-2 bg-[#C1F11D] text-[#141414] font-extrabold text-sm py-4 rounded-full flex items-center justify-center gap-2 hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer"
                >
                  Confirmar visita {slotInfo.diaLabel} às {slotInfo.hora} <ArrowRight size={15} />
                </button>
              )}
            </div>

            <div className="bg-white rounded-3xl p-8 border border-[#E5E5E2]">
              <h3 className="text-2xl font-bold mb-4 text-[#141414] tracking-tight">Garantir Reserva</h3>
              <p className="text-sm font-medium text-[#8A8A85] mb-8 leading-relaxed">
                Ao efetuar o sinal de garantia, este veículo é bloqueado imediatamente de visitas, testes e outros vendedores até você assinar o contrato final.
              </p>

              <div className="space-y-4 mb-8">
                <div className="flex justify-between items-center bg-[#F4F4F2] border border-[#E5E5E2] p-4 rounded-2xl">
                  <span className="text-[#8A8A85] font-semibold text-xs uppercase tracking-wider">Valor do Carro</span>
                  <span className="font-extrabold text-base text-[#141414]">{formatCurrency(data.valorVenda)}</span>
                </div>
                <div className="flex justify-between items-center bg-[#C1F11D]/15 border border-[#C1F11D]/30 p-4 rounded-2xl">
                  <span className="text-[#141414] font-bold text-xs uppercase tracking-wider">Sinal do PIX Requerido</span>
                  <span className="font-black text-2xl text-[#141414]">{formatCurrency(data.sinal)}</span>
                </div>
              </div>

              <div className="mb-8">
                <label className="block text-xs font-bold text-[#8A8A85] uppercase tracking-widest mb-3">Atendente Dedicado</label>
                <select 
                  className="w-full bg-[#F4F4F2] border-2 border-[#E5E5E2] rounded-2xl px-4 py-4 text-[15px] font-semibold text-[#2A2A26] focus:border-[#141414] outline-none appearance-none cursor-pointer"
                  value={selectedVendedor}
                  onChange={(e) => setSelectedVendedor(e.target.value)}
                >
                  <option value="" className="bg-white text-[#8A8A85]">Selecione seu vendedor...</option>
                  {(data.vendedores ? data.vendedores.split(',') : []).map((v, i) => (
                    <option key={i} value={v.trim()} className="bg-white text-[#2A2A26]">{v.trim()}</option>
                  ))}
                </select>
              </div>

              <button 
                disabled={timeLeft === 0 || !selectedVendedor}
                onClick={() => setShowPixModal(true)}
                className={`w-full font-bold text-base py-4 rounded-full transition-all duration-300 flex justify-center items-center ${
                  (timeLeft === 0 || !selectedVendedor)
                  ? 'bg-[#EBEBE8] text-[#B9B9B4] border border-[#E5E5E2] cursor-not-allowed' 
                  : 'bg-[#C1F11D] text-[#141414] hover:bg-[#b0e040] font-bold shadow-sm'
                }`}
              >
                {timeLeft === 0 ? 'Proposta Expirada' : 'Reservar com o PIX'}
              </button>
            </div>
            </div>
          </div>
        </div>
      </div>

      <AgendarVisitaSheet
        open={showAgendarSheet}
        onClose={() => setShowAgendarSheet(false)}
        tituloVeiculo={data.title}
        propostaId={data.id}
        lojaId={data.loja_id}
        slotInfo={slotInfo}
        telefone={empresaLogada?.telefone}
        onConfirmado={handleVisitaConfirmada}
        onPix={() => setShowPixModal(true)}
      />

      {showPixModal && (
        <PixModal
          onClose={() => setShowPixModal(false)}
          sinal={data.sinal}
          vendedor={selectedVendedor}
          showToast={showToast}
          onConfirm={() => {
            // 1. Atualizar proposta em recentReservations
            setRecentReservations((prev: any) => prev.map((res: any) => {
              if (res.id === data.id) {
                const novosLogs = [...(res.logs || [])];
                novosLogs.push({
                  time: new Date().toLocaleTimeString('pt-BR') + ' de ' + new Date().toLocaleDateString('pt-BR'),
                  text: `Sinal de R$ ${Number(data.sinal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} pago via PIX.`
                });
                return { ...res, status: 'Completed', paidSignal: true, logs: novosLogs };
              }
              return res;
            }));
            
            // 2. Incrementar reservasUsadas se necessário
            if (data.status !== 'Completed') {
              setReservasUsadas((prev: any) => Math.min(totalReservasPlano, prev + 1));
            }
            
            // 3. Atualizar estatísticas do vendedor
            if (setEmpresaLogada && selectedVendedor) {
              setEmpresaLogada((prevEmpresa: any) => {
                const vendedoresAtualizados = prevEmpresa.vendedores.map((v: any) => {
                  if (v.nome.trim().toLowerCase() === selectedVendedor.trim().toLowerCase()) {
                    const totalLinks = v.linksGerados > 0 ? v.linksGerados : 1;
                    const vendasAtuais = Math.round(totalLinks * (v.conversao / 100)) + 1;
                    const novaConversao = Math.min(100, Math.round((vendasAtuais / totalLinks) * 100));
                    return {
                      ...v,
                      conversao: novaConversao
                    };
                  }
                  return v;
                });
                return { ...prevEmpresa, vendedores: vendedoresAtualizados };
              });
            }
          }}
        />
      )}
    </div>
  );
}

// --- AGENDAMENTO DE VISITA (port do ReservaFast: day chips + slots + hold 10min) ---
const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const HORARIOS_VISITA = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'];

function SlotPickerCard({ titulo, onSelect, horarios }) {
  // Agenda definida pelo lojista nas Configurações; fallback para a grade padrão
  const grade = (horarios && horarios.length > 0) ? horarios : HORARIOS_VISITA;

  const dias = useMemo(() => {
    const hoje = new Date();
    return Array.from({ length: 5 }, (_, i) => {
      const d = new Date(hoje);
      d.setDate(hoje.getDate() + i);
      return d;
    });
  }, []);

  // Se todos os horários de hoje já passaram, abre direto em "Amanhã" —
  // senão o lead cai numa grade 100% indisponível (beco sem saída à noite).
  const [diaAtivo, setDiaAtivo] = useState(() => {
    const agora = new Date();
    return grade.every(h => parseInt(h) <= agora.getHours()) ? 1 : 0;
  });
  const [slotSel, setSlotSel] = useState<string | null>(null);
  const [holdLeft, setHoldLeft] = useState(0);
  // Inicia colapsado para reduzir a altura do card; expande sob demanda
  const [expanded, setExpanded] = useState(false);

  // Slots ocupados determinísticos por dia (demo; em produção vêm da agenda real)
  const ocupados = useMemo(() => {
    const seed = dias[diaAtivo].getDate();
    return grade.filter((_, i) => (seed * 7 + i * 3) % 11 < 2);
  }, [dias, diaAtivo, grade]);

  const agora = new Date();
  // "Passou" (hora de hoje que ficou para trás) não é o mesmo que "ocupado"
  // (alguém agendou) — rotular hora passada de "ocupado" engana o lead.
  const jaPassou = (h: string) => diaAtivo === 0 && parseInt(h) <= agora.getHours();
  const indisponivel = (h: string) => ocupados.includes(h) || jaPassou(h);
  // Só agendamentos reais (futuros) contam na mensagem de fila.
  const qtdOcupados = grade.filter(h => ocupados.includes(h) && !jaPassou(h)).length;

  const diaLabel = (i: number) => i === 0 ? 'Hoje' : i === 1 ? 'Amanhã' : DIAS_SEMANA[dias[i].getDay()];

  const escolher = (h: string) => {
    setSlotSel(h);
    onSelect({ dia: dias[diaAtivo], diaLabel: diaLabel(diaAtivo).toLowerCase(), hora: h });
  };

  const trocarDia = (i: number) => {
    setDiaAtivo(i);
    setSlotSel(null);
    onSelect(null);
  };

  // Hold de 10min persistente em localStorage (refresh não reseta)
  useEffect(() => {
    if (!slotSel) { setHoldLeft(0); return; }
    const key = `rf_hold_${titulo}_${dias[diaAtivo].getDate()}_${slotSel}`;
    let inicio = Number(localStorage.getItem(key));
    if (!inicio) { inicio = Date.now(); localStorage.setItem(key, String(inicio)); }
    const tick = () => {
      const rest = 600 - Math.floor((Date.now() - inicio) / 1000);
      if (rest <= 0) {
        localStorage.removeItem(key);
        setSlotSel(null);
        onSelect(null);
        return;
      }
      setHoldLeft(rest);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [slotSel, diaAtivo, titulo]);

  return (
    <div className="bg-[#141414] rounded-[28px] p-5 mb-6 text-white">
      {/* Header colapsável */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        className="w-full flex items-center justify-between gap-3 text-left cursor-pointer group/header"
      >
        <div>
          <h3 className="text-lg font-extrabold tracking-tight">Escolha seu horário</h3>
          <p className="text-xs text-white/50 font-medium">
            {slotSel
              ? <>Visita marcada: <strong className="text-[#C1F11D] font-bold">{diaLabel(diaAtivo)} às {slotSel}</strong></>
              : <>Visita exclusiva de 30min — <strong className="text-[#C1F11D] font-bold">o carro fica separado para você</strong></>}
          </p>
        </div>
        <span className={`w-9 h-9 shrink-0 bg-white/10 group-hover/header:bg-white/15 rounded-full flex items-center justify-center transition-all duration-300 ${expanded ? 'rotate-180 bg-[#C1F11D] text-[#141414]' : 'text-[#C1F11D]'}`}>
          <ChevronDown size={18} strokeWidth={2.5} />
        </span>
      </button>

      {/* Conteúdo expansível (day chips + grade de horários + fila) */}
      <div className={`grid transition-all duration-300 ease-in-out ${expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
        <div className="overflow-hidden">
          <div className="pt-4">
            {/* Day chips */}
            <div className="flex gap-2 mb-3.5 overflow-x-auto pb-1 [scrollbar-width:none]">
              {dias.map((d, i) => (
                <button
                  key={i}
                  onClick={() => trocarDia(i)}
                  className={`shrink-0 rounded-[14px] px-4 py-2 text-center transition-all cursor-pointer border-[1.5px] ${
                    diaAtivo === i ? 'bg-[#C1F11D] border-[#C1F11D]' : 'bg-white/10 border-transparent hover:bg-white/15'
                  }`}
                >
                  <span className={`block text-[10px] font-semibold ${diaAtivo === i ? 'text-[#141414]/60' : 'text-white/50'}`}>{diaLabel(i)}</span>
                  <span className={`block text-sm font-extrabold ${diaAtivo === i ? 'text-[#141414]' : 'text-white'}`}>{String(d.getDate()).padStart(2, '0')}</span>
                </button>
              ))}
            </div>

            {/* Slot grid */}
            <div className="grid grid-cols-3 gap-2">
              {grade.map((h) => {
                const passou = jaPassou(h);
                const taken = indisponivel(h);
                const sel = slotSel === h;
                return (
                  <button
                    key={h}
                    disabled={taken}
                    onClick={() => escolher(h)}
                    className={`rounded-[14px] px-2 py-2.5 text-center transition-all border-[1.5px] ${
                      taken
                        ? 'bg-white/5 border-transparent opacity-35 cursor-not-allowed'
                        : sel
                          ? 'bg-[#C1F11D] border-[#C1F11D] cursor-pointer'
                          : 'bg-white/10 border-transparent hover:bg-white/15 cursor-pointer'
                    }`}
                  >
                    <span className={`block text-sm font-extrabold ${sel ? 'text-[#141414]' : 'text-white'} ${taken && !passou ? 'line-through' : ''}`}>{h}</span>
                    <span className={`block text-[9px] font-semibold ${sel ? 'text-[#141414]/60' : 'text-white/40'}`}>{passou ? '—' : taken ? 'ocupado' : '30min'}</span>
                  </button>
                );
              })}
            </div>

            {/* Fila — escassez real, não inventada */}
            {qtdOcupados > 0 && (
              <div className="mt-3 bg-white/5 rounded-[14px] px-3.5 py-3 text-xs font-medium text-white/60 leading-relaxed">
                <strong className="text-white font-bold">{qtdOcupados} {qtdOcupados === 1 ? 'pessoa agendou' : 'pessoas agendaram'}</strong> visita para este veículo. Se algum horário liberar, quem estiver na fila é avisado no WhatsApp.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CTA compacto quando colapsado e sem horário escolhido */}
      {!expanded && !slotSel && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-3.5 w-full bg-white/10 hover:bg-white/15 rounded-[14px] px-3.5 py-3 flex items-center justify-center gap-2 text-xs font-bold text-white transition-colors cursor-pointer"
        >
          Ver horários disponíveis <ChevronDown size={14} className="text-[#C1F11D]" />
        </button>
      )}

      {/* Hold timer — sempre visível enquanto ativo, mesmo colapsado */}
      {slotSel && holdLeft > 0 && (
        <div className="mt-3.5 bg-[#C1F11D]/10 rounded-[14px] px-3.5 py-2.5 flex items-center gap-2 text-xs font-semibold text-[#C1F11D]">
          <Clock size={14} />
          <span>Horário segurado para você</span>
          <span className="ml-auto font-extrabold text-sm">
            {String(Math.floor(holdLeft / 60)).padStart(2, '0')}:{String(holdLeft % 60).padStart(2, '0')}
          </span>
        </div>
      )}
    </div>
  );
}

function AgendarVisitaSheet({ open, onClose, tituloVeiculo, propostaId, lojaId, slotInfo, telefone, onConfirmado, onPix }) {
  const [nome, setNome] = useState('');
  const [zap, setZap] = useState('');
  const [sucesso, setSucesso] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const enviandoRef = useRef(false);

  useEffect(() => { if (open) { setSucesso(false); setEnviando(false); enviandoRef.current = false; } }, [open]);

  if (!open || !slotInfo) return null;

  const confirmar = async () => {
    if (!nome.trim() || zap.replace(/\D/g, '').length < 10) return;
    if (enviandoRef.current) return; // evita confirmação dupla
    enviandoRef.current = true;
    setEnviando(true);

    // Persiste a visita + dispara o evento de atividade (Realtime). Best-effort:
    // qualquer falha não pode quebrar a confirmação para o cliente.
    try {
      if (isSupabaseConfigured && lojaId && propostaId) {
        const d = slotInfo.dia instanceof Date ? slotInfo.dia : new Date();
        const diaISO = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const whatsapp = zap.replace(/\D/g, '');
        // Dedupe: não recria visita/evento se a mesma visita já foi agendada
        // (ex.: reabrir o sheet e confirmar de novo o mesmo horário).
        const { data: existente } = await supabase.from('visitas')
          .select('id')
          .eq('proposta_id', propostaId).eq('dia', diaISO)
          .eq('hora', slotInfo.hora).eq('whatsapp', whatsapp)
          .limit(1);
        if (!existente || existente.length === 0) {
          await supabase.from('visitas').insert({
            proposta_id: propostaId, cliente_nome: nome.trim(), whatsapp,
            dia: diaISO, hora: slotInfo.hora, status: 'agendada',
          });
          await supabase.from('proposta_eventos').insert({
            loja_id: lojaId, proposta_id: propostaId, tipo: 'visita',
            titulo: nome.trim(),
            descricao: `${nome.trim()} agendou visita para ${slotInfo.diaLabel} às ${slotInfo.hora} — ${tituloVeiculo}.`,
            meta: { dia: diaISO, hora: slotInfo.hora },
          });
        }
      }
    } catch { /* best-effort */ }

    setEnviando(false);
    setSucesso(true);
    onConfirmado(nome.trim(), slotInfo);
  };

  const falarVendedor = () => {
    let phone = (telefone || '5511999998822').replace(/\D/g, '');
    if (phone.length === 10 || phone.length === 11) phone = '55' + phone;
    const msg = encodeURIComponent(`Olá! Sou ${nome}, acabei de confirmar minha visita para ver o ${tituloVeiculo} ${slotInfo.diaLabel} às ${slotInfo.hora}. Até lá!`);
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-[70] bg-[#141414]/55 flex items-end justify-center animate-fadeIn" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-t-[28px] w-full max-w-md px-5 pt-6 pb-8">
        <div className="w-10 h-1 bg-[#EBEBE8] rounded-full mx-auto mb-5"></div>

        {!sucesso ? (
          <>
            <h3 className="text-xl font-extrabold tracking-tight text-[#141414]">Confirmar visita</h3>
            <p className="text-sm font-medium text-[#8A8A85] mb-4">Só precisamos do seu nome — leva 10 segundos</p>

            <div className="bg-[#F4F4F2] rounded-[20px] p-4 mb-3.5">
              {[
                ['Veículo', tituloVeiculo],
                ['Horário', `${slotInfo.diaLabel.charAt(0).toUpperCase() + slotInfo.diaLabel.slice(1)} · ${slotInfo.hora}`],
                ['Duração', '30min exclusivos'],
                ['Custo', 'Grátis'],
              ].map(([k, v], i) => (
                <div key={i} className="flex justify-between items-center py-1.5 text-sm">
                  <span className="font-medium text-[#8A8A85]">{k}</span>
                  <span className={`font-extrabold ${k === 'Custo' ? 'text-[#1E9E5A]' : 'text-[#141414]'}`}>{v}</span>
                </div>
              ))}
            </div>

            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Seu nome completo"
              className="w-full bg-[#F4F4F2] border-2 border-transparent focus:border-[#C1F11D] rounded-[20px] px-4 py-3.5 text-[15px] font-semibold text-[#141414] outline-none mb-2.5 transition-colors placeholder:text-[#B9B9B4]"
            />
            <input
              value={zap}
              onChange={(e) => setZap(e.target.value)}
              placeholder="Seu WhatsApp (DDD + número)"
              type="tel"
              className="w-full bg-[#F4F4F2] border-2 border-transparent focus:border-[#C1F11D] rounded-[20px] px-4 py-3.5 text-[15px] font-semibold text-[#141414] outline-none mb-2.5 transition-colors placeholder:text-[#B9B9B4]"
            />

            <button onClick={confirmar} disabled={enviando} className="w-full bg-[#C1F11D] text-[#141414] rounded-full py-4 text-base font-extrabold mt-1 active:scale-[0.98] transition-transform cursor-pointer disabled:opacity-60 disabled:cursor-wait">
              {enviando ? 'Confirmando...' : 'Confirmar minha visita'}
            </button>
          </>
        ) : (
          <div className="text-center py-2">
            <div className="w-[72px] h-[72px] bg-[#C1F11D] rounded-[24px] flex items-center justify-center mx-auto mb-4">
              <Check size={36} className="text-[#141414]" strokeWidth={3} />
            </div>
            <h3 className="text-xl font-extrabold tracking-tight text-[#141414] mb-1.5">Visita confirmada!</h3>
            <p className="text-sm font-medium text-[#8A8A85] leading-relaxed mb-5">
              <strong className="text-[#141414] font-bold">{tituloVeiculo} — {slotInfo.diaLabel} às {slotInfo.hora}</strong><br />
              O vendedor já foi avisado. Você vai receber a confirmação e o lembrete no WhatsApp.
            </p>
            <button onClick={falarVendedor} className="w-full bg-[#C1F11D] text-[#141414] rounded-full py-4 text-base font-extrabold active:scale-[0.98] transition-transform cursor-pointer">
              Falar com o vendedor agora
            </button>
            <button onClick={() => { onClose(); onPix(); }} className="w-full bg-[#141414] text-white rounded-full py-4 text-base font-extrabold mt-2.5 active:scale-[0.98] transition-transform cursor-pointer">
              Garantir com sinal Pix
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// --- PÁGINA PÚBLICA DA PROPOSTA (link compartilhável: ?p=<id>) ---
function PublicPropostaView({ id, showToast }) {
  const [loading, setLoading] = useState(true);
  const [reserva, setReserva] = useState<any>(null);
  const [loja, setLoja] = useState<any>(null);
  const [erro, setErro] = useState(false);
  const viewLoggedRef = useRef(false);
  const [isDesktop, setIsDesktop] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 1024);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    setIsDesktop(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        if (!isSupabaseConfigured) { setErro(true); return; }
        const { data: p } = await supabase.from('propostas').select('*').eq('id', id).maybeSingle();
        if (!p) { setErro(true); return; }
        const { data: l } = await supabase.from('lojas').select('nome,telefone,email').eq('id', p.loja_id).maybeSingle();
        let vendName = '';
        if (p.vendedor_id) {
          const { data: v } = await supabase.from('vendedores').select('nome').eq('id', p.vendedor_id).maybeSingle();
          vendName = v?.nome || '';
        }
        setReserva({
          id: p.id, loja_id: p.loja_id, title: p.title, anoText: p.ano, corText: p.cor, motorText: p.motor, combustivel: p.motor,
          cambio: p.cambio, km: p.km, opcionais: p.opcionais || '',
          fipeValue: clampPrice(p.fipe_value), valorVenda: clampPrice(p.valor_venda),
          sinal: Number(p.sinal) || 0,
          expiracao: p.expiracao, duration: String(p.expiracao),
          status: p.status, clienteNome: p.cliente_nome || 'Cliente',
          fotos: (p.fotos || []).join(','), vendedores: vendName,
          created: new Date(p.created_at).toLocaleString('pt-BR'),
          elapsedSeconds: 0, laudoAprovado: true, logs: [],
        });
        setLoja(l || { nome: 'Showroom', telefone: '' });

        // Registra a abertura do link (notifica o lojista em tempo real via Realtime).
        if (!viewLoggedRef.current) {
          viewLoggedRef.current = true;
          supabase.from('proposta_eventos').insert({
            proposta_id: p.id, loja_id: p.loja_id, tipo: 'view',
            titulo: p.title, descricao: `${p.title} foi aberta pelo cliente agora.`,
          }).then(() => {}, () => {});
        }
      } catch { setErro(true); }
      finally { setLoading(false); }
    })();
  }, [id]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#F4F4F2] text-[#8A8A85] font-bold gap-2"><RefreshCw className="animate-spin" size={18} /> Carregando proposta...</div>;
  }
  if (erro || !reserva) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F4F4F2] text-center px-6">
        <div className="w-14 h-14 bg-[#141414] rounded-2xl flex items-center justify-center mb-4"><Car size={28} className="text-[#C1F11D]" /></div>
        <p className="text-xl font-extrabold text-[#141414]">Proposta não encontrada</p>
        <p className="text-sm text-[#8A8A85] mt-2 max-w-xs">O link pode ter expirado ou está incorreto. Peça um novo link ao vendedor.</p>
      </div>
    );
  }

  const sharedProps = {
    reservation: reserva,
    navigateTo: () => {},
    showToast,
    recentReservations: [reserva],
    setRecentReservations: () => {},
    setReservasUsadas: () => {},
    reservasUsadas: 0,
    totalReservasPlano: 999,
    empresaLogada: loja,
    setEmpresaLogada: () => {},
    previewOrigin: 'home',
    publicarProposta: undefined,
    publicMode: true as const,
  };

  // Desktop: mesmo layout largo do preview do lojista. Mobile: visão de celular.
  return isDesktop
    ? <PreviewView {...sharedProps} />
    : <MobileClientView {...sharedProps} />;
}

// --- NEW: MOBILE CLIENT VIEW (PREMIUM SMARTPHONE SIMULATOR) ---
function MobileClientView({
  publicarProposta,
  publicMode = false,
  reservation,
  navigateTo, 
  showToast, 
  recentReservations = [], 
  setRecentReservations, 
  setReservasUsadas, 
  reservasUsadas = 0, 
  totalReservasPlano = 30,
  empresaLogada,
  setEmpresaLogada,
  previewOrigin,
  setDashboardTab = (_t: string) => {},
  setDraftToResume = (_d: any) => {}
}) {
  const data = reservation || {
    title: 'BMW 320i Sport GP 2024',
    anoText: '2024', corText: 'Preto Safira', motorText: '2.0 TwinPower Flex', km: '3.200', cambio: 'ZF Automático', combustivel: 'Flex',
    fipeValue: 285000, valorVenda: 269000,
    fotos: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=800&q=80',
    sinal: 5000, expiracao: 120, vendedores: 'Marcos Freitas',
    laudoAprovado: true,
    opcionais: 'Teto Solar, Couro Mocha, Rodas Liga Leve 18", Faróis Full LED, Painel Widescreen Curvo'
  };

  const [timeLeft, setTimeLeft] = useState(data.expiracao * 60); 
  const [showPixModal, setShowPixModal] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'veiculo' | 'ficha' | 'atividade'>('veiculo');

  useEffect(() => {
    if (reservation && setRecentReservations) {
      setRecentReservations((prev: any) => prev.map((res: any) => {
        if (res.id === reservation.id) {
          const novosLogs = [...(res.logs || [])];
          const alreadyLoggedView = novosLogs.some(l => l.text.includes('visualizada') || l.text.includes('Visualizado'));
          if (!alreadyLoggedView) {
            novosLogs.push({
              time: new Date().toLocaleTimeString('pt-BR') + ' de ' + new Date().toLocaleDateString('pt-BR'),
              text: `Proposta visualizada via celular (Cliente) pelo Lead.`
            });
            return { ...res, logs: novosLogs };
          }
        }
        return res;
      }));
    }
  }, [reservation?.id, setRecentReservations]);
  const [selectedAtendente, setSelectedAtendente] = useState(data.vendedores ? data.vendedores.split(',')[0] : '');
  const [animateTimeline, setAnimateTimeline] = useState(false);

  // Agendamento de visita (slot picker + sheet de confirmação)
  const [slotInfo, setSlotInfo] = useState<any>(null);
  const [showAgendarSheet, setShowAgendarSheet] = useState(false);
  const touchStartX = useRef(0);

  const handleVisitaConfirmada = (nomeCliente, slot) => {
    showToast(`Visita de ${nomeCliente} confirmada para ${slot.diaLabel} às ${slot.hora}!`, 'success');
    if (reservation && setRecentReservations) {
      setRecentReservations((prev: any) => prev.map((res: any) => {
        if (res.id === reservation.id) {
          const novosLogs = [...(res.logs || [])];
          novosLogs.push({
            time: new Date().toLocaleTimeString('pt-BR') + ' de ' + new Date().toLocaleDateString('pt-BR'),
            text: `Visita agendada por ${nomeCliente} para ${slot.diaLabel} às ${slot.hora}.`
          });
          return { ...res, logs: novosLogs, clienteNome: nomeCliente };
        }
        return res;
      }));
    }
  };

  useEffect(() => {
    if (activeTab === 'atividade') {
      setAnimateTimeline(false);
      const timer = setTimeout(() => setAnimateTimeline(true), 50);
      return () => clearTimeout(timer);
    } else {
      setAnimateTimeline(false);
    }
  }, [activeTab]);
  
  const economiaPct = Math.round((1 - (data.valorVenda / data.fipeValue)) * 100) || 6;
  const photosArray = data.fotos ? data.fotos.split(',').map((url: any) => url.trim()).filter(Boolean) : ['https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=800&q=80'];

  // Linha do tempo da proposta — derivada do andamento real (sem eventos mock).
  const timelineEvents = useMemo(() => {
    const evts: any[] = [];
    const economia = Math.max(0, (Number(data.fipeValue) || 0) - (Number(data.valorVenda) || 0));
    const temFotosReais = !!data.fotos && photosArray.length > 0;
    const isPaid = data.status === 'Completed' || data.paidSignal;

    // Reserva efetuada — sempre (a proposta foi gerada)
    evts.push({
      key: 'reserva',
      title: 'Reserva Efetuada',
      desc: 'O link exclusivo do veículo foi gerado e enviado para o cliente.',
      done: true,
    });

    // Atualização da Tabela FIPE — quando há FIPE
    if (Number(data.fipeValue) > 0) {
      evts.push({
        key: 'fipe',
        title: 'Atualização da Tabela FIPE',
        desc: economia > 0
          ? `Tabela FIPE oficial carregada: preço exclusivo com ${formatCurrency(economia)} de desconto.`
          : 'Tabela FIPE oficial carregada e validada para esta proposta.',
        done: true,
      });
    }

    // Fotos adicionadas — quando o lojista anexou fotos reais
    if (temFotosReais) {
      evts.push({
        key: 'fotos',
        title: 'Fotos do Veículo Adicionadas',
        desc: `${photosArray.length} ${photosArray.length === 1 ? 'foto real do veículo foi anexada' : 'fotos reais do veículo foram anexadas'} à proposta.`,
        done: true,
      });
    }

    // Pix gerado — quando há sinal definido
    if (Number(data.sinal) > 0) {
      evts.push({
        key: 'pix',
        title: 'Sinal via Pix Gerado',
        desc: `Pagamento do sinal de ${formatCurrency(Number(data.sinal))} disponibilizado para garantir a reserva.`,
        done: true,
      });
    }

    // Visita agendada — quando o cliente escolhe um horário
    if (slotInfo) {
      evts.push({
        key: 'visita',
        title: 'Visita Agendada',
        desc: `Horário reservado para ${slotInfo.diaLabel} às ${slotInfo.hora} — o carro fica separado para você.`,
        done: true,
      });
    }

    // Estado atual / próximo passo
    if (isPaid) {
      evts.push({
        key: 'confirmada',
        title: 'Reserva Confirmada',
        desc: 'Sinal pago via Pix — veículo reservado exclusivamente para o cliente.',
        done: true,
      });
    } else {
      evts.push({
        key: 'aguardando',
        title: 'Aguardando Pagamento do Sinal',
        desc: 'Assim que o Pix do sinal for confirmado, o veículo fica reservado só para você.',
        done: false,
      });
    }

    return evts;
  }, [data.fipeValue, data.valorVenda, data.sinal, data.fotos, data.status, data.paidSignal, photosArray.length, slotInfo]);

  // Altura da linha de progresso (preto) até o último evento concluído.
  const timelineLinePct = timelineEvents.length > 1
    ? Math.round((timelineEvents.reduce((acc, e, i) => (e.done ? i : acc), 0) / (timelineEvents.length - 1)) * 100)
    : 100;

  const isPrePublish = reservation && !recentReservations.some((r: any) => r.id === reservation.id);

  const publishingRef = useRef(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const handlePublish = async () => {
    if (publishingRef.current) return; // evita publicação dupla (duplo clique / reentrância)
    if (reservasUsadas >= totalReservasPlano) {
      showToast('Limite de links do plano atingido pela concessionária.', 'error');
      return;
    }
    publishingRef.current = true;
    setIsPublishing(true);
    try {
      if (publicarProposta) { await publicarProposta(reservation); } else { setRecentReservations([reservation, ...recentReservations]); }
      setReservasUsadas((prev: any) => prev + 1);

      // Incrementa linksGerados do vendedor associado à proposta
      if (setEmpresaLogada && reservation?.vendedores) {
        setEmpresaLogada((prevEmpresa: any) => {
          const vendedoresAtualizados = prevEmpresa.vendedores.map((v: any) => {
            if (v.nome.trim().toLowerCase() === reservation.vendedores.trim().toLowerCase()) {
              return {
                ...v,
                linksGerados: (v.linksGerados || 0) + 1
              };
            }
            return v;
          });
          return { ...prevEmpresa, vendedores: vendedoresAtualizados };
        });
      }

      showToast('Link de reserva criado e publicado com sucesso!', 'success');
      setDashboardTab && setDashboardTab('ativos');
      navigateTo('dashboard');
    } catch {
      publishingRef.current = false;
      setIsPublishing(false);
      showToast('Não foi possível publicar a proposta. Tente novamente.', 'error');
    }
  };

  useEffect(() => {
    if (timeLeft <= 0) return;
    const intervalId = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(intervalId);
  }, [timeLeft]);

  const formatTimeFull = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progressPercent = (timeLeft / (data.expiracao * 60)) * 100;

  return (
    <div className={publicMode ? "min-h-screen w-full max-w-full overflow-x-hidden bg-white relative" : "min-h-screen bg-[#F4F4F2] py-12 flex justify-center relative items-center px-4"}>
      {!publicMode && (
        <button
          onClick={() => navigateTo(isPrePublish ? 'cadastrar-reserva' : previewOrigin)}
          className="absolute top-6 left-6 text-[#6F6F6A] hover:text-[#141414] font-semibold flex items-center text-sm transition z-20 bg-white border border-[#E5E5E2] px-4 py-2 rounded-xl"
        >
          <ChevronLeft size={16} className="mr-1"/> {isPrePublish ? 'Voltar para o Cadastro' : 'Voltar ao Painel'}
        </button>
      )}

      {isPrePublish && (
        <div className="absolute top-6 right-6 bg-white border border-[#E5E5E2] p-5 rounded-2xl flex flex-col justify-between items-center gap-3 z-20 w-64">
          <div className="text-center">
            <h4 className="font-extrabold text-xs text-[#141414]">Visualização Mobile</h4>
            <p className="text-[10px] text-[#8A8A85] mt-1 font-semibold leading-relaxed">Confirme a proposta abaixo para salvá-la no painel.</p>
          </div>
          <button
            onClick={handlePublish}
            disabled={isPublishing}
            className="w-full bg-[#141414] hover:bg-[#2A2A26] text-[#F4F4F2] font-bold text-[11px] py-3 rounded-xl transition text-center disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isPublishing ? 'Publicando...' : 'Confirmar e Publicar'}
          </button>
        </div>
      )}

      {/* Container — moldura de celular (preview do lojista) ou site normal (link público) */}
      <div className={publicMode
        ? "w-full max-w-md mx-auto min-h-screen overflow-x-hidden bg-white relative flex flex-col"
        : "w-[390px] h-[820px] bg-[#141414] rounded-[48px] shadow-2xl overflow-hidden relative border-[8px] border-[#2A2A26] flex flex-col scale-95 md:scale-100"}>

        {/* Notch dynamic simulated island (só no preview do lojista) */}
        {!publicMode && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-32 h-5 bg-black rounded-full z-[60] flex items-center justify-center">
            <div className="w-2.5 h-2.5 bg-[#141414] rounded-full ml-auto mr-3 border border-[#2A2A26]"></div>
          </div>
        )}

        {/* App View Header */}
        <div className={`bg-white text-[#141414] px-5 pb-4 flex justify-between items-center shrink-0 border-b border-[#E5E5E2] ${publicMode ? 'pt-4 sticky top-0 z-30' : 'pt-10'}`}>
          <div className="flex items-center">
            {!publicMode && <ArrowLeft size={20} className="mr-3 cursor-pointer text-[#2A2A26]" onClick={() => navigateTo(isPrePublish ? 'cadastrar-reserva' : previewOrigin)} />}
            {publicMode && (
              <div className="w-7 h-7 bg-[#141414] rounded-lg flex items-center justify-center mr-2.5 shrink-0">
                <Car size={15} className="text-[#C1F11D]" />
              </div>
            )}
            <h2 className="text-base font-bold truncate">{publicMode ? (empresaLogada?.nome || 'Showroom') : 'Proposta de Showroom'}</h2>
          </div>
          <Share size={18} className="cursor-pointer text-[#2A2A26]" />
        </div>

        {/* Conteúdo: scroll interno no preview, fluxo normal no site público */}
        <div className={publicMode ? "pb-28 bg-white overflow-x-hidden" : "flex-1 overflow-y-auto pb-24 bg-white"}>
          
          {/* Photos and Indicators (slider funcional: dots clicáveis + setas + swipe) */}
          <div
            className="relative w-full h-56 bg-[#F4F4F2] overflow-hidden shrink-0 group/slider"
            onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
            onTouchEnd={(e) => {
              const delta = e.changedTouches[0].clientX - touchStartX.current;
              if (Math.abs(delta) < 40 || photosArray.length < 2) return;
              setCurrentPhotoIndex(prev => delta < 0
                ? (prev + 1) % photosArray.length
                : (prev - 1 + photosArray.length) % photosArray.length);
            }}
          >
            <div
              className="flex w-full h-full transition-transform duration-500 ease-in-out"
              style={{ transform: `translateX(-${currentPhotoIndex * 100}%)` }}
            >
              {photosArray.map((url, index) => (
                <img
                  key={index}
                  src={url}
                  alt={`Car ${index}`}
                  className="w-full h-full object-cover shrink-0"
                />
              ))}
            </div>

            <div className="absolute top-4 right-4 bg-[#141414] text-white text-[10px] font-black px-2.5 py-1.5 rounded-full flex items-center z-20">
              <span className="w-1.5 h-1.5 bg-white rounded-full mr-1 animate-pulse"></span>
              VERIFICADO
            </div>

            {photosArray.length > 1 && (
              <>
                {/* Setas de navegação */}
                <button
                  type="button"
                  onClick={() => setCurrentPhotoIndex(prev => (prev - 1 + photosArray.length) % photosArray.length)}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center text-[#141414] shadow-md z-20 active:scale-90 transition-transform cursor-pointer"
                  aria-label="Foto anterior"
                >
                  <ChevronLeft size={16} strokeWidth={2.5} />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPhotoIndex(prev => (prev + 1) % photosArray.length)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center text-[#141414] shadow-md z-20 active:scale-90 transition-transform cursor-pointer"
                  aria-label="Próxima foto"
                >
                  <ChevronRight size={16} strokeWidth={2.5} />
                </button>

                {/* Dots clicáveis */}
                <div className="absolute bottom-4 left-0 w-full flex justify-center space-x-1.5 z-20">
                  {photosArray.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCurrentPhotoIndex(idx)}
                      aria-label={`Ver foto ${idx + 1}`}
                      className={`h-1.5 rounded-full cursor-pointer transition-all ${currentPhotoIndex === idx ? 'w-5 bg-[#C1F11D]' : 'w-1.5 bg-white/80 hover:bg-white'}`}
                    ></button>
                  ))}
                </div>

                {/* Contador de fotos */}
                <span className="absolute bottom-3.5 right-3 bg-[#141414]/70 text-white text-[9px] font-bold px-2 py-0.5 rounded-full z-20">
                  {currentPhotoIndex + 1}/{photosArray.length}
                </span>
              </>
            )}
          </div>

          <div className="px-5 pt-6 pb-4">
            {data.laudoAprovado && (
              <div className="mb-3 flex items-center text-[#141414] bg-[#C1F11D]/15 w-max px-3 py-1 rounded-full border border-[#C1F11D]/30 text-[10px] font-black">
                <Shield size={12} className="mr-1.5 text-[#141414]" />
                LAUDO CAUTELAR TOTALMENTE APROVADO
              </div>
            )}
            
            {(() => { const tv = parseVeiculoTitulo(data.title); return (
              <>
                <h1 className="text-2xl font-extrabold text-[#141414] tracking-tight leading-tight break-words">{tv.marca} {tv.modelo}</h1>
                {tv.resto && <p className="text-[11px] font-medium text-[#8A8A85] uppercase tracking-wide mt-1">{tv.resto}</p>}
              </>
            ); })()}
            <p className="text-xs text-[#8A8A85] mt-2 mb-4 font-semibold">
              {data.anoText || '2024'} • {formatKm(data.km) || '0 km'} • {data.corText || 'Preto'} • {data.cambio || 'Automático'}
            </p>
            
            <div className="flex items-center mb-6 gap-3">
              <span className="text-2xl font-black text-[#141414]">{formatCurrency(data.valorVenda)}</span>
              {economiaPct > 0 && (
                <span className="bg-[#C1F11D]/20 text-[#141414] text-[10px] font-bold px-2.5 py-1 rounded-full border border-[#C1F11D]/30">
                  {economiaPct}% abaixo FIPE
                </span>
              )}
            </div>

            {/* Countdown widget */}
            <div className="bg-[#141414] rounded-2xl p-5 mb-6 shadow-lg">
              <h3 className="text-[10px] font-bold uppercase tracking-widest mb-1 text-[#B9B9B4]">RESERVADO EXCLUSIVAMENTE PARA VOCÊ</h3>
              <div className="flex justify-between items-end mb-3">
                <span className="text-3xl font-black leading-none text-[#C1F11D]">{formatTimeFull(timeLeft)}</span>
                <span className="bg-[#C1F11D] text-[#141414] text-[10px] font-black px-2 py-0.5 rounded-full uppercase">ATIVO</span>
              </div>
              <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                 <div className="bg-[#C1F11D] h-full" style={{ width: `${progressPercent}%` }}></div>
              </div>
              <p className="text-[10px] text-[#B9B9B4] font-semibold mt-1">4 clientes estão visualizando este link agora</p>
            </div>

            {/* AGENDAMENTO DE VISITA (slot picker estilo ReservaFast) */}
            <SlotPickerCard titulo={data.title} onSelect={setSlotInfo} horarios={empresaLogada?.agendaHorarios} />

            {/* Tabs Bar */}
            <div className="flex border-b border-[#E5E5E2] mb-6 bg-white shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('veiculo')}
                className={`flex-1 pb-3 text-xs font-black text-center border-b-2 transition ${
                  activeTab === 'veiculo'
                    ? 'border-[#141414] text-[#141414]'
                    : 'border-transparent text-[#B9B9B4] hover:text-[#6F6F6A]'
                }`}
              >
                VEÍCULO
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('ficha')}
                className={`flex-1 pb-3 text-xs font-black text-center border-b-2 transition ${
                  activeTab === 'ficha'
                    ? 'border-[#141414] text-[#141414]'
                    : 'border-transparent text-[#B9B9B4] hover:text-[#6F6F6A]'
                }`}
              >
                FICHA
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('atividade')}
                className={`flex-1 pb-3 text-xs font-black text-center border-b-2 transition ${
                  activeTab === 'atividade'
                    ? 'border-[#141414] text-[#141414]'
                    : 'border-transparent text-[#B9B9B4] hover:text-[#6F6F6A]'
                }`}
              >
                ATIVIDADE
              </button>
            </div>

            {/* ABA: VEÍCULO */}
            {activeTab === 'veiculo' && (
              <div className="space-y-6 animate-fadeIn text-left">
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-[#F4F4F2] border border-[#E5E5E2] p-4 rounded-xl">
                    <span className="block text-[10px] text-[#8A8A85] mb-0.5 font-bold uppercase tracking-wider">Combustível</span>
                    <span className="block text-xs font-bold text-[#141414]">{data.combustivel || 'Flex'}</span>
                  </div>
                  <div className="bg-[#F4F4F2] border border-[#E5E5E2] p-4 rounded-xl">
                    <span className="block text-[10px] text-[#8A8A85] mb-0.5 font-bold uppercase tracking-wider">Quilometragem</span>
                    <span className="block text-xs font-bold text-[#141414]">{formatKm(data.km) || 'N/A'}</span>
                  </div>
                  <div className="bg-[#F4F4F2] border border-[#E5E5E2] p-4 rounded-xl">
                    <span className="block text-[10px] text-[#8A8A85] mb-0.5 font-bold uppercase tracking-wider">Cor Externa</span>
                    <span className="block text-xs font-bold text-[#141414]">{data.corText || 'N/A'}</span>
                  </div>
                  <div className="bg-[#F4F4F2] border border-[#E5E5E2] p-4 rounded-xl">
                    <span className="block text-[10px] text-[#8A8A85] mb-0.5 font-bold uppercase tracking-wider">Câmbio</span>
                    <span className="block text-xs font-bold text-[#141414]">{data.cambio || 'N/A'}</span>
                  </div>
                  <div className="bg-[#F4F4F2] border border-[#E5E5E2] p-4 rounded-xl">
                    <span className="block text-[10px] text-[#8A8A85] mb-0.5 font-bold uppercase tracking-wider">Ano</span>
                    <span className="block text-xs font-bold text-[#141414]">{data.anoText || 'N/A'}</span>
                  </div>
                  <div className="bg-[#F4F4F2] border border-[#E5E5E2] p-4 rounded-xl">
                    <span className="block text-[10px] text-[#8A8A85] mb-0.5 font-bold uppercase tracking-wider">IPVA</span>
                    {/^.*ipva\s*pago.*$/i.test(data.opcionais || '')
                      ? <span className="block text-xs font-bold text-emerald-700">Pago</span>
                      : <span className="block text-xs font-bold text-amber-600">Consulte</span>}
                  </div>
                </div>

                <div className="bg-[#F4F4F2] border border-[#E5E5E2] rounded-2xl p-5 mt-4 text-left">
                  <h4 className="text-xs font-black text-[#141414] uppercase tracking-wider mb-2">Atendente Dedicado</h4>
                  <div className="space-y-4">
                    <div className="relative">
                      <select 
                        value={selectedAtendente} 
                        onChange={(e) => {
                          setSelectedAtendente(e.target.value);
                          data.vendedores = e.target.value;
                        }} 
                        className="w-full bg-white border-2 border-[#E5E5E2] rounded-xl px-4 py-3 text-sm font-bold text-[#2A2A26] outline-none focus:border-[#2A2A26] transition appearance-none bg-no-repeat bg-[right_1rem_center] bg-[length:1em]"
                        style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%25236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")` }}
                      >
                        <option value="" disabled>Selecione seu vendedor...</option>
                        {(data.vendedores ? data.vendedores.split(',') : []).map((v, i) => (
                          <option key={i} value={v.trim()}>{v.trim()}</option>
                        ))}
                      </select>
                    </div>

                    <button 
                      type="button"
                      onClick={() => {
                        if (!selectedAtendente) {
                          showToast('Por favor, selecione seu atendente para prosseguir.', 'error');
                          return;
                        }
                        let phone = empresaLogada?.telefone || '5511999999999';
                        phone = phone.replace(/\D/g, '');
                        if (phone.length === 10 || phone.length === 11) {
                          phone = '55' + phone;
                        }
                        const text = `Olá ${selectedAtendente}, estou na página do veículo ${data.title} e gostaria de negociá-lo!`;
                        window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(text)}`, '_blank');
                      }}
                      className="w-full bg-[#141414] hover:bg-[#2A2A26] text-[#F4F4F2] font-bold text-sm py-4 rounded-xl flex items-center justify-center transition gap-2"
                    >
                      Negociar veículo
                      <MessageCircle size={16} className="text-[#C1F11D] stroke-[2.5]" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ABA: FICHA */}
            {activeTab === 'ficha' && (
              <div className="space-y-6 animate-fadeIn text-left">
                {/* Ficha Técnica Detail List */}
                <div className="bg-[#F4F4F2] border border-[#E5E5E2] rounded-2xl p-5 space-y-3">
                  <h4 className="text-xs font-black text-[#141414] uppercase tracking-wider mb-2">Ficha Técnica</h4>
                  <div className="flex justify-between text-xs py-1 border-b border-[#E5E5E2]">
                    <span className="text-[#8A8A85] font-bold">Marca</span>
                    <span className="font-extrabold text-[#2A2A26]">{data.marcaText || data.title.split(' ')[0]}</span>
                  </div>
                  <div className="flex justify-between text-xs py-1 border-b border-[#E5E5E2]">
                    <span className="text-[#8A8A85] font-bold">Modelo</span>
                    <span className="font-extrabold text-[#2A2A26]">{data.modeloText || data.title.split(' ').slice(1).join(' ')}</span>
                  </div>
                  <div className="flex justify-between text-xs py-1 border-b border-[#E5E5E2]">
                    <span className="text-[#8A8A85] font-bold">Ano</span>
                    <span className="font-extrabold text-[#2A2A26]">{data.anoText}</span>
                  </div>
                  <div className="flex justify-between text-xs py-1 border-b border-[#E5E5E2]">
                    <span className="text-[#8A8A85] font-bold">Motorização</span>
                    <span className="font-extrabold text-[#2A2A26]">{data.motorText}</span>
                  </div>
                  <div className="flex justify-between text-xs py-1">
                    <span className="text-[#8A8A85] font-bold">Cor</span>
                    <span className="font-extrabold text-[#2A2A26]">{data.corText}</span>
                  </div>
                </div>

                {/* Opcionais do veículo */}
                <div>
                  <h4 className="text-xs font-black text-[#141414] uppercase tracking-wider mb-3">Opcionais inclusos</h4>
                  <div className="flex flex-wrap gap-2">
                    {data.opcionais ? data.opcionais.split(',').map((opc: string, idx: number) => (
                      <span key={idx} className="bg-[#F4F4F2] text-[#5F5F5A] text-[10px] font-black px-3 py-1.5 rounded-xl border border-[#E5E5E2]">
                        {opc.trim()}
                      </span>
                    )) : (
                      <span className="text-xs text-[#8A8A85] font-semibold">Nenhum opcional cadastrado.</span>
                    )}
                  </div>
                </div>

                {/* Concessionária info */}
                <div className="border-t border-[#E5E5E2] pt-6 mt-6">
                  <h4 className="text-xs font-black text-[#141414] uppercase tracking-wider mb-3">Sobre a Loja</h4>
                  <div className="bg-[#F4F4F2] border border-[#E5E5E2] rounded-2xl p-4 space-y-3">
                    <div>
                      <span className="block text-[8px] text-[#8A8A85] font-black uppercase tracking-widest">Razão Social</span>
                      <span className="text-xs font-semibold text-[#2A2A26]">{empresaLogada?.nome || 'BMW Premium SP'}</span>
                    </div>
                    {empresaLogada?.cnpj && (
                      <div>
                        <span className="block text-[8px] text-[#8A8A85] font-black uppercase tracking-widest">CNPJ</span>
                        <span className="text-xs font-semibold text-[#2A2A26]">{empresaLogada.cnpj}</span>
                      </div>
                    )}
                    {empresaLogada?.email && (
                      <div>
                        <span className="block text-[8px] text-[#8A8A85] font-black uppercase tracking-widest">E-mail de Contato</span>
                        <span className="text-xs font-semibold text-[#2A2A26]">{empresaLogada.email}</span>
                      </div>
                    )}
                    {empresaLogada?.telefone && (
                      <div>
                        <span className="block text-[8px] text-[#8A8A85] font-black uppercase tracking-widest">Telefone Comercial</span>
                        <span className="text-xs font-semibold text-[#2A2A26]">{empresaLogada.telefone}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ABA: ATIVIDADE */}
            {activeTab === 'atividade' && (
              <div className="space-y-6 animate-fadeIn text-left">
                <h3 className="text-[11px] font-black mb-6 text-[#8A8A85] uppercase tracking-wider flex items-center gap-1.5">
                  <Clock size={14} className="text-[#141414]" />
                  Linha do Tempo de Atividade
                </h3>
                
                <div className="relative pl-6 ml-2 space-y-8">
                  {/* Linha vertical cinza estática traseira */}
                  <div className="absolute left-[3px] top-2 bottom-2 w-0.5 bg-[#EBEBE8]"></div>
                  {/* Linha vertical preta animada — progresso até o último evento concluído */}
                  <div
                    className="absolute left-[3px] top-2 w-0.5 bg-[#141414] transition-all duration-[1200ms] ease-out origin-top"
                    style={{ height: animateTimeline ? `${timelineLinePct}%` : '0%' }}
                  ></div>

                  {timelineEvents.map((evt, index) => (
                    <div key={evt.key} className="relative">
                      <div
                        className={`absolute -left-[26px] top-1.5 w-3 h-3 rounded-full border-2 border-white transition-all duration-500 transform ${evt.done ? 'bg-[#141414]' : 'bg-[#E5E5E2]'} ${animateTimeline ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}
                        style={{ transitionDelay: `${100 + index * 250}ms` }}
                      ></div>

                      <div
                        className={`flex justify-between items-start gap-2 transition-all duration-500 transform ${animateTimeline ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0'}`}
                        style={{ transitionDelay: `${200 + index * 250}ms` }}
                      >
                        <div>
                          <h4 className={`text-xs font-black ${evt.done ? 'text-[#141414]' : 'text-[#B9B9B4] italic'}`}>{evt.title}</h4>
                          <p className={`text-[10.5px] font-semibold mt-1 leading-relaxed ${evt.done ? 'text-[#8A8A85]' : 'text-[#B9B9B4]'}`}>
                            {evt.desc}
                          </p>
                        </div>
                        {evt.done ? (
                          <span className="text-[9px] font-black text-[#141414] bg-[#C1F11D]/30 px-2 py-0.5 rounded uppercase tracking-wider shrink-0 flex items-center gap-1">
                            <Check size={9} strokeWidth={3.5} /> Feito
                          </span>
                        ) : (
                          <span className="text-[9px] font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded uppercase tracking-wider shrink-0">Pendente</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Garantir Reserva Info Box */}
            <div className="p-5 border-t border-[#EBEBE8] bg-[#F4F4F2] text-left -mx-5 -mb-4 mt-8">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="text-[#141414] shrink-0" size={16} />
                <h4 className="text-[10px] font-black text-[#141414] uppercase tracking-wider">Garantir Reserva</h4>
              </div>
              <p className="text-[10px] text-[#8A8A85] font-semibold leading-relaxed">
                Ao efetuar o sinal de garantia, este veículo é bloqueado imediatamente de visitas, testes e outros vendedores até você assinar o contrato final.
              </p>
            </div>

          </div>
        </div>

        {/* Barra de ação inferior — absoluta no preview, fixa na viewport no site público */}
        <div className={`bg-white border-t border-[#EBEBE8] p-4 z-50 text-black ${publicMode ? 'fixed bottom-0 left-0 right-0' : 'absolute bottom-0 left-0 w-full'}`}>
          <div className="flex items-center justify-between space-x-3 max-w-md mx-auto w-full">
            {slotInfo ? (
              <button
                onClick={() => setShowAgendarSheet(true)}
                className="flex-1 min-w-0 bg-[#C1F11D] text-[#141414] font-extrabold text-sm py-4 rounded-full flex items-center justify-between gap-2 px-6 hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer"
              >
                <span className="truncate">Confirmar visita {slotInfo.diaLabel} às {slotInfo.hora}</span>
                <span className="w-7 h-7 bg-[#141414]/10 rounded-full flex items-center justify-center shrink-0"><ArrowRight size={15} /></span>
              </button>
            ) : (
              <button
                onClick={() => {
                  if (!selectedAtendente) {
                    showToast('Por favor, selecione seu atendente para prosseguir.', 'error');
                    return;
                  }
                  setShowPixModal(true);
                }}
                className="flex-1 bg-[#141414] text-white font-extrabold text-sm py-4 rounded-full flex items-center justify-center hover:bg-[#2A2A26] transition-colors cursor-pointer"
              >
                Reservar com o PIX <ArrowRight size={16} className="ml-2" />
              </button>
            )}
            <button
              onClick={() => {
                if (!selectedAtendente) {
                  showToast('Por favor, selecione seu atendente para prosseguir.', 'error');
                  return;
                }
                setShowPixModal(true);
              }}
              title="Reservar com sinal Pix"
              className="w-14 h-14 bg-white border border-[#EBEBE8] rounded-full flex items-center justify-center text-[#141414] hover:bg-[#F4F4F2] transition-colors cursor-pointer"
            >
              <CircleDollarSign size={20} />
            </button>
          </div>
          <p className="text-center text-[10px] font-semibold text-[#8A8A85] mt-2">
            {slotInfo ? 'Visita grátis · Cancele quando quiser' : 'Escolha um horário acima ou garanta já com Pix'}
          </p>
        </div>
        
      </div>

      <AgendarVisitaSheet
        open={showAgendarSheet}
        onClose={() => setShowAgendarSheet(false)}
        tituloVeiculo={data.title}
        propostaId={data.id}
        lojaId={data.loja_id}
        slotInfo={slotInfo}
        telefone={empresaLogada?.telefone}
        onConfirmado={handleVisitaConfirmada}
        onPix={() => setShowPixModal(true)}
      />

      {showPixModal && (
        <PixModal
          onClose={() => setShowPixModal(false)}
          sinal={data.sinal}
          vendedor={selectedAtendente || 'Consultor'}
          showToast={showToast}
          onConfirm={() => {
            // 1. Atualizar proposta em recentReservations
            setRecentReservations((prev: any) => prev.map((res: any) => {
              if (res.id === data.id) {
                const novosLogs = [...(res.logs || [])];
                novosLogs.push({
                  time: new Date().toLocaleTimeString('pt-BR') + ' de ' + new Date().toLocaleDateString('pt-BR'),
                  text: `Sinal de R$ ${Number(data.sinal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} pago via PIX.`
                });
                return { ...res, status: 'Completed', paidSignal: true, logs: novosLogs };
              }
              return res;
            }));
            
            // 2. Incrementar reservasUsadas se necessário
            if (data.status !== 'Completed') {
              setReservasUsadas((prev: any) => Math.min(totalReservasPlano, prev + 1));
            }
            
            // 3. Atualizar estatísticas do vendedor
            const atendenteNome = selectedAtendente || 'Consultor';
            if (setEmpresaLogada && atendenteNome !== 'Consultor') {
              setEmpresaLogada((prevEmpresa: any) => {
                const vendedoresAtualizados = prevEmpresa.vendedores.map((v: any) => {
                  if (v.nome.trim().toLowerCase() === atendenteNome.trim().toLowerCase()) {
                    const totalLinks = v.linksGerados > 0 ? v.linksGerados : 1;
                    const vendasAtuais = Math.round(totalLinks * (v.conversao / 100)) + 1;
                    const novaConversao = Math.min(100, Math.round((vendasAtuais / totalLinks) * 100));
                    return {
                      ...v,
                      conversao: novaConversao
                    };
                  }
                  return v;
                });
                return { ...prevEmpresa, vendedores: vendedoresAtualizados };
              });
            }
          }}
        />
      )}
    </div>
  );
}

// --- NEW CHAT SIMULATOR COMPONENT ---
function LiveChatSimulator({ sellerName, showToast, embeddedInMobile = false }) {
  const [messages, setMessages] = useState([
    { id: 1, sender: 'seller', text: `Olá! Sou o ${sellerName}. Montei esta proposta com muito carinho. O sinal garante que o carro saia da vitrine virtual para você vir fechar a compra sem pressa. Dúvidas?` }
  ]);
  const [inputText, setInputText] = useState('');
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userMsg = { id: Date.now(), sender: 'user', text: inputText };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');

    // Simulated vendor instant reactions
    setTimeout(() => {
      let responseText = "Perfeito! Assim que confirmar o sinal, eu já emito seu contrato pré-aprovado de reserva digital no nosso sistema administrativo.";
      if (inputText.toLowerCase().includes('garantia') || inputText.toLowerCase().includes('laudo')) {
        responseText = "Sim! Nosso laudo é 100% aprovado pela vistoria. Se você fechar o PIX do sinal, eu deixo a chave guardada na minha mesa para seu teste amanhã.";
      } else if (inputText.toLowerCase().includes('fipe') || inputText.toLowerCase().includes('preço') || inputText.toLowerCase().includes('preco')) {
        responseText = "Esse valor é exclusivo para fechamento digital pelo link. Conseguimos cobrir a FIPE neste lote de ofertas especiais de showroom.";
      }
      
      setMessages(prev => [...prev, { id: Date.now() + 1, sender: 'seller', text: responseText }]);
      showToast(`Nova mensagem do consultor ${sellerName}!`, 'info');
    }, 1500);
  };

  return (
    <div className={`bg-white border border-[#E5E5E2] rounded-2xl overflow-hidden flex flex-col h-[280px] ${embeddedInMobile ? 'h-[250px]' : ''}`}>
      <div className="bg-[#F4F4F2] px-4 py-2 border-b border-[#E5E5E2] flex items-center justify-between">
        <span className="text-[10px] font-black text-[#8A8A85] uppercase tracking-widest flex items-center gap-1.5">
          <MessageCircle size={12} className="text-[#141414]" />
          Fale com o Atendente Dedicado
        </span>
        <span className="text-[9px] text-[#141414] font-bold bg-[#C1F11D]/15 px-2 py-0.5 rounded-full">ONLINE</span>
      </div>

      {/* Messages Pane */}
      <div className="flex-1 p-3 overflow-y-auto space-y-3 bg-[#F4F4F2]/50 scrollbar-thin">
        {messages.map(msg => (
          <div key={msg.id} className={`max-w-[85%] rounded-xl px-3 py-2 text-xs font-medium leading-relaxed ${msg.sender === 'seller' ? 'bg-[#E5E5E2] text-[#2A2A26] self-start' : 'bg-[#141414] text-[#F4F4F2] ml-auto'}`}>
            <p>{msg.text}</p>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* Sending Form */}
      <form onSubmit={handleSend} className="p-2 border-t border-[#E5E5E2] bg-white flex items-center gap-2">
        <input 
          type="text" 
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Envie uma pergunta..."
          className="flex-1 bg-[#F4F4F2] border border-[#E5E5E2] rounded-lg px-3 py-2 text-xs font-medium text-[#2A2A26] focus:outline-none focus:border-[#141414] transition"
        />
        <button type="submit" className="w-8 h-8 bg-[#141414] rounded-lg flex items-center justify-center text-white shrink-0 hover:bg-[#2A2A26] transition">
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}

// --- MODAL DE PIX ---
function PixModal({ onClose, sinal, vendedor, showToast, onConfirm }) {
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState('waiting'); 
  const pixHash = "00020101021226840014br.gov.bcb.pix2562reservacar_sinal_exclusivo_bmw_showroom_premium_token_secure_uuid_9921_04";

  const handleCopy = () => {
    copyToClipboard(pixHash, (success) => {
      if (success) {
        setCopied(true);
        showToast('Código PIX copiado para a área de transferência!', 'success');
        setTimeout(() => setCopied(false), 2500);
      } else {
        showToast('Erro ao copiar código.', 'error');
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-white w-full max-w-md rounded-3xl p-8 relative border border-[#E5E5E2]">
        
        {status === 'waiting' ? (
          <>
            <button onClick={onClose} aria-label="Fechar" className="absolute top-6 right-6 bg-[#EBEBE8] p-2.5 rounded-full hover:bg-[#E5E5E2] transition text-[#6F6F6A] border border-[#E5E5E2]">
              <X size={16} />
            </button>
            
            <div className="text-center mb-6 pt-2">
              <h3 className="text-2xl font-extrabold text-[#141414] tracking-tight">Pagamento do Sinal</h3>
              <p className="text-xs font-semibold text-[#8A8A85] mt-2">
                Atendimento direcionado com: <strong className="text-[#141414]">{vendedor}</strong>
              </p>
            </div>

            <div className="bg-[#F4F4F2] rounded-2xl p-5 text-center border border-[#E5E5E2] mb-6">
              <span className="block text-[10px] font-black text-[#8A8A85] uppercase tracking-widest mb-1.5">SINAL REQUERIDO</span>
              <span className="text-3xl font-black text-[#141414]">{formatCurrency(sinal)}</span>
            </div>

            {/* Dynamic Simulated Stylized QR Code Component */}
            <div className="flex justify-center mb-6">
              <div className="qr-code-surface bg-white border-2 border-[#E5E5E2] p-4 rounded-2xl flex items-center justify-center">
                 <svg width="140" height="140" viewBox="0 0 100 100" fill="black" xmlns="http://www.w3.org/2000/svg">
                    {/* Top Left Finder Pattern */}
                    <rect x="5" y="5" width="25" height="25" fill="#141414"/>
                    <rect x="10" y="10" width="15" height="15" fill="white"/>
                    <rect x="13" y="13" width="9" height="9" fill="#141414"/>
                    
                    {/* Top Right Finder Pattern */}
                    <rect x="70" y="5" width="25" height="25" fill="#141414"/>
                    <rect x="75" y="10" width="15" height="15" fill="white"/>
                    <rect x="78" y="13" width="9" height="9" fill="#141414"/>
                    
                    {/* Bottom Left Finder Pattern */}
                    <rect x="5" y="70" width="25" height="25" fill="#141414"/>
                    <rect x="10" y="75" width="15" height="15" fill="white"/>
                    <rect x="13" y="78" width="9" height="9" fill="#141414"/>
                    
                    {/* Mock Randomized Data Blocks */}
                    <rect x="40" y="10" width="8" height="8" fill="#141414"/>
                    <rect x="55" y="15" width="6" height="12" fill="#2A2A26"/>
                    <rect x="42" y="35" width="16" height="10" fill="#141414"/>
                    <rect x="10" y="45" width="12" height="12" fill="#2A2A26"/>
                    <rect x="55" y="55" width="10" height="10" fill="#141414"/>
                    <rect x="75" y="45" width="12" height="6" fill="#2A2A26"/>
                    <rect x="40" y="75" width="14" height="14" fill="#141414"/>
                    <rect x="75" y="75" width="15" height="15" fill="#2A2A26"/>
                 </svg>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-xs font-bold text-[#8A8A85] uppercase tracking-widest mb-3">Pix Copia e Cola</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  readOnly 
                  value={pixHash}
                  className="w-full bg-[#F4F4F2] border border-[#E5E5E2] rounded-xl px-4 py-3 text-xs font-medium text-[#5F5F5A] outline-none truncate"
                />
                <button 
                  onClick={handleCopy}
                  className="bg-[#141414] hover:bg-[#2A2A26] text-[#F4F4F2] font-bold text-xs rounded-xl px-5 py-3 transition flex items-center gap-1 shrink-0"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copied ? 'Copiado!' : 'Copiar'}</span>
                </button>
              </div>
            </div>

            <button 
              onClick={() => {
                setStatus('success');
                showToast('Sinal processado e reserva garantida com sucesso!', 'success');
                if (onConfirm) onConfirm();
              }}
              className="w-full bg-white hover:bg-[#F4F4F2] text-[#2A2A26] border border-[#E5E5E2] font-bold text-xs rounded-xl py-3.5 transition"
            >
              Simular Confirmação de Pagamento PIX
            </button>
          </>
        ) : (
          <div className="text-center py-6">
            <div className="w-20 h-20 bg-[#C1F11D]/15 border border-[#C1F11D]/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={40} className="text-[#141414] animate-bounce" />
            </div>
            <h3 className="text-3xl font-black mb-3 text-[#141414] tracking-tight">Reserva Confirmada!</h3>
            <p className="text-sm font-medium text-[#8A8A85] mb-8 leading-relaxed px-2">
              O sinal foi processado com sucesso. O veículo foi travado e retirado da vitrine comercial do showroom para seu fechamento presencial presencial.
            </p>
            <button 
              onClick={onClose}
              className="bg-[#141414] text-[#F4F4F2] font-bold text-sm rounded-full px-12 py-4 hover:bg-[#2A2A26] transition"
            >
              Fechar Painel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// --- NEW COMPONENT: WIZARD FLOW "CADASTRO DE RESERVA DO CLIENTE" ---
function CadastroReservaClienteView({ navigateTo, showToast, setActiveReservation, empresaLogada, totalReservasPlano = 30, reservasUsadas = 0, initialDraft = null, onConsumeDraft = () => {} }) {
  const draftData = initialDraft?.draftData || null;
  if (reservasUsadas >= totalReservasPlano) {
    return (
      <div className="pt-28 pb-20 px-4 max-w-md mx-auto text-center">
        <div className="bg-white border border-[#E5E5E2] rounded-3xl p-8 shadow-sm">
          <h2 className="text-xl font-black text-[#141414] mb-2">Limite de Propostas Atingido</h2>
          <p className="text-[#8A8A85] text-xs mb-6 font-medium">Seu plano atual permite até {totalReservasPlano} propostas ativas em paralelo. Realize o upgrade para continuar cadastrando.</p>
          <button onClick={() => navigateTo('configuracoes')} className="w-full bg-[#141414] hover:bg-[#2A2A26] text-[#F4F4F2] font-bold py-3.5 rounded-xl transition text-sm">Fazer Upgrade do Plano</button>
        </div>
      </div>
    );
  }

  const [step, setStep] = useState(1);
  const [marcas, setMarcas] = useState([]);
  const [modelos, setModelos] = useState([]);
  const [anos, setAnos] = useState([]);
  
  const [selectedMarca, setSelectedMarca] = useState('');
  const [selectedModelo, setSelectedModelo] = useState('');
  const [selectedAno, setSelectedAno] = useState('');
  const [isFipeLoading, setIsFipeLoading] = useState(false);
  const [isModelosLoading, setIsModelosLoading] = useState(false);
  const [isAnosLoading, setIsAnosLoading] = useState(false);
  const [isPrecoLoading, setIsPrecoLoading] = useState(false);

  const [vehicleData, setVehicleData] = useState<any>(draftData?.vehicleData || {
    brand: '',
    model: '',
    version: '',
    year: '',
    color: 'Branco',
    fuel: 'Flex',
    doors: '4 Portas',
    transmission: 'Automático',
    selectedOpcionais: ['Ar Condicionado', 'Direção Elétrica', 'Freio ABS', 'Central Multimídia'],
    km: '15.000',
    description: 'Veículo em excelente estado de conservação, único dono e com todas as revisões periódicas em dia.',
    price: '',
    fipePrice: 0,
    webmotorsMin: 0,
    webmotorsMed: 0,
    webmotorsMax: 0,
    photos: [],
    // Dados do anunciante/reserva
    email: '',
    fullName: '',
    gender: 'Masculino',
    birthDate: '',
    cpf: '',
    phone: '',
    cep: '',
    showPhone: false,
    sinal: 0,
    expiracaoMinutos: 60,
    atendente: '',
  });
  // Consome o rascunho no parent (evita re-hidratar numa próxima abertura limpa).
  useEffect(() => { if (initialDraft) onConsumeDraft(); }, []);

  const [sinal, setSinal] = useState(draftData?.sinal ?? (empresaLogada?.valorMinimoSinal ? String(empresaLogada.valorMinimoSinal) : ''));
  const [expiracao, setExpiracao] = useState(60);

  const formatExpiracaoInput = (minutos: number): string => {
    const h = Math.floor(minutos / 60);
    const m = minutos % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const parseExpiracaoInput = (raw: string): number => {
    const cleaned = raw.replace(/[^\d:]/g, '');
    if (cleaned.includes(':')) {
      const [h, m] = cleaned.split(':');
      return (parseInt(h || '0', 10) * 60) + parseInt(m || '0', 10);
    }
    return parseInt(cleaned || '0', 10);
  };

  const [expiracaoText, setExpiracaoText] = useState(formatExpiracaoInput(60));

  const stepExpiracao = (delta: number) => {
    const next = Math.min(360, Math.max(15, expiracao + delta));
    setExpiracao(next);
    setExpiracaoText(formatExpiracaoInput(next));
  };

  useEffect(() => {
    if (vehicleData.sinal) {
      setSinal(String(vehicleData.sinal));
    } else if (empresaLogada?.valorMinimoSinal && !sinal) {
      setSinal(String(empresaLogada.valorMinimoSinal));
    }
    if (vehicleData.expiracaoMinutos) {
      setExpiracao(vehicleData.expiracaoMinutos);
      setExpiracaoText(formatExpiracaoInput(vehicleData.expiracaoMinutos));
    }
  }, [vehicleData.sinal, vehicleData.expiracaoMinutos, empresaLogada?.valorMinimoSinal]);

  const formatExpiracaoLabel = (minutos: number): string => {
    if (minutos < 60) return `${minutos}min`;
    const horas = Math.floor(minutos / 60);
    const minsRestantes = minutos % 60;
    if (minsRestantes === 0) return `${horas}h`;
    return `${horas}h ${minsRestantes}min`;
  };

  const opcionaisPool = [
    'Computador de Bordo', 'Ar Condicionado', 'Ar Quente', 'Banco do Motorista com Ajuste de Altura',
    'Banco em Couro', 'Travas Elétricas', 'Vidros Elétricos', 'Direção Elétrica',
    'Rodas de Liga Leve', 'Teto Solar', 'Air Bag', 'Alarme', 'Desembaçador Traseiro',
    'Freio ABS', 'Central Multimídia', 'Sensores de Estacionamento'
  ];

  const [customOpcionais, setCustomOpcionais] = useState<string[]>([]);
  const [newOpcional, setNewOpcional] = useState('');

  const handleAddCustomOpcional = () => {
    const value = newOpcional.trim();
    if (!value) return;
    if (!opcionaisPool.includes(value) && !customOpcionais.includes(value)) {
      setCustomOpcionais(prev => [...prev, value]);
    }
    if (!vehicleData.selectedOpcionais.includes(value)) {
      setVehicleData(prev => ({
        ...prev,
        selectedOpcionais: [...prev.selectedOpcionais, value]
      }));
    }
    setNewOpcional('');
  };

  // Carrega as marcas na inicialização
  useEffect(() => {
    setIsFipeLoading(true);
    fetch('https://parallelum.com.br/fipe/api/v1/carros/marcas')
      .then(res => res.json())
      .then(data => {
        if (data && data.length > 0) setMarcas(data);
        setIsFipeLoading(false);
      })
      .catch(() => {
        setMarcas(MOCK_BRANDS);
        setIsFipeLoading(false);
      });
  }, []);

  const handleMarcaChange = (e) => {
    const id = e.target.value;
    setSelectedMarca(id);
    setModelos([]); setSelectedModelo(''); setAnos([]); setSelectedAno('');
    if (!id) return;

    const brandName = marcas.find(m => m.codigo == id)?.nome || id;
    setVehicleData((prev) => ({ ...prev, brand: brandName }));

    setIsModelosLoading(true);
    fetch(`https://parallelum.com.br/fipe/api/v1/carros/marcas/${id}/modelos`)
      .then(res => res.json())
      .then(data => {
        if (data && data.modelos) setModelos(data.modelos);
        setIsModelosLoading(false);
      })
      .catch(() => {
        setModelos(MOCK_MODELS[brandName] || []);
        setIsModelosLoading(false);
      });
  };

  const handleModeloChange = (e) => {
    const id = e.target.value;
    setSelectedModelo(id);
    setAnos([]); setSelectedAno('');
    if (!id) return;

    const modelName = modelos.find(m => m.codigo == id)?.nome || id;
    setVehicleData((prev) => ({ ...prev, model: modelName }));

    setIsAnosLoading(true);
    fetch(`https://parallelum.com.br/fipe/api/v1/carros/marcas/${selectedMarca}/modelos/${id}/anos`)
      .then(res => res.json())
      .then(data => {
        if (data && data.length > 0) setAnos(data);
        setIsAnosLoading(false);
      })
      .catch(() => {
        setAnos(MOCK_YEARS);
        setIsAnosLoading(false);
      });
  };

  const handleAnoChange = (e) => {
    const id = e.target.value;
    setSelectedAno(id);
    if (!id) return;

    setIsPrecoLoading(true);
    fetch(`https://parallelum.com.br/fipe/api/v1/carros/marcas/${selectedMarca}/modelos/${selectedModelo}/anos/${id}`)
      .then(res => res.json())
      .then(data => {
        if (data) {
          const rawValue = data.Valor.replace('R$', '').replace(/\./g, '').replace(',', '.').trim();
          const numValue = parseFloat(rawValue);
          setVehicleData((prev) => ({
            ...prev,
            version: data.AnoModelo.toString() + ' ' + data.Combustivel,
            year: data.AnoModelo.toString(),
            fuel: data.Combustivel,
            fipePrice: numValue,
            webmotorsMin: numValue * 0.90,
            webmotorsMed: numValue * 1.02,
            webmotorsMax: numValue * 1.10,
            price: numValue.toString()
          }));
        }
        setIsPrecoLoading(false);
      })
      .catch(() => {
        const mockObj = MOCK_YEARS.find(y => y.codigo === id) || MOCK_YEARS[0];
        setVehicleData((prev) => ({
          ...prev,
          version: mockObj.nome,
          year: mockObj.nome.split(' ')[0],
          fuel: mockObj.comb,
          fipePrice: mockObj.valor,
          webmotorsMin: mockObj.valor * 0.90,
          webmotorsMed: mockObj.valor * 1.02,
          webmotorsMax: mockObj.valor * 1.10,
          price: (mockObj.valor - 5000).toString()
        }));
        setIsPrecoLoading(false);
      });
  };

  const handleToggleOpcional = (opc) => {
    setVehicleData((prev) => {
      const isSelected = prev.selectedOpcionais.includes(opc);
      const newOpcionais = isSelected 
        ? prev.selectedOpcionais.filter((o) => o !== opc)
        : [...prev.selectedOpcionais, opc];
      return { ...prev, selectedOpcionais: newOpcionais };
    });
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    let finalValue = value;
    if (name === 'cpf') finalValue = formatCPF(value);
    else if (name === 'phone') finalValue = formatPhone(value);
    else if (name === 'cep') finalValue = formatCEP(value);

    setVehicleData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : finalValue
    }));
  };

  const addPresetPhoto = (url) => {
    if (vehicleData.photos.length >= 8) {
      showToast('Limite de 8 fotos atingido.', 'info');
      return;
    }
    setVehicleData((prev) => ({
      ...prev,
      photos: [...prev.photos, url]
    }));
    showToast('Foto adicionada com sucesso!', 'success');
  };

  const [uploadingFotos, setUploadingFotos] = useState(false);

  // Upload real para o Supabase Storage (bucket "veiculos") -> guarda a URL pública
  const uploadFotos = async (fileList: FileList | null) => {
    const arquivos = Array.from(fileList || []);
    if (arquivos.length === 0) return;
    if (!isSupabaseConfigured) {
      showToast('Supabase não configurado (preencha o .env e reinicie o dev).', 'error');
      return;
    }
    const espaco = 8 - vehicleData.photos.length;
    if (espaco <= 0) { showToast('Limite de 8 fotos atingido.', 'info'); return; }
    setUploadingFotos(true);
    try {
      const novasUrls: string[] = [];
      for (const file of arquivos.slice(0, espaco)) {
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
        const path = `propostas/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error } = await supabase.storage.from('veiculos').upload(path, file, { contentType: file.type, upsert: false });
        if (error) throw error;
        const { data } = supabase.storage.from('veiculos').getPublicUrl(path);
        novasUrls.push(data.publicUrl);
      }
      setVehicleData((prev) => ({ ...prev, photos: [...prev.photos, ...novasUrls] }));
      showToast(`${novasUrls.length} foto(s) enviada(s) com sucesso!`, 'success');
    } catch (e: any) {
      showToast('Erro ao enviar foto: ' + (e?.message || 'tente novamente'), 'error');
    } finally {
      setUploadingFotos(false);
    }
  };

  const removePhoto = (index) => {
    setVehicleData((prev) => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
  };

  const handlePreviewRedirect = () => {
    if (!vehicleData.brand || !vehicleData.model || !vehicleData.price) {
      showToast('Por favor, preencha a FIPE e o preço do veículo.', 'error');
      return;
    }
    if (!vehicleData.fullName || !vehicleData.cpf || !vehicleData.phone || !vehicleData.atendente) {
      showToast('Por favor, preencha todos os dados da reserva e o atendente (Passo 5).', 'error');
      return;
    }

    const compiledReservation = {
      id: Date.now(),
      origin: 'cadastrar-reserva',
      draftData: { vehicleData, sinal, expiracao },
      title: `${vehicleData.brand} ${vehicleData.model} ${vehicleData.version}`.trim(),
      created: new Date().toLocaleString('pt-BR'),
      duration: String(vehicleData.expiracaoMinutos || 60),
      expiracao: Number(vehicleData.expiracaoMinutos || 60),
      sinal: Number(vehicleData.sinal || 0),
      marcaText: vehicleData.brand,
      modeloText: vehicleData.model,
      anoText: vehicleData.year,
      corText: vehicleData.color,
      motorText: vehicleData.fuel,
      fipeValue: clampPrice(vehicleData.fipePrice),
      valorVenda: clampPrice(parseFloat(vehicleData.price) || vehicleData.fipePrice),
      km: vehicleData.km,
      cambio: vehicleData.transmission,
      combustivel: vehicleData.fuel,
      opcionais: vehicleData.selectedOpcionais.join(', '),
      fotos: vehicleData.photos.length > 0 ? vehicleData.photos.join(',') : 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&w=800&q=80',
      vendedores: vehicleData.atendente,
      clienteNome: vehicleData.fullName,
      laudoAprovado: true,
      status: 'Active',
      elapsedSeconds: 0,
      logs: [
        { time: new Date().toLocaleTimeString('pt-BR') + ' de ' + new Date().toLocaleDateString('pt-BR'), text: `Proposta criada por ${vehicleData.atendente}` },
        { time: new Date().toLocaleTimeString('pt-BR') + ' de ' + new Date().toLocaleDateString('pt-BR'), text: `Link de sinal de R$ ${parseFloat(vehicleData.sinal || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ativado` }
      ]
    };

    setActiveReservation(compiledReservation);
    navigateTo('preview');
  };

  // Estilo visual alinhado ao fluxo "Reserva Rápida" (mantendo a diagramação atual).
  const inputClass = "w-full bg-white border-2 border-[#E5E5E2] rounded-2xl px-5 py-4 text-base font-bold text-[#141414] outline-none focus:border-[#141414] transition placeholder:text-[#B9B9B4] placeholder:font-medium";
  const labelClass = "block text-[10px] font-black uppercase tracking-widest text-[#8A8A85] mb-2";

  return (
    <div className="min-h-screen bg-[#F4F4F2] text-[#141414] pt-20 pb-12 px-4 md:pt-28 md:pb-20 md:px-8">
      <div className="max-w-4xl mx-auto">

        {/* Cabeçalho livre (estilo Configurações) + stepper */}
        <div className="mb-6">
          <div className="mb-5">
            <h1 className="text-2xl md:text-3xl font-extrabold text-[#141414] tracking-tight">Criar Proposta de Reserva</h1>
            <p className="text-[#8A8A85] text-sm mt-1 font-medium">Fluxo do Cliente</p>
          </div>

          <div className="grid grid-cols-5 gap-3">
            {[
              { num: 1, label: 'Tabela FIPE' },
              { num: 2, label: 'KM & Preço' },
              { num: 3, label: 'Opcionais' },
              { num: 4, label: 'Fotos' },
              { num: 5, label: 'Dados de Contato' }
            ].map(s => (
              <div key={s.num} className="flex flex-col gap-2">
                <div className="flex items-center gap-1.5">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white ${step >= s.num ? 'bg-[#141414]' : 'bg-[#E5E5E2]'}`}>
                    {step > s.num ? '✓' : s.num}
                  </span>
                  <span className="font-bold text-[10px] text-[#6F6F6A] hidden md:inline">{s.label}</span>
                </div>
                <div className={`h-1 w-full rounded-full transition-colors ${step >= s.num ? 'bg-[#C1F11D]' : 'bg-[#E5E5E2]'}`}></div>
              </div>
            ))}
          </div>
        </div>

        {/* Form Container */}
        <div className="bg-white border border-[#E5E5E2] rounded-2xl p-6 md:p-10 shadow-sm min-h-[460px] flex flex-col justify-between relative overflow-hidden">
          {isFipeLoading && marcas.length === 0 && (
            <div className="absolute inset-0 bg-white/75 backdrop-blur-sm flex items-center justify-center gap-2 text-[#141414] font-bold z-35">
              <RefreshCw className="animate-spin" size={20} /> Carregando base FIPE...
            </div>
          )}

          <div className="mb-6">
            <span className="text-[11px] font-black uppercase text-[#8A8A85] tracking-wider">
              {['Tabela FIPE', 'KM & Preço', 'Opcionais', 'Fotos', 'Dados de Contato'][step - 1]}
            </span>
            <div className="h-px bg-[#EBEBE8] mt-2"></div>
          </div>
          <div key={step} className="animate-rapida-step">
            {/* STEP 1: BUSCA FIPE */}
            {step === 1 && (
              <div className="max-w-xl mx-auto w-full text-left py-1">
                <p className="text-[#8A8A85] text-xs mb-6 font-medium">Consulte em tempo real as informações oficiais da FIPE para preencher seu anúncio.</p>
                
                <div className="text-left space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#8A8A85]">Marca</label>
                      {isFipeLoading && marcas.length === 0 && (
                        <span className="text-[10px] text-[#141414] font-bold flex items-center gap-1">
                          <RefreshCw size={10} className="animate-spin" /> Carregando marcas...
                        </span>
                      )}
                    </div>
                    <select className={inputClass} onChange={handleMarcaChange} value={selectedMarca} disabled={isFipeLoading && marcas.length === 0}>
                      <option value="">Selecione a marca...</option>
                      {marcas.map(m => <option key={m.codigo} value={m.codigo}>{m.nome}</option>)}
                    </select>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#8A8A85]">Modelo</label>
                      {isModelosLoading && (
                        <span className="text-[10px] text-[#141414] font-bold flex items-center gap-1">
                          <RefreshCw size={10} className="animate-spin" /> Carregando modelos...
                        </span>
                      )}
                    </div>
                    <select className={inputClass} onChange={handleModeloChange} value={selectedModelo} disabled={!selectedMarca || isModelosLoading}>
                      <option value="">Selecione o modelo...</option>
                      {modelos.map(m => <option key={m.codigo} value={m.codigo}>{m.nome}</option>)}
                    </select>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#8A8A85]">Ano / Versão</label>
                      {isAnosLoading && (
                        <span className="text-[10px] text-[#141414] font-bold flex items-center gap-1">
                          <RefreshCw size={10} className="animate-spin" /> Carregando versões...
                        </span>
                      )}
                      {isPrecoLoading && (
                        <span className="text-[10px] text-[#141414] font-bold flex items-center gap-1">
                          <RefreshCw size={10} className="animate-spin" /> Buscando preço...
                        </span>
                      )}
                    </div>
                    <select className={inputClass} onChange={handleAnoChange} value={selectedAno} disabled={!selectedModelo || isAnosLoading || isPrecoLoading}>
                      <option value="">Selecione a versão...</option>
                      {anos.map(a => <option key={a.codigo} value={a.codigo}>{a.nome}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: PREÇO / KM */}
            {step === 2 && (
              <div className="max-w-xl mx-auto w-full py-1 text-left">
                <p className="text-[#8A8A85] text-xs mb-6 font-medium">Informe a quilometragem atual e compare os valores oficiais.</p>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className={labelClass}>Quilometragem (KM)</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        name="km"
                        value={vehicleData.km}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, '');
                          const formatted = digits ? Number(digits).toLocaleString('pt-BR') : '';
                          setVehicleData(prev => ({ ...prev, km: formatted }));
                        }}
                        className={inputClass}
                        placeholder="Ex: 45.000"
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Cor do Veículo</label>
                      <select 
                        name="color" 
                        value={vehicleData.color} 
                        onChange={handleInputChange} 
                        className={inputClass}
                      >
                        <option value="">Selecione...</option>
                        <option value="Amarelo">Amarelo</option>
                        <option value="Azul">Azul</option>
                        <option value="Bege">Bege</option>
                        <option value="Branco">Branco</option>
                        <option value="Cinza">Cinza</option>
                        <option value="Marrom">Marrom</option>
                        <option value="Prata">Prata</option>
                        <option value="Preto">Preto</option>
                        <option value="Verde">Verde</option>
                        <option value="Vermelho">Vermelho</option>
                        <option value="Vinho">Vinho</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Preço de Venda (R$)</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        name="price"
                        value={vehicleData.price ? formatCurrency(Number(vehicleData.price)) : ''}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, '');
                          const val = digits ? String(clampPrice(Number(digits))) : '';
                          setVehicleData(prev => ({ ...prev, price: val }));
                        }}
                        className={inputClass}
                        placeholder="Ex: R$ 85.000,00"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className={labelClass}>Valor do sinal (R$) *</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        name="sinal"
                        value={sinal ? Number(sinal).toLocaleString('pt-BR') : ''}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          setSinal(val);
                          setVehicleData(prev => ({ ...prev, sinal: val }));
                        }}
                        className={inputClass}
                        placeholder="Ex: 1.500"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between items-center gap-2 mb-2 h-4">
                        <label className={`${labelClass} mb-0 whitespace-nowrap`}>Expiração da reserva *</label>
                        <span className="text-[10px] font-black text-[#141414] bg-[#C1F11D]/20 px-2 py-0.5 rounded-md whitespace-nowrap shrink-0 leading-none">
                          {formatExpiracaoLabel(expiracao)}
                        </span>
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={expiracaoText}
                          onChange={(e) => setExpiracaoText(e.target.value)}
                          onBlur={() => {
                            const mins = Math.min(360, Math.max(15, parseExpiracaoInput(expiracaoText) || 15));
                            setExpiracao(mins);
                            setExpiracaoText(formatExpiracaoInput(mins));
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'ArrowUp') { e.preventDefault(); stepExpiracao(15); }
                            else if (e.key === 'ArrowDown') { e.preventDefault(); stepExpiracao(-15); }
                            else if (e.key === 'Enter') { e.currentTarget.blur(); }
                          }}
                          className={`${inputClass} pr-12 tracking-wide`}
                          placeholder="01:00"
                        />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-px">
                          <button
                            type="button"
                            onClick={() => stepExpiracao(15)}
                            aria-label="Aumentar tempo de expiração"
                            className="flex items-center justify-center w-7 h-[18px] rounded-md text-[#8A8A85] hover:text-[#141414] hover:bg-[#E5E5E2] transition"
                          >
                            <ChevronUp size={14} strokeWidth={2.5} />
                          </button>
                          <button
                            type="button"
                            onClick={() => stepExpiracao(-15)}
                            aria-label="Diminuir tempo de expiração"
                            className="flex items-center justify-center w-7 h-[18px] rounded-md text-[#8A8A85] hover:text-[#141414] hover:bg-[#E5E5E2] transition"
                          >
                            <ChevronDown size={14} strokeWidth={2.5} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Resumo financeiro limpo */}
                  <div className="bg-[#F4F4F2] p-6 rounded-2xl border border-[#E5E5E2] space-y-4">
                    <div className="flex justify-between items-center text-xs font-semibold text-[#6F6F6A]">
                      <span>Preço FIPE Lido</span>
                      <span className="font-bold text-black">{formatCurrency(vehicleData.fipePrice || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center border-t border-[#E5E5E2] pt-3 text-xs font-semibold text-[#6F6F6A]">
                      <span>Preço do Veículo Escolhido</span>
                      <span className="font-black text-[#141414] text-sm">{formatCurrency(parseFloat(vehicleData.price) || 0)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: OPCIONAIS */}
            {step === 3 && (
              <div className="max-w-3xl mx-auto w-full text-left py-1">
                <p className="text-[#8A8A85] text-xs mb-6 font-medium">Selecione os diferenciais do veículo que chamam a atenção dos compradores de showroom.</p>
                
                <div className="flex flex-wrap justify-center gap-2.5 max-w-2xl mx-auto">
                  {[...opcionaisPool, ...customOpcionais].map((opc, idx) => {
                    const isSelected = vehicleData.selectedOpcionais.includes(opc);
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleToggleOpcional(opc)}
                        className={`px-4 py-2.5 rounded-2xl text-xs font-bold border-2 transition flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-[#141414] border-[#141414] text-white'
                            : 'bg-white border-[#E5E5E2] text-[#141414] hover:border-[#141414]'
                        }`}
                      >
                        <span>{opc}</span>
                        <span>{isSelected ? '✓' : '+'}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Input para Opcional Personalizado */}
                <div className="w-full flex items-center justify-center gap-2 mt-8">
                  <input 
                    type="text" 
                    value={newOpcional}
                    onChange={(e) => setNewOpcional(e.target.value)}
                    placeholder="Ex: Teto solar panorâmico"
                    className="max-w-xs bg-white border-2 border-[#E5E5E2] rounded-2xl px-4 py-2.5 text-xs font-bold text-[#141414] outline-none focus:border-[#141414] transition placeholder:text-[#B9B9B4] placeholder:font-medium"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomOpcional();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomOpcional}
                    className="bg-[#141414] hover:bg-[#2A2A26] text-white text-xs font-black px-4 py-2.5 rounded-2xl transition uppercase tracking-wider"
                  >
                    + Adicionar
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: FOTOS */}
            {step === 4 && (
              <div className="max-w-2xl mx-auto w-full text-left py-1">
                <p className="text-[#8A8A85] text-xs mb-6 font-medium">Boas fotos aumentam as chances de reserva em até 70%.</p>
                
                <label className={`border-2 border-dashed rounded-3xl p-6 transition flex flex-col items-center ${uploadingFotos ? 'border-[#C1F11D] bg-[#C1F11D]/10 cursor-wait' : 'border-[#D9D9D5] hover:border-black bg-[#F4F4F2] cursor-pointer'}`}>
                  <input type="file" accept="image/*" multiple className="hidden" disabled={uploadingFotos} onChange={(e) => { uploadFotos(e.target.files); e.currentTarget.value = ''; }} />
                  {uploadingFotos
                    ? <RefreshCw className="text-[#141414] mb-2 animate-spin" size={32} />
                    : <UploadCloud className="text-[#B9B9B4] mb-2" size={32} />}
                  <span className="font-bold text-xs text-[#2A2A26]">{uploadingFotos ? 'Enviando fotos...' : 'Carregar fotos do veículo'}</span>
                  <span className="text-[10px] text-[#B9B9B4] mt-1">Clique para selecionar · PNG, JPG, JPEG</span>
                </label>

                <div className="mt-3 text-center">
                  <span className="text-[10px] text-[#B9B9B4] font-semibold uppercase tracking-wider">ou use um preset rápido</span>
                  <div className="mt-2 flex flex-wrap gap-2 justify-center">
                    <button 
                      type="button"
                      onClick={() => addPresetPhoto('https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=800&q=80')}
                      className="bg-white border border-[#D9D9D5] hover:border-[#B9B9B4] text-[10px] font-black px-3 py-1.5 rounded-xl text-[#5F5F5A] transition"
                    >
                      + FRENTE+
                    </button>
                    <button 
                      type="button"
                      onClick={() => addPresetPhoto('https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=800&q=80')}
                      className="bg-white border border-[#D9D9D5] hover:border-[#B9B9B4] text-[10px] font-black px-3 py-1.5 rounded-xl text-[#5F5F5A] transition"
                    >
                      + Traseira
                    </button>
                    <button 
                      type="button"
                      onClick={() => addPresetPhoto('https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=800&q=80')}
                      className="bg-white border border-[#D9D9D5] hover:border-[#B9B9B4] text-[10px] font-black px-3 py-1.5 rounded-xl text-[#5F5F5A] transition"
                    >
                      + Interior +
                    </button>
                    <button 
                      type="button"
                      onClick={() => addPresetPhoto('https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80')}
                      className="bg-white border border-[#D9D9D5] hover:border-[#B9B9B4] text-[10px] font-black px-3 py-1.5 rounded-xl text-[#5F5F5A] transition"
                    >
                      + Lateral +
                    </button>
                    <button 
                      type="button"
                      onClick={() => addPresetPhoto('https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=800&q=80')}
                      className="bg-white border border-[#D9D9D5] hover:border-[#B9B9B4] text-[10px] font-black px-3 py-1.5 rounded-xl text-[#5F5F5A] transition"
                    >
                      + Frente Extra +
                    </button>
                  </div>
                </div>

                {vehicleData.photos.length > 0 && (
                  <div className="grid grid-cols-4 gap-2.5 max-w-md mx-auto mt-6">
                    {vehicleData.photos.map((url, i) => (
                      <div key={i} className="relative h-16 rounded-xl overflow-hidden border border-[#E5E5E2] group">
                        <img src={url} className="w-full h-full object-cover" />
                        <button 
                          type="button" 
                          onClick={() => removePhoto(i)}
                          aria-label={`Remover foto ${i + 1}`}
                          className="absolute top-1 right-1 bg-black/70 hover:bg-black p-1 rounded-full text-white transition"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* STEP 5: DADOS DO LEAD */}
            {step === 5 && (
              <div className="max-w-xl mx-auto w-full text-left py-1">
                <p className="text-[#8A8A85] text-xs mb-6 font-medium">Informe os dados do lead para quem você enviará este link de reserva e sinal.</p>
                
                <div className="space-y-4">
                  <div>
                    <label className={labelClass}>Nome do Lead *</label>
                    <input type="text" name="fullName" value={vehicleData.fullName} onChange={handleInputChange} className={inputClass} placeholder="Ex: Allan Salgado" required />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>CPF do Lead *</label>
                      <input type="text" name="cpf" value={vehicleData.cpf} onChange={handleInputChange} className={inputClass} placeholder="Ex: 370.875.668-14" required />
                    </div>
                    <div>
                      <label className={labelClass}>WhatsApp do Lead *</label>
                      <input type="text" name="phone" value={vehicleData.phone} onChange={handleInputChange} className={inputClass} placeholder="Ex: (11) 96840-3485" required />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>E-mail do Lead *</label>
                      <input type="email" name="email" value={vehicleData.email} onChange={handleInputChange} className={inputClass} placeholder="Ex: wollace@gmail.com" required />
                    </div>
                    <div>
                      <label className={labelClass}>CEP do Lead *</label>
                      <input type="text" name="cep" value={vehicleData.cep} onChange={handleInputChange} className={inputClass} placeholder="Ex: 02522-000" required />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Atendente Dedicado *</label>
                    <select 
                      name="atendente" 
                      value={vehicleData.atendente} 
                      onChange={handleInputChange} 
                      className={`${inputClass} appearance-none bg-no-repeat bg-[right_1rem_center] bg-[length:1em]`}
                      style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%25236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")` }}
                      required
                    >
                      <option value="" disabled>Selecione seu vendedor...</option>
                      {(empresaLogada?.vendedores || []).map((v, i) => (
                        <option key={v.id || i} value={v.nome}>{v.nome} ({v.cargo})</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Action buttons */}
          <div className="flex justify-between items-center border-t border-[#E5E5E2] pt-6 mt-8">
            <button
              type="button"
              onClick={() => {
                if (step === 1) {
                  navigateTo('dashboard');
                } else {
                  setStep(prev => prev - 1);
                }
              }}
              className="flex items-center gap-1 text-[#8A8A85] hover:text-black font-bold text-xs transition uppercase tracking-wider"
            >
              <ChevronLeft size={14} /> Voltar
            </button>
            
            {step < 5 ? (
              <button
                type="button"
                onClick={() => {
                  if (step === 1 && !vehicleData.brand) {
                    showToast('Selecione a marca e modelo do carro na FIPE.', 'error');
                    return;
                  }
                  if (step === 2) {
                    if (!sinal) {
                      showToast('Por favor, informe o valor do sinal da reserva.', 'error');
                      return;
                    }
                    if (empresaLogada?.valorMinimoSinal && Number(sinal) < empresaLogada.valorMinimoSinal) {
                      showToast(`O sinal Pix não pode ser menor que o mínimo configurado de R$ ${empresaLogada.valorMinimoSinal}.`, 'error');
                      return;
                    }
                    if (!vehicleData.price) {
                      showToast('Por favor, informe o preço do veículo.', 'error');
                      return;
                    }
                    setVehicleData((prev: any) => ({
                      ...prev,
                      sinal: Number(sinal),
                      expiracaoMinutos: expiracao
                    }));
                  }
                  setStep(prev => prev + 1);
                }}
                className="bg-[#141414] hover:bg-[#2A2A26] text-white font-black uppercase tracking-wider text-xs px-7 py-3.5 rounded-2xl flex items-center gap-1.5 transition"
              >
                Continuar <ChevronRight size={14} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePreviewRedirect}
                className="bg-[#141414] hover:bg-[#2A2A26] text-white font-black uppercase tracking-wider text-xs px-7 py-3.5 rounded-2xl flex items-center gap-1.5 transition shrink-0 whitespace-nowrap"
              >
                Visualizar Reserva <ChevronRight size={14} />
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

// --- NEW COMPONENT: RESERVA RÁPIDA (fluxo em 3 fases, uma info por tela) ---
// Reaproveita 100% do fluxo/back-end: coleta os campos, monta o mesmo objeto
// e entrega para a tela de preview (que publica no Supabase).
// --- AGENDA DE VISITAS (leads que agendaram visita pelo link da proposta) ---
function AgendaVisitasView({ navigateTo, showToast, empresaLogada, recentReservations = [], setActiveReservation }) {
  const [visitas, setVisitas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedVisita, setSelectedVisita] = useState<any>(null);

  const hojeISO = new Date().toISOString().slice(0, 10);

  const carregar = async () => {
    const lojaId = empresaLogada?.id;
    if (!isSupabaseConfigured || !lojaId) { setVisitas([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('visitas')
      .select('id, proposta_id, cliente_nome, whatsapp, dia, hora, status, created_at, propostas!inner(title, loja_id)')
      .eq('propostas.loja_id', lojaId)
      .order('dia', { ascending: true })
      .order('hora', { ascending: true });
    if (!error && data) setVisitas(data);
    setLoading(false);
  };

  useEffect(() => { carregar(); }, [empresaLogada?.id]);

  const atualizarStatus = async (id: string, status: string) => {
    setVisitas(prev => prev.map(v => v.id === id ? { ...v, status } : v));
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('visitas').update({ status }).eq('id', id);
      if (error) { showToast('Não foi possível atualizar a visita.', 'error'); carregar(); return; }
    }
    showToast(status === 'compareceu' ? 'Visita marcada como comparecida.' : status === 'cancelada' ? 'Visita cancelada.' : 'Visita atualizada.', 'success');
  };

  const verProposta = (propostaId: string) => {
    const res = recentReservations.find((r: any) => r.id === propostaId);
    if (res) { setActiveReservation(res); navigateTo('preview', 'dashboard'); }
    else showToast('Proposta não encontrada na lista atual.', 'info');
  };

  const waLink = (whatsapp: string, nome: string, titulo: string, dia: string, hora: string) => {
    const num = String(whatsapp || '').replace(/\D/g, '');
    const tel = num.length <= 11 ? `55${num}` : num;
    const msg = encodeURIComponent(`Olá ${nome}! Sobre sua visita ao ${titulo} em ${formatarDia(dia)} às ${hora}.`);
    return `https://wa.me/${tel}?text=${msg}`;
  };

  function formatarDia(diaISO: string) {
    const [y, m, d] = diaISO.split('-').map(Number);
    const data = new Date(y, m - 1, d);
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const amanha = new Date(hoje); amanha.setDate(hoje.getDate() + 1);
    if (data.getTime() === hoje.getTime()) return 'Hoje';
    if (data.getTime() === amanha.getTime()) return 'Amanhã';
    return data.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
  }

  // Dias com visitas futuras (de hoje em diante), em ordem — viram as abas do topo.
  const dias = [...new Set(visitas.filter(v => v.dia >= hojeISO).map(v => v.dia))].sort();
  useEffect(() => {
    if (dias.length && (!selectedDay || !dias.includes(selectedDay))) setSelectedDay(dias[0]);
  }, [visitas]); // eslint-disable-line react-hooks/exhaustive-deps

  const visitasDoDia = visitas.filter(v => v.dia === selectedDay).sort((a, b) => a.hora.localeCompare(b.hora));

  const diaLongo = (diaISO: string) => {
    const [y, m, d] = diaISO.split('-').map(Number);
    const base = formatarDia(diaISO);
    if (base === 'Hoje' || base === 'Amanhã') {
      const data = new Date(y, m - 1, d);
      return `${base}, ${data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`;
    }
    return base;
  };

  const statusPill = (s: string) => {
    if (s === 'compareceu') return <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-700"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Compareceu</span>;
    if (s === 'cancelada') return <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-rose-600"><span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Cancelada</span>;
    return <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-[#141414]"><span className="w-1.5 h-1.5 rounded-full bg-[#C1F11D]" /> Agendada</span>;
  };

  const horaChip = (s: string, hora: string) => {
    const cls = s === 'compareceu' ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : s === 'cancelada' ? 'border-rose-200 bg-rose-50 text-rose-600 line-through'
      : 'border-[#E5E5E2] bg-white text-[#141414]';
    return <span className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-bold shrink-0 ${cls}`}>{hora}</span>;
  };

  const sel = selectedVisita;

  return (
    <div className="pt-8 pb-16 px-6 md:px-12 max-w-3xl mx-auto">
      <div className="mb-5 text-center">
        <h1 className="text-3xl font-extrabold text-[#141414] tracking-tight">Agenda de Visitas</h1>
        <p className="text-[#8A8A85] text-sm mt-1 font-medium">Leads que agendaram uma visita pelo link da reserva.</p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-[#8A8A85] text-sm font-semibold"><RefreshCw size={16} className="animate-spin" /> Carregando visitas...</div>
      ) : dias.length === 0 ? (
        <div className="flex items-center justify-center min-h-[58vh]">
        <div className="bg-white border border-[#E5E5E2] rounded-3xl py-16 px-8 text-center max-w-xl w-full mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-[#F4F4F2] border border-[#E5E5E2] flex items-center justify-center mx-auto mb-5">
            <CalendarClock className="text-[#B9B9B4]" size={26} />
          </div>
          <h4 className="font-extrabold text-[#141414] text-lg mb-2">Nenhuma visita agendada</h4>
          <p className="text-xs text-[#8A8A85] leading-relaxed font-medium max-w-xs mx-auto">Quando um cliente agendar uma visita pelo link da reserva, ela aparece aqui com nome, WhatsApp e horário.</p>
        </div>
        </div>
      ) : (
        <>
          {/* Abas de dia (rolagem horizontal) */}
          <div className="flex items-center gap-6 border-b border-[#E5E5E2] mb-2 overflow-x-auto -mx-6 px-6 md:mx-0 md:px-0">
            {dias.map(d => {
              const active = selectedDay === d;
              return (
                <button key={d} onClick={() => setSelectedDay(d)}
                  className={`relative pb-3 text-sm font-bold transition cursor-pointer whitespace-nowrap ${active ? 'text-[#141414]' : 'text-[#8A8A85] hover:text-[#141414]'}`}>
                  {diaLongo(d)}
                  {active && <span className="absolute -bottom-px left-0 w-full h-0.5 bg-[#C1F11D] rounded-full" />}
                </button>
              );
            })}
          </div>

          {/* Lista enxuta do dia selecionado */}
          <h3 className="text-base font-extrabold text-[#141414] tracking-tight mt-6 mb-1">Visitas</h3>
          <p className="text-xs text-[#8A8A85] font-medium mb-4 flex items-center gap-1.5"><MapPin size={12} /> {empresaLogada?.nome || 'Showroom'}</p>

          <div className="bg-white border border-[#E5E5E2] rounded-3xl divide-y divide-[#EBEBE8] overflow-hidden">
            {visitasDoDia.map(v => (
              <button key={v.id} onClick={() => setSelectedVisita(v)}
                className="w-full text-left px-5 py-4 flex items-center gap-3 hover:bg-[#F4F4F2] transition">
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-[15px] text-[#141414] tracking-tight truncate">{v.cliente_nome}</h4>
                  <p className="text-xs text-[#8A8A85] font-medium truncate mt-0.5">{v.propostas?.title || 'Veículo'}</p>
                  <div className="mt-2">{horaChip(v.status, v.hora)}</div>
                </div>
                <ChevronRight size={18} className="text-[#B9B9B4] shrink-0" />
              </button>
            ))}
          </div>
        </>
      )}

      {/* Detalhe da visita (bottom sheet no mobile, modal no desktop) */}
      {sel && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center" onClick={() => setSelectedVisita(null)}>
          <div className="absolute inset-0 bg-[#141414]/40 backdrop-blur-sm" />
          <div onClick={e => e.stopPropagation()}
            className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl border border-[#E5E5E2] shadow-2xl p-6 animate-rapida-step">
            <div className="sm:hidden w-10 h-1 bg-[#E5E5E2] rounded-full mx-auto -mt-2 mb-4" />
            <div className="flex items-center justify-between gap-2 mb-4">
              {statusPill(sel.status)}
              <button onClick={() => setSelectedVisita(null)} aria-label="Fechar detalhes" className="p-1.5 -mr-1.5 text-[#8A8A85] hover:text-[#141414] transition"><X size={18} /></button>
            </div>

            <h3 className="text-xl font-black text-[#141414] tracking-tight leading-tight">{sel.cliente_nome}</h3>
            <p className="text-xs text-[#8A8A85] font-semibold mt-1 mb-4">{sel.propostas?.title || 'Veículo'}</p>

            <div className="grid grid-cols-3 gap-px bg-[#E5E5E2] border border-[#E5E5E2] rounded-2xl overflow-hidden mb-5">
              {[
                { l: 'Dia', v: diaLongo(sel.dia) },
                { l: 'Horário', v: sel.hora },
                { l: 'Duração', v: '30min' },
              ].map((c, i) => (
                <div key={i} className="bg-[#F4F4F2] p-3">
                  <span className="block text-[9px] text-[#8A8A85] uppercase tracking-wider font-bold">{c.l}</span>
                  <span className="block text-xs font-bold text-[#141414] mt-0.5 truncate">{c.v}</span>
                </div>
              ))}
            </div>

            <div className="bg-[#F4F4F2] border border-[#E5E5E2] rounded-2xl p-4 mb-5">
              <span className="block text-[9px] text-[#8A8A85] uppercase tracking-wider font-bold">WhatsApp</span>
              <span className="block text-sm font-bold text-[#141414] mt-0.5">{sel.whatsapp || '—'}</span>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <a href={waLink(sel.whatsapp, sel.cliente_nome, sel.propostas?.title || 'veículo', sel.dia, sel.hora)} target="_blank" rel="noreferrer"
                  className="flex-1 bg-[#C1F11D] hover:brightness-105 text-[#141414] text-xs font-bold py-3 rounded-xl transition flex items-center justify-center gap-1.5">
                  <MessageCircle size={14} /> WhatsApp
                </a>
                <button onClick={() => { verProposta(sel.proposta_id); }}
                  className="flex-1 bg-white border border-[#E5E5E2] text-[#5F5F5A] text-xs font-bold py-3 rounded-xl hover:bg-[#F4F4F2] hover:text-[#141414] transition flex items-center justify-center gap-1.5">
                  <Eye size={14} /> Ver proposta
                </button>
              </div>
              {sel.status === 'agendada' && (
                <div className="flex gap-2">
                  <button onClick={() => { atualizarStatus(sel.id, 'compareceu'); setSelectedVisita(null); }}
                    className="flex-1 bg-[#141414] hover:bg-[#2A2A26] text-white text-xs font-bold py-3 rounded-xl transition flex items-center justify-center gap-1.5">
                    <CalendarCheck size={14} /> Compareceu
                  </button>
                  <button onClick={() => { atualizarStatus(sel.id, 'cancelada'); setSelectedVisita(null); }}
                    className="px-4 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold py-3 rounded-xl transition">
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ReservaRapidaView({ navigateTo, showToast, setActiveReservation, empresaLogada, totalReservasPlano = 30, reservasUsadas = 0, initialDraft = null, onConsumeDraft = () => {} }) {
  const draftData = initialDraft?.draftData || null;
  // Consome o rascunho no parent (evita re-hidratar numa próxima abertura limpa).
  useEffect(() => { if (initialDraft) onConsumeDraft(); }, []);
  const CORES = ['Branco', 'Preto', 'Prata', 'Cinza', 'Vermelho', 'Azul', 'Verde', 'Amarelo', 'Bege', 'Marrom', 'Laranja'];
  const CAMBIOS = ['Automático', 'Manual'];
  const OPCIONAIS_POOL = ['Computador de Bordo', 'Ar Condicionado', 'Ar Quente', 'Banco do Motorista com Ajuste de Altura', 'Banco em Couro', 'Travas Elétricas', 'Vidros Elétricos', 'Direção Elétrica', 'Rodas de Liga Leve', 'Teto Solar', 'Air Bag', 'Alarme', 'Desembaçador Traseiro', 'Freio ABS', 'Central Multimídia', 'Sensores de Estacionamento'];
  const CONDICOES_POOL = ['Único dono', 'IPVA pago', 'Aceita troca', 'Garantia de fábrica', 'Todas as revisões feitas', 'Licenciado', 'Sem multas', 'Manual e chave reserva', 'Nunca batido', 'Garantia estendida'];
  const SINAL_MINIMO = 500;

  const PHASES = ['Dados do veículo', 'Detalhes da reserva', 'Dados do contato'];

  // Telas em ordem; cada uma pertence a uma fase (1..3).
  const SCREENS = [
    { phase: 1, key: 'veiculo', q: 'Preencha os dados do veículo', sub: 'Buscamos o valor FIPE automaticamente.' },
    { phase: 2, key: 'km', q: 'Quilometragem do veículo', sub: 'Campo obrigatório' },
    { phase: 2, key: 'preco', q: 'Informe o preço de venda', sub: 'Campo obrigatório' },
    { phase: 2, key: 'cor', q: 'Qual a cor?', sub: 'Cor predominante do veículo' },
    { phase: 2, key: 'opcionais', q: 'Opcionais', sub: 'Selecione os diferenciais do veículo que chamam a atenção dos compradores de showroom.' },
    { phase: 2, key: 'cambio', q: 'Qual o câmbio?', sub: 'Tipo de transmissão' },
    { phase: 2, key: 'extras', q: 'Informações adicionais do veículo', sub: 'Destaque o que dá confiança ao comprador. Selecione tudo que se aplica.' },
    { phase: 2, key: 'fotos', q: 'Adicione fotos do veículo', sub: 'Boas fotos aumentam as chances de reserva em até 70%.' },
    { phase: 2, key: 'sinal', q: 'Qual o valor do sinal?', sub: 'Quanto o cliente paga via Pix para reservar.' },
    { phase: 2, key: 'expiracao', q: 'Tempo de expiração', sub: 'Quanto a reserva fica de pé (HH:MM).' },
    { phase: 3, key: 'lead', q: 'Lead de venda', sub: 'Informe os dados do lead para quem você enviará este link de reserva e sinal.' },
    { phase: 3, key: 'atendente', q: 'Atendente dedicado', sub: 'Selecione o profissional do atendimento' },
  ];
  const TOTAL = SCREENS.length;

  const [idx, setIdx] = useState(0);
  const [marcas, setMarcas] = useState<any[]>([]);
  const [modelos, setModelos] = useState<any[]>([]);
  const [anos, setAnos] = useState<any[]>([]);
  const [selectedMarca, setSelectedMarca] = useState('');
  const [selectedModelo, setSelectedModelo] = useState('');
  const [selectedAno, setSelectedAno] = useState('');
  const [isModelosLoading, setIsModelosLoading] = useState(false);
  const [isAnosLoading, setIsAnosLoading] = useState(false);
  const [isPrecoLoading, setIsPrecoLoading] = useState(false);
  const [uploadingFotos, setUploadingFotos] = useState(false);

  const [vehicleData, setVehicleData] = useState<any>(draftData?.vehicleData || {
    brand: '', model: '', version: '', year: '', color: 'Branco', fuel: 'Flex',
    transmission: 'Automático', km: '', price: '', fipePrice: 0, blindado: false,
    fullName: '', cpf: '', phone: '', email: '', cep: '', atendente: '',
    selectedOpcionais: ['Ar Condicionado', 'Direção Elétrica', 'Freio ABS', 'Central Multimídia'],
    condicoes: ['Único dono', 'IPVA pago'],
    description: 'Veículo em excelente estado de conservação, único dono e com todas as revisões periódicas em dia.',
    photos: [],
  });
  const [sinal, setSinal] = useState(draftData?.sinal ?? (empresaLogada?.valorMinimoSinal ? String(empresaLogada.valorMinimoSinal) : ''));
  const [expiracao, setExpiracao] = useState(draftData?.expiracao || 60);

  const fmtExp = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  const [expiracaoText, setExpiracaoText] = useState(fmtExp(draftData?.expiracao || 60));
  const parseExp = (raw: string) => {
    const c = raw.replace(/[^\d:]/g, '');
    if (c.includes(':')) { const [h, m] = c.split(':'); return (parseInt(h || '0', 10) * 60) + parseInt(m || '0', 10); }
    return parseInt(c || '0', 10);
  };
  const stepExp = (delta: number) => { const n = Math.min(360, Math.max(15, expiracao + delta)); setExpiracao(n); setExpiracaoText(fmtExp(n)); };
  const fmtExpLabel = (m: number) => { if (m < 60) return `${m}min`; const h = Math.floor(m / 60); const r = m % 60; return r === 0 ? `${h}h` : `${h}h ${r}min`; };

  const maskMilhar = (raw: string) => { const d = raw.replace(/\D/g, ''); return d ? Number(d).toLocaleString('pt-BR') : ''; };
  const maskCPF = (raw: string) => {
    const d = raw.replace(/\D/g, '').slice(0, 11);
    return d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  };
  const maskCEP = (raw: string) => { const d = raw.replace(/\D/g, '').slice(0, 8); return d.replace(/(\d{5})(\d)/, '$1-$2'); };
  const maskPhone = (raw: string) => {
    const d = raw.replace(/\D/g, '').slice(0, 11);
    if (d.length === 0) return '';
    if (d.length <= 2) return `(${d}`;
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  };

  // Carrega marcas FIPE no mount
  useEffect(() => {
    fetch('https://parallelum.com.br/fipe/api/v1/carros/marcas')
      .then(res => res.json())
      .then(data => { if (data && data.length > 0) setMarcas(data); })
      .catch(() => setMarcas(typeof MOCK_BRANDS !== 'undefined' ? MOCK_BRANDS : []));
  }, []);

  const onMarca = (id: string) => {
    setSelectedMarca(id); setModelos([]); setSelectedModelo(''); setAnos([]); setSelectedAno('');
    if (!id) return;
    const brandName = marcas.find(m => m.codigo == id)?.nome || id;
    setVehicleData(prev => ({ ...prev, brand: brandName }));
    setIsModelosLoading(true);
    fetch(`https://parallelum.com.br/fipe/api/v1/carros/marcas/${id}/modelos`)
      .then(res => res.json())
      .then(data => { if (data && data.modelos) setModelos(data.modelos); setIsModelosLoading(false); })
      .catch(() => { setModelos((typeof MOCK_MODELS !== 'undefined' && MOCK_MODELS[brandName]) || []); setIsModelosLoading(false); });
  };

  const onModelo = (id: string) => {
    setSelectedModelo(id); setAnos([]); setSelectedAno('');
    if (!id) return;
    const modelName = modelos.find(m => m.codigo == id)?.nome || id;
    setVehicleData(prev => ({ ...prev, model: modelName }));
    setIsAnosLoading(true);
    fetch(`https://parallelum.com.br/fipe/api/v1/carros/marcas/${selectedMarca}/modelos/${id}/anos`)
      .then(res => res.json())
      .then(data => { if (data && data.length > 0) setAnos(data); setIsAnosLoading(false); })
      .catch(() => { setAnos(typeof MOCK_YEARS !== 'undefined' ? MOCK_YEARS : []); setIsAnosLoading(false); });
  };

  const onAno = (id: string) => {
    setSelectedAno(id);
    if (!id) return;
    setIsPrecoLoading(true);
    fetch(`https://parallelum.com.br/fipe/api/v1/carros/marcas/${selectedMarca}/modelos/${selectedModelo}/anos/${id}`)
      .then(res => res.json())
      .then(data => {
        if (data) {
          const raw = data.Valor.replace('R$', '').replace(/\./g, '').replace(',', '.').trim();
          const num = parseFloat(raw);
          setVehicleData(prev => ({ ...prev, version: data.AnoModelo + ' ' + data.Combustivel, year: String(data.AnoModelo), fuel: data.Combustivel, fipePrice: num, price: String(num) }));
        }
        setIsPrecoLoading(false);
      })
      .catch(() => { setIsPrecoLoading(false); });
  };

  const toggleOpcional = (opc: string) => setVehicleData(prev => ({
    ...prev,
    selectedOpcionais: prev.selectedOpcionais.includes(opc) ? prev.selectedOpcionais.filter((o: string) => o !== opc) : [...prev.selectedOpcionais, opc],
  }));
  const toggleCondicao = (c: string) => setVehicleData(prev => ({
    ...prev,
    condicoes: (prev.condicoes || []).includes(c) ? prev.condicoes.filter((o: string) => o !== c) : [...(prev.condicoes || []), c],
  }));

  // Upload de fotos (copiado do fluxo normal: Supabase Storage, bucket "veiculos")
  const uploadFotos = async (fileList: FileList | null) => {
    const arquivos = Array.from(fileList || []);
    if (arquivos.length === 0) return;
    if (!isSupabaseConfigured) { showToast('Supabase não configurado (preencha o .env e reinicie o dev).', 'error'); return; }
    const espaco = 8 - vehicleData.photos.length;
    if (espaco <= 0) { showToast('Limite de 8 fotos atingido.', 'info'); return; }
    setUploadingFotos(true);
    try {
      const novasUrls: string[] = [];
      for (const file of arquivos.slice(0, espaco)) {
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
        const path = `propostas/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error } = await supabase.storage.from('veiculos').upload(path, file, { contentType: file.type, upsert: false });
        if (error) throw error;
        const { data } = supabase.storage.from('veiculos').getPublicUrl(path);
        novasUrls.push(data.publicUrl);
      }
      setVehicleData((prev: any) => ({ ...prev, photos: [...prev.photos, ...novasUrls] }));
      showToast(`${novasUrls.length} foto(s) enviada(s) com sucesso!`, 'success');
    } catch (e: any) {
      showToast('Erro ao enviar foto: ' + (e?.message || 'tente novamente'), 'error');
    } finally { setUploadingFotos(false); }
  };
  const addPresetPhoto = (url: string) => {
    if (vehicleData.photos.length >= 8) { showToast('Limite de 8 fotos atingido.', 'info'); return; }
    setVehicleData((prev: any) => ({ ...prev, photos: [...prev.photos, url] }));
    showToast('Foto adicionada com sucesso!', 'success');
  };
  const removePhoto = (i: number) => setVehicleData((prev: any) => ({ ...prev, photos: prev.photos.filter((_: any, j: number) => j !== i) }));

  const screen = SCREENS[idx];
  const currentPhase = screen.phase;

  const isScreenValid = (key: string): boolean => {
    switch (key) {
      case 'veiculo': return (Number(vehicleData.fipePrice) > 0 && !!vehicleData.brand && !selectedMarca) || (!!selectedMarca && !!selectedModelo && !!selectedAno && !isPrecoLoading && Number(vehicleData.fipePrice) > 0);
      case 'km': return String(vehicleData.km).replace(/\D/g, '').length > 0;
      case 'preco': return Number(vehicleData.price) > 0;
      case 'cor': return !!vehicleData.color;
      case 'opcionais': return true;
      case 'cambio': return !!vehicleData.transmission;
      case 'extras': return true;
      case 'fotos': return true;
      case 'sinal': return Number(sinal) >= SINAL_MINIMO;
      case 'expiracao': return expiracao >= 15;
      case 'lead': return vehicleData.fullName.trim().length >= 3 && vehicleData.cpf.replace(/\D/g, '').length === 11 && vehicleData.phone.replace(/\D/g, '').length === 11;
      case 'atendente': return !!vehicleData.atendente;
      default: return false;
    }
  };

  const finalizar = () => {
    const now = new Date();
    const stamp = now.toLocaleTimeString('pt-BR') + ' de ' + now.toLocaleDateString('pt-BR');
    const base = vehicleData.blindado && !vehicleData.selectedOpcionais.includes('Blindado')
      ? ['Blindado', ...vehicleData.selectedOpcionais] : vehicleData.selectedOpcionais;
    const opcionais = [...base, ...(vehicleData.condicoes || [])];
    const compiledReservation = {
      id: Date.now(),
      origin: 'reserva-rapida',
      draftData: { vehicleData, sinal, expiracao },
      title: `${vehicleData.brand} ${vehicleData.model} ${vehicleData.version}`.trim(),
      created: now.toLocaleString('pt-BR'),
      duration: String(expiracao),
      expiracao: Number(expiracao),
      sinal: Number(sinal || 0),
      marcaText: vehicleData.brand,
      modeloText: vehicleData.model,
      anoText: vehicleData.year,
      corText: vehicleData.color,
      motorText: vehicleData.fuel,
      fipeValue: clampPrice(vehicleData.fipePrice),
      valorVenda: clampPrice(parseFloat(vehicleData.price) || vehicleData.fipePrice),
      km: vehicleData.km,
      cambio: vehicleData.transmission,
      combustivel: vehicleData.fuel,
      opcionais: opcionais.join(', '),
      fotos: vehicleData.photos.length > 0 ? vehicleData.photos.join(',') : 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&w=800&q=80',
      vendedores: vehicleData.atendente,
      clienteNome: vehicleData.fullName,
      laudoAprovado: true,
      status: 'Active',
      elapsedSeconds: 0,
      logs: [
        { time: stamp, text: `Proposta criada por ${vehicleData.atendente} (Reserva Rápida)` },
        { time: stamp, text: `Link de sinal de R$ ${Number(sinal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ativado` },
      ],
    };
    setActiveReservation(compiledReservation);
    navigateTo('preview');
  };

  const avancar = () => {
    if (!isScreenValid(screen.key)) return;
    if (idx < TOTAL - 1) setIdx(idx + 1);
    else finalizar();
  };
  const voltar = () => { if (idx > 0) setIdx(idx - 1); else navigateTo('dashboard'); };

  // Limite de plano
  if (reservasUsadas >= totalReservasPlano) {
    return (
      <div className="fixed inset-0 z-[70] bg-[#F4F4F2] flex items-center justify-center p-6">
        <div className="bg-white border border-[#E5E5E2] rounded-3xl p-8 max-w-sm text-center shadow-sm">
          <h2 className="text-xl font-black text-[#141414] mb-2">Limite de propostas atingido</h2>
          <p className="text-[#8A8A85] text-xs mb-6 font-medium">Seu plano permite até {totalReservasPlano} propostas ativas. Faça upgrade para continuar.</p>
          <button onClick={() => navigateTo('configuracoes')} className="w-full bg-[#141414] hover:bg-[#2A2A26] text-white font-bold py-3.5 rounded-xl transition text-sm">Fazer upgrade</button>
          <button onClick={() => navigateTo('dashboard')} className="w-full mt-2 text-[#8A8A85] font-bold py-2 text-xs">Voltar</button>
        </div>
      </div>
    );
  }

  // text-base (16px) evita o zoom automático do Safari iOS ao focar inputs
  // dentro do container fixed (que causava a página "travar" deslocada de lado).
  const inputCls = "w-full bg-white border-2 border-[#E5E5E2] rounded-2xl px-4 py-3.5 text-base font-bold text-[#141414] outline-none focus:border-[#141414] transition placeholder:text-[#B9B9B4] placeholder:font-medium";
  const selectCls = inputCls + " appearance-none bg-no-repeat bg-[right_1rem_center] bg-[length:1.1em] cursor-pointer";
  const labelCls = "block text-[11px] font-black uppercase tracking-wider text-[#8A8A85] mb-2";
  const chevronBg = { backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23141414' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.8' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")` };
  const chip = (active: boolean) => `px-4 py-3 rounded-2xl text-sm font-bold border-2 transition text-center ${active ? 'bg-[#141414] text-white border-[#141414]' : 'bg-white text-[#141414] border-[#E5E5E2] hover:border-[#141414]'}`;
  const presetBtn = "bg-white border border-[#D9D9D5] hover:border-[#141414] text-[10px] font-black px-3 py-1.5 rounded-xl text-[#5F5F5A] transition";

  const renderScreen = () => {
    switch (screen.key) {
      case 'veiculo':
        if (vehicleData.brand && !selectedMarca) {
          // Reabertura de rascunho: veículo já escolhido — mostra resumo (FIPE preservada).
          return (
            <div className="space-y-4">
              <div className="bg-white border-2 border-[#E5E5E2] rounded-2xl p-5">
                <span className="block text-[11px] font-black uppercase tracking-wider text-[#8A8A85] mb-1">Veículo selecionado</span>
                <h3 className="text-lg font-black text-[#141414] leading-tight">{`${vehicleData.brand} ${vehicleData.model} ${vehicleData.version}`.trim()}</h3>
                {Number(vehicleData.fipePrice) > 0 && (
                  <p className="text-xs text-[#141414] font-bold bg-[#C1F11D]/25 inline-block px-3 py-1.5 rounded-lg mt-3">FIPE {formatCurrency(vehicleData.fipePrice)}</p>
                )}
              </div>
              <button type="button" onClick={() => { setVehicleData(prev => ({ ...prev, brand: '', model: '', version: '', year: '', fipePrice: 0, price: '' })); setModelos([]); setAnos([]); }}
                className="text-[11px] uppercase tracking-widest text-[#8A8A85] font-bold hover:text-[#141414] transition">Trocar veículo</button>
            </div>
          );
        }
        return (
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Marca *</label>
              <select autoFocus className={selectCls} style={chevronBg} value={selectedMarca} onChange={e => onMarca(e.target.value)}>
                <option value="">Selecione uma marca...</option>
                {marcas.map((m, i) => <option key={m.codigo || i} value={m.codigo}>{m.nome}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Modelo *</label>
              <select className={selectCls} style={chevronBg} value={selectedModelo} onChange={e => onModelo(e.target.value)} disabled={isModelosLoading || modelos.length === 0}>
                <option value="">{isModelosLoading ? 'Carregando modelos...' : 'Escolha um modelo'}</option>
                {modelos.map((m, i) => <option key={m.codigo || i} value={m.codigo}>{m.nome}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Ano / Versão *</label>
              <select className={selectCls} style={chevronBg} value={selectedAno} onChange={e => onAno(e.target.value)} disabled={isAnosLoading || anos.length === 0}>
                <option value="">{isAnosLoading ? 'Carregando versões...' : 'Escolha uma versão'}</option>
                {anos.map((a, i) => <option key={a.codigo || i} value={a.codigo}>{a.nome}</option>)}
              </select>
              {isPrecoLoading && <p className="text-xs text-[#8A8A85] font-semibold mt-2">Buscando preço FIPE...</p>}
              {!isPrecoLoading && Number(vehicleData.fipePrice) > 0 && (
                <p className="text-xs text-[#141414] font-bold bg-[#C1F11D]/25 inline-block px-3 py-1.5 rounded-lg mt-2">FIPE {formatCurrency(vehicleData.fipePrice)}</p>
              )}
            </div>
            <label className="flex items-center gap-2.5 pt-1 cursor-pointer select-none">
              <input type="checkbox" checked={vehicleData.blindado} onChange={e => setVehicleData(prev => ({ ...prev, blindado: e.target.checked }))} className="w-4 h-4 accent-[#141414] rounded" />
              <span className="text-[11px] font-black uppercase tracking-wider text-[#8A8A85]">Blindado</span>
            </label>
          </div>
        );
      case 'km':
        return (
          <div className="flex items-baseline gap-3 border-b-2 border-[#E5E5E2] focus-within:border-[#141414] pb-3 transition-colors">
            <input autoFocus type="text" inputMode="numeric" placeholder="0" value={vehicleData.km}
              onChange={e => setVehicleData(prev => ({ ...prev, km: maskMilhar(e.target.value) }))}
              className="flex-1 min-w-0 bg-transparent text-5xl font-black text-[#141414] outline-none placeholder:text-[#D9D9D5]" />
            <span className="text-xl font-bold text-[#8A8A85] shrink-0">km</span>
          </div>
        );
      case 'preco':
        return (
          <div>
            <div className="flex items-baseline gap-2 border-b-2 border-[#E5E5E2] focus-within:border-[#141414] pb-3 transition-colors">
              <span className="text-3xl font-black text-[#141414] shrink-0">R$</span>
              <input autoFocus type="text" inputMode="numeric" placeholder="0" value={vehicleData.price ? Number(vehicleData.price).toLocaleString('pt-BR') : ''}
                onChange={e => { const d = e.target.value.replace(/\D/g, ''); setVehicleData(prev => ({ ...prev, price: d ? String(clampPrice(Number(d))) : '' })); }}
                className="flex-1 min-w-0 bg-transparent text-5xl font-black text-[#141414] outline-none placeholder:text-[#D9D9D5]" />
              <span className="text-xl font-bold text-[#8A8A85] shrink-0">,00</span>
            </div>
            {Number(vehicleData.fipePrice) > 0 && (
              <p className="text-xs text-[#141414] font-bold bg-[#C1F11D]/25 inline-block px-3 py-1.5 rounded-lg mt-4">FIPE {formatCurrency(vehicleData.fipePrice)}</p>
            )}
          </div>
        );
      case 'cor':
        return (
          <div className="grid grid-cols-3 gap-2.5">
            {CORES.map(c => <button key={c} type="button" className={chip(vehicleData.color === c)} onClick={() => setVehicleData(prev => ({ ...prev, color: c }))}>{c}</button>)}
          </div>
        );
      case 'opcionais':
        return (
          <div className="flex flex-wrap gap-2.5">
            {OPCIONAIS_POOL.map(opc => {
              const on = vehicleData.selectedOpcionais.includes(opc);
              return (
                <button key={opc} type="button" onClick={() => toggleOpcional(opc)}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-bold border-2 transition flex items-center gap-1.5 ${on ? 'bg-[#141414] border-[#141414] text-white' : 'bg-white border-[#E5E5E2] text-[#141414] hover:border-[#141414]'}`}>
                  <span>{opc}</span><span>{on ? '✓' : '+'}</span>
                </button>
              );
            })}
          </div>
        );
      case 'cambio':
        return (
          <div className="grid grid-cols-2 gap-2.5">
            {CAMBIOS.map(c => <button key={c} type="button" className={chip(vehicleData.transmission === c)} onClick={() => setVehicleData(prev => ({ ...prev, transmission: c }))}>{c}</button>)}
          </div>
        );
      case 'extras':
        return (
          <div className="flex flex-wrap gap-2.5">
            {CONDICOES_POOL.map(c => {
              const on = (vehicleData.condicoes || []).includes(c);
              return (
                <button key={c} type="button" onClick={() => toggleCondicao(c)}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-bold border-2 transition flex items-center gap-1.5 ${on ? 'bg-[#141414] border-[#141414] text-white' : 'bg-white border-[#E5E5E2] text-[#141414] hover:border-[#141414]'}`}>
                  <span>{c}</span><span>{on ? '✓' : '+'}</span>
                </button>
              );
            })}
          </div>
        );
      case 'fotos':
        return (
          <div>
            <label className={`border-2 border-dashed rounded-3xl p-6 transition flex flex-col items-center ${uploadingFotos ? 'border-[#C1F11D] bg-[#C1F11D]/10 cursor-wait' : 'border-[#D9D9D5] hover:border-[#141414] bg-[#F4F4F2] cursor-pointer'}`}>
              <input type="file" accept="image/*" multiple className="hidden" disabled={uploadingFotos} onChange={e => { uploadFotos(e.target.files); e.currentTarget.value = ''; }} />
              {uploadingFotos ? <RefreshCw className="text-[#141414] mb-2 animate-spin" size={28} /> : <UploadCloud className="text-[#B9B9B4] mb-2" size={28} />}
              <span className="font-bold text-xs text-[#2A2A26]">{uploadingFotos ? 'Enviando fotos...' : 'Carregar fotos do veículo'}</span>
              <span className="text-[10px] text-[#B9B9B4] mt-1">Clique para selecionar · PNG, JPG, JPEG</span>
            </label>
            <div className="mt-3 text-center">
              <span className="text-[10px] text-[#B9B9B4] font-semibold uppercase tracking-wider">ou use um preset rápido</span>
              <div className="mt-2 flex flex-wrap gap-2 justify-center">
                <button type="button" className={presetBtn} onClick={() => addPresetPhoto('https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=800&q=80')}>+ Frente +</button>
                <button type="button" className={presetBtn} onClick={() => addPresetPhoto('https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=800&q=80')}>+ Traseira +</button>
                <button type="button" className={presetBtn} onClick={() => addPresetPhoto('https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=800&q=80')}>+ Interior +</button>
                <button type="button" className={presetBtn} onClick={() => addPresetPhoto('https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80')}>+ Lateral +</button>
                <button type="button" className={presetBtn} onClick={() => addPresetPhoto('https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=800&q=80')}>+ Frente Extra +</button>
              </div>
            </div>
            {vehicleData.photos.length > 0 && (
              <div className="grid grid-cols-4 gap-2.5 mt-5">
                {vehicleData.photos.map((url: string, i: number) => (
                  <div key={i} className="relative h-16 rounded-xl overflow-hidden border border-[#E5E5E2]">
                    <img src={url} alt={`Foto ${i + 1} do veículo`} className="w-full h-full object-cover" />
                    <button type="button" onClick={() => removePhoto(i)} aria-label={`Remover foto ${i + 1}`} className="absolute top-1 right-1 bg-black/70 hover:bg-black p-1 rounded-full text-white transition"><X size={10} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      case 'sinal': {
        const sinalNum = Number(sinal) || 0;
        const abaixoMin = sinalNum > 0 && sinalNum < SINAL_MINIMO;
        return (
          <div>
            <div className="flex items-baseline gap-2 border-b-2 border-[#E5E5E2] focus-within:border-[#141414] pb-3 transition-colors">
              <span className="text-3xl font-black text-[#141414] shrink-0">R$</span>
              <input autoFocus type="text" inputMode="numeric" placeholder="0"
                value={sinal ? Number(sinal).toLocaleString('pt-BR') : ''} onChange={e => setSinal(e.target.value.replace(/\D/g, ''))}
                className="flex-1 min-w-0 bg-transparent text-5xl font-black text-[#141414] outline-none placeholder:text-[#D9D9D5]" />
              <span className="text-xl font-bold text-[#8A8A85] shrink-0">,00</span>
            </div>
            <p className={`text-xs font-bold inline-block px-3 py-1.5 rounded-lg mt-4 ${abaixoMin ? 'text-rose-700 bg-rose-50 border border-rose-200' : 'text-[#141414] bg-[#C1F11D]/25'}`}>
              {abaixoMin ? `Sinal abaixo do mínimo de ${formatCurrency(SINAL_MINIMO)}` : `Valor mínimo de sinal: ${formatCurrency(SINAL_MINIMO)}`}
            </p>
          </div>
        );
      }
      case 'expiracao':
        return (
          <div className="space-y-3">
            <div className="relative">
              <input type="text" inputMode="numeric" className={`${inputCls} tracking-wide pr-14`} placeholder="01:00"
                value={expiracaoText} onChange={e => setExpiracaoText(e.target.value)}
                onBlur={() => { const m = Math.min(360, Math.max(15, parseExp(expiracaoText) || 15)); setExpiracao(m); setExpiracaoText(fmtExp(m)); }}
                onKeyDown={e => { if (e.key === 'ArrowUp') { e.preventDefault(); stepExp(15); } else if (e.key === 'ArrowDown') { e.preventDefault(); stepExp(-15); } }} />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-0.5">
                <button type="button" onClick={() => stepExp(15)} aria-label="Aumentar" className="w-8 h-5 rounded-md flex items-center justify-center text-[#8A8A85] hover:text-[#141414] hover:bg-[#F4F4F2]"><ChevronUp size={16} strokeWidth={2.5} /></button>
                <button type="button" onClick={() => stepExp(-15)} aria-label="Diminuir" className="w-8 h-5 rounded-md flex items-center justify-center text-[#8A8A85] hover:text-[#141414] hover:bg-[#F4F4F2]"><ChevronDown size={16} strokeWidth={2.5} /></button>
              </div>
            </div>
            <p className="text-xs text-[#141414] font-bold bg-[#C1F11D]/25 inline-block px-3 py-1.5 rounded-lg">A reserva fica de pé por {fmtExpLabel(expiracao)}</p>
          </div>
        );
      case 'lead':
        return (
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Nome do lead *</label>
              <input autoFocus type="text" className={inputCls} placeholder="Ex: Allan Salgado" value={vehicleData.fullName} onChange={e => setVehicleData(prev => ({ ...prev, fullName: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>CPF do lead *</label>
              <input type="text" inputMode="numeric" className={inputCls} placeholder="Ex: 370.875.668-14" value={vehicleData.cpf} onChange={e => setVehicleData(prev => ({ ...prev, cpf: maskCPF(e.target.value) }))} />
            </div>
            <div>
              <label className={labelCls}>WhatsApp do lead *</label>
              <input type="tel" className={inputCls} placeholder="Ex: (11) 96840-3485" value={vehicleData.phone} onChange={e => setVehicleData(prev => ({ ...prev, phone: maskPhone(e.target.value) }))} />
            </div>
            <div>
              <label className={labelCls}>E-mail do lead</label>
              <input type="email" className={inputCls} placeholder="Ex: wollace@gmail.com" value={vehicleData.email} onChange={e => setVehicleData(prev => ({ ...prev, email: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>CEP do lead</label>
              <input type="text" inputMode="numeric" className={inputCls} placeholder="Ex: 02522-000" value={vehicleData.cep} onChange={e => setVehicleData(prev => ({ ...prev, cep: maskCEP(e.target.value) }))} />
            </div>
          </div>
        );
      case 'atendente':
        return (
          <div>
            <label className={labelCls}>Nome *</label>
            <select autoFocus className={selectCls} style={chevronBg} value={vehicleData.atendente} onChange={e => setVehicleData(prev => ({ ...prev, atendente: e.target.value }))}>
              <option value="">Selecione o vendedor...</option>
              {(empresaLogada?.vendedores || []).map((v: any, i: number) => <option key={v.id || i} value={v.nome}>{v.nome}{v.cargo ? ` (${v.cargo})` : ''}</option>)}
            </select>
          </div>
        );
      default: return null;
    }
  };

  const progress = ((idx + 1) / TOTAL) * 100;
  const isLast = idx === TOTAL - 1;
  const valid = isScreenValid(screen.key);

  return (
    <div className="fixed top-16 inset-x-0 bottom-0 z-30 overflow-x-hidden bg-[#F4F4F2] text-[#141414] flex flex-col lg:static lg:top-auto lg:z-auto lg:bg-transparent lg:items-center lg:justify-center lg:min-h-[80vh] lg:py-10 lg:px-8">
      <div className="w-full max-w-md mx-auto h-full flex flex-col overflow-x-hidden px-6 lg:max-w-xl lg:h-auto lg:px-12 lg:py-10 lg:bg-white lg:border lg:border-[#E5E5E2] lg:rounded-[28px] lg:shadow-[0_20px_40px_-15px_rgba(20,20,20,0.08)]">
        {/* Topo: indicador de 3 fases + barra + título */}
        <div className="pt-6 lg:pt-0">
          <div className="flex items-center gap-2 mb-3 text-sm">
            {PHASES.map((label, i) => {
              const p = i + 1;
              const done = currentPhase > p;
              const active = currentPhase === p;
              return (
                <React.Fragment key={p}>
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 transition-colors ${done || active ? 'bg-[#141414] text-white' : 'bg-[#E5E5E2] text-[#8A8A85]'}`}>
                    {done ? '✓' : p}
                  </span>
                  {active && <span className="font-bold text-[#141414] mr-auto truncate">{label}</span>}
                </React.Fragment>
              );
            })}
          </div>
          <div className="h-1.5 w-full bg-[#E5E5E2] rounded-full overflow-hidden">
            <div className="h-full bg-[#C1F11D] rounded-full transition-[width] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]" style={{ width: `${progress}%` }} />
          </div>
          {/* Chip fixo do veículo: das fases 2 em diante o lojista sempre vê QUAL
              carro está cadastrando (marca+modelo em destaque, versão esmaecida,
              ano no selo lima) — mesmo padrão push do ticker do painel. */}
          {currentPhase >= 2 && vehicleData.model && (() => {
            const tv = parseVeiculoTitulo(`${vehicleData.brand} ${vehicleData.model} ${vehicleData.version}`.trim());
            return (
              <div className="mt-4 flex items-center gap-2.5 bg-[#141414] rounded-2xl pl-1.5 pr-3 py-1.5 text-left">
                <span className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                  <Car size={15} className="text-[#C1F11D]" />
                </span>
                <div className="min-w-0 flex-1 leading-tight">
                  <span className="block text-[8px] font-black uppercase tracking-widest text-white/50">Cadastrando</span>
                  <p className="text-[13px] font-bold text-white truncate">
                    {tv.marca} {tv.modelo}
                    {tv.resto && <span className="text-white/60 font-semibold"> {tv.resto}</span>}
                  </p>
                </div>
                {vehicleData.year && (
                  <span className="shrink-0 text-[10px] font-black bg-[#C1F11D] text-[#141414] px-2 py-1 rounded-md">{vehicleData.year}</span>
                )}
              </div>
            );
          })()}
          <div className="mt-6 space-y-1">
            <h2 className="text-2xl font-black tracking-tight leading-tight text-[#141414]">{screen.q}</h2>
            <p className="text-xs text-[#8A8A85] font-medium">{screen.sub}</p>
          </div>
        </div>

        {/* Meio: conteúdo animado por tela (rola se necessário) */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-6 lg:flex-none lg:min-h-[160px]">
          <div key={idx} className="animate-rapida-step">
            {renderScreen()}
          </div>
        </div>

        {/* Base fixa: Voltar + Continuar com estados */}
        <div className="shrink-0 pb-8 pt-3 border-t border-[#E5E5E2] flex items-center justify-between gap-3 bg-[#F4F4F2] lg:bg-transparent lg:pb-0">
          <button onClick={voltar} className="flex items-center gap-1 text-[11px] uppercase tracking-widest text-[#8A8A85] font-bold hover:text-[#141414] transition shrink-0">
            <ArrowLeft size={14} /> Voltar
          </button>
          <button
            onClick={avancar}
            disabled={!valid}
            className="px-7 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider transition bg-[#141414] text-white hover:bg-[#2A2A26] disabled:bg-[#E5E5E2] disabled:text-[#B9B9B4] disabled:cursor-not-allowed flex items-center gap-1.5 shrink-0 whitespace-nowrap"
          >
            {isLast ? 'Visualizar Reserva' : 'Continuar'} <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

// --- NEW COMPONENT: PRICING VIEW (página de planos estilo SaaS) ---
function PricingView({ navigateTo, setPlanoSelecionado }) {
  const [ciclo, setCiclo] = useState<'mensal' | 'anual'>('mensal');
  const [activeFaq, setActiveFaq] = useState<number | null>(0);

  const precoMes = (p) => ciclo === 'mensal' ? p.precoMensal : p.precoAnual / 12;
  const escolher = (id) => { setPlanoSelecionado(id); navigateTo('assinar'); };

  const Cel = ({ on, children }: any) => (
    children !== undefined
      ? <span className="font-bold text-[#141414]">{children}</span>
      : (on ? <Check size={16} className="text-[#141414] mx-auto" strokeWidth={3} /> : <span className="text-[#D9D9D5]">—</span>)
  );

  const linhas = [
    { label: 'Links de reserva ativos', val: (p) => p.limite },
    { label: 'Vendedores', val: (p) => p.vendedores },
    { label: 'Painel ao vivo', val: () => true },
    { label: 'Busca FIPE automática', val: () => true },
    { label: 'Pix direto na conta', val: () => true },
    { label: 'Relatórios avançados', val: (p) => p.relatorios },
    { label: 'Suporte', val: (p) => p.suporte },
  ];

  const faqs = [
    { q: 'Tem fidelidade ou multa?', a: 'Não. Você pode cancelar a assinatura quando quiser, sem multa. O acesso permanece ativo até o fim do ciclo já pago.' },
    { q: 'Como funciona o plano anual?', a: 'No ciclo anual você paga 10 meses e ganha 2 meses grátis. O valor é cobrado uma vez por ano, e exibimos o equivalente por mês para facilitar a comparação.' },
    { q: 'Posso trocar de plano depois?', a: 'Sim. Pelo painel de Configurações você faz upgrade ou downgrade a qualquer momento; o novo limite de links passa a valer imediatamente.' },
    { q: 'Há taxa por reserva ou comissão?', a: 'Não cobramos comissão sobre reservas. Você paga apenas a assinatura fixa, e o sinal via Pix cai direto na conta da sua loja.' },
  ];

  return (
    <div className="bg-[#F4F4F2] text-[#141414] min-h-screen antialiased">
      <SiteHeader navigateTo={navigateTo} activePage="pricing" />

      {/* HERO + TOGGLE */}
      <section className="bg-[#141414] text-white pt-40 md:pt-48 pb-36 text-center relative overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#C1F11D]/10 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="max-w-3xl mx-auto px-6 space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 bg-[#C1F11D]/20 text-[#C1F11D] px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest">Preços</div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.1]">Planos que cabem no seu <span className="text-[#C1F11D]">showroom</span></h1>
          <p className="text-[#B9B9B4] text-lg leading-relaxed max-w-xl mx-auto">Assinatura fixa, sem comissão por reserva. Escolha o número de propostas ativas que sua equipe gerencia em paralelo.</p>
          {/* Toggle */}
          <div className="inline-flex items-center gap-1 bg-white/5 border border-white/10 p-1 rounded-full">
            <button onClick={() => setCiclo('mensal')} className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${ciclo === 'mensal' ? 'bg-[#C1F11D] text-[#141414]' : 'text-white/70 hover:text-white'}`}>Mensal</button>
            <button onClick={() => setCiclo('anual')} className={`px-5 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-2 ${ciclo === 'anual' ? 'bg-[#C1F11D] text-[#141414]' : 'text-white/70 hover:text-white'}`}>
              Anual
              <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${ciclo === 'anual' ? 'bg-[#141414] text-[#C1F11D]' : 'bg-[#C1F11D]/20 text-[#C1F11D]'}`}>2 meses grátis</span>
            </button>
          </div>
        </div>
      </section>

      {/* 3 CARDS */}
      <section className="px-6 -mt-24 relative z-10">
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-6 items-start">
          {PLANOS_ORDEM.map((id) => {
            const p = PLANOS[id];
            return (
              <div key={id} className={`relative bg-white rounded-[24px] p-7 border-2 flex flex-col h-full ${p.destaque ? 'border-[#141414] ring-2 ring-[#C1F11D] shadow-[0_30px_60px_-20px_rgba(20,20,20,0.25)] md:-mt-4' : 'border-[rgba(20,20,20,0.08)] shadow-[0_20px_40px_-15px_rgba(20,20,20,0.1)]'}`}>
                {p.destaque && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#C1F11D] text-[#141414] text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-wider">Mais Popular</span>
                )}
                <span className="text-[10px] font-bold text-[#8A8A85] uppercase tracking-widest">{p.tag}</span>
                <h3 className="text-2xl font-black text-[#141414] mt-1">{p.nome}</h3>
                <div className="mt-4 mb-1">
                  <span className="text-4xl font-black text-[#141414]">{formatBRL(precoMes(p))}</span>
                  <span className="text-sm font-bold text-[#B9B9B4]">/mês</span>
                </div>
                <p className="text-[11px] text-[#8A8A85] font-semibold h-4">
                  {ciclo === 'anual' ? `${formatBRL(p.precoAnual)} cobrado anualmente` : 'Cobrado mensalmente'}
                </p>
                <button
                  onClick={() => escolher(id)}
                  className={`mt-6 w-full font-bold text-sm py-3.5 rounded-full transition-all duration-300 ${p.destaque ? 'bg-[#141414] text-[#F4F4F2] hover:bg-[#C1F11D] hover:text-[#141414]' : 'bg-[#C1F11D] text-[#141414] hover:bg-[#141414] hover:text-[#F4F4F2]'}`}
                >
                  Assinar {p.nome}
                </button>
                <ul className="mt-7 space-y-3 border-t border-[rgba(20,20,20,0.08)] pt-6">
                  {p.recursos.map((r, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm">
                      <CheckCircle2 size={18} className="text-[#141414] shrink-0 mt-0.5" />
                      <span className="text-[#8A8A85] font-medium leading-snug">{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {/* FAIXA DE CONFIANÇA */}
      <section className="py-12 text-center px-6">
        <p className="text-sm font-bold text-[#8A8A85]">Sem comissão por reserva &nbsp;·&nbsp; Pix direto na sua conta &nbsp;·&nbsp; Cancele quando quiser</p>
      </section>

      {/* TABELA COMPARATIVA */}
      <section className="pb-20 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-black tracking-tight text-center mb-10">Compare os planos</h2>
          <div className="overflow-x-auto rounded-[20px] border border-[rgba(20,20,20,0.08)] bg-white shadow-[0_20px_40px_-15px_rgba(20,20,20,0.06)]">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-[rgba(20,20,20,0.08)]">
                  <th className="text-left font-extrabold text-[#141414] p-5">Recurso</th>
                  {PLANOS_ORDEM.map((id) => (
                    <th key={id} className={`text-center font-black p-5 ${PLANOS[id].destaque ? 'bg-[#C1F11D]/15 text-[#141414]' : 'text-[#141414]'}`}>{PLANOS[id].nome}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {linhas.map((ln, i) => (
                  <tr key={i} className="border-b border-[rgba(20,20,20,0.05)] last:border-0">
                    <td className="text-left font-semibold text-[#8A8A85] p-5">{ln.label}</td>
                    {PLANOS_ORDEM.map((id) => {
                      const v = ln.val(PLANOS[id]);
                      return (
                        <td key={id} className={`text-center p-5 ${PLANOS[id].destaque ? 'bg-[#C1F11D]/10' : ''}`}>
                          {typeof v === 'boolean' ? <Cel on={v} /> : <Cel>{v}</Cel>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="pb-20 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-black tracking-tight text-center mb-10">Dúvidas sobre cobrança</h2>
          <div className="space-y-4">
            {faqs.map((f, i) => (
              <div key={i} className="bg-white rounded-[20px] border border-[rgba(20,20,20,0.05)] overflow-hidden shadow-sm">
                <button onClick={() => setActiveFaq(activeFaq === i ? null : i)} className="w-full text-left p-6 flex justify-between items-center gap-4 cursor-pointer">
                  <span className="font-bold text-base text-[#141414] leading-snug">{f.q}</span>
                  <span className="text-2xl font-light text-[#141414] shrink-0">{activeFaq === i ? '−' : '+'}</span>
                </button>
                <div className={`grid transition-all duration-300 ease-in-out ${activeFaq === i ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                  <div className="overflow-hidden">
                    <p className="px-6 pb-6 text-sm text-[#8A8A85] leading-relaxed">{f.a}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="bg-[#141414] text-white py-20 text-center px-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <h2 className="text-3xl md:text-4xl font-black tracking-tight">Pronto para vender com garantia de sinal?</h2>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={() => navigateTo('assinar')} className="w-full sm:w-auto bg-[#C1F11D] text-[#141414] font-bold px-8 py-4 rounded-full hover:bg-white transition-all duration-300">Assinar Reservacar</button>
            <button onClick={() => navigateTo('empresa')} className="w-full sm:w-auto border border-white/20 text-white hover:bg-white/5 font-bold px-8 py-4 rounded-full transition-all duration-300">Falar com a equipe</button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#141414] text-[#8A8A85] border-t border-white/10 py-8 text-center text-xs">
        <p>© 2026 Reservacar Ltda. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}

// --- NEW COMPONENT: WIZARD FLOW "ASSINATURA CONCESSIONÁRIA" ---
function AssinaturaEmpresaView({ navigateTo, showToast, setTotalReservasPlano, setReservasUsadas, setEmpresaLogada, planoSelecionado }) {
  const [step, setStep] = useState(1);
  const [empresaData, setEmpresaData] = useState<any>({
    nome: '',
    cnpj: '',
    email: '',
    telefone: '',
    plano: PLANOS[planoSelecionado] ? planoSelecionado : 'Plus', // pré-seleção vinda da Pricing
    paymentMethod: 'credit_card',
    couponCode: '',
    discountApplied: false,
    endereco: '',
    enderecoCobranca: '',
    cep: '',
    ramos: [],
    estoque: '',
    vendedores: []
  });

  const [novoVendedorNome, setNovoVendedorNome] = useState('');
  const [novoVendedorCargo, setNovoVendedorCargo] = useState('Consultor de Vendas');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let finalValue = value;
    if (name === 'cnpj') finalValue = formatCNPJ(value);
    else if (name === 'telefone') finalValue = formatPhone(value);
    setEmpresaData(prev => ({ ...prev, [name]: finalValue }));
  };

  const getPlanPrice = () => {
    const basePrice = (PLANOS[empresaData.plano] || PLANOS.Plus).precoMensal;
    return empresaData.discountApplied ? basePrice * 0.85 : basePrice;
  };

  const applyCoupon = () => {
    if (empresaData.couponCode.toUpperCase() === 'DESCONTO') {
      setEmpresaData(prev => ({ ...prev, discountApplied: true }));
      showToast('Cupom "DESCONTO" aplicado com sucesso! 15% de desconto.', 'success');
    } else {
      showToast('Cupom inválido.', 'error');
    }
  };

  const getPlanCredits = () => (PLANOS[empresaData.plano] || PLANOS.Plus).limite;

  const handleToggleRamo = (ramo) => {
    const isSelected = empresaData.ramos.includes(ramo);
    const newRamos = isSelected 
      ? empresaData.ramos.filter(r => r !== ramo)
      : [...empresaData.ramos, ramo];
    setEmpresaData(prev => ({ ...prev, ramos: newRamos }));
  };

  const handleAddVendedor = () => {
    if (!novoVendedorNome.trim()) {
      showToast('Por favor, digite o nome do vendedor.', 'error');
      return;
    }
    const novo = {
      id: Date.now(),
      nome: novoVendedorNome.trim(),
      cargo: novoVendedorCargo,
      ativo: true,
      dataCadastro: new Date().toLocaleDateString('pt-BR'),
      linksGerados: 0,
      conversao: 0
    };
    setEmpresaData(prev => ({ ...prev, vendedores: [...prev.vendedores, novo] }));
    setNovoVendedorNome('');
    setNovoVendedorCargo('Consultor de Vendas');
    showToast('Vendedor adicionado à lista inicial!', 'success');
  };

  const handleRemoveVendedor = (id) => {
    setEmpresaData(prev => ({ ...prev, vendedores: prev.vendedores.filter(v => v.id !== id) }));
    showToast('Vendedor removido.', 'info');
  };

  const vendedoresDefault = [
    { nome: 'Carla Silva', cargo: 'Consultora Premium', ativo: true, dataCadastro: '31/05/2026', linksGerados: 14, conversao: 64 },
    { nome: 'Roberto Oliveira', cargo: 'Gerente de Vendas', ativo: true, dataCadastro: '24/05/2026', linksGerados: 28, conversao: 71 },
    { nome: 'Marcos Souza', cargo: 'Consultor de Vendas', ativo: true, dataCadastro: '28/05/2026', linksGerados: 9, conversao: 56 },
  ];

  const handleFinalize = async () => {
    if (!empresaData.nome || !empresaData.cnpj || !empresaData.email) {
      showToast('Por favor, preencha todos os campos obrigatórios da Concessionária.', 'error');
      return;
    }
    const credits = getPlanCredits();
    const vendsBase = empresaData.vendedores.length > 0 ? empresaData.vendedores : vendedoresDefault;

    // Persistir no Supabase se o usuário estiver autenticado
    if (isSupabaseConfigured) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        try {
          const { data: loja, error: e1 } = await supabase.from('lojas').insert({
            nome: empresaData.nome, cnpj: empresaData.cnpj, email: empresaData.email,
            telefone: empresaData.telefone || null, endereco: empresaData.endereco || null,
            cep: empresaData.cep || null, plano: empresaData.plano, owner_id: user.id,
          }).select().single();
          if (e1) throw e1;

          const { data: vends } = await supabase.from('vendedores')
            .insert(vendsBase.map((v: any) => ({ loja_id: loja.id, nome: v.nome, cargo: v.cargo })))
            .select();

          setTotalReservasPlano(credits);
          setReservasUsadas(0);
          setEmpresaLogada({
            id: loja.id, nome: loja.nome, cnpj: loja.cnpj, email: loja.email, telefone: loja.telefone,
            plano: loja.plano, planoAtivo: loja.plano, valorMinimoSinal: Number(loja.valor_minimo_sinal) || 1500,
            endereco: loja.endereco, enderecoCobranca: loja.endereco, cep: loja.cep,
            ramos: [], estoque: 0, agendaHorarios: loja.agenda_horarios,
            vendedores: (vends || []).map((v: any) => ({ id: v.id, nome: v.nome, cargo: v.cargo, ativo: v.ativo, dataCadastro: new Date(v.created_at).toLocaleDateString('pt-BR'), linksGerados: v.links_gerados, conversao: v.conversao })),
          });
          showToast(`Loja criada e salva! Plano ${empresaData.plano} com ${credits} créditos.`, 'success');
          navigateTo('sales-stats');
          return;
        } catch (err: any) {
          showToast('Erro ao salvar a loja: ' + (err?.message || 'tente novamente'), 'error');
          return;
        }
      }
    }

    // Fallback (demo público sem login)
    setTotalReservasPlano(credits);
    setReservasUsadas(0);
    setEmpresaLogada({
      nome: empresaData.nome, cnpj: empresaData.cnpj, email: empresaData.email, telefone: empresaData.telefone,
      plano: empresaData.plano, planoAtivo: empresaData.plano, valorMinimoSinal: 1500,
      endereco: empresaData.endereco || 'Endereço não informado',
      enderecoCobranca: empresaData.enderecoCobranca || empresaData.endereco || 'Endereço não informado',
      cep: empresaData.cep || '00000-000',
      ramos: empresaData.ramos.length > 0 ? empresaData.ramos : ['Geral'],
      estoque: Number(empresaData.estoque) || 0,
      vendedores: vendsBase.map((v: any, i: number) => ({ id: i + 1, ...v, ativo: v.ativo ?? true, dataCadastro: v.dataCadastro || new Date().toLocaleDateString('pt-BR'), linksGerados: v.linksGerados || 0, conversao: v.conversao || 0 })),
    });
    showToast(`Assinatura realizada com sucesso! Plano ${empresaData.plano} com ${credits} créditos.`, 'success');
    navigateTo('sales-stats');
  };

  const inputClass = "w-full bg-white border-2 border-[rgba(20,20,20,0.1)] rounded-xl px-4 py-3.5 text-sm font-bold text-[#141414] outline-none focus:border-[#141414] transition";
  const labelClass = "block text-xs font-bold uppercase tracking-wider text-[#8A8A85] mb-2";

  return (
    <div className="min-h-screen bg-[#F4F4F2] text-[#141414] pt-28 pb-20 px-4 md:px-8 relative">

      <div className="max-w-4xl mx-auto">
        {/* Progress Tracker bar */}
        <div className="bg-white border border-[rgba(20,20,20,0.08)] rounded-[24px] p-6 shadow-[0_20px_40px_-15px_rgba(20,20,20,0.08)] mb-6">
          <div className="flex justify-between items-center text-xs font-bold mb-4 text-[#8A8A85] uppercase tracking-widest">
            <span className="text-xl font-black text-[#141414] tracking-tight">Assinar Reservacar</span>
            <span>Cadastro Lojista</span>
          </div>
          
          <div className="grid grid-cols-4 gap-3">
            {[
              { num: 1, label: 'Identificação' },
              { num: 2, label: 'Dados Operacionais' },
              { num: 3, label: 'Escolha o Plano' },
              { num: 4, label: 'Pagamento' }
            ].map(s => (
              <div key={s.num} className="flex flex-col gap-2">
                <div className="flex items-center gap-1.5">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white ${step >= s.num ? 'bg-[#141414]' : 'bg-[#E5E5E2]'}`}>
                    {step > s.num ? '✓' : s.num}
                  </span>
                  <span className="font-bold text-[10px] text-[#8A8A85] hidden md:inline">{s.label}</span>
                </div>
                <div className={`h-1 w-full rounded-full ${step >= s.num ? 'bg-[#141414]' : 'bg-[#E5E5E2]'}`}></div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Content Box */}
        <div className="bg-white border border-[rgba(20,20,20,0.08)] rounded-[28px] p-6 md:p-10 min-h-[480px] flex flex-col justify-between shadow-[0_20px_40px_-15px_rgba(20,20,20,0.06)]">
          
          <div>
            {/* STEP 1: IDENTIFICACAO */}
            {step === 1 && (
              <div className="max-w-xl mx-auto w-full py-4 text-left">
                <h2 className="text-2xl font-black text-[#141414] mb-2 text-center tracking-tight">Identificação Corporativa</h2>
                <p className="text-[#8A8A85] text-xs mb-8 text-center font-medium">Informe os dados da sua empresa ou concessionária para cadastro.</p>

                <div className="space-y-4">
                  <div>
                    <label className={labelClass}>Nome da Concessionária *</label>
                    <input type="text" name="nome" value={empresaData.nome} onChange={handleInputChange} className={inputClass} placeholder="Ex: BMW Premium SP" required />
                  </div>
                  <div>
                    <label className={labelClass}>CNPJ da Empresa *</label>
                    <input type="text" name="cnpj" value={empresaData.cnpj} onChange={handleInputChange} className={inputClass} placeholder="Ex: 12.345.678/0001-90" required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>E-mail Corporativo *</label>
                      <input type="email" name="email" value={empresaData.email} onChange={handleInputChange} className={inputClass} placeholder="Ex: contato@loja.com" required />
                    </div>
                    <div>
                      <label className={labelClass}>Telefone Comercial</label>
                      <input type="text" name="telefone" value={empresaData.telefone} onChange={handleInputChange} className={inputClass} placeholder="Ex: (11) 5500-1234" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: DADOS OPERACIONAIS (NOVO) */}
            {step === 2 && (
              <div className="max-w-2xl mx-auto w-full py-4 text-left">
                <h2 className="text-2xl font-black text-[#141414] mb-2 text-center tracking-tight">Dados Operacionais e Showroom</h2>
                <p className="text-[#8A8A85] text-xs mb-8 text-center font-medium">Configure as informações operacionais essenciais da sua loja.</p>

                <div className="space-y-6">
                  {/* Endereço e CEP */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                      <label className={labelClass}>Endereço Comercial</label>
                      <input type="text" name="endereco" value={empresaData.endereco} onChange={handleInputChange} className={inputClass} placeholder="Ex: Av. das Nações Unidas, 12345" />
                    </div>
                    <div>
                      <label className={labelClass}>CEP</label>
                      <input type="text" name="cep" value={empresaData.cep} onChange={handleInputChange} className={inputClass} placeholder="Ex: 04578-000" />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-[#8A8A85]">Endereço de Cobrança</label>
                      <button 
                        type="button" 
                        onClick={() => setEmpresaData(prev => ({ ...prev, enderecoCobranca: prev.endereco }))}
                        className="text-[10px] font-bold text-[#141414] hover:underline"
                      >
                        Copiar Comercial
                      </button>
                    </div>
                    <input type="text" name="enderecoCobranca" value={empresaData.enderecoCobranca} onChange={handleInputChange} className={inputClass} placeholder="Ex: Mesmo que o comercial ou outro endereço" />
                  </div>

                  {/* Ramos e Estoque */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className={labelClass}>Ramos de Atuação</label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {['Luxo', 'Zero Kilômetro', 'Carros Usados'].map((r) => {
                          const isSelected = empresaData.ramos.includes(r);
                          return (
                            <button
                              key={r}
                              type="button"
                              onClick={() => handleToggleRamo(r)}
                              className={`px-3 py-2 rounded-xl text-xs font-bold border transition ${
                                isSelected 
                                  ? 'bg-[#141414] text-[#F4F4F2] border-[#141414] shadow-sm' 
                                  : 'bg-white text-[#6F6F6A] border-[#E5E5E2] hover:border-[#B9B9B4]'
                              }`}
                            >
                              {r}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>Carros no Estoque (Tamanho aproximado)</label>
                      <input type="number" name="estoque" value={empresaData.estoque} onChange={handleInputChange} className={inputClass} placeholder="Ex: 120" />
                    </div>
                  </div>

                  {/* Cadastrar Vendedores Iniciais */}
                  <div className="bg-[#F4F4F2] border border-[#EBEBE8] rounded-2xl p-4 md:p-6 mt-4">
                    <h3 className="text-xs font-bold text-[#5F5F5A] uppercase tracking-wider mb-3">Vendedores do Showroom</h3>
                    
                    <div className="flex flex-col md:flex-row gap-3 mb-4">
                      <div className="flex-1">
                        <input 
                          type="text" 
                          placeholder="Nome do Vendedor" 
                          value={novoVendedorNome} 
                          onChange={(e) => setNovoVendedorNome(e.target.value)} 
                          className="w-full bg-white border border-[#E5E5E2] rounded-xl px-3 py-2.5 text-xs font-bold text-[#2A2A26] outline-none"
                        />
                      </div>
                      <div className="w-full md:w-48">
                        <select 
                          value={novoVendedorCargo} 
                          onChange={(e) => setNovoVendedorCargo(e.target.value)} 
                          className="w-full bg-white border border-[#E5E5E2] rounded-xl px-3 py-2.5 text-xs font-bold text-[#2A2A26] outline-none"
                        >
                          <option value="Consultor de Vendas">Consultor de Vendas</option>
                          <option value="Consultor Premium">Consultor Premium</option>
                          <option value="Gerente de Vendas">Gerente de Vendas</option>
                          <option value="Diretor Comercial">Diretor Comercial</option>
                        </select>
                      </div>
                      <button 
                        type="button" 
                        onClick={handleAddVendedor}
                        className="bg-[#141414] hover:bg-[#2A2A26] text-[#F4F4F2] font-bold text-xs px-4 py-2.5 rounded-xl transition"
                      >
                        + Adicionar
                      </button>
                    </div>

                    {empresaData.vendedores.length > 0 ? (
                      <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                        {empresaData.vendedores.map((v) => (
                          <div key={v.id} className="flex justify-between items-center bg-white border border-[#E5E5E2] px-3 py-2.5 rounded-xl text-xs font-bold">
                            <div>
                              <span className="text-[#2A2A26]">{v.nome}</span>
                              <span className="bg-[#EBEBE8] text-[#8A8A85] text-[9px] px-2 py-0.5 rounded-full ml-2 uppercase">{v.cargo}</span>
                            </div>
                            <button 
                              type="button" 
                              onClick={() => handleRemoveVendedor(v.id)} 
                              className="text-rose-600 hover:text-rose-800 text-[10px]"
                            >
                              Remover
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-[#B9B9B4] font-medium italic">Nenhum vendedor cadastrado ainda. O sistema carregará os 3 vendedores padrão como demonstração caso prossiga em branco.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: ESCOLHA DO PLANO */}
            {step === 3 && (
              <div className="w-full py-4 text-center">
                <h2 className="text-2xl font-black text-[#141414] mb-2 tracking-tight">Escolha o plano de créditos ideal para sua concessionária</h2>
                <p className="text-[#8A8A85] text-xs mb-8 font-medium">Selecione a quantidade de propostas ativas que deseja gerenciar em paralelo.</p>

                <div className="grid md:grid-cols-3 gap-5 max-w-3xl mx-auto">
                  {PLANOS_ORDEM.map((id) => {
                    const p = PLANOS[id];
                    const selected = empresaData.plano === id;
                    return (
                      <div
                        key={id}
                        onClick={() => setEmpresaData(prev => ({ ...prev, plano: id }))}
                        className={`relative rounded-[20px] p-5 text-left cursor-pointer transition-all flex flex-col justify-between h-56 border-2 ${
                          selected
                            ? 'border-[#141414] bg-[#C1F11D]/10 ring-2 ring-[#C1F11D] shadow-[0_16px_32px_-12px_rgba(20,20,20,0.12)]'
                            : 'border-[rgba(20,20,20,0.12)] bg-white opacity-70 hover:opacity-100 hover:border-[rgba(20,20,20,0.3)]'
                        }`}
                      >
                        {p.destaque && (
                          <span className="absolute -top-2.5 right-4 bg-[#C1F11D] text-[#141414] text-[8px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">Mais Popular</span>
                        )}
                        <div>
                          <span className="text-[9px] font-bold text-[#8A8A85] uppercase tracking-widest">{p.tag}</span>
                          <h4 className="text-xl font-black text-[#141414] mt-1">{p.nome}</h4>
                          <p className="text-2xl font-black text-[#141414] mt-3">{formatBRL(p.precoMensal)}<span className="text-xs font-bold text-[#B9B9B4]">/mês</span></p>
                          <p className="text-[10px] text-[#8A8A85] font-bold">{p.limite} links de reserva ativos</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {selected && <CheckCircle2 size={14} className="text-[#141414] shrink-0" />}
                          <span className="text-[10px] font-bold text-[#B9B9B4]">{p.nota}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STEP 4: CHECKOUT PAGAMENTO */}
            {step === 4 && (
              <div className="max-w-2xl mx-auto w-full py-4">
                <h2 className="text-2xl font-black text-[#141414] text-center mb-6 tracking-tight">Forma de Pagamento da Assinatura</h2>
                
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="md:col-span-2 space-y-4 text-left">
                    <div 
                      onClick={() => setEmpresaData(prev => ({ ...prev, paymentMethod: 'credit_card' }))}
                      className={`bg-[#F4F4F2] border rounded-2xl p-4 flex items-center justify-between cursor-pointer transition-all ${empresaData.paymentMethod === 'credit_card' ? 'border-[#141414] bg-white' : 'border-[#E5E5E2]'}`}
                    >
                      <div className="flex items-center gap-3">
                        <input type="radio" checked={empresaData.paymentMethod === 'credit_card'} onChange={() => {}} className="accent-[#141414] w-4 h-4" />
                        <div>
                          <h4 className="font-extrabold text-xs text-[#141414]">Cartão de Crédito</h4>
                          <p className="text-[10px] text-[#8A8A85]">Liberação instantânea dos créditos</p>
                        </div>
                      </div>
                      <CreditCard className="text-[#8A8A85]" size={20} />
                    </div>

                    <div 
                      onClick={() => setEmpresaData(prev => ({ ...prev, paymentMethod: 'pix' }))}
                      className={`bg-[#F4F4F2] border rounded-2xl p-4 flex items-center justify-between cursor-pointer transition-all ${empresaData.paymentMethod === 'pix' ? 'border-[#141414] bg-white' : 'border-[#E5E5E2]'}`}
                    >
                      <div className="flex items-center gap-3">
                        <input type="radio" checked={empresaData.paymentMethod === 'pix'} onChange={() => {}} className="accent-[#141414] w-4 h-4" />
                        <div className="flex items-center gap-1.5">
                          <div>
                            <h4 className="font-extrabold text-xs text-[#141414]">Pix</h4>
                            <p className="text-[10px] text-[#8A8A85]">Aprovação em segundos</p>
                          </div>
                          <span className="bg-[#141414] text-white text-[7px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest shrink-0 self-start">5% OFF</span>
                        </div>
                      </div>
                      <DollarSign className="text-[#8A8A85]" size={20} />
                    </div>

                    <div className="bg-[#F4F4F2] border border-[#E5E5E2] p-4 rounded-2xl">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8A8A85] mb-1.5">Possui cupom de desconto?</label>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          name="couponCode"
                          value={empresaData.couponCode}
                          onChange={handleInputChange}
                          placeholder="DIGITE O CUPOM"
                          className="w-full bg-white border border-[#E5E5E2] rounded-xl px-3 py-2 text-xs font-bold text-[#2A2A26] outline-none uppercase"
                        />
                        <button 
                          type="button" 
                          onClick={applyCoupon}
                          className="bg-white hover:bg-[#F4F4F2] text-[#2A2A26] font-bold text-xs px-4 py-2 rounded-xl border border-[#E5E5E2] transition"
                        >
                          Aplicar
                        </button>
                      </div>
                      {empresaData.discountApplied && (
                        <p className="text-[10px] text-[#141414] font-bold mt-1.5">✓ Cupom aplicado com sucesso!</p>
                      )}
                    </div>
                  </div>

                  <div className="bg-[#F4F4F2] border border-[#E5E5E2] p-5 rounded-2xl text-left h-max">
                    <h4 className="text-[9px] font-bold text-[#8A8A85] uppercase tracking-widest mb-3">Resumo da Assinatura</h4>
                    <div className="text-xs space-y-2 border-b border-[#E5E5E2] pb-3 mb-3">
                      <div className="flex justify-between text-[#8A8A85]">
                        <span>Plano:</span>
                        <span className="text-[#141414] font-bold">{empresaData.plano}</span>
                      </div>
                      <div className="flex justify-between text-[#8A8A85]">
                        <span>Créditos:</span>
                        <span className="text-[#141414] font-bold">{getPlanCredits()} links</span>
                      </div>
                      <div className="flex justify-between text-[#8A8A85]">
                        <span>Preço:</span>
                        <span className="text-[#141414] font-bold">{formatCurrency(getPlanPrice())}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-[#5F5F5A]">Total a pagar:</span>
                      <span className="text-lg font-black text-[#141414]">{formatCurrency(getPlanPrice())}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Navigation */}
          <div className="flex justify-between items-center border-t border-[#E5E5E2] pt-6 mt-8">
            <button
              type="button"
              onClick={() => {
                if (step === 1) {
                  navigateTo('home');
                } else {
                  setStep(prev => prev - 1);
                }
              }}
              className="flex items-center gap-1 text-[#8A8A85] hover:text-[#141414] font-bold text-xs transition uppercase tracking-wider"
            >
              <ChevronLeft size={14} /> Voltar
            </button>
            
            {step < 4 ? (
              <button
                type="button"
                onClick={() => {
                  if (step === 1 && (!empresaData.nome || !empresaData.cnpj || !empresaData.email)) {
                    showToast('Por favor, preencha todos os campos obrigatórios.', 'error');
                    return;
                  }
                  setStep(prev => prev + 1);
                }}
                className="bg-[#141414] hover:bg-[#C1F11D] hover:text-[#141414] text-[#F4F4F2] font-bold text-xs px-7 py-3.5 rounded-full flex items-center gap-1 transition-all duration-300"
              >
                Continuar <ChevronRight size={14} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinalize}
                className="bg-[#141414] hover:bg-[#C1F11D] hover:text-[#141414] text-[#F4F4F2] font-bold text-xs px-7 py-3.5 rounded-full flex items-center gap-1 transition-all duration-300"
              >
                Finalizar Assinatura <ChevronRight size={14} />
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

// --- CONFIGURACOES VIEW ---
function ConfiguracoesView({ navigateTo, showToast, empresaLogada, setEmpresaLogada, totalReservasPlano, setTotalReservasPlano, setPlanoUpgrade, embedded = false, section = 'all', temaBlack = false, setTemaBlack = (_v: boolean) => {} }) {
  const [formData, setFormData] = useState({
    nome: empresaLogada.nome || '',
    telefone: empresaLogada.telefone || '',
    valorMinimoSinal: empresaLogada.valorMinimoSinal || 1500,
    plano: empresaLogada.planoAtivo || 'Plus',
    endereco: empresaLogada.endereco || '',
    cep: empresaLogada.cep || ''
  });

  // Agenda de visitas do showroom (horários que aparecem para o cliente no slot picker)
  const [agendaHorarios, setAgendaHorarios] = useState<string[]>(empresaLogada.agendaHorarios || [...HORARIOS_VISITA]);
  const toggleHorario = (h: string) => {
    setAgendaHorarios(prev => prev.includes(h) ? prev.filter(x => x !== h) : [...prev, h].sort());
  };

  const planosNivel = { 'Basic': 1, 'Plus': 2, 'Premium': 3 };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let finalValue = value;
    if (name === 'telefone') {
      const clean = value.replace(/\D/g, '');
      if (clean.length <= 10) {
        finalValue = clean.replace(/^(\d{2})(\d)/g, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2');
      } else {
        finalValue = clean.substring(0, 11).replace(/^(\d{2})(\d)/g, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
      }
    }
    if (name === 'cep') {
      const clean = value.replace(/\D/g, '');
      if (clean.length <= 5) {
        finalValue = clean;
      } else {
        finalValue = `${clean.substring(0, 5)}-${clean.substring(5, 8)}`;
      }
    }
    setFormData(prev => ({ ...prev, [name]: finalValue }));
  };

  const handleSelectPlano = (planoNome) => {
    setFormData(prev => ({ ...prev, plano: planoNome }));
  };

  const handleUpgradeClick = (planoNome) => {
    setPlanoUpgrade(planoNome);
    navigateTo('checkout-plano');
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!formData.nome.trim()) {
      showToast('Por favor, informe o nome da loja.', 'error');
      return;
    }
    if (!formData.telefone.trim()) {
      showToast('Por favor, informe o telefone de WhatsApp.', 'error');
      return;
    }
    if (!formData.endereco.trim()) {
      showToast('Por favor, informe o endereço comercial.', 'error');
      return;
    }
    if (!formData.cep.trim()) {
      showToast('Por favor, informe o CEP.', 'error');
      return;
    }

    if (agendaHorarios.length === 0) {
      showToast('Mantenha ao menos um horário de visita ativo na agenda.', 'error');
      return;
    }

    setEmpresaLogada(prev => ({
      ...prev,
      nome: formData.nome,
      telefone: formData.telefone,
      valorMinimoSinal: Number(formData.valorMinimoSinal),
      endereco: formData.endereco,
      cep: formData.cep,
      agendaHorarios: [...agendaHorarios].sort()
    }));

    showToast('Configurações salvas com sucesso!', 'success');
  };

  const planos = [
    {
      nome: 'Basic',
      preco: 'R$ 159,90',
      limite: '10 links de reserva ativos',
      detalhe: 'Recomendado para pequenas lojas',
      tag: 'PLANO BÁSICO'
    },
    {
      nome: 'Plus',
      preco: 'R$ 239,90',
      limite: '30 links de reserva ativos',
      detalhe: 'Melhor custo benefício',
      tag: 'PLANO RECOMENDADO',
      destaque: true
    },
    {
      nome: 'Premium',
      preco: 'R$ 349,90',
      limite: '50 links de reserva ativos',
      detalhe: 'Exposição máxima do showroom',
      tag: 'PLANO CORPORATIVO'
    }
  ];

  return (
    <div className={embedded ? '' : 'min-h-screen bg-[#F4F4F2] pt-24 pb-12 px-4 md:px-12'}>
      <div className={embedded ? '' : 'max-w-[1600px] mx-auto'}>
        {!embedded && (
          <div className="mb-8 text-left">
            <h2 className="text-3xl font-extrabold text-[#141414] tracking-tight">Configurações do Lojista</h2>
            <p className="text-[#8A8A85] text-sm mt-1 font-medium">Ajuste os parâmetros da sua loja e gerencie seu plano SaaS Autolock.</p>
          </div>
        )}

        <form onSubmit={handleSave} className={`grid grid-cols-1 gap-8 ${section === 'all' ? 'lg:grid-cols-2' : ''}`}>

          {section !== 'plano' && (
          <div className="bg-white border border-[#E5E5E2] rounded-2xl p-6 text-left flex flex-col justify-between">
            <div>
              <div className="mb-6">
                <span className="text-[11px] font-black uppercase text-[#8A8A85] tracking-wider">
                  Dados da Loja / Perfil
                </span>
                <div className="h-px bg-[#EBEBE8] mt-2"></div>
              </div>

              <div className="space-y-5">
                <div>
                  <label htmlFor="nome" className="block text-[10px] font-black text-[#8A8A85] uppercase tracking-wider mb-2">
                    Nome da Loja Exibida na Vitrine
                  </label>
                  <input
                    type="text"
                    id="nome"
                    name="nome"
                    value={formData.nome}
                    onChange={handleInputChange}
                    placeholder="Ex: Veloce Premium Motors"
                    className="w-full bg-[#F4F4F2] border border-[#E5E5E2] focus:border-[#2A2A26] focus:bg-white rounded-xl px-4 py-3 text-sm font-semibold text-[#141414] outline-none transition"
                  />
                </div>

                <div>
                  <label htmlFor="telefone" className="block text-[10px] font-black text-[#8A8A85] uppercase tracking-wider mb-2">
                    Número Oficial de WhatsApp do Lojista
                  </label>
                  <input
                    type="text"
                    id="telefone"
                    name="telefone"
                    value={formData.telefone}
                    onChange={handleInputChange}
                    placeholder="Ex: (11) 99999-8822"
                    className="w-full bg-[#F4F4F2] border border-[#E5E5E2] focus:border-[#2A2A26] focus:bg-white rounded-xl px-4 py-3 text-sm font-semibold text-[#141414] outline-none transition"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label htmlFor="endereco" className="block text-[10px] font-black text-[#8A8A85] uppercase tracking-wider mb-2">
                      Endereço Comercial da Loja
                    </label>
                    <input
                      type="text"
                      id="endereco"
                      name="endereco"
                      value={formData.endereco}
                      onChange={handleInputChange}
                      placeholder="Ex: Av. das Nações Unidas, 12345"
                      className="w-full bg-[#F4F4F2] border border-[#E5E5E2] focus:border-[#2A2A26] focus:bg-white rounded-xl px-4 py-3 text-sm font-semibold text-[#141414] outline-none transition"
                    />
                  </div>
                  <div>
                    <label htmlFor="cep" className="block text-[10px] font-black text-[#8A8A85] uppercase tracking-wider mb-2">
                      CEP
                    </label>
                    <input
                      type="text"
                      id="cep"
                      name="cep"
                      value={formData.cep}
                      onChange={handleInputChange}
                      placeholder="Ex: 04578-000"
                      className="w-full bg-[#F4F4F2] border border-[#E5E5E2] focus:border-[#2A2A26] focus:bg-white rounded-xl px-4 py-3 text-sm font-semibold text-[#141414] outline-none transition"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="valorMinimoSinal" className="block text-[10px] font-black text-[#8A8A85] uppercase tracking-wider mb-2">
                    Valor Mínimo para Sinal Pix de Reserva (R$)
                  </label>
                  <input
                    type="number"
                    id="valorMinimoSinal"
                    name="valorMinimoSinal"
                    value={formData.valorMinimoSinal}
                    onChange={handleInputChange}
                    placeholder="Ex: 1500"
                    className="w-full bg-[#F4F4F2] border border-[#E5E5E2] focus:border-[#2A2A26] focus:bg-white rounded-xl px-4 py-3 text-sm font-semibold text-[#141414] outline-none transition"
                  />
                </div>

                {/* Agenda de visitas do showroom */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-[10px] font-black text-[#8A8A85] uppercase tracking-wider">
                      Agenda de Visitas do Showroom
                    </label>
                    <span className="text-[10px] font-bold text-[#8A8A85]">{agendaHorarios.length} de {HORARIOS_VISITA.length} ativos</span>
                  </div>
                  <p className="text-[11px] text-[#8A8A85] font-medium mb-3 leading-relaxed">
                    Estes são os horários que o cliente vê ao agendar a visita pelo link da proposta. Desative os que sua equipe não atende.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {HORARIOS_VISITA.map((h) => {
                      const ativo = agendaHorarios.includes(h);
                      return (
                        <button
                          key={h}
                          type="button"
                          onClick={() => toggleHorario(h)}
                          className={`px-4 py-2.5 rounded-full text-xs font-extrabold transition-all cursor-pointer border-[1.5px] ${
                            ativo
                              ? 'bg-[#141414] text-[#C1F11D] border-[#141414]'
                              : 'bg-white text-[#B9B9B4] border-[#E5E5E2] hover:border-[#B9B9B4] line-through'
                          }`}
                        >
                          {h}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Aparência: Tema Black (glassmorphism) — troca o sistema inteiro,
                    inclusive o link/preview do cliente. Camada CSS à parte (.theme-black). */}
                <div>
                  <label className="block text-[10px] font-black text-[#8A8A85] uppercase tracking-wider mb-2">
                    Aparência
                  </label>
                  <div className="flex items-center justify-between gap-4 bg-[#F4F4F2] border border-[#E5E5E2] rounded-2xl px-4 py-3.5">
                    <div className="min-w-0">
                      <span className="block text-sm font-bold text-[#141414]">Tema Black</span>
                      <span className="block text-[11px] text-[#8A8A85] font-medium mt-0.5 leading-relaxed">
                        Visual escuro com efeito de vidro em todo o sistema — painel, criação de link e a página que o cliente vê.
                      </span>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={temaBlack}
                      aria-label="Alternar Tema Black"
                      onClick={() => { const novo = !temaBlack; setTemaBlack(novo); showToast(novo ? 'Tema Black ativado em todo o sistema.' : 'Tema claro restaurado.', 'success'); }}
                      className={`relative shrink-0 w-12 h-7 rounded-full transition-colors duration-300 cursor-pointer ${temaBlack ? 'bg-[#C1F11D]' : 'bg-[#D9D9D5]'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow-sm transition-transform duration-300 ${temaBlack ? 'translate-x-5' : ''}`}></span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-[#EBEBE8]">
              <button
                type="submit"
                className="w-full bg-[#141414] hover:bg-[#2A2A26] text-[#F4F4F2] font-bold px-6 py-3.5 rounded-xl transition text-sm flex items-center justify-center gap-2"
              >
                Salvar Configurações
              </button>
            </div>
          </div>
          )}

          {section !== 'geral' && (
          <div className="bg-white border border-[#E5E5E2] rounded-2xl p-6 text-left flex flex-col justify-between">
            <div>
              <div className="mb-6">
                <span className="text-[11px] font-black uppercase text-[#8A8A85] tracking-wider">
                  Seu Plano SaaS Autolock
                </span>
                <div className="h-px bg-[#EBEBE8] mt-2"></div>
              </div>

              <div className="space-y-4">
                {planos.map((plano) => {
                  const isPlanoAtivo = plano.nome === empresaLogada.planoAtivo;
                  const isSelected = formData.plano === plano.nome;
                  
                  const level = planosNivel[plano.nome];
                  const activeLevel = planosNivel[empresaLogada.planoAtivo];
                  
                  const isDowngrade = level < activeLevel;
                  const isUpgrade = level > activeLevel;

                  return (
                    <div
                      key={plano.nome}
                      onClick={() => {
                        if (isDowngrade) return;
                        handleSelectPlano(plano.nome);
                      }}
                      className={`border rounded-2xl p-4 transition-all flex flex-col justify-between ${
                        isDowngrade
                          ? 'opacity-40 cursor-not-allowed pointer-events-none bg-[#F4F4F2] border-[#E5E5E2]'
                          : isSelected
                            ? 'border-[#141414] bg-[#C1F11D]/10 cursor-pointer'
                            : 'border-[#E5E5E2] hover:border-[#B9B9B4] bg-white cursor-pointer opacity-40 hover:opacity-75'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-black text-[#B9B9B4] uppercase tracking-wider bg-[#EBEBE8] px-2 py-0.5 rounded">
                              {plano.tag}
                            </span>
                            {plano.destaque && (
                              <span className="text-[9px] font-black text-[#141414] uppercase tracking-wider bg-[#C1F11D] px-2 py-0.5 rounded">
                                Destaque
                              </span>
                            )}
                          </div>
                          <h4 className="text-sm font-black text-[#141414]">{plano.nome}</h4>
                          <p className="text-xs text-[#6F6F6A] font-semibold">{plano.limite}</p>
                          <p className="text-[11px] text-[#B9B9B4] font-semibold">{plano.detalhe}</p>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <span className="block text-base font-black text-[#141414]">{plano.preco}</span>
                            <span className="block text-[9px] text-[#B9B9B4] font-bold uppercase">/mês</span>
                          </div>

                          <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition ${
                            isSelected 
                              ? 'border-[#141414] bg-[#141414] text-white' 
                              : isDowngrade
                                ? 'border-[#E5E5E2] bg-[#EBEBE8] text-[#B9B9B4]'
                                : 'border-[#D9D9D5] bg-white'
                          }`}>
                            {isSelected && <Check size={12} strokeWidth={3} />}
                          </div>
                        </div>
                      </div>

                      {/* Linha heurística para Upgrade com botão */}
                      {isSelected && isUpgrade && (
                        <div className="mt-4 pt-4 border-t border-[#EBEBE8] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 animate-fadeIn w-full">
                          <p className="text-[10px] text-[#6F6F6A] font-semibold leading-relaxed">
                            💡 Você selecionou um plano maior. Clique em upgrade para realizar o pagamento.
                          </p>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpgradeClick(plano.nome);
                            }}
                            className="bg-[#141414] hover:bg-[#2A2A26] text-[#F4F4F2] font-bold text-[10px] px-4 py-2 rounded-xl transition uppercase tracking-wider shrink-0"
                          >
                            Fazer Upgrade
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-[#EBEBE8]">
              <p className="text-[10px] text-[#B9B9B4] font-semibold leading-relaxed">
                *Nota: No plano Premium/Enterprise, a plataforma retém 1,5% sobre o sinal PIX processado para fins de cobertura de infraestrutura de webhook e processamento de segurança.
              </p>
            </div>
          </div>
          )}

        </form>
      </div>
    </div>
  );
}

// --- CHECKOUT PLANO VIEW ---
function CheckoutPlanoView({ navigateTo, showToast, empresaLogada, setEmpresaLogada, planoUpgrade, setTotalReservasPlano }) {
  useEffect(() => {
    if (!planoUpgrade || planoUpgrade === empresaLogada.planoAtivo) {
      showToast('Selecione um plano diferente para realizar o upgrade.', 'error');
      navigateTo('configuracoes');
    }
  }, [planoUpgrade, empresaLogada.planoAtivo]);

  const [paymentMethod, setPaymentMethod] = useState('credit_card'); // 'credit_card' ou 'pix'
  const [cardData, setCardData] = useState({
    numero: '',
    nome: '',
    validade: '',
    cvv: ''
  });
  const [pixGenerated, setPixGenerated] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Mapeamento dos valores e limites dos planos (derivado da fonte única PLANOS)
  const toInfo = (p) => ({ preco: formatBRL(p.precoMensal), valor: p.precoMensal, limite: p.limite, descricao: `${p.tag} - ${p.limite} links ativos` });
  const planoInfo = toInfo(PLANOS[planoUpgrade] || PLANOS.Plus);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let finalValue = value;
    
    if (name === 'numero') {
      const clean = value.replace(/\D/g, '');
      finalValue = clean.substring(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ');
    } else if (name === 'validade') {
      const clean = value.replace(/\D/g, '');
      if (clean.length <= 2) {
        finalValue = clean;
      } else {
        finalValue = clean.substring(0, 4).replace(/^(\d{2})(\d)/, '$1/$2');
      }
    } else if (name === 'cvv') {
      finalValue = value.replace(/\D/g, '').substring(0, 4);
    }
    
    setCardData(prev => ({ ...prev, [name]: finalValue }));
  };

  const handleConfirmarPagamento = (e) => {
    e.preventDefault();
    
    if (paymentMethod === 'credit_card') {
      if (!cardData.numero || cardData.numero.replace(/\s/g, '').length < 16) {
        showToast('Por favor, insira um número de cartão válido.', 'error');
        return;
      }
      if (!cardData.nome.trim()) {
        showToast('Por favor, insira o nome do titular do cartão.', 'error');
        return;
      }
      if (!cardData.validade || cardData.validade.length < 5) {
        showToast('Por favor, insira uma data de validade válida (MM/AA).', 'error');
        return;
      }
      if (!cardData.cvv || cardData.cvv.length < 3) {
        showToast('Por favor, insira um CVV válido.', 'error');
        return;
      }
    } else {
      if (!pixGenerated) {
        showToast('Por favor, gere o QR Code do PIX primeiro.', 'error');
        return;
      }
    }

    setIsProcessing(true);

    // Simular processamento do pagamento
    setTimeout(() => {
      setIsProcessing(false);
      
      // Atualiza plano ativo e nome do plano
      setEmpresaLogada(prev => ({
        ...prev,
        plano: planoUpgrade,
        planoAtivo: planoUpgrade
      }));

      // Atualiza limite de reservas do plano
      setTotalReservasPlano(planoInfo.limite);

      showToast(`Upgrade para o plano ${planoUpgrade} concluído com sucesso!`, 'success');
      navigateTo('configuracoes');
    }, 1500);
  };

  const handleCopyPix = () => {
    navigator.clipboard.writeText('00020101021226830014br.gov.bcb.pix2561api.reservacar.com.br/pix/v2/cob46a782b5e2');
    showToast('Código PIX copiado para a área de transferência!', 'success');
  };

  return (
    <div className="min-h-screen bg-[#F4F4F2] pt-24 pb-12 px-4 sm:px-6 lg:px-8 text-[#141414]">
      <div className="max-w-5xl mx-auto">
        
        {/* Header */}
        <div className="mb-8 text-left">
          <button 
            type="button"
            onClick={() => navigateTo('configuracoes')}
            className="flex items-center gap-1.5 text-xs font-bold text-[#8A8A85] hover:text-[#2A2A26] transition mb-3 uppercase tracking-wider"
          >
            <ArrowLeft size={14} /> Voltar para Configurações
          </button>
          <h2 className="text-3xl font-extrabold text-[#141414] tracking-tight">Checkout de Assinatura SaaS</h2>
          <p className="text-[#8A8A85] text-sm mt-1 font-medium">Finalize seu pagamento para liberar o limite do plano {planoUpgrade}.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-left">
          
          {/* Coluna Esquerda: Formulário de Pagamento */}
          <div className="lg:col-span-7 bg-white border border-[rgba(20,20,20,0.08)] rounded-[24px] p-6 flex flex-col justify-between shadow-[0_20px_40px_-15px_rgba(20,20,20,0.06)]">
            <div>
              <div className="mb-6">
                <span className="text-[11px] font-black uppercase text-[#8A8A85] tracking-wider">
                  Método de Pagamento
                </span>
                <div className="h-px bg-[#EBEBE8] mt-2"></div>
              </div>

              {/* Seletor de Abas Flat */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('credit_card')}
                  className={`py-3 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 border-2 ${
                    paymentMethod === 'credit_card'
                      ? 'border-[#141414] bg-[#C1F11D]/10 text-[#141414] font-extrabold'
                      : 'border-[#E5E5E2] hover:border-[#D9D9D5] text-[#6F6F6A] bg-white'
                  }`}
                >
                  <CreditCard size={16} /> Cartão de Crédito
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('pix')}
                  className={`py-3 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 border-2 ${
                    paymentMethod === 'pix'
                      ? 'border-[#141414] bg-[#C1F11D]/10 text-[#141414] font-extrabold'
                      : 'border-[#E5E5E2] hover:border-[#D9D9D5] text-[#6F6F6A] bg-white'
                  }`}
                >
                  <CircleDollarSign size={16} /> Pix Instantâneo
                </button>
              </div>

              {/* Conteúdo do Cartão de Crédito */}
              {paymentMethod === 'credit_card' && (
                <form onSubmit={handleConfirmarPagamento} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-[#8A8A85] uppercase tracking-wider mb-2">
                      Número do Cartão
                    </label>
                    <input
                      type="text"
                      name="numero"
                      value={cardData.numero}
                      onChange={handleInputChange}
                      placeholder="0000 0000 0000 0000"
                      className="w-full bg-[#F4F4F2] border border-[#E5E5E2] focus:border-[#141414] focus:bg-white rounded-xl px-4 py-3 text-sm font-semibold text-[#141414] outline-none transition"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-[#8A8A85] uppercase tracking-wider mb-2">
                      Nome Impresso no Cartão
                    </label>
                    <input
                      type="text"
                      name="nome"
                      value={cardData.nome}
                      onChange={handleInputChange}
                      placeholder="MARIA SILVA SOUZA"
                      className="w-full bg-[#F4F4F2] border border-[#E5E5E2] focus:border-[#141414] focus:bg-white rounded-xl px-4 py-3 text-sm font-semibold text-[#141414] outline-none transition uppercase"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-[#8A8A85] uppercase tracking-wider mb-2">
                        Validade (MM/AA)
                      </label>
                      <input
                        type="text"
                        name="validade"
                        value={cardData.validade}
                        onChange={handleInputChange}
                        placeholder="MM/AA"
                        className="w-full bg-[#F4F4F2] border border-[#E5E5E2] focus:border-[#141414] focus:bg-white rounded-xl px-4 py-3 text-sm font-semibold text-[#141414] outline-none transition"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-[#8A8A85] uppercase tracking-wider mb-2">
                        CVC / CVV
                      </label>
                      <input
                        type="text"
                        name="cvv"
                        value={cardData.cvv}
                        onChange={handleInputChange}
                        placeholder="123"
                        className="w-full bg-[#F4F4F2] border border-[#E5E5E2] focus:border-[#141414] focus:bg-white rounded-xl px-4 py-3 text-sm font-semibold text-[#141414] outline-none transition"
                        required
                      />
                    </div>
                  </div>
                </form>
              )}

              {/* Conteúdo do Pix */}
              {paymentMethod === 'pix' && (
                <div className="space-y-5 text-center py-2">
                  {!pixGenerated ? (
                    <div className="space-y-4 text-left">
                      <div className="bg-[#F4F4F2] border border-[#E5E5E2] rounded-2xl p-5">
                        <h4 className="text-sm font-bold text-[#141414] mb-2">Pague instantaneamente via PIX</h4>
                        <p className="text-xs text-[#8A8A85] leading-relaxed">
                          Ao clicar no botão abaixo, geraremos um QR Code dinâmico do Pix e um código Pix Copia e Cola no valor de <strong className="text-[#2A2A26]">{planoInfo.preco}</strong> correspondente ao primeiro mês.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPixGenerated(true)}
                        className="w-full bg-[#141414] hover:bg-[#2A2A26] text-white font-bold px-6 py-3.5 rounded-xl transition text-sm flex items-center justify-center gap-2"
                      >
                        Gerar QR Code e Copia e Cola
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-[#E5E5E2] rounded-2xl bg-[#F4F4F2]">
                        {/* Placeholder QR Code Flat com design legal */}
                        <div className="w-40 h-40 bg-white border border-[#D9D9D5] p-2 rounded-lg flex flex-col justify-between items-center relative mb-4">
                          {/* Desenho Flat de QR Code */}
                          <div className="w-full h-full grid grid-cols-5 grid-rows-5 gap-1.5 p-1 bg-[#F4F4F2]">
                            <div className="bg-[#141414] rounded-sm"></div>
                            <div className="bg-[#141414] rounded-sm"></div>
                            <div className="bg-[#EBEBE8]"></div>
                            <div className="bg-[#141414] rounded-sm"></div>
                            <div className="bg-[#141414] rounded-sm"></div>
                            
                            <div className="bg-[#141414] rounded-sm"></div>
                            <div className="bg-[#EBEBE8]"></div>
                            <div className="bg-[#141414] rounded-sm"></div>
                            <div className="bg-[#EBEBE8]"></div>
                            <div className="bg-[#141414] rounded-sm"></div>
                            
                            <div className="bg-[#EBEBE8]"></div>
                            <div className="bg-[#141414] rounded-sm"></div>
                            <div className="bg-[#EBEBE8]"></div>
                            <div className="bg-[#141414] rounded-sm"></div>
                            <div className="bg-[#EBEBE8]"></div>
                            
                            <div className="bg-[#141414] rounded-sm"></div>
                            <div className="bg-[#EBEBE8]"></div>
                            <div className="bg-[#141414] rounded-sm"></div>
                            <div className="bg-[#EBEBE8]"></div>
                            <div className="bg-[#141414] rounded-sm"></div>
                            
                            <div className="bg-[#141414] rounded-sm"></div>
                            <div className="bg-[#141414] rounded-sm"></div>
                            <div className="bg-[#EBEBE8]"></div>
                            <div className="bg-[#141414] rounded-sm"></div>
                            <div className="bg-[#141414] rounded-sm"></div>
                          </div>
                           <span className="absolute text-[8px] font-black uppercase text-[#141414] bg-[#C1F11D] px-2 py-0.5 border border-[#141414] rounded">PIX RESERVACAR</span>
                        </div>
                        <p className="text-[11px] text-[#8A8A85] font-bold mb-2">Escaneie o QR Code acima usando o aplicativo do seu banco.</p>
                      </div>

                      <div className="space-y-2 text-left">
                        <label className="block text-[10px] font-black text-[#8A8A85] uppercase tracking-wider">
                          Pix Copia e Cola
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            readOnly
                            value="00020101021226830014br.gov.bcb.pix2561api.reservacar.com.br/pix/v2/cob46a782b5e2"
                            className="flex-1 bg-[#F4F4F2] border border-[#E5E5E2] rounded-xl px-4 py-3 text-xs font-semibold text-[#8A8A85] outline-none"
                          />
                          <button
                            type="button"
                            onClick={handleCopyPix}
                            className="bg-[#141414] hover:bg-[#2A2A26] text-white font-bold px-4 py-3 rounded-xl transition text-xs flex items-center gap-1.5 shrink-0"
                          >
                            <Copy size={14} /> Copiar
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Ações de Botões */}
            <div className="mt-8 pt-6 border-t border-[#EBEBE8] space-y-3">
              <button
                type="button"
                onClick={handleConfirmarPagamento}
                disabled={isProcessing}
                className="w-full bg-[#141414] hover:bg-[#C1F11D] hover:text-[#141414] text-[#F4F4F2] font-bold px-6 py-4 rounded-full transition-all duration-300 text-sm flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" /> Processando Pagamento...
                  </>
                ) : (
                  <>
                    <Check size={16} strokeWidth={3} /> Finalizar Pagamento e Ativar Plano
                  </>
                )}
              </button>
            </div>

          </div>

          {/* Coluna Direita: Resumo do Pedido */}
          <div className="lg:col-span-5 bg-[#F4F4F2] border border-[rgba(20,20,20,0.08)] rounded-[24px] p-6 flex flex-col justify-between h-fit space-y-6 shadow-[0_20px_40px_-15px_rgba(20,20,20,0.05)]">
            <div>
              <div className="mb-4">
                <span className="text-[11px] font-black uppercase text-[#8A8A85] tracking-wider">
                  Resumo do Pedido
                </span>
                <div className="h-px bg-[#E5E5E2] mt-2"></div>
              </div>

              {/* Card de Detalhe do Plano */}
              <div className="bg-white border border-[#E5E5E2] rounded-2xl p-4 space-y-3 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black text-[#141414] uppercase tracking-wider bg-[#C1F11D]/20 px-2 py-0.5 rounded">
                    PLANO SELECIONADO
                  </span>
                  <span className="text-xs text-[#8A8A85] font-bold">Recorrência Mensal</span>
                </div>
                <div>
                  <h3 className="text-xl font-black text-[#141414]">{planoUpgrade}</h3>
                  <p className="text-xs text-[#8A8A85] font-semibold mt-0.5">{planoInfo.descricao}</p>
                </div>
                <div className="pt-3 border-t border-[#EBEBE8] flex items-center justify-between">
                  <span className="text-xs font-bold text-[#8A8A85]">Valor Mensal</span>
                  <span className="text-lg font-black text-[#141414]">{planoInfo.preco}</span>
                </div>
              </div>

              {/* Detalhes de Limites */}
              <div className="mt-6 space-y-3">
                <div className="flex justify-between items-center text-xs font-semibold text-[#6F6F6A]">
                  <span>Links de Reserva Disponíveis:</span>
                  <span className="font-bold text-[#141414]">{planoInfo.limite} links ativos</span>
                </div>
                <div className="flex justify-between items-center text-xs font-semibold text-[#6F6F6A]">
                  <span>Taxa de Processamento de Sinal:</span>
                  <span className="font-bold text-[#141414]">1,5% retido</span>
                </div>
                <div className="flex justify-between items-center text-xs font-semibold text-[#6F6F6A]">
                  <span>Atendimento Integrado:</span>
                  <span className="font-bold text-[#141414]">Disponível</span>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-[#E5E5E2] space-y-3 text-left">
              <div className="flex justify-between items-center">
                <span className="text-sm font-extrabold text-[#141414]">Total a pagar:</span>
                <span className="text-2xl font-black text-[#141414]">{planoInfo.preco}</span>
              </div>
              <p className="text-[10px] text-[#B9B9B4] font-semibold leading-relaxed">
                *Ao clicar em finalizar pagamento, você concorda com os termos de uso do Reservacar SaaS e autoriza a cobrança recorrente no método de pagamento selecionado.
              </p>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}

// --- NEW COMPONENT: VENDEDORES VIEW (SHOWROOM GERENCIAMENTO) ---
function VendedoresView({ navigateTo, showToast, empresaLogada, setEmpresaLogada, embedded = false }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [vendedorParaGerenciar, setVendedorParaGerenciar] = useState<any>(null);
  const [formData, setFormData] = useState({ nome: '', cargo: 'Consultor de Vendas' });
  const [editFormData, setEditFormData] = useState<any>({ nome: '', cargo: '', ativo: true });

  const vendedores = empresaLogada?.vendedores || [];

  const handleAddVendedor = (e) => {
    e.preventDefault();
    if (!formData.nome.trim()) {
      showToast('Por favor, informe o nome do vendedor.', 'error');
      return;
    }
    const novo = {
      id: Date.now(),
      nome: formData.nome.trim(),
      cargo: formData.cargo,
      ativo: true,
      dataCadastro: new Date().toLocaleDateString('pt-BR'),
      linksGerados: Math.floor(Math.random() * 20) + 1, // Simulado inicial
      conversao: Math.floor(Math.random() * 40) + 40   // Simulado inicial
    };
    setEmpresaLogada(prev => ({
      ...prev,
      vendedores: [...(prev.vendedores || []), novo]
    }));
    setShowAddModal(false);
    setFormData({ nome: '', cargo: 'Consultor de Vendas' });
    showToast(`Vendedor ${novo.nome} adicionado com sucesso!`, 'success');
  };

  const handleOpenEdit = (vendedor) => {
    setVendedorParaGerenciar(vendedor);
    setEditFormData({
      nome: vendedor.nome,
      cargo: vendedor.cargo,
      ativo: vendedor.ativo !== undefined ? vendedor.ativo : true
    });
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!editFormData.nome.trim()) {
      showToast('Por favor, informe o nome do vendedor.', 'error');
      return;
    }
    setEmpresaLogada(prev => ({
      ...prev,
      vendedores: prev.vendedores.map(v => v.id === vendedorParaGerenciar.id ? {
        ...v,
        nome: editFormData.nome.trim(),
        cargo: editFormData.cargo,
        ativo: editFormData.ativo
      } : v)
    }));
    setVendedorParaGerenciar(null);
    showToast('Dados do vendedor atualizados com sucesso.', 'success');
  };

  const handleExcluirVendedor = (id) => {
    setEmpresaLogada(prev => ({
      ...prev,
      vendedores: prev.vendedores.filter(v => v.id !== id)
    }));
    setVendedorParaGerenciar(null);
    showToast('Vendedor removido com sucesso.', 'success');
  };

  const inputClass = "w-full bg-[#F4F4F2] border border-[#E5E5E2] rounded-xl px-4 py-3 text-sm font-semibold text-[#2A2A26] outline-none focus:border-[#141414] transition";
  const labelClass = "block text-xs font-bold uppercase tracking-wider text-[#8A8A85] mb-1.5";

  return (
    <div className={embedded ? '' : 'pt-28 pb-16 px-6 md:px-12 max-w-[1600px] mx-auto'}>

      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10 border-b border-[#E5E5E2] pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-[#141414] tracking-tight">Equipe de Vendedores</h1>
          <p className="text-[#8A8A85] text-sm mt-1 font-medium">Cadastre e gerencie a equipe do showroom autorizada a gerar links Pix.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="text-xs font-bold bg-[#141414] hover:bg-[#2A2A26] text-[#F4F4F2] px-5 py-3 rounded-xl transition flex items-center gap-1.5"
        >
          <UserPlus size={14} /> Adicionar Vendedor
        </button>
      </div>

      {/* Grid de Cards de Vendedores */}
      {vendedores.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
          {vendedores.map((v) => (
            <div 
              key={v.id} 
              className={`bg-white border rounded-[24px] p-6 transition relative flex flex-col justify-between ${
                v.ativo ? 'border-[#E5E5E2] hover:border-[#B9B9B4]' : 'border-[#EBEBE8] opacity-60'
              }`}
            >
              {/* Top Tag & Date Row */}
              <div className="flex justify-between items-center mb-5">
                <span className="text-[9px] font-bold uppercase tracking-wider text-[#8A8A85] bg-[#F4F4F2] px-2.5 py-1 border border-[#E5E5E2] rounded-md">
                  {v.cargo || 'Consultor'}
                </span>
                <span className="text-[10px] font-bold text-[#B9B9B4]">
                  {v.dataCadastro || '31/05/2026'}
                </span>
              </div>

              {/* Vendedor Name */}
              <div className="mb-4">
                <h3 className="text-[16px] font-bold text-[#141414] tracking-tight leading-snug uppercase">
                  {v.nome}
                </h3>
                <span className="text-[10px] font-bold text-[#B9B9B4] flex items-center gap-1 mt-0.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${v.ativo ? 'bg-[#C1F11D]' : 'bg-rose-500'}`}></span>
                  {v.ativo ? 'Ativo no Showroom' : 'Inativo / Bloqueado'}
                </span>
              </div>

              {/* Performance Metric Panel */}
              <div className="grid grid-cols-2 divide-x divide-[#E5E5E2] bg-[#F4F4F2] border border-[#EBEBE8] rounded-2xl p-4 mb-4 text-center">
                <div>
                  <span className="block text-[9px] font-bold text-[#B9B9B4] tracking-wider uppercase mb-1">
                    Links Gerados
                  </span>
                  <span className="block text-base font-bold text-[#141414]">
                    {v.linksGerados !== undefined ? v.linksGerados : 0}
                  </span>
                </div>
                <div>
                  <span className="block text-[9px] font-bold text-[#B9B9B4] tracking-wider uppercase mb-1">
                    Taxa Conversão
                  </span>
                  <span className="block text-base font-bold text-[#141414]">
                    {v.conversao !== undefined ? `${v.conversao}%` : '0%'}
                  </span>
                </div>
              </div>

              {/* Auxiliary buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => showToast(`Desempenho detalhado de ${v.nome} carregado no log.`, 'info')}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border border-[#E5E5E2] hover:bg-[#F4F4F2] text-[#5F5F5A] bg-white"
                >
                  <BarChart2 size={12} /> Desempenho
                </button>
                <button
                  onClick={() => window.open(`https://api.whatsapp.com/send?phone=${empresaLogada.telefone}&text=Olá%20${v.nome},%20sua%20conta%20está%20configurada!`, '_blank')}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border border-[#E5E5E2] hover:bg-[#F4F4F2] text-[#5F5F5A] bg-white"
                >
                  <MessageCircle size={12} /> WhatsApp
                </button>
              </div>

              {/* Main Manage Button */}
              <button
                onClick={() => handleOpenEdit(v)}
                className="w-full bg-[#141414] hover:bg-black text-white font-bold py-3 rounded-xl transition text-xs flex items-center justify-center gap-2 mt-4"
              >
                <Settings size={12} /> Gerenciar Vendedor
              </button>

            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white border border-[#E5E5E2] rounded-3xl p-10 max-w-xl mx-auto">
          <Users size={48} className="mx-auto text-[#D9D9D5] mb-4" />
          <h3 className="text-lg font-bold text-[#2A2A26]">Nenhum vendedor cadastrado</h3>
          <p className="text-[#8A8A85] text-xs mt-1">Sua concessionária precisa cadastrar vendedores para assinar e emitir links de propostas Pix.</p>
        </div>
      )}

      {/* MODAL ADICIONAR VENDEDOR */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E5E2] rounded-3xl max-w-md w-full p-6 md:p-8 text-left animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-xl font-black text-[#141414] tracking-tight mb-1">Adicionar Vendedor</h3>
            <p className="text-[#8A8A85] text-xs mb-6 font-medium">Cadastre um novo atendente para habilitá-lo na criação de reservas.</p>

            <form onSubmit={handleAddVendedor} className="space-y-4">
              <div>
                <label className={labelClass}>Nome Completo *</label>
                <input 
                  type="text" 
                  value={formData.nome} 
                  onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                  className={inputClass} 
                  placeholder="Ex: Carla Silva" 
                  required 
                />
              </div>

              <div>
                <label className={labelClass}>Cargo / Função</label>
                <select
                  value={formData.cargo}
                  onChange={(e) => setFormData(prev => ({ ...prev, cargo: e.target.value }))}
                  className={`${inputClass} appearance-none bg-no-repeat bg-[right_1rem_center] bg-[length:1em]`}
                  style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%25236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")` }}
                >
                  <option value="Consultor de Vendas">Consultor de Vendas</option>
                  <option value="Consultor Premium">Consultor Premium</option>
                  <option value="Gerente de Vendas">Gerente de Vendas</option>
                  <option value="Diretor Comercial">Diretor Comercial</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4 border-t border-[#EBEBE8]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 text-[#8A8A85] hover:bg-[#F4F4F2] hover:text-[#2A2A26] font-bold text-xs rounded-xl border border-[#E5E5E2] transition uppercase tracking-wider text-center"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-[#141414] hover:bg-[#2A2A26] text-[#F4F4F2] font-bold text-xs rounded-xl transition uppercase tracking-wider text-center"
                >
                  Salvar Cadastro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL GERENCIAR VENDEDOR (EDITAR / EXCLUIR) */}
      {vendedorParaGerenciar && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E5E2] rounded-3xl max-w-md w-full p-6 md:p-8 text-left animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start mb-1">
              <h3 className="text-xl font-black text-[#141414] tracking-tight">Gerenciar Vendedor</h3>
              <button 
                onClick={() => handleExcluirVendedor(vendedorParaGerenciar.id)}
                className="text-rose-600 hover:text-rose-800 font-bold text-[10px] uppercase bg-rose-50 px-2.5 py-1.5 rounded-lg border border-rose-100"
              >
                Excluir Cadastro
              </button>
            </div>
            <p className="text-[#8A8A85] text-xs mb-6 font-medium">Modifique as informações ou bloqueie o acesso do atendente.</p>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className={labelClass}>Nome Completo *</label>
                <input 
                  type="text" 
                  value={editFormData.nome} 
                  onChange={(e) => setEditFormData(prev => ({ ...prev, nome: e.target.value }))}
                  className={inputClass} 
                  placeholder="Ex: Carla Silva" 
                  required 
                />
              </div>

              <div>
                <label className={labelClass}>Cargo / Função</label>
                <select
                  value={editFormData.cargo}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, cargo: e.target.value }))}
                  className={`${inputClass} appearance-none bg-no-repeat bg-[right_1rem_center] bg-[length:1em]`}
                  style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%25236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")` }}
                >
                  <option value="Consultor de Vendas">Consultor de Vendas</option>
                  <option value="Consultor Premium">Consultor Premium</option>
                  <option value="Gerente de Vendas">Gerente de Vendas</option>
                  <option value="Diretor Comercial">Diretor Comercial</option>
                </select>
              </div>

              {/* Status Switcher Toggle */}
              <div className="flex items-center justify-between p-3.5 bg-[#F4F4F2] border border-[#E5E5E2] rounded-xl">
                <div>
                  <h4 className="text-xs font-bold text-[#2A2A26]">Vendedor Ativo</h4>
                  <p className="text-[10px] text-[#8A8A85]">Inativo bloqueia a criação de links</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditFormData(prev => ({ ...prev, ativo: !prev.ativo }))}
                  className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 focus:outline-none ${
                    editFormData.ativo ? 'bg-[#141414]' : 'bg-[#D9D9D5]'
                  }`}
                >
                  <div
                    className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-200 ${
                      editFormData.ativo ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="flex gap-3 pt-4 border-t border-[#EBEBE8] mt-6">
                <button
                  type="button"
                  onClick={() => setVendedorParaGerenciar(null)}
                  className="flex-1 py-3 text-[#8A8A85] hover:bg-[#F4F4F2] hover:text-[#2A2A26] font-bold text-xs rounded-xl border border-[#E5E5E2] transition uppercase tracking-wider text-center"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-[#141414] hover:bg-[#2A2A26] text-[#F4F4F2] font-bold text-xs rounded-xl transition uppercase tracking-wider text-center"
                >
                  Salvar Dados
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

// --- NEW COMPONENT: RELATÓRIO DE RESERVAS E LOGS ---
// Dashboard de desempenho de reservas (estilo "Relatórios" por semana), sem
// nada de tráfego pago: as métricas saem das reservas (criadas / PIX recebido /
// sinais) e o LUCRO de cada semana é lançado à mão pelo lojista.
function RelatorioDesempenhoView({ recentReservations = [], empresaLogada, showToast, embedded = false }) {
  const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const hoje = new Date();
  const [ref, setRef] = useState<{ ano: number; mes: number }>({ ano: hoje.getFullYear(), mes: hoje.getMonth() });
  // Lucros lançados por semana. Chave: "ano-mes-semana". Em memória (como o resto do app).
  const [lucros, setLucros] = useState<Record<string, number>>({});
  const [draft, setDraft] = useState<Record<number, string>>({});

  const pad2 = (n: number) => String(n).padStart(2, '0');
  const parseCreated = (s: any): Date | null => {
    const m = String(s || '').match(/(\d{2})\/(\d{2})\/(\d{4})/);
    return m ? new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])) : null;
  };
  const weekOf = (dia: number) => (dia <= 8 ? 0 : dia <= 15 ? 1 : dia <= 22 ? 2 : 3);

  const lastDay = new Date(ref.ano, ref.mes + 1, 0).getDate();
  const rangesBase: [number, number][] = [[1, 8], [9, 15], [16, 22], [23, lastDay]];
  const keyOf = (wi: number) => `${ref.ano}-${ref.mes}-${wi}`;

  // Agrega as reservas do mês selecionado em 4 baldes semanais.
  const semanas = rangesBase.map(([ini, fim], wi) => {
    const item = { ini, fim, reservas: 0, vendas: 0, sinais: 0 };
    recentReservations.forEach((r: any) => {
      const d = parseCreated(r.created);
      if (!d || d.getFullYear() !== ref.ano || d.getMonth() !== ref.mes) return;
      if (weekOf(d.getDate()) !== wi) return;
      item.reservas += 1;
      if (r.status === 'Completed') {
        item.vendas += 1;
        item.sinais += Number(r.sinal || 0);
      }
    });
    return item;
  });

  const totais = semanas.reduce((a, s, wi) => ({
    reservas: a.reservas + s.reservas,
    vendas: a.vendas + s.vendas,
    sinais: a.sinais + s.sinais,
    ganhos: a.ganhos + (lucros[keyOf(wi)] || 0),
  }), { reservas: 0, vendas: 0, sinais: 0, ganhos: 0 });

  // Ao trocar de mês, recarrega o rascunho de lançamento com o que já foi salvo.
  useEffect(() => {
    const d: Record<number, string> = {};
    rangesBase.forEach((_, wi) => { d[wi] = lucros[keyOf(wi)] ? String(lucros[keyOf(wi)]) : ''; });
    setDraft(d);
  }, [ref.ano, ref.mes]);

  const mudarMes = (delta: number) => {
    setRef(prev => {
      const nova = new Date(prev.ano, prev.mes + delta, 1);
      return { ano: nova.getFullYear(), mes: nova.getMonth() };
    });
  };

  const salvarLancamento = () => {
    setLucros(prev => {
      const next = { ...prev };
      rangesBase.forEach((_, wi) => {
        const v = Number(String(draft[wi] ?? '').replace(/[^\d]/g, ''));
        if (v > 0) next[keyOf(wi)] = v; else delete next[keyOf(wi)];
      });
      return next;
    });
    showToast && showToast('Lançamento de ganhos salvo.', 'success');
  };

  const conv = (s: { reservas: number; vendas: number }) => (s.reservas > 0 ? `${Math.round((s.vendas / s.reservas) * 100)}%` : '—');
  const periodo = (s: { ini: number; fim: number }) => `${pad2(s.ini)}/${pad2(ref.mes + 1)} – ${pad2(s.fim)}/${pad2(ref.mes + 1)}`;
  const mesLabel = `${MESES[ref.mes]} ${ref.ano}`;

  const cardCls = 'bg-white border border-[#E5E5E2] rounded-[22px] p-6 text-left';
  const cardLabel = 'text-[11px] font-bold text-[#8A8A85] uppercase tracking-wider';
  const th = 'text-[10px] font-bold text-[#B9B9B4] uppercase tracking-wider py-3 px-3 text-right';
  const td = 'py-4 px-3 text-sm text-[#2A2A26] text-right';

  return (
    <div className="text-left">
      {/* Cabeçalho + navegador de mês */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 border-b border-[#E5E5E2] pb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#141414] tracking-tight">Relatórios</h1>
          <p className="text-[#8A8A85] text-sm mt-1 font-medium">Reservas e ganhos — {empresaLogada?.nome || 'sua loja'}</p>
        </div>
        <div className="flex items-center gap-2 self-start">
          <button onClick={() => mudarMes(-1)} aria-label="Mês anterior" className="w-9 h-9 rounded-full border border-[#E5E5E2] bg-white hover:border-[#141414] text-[#141414] text-lg leading-none transition cursor-pointer">‹</button>
          <span className="min-w-[150px] text-center text-sm font-bold text-[#141414]">{mesLabel}</span>
          <button onClick={() => mudarMes(1)} aria-label="Próximo mês" className="w-9 h-9 rounded-full border border-[#E5E5E2] bg-white hover:border-[#141414] text-[#141414] text-lg leading-none transition cursor-pointer">›</button>
        </div>
      </div>

      {/* Banner de destaque */}
      <div className="relative overflow-hidden rounded-[24px] bg-[#141414] p-7 mb-6">
        <div className="absolute right-6 top-1/2 -translate-y-1/2 w-40 h-1.5 rounded-full bg-[#C1F11D]/30" />
        <span className="text-[11px] font-bold text-[#C1F11D] uppercase tracking-wider">Sinais recebidos via PIX · {mesLabel}</span>
        <div className="text-4xl font-extrabold text-white mt-2">{formatCurrency(totais.sinais)}</div>
        <p className="text-[13px] text-[#B9B9B4] mt-2 font-medium">
          {totais.vendas > 0
            ? `${totais.vendas} ${totais.vendas === 1 ? 'carro vendido' : 'carros vendidos'} de ${totais.reservas} ${totais.reservas === 1 ? 'reserva criada' : 'reservas criadas'} neste mês.`
            : 'Nenhuma venda registrada neste mês ainda.'}
        </p>
      </div>

      {/* Cards de KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className={cardCls}>
          <span className={cardLabel}>Reservas</span>
          <div className="text-3xl font-extrabold text-[#141414] mt-2">{totais.reservas}</div>
        </div>
        <div className={cardCls}>
          <span className={cardLabel}>Carros vendidos</span>
          <div className="text-3xl font-extrabold text-[#141414] mt-2">{totais.vendas}</div>
        </div>
        <div className={cardCls}>
          <span className={cardLabel}>Sinais recebidos</span>
          <div className="text-3xl font-extrabold text-[#141414] mt-2">{formatCurrency(totais.sinais)}</div>
        </div>
        <div className={cardCls}>
          <span className={cardLabel}>Ganhos (lançados)</span>
          <div className="text-3xl font-extrabold text-[#141414] mt-2">{formatCurrency(totais.ganhos)}</div>
        </div>
      </div>

      {/* Tabela por semana */}
      <div className="bg-white border border-[#E5E5E2] rounded-[24px] p-6 mb-8 overflow-x-auto">
        <h3 className="text-base font-bold text-[#141414] mb-4">Por semana — {mesLabel}</h3>
        <table className="w-full min-w-[640px]">
          <thead>
            <tr className="border-b border-[#E5E5E2]">
              <th className="text-[10px] font-bold text-[#B9B9B4] uppercase tracking-wider py-3 px-3 text-left">Período</th>
              <th className={th}>Reservas</th>
              <th className={th}>Vendas</th>
              <th className={th}>Conversão</th>
              <th className={th}>Sinais</th>
              <th className={th}>Ganhos</th>
            </tr>
          </thead>
          <tbody>
            {semanas.map((s, wi) => (
              <tr key={wi} className="border-b border-[#F0F0EE]">
                <td className="py-4 px-3 text-sm font-semibold text-[#2A2A26] text-left">{periodo(s)}</td>
                <td className={td}>{s.reservas}</td>
                <td className={td}>{s.vendas || '—'}</td>
                <td className={td}>{conv(s)}</td>
                <td className={td}>{s.sinais > 0 ? formatCurrency(s.sinais) : '—'}</td>
                <td className={td}>{lucros[keyOf(wi)] ? formatCurrency(lucros[keyOf(wi)]) : '—'}</td>
              </tr>
            ))}
            <tr className="bg-[#F4F4F2]">
              <td className="py-4 px-3 text-sm font-extrabold text-[#141414] text-left rounded-l-xl">Total do mês</td>
              <td className={td + ' font-extrabold text-[#141414]'}>{totais.reservas}</td>
              <td className={td + ' font-extrabold text-[#141414]'}>{totais.vendas || '—'}</td>
              <td className={td + ' font-extrabold text-[#141414]'}>{conv(totais)}</td>
              <td className={td + ' font-extrabold text-[#141414]'}>{totais.sinais > 0 ? formatCurrency(totais.sinais) : '—'}</td>
              <td className={td + ' font-extrabold text-[#141414] rounded-r-xl'}>{totais.ganhos > 0 ? formatCurrency(totais.ganhos) : '—'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Lançamento de ganhos por semana */}
      <div className="bg-white border border-[#E5E5E2] rounded-[24px] p-6 mb-4">
        <h3 className="text-base font-bold text-[#141414]">Lançamento — {empresaLogada?.nome || 'sua loja'}</h3>
        <p className="text-[12px] text-[#8A8A85] mt-1 mb-5 font-medium">As vendas e os sinais vêm sozinhos das reservas com PIX recebido. Aqui você só lança o <strong>lucro/ganho</strong> de cada semana.</p>
        <div className="divide-y divide-[#F0F0EE]">
          {semanas.map((s, wi) => (
            <div key={wi} className="flex items-center justify-between gap-4 py-3">
              <span className="text-sm font-semibold text-[#2A2A26]">{periodo(s)}</span>
              <div className="relative w-40">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#B9B9B4]">R$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={draft[wi] ?? ''}
                  onChange={(e) => setDraft(prev => ({ ...prev, [wi]: e.target.value.replace(/[^\d]/g, '') }))}
                  className="w-full bg-[#F8FAFC] border border-[#E5E5E2] rounded-xl pl-9 pr-3 py-2.5 text-sm font-semibold text-[#141414] outline-none focus:border-[#141414] transition"
                />
              </div>
            </div>
          ))}
        </div>
        <button onClick={salvarLancamento} className="mt-5 bg-[#141414] hover:bg-black text-white text-sm font-bold px-6 py-3 rounded-xl transition cursor-pointer">Salvar lançamento</button>
      </div>
    </div>
  );
}

// Aba "Logs": auditoria de reservas em formato acordeão. Cada proposta é uma
// linha compacta (desktop = colunas; mobile = empilhada); tocar expande inline
// o formulário de gerenciar + histórico em timeline. Sem troca de tela.
function RelatorioReservasView({ navigateTo, showToast, recentReservations, setRecentReservations, embedded = false }) {
  // Linha expandida do acordeão. null = tudo recolhido.
  const [selectedId, setSelectedId] = useState<any>(null);
  // Filtro por status: todos | Active | Completed | Expired
  const [filtro, setFiltro] = useState('todos');

  // Form states for the selected reservation
  const [sinal, setSinal] = useState('');
  const [vendedor, setVendedor] = useState('');
  const [status, setStatus] = useState('Active');

  const selectedRes = recentReservations.find((r: any) => r.id === selectedId) || null;

  useEffect(() => {
    if (selectedRes) {
      setSinal(String(selectedRes.sinal || 0));
      setVendedor(selectedRes.vendedores || '');
      setStatus(selectedRes.status || 'Active');
    }
  }, [selectedRes?.id]);

  const handleSave = () => {
    if (!selectedRes) return;
    
    const novosLogs = [...(selectedRes.logs || [])];
    const originalSignal = Number(selectedRes.sinal || 0);
    const newSignal = Number(sinal);

    if (newSignal !== originalSignal) {
      novosLogs.push({
        time: new Date().toLocaleTimeString('pt-BR') + ' de ' + new Date().toLocaleDateString('pt-BR'),
        text: `Valor do sinal alterado de R$ ${originalSignal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} para R$ ${newSignal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      });
    }

    if (vendedor !== selectedRes.vendedores) {
      novosLogs.push({
        time: new Date().toLocaleTimeString('pt-BR') + ' de ' + new Date().toLocaleDateString('pt-BR'),
        text: `Atendente responsável alterado para: ${vendedor}`
      });
    }

    if (status !== selectedRes.status) {
      const statusMap: any = {
        'Active': 'Aguardando Sinal',
        'Completed': 'Sinal Pago via PIX',
        'Expired': 'Expirada / Cancelada',
        'Pending': 'Pendente'
      };
      novosLogs.push({
        time: new Date().toLocaleTimeString('pt-BR') + ' de ' + new Date().toLocaleDateString('pt-BR'),
        text: `Status alterado para: ${statusMap[status] || status}`
      });
    }

    setRecentReservations((prev: any) => prev.map((res: any) => {
      if (res.id === selectedRes.id) {
        return {
          ...res,
          sinal: newSignal,
          status: status,
          vendedores: vendedor,
          logs: novosLogs
        };
      }
      return res;
    }));

    showToast('Alterações da reserva salvas com sucesso!', 'success');
  };

  const handleDiscard = () => {
    if (!selectedRes) return;
    setSinal(String(selectedRes.sinal || 0));
    setVendedor(selectedRes.vendedores || '');
    setStatus(selectedRes.status || 'Active');
    showToast('Alterações descartadas.', 'info');
  };

  const handleCancel = () => {
    if (!selectedRes) return;
    
    const novosLogs = [...(selectedRes.logs || [])];
    novosLogs.push({
      time: new Date().toLocaleTimeString('pt-BR') + ' de ' + new Date().toLocaleDateString('pt-BR'),
      text: 'Reserva cancelada pelo vendedor.'
    });

    setRecentReservations((prev: any) => prev.map((res: any) => {
      if (res.id === selectedRes.id) {
        return {
          ...res,
          status: 'Expired',
          logs: novosLogs
        };
      }
      return res;
    }));

    setStatus('Expired');
    showToast('Reserva cancelada com sucesso.', 'info');
  };

  const getStatusBadge = (resStatus: string) => {
    switch (resStatus) {
      case 'Active':
        return 'bg-amber-50 text-amber-700 border-amber-250';
      case 'Completed':
        return 'bg-[#C1F11D]/15 text-[#141414] border-[#C1F11D]/30';
      case 'Expired':
        return 'bg-rose-50 text-rose-700 border-rose-250';
      default:
        return 'bg-[#F4F4F2] text-[#5F5F5A] border-[#E5E5E2]';
    }
  };

  const getStatusLabel = (resStatus: string) => {
    switch (resStatus) {
      case 'Active':
        return 'Aguardando Sinal';
      case 'Completed':
        return 'PIX Recebido';
      case 'Expired':
        return 'Expirado';
      case 'Pending':
        return 'Pendente';
      default:
        return resStatus;
    }
  };

  const inputClass = "w-full bg-white border border-[#E5E5E2] rounded-xl px-4 py-3 text-sm font-semibold text-[#2A2A26] outline-none focus:border-[#141414] transition";
  const labelClass = "block text-[10px] font-semibold text-[#8A8A85] uppercase tracking-wider mb-2";

  const dotClass = (s: string) =>
    s === 'Completed' ? 'bg-[#C1F11D]' : s === 'Expired' ? 'bg-rose-400' : s === 'Active' ? 'bg-amber-400' : 'bg-[#B9B9B4]';

  const chips = [
    { id: 'todos', label: 'Todos', count: recentReservations.length },
    { id: 'Active', label: 'Aguardando', count: recentReservations.filter((r: any) => r.status === 'Active').length },
    { id: 'Completed', label: 'PIX Recebido', count: recentReservations.filter((r: any) => r.status === 'Completed').length },
    { id: 'Expired', label: 'Expirados', count: recentReservations.filter((r: any) => r.status === 'Expired').length },
  ];
  const filtered = filtro === 'todos' ? recentReservations : recentReservations.filter((r: any) => r.status === filtro);

  return (
    <div className={embedded ? '' : 'pt-28 pb-16 px-6 md:px-12 max-w-[1600px] mx-auto'}>

      {/* Top Header */}
      <div className="mb-6 text-left">
        <h1 className="text-2xl md:text-3xl font-bold text-[#141414] tracking-tight flex items-center gap-2">
          <FileText size={24} className="text-[#141414] shrink-0" /> Logs de Reservas
        </h1>
        <p className="text-[#8A8A85] text-[13px] md:text-sm mt-1 font-medium">Auditoria completa de propostas: valores, status, atendentes e acessos de leads.</p>
      </div>

      {/* Logs de exportação — histórico do botão Exportar do Painel da loja */}
      {(() => {
        const exps = lerLogsExportacao();
        return (
          <div className="bg-white border border-[#E5E5E2] rounded-[24px] p-5 mb-6 text-left">
            <div className="flex items-center justify-between gap-3 mb-1">
              <h3 className="text-base font-bold text-[#141414]">Logs de exportação</h3>
              <span className="text-[10px] font-bold text-[#B9B9B4] uppercase tracking-wider">{exps.length} {exps.length === 1 ? 'registro' : 'registros'}</span>
            </div>
            <p className="text-[11px] text-[#8A8A85] font-medium mb-3">Cada relatório gerado pelo botão Exportar do painel fica registrado aqui.</p>
            {exps.length > 0 ? (
              <div className="divide-y divide-[#F0F0EE]">
                {exps.slice(0, 8).map((l: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 py-2.5">
                    <span className={`shrink-0 text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-md ${l.formato === 'pdf' ? 'bg-[#141414] text-white' : 'bg-[#C1F11D]/25 text-[#141414]'}`}>{l.formato === 'pdf' ? 'PDF' : 'MD'}</span>
                    <span className="text-xs font-semibold text-[#2A2A26] flex-1 min-w-0 truncate">Relatório da loja — {l.qtd} {l.qtd === 1 ? 'proposta' : 'propostas'} · {l.loja}</span>
                    <span className="text-[10px] text-[#B9B9B4] font-semibold shrink-0">{new Date(l.ts).toLocaleString('pt-BR')}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#B9B9B4] font-medium py-2">Nenhuma exportação ainda. Use o botão Exportar no Painel da loja.</p>
            )}
          </div>
        );
      })()}

      {recentReservations.length > 0 ? (
        <>
          {/* Filtros por status */}
          <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1">
            {chips.map(c => (
              <button
                key={c.id}
                onClick={() => setFiltro(c.id)}
                className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full border text-[11px] font-bold transition cursor-pointer ${
                  filtro === c.id ? 'bg-[#141414] border-[#141414] text-white' : 'bg-white border-[#E5E5E2] text-[#5F5F5A] hover:border-[#B9B9B4]'
                }`}
              >
                {c.label}
                <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${filtro === c.id ? 'bg-white/15 text-white' : 'bg-[#F4F4F2] text-[#8A8A85]'}`}>{c.count}</span>
              </button>
            ))}
          </div>

          {/* Tabela/acordeão de logs */}
          <div className="bg-white border border-[#E5E5E2] rounded-[24px] overflow-hidden text-left">
            {filtered.length > 0 ? filtered.map((res: any, i: number) => {
              const isOpen = res.id === selectedId;
              const dateOnly = res.created ? (res.created.split('de')[1] || res.created).trim() : 'Recente';
              const logsToShow = (res.logs && res.logs.length > 0) ? res.logs : [
                { time: res.created || 'Hoje', text: `Proposta criada por ${res.vendedores ? res.vendedores.split(',')[0] : 'Consultor'}` },
                { time: res.created || 'Hoje', text: `Link de sinal de ${formatCurrency(Number(res.sinal || 0))} ativado` },
              ];
              return (
                <div key={res.id} className={i > 0 ? 'border-t border-[#EBEBE8]' : ''}>
                  {/* Linha do log */}
                  <button
                    onClick={() => setSelectedId(isOpen ? null : res.id)}
                    className={`w-full flex items-center gap-3 md:gap-4 px-4 md:px-6 py-4 text-left transition cursor-pointer ${isOpen ? 'bg-[#FAFAF8]' : 'hover:bg-[#FAFAF8]'}`}
                  >
                    <span className={`w-2 h-2 rounded-full shrink-0 ${dotClass(res.status)}`}></span>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-[13px] font-bold text-[#141414] tracking-tight leading-tight truncate">{res.title}</h4>
                      <span className="text-[10px] font-medium text-[#B9B9B4] block mt-0.5 truncate">
                        {res.vendedores || 'Sem atendente'} · <span>{dateOnly}</span>
                      </span>
                    </div>
                    <span className="hidden md:block w-28 text-right text-sm font-bold text-[#141414] shrink-0">{formatCurrency(Number(res.sinal || 0))}</span>
                    <span className={`hidden sm:inline-block px-2 py-0.5 rounded text-[9px] font-bold border shrink-0 ${getStatusBadge(res.status)}`}>{getStatusLabel(res.status)}</span>
                    <ChevronDown size={16} className={`text-[#B9B9B4] shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Painel expandido: gerenciar + histórico */}
                  {isOpen && (
                    <div className="border-t border-[#EBEBE8] bg-[#FAFAF8] px-4 md:px-6 py-6">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Coluna 1: formulário de gerenciamento */}
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-white border border-[#E5E5E2] rounded-xl p-3.5">
                              <span className="block text-[9px] text-[#B9B9B4] font-bold uppercase tracking-wider mb-1">Lead Associado</span>
                              <strong className="text-[#2A2A26] text-[13px] font-extrabold break-words">{res.clienteNome || 'Não informado'}</strong>
                            </div>
                            <div className="bg-white border border-[#E5E5E2] rounded-xl p-3.5">
                              <span className="block text-[9px] text-[#B9B9B4] font-bold uppercase tracking-wider mb-1">Criado em</span>
                              <strong className="text-[#2A2A26] text-[13px] font-semibold break-words">{res.created || 'Hoje'}</strong>
                            </div>
                          </div>
                          <div>
                            <label className={labelClass}>Valor do Sinal (R$)</label>
                            <input type="text" inputMode="numeric" value={sinal} onChange={(e) => setSinal(e.target.value.replace(/\D/g, ''))} className={inputClass} placeholder="Ex: 1500" />
                          </div>
                          <div>
                            <label className={labelClass}>Atendente Responsável</label>
                            <input type="text" value={vendedor} onChange={(e) => setVendedor(e.target.value)} className={inputClass} placeholder="Nome do vendedor" />
                          </div>
                          <div>
                            <label className={labelClass}>Status da Reserva</label>
                            <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass}>
                              <option value="Active">Aguardando Sinal</option>
                              <option value="Completed">PIX Recebido</option>
                              <option value="Expired">Expirado / Cancelado</option>
                            </select>
                          </div>
                        </div>

                        {/* Coluna 2: histórico em timeline */}
                        <div>
                          <label className={labelClass}>Histórico da Proposta</label>
                          <div className="bg-white border border-[#E5E5E2] rounded-xl p-4 max-h-64 overflow-y-auto">
                            <div className="relative pl-4 space-y-4">
                              <span className="absolute left-[3px] top-1.5 bottom-1.5 w-px bg-[#E5E5E2]"></span>
                              {logsToShow.map((log: any, idx: number) => {
                                const isAccess = String(log.time).toLowerCase().includes('acesso') || String(log.text).toLowerCase().includes('visualizad');
                                return (
                                  <div key={idx} className="relative">
                                    <span className={`absolute -left-[15.5px] top-1 w-2 h-2 rounded-full border-2 border-white ${isAccess ? 'bg-[#94a3b8]' : 'bg-[#141414]'}`}></span>
                                    <span className={`block text-[10px] font-bold ${isAccess ? 'text-[#94a3b8]' : 'text-[#B9B9B4]'}`}>{log.time}</span>
                                    <p className={`text-xs leading-snug font-bold mt-0.5 ${isAccess ? 'text-[#1e3a8a]' : 'text-[#2A2A26]'}`}>{log.text}</p>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Ações */}
                      <div className="flex flex-col sm:flex-row gap-3 pt-5 border-t border-[#EBEBE8] mt-6 justify-between">
                        {status === 'Active' ? (
                          <button onClick={handleCancel} className="bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 font-bold py-3 px-5 rounded-xl text-[11px] transition uppercase tracking-wider cursor-pointer">
                            Cancelar Reserva
                          </button>
                        ) : (<div />)}
                        <div className="flex flex-col sm:flex-row gap-3">
                          <button onClick={handleDiscard} className="bg-white border border-[#E5E5E2] text-[#5F5F5A] font-bold py-3 px-5 rounded-xl text-[11px] hover:bg-[#F4F4F2] transition uppercase tracking-wider cursor-pointer">
                            Descartar
                          </button>
                          <button onClick={handleSave} className="bg-[#141414] hover:bg-[#2A2A26] text-[#F4F4F2] font-bold py-3 px-5 rounded-xl text-[11px] transition uppercase tracking-wider cursor-pointer">
                            Salvar Alterações
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            }) : (
              <div className="text-center py-16 px-6">
                <FileText size={40} className="mx-auto text-[#D9D9D5] mb-3" />
                <h3 className="text-base font-bold text-[#2A2A26]">Nada por aqui</h3>
                <p className="text-[#8A8A85] text-xs mt-1">Nenhuma reserva com esse status.</p>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="text-center py-20 bg-white border border-[#E5E5E2] rounded-[32px] p-10 max-w-xl mx-auto">
          <FileText size={48} className="mx-auto text-[#D9D9D5] mb-4" />
          <h3 className="text-lg font-bold text-[#2A2A26]">Nenhum histórico disponível</h3>
          <p className="text-[#8A8A85] text-xs mt-1">Crie novas propostas de reservas no painel para visualizar o log de auditoria.</p>
        </div>
      )}

    </div>
  );
}

