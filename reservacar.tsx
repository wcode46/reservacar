import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Car, Clock, ShieldCheck, ChevronRight, CheckCircle2, 
  Play, ChevronLeft, X, LogIn, BarChart2, Link as LinkIcon, 
  MessageCircle, Phone, Heart, Share, ArrowRight, ArrowUpRight, ArrowLeft, Shield,
  Bell, Send, Check, Copy, Sparkles, RefreshCw, Smartphone, Laptop, AlertCircle,
  TrendingUp, DollarSign, Users, Award, ShieldAlert, UploadCloud, Info, HelpCircle, CreditCard,
  CircleDollarSign, Settings, LogOut, Menu, PlusCircle, UserPlus, Search, FileText,
  ArrowUp, TrendingDown, Eye
} from 'lucide-react';


// --- UTILITY FUNCTIONS ---
const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

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
  const [activeReservation, setActiveReservation] = useState<any>(null); 
  const [toastMessage, setToastMessage] = useState<any>(null);
  const [previewOrigin, setPreviewOrigin] = useState('dashboard');
  
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
  const [reservaParaGerenciar, setReservaParaGerenciar] = useState<any>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  
  // Real-time live notifications (makes the dashboard dynamic!)
  const [liveNotifications, setLiveNotifications] = useState<any[]>([
    { id: 1, type: 'pix', label: 'PIX RECEBIDO', color: 'text-emerald-600', text: 'Sinal de R$ 5.000 pago por Rafael Mendes — BMW 320i.', time: 'Há 4 min' },
    { id: 2, type: 'view', label: 'VISUALIZAÇÃO', color: 'text-blue-600', text: 'Carlos S. abriu a proposta da Audi RS4 — terceira visita.', time: 'Agora' },
    { id: 3, type: 'urgente', label: 'URGÊNCIA', color: 'text-amber-700', text: 'Link da Mercedes C200 expira em menos de 5 min.', time: 'Agora' },
    { id: 4, type: 'create', label: 'NOVA PROPOSTA', color: 'text-purple-600', text: 'Carla Silva gerou um link para JAC iEV 20.', time: 'Há 12 min' },
  ]);

  // Initial Seed for Reservations (idêntico aos prints!)
  const [recentReservations, setRecentReservations] = useState([
    { 
      id: 1, title: 'Audi A3 1.6 3p 2002 Gasolina', signal: 1500, duration: '60', created: '12:12:33 de 24/05/2026',
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
      id: 2, title: 'JAC iEV 20 68cv 5p Aut. (Elétrico)', signal: 1500, duration: '60', created: '12:16:33 de 24/05/2026',
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
      id: 3, title: 'BMW 320i 2.0 Turbo 2023', signal: 5000, duration: '30', created: '12:14:52 de 24/05/2026',
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
      id: 4, title: 'Mercedes-Benz C200 2.0 Avantgarde 2018', signal: 3000, duration: '60', created: '12:15:00 de 24/05/2026',
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

  // Sincronização reativa de créditos de acordo com o plano ativo
  useEffect(() => {
    const plano = empresaLogada?.planoAtivo || empresaLogada?.plano || 'Plus';
    if (plano === 'Basic') setTotalReservasPlano(10);
    else if (plano === 'Premium') setTotalReservasPlano(50);
    else setTotalReservasPlano(30); // Plus
  }, [empresaLogada?.planoAtivo, empresaLogada?.plano]);

  // Automated notification generator to simulate real traffic
  useEffect(() => {
    const intervals = [
      "Cliente Patricia M. está negociando a BMW 320i.",
      "Vendedor Roberto enviou um link de proposta via WhatsApp.",
      "Cliente na Mooca está visualizando os opcionais do Audi RS4.",
      "Alerta de Urgência: Link da Mercedes C200 expira em menos de 5 min!",
      "Uma nova proposta está sendo montada por Marcos Souza."
    ];
    
    const intervalId = setInterval(() => {
      const randMsg = intervals[Math.floor(Math.random() * intervals.length)];
      setLiveNotifications(prev => [
        { id: Date.now(), type: 'info', text: randMsg, time: 'Agora' },
        ...prev.slice(0, 4)
      ]);
      showToast(randMsg, 'info');
    }, 45000); // Trigger every 45s

    return () => clearInterval(intervalId);
  }, []);

  const isLoggedRoute = ['hub', 'sales-stats', 'dashboard', 'configuracoes', 'checkout-plano', 'cadastrar-reserva', 'vendedores', 'relatorios'].includes(currentRoute);

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900 transition-colors duration-200">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[99] max-w-sm bg-white border border-slate-200 border-l-4 border-blue-600 text-slate-900 p-4 rounded-r-xl flex items-center gap-3 animate-bounce">
          <Sparkles className="text-blue-600 shrink-0" size={20} />
          <span className="text-sm font-medium">{toastMessage.text}</span>
        </div>
      )}

      {/* Hide standard navbar on logged-in routes and preview simulator layouts */}
      {!isLoggedRoute && currentRoute !== 'preview' && currentRoute !== 'mobile-preview' && (
        <Navbar currentRoute={currentRoute} navigateTo={navigateTo} />
      )}

      {/* Mobile Header for Logged-in Routes */}
      {isLoggedRoute && (
        <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 z-40 flex items-center justify-between px-6">
          <button 
            onClick={() => setMobileSidebarOpen(true)}
            className="p-2 text-slate-600 hover:text-blue-600 transition"
          >
            <Menu size={24} />
          </button>
          <span className="font-extrabold text-slate-900 tracking-tight text-lg">Reservacar</span>
          <div className="w-8"></div>
        </div>
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
        />
      )}
      
      <main className={`transition-all duration-300 ${isLoggedRoute ? 'lg:pl-64 pt-16 lg:pt-0' : ''}`}>
        {currentRoute === 'home' && <HomeView navigateTo={navigateTo} />}
        {currentRoute === 'login' && <LoginView navigateTo={navigateTo} />}
        
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
          />
        )}

        {currentRoute === 'assinar' && (
          <AssinaturaEmpresaView 
            navigateTo={navigateTo} 
            showToast={showToast}
            setTotalReservasPlano={setTotalReservasPlano}
            setReservasUsadas={setReservasUsadas}
            setEmpresaLogada={setEmpresaLogada}
          />
        )}

        {currentRoute === 'configuracoes' && (
          <ConfiguracoesView 
            navigateTo={navigateTo} 
            showToast={showToast}
            empresaLogada={empresaLogada}
            setEmpresaLogada={setEmpresaLogada}
            totalReservasPlano={totalReservasPlano}
            setTotalReservasPlano={setTotalReservasPlano}
            setPlanoUpgrade={setPlanoUpgrade}
          />
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
          />
        )}

        {currentRoute === 'vendedores' && (
          <VendedoresView 
            navigateTo={navigateTo} 
            showToast={showToast}
            empresaLogada={empresaLogada}
            setEmpresaLogada={setEmpresaLogada}
          />
        )}

        {currentRoute === 'relatorios' && (
          <RelatorioReservasView 
            navigateTo={navigateTo} 
            showToast={showToast}
            recentReservations={recentReservations}
            setRecentReservations={setRecentReservations}
          />
        )}
      </main>
      {currentRoute === 'home' && <Footer navigateTo={navigateTo} />}

      {reservaParaGerenciar && (
        <GerenciarReservaModal
          reserva={reservaParaGerenciar}
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
function GerenciarReservaModal({ reserva, onClose, onSave, onCancelReserva }) {
  const [sinal, setSinal] = useState(String(reserva.signal || reserva.sinal || 0));
  const [status, setStatus] = useState(reserva.status || 'Active');
  const [vendedor, setVendedor] = useState(reserva.vendedores || '');

  const handleSave = () => {
    const novosLogs = [...(reserva.logs || [])];
    const originalSignal = Number(reserva.signal || reserva.sinal || 0);
    const newSignal = Number(sinal);

    if (newSignal !== originalSignal) {
      novosLogs.push({
        time: new Date().toLocaleTimeString('pt-BR') + ' de ' + new Date().toLocaleDateString('pt-BR'),
        text: `Valor do sinal alterado de R$ ${originalSignal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} para R$ ${newSignal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      });
    }

    if (vendedor !== reserva.vendedores) {
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
        text: `Status alterado para: ${statusMap[status] || status}`
      });
    }

    onSave({
      ...reserva,
      signal: newSignal,
      sinal: newSignal,
      status: status,
      vendedores: vendedor,
      logs: novosLogs
    });
  };

  const formatCurrencyLocal = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const historico = reserva.logs && reserva.logs.length > 0 ? reserva.logs : [
    { time: reserva.created || 'Hoje', text: `Proposta criada por ${reserva.vendedores ? reserva.vendedores.split(',')[0] : 'Consultor'}` },
    { time: reserva.created || 'Hoje', text: `Link de sinal ativado: ${formatCurrencyLocal(reserva.signal || reserva.sinal || 1500)}` },
  ];

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 max-w-lg w-full text-left relative max-h-[90vh] overflow-y-auto">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 transition"
        >
          <X size={20} />
        </button>

        <h3 className="text-xl font-bold text-slate-900 mb-1 tracking-tight">Gerenciar Reserva</h3>
        <p className="text-slate-500 text-xs mb-6 font-medium uppercase tracking-wider border-b border-slate-100 pb-2">
          {reserva.title}
        </p>

        <div className="space-y-5">
          {/* Info do Lead */}
          <div className="grid grid-cols-2 gap-4 bg-slate-50 border border-slate-150 p-4 rounded-2xl text-xs">
            <div>
              <span className="block text-[9px] text-slate-450 font-bold uppercase tracking-wider mb-1">Lead Associado</span>
              <strong className="text-slate-800 text-sm font-semibold">{reserva.clienteNome || 'Não informado'}</strong>
            </div>
            <div>
              <span className="block text-[9px] text-slate-450 font-bold uppercase tracking-wider mb-1">Criado em</span>
              <strong className="text-slate-800 text-sm font-semibold font-mono">{reserva.created}</strong>
            </div>
          </div>

          {/* Valor do Sinal */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Valor do Sinal (R$)</label>
            <input 
              type="text" 
              value={sinal}
              onChange={(e) => setSinal(e.target.value.replace(/\D/g, ''))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-600 transition font-mono"
            />
          </div>

          {/* Vendedor */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Atendente Responsável</label>
            <input 
              type="text" 
              value={vendedor}
              onChange={(e) => setVendedor(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-600 transition"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Status da Reserva</label>
            <select 
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-600 transition"
            >
              <option value="Active">Aguardando Sinal</option>
              <option value="Completed">PIX Recebido</option>
              <option value="Expired">Expirado</option>
            </select>
          </div>

          {/* Histórico fictício */}
          <div>
            <span className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-3">Histórico da Proposta</span>
            <div className="space-y-3 bg-slate-50 border border-slate-200 p-4 rounded-2xl max-h-36 overflow-y-auto">
              {historico.map((log, index) => (
                <div key={index} className="flex items-start gap-2.5 text-xs text-slate-700">
                  <span className="text-[10px] font-mono text-slate-400 mt-0.5">{log.time}</span>
                  <p className="font-semibold">{log.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Rodapé Ações */}
        <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-slate-100 mt-6 justify-between">
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
              className="bg-white border border-slate-200 text-slate-700 font-bold py-3.5 px-5 rounded-xl text-xs hover:bg-slate-50 transition"
            >
              Descartar
            </button>
            <button
              onClick={handleSave}
              className="bg-blue-600 hover:bg-blue-750 text-white font-bold py-3.5 px-5 rounded-xl text-xs transition"
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
function Sidebar({ currentRoute, navigateTo, empresaLogada, isOpen, setIsOpen, reservasUsadas = 0, totalReservasPlano = 30, recentReservations = [] }) {
  const operacoesItems = [
    { id: 'hub', label: 'Painel central', icon: Laptop },
    { id: 'sales-stats', label: 'Painel de vendas', icon: BarChart2 },
    { id: 'dashboard', label: 'Nova proposta', icon: LinkIcon },
  ];

  const gestaoItems = [
    { id: 'vendedores', label: 'Vendedores', icon: Users },
    { id: 'relatorios', label: 'Relatórios', icon: FileText },
    { id: 'configuracoes', label: 'Configurações', icon: Settings },
  ];

  const handleNavigate = (route) => {
    navigateTo(route);
    setIsOpen(false);
  };

  const activePlano = empresaLogada?.planoAtivo || empresaLogada?.plano || 'Plus';
  const linksDisponiveis = totalReservasPlano - reservasUsadas;

  const renderNavGroup = (title: string, items: any[]) => (
    <div className="space-y-1.5 px-4 pt-4">
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-3 mb-2 block">{title}</span>
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = currentRoute === item.id || (item.id === 'configuracoes' && currentRoute === 'checkout-plano');
        const showBadge = item.id === 'sales-stats';
        
        return (
          <button
            key={item.id}
            onClick={() => handleNavigate(item.id)}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition duration-150 ${
              isActive 
                ? 'bg-blue-50 text-blue-600 border border-blue-100' 
                : 'text-slate-600 hover:text-blue-600 hover:bg-slate-50 border border-transparent'
            }`}
          >
            <div className="flex items-center gap-3">
              <Icon size={18} className={isActive ? 'text-blue-600' : 'text-slate-500'} />
              <span>{item.label}</span>
            </div>
            {showBadge && (
              <span className="w-5 h-5 bg-blue-100/80 text-blue-700 text-[10px] font-bold rounded-full flex items-center justify-center shrink-0">
                {recentReservations.length}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );

  const sidebarContent = (
    <div className="h-full flex flex-col justify-between bg-white text-slate-800">
      <div>
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-6 py-6 border-b border-slate-200">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shrink-0">
            <Car size={22} className="text-white" />
          </div>
          <div>
            <span className="text-xl font-black tracking-tight text-slate-900 block">Reservacar</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block -mt-1">Central de Vendas</span>
          </div>
        </div>

        {/* Store Info */}
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
          <p className="text-sm font-bold text-slate-800 truncate">{empresaLogada?.nome || 'BMW Premium SP'}</p>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Plano {activePlano}</span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="divide-y divide-slate-100 space-y-4">
          {renderNavGroup('Operações', operacoesItems)}
          {renderNavGroup('Gestão', gestaoItems)}
        </nav>
      </div>

      {/* Widget de Uso de Créditos (Flat & Premium) */}
      <div className="px-6 py-5 border-t border-slate-150 bg-slate-50/50 text-left">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Uso do Plano</span>
          <span className="text-[11px] font-black text-slate-900">{reservasUsadas}/{totalReservasPlano}</span>
        </div>
        
        {/* Barra de Progresso Flat */}
        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200">
          <div 
            className="bg-blue-600 h-full transition-all duration-[800ms] ease-out-expo origin-left transform"
            style={{ 
              width: `${Math.min(100, (reservasUsadas / totalReservasPlano) * 100)}%` 
            }}
          ></div>
        </div>
        <p className="text-[10px] text-slate-450 mt-2 font-bold uppercase tracking-wide">
          {linksDisponiveis} links disponíveis
        </p>

        <button
          onClick={() => handleNavigate('checkout-plano')}
          className="w-full mt-3.5 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold text-blue-700 bg-blue-50/70 hover:bg-blue-100/90 hover:text-blue-800 transition duration-150 cursor-pointer"
        >
          <ArrowUp size={14} className="stroke-[2.5px]" />
          <span>Fazer Upgrade de Plano</span>
        </button>
      </div>

      {/* Footer Section */}
      <div className="p-4 border-t border-slate-200 bg-slate-50/30">
        <button
          onClick={() => handleNavigate('home')}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition duration-150"
        >
          <LogOut size={18} />
          <span>Sair da Loja</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (Permanent) */}
      <aside className="hidden lg:block fixed top-0 bottom-0 left-0 w-64 bg-white border-r border-slate-200 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => setIsOpen(false)}
          ></div>

          {/* Drawer Panel */}
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white z-50 h-full">
            {/* Close button inside drawer */}
            <div className="absolute top-4 right-4 z-10">
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
              >
                <X size={20} />
              </button>
            </div>
            {sidebarContent}
          </div>
        </div>
      )}
    </>
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
        : 'bg-white/95 backdrop-blur-md border-b border-slate-200'
    }`}>
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <div className="flex items-center cursor-pointer gap-3" onClick={() => navigateTo('home')}>
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <Car size={22} className="text-white" />
            </div>
            <span className={`text-2xl font-black tracking-tight transition-colors duration-300 ${
              isTransparent ? 'text-white' : 'text-slate-900'
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
                    isTransparent ? 'text-white/85 hover:text-white' : 'text-slate-600 hover:text-blue-600'
                  }`}
                >
                  Pagina Inicial
                </button>
                <a 
                  href="#sobre"
                  className={`text-sm font-semibold transition py-2 ${
                    isTransparent ? 'text-white/85 hover:text-white' : 'text-slate-600 hover:text-blue-600'
                  }`}
                >
                  Sobre nos
                </a>
                <a 
                  href="#precos"
                  className={`text-sm font-semibold transition py-2 ${
                    isTransparent ? 'text-white/85 hover:text-white' : 'text-slate-600 hover:text-blue-600'
                  }`}
                >
                  Precos
                </a>
                <button 
                  onClick={() => navigateTo('assinar')}
                  className={`text-sm font-semibold transition py-2 ${
                    isTransparent ? 'text-white/85 hover:text-white' : 'text-slate-600 hover:text-blue-600'
                  }`}
                >
                  Assinar
                </button>
                <a 
                  href="#contato"
                  className={`text-sm font-semibold transition py-2 ${
                    isTransparent ? 'text-white/85 hover:text-white' : 'text-slate-600 hover:text-blue-600'
                  }`}
                >
                  Contato
                </a>
                <button 
                  onClick={() => navigateTo('login')}
                  className="flex items-center space-x-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition"
                >
                  <LogIn size={16} />
                  <span>Acesso Lojista</span>
                </button>
              </>
            )}
            {['hub', 'sales-stats', 'dashboard', 'assinar', 'configuracoes', 'checkout-plano', 'cadastrar-reserva'].includes(currentRoute) && (
              <>
                <button 
                  onClick={() => navigateTo('configuracoes')}
                  className={`p-2.5 rounded-xl transition flex items-center justify-center mr-2 border ${
                    currentRoute === 'configuracoes'
                      ? 'bg-blue-50 text-blue-600 border-blue-200'
                      : 'text-slate-500 hover:text-blue-600 hover:bg-slate-50 border-transparent'
                  }`}
                  title="Configurações"
                >
                  <Settings size={18} />
                </button>
                <button 
                  onClick={() => navigateTo('hub')}
                  className={`text-sm font-semibold transition mr-4 py-2 ${
                    currentRoute === 'hub' ? 'text-blue-600 font-bold' : 'text-slate-600 hover:text-blue-600'
                  }`}
                >
                  Painel Principal
                </button>
                <button 
                  onClick={() => navigateTo('home')}
                  className="text-sm font-semibold bg-white hover:bg-slate-50 px-5 py-2.5 rounded-xl text-slate-800 transition border border-slate-200"
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
        <div className="relative w-[280px] h-[230px] bg-black rounded-t-[40px] border-t-[8px] border-x-[8px] border-slate-900 shadow-2xl overflow-hidden mb-12 select-none flex flex-col">
          {/* Notch superior do iPhone */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-4 bg-slate-900 rounded-b-2xl z-30 flex items-center justify-center">
            <div className="w-2 h-2 bg-slate-950 rounded-full mr-1.5" />
            <div className="w-5 h-0.5 bg-slate-950 rounded-full" />
          </div>

          {/* Tela Interna */}
          <div className="relative flex-1 flex flex-col pt-7 px-3 bg-black">
            {/* Barra de Status */}
            <div className="flex justify-between items-center text-[8px] font-bold text-slate-500 px-1 mb-4 z-20">
              <span>{phone?.time || "9:41"}</span>
              <div className="flex items-center gap-1">
                <Smartphone size={8} className="text-slate-500" />
                <span className="w-3 h-1.5 border border-slate-500 rounded-sm bg-slate-500" />
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
                        <span className="text-[8px] text-slate-400 block mt-0.5">{item.time}</span>
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
                        <span className="text-[8px] text-slate-400 block mt-0.5">{item.time}</span>
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
        
        <p className="text-sm md:text-base font-medium text-slate-400 mb-8 leading-relaxed max-w-xl">
          {description}
        </p>

        {/* Preço e Escassez */}
        {price && (
          <div className="flex flex-col items-center gap-1 mb-2">
            <div className="flex items-baseline gap-2.5">
              <span className="text-3xl md:text-4xl font-black text-white tracking-tight">{price.current}</span>
              <span className="text-sm font-medium text-slate-500 line-through">{price.original}</span>
            </div>
          </div>
        )}

        {availability && (
          <div className="text-[10px] font-bold tracking-wider text-slate-500 uppercase mb-8">
            {availability}
          </div>
        )}

        {/* Botões CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto">
          {primaryAction && (
            <button 
              onClick={primaryAction.onClick}
              className="w-full sm:w-auto bg-white text-black hover:bg-slate-100 px-8 py-3.5 rounded-full text-xs font-bold transition duration-250 border border-transparent shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            >
              {primaryAction.label}
            </button>
          )}
          {secondaryAction && (
            <button 
              onClick={secondaryAction.onClick}
              className="w-full sm:w-auto bg-transparent text-white hover:bg-white/5 px-8 py-3.5 rounded-full text-xs font-bold transition duration-250 border border-white/20 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-350 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            >
              {secondaryAction.label}
            </button>
          )}
        </div>

        {/* Trusted By */}
        {trustedBy && (
          <div className="mt-16 w-full">
            <h4 className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 mb-6 block text-center">
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
                  <div key={`orig-${idx}`} className="text-slate-500 hover:text-white transition duration-200 opacity-60 hover:opacity-100 shrink-0">
                    {logo}
                  </div>
                ))}
                {/* Segunda metade duplicada */}
                {trustedBy.logos.map((logo, idx) => (
                  <div key={`dup-${idx}`} className="text-slate-500 hover:text-white transition duration-200 opacity-60 hover:opacity-100 shrink-0">
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

// --- HOME VIEW ---
function HomeView({ navigateTo }) {
  const staticNotifications = [
    { id: 1, name: "Veiculo Reservado", time: "Hoje as 11:28", price: "+R$ 17.850", color: "#00C9A7" },
    { id: 2, name: "Veiculo Reservado", time: "Hoje as 11:15", price: "+R$ 24.500", color: "#FFB800" },
    { id: 3, name: "Veiculo Reservado", time: "Hoje as 11:02", price: "+R$ 15.000", color: "#FF3D71" },
    { id: 4, name: "Veiculo Reservado", time: "Hoje as 10:48", price: "+R$ 31.200", color: "#1E86FF" },
    { id: 5, name: "Veiculo Reservado", time: "Hoje as 10:30", price: "+R$ 12.850", color: "#8B5CF6" },
  ];

  return (
    <div className="overflow-hidden relative bg-[#f8f9fa]">
      {/* Estilos específicos para a lista animada da Hero */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes slideInTop {
          0% {
            opacity: 0;
            transform: translateY(-16px) scale(0.95);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .animate-slide-in-top {
          animation: slideInTop 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-slide-in-top {
            animation: none !important;
          }
        }
      `}} />
      
      <PricingLandingHero
        title={
          <>
            Transforme seu estoque
            <br />
            em uma máquina de vendas
          </>
        }
        description="Uma vitrine digital para cada veículo com Pix e FIPE integrados. Poupe horas de negociação e feche vendas mais rápido."
        phone={{
          time: "9:41",
          items: staticNotifications
        }}
        price={{ current: "R$ 159", original: "R$ 399" }}
        availability="Oferta de lançamento — por tempo limitado"
        primaryAction={{ 
          label: "Simular Reserva (Cliente)", 
          onClick: () => navigateTo('cadastrar-reserva') 
        }}
        secondaryAction={{ 
          label: "Assinar Reservacar", 
          onClick: () => navigateTo('assinar') 
        }}
        trustedBy={{
          heading: "Usado por concessionárias e lojistas em todo o Brasil",
          logos: [
            <span key="audi" className="text-3xl font-black tracking-tight whitespace-nowrap">Audi Center</span>,
            <span key="bmw" className="text-3xl font-black tracking-tight whitespace-nowrap">BMW Premium</span>,
            <span key="toyota" className="text-3xl font-black tracking-tight whitespace-nowrap">Toyota Elite</span>,
            <span key="porsche" className="text-3xl font-black tracking-tight whitespace-nowrap">Porsche Service</span>,
            <span key="volvo" className="text-3xl font-black tracking-tight whitespace-nowrap">Volvo Premium</span>,
            <span key="mercedes" className="text-3xl font-black tracking-tight whitespace-nowrap">Mercedes-Benz</span>,
            <span key="honda" className="text-3xl font-black tracking-tight whitespace-nowrap">Honda Vip</span>,
            <span key="jac" className="text-3xl font-black tracking-tight whitespace-nowrap">JAC Motors</span>,
          ],
        }}
      />

      {/* 2. Seção "Propostas Exclusivas" (Cartões para chamar de seus) */}
      <div className="py-24 bg-white border-t border-b border-slate-200 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
            Páginas de reserva para chamar de suas
          </h2>
          <p className="text-slate-500 font-semibold max-w-2xl mx-auto mb-16">
            Crie links de vitrine digital altamente envolventes, personalizados com a logo da sua concessionária, fotos de alta qualidade e ficha técnica integrada.
          </p>

          <div className="relative h-[320px] max-w-3xl mx-auto flex items-center justify-center mt-12 mb-12 select-none">
            {/* Card 1: Esquerda (Fiat JAC CS) */}
            <div className="absolute left-4 md:left-20 top-8 bg-slate-50 border-2 border-slate-200 p-6 rounded-3xl w-72 text-left rotate-[-8deg] hover:rotate-0 transition duration-300 z-10">
              <span className="bg-blue-50 text-blue-600 text-[9px] font-black px-2 py-0.5 rounded uppercase">ELÉTRICO</span>
              <h4 className="font-extrabold text-base text-slate-900 mt-2">JAC iEV 20 68cv Aut.</h4>
              <div className="w-full h-24 rounded-xl overflow-hidden bg-slate-200 my-3">
                <img src="https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&w=300&q=80" className="w-full h-full object-cover" />
              </div>
              <div className="flex justify-between items-center text-xs font-bold mt-2">
                <span className="text-slate-500">Sinal: R$ 1.500</span>
                <span className="text-slate-950 font-black">R$ 78.262</span>
              </div>
            </div>

            {/* Card 2: Direita / Centro (Sobreposto) */}
            <div className="absolute right-4 md:right-20 top-4 bg-white border-2 border-slate-350 p-6 rounded-3xl w-72 text-left rotate-[6deg] hover:rotate-0 transition duration-300 z-20">
              <span className="bg-blue-600 text-white text-[9px] font-black px-2 py-0.5 rounded uppercase">PREMIUM</span>
              <h4 className="font-extrabold text-base text-slate-900 mt-2">BMW 320i M Sport 2024</h4>
              <div className="w-full h-24 rounded-xl overflow-hidden bg-slate-200 my-3">
                <img src="https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=300&q=80" className="w-full h-full object-cover" />
              </div>
              <div className="flex justify-between items-center text-xs font-bold mt-2">
                <span className="text-blue-600">Sinal: R$ 5.000</span>
                <span className="text-slate-950 font-black">R$ 269.000</span>
              </div>
            </div>
          </div>

          <button 
            onClick={() => navigateTo('cadastrar-reserva')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-8 py-3.5 rounded-xl transition"
          >
            Criar Minha Primeira Proposta
          </button>
        </div>
      </div>

      {/* 3. Seção "Sinal em Minutos" (Envie dinheiro) */}
      <div className="py-24 bg-[#f8f9fa]">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center">
          
          {/* Coluna Esquerda: Mockup móvel */}
          <div className="flex justify-center select-none">
            <div className="w-[320px] h-[520px] bg-slate-950 rounded-[40px] overflow-hidden border-[6px] border-slate-800 flex flex-col relative shadow-md">
              <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-24 h-4 bg-black rounded-full z-30" />
              
              <div className="bg-white flex-1 p-5 flex flex-col justify-between text-slate-900 text-left">
                <div className="pt-6">
                  <span className="bg-emerald-550 text-white text-[8px] font-black px-2 py-0.5 rounded">PIX INTEGRADO</span>
                  <h4 className="font-black text-lg text-slate-900 mt-2">Pagamento do Sinal</h4>
                  <p className="text-[10px] text-slate-500 mt-1">Efetue o sinal de garantia e reserve o veículo imediatamente.</p>
                  
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center my-4">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">VALOR REQUERIDO</span>
                    <span className="text-2xl font-black text-slate-900">R$ 5.000,00</span>
                  </div>

                  <div className="flex justify-center my-2">
                    <div className="bg-white border border-slate-200 p-2 rounded-lg">
                      <svg width="80" height="80" viewBox="0 0 100 100" fill="black">
                        <rect x="0" y="0" width="20" height="20" />
                        <rect x="5" y="5" width="10" height="10" fill="white" />
                        <rect x="80" y="0" width="20" height="20" />
                        <rect x="85" y="5" width="10" height="10" fill="white" />
                        <rect x="0" y="80" width="20" height="20" />
                        <rect x="5" y="85" width="10" height="10" fill="white" />
                        <rect x="40" y="40" width="20" height="20" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="w-full bg-emerald-600 text-white font-bold text-xs py-3 rounded-xl text-center select-none">
                  Simulação Pix Ativa
                </div>
              </div>
            </div>
          </div>

          {/* Coluna Direita: Texto */}
          <div className="text-left">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-widest block mb-3">RECEBA ANTES DO SHOWROOM</span>
            <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight leading-tight mb-6">
              Gere links de reserva e receba sinais em minutos
            </h2>
            <p className="text-slate-650 font-medium leading-relaxed mb-8">
              Não perca vendas para outros showrooms. Compartilhe o link de proposta exclusiva via WhatsApp. O cliente realiza o pagamento do sinal com Pix direto da tela de propostas e garante o carro de forma segura.
            </p>
            
            <div className="flex gap-4">
              <button 
                onClick={() => navigateTo('cadastrar-reserva')}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-6 py-3.5 rounded-xl transition"
              >
                Criar Proposta
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* 4. Banner Horizontal (Revmoji) */}
      <div className="relative w-full h-[320px] bg-slate-900 flex items-center justify-center overflow-hidden">
        <img 
          src="https://images.unsplash.com/photo-1606016159991-dfe4f2746ad5?auto=format&fit=crop&w=1200&q=80" 
          className="absolute inset-0 w-full h-full object-cover opacity-60" 
          alt="Concessionária showroom moderno" 
        />
        <div className="absolute inset-0 bg-slate-950/50 z-10" />

        <div className="relative max-w-4xl mx-auto px-6 z-20 text-center">
          <span className="bg-blue-600 text-white text-[10px] font-black px-3.5 py-1.5 rounded-full uppercase tracking-widest mb-4 inline-block">
            ESCASSEZ CONTROLADA
          </span>
          <h3 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight mb-4">
            Sinta a urgência com a contagem regressiva
          </h3>
          <p className="text-slate-300 font-medium max-w-xl mx-auto text-sm md:text-base mb-6 leading-relaxed">
            Nossos links de propostas contam com contagem regressiva psicológica e selo de laudo cautelar verificado, estimulando o lead quente a fechar a reserva rapidamente.
          </p>
        </div>
      </div>

      {/* 5. Seção de Métricas */}
      <div className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-12">
            Métricas que aceleram concessionárias
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8 text-left">
            <div className="bg-[#f8f9fa] border border-slate-200 p-8 rounded-3xl">
              <span className="text-6xl font-black text-blue-600 block mb-2">71.4%</span>
              <h4 className="font-extrabold text-slate-900 text-lg mb-2">Taxa de Conversão</h4>
              <p className="text-slate-500 text-sm leading-relaxed font-medium">
                Lojas que usam links do Reservacar conseguem converter mais de 70% dos leads de WhatsApp em reservas de showroom pagas.
              </p>
            </div>

            <div className="bg-[#f8f9fa] border border-slate-200 p-8 rounded-3xl">
              <span className="text-6xl font-black text-slate-900 block mb-2">1h 48m</span>
              <h4 className="font-extrabold text-slate-900 text-lg mb-2">Tempo Médio de Fechamento</h4>
              <p className="text-slate-500 text-sm leading-relaxed font-medium">
                Reduza o tempo de negociação drasticamente. Do envio do link à confirmação do sinal via Pix, a média de decisão é menor que 2 horas.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 6. Seção Como Começar */}
      <div className="py-24 bg-[#f8f9fa] border-t border-slate-200">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-4">
            Como começar a usar o Reservacar?
          </h2>
          <p className="text-slate-500 font-semibold max-w-xl mx-auto mb-16">
            Siga três passos simples e comece a fechar suas propostas de forma digital hoje mesmo.
          </p>

          <div className="grid md:grid-cols-3 gap-6 text-left mb-12">
            <div className="bg-white border border-slate-200 p-8 rounded-3xl">
              <span className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-black text-sm mb-6 select-none">
                1
              </span>
              <h4 className="font-extrabold text-slate-900 text-lg mb-3">Assine um Plano</h4>
              <p className="text-slate-500 text-xs leading-relaxed font-medium">
                Escolha o plano ideal para o volume de vendas do seu showroom e adquira os créditos de links ativos.
              </p>
            </div>

            <div className="bg-white border border-slate-200 p-8 rounded-3xl">
              <span className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-black text-sm mb-6 select-none">
                2
              </span>
              <h4 className="font-extrabold text-slate-900 text-lg mb-3">Crie a Proposta</h4>
              <p className="text-slate-500 text-xs leading-relaxed font-medium">
                Consulte o veículo na FIPE, insira quilometragem, fotos, opcionais e defina o valor do sinal Pix.
              </p>
            </div>

            <div className="bg-white border border-slate-200 p-8 rounded-3xl">
              <span className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-black text-sm mb-6 select-none">
                3
              </span>
              <h4 className="font-extrabold text-slate-900 text-lg mb-3">Receba e Feche</h4>
              <p className="text-slate-500 text-xs leading-relaxed font-medium">
                Envie o link ao lead. Quando ele pagar o sinal, o carro sai do showroom virtual e você finaliza a venda presencial.
              </p>
            </div>
          </div>

          <button 
            onClick={() => navigateTo('assinar')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-8 py-3.5 rounded-xl transition"
          >
            Quero Assinar Agora
          </button>
        </div>
      </div>

    </div>
  );
}

// --- NEW COMPONENT: FOOTER (Estilo Revolut escuro) ---
function Footer({ navigateTo }) {
  return (
    <footer className="bg-[#0f172a] text-slate-400 pt-20 pb-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        
        <div className="mb-16 text-left">
          <span className="text-xs font-bold text-blue-500 uppercase tracking-widest block mb-3">PRONTO PARA ACELERAR?</span>
          <h2 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-4 max-w-2xl leading-tight">
            Revolucione as vendas do seu showroom de veículos.
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16 border-t border-b border-slate-800 py-12 text-left">
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
        <div className="text-left text-[11px] text-slate-500 leading-relaxed space-y-4">
          <p>
            O Reservacar é uma plataforma de tecnologia voltada para a otimização e aceleração de processos comerciais em concessionárias multimarcas de seminovos. Não somos uma instituição financeira ou intermediador direto de pagamentos. As transações financeiras (sinais via Pix) são liquidadas diretamente entre o comprador final (lead) e a concessionária parceira através dos provedores de pagamento integrados à conta bancária de cada concessionária, sob total responsabilidade dos envolvidos.
          </p>
          <p>
            A segurança dos dados é garantida através de segurança avançada e conformidade total com a Lei Geral de Proteção de Dados (LGPD). A expiração dos cronômetros e a trava de showroom são lógicas simuladas configuradas livremente pelas equipes comerciais a fim de otimizar sua taxa de conversão local.
          </p>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pt-8 border-t border-slate-800 gap-4 mt-8">
            <span className="text-[11px] font-semibold text-slate-600">© 2026 Reservacar Ltda. Todos os direitos reservados. CNPJ 12.345.678/0001-90.</span>
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

// --- LOGIN VIEW ---
function LoginView({ navigateTo }) {
  return (
    <div className="min-h-screen flex items-center justify-center pt-24 px-6 bg-[#f8f9fa] relative">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-10 relative">
        <h2 className="text-3xl font-black mb-2 text-slate-900 tracking-tight">Acesso Lojista</h2>
        <p className="text-slate-500 font-medium mb-8">Gerencie suas propostas de reserva exclusivas.</p>
        
        <form onSubmit={(e) => { e.preventDefault(); navigateTo('hub'); }} className="space-y-6">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">E-mail Corporativo</label>
            <input 
              type="email" 
              defaultValue="vendedor@bmwpremium.com.br"
              className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3.5 text-slate-800 focus:border-slate-900 focus:outline-none transition font-medium"
              required
            />
          </div>
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Senha</label>
              <a href="#" className="text-xs font-semibold text-blue-600 hover:underline">Esqueceu?</a>
            </div>
            <input 
              type="password" 
              defaultValue="123456"
              className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3.5 text-slate-800 focus:border-slate-900 focus:outline-none transition font-medium"
              required
            />
          </div>
          
          <button 
            type="submit"
            className="w-full bg-blue-600 text-white font-bold rounded-xl py-4 mt-2 hover:bg-blue-700 transition"
          >
            Entrar no Sistema
          </button>
        </form>
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
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Olá, Marcos</h1>
            <p className="text-slate-500 text-sm mt-1 font-medium">
              {empresaLogada?.nome || 'BMW Premium SP'} · Central de Vendas
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-full px-4 py-2 flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-extrabold text-slate-700 uppercase tracking-wider">Showroom conectado</span>
          </div>
        </div>

        {/* Credit System Visual Widget */}
        <div className="mt-8 bg-white border border-slate-200 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-8 relative overflow-hidden">
          {/* Left Column: Plano Info */}
          <div className="flex flex-col min-w-[200px]">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">PLANO ATUAL</span>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl font-bold text-slate-900 tracking-tight">
                {empresaLogada?.planoAtivo || 'Plus'}
              </span>
              <span className="border border-emerald-250 bg-emerald-50 text-emerald-600 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                ATIVO
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">Renova-se em 10/06/2026</p>
          </div>

          {/* Middle Column: Credits Progress */}
          <div className="w-full md:max-w-md flex-1">
            <div className="flex justify-between items-center text-[10px] font-semibold text-slate-400 mb-2">
              <span className="tracking-widest uppercase">CRÉDITOS UTILIZADOS</span>
              <span className="text-slate-900 text-xs font-bold font-mono">{reservasUsadas} / {totalReservasPlano}</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-2 border border-slate-200/30">
              <div 
                className="h-full rounded-full transition-all duration-1000 bg-blue-600" 
                style={{ width: `${percentagemUso}%` }}
              ></div>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              {reservasDisponiveis} links disponíveis · excelente margem
            </p>
          </div>

          {/* Right Column: Upgrade Button */}
          <div className="w-full md:w-auto flex justify-end md:justify-start">
            <button 
              onClick={() => navigateTo('configuracoes')}
              className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-6 py-3.5 rounded-xl transition duration-200 flex items-center justify-center gap-2 uppercase tracking-wider"
            >
              <ArrowUp size={14} className="stroke-[2.5px]" /> Fazer upgrade
            </button>
          </div>
        </div>
      </div>

      {/* Grid of Key Performance Indicators (SaaS Style) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 w-full max-w-[1600px] text-left">
        <div className="bg-white border border-slate-200 p-6 rounded-3xl">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">PROPOSTAS ATIVAS</span>
            <LinkIcon size={16} className="text-blue-600" />
          </div>
          <span className="block text-3xl font-bold font-mono tracking-tight text-slate-900 mb-1">7</span>
          <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
            <ArrowUpRight size={14} className="stroke-[2.5px]" /> 3 novas hoje
          </span>
        </div>
        
        <div className="bg-white border border-slate-200 p-6 rounded-3xl">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">TAXA DE CONVERSÃO</span>
            <TrendingUp size={16} className="text-emerald-600" />
          </div>
          <span className="block text-3xl font-bold font-mono tracking-tight text-slate-900 mb-1">71%</span>
          <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
            <ArrowUpRight size={14} className="stroke-[2.5px]" /> +8% vs mês anterior
          </span>
        </div>

        <div className="bg-white border border-slate-200 p-6 rounded-3xl">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">SINAL EM CAIXA</span>
            <DollarSign size={16} className="text-blue-600" />
          </div>
          <span className="block text-3xl font-bold font-mono tracking-tight text-slate-900 mb-1">R$ 42k</span>
          <span className="text-xs text-slate-400 font-medium">Este mês</span>
        </div>

        <div className="bg-white border border-slate-200 p-6 rounded-3xl">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">VELOCIDADE MÉDIA</span>
            <Clock size={16} className="text-blue-600" />
          </div>
          <span className="block text-3xl font-bold font-mono tracking-tight text-slate-900 mb-1">1h 48m</span>
          <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
            <ArrowUpRight size={14} className="stroke-[2.5px]" /> Fechamento rápido
          </span>
        </div>
      </div>

      <div className="w-full max-w-[1600px] grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
        
        {/* Module Choice Column (Spans 2 columns on desktop) */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6 items-stretch">
          <button 
            onClick={() => navigateTo('sales-stats')}
            className="bg-white border border-slate-200 rounded-[32px] p-8 flex flex-col items-start hover:border-slate-400 transition duration-200 group text-left"
          >
            <div className="flex items-center gap-1.5 text-emerald-750 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl text-[9px] font-bold uppercase tracking-wider mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
              Atividade ao vivo
            </div>
            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-600 transition duration-200">
              <BarChart2 size={24} className="text-blue-600 group-hover:text-white transition duration-200" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition duration-200">Painel de vendas</h2>
            <p className="text-slate-500 font-medium text-xs leading-relaxed mb-8">Acompanhe propostas ativas, visualize o fluxo do cliente e registre pagamentos em tempo real.</p>
            <div className="mt-auto w-10 h-10 border border-slate-200 rounded-full flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition duration-200">
              <ArrowRight size={16} />
            </div>
          </button>

          <button 
            onClick={() => navigateTo('dashboard')}
            className="bg-white border border-slate-200 rounded-[32px] p-8 flex flex-col items-start hover:border-slate-400 transition duration-200 group text-left"
          >
            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-600 transition duration-200 mt-[46px]">
              <LinkIcon size={24} className="text-blue-600 group-hover:text-white transition duration-200" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition duration-200">Nova proposta</h2>
            <p className="text-slate-500 font-medium text-xs leading-relaxed mb-8">Crie páginas de reserva instantâneas, consulte tabela FIPE e monte checklists por lead.</p>
            <div className="mt-auto w-10 h-10 border border-slate-200 rounded-full flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition duration-200">
              <ArrowRight size={16} />
            </div>
          </button>
        </div>

        {/* Live Notification Activity Ticker */}
        <div className="bg-white border border-slate-200 rounded-[32px] p-6 flex flex-col h-full min-h-[350px]">
          <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Bell size={14} className="text-blue-600" />
              Notificações
            </h3>
            <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-600 uppercase tracking-wider bg-emerald-50 px-2 py-1 rounded-md border border-emerald-250">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Ao vivo
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 max-h-[360px] pr-1">
            {liveNotifications.map(notif => {
              let labelColor = 'text-blue-600';
              let bgColor = 'bg-blue-50/50';
              if (notif.type === 'pix') {
                labelColor = 'text-emerald-600';
                bgColor = 'bg-emerald-50/30';
              } else if (notif.type === 'urgente') {
                labelColor = 'text-amber-700';
                bgColor = 'bg-amber-50/30';
              } else if (notif.type === 'create') {
                labelColor = 'text-purple-600';
                bgColor = 'bg-purple-50/30';
              }
              
              return (
                <div key={notif.id} className="text-xs bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col gap-1 relative hover:border-slate-300 transition-colors duration-200 animate-fade-in-down">
                  <div className="flex items-center gap-1.5 font-bold uppercase text-[9px] tracking-wider">
                    <span className={labelColor}>{notif.label || 'ATIVIDADE'}</span>
                  </div>
                  <p className="font-semibold text-slate-800 text-[11px] leading-snug mt-1.5 pr-14">{notif.text}</p>
                  <span className="text-[9px] text-slate-400 font-medium font-mono absolute bottom-3 right-4">{notif.time}</span>
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
function SalesStatsView({ navigateTo, reservasUsadas, totalReservasPlano, recentReservations, setRecentReservations, liveNotifications, showToast, empresaLogada, setReservaParaGerenciar }) {
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


  // Timer regressivo a cada segundo para decrementar o tempo de expiração simulado das propostas ativas
  useEffect(() => {
    const timer = setInterval(() => {
      setRecentReservations((prev: any) => prev.map((res: any) => {
        if (res.status === 'Active') {
          const limit = res.expiracao * 60;
          if ((res.elapsedSeconds || 0) < limit) {
            return {
              ...res,
              elapsedSeconds: (res.elapsedSeconds || 0) + 1
            };
          }
        }
        return res;
      }));
    }, 1000);
    return () => clearInterval(timer);
  }, [setRecentReservations]);

  // Estados de Filtro e Ordenação
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'aguardando' | 'urgentes' | 'confirmados'>('todos');

  // Cálculos 100% dinâmicos baseados no estado real das reservas
  const totalResgatesAtivos = recentReservations.filter(r => r.status === 'Active').length;
  const totalCriadasAcumulado = recentReservations.length;
  const concluidasAcumuladas = recentReservations.filter(r => r.status === 'Completed' || r.paidSignal).length;
  const conversaoLiquida = totalCriadasAcumulado > 0 
    ? Math.round((concluidasAcumuladas / totalCriadasAcumulado) * 100) 
    : 0;

  const totalSinalCaixa = recentReservations
    .filter(r => r.status === 'Completed' || r.paidSignal)
    .reduce((acc, r) => acc + (Number(r.signal || r.sinal) || 0), 0);
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

  // Ranking de vendedores calculados dinamicamente
  const rankingVendedores = useMemo(() => {
    const nomes = ['Roberto Oliveira', 'Carla Silva', 'Marcos Souza'];
    const dados = nomes.map(nome => {
      const reservasDoVendedor = recentReservations.filter((r: any) => r.vendedores === nome || (r.vendedores && r.vendedores.includes(nome)));
      const total = reservasDoVendedor.length;
      const pagas = reservasDoVendedor.filter((r: any) => r.status === 'Completed' || r.paidSignal).length;
      const conversao = total > 0 ? Math.round((pagas / total) * 100) : 0;
      return { nome, total, pagas, conversao };
    });
    return dados.sort((a, b) => b.conversao - a.conversao);
  }, [recentReservations]);

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
    <div className="pt-32 pb-20 px-6 md:px-12 max-w-[1600px] mx-auto">
      {/* Header (Print 2) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 border-b border-slate-200 pb-6 text-left">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Painel da loja</h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">Atividade comercial em tempo real</p>
        </div>
        <div className="flex items-center gap-3">
          {urgenteReserva && tempoRestanteSegundos > 0 ? (
            <div className={`px-4 py-2 rounded-full flex items-center gap-2 text-xs transition-all duration-300 border ${
              tempoRestanteSegundos < 300 
                ? 'bg-rose-50/60 border-rose-200 text-rose-700 font-semibold' 
                : 'bg-white border-slate-200 text-slate-700'
            }`}>
              <span className={`w-2 h-2 rounded-full ${tempoRestanteSegundos < 300 ? 'bg-rose-500 animate-pulse' : 'bg-blue-500'}`}></span>
              <span className="font-bold">
                Link do {obterNomeSimplificado(urgenteReserva.title)} expira em {Math.floor(tempoRestanteSegundos / 60)} min e {tempoRestanteSegundos % 60} seg
              </span>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 px-4 py-2 rounded-full flex items-center gap-2 text-xs text-slate-500">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="font-bold">Todos os links de sinal seguros</span>
            </div>
          )}
          <div className="bg-slate-800 text-white px-4 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider">
            {reservasDisponiveis} créditos livres
          </div>
        </div>
      </div>

      {/* Grid Bento de KPIs (Estilo Dashboard-4 Commerce) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 text-left">
        {/* Card 1: Receita Real */}
        <div className="bg-white border border-slate-200 p-6 rounded-3xl">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">SINAL EM CAIXA</span>
            <DollarSign size={16} className="text-blue-600 shrink-0" />
          </div>
          <span className="block text-3xl font-bold font-mono tracking-tight text-slate-900 mb-1">{formatSinalCaixa}</span>
          <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
            <ArrowUpRight size={14} className="stroke-[2.5px]"/> Este mês corrente
          </span>
        </div>

        {/* Card 2: Clientes Ativos */}
        <div className="bg-white border border-slate-200 p-6 rounded-3xl">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">RESGATES ATIVOS</span>
            <Users size={16} className="text-blue-600 shrink-0" />
          </div>
          <span className="block text-3xl font-bold font-mono tracking-tight text-slate-900 mb-1">{totalResgatesAtivos}</span>
          <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
            <ArrowUpRight size={14} className="stroke-[2.5px]"/> 3 novas hoje
          </span>
        </div>

        {/* Card 3: Links Expirados */}
        <div className="bg-white border border-slate-200 p-6 rounded-3xl">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">LINKS EXPIRADOS</span>
            <ShieldAlert size={16} className="text-rose-600 shrink-0" />
          </div>
          <span className="block text-3xl font-bold font-mono tracking-tight text-slate-900 mb-1">{totalExpiradas}</span>
          <span className="text-xs text-slate-400 font-medium">Por inatividade de leads</span>
        </div>

        {/* Card 4: Taxa de Conversão */}
        <div className="bg-white border border-slate-200 p-6 rounded-3xl">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">CONVERSÃO LÍQUIDA</span>
            <TrendingUp size={16} className="text-emerald-600 shrink-0" />
          </div>
          <span className="block text-3xl font-bold font-mono tracking-tight text-slate-900 mb-1">{conversaoLiquida}%</span>
          <span className="text-xs text-slate-400 font-medium">
            Baseado em {totalCriadasAcumulado} propostas
          </span>
        </div>
      </div>

      {/* Estrutura Bento de Duas Colunas (Principal + Lateral) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 text-left">
        {/* Coluna da Esquerda ( lg:col-span-3 ) */}
        <div className="lg:col-span-3 space-y-6">
          {/* Card do Gráfico de Tendências (CSS Puro) */}
          <div className="bg-white border border-slate-200 p-6 rounded-3xl flex flex-col justify-between min-h-[320px]">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Tendência de Receita Semanal</h3>
              <p className="text-[10px] text-slate-400 font-medium">Sinais pagos distribuídos proporcionalmente nos dias da semana</p>
            </div>
            
            {/* Gráfico de Barras CSS Puro */}
            <div className="flex items-end justify-between gap-4 h-48 px-2 mt-4 border-b border-slate-100 pb-2">
              {diasSemana.map((dia) => (
                <div key={dia.label} className="flex flex-col items-center flex-1 group relative">
                  {/* Tooltip com valor em hover */}
                  <div className="absolute bottom-full mb-2 bg-slate-800 text-white text-[9px] font-mono font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10 shadow-lg border border-slate-700">
                    {formatCurrency(dia.valor)}
                  </div>
                  {/* Barra vertical com cor azul e altura dinâmica */}
                  <div 
                    className="w-full bg-blue-600 hover:bg-blue-700 rounded-t-md transition-all duration-500 cursor-pointer"
                    style={{ height: `${dia.porcentagem}%` }}
                  ></div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase mt-2">{dia.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Abas e Filtros */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-t border-slate-200 pt-6">
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={() => setFiltroStatus('todos')}
                className={`px-4 py-2 rounded-full text-xs font-bold transition flex items-center gap-1.5 uppercase tracking-wider ${
                  filtroStatus === 'todos' 
                    ? 'bg-slate-900 text-white' 
                    : 'bg-white border border-slate-200 text-slate-650 hover:border-slate-350'
                }`}
              >
                Todos <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-mono ${filtroStatus === 'todos' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500'}`}>{countTodos}</span>
              </button>
              <button 
                onClick={() => setFiltroStatus('aguardando')}
                className={`px-4 py-2 rounded-full text-xs font-bold transition flex items-center gap-1.5 uppercase tracking-wider ${
                  filtroStatus === 'aguardando' 
                    ? 'bg-slate-900 text-white' 
                    : 'bg-white border border-slate-200 text-slate-650 hover:border-slate-350'
                }`}
              >
                Aguardando sinal <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-mono ${filtroStatus === 'aguardando' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500'}`}>{countAguardando}</span>
              </button>
              <button 
                onClick={() => setFiltroStatus('urgentes')}
                className={`px-4 py-2 rounded-full text-xs font-bold transition flex items-center gap-1.5 uppercase tracking-wider ${
                  filtroStatus === 'urgentes' 
                    ? 'bg-slate-900 text-white' 
                    : 'bg-white border border-slate-200 text-slate-650 hover:border-slate-350'
                }`}
              >
                Urgentes <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-mono ${filtroStatus === 'urgentes' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500'}`}>{countUrgentes}</span>
              </button>
              <button 
                onClick={() => setFiltroStatus('confirmados')}
                className={`px-4 py-2 rounded-full text-xs font-bold transition flex items-center gap-1.5 uppercase tracking-wider ${
                  filtroStatus === 'confirmados' 
                    ? 'bg-slate-900 text-white' 
                    : 'bg-white border border-slate-200 text-slate-650 hover:border-slate-350'
                }`}
              >
                Confirmados <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-mono ${filtroStatus === 'confirmados' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500'}`}>{countConfirmados}</span>
              </button>
            </div>
            
            <button className="bg-white border border-slate-200 hover:border-slate-400 hover:bg-slate-50 text-slate-700 font-bold text-xs px-4 py-2 rounded-xl transition flex items-center gap-2 cursor-pointer">
              <TrendingDown size={14} /> Ordenar por expiração
            </button>
          </div>

          {/* Lista de Transações/Propostas Remodeladas (Estilo E-commerce Linhas) */}
          <div className="space-y-4">
            {filteredReservations.length > 0 ? (
              filteredReservations.map((res) => {
                const isCompleted = res.status === 'Completed' || res.paidSignal;
                const isExpired = res.status === 'Expired';
                
                // Timer
                const totalSeconds = res.expiracao * 60;
                const remainingSeconds = Math.max(0, totalSeconds - (res.elapsedSeconds || 0));
                const mins = Math.floor(remainingSeconds / 60);
                const secs = remainingSeconds % 60;
                const timerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
                const progressPercent = (remainingSeconds / totalSeconds) * 100;
                const isUrgente = !isCompleted && !isExpired && remainingSeconds < 300;

                return (
                  <div key={res.id} className="bg-white border border-slate-200 rounded-3xl p-5 hover:border-slate-300 transition duration-200 flex flex-col gap-4 text-left">
                    {/* Info Vendedor e Status */}
                    <div className="flex flex-wrap justify-between items-center gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-bold uppercase tracking-wider bg-slate-150 text-slate-600 px-2.5 py-1 rounded-md">
                          Vendedor: {res.vendedores ? res.vendedores.split(' ')[0] : 'Consultor'}
                        </span>
                        {res.clienteNome && res.clienteNome !== 'Não informado' && (
                          <span className="text-[9px] font-bold uppercase tracking-wider bg-blue-50 text-blue-600 px-2.5 py-1 rounded-md">
                            Cliente: {res.clienteNome}
                          </span>
                        )}
                      </div>
                      
                      {/* Status Badge */}
                      {isCompleted ? (
                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> PIX Recebido
                        </span>
                      ) : isExpired ? (
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Link Expirado
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
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-t border-slate-100 pt-4">
                      <div className="flex items-center gap-4">
                        {res.fotos && (
                          <img 
                            src={res.fotos} 
                            alt={res.title} 
                            className="w-14 h-14 rounded-2xl object-cover border border-slate-200 shrink-0 animate-fade-in-down" 
                          />
                        )}
                        <div>
                          <h4 className="font-bold text-base text-slate-900 tracking-tight leading-snug">{res.title}</h4>
                          <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                            FIPE: {formatCurrency(res.fipeValue)} • Venda: <span className="font-bold text-slate-700">{formatCurrency(res.valorVenda)}</span>
                          </p>
                        </div>
                      </div>

                      {/* Valor do Sinal Exigido */}
                      <div className="text-left md:text-right shrink-0">
                        <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Sinal Exigido</span>
                        <span className="font-black text-xl text-blue-655 tracking-tight">
                          {formatCurrency(res.signal || res.sinal)}
                        </span>
                      </div>
                    </div>

                    {/* Banner de Visualização Ativa */}
                    {res.visualizandoAgora && !isCompleted && !isExpired && (
                      <div className="bg-blue-50/40 border border-blue-100 rounded-xl px-4 py-2.5 flex items-center gap-2 text-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping"></span>
                        <span className="font-bold text-blue-700 text-[10px] uppercase tracking-wider">Lead visualizando a proposta neste momento</span>
                      </div>
                    )}

                    {/* Timer do Link se Ativo */}
                    {!isCompleted && !isExpired && (
                      <div className="space-y-1.5 border-t border-slate-100 pt-4">
                        <div className="flex justify-between items-center text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                          <span>Expiração do Link</span>
                          <span className={`font-mono text-[11px] font-bold ${isUrgente ? 'text-rose-600' : 'text-slate-650'}`}>{timerText}</span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden border border-slate-200/50">
                          <div 
                            className={`h-full rounded-full transition-all duration-1000 origin-left transform ${isUrgente ? 'bg-rose-600' : 'bg-blue-600'}`} 
                            style={{ width: `${progressPercent}%` }}
                          ></div>
                        </div>
                      </div>
                    )}

                    {/* Botões de Ação */}
                    <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
                      {!isCompleted && !isExpired && (
                        <>
                          <button 
                            onClick={() => handleSimulatePayment(res.id, res.clienteNome || 'Cliente')}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] px-4 py-2.5 rounded-xl transition uppercase tracking-wider cursor-pointer"
                          >
                            Confirmar PIX
                          </button>
                          <button 
                            onClick={() => handleSimulateTimeExpiration(res.id)}
                            className="bg-white border border-slate-200 text-slate-650 hover:bg-slate-50 font-bold text-[10px] px-4 py-2.5 rounded-xl transition uppercase tracking-wider cursor-pointer"
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
                        className="bg-slate-900 hover:bg-black text-white font-bold text-[10px] px-4 py-2.5 rounded-xl transition uppercase tracking-wider cursor-pointer"
                      >
                        Gerenciar
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="bg-white border border-slate-200 rounded-[32px] p-12 text-center">
                <Clock size={48} className="mx-auto text-slate-300 mb-4" />
                <h4 className="text-lg font-bold text-slate-800">Nenhuma proposta encontrada</h4>
                <p className="text-slate-500 text-xs mt-1">Nenhuma proposta de reserva atende ao filtro de status selecionado.</p>
              </div>
            )}
          </div>
        </div>

        {/* Coluna da Direita ( lg:col-span-1 - Ranking e Plano) */}
        <div className="lg:col-span-1 space-y-6">
          {/* Card de Ranking de Vendedores (Category Performance do Dashboard-4) */}
          <div className="bg-white border border-slate-200 p-6 rounded-3xl text-left">
            <h3 className="font-bold text-slate-800 text-sm mb-1">Ranking de Vendedores</h3>
            <p className="text-[10px] text-slate-400 font-medium mb-4">Conversão real baseada em propostas</p>
            
            <div className="space-y-4">
              {rankingVendedores.map((vend) => (
                <div key={vend.nome} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-700">{vend.nome.split(' ')[0]}</span>
                    <span className="font-mono text-slate-500 font-bold">{vend.conversao}% ({vend.pagas}/{vend.total})</span>
                  </div>
                  {/* Barra de Progresso Horizontal do Vendedor */}
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden border border-slate-200/50">
                    <div 
                      className="bg-blue-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${vend.conversao}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card Auxiliar: Velocidade Média de Vendas */}
          <div className="bg-white border border-slate-200 p-6 rounded-3xl text-left">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800 text-sm">Velocidade Média</h3>
              <Clock size={16} className="text-blue-600 shrink-0" />
            </div>
            <span className="block text-3xl font-bold font-mono tracking-tight text-slate-900 mb-1">{velocidadeMediaText}</span>
            <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
              Tempo médio de fechamento medido entre a ativação do link e a confirmação do sinal.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- DASHBOARD VIEW (CREATOR FORM) ---
function DashboardView({ navigateTo, setActiveReservation, recentReservations, setRecentReservations, showToast, reservasUsadas, totalReservasPlano, setReservaParaGerenciar }) {
  const [showConfirmClearModal, setShowConfirmClearModal] = useState(false);
  return (
    <div className="pt-28 pb-16 px-6 md:px-12 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Gerador de Reservas</h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">Gere páginas exclusivas personalizadas para cada lead.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowConfirmClearModal(true)}
            className="text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-xl border border-slate-200 transition"
          >
            Limpar Tudo
          </button>
          <button 
            onClick={() => {
              if (reservasUsadas >= totalReservasPlano) {
                showToast('Limite de créditos de reserva atingido pelo seu plano. Faça upgrade nas configurações!', 'error');
                return;
              }
              navigateTo('cadastrar-reserva');
            }}
            className={`text-xs font-bold px-4 py-2.5 rounded-xl transition ${
              reservasUsadas >= totalReservasPlano
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            Criar Reserva +
          </button>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <Sparkles className="text-blue-600" size={16} /> Links Criados Recentemente
          </h3>
          <span className="text-xs text-slate-500 font-semibold">{recentReservations.length} links ativos</span>
        </div>

        {recentReservations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentReservations.map((res: any) => (
              <div key={res.id} className="bg-white border border-slate-200 rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden group hover:border-slate-400 transition-colors duration-200">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="bg-slate-50 border border-slate-200 text-[9px] font-bold text-slate-500 px-2.5 py-1 rounded-md uppercase tracking-wider">
                      {res.marcaText || 'Veículo'}
                    </span>
                    <span className="text-[10px] text-slate-500 font-semibold font-mono">{res.created?.split(' ')[0] || 'Hoje'}</span>
                  </div>
                  
                  <h4 className="font-bold text-base text-slate-900 tracking-tight leading-snug mb-4 group-hover:text-blue-600 transition-colors">
                    {res.title || `${res.marcaText} ${res.modeloText}`}
                  </h4>

                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex items-center justify-between gap-2 text-xs font-semibold text-slate-700 mb-6">
                    <div className="flex flex-col">
                      <span className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Sinal Requerido</span>
                      <span className="text-sm font-bold font-mono text-slate-900">{formatCurrency(res.signal || 1500)}</span>
                    </div>
                    <div className="w-px h-8 bg-slate-200"></div>
                    <div className="flex flex-col">
                      <span className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Tempo Limiar</span>
                      <span className="text-sm font-bold font-mono text-slate-800">{res.duration || 60}m</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 mt-auto pt-4 border-t border-slate-100">
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        setActiveReservation(res);
                        navigateTo('preview', 'dashboard');
                      }}
                      className="flex-1 bg-white border border-slate-200 text-slate-700 text-[11px] font-bold py-2.5 rounded-xl hover:bg-slate-50 hover:text-slate-900 transition flex items-center justify-center gap-1"
                    >
                      <Laptop size={12} /> Desktop
                    </button>
                    <button 
                      onClick={() => {
                        setActiveReservation(res);
                        navigateTo('mobile-preview', 'dashboard');
                      }}
                      className="flex-1 bg-white border border-slate-200 text-slate-700 text-[11px] font-bold py-2.5 rounded-xl hover:bg-slate-50 hover:text-slate-900 transition flex items-center justify-center gap-1"
                    >
                      <Smartphone size={12} /> Mobile Sim
                    </button>
                  </div>
                  <button 
                    onClick={() => setReservaParaGerenciar(res)}
                    className="w-full bg-slate-900 hover:bg-slate-950 text-white text-[11px] font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-1.5"
                  >
                    <Settings size={12} /> Gerenciar Reserva
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center max-w-xl mx-auto">
            <Car className="text-slate-300 mx-auto mb-4 animate-bounce" size={42} />
            <h4 className="font-bold text-slate-900 text-lg mb-2">Nenhum link ativo gerado</h4>
            <p className="text-xs text-slate-500 leading-relaxed font-medium mb-6">
              Os links criados pelos clientes finais a partir da página inicial aparecerão aqui automaticamente.
            </p>
            <button 
              onClick={() => {
                if (reservasUsadas >= totalReservasPlano) {
                  showToast('Limite de créditos de reserva atingido pelo seu plano. Faça upgrade nas configurações!', 'error');
                  return;
                }
                navigateTo('cadastrar-reserva');
              }}
              className={`font-bold text-xs px-5 py-3 rounded-xl transition ${
                reservasUsadas >= totalReservasPlano
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              Simular Fluxo do Cliente
            </button>
          </div>
        )}
      </div>

      {/* MODAL DE CONFIRMAÇÃO DE LIMPEZA (F4) */}
      {showConfirmClearModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-sm w-full text-center relative">
            <h3 className="text-lg font-black text-slate-900 mb-2">Confirmar Limpeza</h3>
            <p className="text-slate-550 text-xs mb-6 font-medium leading-relaxed">
              Tem certeza de que deseja apagar permanentemente todas as propostas de reserva? Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmClearModal(false)}
                className="flex-1 bg-white border border-slate-200 text-slate-700 font-bold py-3.5 px-5 rounded-xl text-xs hover:bg-slate-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setRecentReservations([]);
                  setShowConfirmClearModal(false);
                  showToast('Histórico de links limpo com sucesso.', 'info');
                }}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 px-5 rounded-xl text-xs transition"
              >
                Limpar Tudo
              </button>
            </div>
          </div>
        </div>
      )}
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
  previewOrigin
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
  
  const economia = data.fipeValue - data.valorVenda;
  const photosArray = data.fotos ? data.fotos.split(',').map((url: any) => url.trim()).filter(Boolean) : ['https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=800&q=80'];

  const isPrePublish = reservation && !recentReservations.some((r: any) => r.id === reservation.id);

  const handlePublish = () => {
    if (reservasUsadas >= totalReservasPlano) {
      showToast('Limite de links do plano atingido pela concessionária.', 'error');
      return;
    }
    setRecentReservations([reservation, ...recentReservations]);
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
    navigateTo('dashboard');
  };
  
  useEffect(() => {
    if (timeLeft <= 0) return;
    const intervalId = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(intervalId);
  }, [timeLeft]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progressPercent = (timeLeft / (data.expiracao * 60)) * 100;

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-slate-900 flex flex-col items-center pt-12 pb-24 px-6 relative">
      <button 
        onClick={() => navigateTo(isPrePublish ? 'cadastrar-reserva' : previewOrigin)} 
        className="absolute top-6 left-6 text-slate-600 hover:text-slate-900 font-semibold flex items-center text-sm transition z-20 bg-white border border-slate-200 px-4 py-2 rounded-xl"
      >
        <ChevronLeft size={16} className="mr-1"/> {isPrePublish ? 'Voltar para o Cadastro' : 'Voltar ao Sistema'}
      </button>

      {isPrePublish && (
        <div className="w-full max-w-5xl bg-white border border-slate-200 p-5 rounded-3xl flex flex-col sm:flex-row justify-between items-center gap-4 mt-12 relative overflow-hidden">
          <div className="text-left">
            <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
              <Sparkles className="text-blue-600" size={16} /> Modo Pré-visualização da Reserva
            </h4>
            <p className="text-xs text-slate-500 mt-1 font-medium">Você está visualizando a proposta antes de ativá-la. Confirme abaixo para gerar o link.</p>
          </div>
          <div className="flex gap-3 shrink-0">
            <button 
              onClick={() => navigateTo('cadastrar-reserva')}
              className="bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs px-5 py-3 rounded-xl transition border border-slate-200"
            >
              Editar Cadastro
            </button>
            <button 
              onClick={handlePublish}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-3 rounded-xl transition"
            >
              Confirmar e Publicar Proposta
            </button>
          </div>
        </div>
      )}

      <div className="w-full max-w-5xl mt-12">
        
        {/* Header proposal segment */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="bg-blue-600 text-white px-3.5 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest mb-4 inline-block">
              PROPOSTA DE RESERVA EXCLUSIVA BMW
            </span>
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 leading-tight">{data.title}</h1>
          </div>
          {data.laudoAprovado && (
            <div className="bg-emerald-50 border border-emerald-250 text-emerald-700 px-4 py-2 rounded-full flex items-center shrink-0 self-start md:self-auto">
              <Shield size={18} className="mr-2 text-emerald-600 animate-pulse" />
              <span className="font-bold text-xs uppercase tracking-wider">Veículo com Laudo Cautelar Verificado</span>
            </div>
          )}
        </div>

        {/* Countdown Urgency Block */}
        <div className="mb-10 bg-white border border-slate-200 p-6 rounded-3xl">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-bold text-slate-550 uppercase tracking-widest flex items-center gap-2">
              <Clock size={14} className="text-blue-600 animate-spin" style={{ animationDuration: '4s' }} />
              Tempo limite para garantir esta oferta exclusiva de showroom
            </span>
            <span className="font-mono text-3xl font-black text-slate-950">{formatTime(timeLeft)}</span>
          </div>
          <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden border border-slate-200">
            <div className="bg-blue-600 h-full transition-all duration-1000 ease-linear" style={{ width: `${progressPercent}%` }}></div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* Gallery and Car specs */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white rounded-3xl p-4 flex flex-col items-center relative overflow-hidden border border-slate-200">
              
              <div className="w-full h-64 md:h-[400px] relative rounded-2xl overflow-hidden bg-slate-50 border border-slate-200">
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
                    className="absolute left-8 top-1/2 -translate-y-1/2 bg-white/90 text-slate-800 p-3 rounded-full border border-slate-200 cursor-pointer hover:bg-white transition"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button 
                    onClick={() => setCurrentPhotoIndex(prev => (prev + 1) % photosArray.length)} 
                    className="absolute right-8 top-1/2 -translate-y-1/2 bg-white/90 text-slate-800 p-3 rounded-full border border-slate-200 cursor-pointer hover:bg-white transition"
                  >
                    <ChevronRight size={20} />
                  </button>
                  <div className="flex space-x-2 mt-5 z-20">
                    {photosArray.map((_, index) => (
                      <button 
                        key={index}
                        onClick={() => setCurrentPhotoIndex(index)}
                        className={`w-2.5 h-2.5 rounded-full transition-all ${currentPhotoIndex === index ? 'bg-blue-600 w-6' : 'bg-slate-200 hover:bg-slate-300'}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="bg-white rounded-3xl p-8 border border-slate-200">
              <h3 className="text-xl font-bold mb-6 text-slate-900 tracking-tight">Ficha Técnica e Destaques</h3>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">Ano</span>
                  <span className="font-extrabold text-base text-slate-900">{data.anoText || 'N/D'}</span>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">Cor</span>
                  <span className="font-extrabold text-base text-slate-900">{data.corText || 'N/D'}</span>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">Câmbio</span>
                  <span className="font-extrabold text-base text-slate-900">{data.cambio || 'Automático'}</span>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">Motor</span>
                  <span className="font-extrabold text-base text-slate-900">{data.motorText || 'N/D'}</span>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-4 mb-8">
                <div className="w-full md:w-1/3 bg-slate-50 border border-slate-200 p-5 rounded-2xl flex flex-col justify-center">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">Média FIPE Oficial</span>
                  <span className="font-black text-xl text-slate-800">{formatCurrency(data.fipeValue)}</span>
                </div>
                {economia > 0 && (
                  <div className="w-full md:w-2/3 bg-blue-50 border border-blue-100 rounded-2xl p-5 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-blue-600 uppercase tracking-widest block mb-0.5">Oportunidade de Mercado</span>
                      <span className="font-black text-lg text-slate-900">Abaixo da tabela oficial</span>
                    </div>
                    <span className="bg-blue-600 text-white font-extrabold text-xs px-3.5 py-2 rounded-full">
                      Você economiza {formatCurrency(economia)}
                    </span>
                  </div>
                )}
              </div>

              <h4 className="text-xs font-bold text-slate-550 uppercase tracking-widest mb-4">Opcionais inclusos</h4>
              <div className="flex flex-wrap gap-2">
                {data.opcionais.split(',').map((opt, i) => (
                  <span key={i} className="bg-slate-50 border border-slate-200 text-slate-700 px-4 py-2 rounded-full text-xs font-semibold">
                    {opt.trim()}
                  </span>
                ))}
              </div>

              {/* Concessionária info */}
              <div className="border-t border-slate-200 pt-6 mt-6">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-4">Sobre a Loja</h4>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Razão Social</span>
                    <span className="text-sm font-semibold text-slate-800">{empresaLogada?.nome || 'BMW Premium SP'}</span>
                  </div>
                  {empresaLogada?.cnpj && (
                    <div>
                      <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">CNPJ</span>
                      <span className="text-sm font-semibold text-slate-800">{empresaLogada.cnpj}</span>
                    </div>
                  )}
                  {empresaLogada?.email && (
                    <div>
                      <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">E-mail de Contato</span>
                      <span className="text-sm font-semibold text-slate-800">{empresaLogada.email}</span>
                    </div>
                  )}
                  {empresaLogada?.telefone && (
                    <div>
                      <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Telefone Comercial</span>
                      <span className="text-sm font-semibold text-slate-800">{empresaLogada.telefone}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Pricing Signal Booking card */}
          <div>
            <div className="bg-white rounded-3xl p-8 border border-slate-200 sticky top-24">
              <h3 className="text-2xl font-bold mb-4 text-slate-900 tracking-tight">Garantir Reserva</h3>
              <p className="text-sm font-medium text-slate-500 mb-8 leading-relaxed">
                Ao efetuar o sinal de garantia, este veículo é bloqueado imediatamente de visitas, testes e outros vendedores até você assinar o contrato final.
              </p>

              <div className="space-y-4 mb-8">
                <div className="flex justify-between items-center bg-slate-50 border border-slate-200 p-4 rounded-2xl">
                  <span className="text-slate-500 font-semibold text-xs uppercase tracking-wider">Valor do Carro</span>
                  <span className="font-extrabold text-base text-slate-900">{formatCurrency(data.valorVenda)}</span>
                </div>
                <div className="flex justify-between items-center bg-blue-50 border border-blue-100 p-4 rounded-2xl">
                  <span className="text-blue-600 font-bold text-xs uppercase tracking-wider">Sinal do PIX Requerido</span>
                  <span className="font-black text-2xl text-blue-900">{formatCurrency(data.sinal)}</span>
                </div>
              </div>

              <div className="mb-8">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Atendente Dedicado</label>
                <select 
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-4 py-4 text-[15px] font-semibold text-slate-800 focus:border-slate-900 outline-none appearance-none cursor-pointer"
                  value={selectedVendedor}
                  onChange={(e) => setSelectedVendedor(e.target.value)}
                >
                  <option value="" className="bg-white text-slate-500">Selecione seu vendedor...</option>
                  {(data.vendedores ? data.vendedores.split(',') : []).map((v, i) => (
                    <option key={i} value={v.trim()} className="bg-white text-slate-800">{v.trim()}</option>
                  ))}
                </select>
              </div>

              <button 
                disabled={timeLeft === 0 || !selectedVendedor}
                onClick={() => setShowPixModal(true)}
                className={`w-full font-bold text-base py-4 rounded-full transition-all duration-300 flex justify-center items-center ${
                  (timeLeft === 0 || !selectedVendedor)
                  ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {timeLeft === 0 ? 'Proposta Expirada' : 'Confirmar Reserva e ir para o PIX'}
              </button>
            </div>
          </div>
        </div>
      </div>

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

// --- NEW: MOBILE CLIENT VIEW (PREMIUM SMARTPHONE SIMULATOR) ---
function MobileClientView({ 
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
  previewOrigin
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

  const isPrePublish = reservation && !recentReservations.some((r: any) => r.id === reservation.id);

  const handlePublish = () => {
    if (reservasUsadas >= totalReservasPlano) {
      showToast('Limite de links do plano atingido pela concessionária.', 'error');
      return;
    }
    setRecentReservations([reservation, ...recentReservations]);
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
    navigateTo('dashboard');
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
    <div className="min-h-screen bg-[#f8f9fa] py-12 flex justify-center relative items-center px-4">
      <button 
        onClick={() => navigateTo(isPrePublish ? 'cadastrar-reserva' : previewOrigin)} 
        className="absolute top-6 left-6 text-slate-600 hover:text-slate-900 font-semibold flex items-center text-sm transition z-20 bg-white border border-slate-200 px-4 py-2 rounded-xl"
      >
        <ChevronLeft size={16} className="mr-1"/> {isPrePublish ? 'Voltar para o Cadastro' : 'Voltar ao Painel'}
      </button>

      {isPrePublish && (
        <div className="absolute top-6 right-6 bg-white border border-slate-200 p-5 rounded-2xl flex flex-col justify-between items-center gap-3 z-20 w-64">
          <div className="text-center">
            <h4 className="font-extrabold text-xs text-slate-900">Visualização Mobile</h4>
            <p className="text-[10px] text-slate-550 mt-1 font-semibold leading-relaxed">Confirme a proposta abaixo para salvá-la no painel.</p>
          </div>
          <button 
            onClick={handlePublish}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] py-3 rounded-xl transition text-center"
          >
            Confirmar e Publicar
          </button>
        </div>
      )}

      {/* Realistic Mobile Device Container Frame */}
      <div className="w-[390px] h-[820px] bg-slate-950 rounded-[48px] shadow-2xl overflow-hidden relative border-[8px] border-slate-800 flex flex-col scale-95 md:scale-100">
        
        {/* Notch dynamic simulated island */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-32 h-5 bg-black rounded-full z-[60] flex items-center justify-center">
          <div className="w-2.5 h-2.5 bg-slate-900 rounded-full ml-auto mr-3 border border-slate-800"></div>
        </div>

        {/* Mobile App View Header */}
        <div className="bg-white text-slate-900 px-5 pt-10 pb-4 flex justify-between items-center shrink-0 border-b border-slate-200">
          <div className="flex items-center">
            <ArrowLeft size={20} className="mr-3 cursor-pointer text-slate-850" onClick={() => navigateTo(isPrePublish ? 'cadastrar-reserva' : previewOrigin)} />
            <h2 className="text-base font-bold">Proposta de Showroom</h2>
          </div>
          <Share size={18} className="cursor-pointer text-slate-850" />
        </div>

        {/* Scrollable container on phone view */}
        <div className="flex-1 overflow-y-auto pb-24 bg-white">
          
          {/* Photos and Indicators */}
          <div className="relative w-full h-56 bg-slate-50 overflow-hidden shrink-0">
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
            
            <div className="absolute top-4 right-4 bg-emerald-600 text-white text-[10px] font-black px-2.5 py-1.5 rounded-full flex items-center z-20">
              <span className="w-1.5 h-1.5 bg-white rounded-full mr-1 animate-pulse"></span>
              VERIFICADO
            </div>
            
            {photosArray.length > 1 && (
              <div className="absolute bottom-4 left-0 w-full flex justify-center space-x-1.5 z-20">
                {photosArray.map((_, idx) => (
                  <div 
                    key={idx}
                    className={`h-1 rounded-full cursor-pointer transition-all ${currentPhotoIndex === idx ? 'w-4 bg-blue-600' : 'w-1 bg-slate-300'}`}
                  ></div>
                ))}
              </div>
            )}
          </div>

          <div className="px-5 pt-6 pb-4">
            {data.laudoAprovado && (
              <div className="mb-3 flex items-center text-emerald-700 bg-emerald-50 w-max px-3 py-1 rounded-full border border-emerald-200 text-[10px] font-black">
                <Shield size={12} className="mr-1.5 text-emerald-600" />
                LAUDO CAUTELAR TOTALMENTE APROVADO
              </div>
            )}
            
            <h1 className="text-2xl font-extrabold text-slate-900 mb-1 tracking-tight leading-tight">{data.title}</h1>
            <p className="text-xs text-slate-550 mb-4 font-semibold">
              {data.anoText || '2024'} • {data.km || '0 km'} • {data.corText || 'Preto'} • {data.cambio || 'Automático'}
            </p>
            
            <div className="flex items-center mb-6 gap-3">
              <span className="text-2xl font-black text-slate-900">{formatCurrency(data.valorVenda)}</span>
              {economiaPct > 0 && (
                <span className="bg-blue-50 text-blue-600 text-[10px] font-bold px-2.5 py-1 rounded-full border border-blue-100">
                  {economiaPct}% abaixo FIPE
                </span>
              )}
            </div>

            {/* Countdown widget */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-6">
              <h3 className="text-[10px] font-bold uppercase tracking-widest mb-1 text-slate-500">RESERVADO EXCLUSIVAMENTE PARA VOCÊ</h3>
              <div className="flex justify-between items-end mb-3">
                <span className="text-3xl font-black leading-none font-mono text-slate-900">{formatTimeFull(timeLeft)}</span>
                <span className="bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase">ATIVO</span>
              </div>
              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden border border-slate-300">
                 <div className="bg-blue-600 h-full" style={{ width: `${progressPercent}%` }}></div>
              </div>
              <p className="text-[10px] text-slate-500 font-semibold mt-1">4 clientes estão visualizando este link agora</p>
            </div>

            {/* Tabs Bar */}
            <div className="flex border-b border-slate-200 mb-6 bg-white shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('veiculo')}
                className={`flex-1 pb-3 text-xs font-black text-center border-b-2 transition ${
                  activeTab === 'veiculo'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-400 hover:text-slate-650'
                }`}
              >
                VEÍCULO
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('ficha')}
                className={`flex-1 pb-3 text-xs font-black text-center border-b-2 transition ${
                  activeTab === 'ficha'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-400 hover:text-slate-650'
                }`}
              >
                FICHA
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('atividade')}
                className={`flex-1 pb-3 text-xs font-black text-center border-b-2 transition ${
                  activeTab === 'atividade'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-400 hover:text-slate-650'
                }`}
              >
                ATIVIDADE
              </button>
            </div>

            {/* ABA: VEÍCULO */}
            {activeTab === 'veiculo' && (
              <div className="space-y-6 animate-fadeIn text-left">
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                    <span className="block text-[10px] text-slate-500 mb-0.5 font-bold uppercase tracking-wider">Combustível</span>
                    <span className="block text-xs font-bold text-slate-900">{data.combustivel || 'Flex'}</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                    <span className="block text-[10px] text-slate-500 mb-0.5 font-bold uppercase tracking-wider">Quilometragem</span>
                    <span className="block text-xs font-bold text-slate-900">{data.km || 'N/A'}</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                    <span className="block text-[10px] text-slate-500 mb-0.5 font-bold uppercase tracking-wider">Cor Externa</span>
                    <span className="block text-xs font-bold text-slate-900">{data.corText || 'N/A'}</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                    <span className="block text-[10px] text-slate-500 mb-0.5 font-bold uppercase tracking-wider">Câmbio</span>
                    <span className="block text-xs font-bold text-slate-900">{data.cambio || 'N/A'}</span>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mt-4 text-left">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-2">Atendente Dedicado</h4>
                  <div className="space-y-4">
                    <div className="relative">
                      <select 
                        value={selectedAtendente} 
                        onChange={(e) => {
                          setSelectedAtendente(e.target.value);
                          data.vendedores = e.target.value;
                        }} 
                        className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:border-slate-850 transition appearance-none bg-no-repeat bg-[right_1rem_center] bg-[length:1em]"
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
                        setShowPixModal(true);
                      }}
                      className="w-full bg-blue-600 hover:bg-blue-750 text-white font-bold text-sm py-4 rounded-xl flex items-center justify-center transition"
                    >
                      Confirmar Reserva e ir para o PIX
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ABA: FICHA */}
            {activeTab === 'ficha' && (
              <div className="space-y-6 animate-fadeIn text-left">
                {/* Ficha Técnica Detail List */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-2">Ficha Técnica</h4>
                  <div className="flex justify-between text-xs py-1 border-b border-slate-200">
                    <span className="text-slate-500 font-bold">Marca</span>
                    <span className="font-extrabold text-slate-800">{data.marcaText || data.title.split(' ')[0]}</span>
                  </div>
                  <div className="flex justify-between text-xs py-1 border-b border-slate-200">
                    <span className="text-slate-500 font-bold">Modelo</span>
                    <span className="font-extrabold text-slate-800">{data.modeloText || data.title.split(' ').slice(1).join(' ')}</span>
                  </div>
                  <div className="flex justify-between text-xs py-1 border-b border-slate-200">
                    <span className="text-slate-500 font-bold">Ano</span>
                    <span className="font-extrabold text-slate-800">{data.anoText}</span>
                  </div>
                  <div className="flex justify-between text-xs py-1 border-b border-slate-200">
                    <span className="text-slate-500 font-bold">Motorização</span>
                    <span className="font-extrabold text-slate-800">{data.motorText}</span>
                  </div>
                  <div className="flex justify-between text-xs py-1">
                    <span className="text-slate-500 font-bold">Cor</span>
                    <span className="font-extrabold text-slate-800">{data.corText}</span>
                  </div>
                </div>

                {/* Opcionais do veículo */}
                <div>
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-3">Opcionais inclusos</h4>
                  <div className="flex flex-wrap gap-2">
                    {data.opcionais ? data.opcionais.split(',').map((opc: string, idx: number) => (
                      <span key={idx} className="bg-slate-50 text-slate-700 text-[10px] font-black px-3 py-1.5 rounded-xl border border-slate-200">
                        {opc.trim()}
                      </span>
                    )) : (
                      <span className="text-xs text-slate-500 font-semibold">Nenhum opcional cadastrado.</span>
                    )}
                  </div>
                </div>

                {/* Concessionária info */}
                <div className="border-t border-slate-200 pt-6 mt-6">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-3">Sobre a Loja</h4>
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                    <div>
                      <span className="block text-[8px] text-slate-500 font-black uppercase tracking-widest">Razão Social</span>
                      <span className="text-xs font-semibold text-slate-800">{empresaLogada?.nome || 'BMW Premium SP'}</span>
                    </div>
                    {empresaLogada?.cnpj && (
                      <div>
                        <span className="block text-[8px] text-slate-500 font-black uppercase tracking-widest">CNPJ</span>
                        <span className="text-xs font-semibold text-slate-800">{empresaLogada.cnpj}</span>
                      </div>
                    )}
                    {empresaLogada?.email && (
                      <div>
                        <span className="block text-[8px] text-slate-500 font-black uppercase tracking-widest">E-mail de Contato</span>
                        <span className="text-xs font-semibold text-slate-800">{empresaLogada.email}</span>
                      </div>
                    )}
                    {empresaLogada?.telefone && (
                      <div>
                        <span className="block text-[8px] text-slate-500 font-black uppercase tracking-widest">Telefone Comercial</span>
                        <span className="text-xs font-semibold text-slate-800">{empresaLogada.telefone}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ABA: ATIVIDADE */}
            {activeTab === 'atividade' && (
              <div className="space-y-6 animate-fadeIn text-left">
                <h3 className="text-[11px] font-black mb-6 text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock size={14} className="text-blue-600" />
                  Linha do Tempo de Atividade
                </h3>
                
                <div className="relative pl-6 ml-2 space-y-8">
                  {/* Linha vertical cinza estática traseira */}
                  <div className="absolute left-[3px] top-2 bottom-2 w-0.5 bg-slate-100"></div>
                  {/* Linha vertical azul animada frontal */}
                  <div 
                    className="absolute left-[3px] top-2 w-0.5 bg-blue-600 transition-all duration-[1200ms] ease-out origin-top"
                    style={{ 
                      height: animateTimeline ? '78%' : '0%' 
                    }}
                  ></div>

                  {/* 1. Vitrine Ativada */}
                  <div className="relative">
                    <div className={`absolute -left-[26px] top-1.5 w-3 h-3 rounded-full bg-blue-600 border-2 border-white transition-all duration-500 transform ${
                      animateTimeline ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
                    }`} style={{ transitionDelay: '100ms' }}></div>
                    
                    <div className={`flex justify-between items-start gap-2 transition-all duration-500 transform ${
                      animateTimeline ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0'
                    }`} style={{ transitionDelay: '200ms' }}>
                      <div>
                        <h4 className="text-xs font-black text-slate-900">Vitrine Ativada</h4>
                        <p className="text-[10.5px] text-slate-500 font-semibold mt-1 leading-relaxed">
                          O link exclusivo do veículo foi gerado e enviado para o cliente.
                        </p>
                      </div>
                      <span className="text-[9px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded uppercase tracking-wider shrink-0">T+0min</span>
                    </div>
                  </div>

                  {/* 2. Tabela FIPE */}
                  <div className="relative">
                    <div className={`absolute -left-[26px] top-1.5 w-3 h-3 rounded-full bg-blue-600 border-2 border-white transition-all duration-500 transform ${
                      animateTimeline ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
                    }`} style={{ transitionDelay: '400ms' }}></div>
                    
                    <div className={`flex justify-between items-start gap-2 transition-all duration-500 transform ${
                      animateTimeline ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0'
                    }`} style={{ transitionDelay: '500ms' }}>
                      <div>
                        <h4 className="text-xs font-black text-slate-900">Atualização da Tabela FIPE</h4>
                        <p className="text-[10.5px] text-slate-500 font-semibold mt-1 leading-relaxed">
                          Tabela FIPE oficial carregada: Preço exclusivo tem margem de R$ 5.000,00 de desconto!
                        </p>
                      </div>
                      <span className="text-[9px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded uppercase tracking-wider shrink-0">T+30min</span>
                    </div>
                  </div>

                  {/* 3. Vídeo */}
                  <div className="relative">
                    <div className={`absolute -left-[26px] top-1.5 w-3 h-3 rounded-full bg-blue-600 border-2 border-white transition-all duration-500 transform ${
                      animateTimeline ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
                    }`} style={{ transitionDelay: '700ms' }}></div>
                    
                    <div className={`flex justify-between items-start gap-2 transition-all duration-500 transform ${
                      animateTimeline ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0'
                    }`} style={{ transitionDelay: '800ms' }}>
                      <div>
                        <h4 className="text-xs font-black text-slate-900">Tour de Vídeo Adicionado</h4>
                        <p className="text-[10.5px] text-slate-500 font-semibold mt-1 leading-relaxed">
                          Vídeo completo do laudo estrutural e partida a frio foi disponibilizado.
                        </p>
                      </div>
                      <span className="text-[9px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded uppercase tracking-wider shrink-0">T+60min</span>
                    </div>
                  </div>

                  {/* 4. Eventos Futuros */}
                  <div className="relative">
                    <div className={`absolute -left-[26px] top-1.5 w-3 h-3 rounded-full bg-slate-200 border-2 border-white transition-all duration-500 transform ${
                      animateTimeline ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
                    }`} style={{ transitionDelay: '1000ms' }}></div>
                    
                    <div className={`transition-all duration-500 transform ${
                      animateTimeline ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0'
                    }`} style={{ transitionDelay: '1100ms' }}>
                      <h4 className="text-xs font-bold text-slate-400 italic">Eventos Futuros Agendados pelo Lojista...</h4>
                      <p className="text-[10.5px] text-slate-400 font-medium mt-1 leading-relaxed italic font-semibold">
                        Automatizações complementares estão escalonadas baseadas no seu tempo ativo.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Garantir Reserva Info Box */}
            <div className="p-5 border-t border-slate-150 bg-slate-50 text-left -mx-5 -mb-4 mt-8">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="text-blue-600 shrink-0" size={16} />
                <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-wider">Garantir Reserva</h4>
              </div>
              <p className="text-[10px] text-slate-550 font-semibold leading-relaxed">
                Ao efetuar o sinal de garantia, este veículo é bloqueado imediatamente de visitas, testes e outros vendedores até você assinar o contrato final.
              </p>
            </div>

          </div>
        </div>

        {/* Bottom Fixed Sticky Action Bar in phone emulator */}
        <div className="absolute bottom-0 left-0 w-full bg-white border-t border-slate-200 p-4 flex items-center justify-between space-x-3 z-50 text-black">
          <button 
            onClick={() => {
              if (!selectedAtendente) {
                showToast('Por favor, selecione seu atendente para prosseguir.', 'error');
                return;
              }
              setShowPixModal(true);
            }}
            className="flex-1 bg-blue-600 text-white font-bold text-sm py-4 rounded-2xl flex items-center justify-center hover:bg-blue-700 transition-colors"
          >
            Reservar com PIX <ArrowRight size={16} className="ml-2" />
          </button>
          <button className="w-14 h-14 bg-white border border-slate-250 rounded-2xl flex items-center justify-center text-slate-800 hover:bg-slate-50 transition-colors">
            <Heart size={20} />
          </button>
        </div>
        
      </div>
      
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
    <div className={`bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col h-[280px] ${embeddedInMobile ? 'h-[250px]' : ''}`}>
      <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
          <MessageCircle size={12} className="text-blue-600" />
          Fale com o Atendente Dedicado
        </span>
        <span className="text-[9px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">ONLINE</span>
      </div>

      {/* Messages Pane */}
      <div className="flex-1 p-3 overflow-y-auto space-y-3 bg-slate-50/50 scrollbar-thin">
        {messages.map(msg => (
          <div key={msg.id} className={`max-w-[85%] rounded-xl px-3 py-2 text-xs font-medium leading-relaxed ${msg.sender === 'seller' ? 'bg-slate-200 text-slate-800 self-start' : 'bg-blue-600 text-white ml-auto'}`}>
            <p>{msg.text}</p>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* Sending Form */}
      <form onSubmit={handleSend} className="p-2 border-t border-slate-200 bg-white flex items-center gap-2">
        <input 
          type="text" 
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Envie uma pergunta..."
          className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-slate-950 transition"
        />
        <button type="submit" className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shrink-0 hover:bg-blue-700 transition">
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
      <div className="bg-white w-full max-w-md rounded-3xl p-8 relative border border-slate-200">
        
        {status === 'waiting' ? (
          <>
            <button onClick={onClose} className="absolute top-6 right-6 bg-slate-100 p-2.5 rounded-full hover:bg-slate-200 transition text-slate-650 border border-slate-200">
              <X size={16} />
            </button>
            
            <div className="text-center mb-6 pt-2">
              <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">Pagamento do Sinal</h3>
              <p className="text-xs font-semibold text-slate-500 mt-2">
                Atendimento direcionado com: <strong className="text-blue-600">{vendedor}</strong>
              </p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-5 text-center border border-slate-200 mb-6">
              <span className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">SINAL REQUERIDO</span>
              <span className="text-3xl font-black text-slate-900">{formatCurrency(sinal)}</span>
            </div>

            {/* Dynamic Simulated Stylized QR Code Component */}
            <div className="flex justify-center mb-6">
              <div className="bg-white border-2 border-slate-200 p-4 rounded-2xl flex items-center justify-center">
                 <svg width="140" height="140" viewBox="0 0 100 100" fill="black" xmlns="http://www.w3.org/2000/svg">
                    {/* Top Left Finder Pattern */}
                    <rect x="5" y="5" width="25" height="25" fill="#1e1b4b"/>
                    <rect x="10" y="10" width="15" height="15" fill="white"/>
                    <rect x="13" y="13" width="9" height="9" fill="#1e1b4b"/>
                    
                    {/* Top Right Finder Pattern */}
                    <rect x="70" y="5" width="25" height="25" fill="#1e1b4b"/>
                    <rect x="75" y="10" width="15" height="15" fill="white"/>
                    <rect x="78" y="13" width="9" height="9" fill="#1e1b4b"/>
                    
                    {/* Bottom Left Finder Pattern */}
                    <rect x="5" y="70" width="25" height="25" fill="#1e1b4b"/>
                    <rect x="10" y="75" width="15" height="15" fill="white"/>
                    <rect x="13" y="78" width="9" height="9" fill="#1e1b4b"/>
                    
                    {/* Mock Randomized Data Blocks */}
                    <rect x="40" y="10" width="8" height="8" fill="#1e1b4b"/>
                    <rect x="55" y="15" width="6" height="12" fill="#312e81"/>
                    <rect x="42" y="35" width="16" height="10" fill="#1e1b4b"/>
                    <rect x="10" y="45" width="12" height="12" fill="#312e81"/>
                    <rect x="55" y="55" width="10" height="10" fill="#1e1b4b"/>
                    <rect x="75" y="45" width="12" height="6" fill="#312e81"/>
                    <rect x="40" y="75" width="14" height="14" fill="#1e1b4b"/>
                    <rect x="75" y="75" width="15" height="15" fill="#312e81"/>
                 </svg>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Pix Copia e Cola</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  readOnly 
                  value={pixHash}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-medium text-slate-700 outline-none truncate"
                />
                <button 
                  onClick={handleCopy}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl px-5 py-3 transition flex items-center gap-1 shrink-0"
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
              className="w-full bg-white hover:bg-slate-50 text-slate-850 border border-slate-200 font-bold text-xs rounded-xl py-3.5 transition"
            >
              Simular Confirmação de Pagamento PIX
            </button>
          </>
        ) : (
          <div className="text-center py-6">
            <div className="w-20 h-20 bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={40} className="text-emerald-600 animate-bounce" />
            </div>
            <h3 className="text-3xl font-black mb-3 text-slate-900 tracking-tight">Reserva Confirmada!</h3>
            <p className="text-sm font-medium text-slate-500 mb-8 leading-relaxed px-2">
              O sinal foi processado com sucesso. O veículo foi travado e retirado da vitrine comercial do showroom para seu fechamento presencial presencial.
            </p>
            <button 
              onClick={onClose}
              className="bg-blue-600 text-white font-bold text-sm rounded-full px-12 py-4 hover:bg-blue-700 transition"
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
function CadastroReservaClienteView({ navigateTo, showToast, setActiveReservation, empresaLogada, totalReservasPlano = 30, reservasUsadas = 0 }) {
  if (reservasUsadas >= totalReservasPlano) {
    return (
      <div className="pt-28 pb-20 px-4 max-w-md mx-auto text-center">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
          <h2 className="text-xl font-black text-slate-900 mb-2">Limite de Propostas Atingido</h2>
          <p className="text-slate-500 text-xs mb-6 font-medium">Seu plano atual permite até {totalReservasPlano} propostas ativas em paralelo. Realize o upgrade para continuar cadastrando.</p>
          <button onClick={() => navigateTo('configuracoes')} className="w-full bg-blue-600 hover:bg-blue-750 text-white font-bold py-3.5 rounded-xl transition text-sm">Fazer Upgrade do Plano</button>
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

  const [vehicleData, setVehicleData] = useState<any>({
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

  const [sinal, setSinal] = useState(empresaLogada?.valorMinimoSinal ? String(empresaLogada.valorMinimoSinal) : '');
  const [expiracao, setExpiracao] = useState(60);

  useEffect(() => {
    if (vehicleData.sinal) {
      setSinal(String(vehicleData.sinal));
    } else if (empresaLogada?.valorMinimoSinal && !sinal) {
      setSinal(String(empresaLogada.valorMinimoSinal));
    }
    if (vehicleData.expiracaoMinutos) {
      setExpiracao(vehicleData.expiracaoMinutos);
    }
  }, [vehicleData.sinal, vehicleData.expiracaoMinutos, empresaLogada?.valorMinimoSinal]);

  const formatExpiracaoLabel = (minutos: number): string => {
    if (minutos < 60) return `${minutos} minutos`;
    const horas = Math.floor(minutos / 60);
    const minsRestantes = minutos % 60;
    if (minsRestantes === 0) {
      return horas === 1 ? '1 hora' : `${horas} horas`;
    }
    return `${horas} ${horas === 1 ? 'hora' : 'horas'} e ${minsRestantes} minutos`;
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
      title: `${vehicleData.brand} ${vehicleData.model} ${vehicleData.version}`.trim(),
      created: new Date().toLocaleString('pt-BR'),
      duration: String(vehicleData.expiracaoMinutos || 60),
      expiracao: Number(vehicleData.expiracaoMinutos || 60),
      signal: Number(vehicleData.sinal || 0),
      sinal: Number(vehicleData.sinal || 0),
      marcaText: vehicleData.brand,
      modeloText: vehicleData.model,
      anoText: vehicleData.year,
      corText: vehicleData.color,
      motorText: vehicleData.fuel,
      fipeValue: vehicleData.fipePrice,
      valorVenda: parseFloat(vehicleData.price) || vehicleData.fipePrice,
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

  const inputClass = "w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3.5 text-sm font-bold text-slate-800 outline-none focus:border-black transition";
  const labelClass = "block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2";

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-slate-900 pt-28 pb-20 px-4 md:px-8">
      <div className="max-w-4xl mx-auto">
        
        {/* Progress Tracker bar */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm mb-6">
          <div className="flex justify-between items-center text-xs font-bold mb-4 text-slate-500 uppercase tracking-widest">
            <span className="text-xl font-black text-black tracking-tight">Criar Proposta de Reserva</span>
            <span>Fluxo do Cliente</span>
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
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white ${step >= s.num ? 'bg-blue-600' : 'bg-slate-200'}`}>
                    {step > s.num ? '✓' : s.num}
                  </span>
                  <span className="font-bold text-[10px] text-slate-600 hidden md:inline">{s.label}</span>
                </div>
                <div className={`h-1 w-full rounded-full ${step >= s.num ? 'bg-blue-600' : 'bg-slate-200'}`}></div>
              </div>
            ))}
          </div>
        </div>

        {/* Form Container */}
        <div className="bg-white rounded-3xl p-6 md:p-10 border border-slate-200 shadow-md min-h-[460px] flex flex-col justify-between relative overflow-hidden">
          {isFipeLoading && marcas.length === 0 && (
            <div className="absolute inset-0 bg-white/75 backdrop-blur-sm flex items-center justify-center gap-2 text-indigo-600 font-bold z-35">
              <RefreshCw className="animate-spin" size={20} /> Carregando base FIPE...
            </div>
          )}

          <div>
            {/* STEP 1: BUSCA FIPE */}
            {step === 1 && (
              <div className="max-w-xl mx-auto w-full text-center py-4">
                <h2 className="text-2xl font-black text-black mb-2 tracking-tight">Selecione a fipe do veiculo</h2>
                <p className="text-slate-500 text-xs mb-8 font-medium">Consulte em tempo real as informações oficiais da FIPE para preencher seu anúncio.</p>
                
                <div className="text-left space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Marca</label>
                      {isFipeLoading && marcas.length === 0 && (
                        <span className="text-[10px] text-blue-600 font-bold flex items-center gap-1">
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
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Modelo</label>
                      {isModelosLoading && (
                        <span className="text-[10px] text-blue-600 font-bold flex items-center gap-1">
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
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Ano / Versão</label>
                      {isAnosLoading && (
                        <span className="text-[10px] text-blue-600 font-bold flex items-center gap-1">
                          <RefreshCw size={10} className="animate-spin" /> Carregando versões...
                        </span>
                      )}
                      {isPrecoLoading && (
                        <span className="text-[10px] text-blue-600 font-bold flex items-center gap-1">
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
              <div className="max-w-xl mx-auto w-full py-4 text-left">
                <h2 className="text-2xl font-black text-black mb-2 text-center tracking-tight">Qual o preço e quilometragem do veículo?</h2>
                <p className="text-slate-500 text-xs mb-8 text-center font-medium">Informe a quilometragem atual e compare os valores oficiais.</p>

                <div className="space-y-6">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className={labelClass}>Quilometragem (KM)</label>
                      <input 
                        type="text" 
                        name="km" 
                        value={vehicleData.km} 
                        onChange={handleInputChange} 
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
                        name="price" 
                        value={vehicleData.price} 
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          setVehicleData(prev => ({ ...prev, price: val }));
                        }} 
                        className={inputClass} 
                        placeholder="Ex: 85000"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className={labelClass}>Valor do sinal (R$) *</label>
                      <input 
                        type="text" 
                        name="sinal" 
                        value={sinal} 
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          setSinal(val);
                          setVehicleData(prev => ({ ...prev, sinal: val }));
                        }} 
                        className={inputClass} 
                        placeholder="Ex: 1500"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className={labelClass}>Expiração da reserva *</label>
                        <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                          {formatExpiracaoLabel(expiracao)}
                        </span>
                      </div>
                      <div className="relative pt-2">
                        <input 
                          type="range" 
                          min="15" 
                          max="360" 
                          step="15" 
                          value={expiracao} 
                          onChange={(e) => setExpiracao(Number(e.target.value))} 
                          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none"
                        />
                        <div className="flex justify-between text-[9px] text-slate-400 font-bold px-1 mt-2 select-none">
                          <span>15m</span>
                          <span>1h</span>
                          <span>2h</span>
                          <span>3h</span>
                          <span>4h</span>
                          <span>5h</span>
                          <span>6h</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Resumo financeiro limpo */}
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
                    <div className="flex justify-between items-center text-xs font-semibold text-slate-600">
                      <span>Preço FIPE Lido</span>
                      <span className="font-bold text-black font-mono">{formatCurrency(vehicleData.fipePrice || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center border-t border-slate-200 pt-3 text-xs font-semibold text-slate-600">
                      <span>Preço do Veículo Escolhido</span>
                      <span className="font-black text-blue-600 text-sm font-mono">{formatCurrency(parseFloat(vehicleData.price) || 0)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: OPCIONAIS */}
            {step === 3 && (
              <div className="max-w-3xl mx-auto w-full text-center py-4">
                <h2 className="text-2xl font-black text-black mb-2 tracking-tight">Informe os opcionais do seu veículo</h2>
                <p className="text-slate-500 text-xs mb-8 font-medium">Selecione os diferenciais do veículo que chamam a atenção dos compradores de showroom.</p>
                
                <div className="flex flex-wrap justify-center gap-2.5 max-w-2xl mx-auto">
                  {[...opcionaisPool, ...customOpcionais].map((opc, idx) => {
                    const isSelected = vehicleData.selectedOpcionais.includes(opc);
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleToggleOpcional(opc)}
                        className={`px-4 py-2.5 rounded-full text-xs font-bold border-2 transition-all flex items-center gap-1.5 ${
                          isSelected 
                            ? 'bg-slate-800 border-slate-800 text-white' 
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400 hover:bg-slate-50'
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
                    className="max-w-xs bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-blue-600 transition"
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
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition uppercase tracking-wider"
                  >
                    + Adicionar
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: FOTOS */}
            {step === 4 && (
              <div className="max-w-2xl mx-auto w-full text-center py-4">
                <h2 className="text-2xl font-black text-black mb-2 tracking-tight">Adicione as fotos do veículo</h2>
                <p className="text-slate-500 text-xs mb-8 font-medium">Boas fotos aumentam as chances de reserva em até 70%.</p>
                
                <div className="border-2 border-dashed border-slate-350 rounded-3xl p-6 hover:border-black transition bg-slate-50 cursor-pointer flex flex-col items-center">
                  <UploadCloud className="text-slate-450 mb-2" size={32} />
                  <span className="font-bold text-xs text-slate-800">Carregar fotos do veículo</span>
                  <span className="text-[10px] text-slate-400 mt-1">Formatos suportados: PNG, JPG, JPEG</span>
                  
                  <div className="mt-4 flex gap-2">
                    <button 
                      type="button"
                      onClick={() => addPresetPhoto('https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&w=800&q=80')}
                      className="bg-white border border-slate-300 hover:border-slate-400 text-[10px] font-black px-3 py-1.5 rounded-xl text-slate-700 transition"
                    >
                      + Preset Fiat CS
                    </button>
                    <button 
                      type="button"
                      onClick={() => addPresetPhoto('https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=800&q=80')}
                      className="bg-white border border-slate-300 hover:border-slate-400 text-[10px] font-black px-3 py-1.5 rounded-xl text-slate-700 transition"
                    >
                      + Preset Showroom
                    </button>
                  </div>
                </div>

                {vehicleData.photos.length > 0 && (
                  <div className="grid grid-cols-4 gap-2.5 max-w-md mx-auto mt-6">
                    {vehicleData.photos.map((url, i) => (
                      <div key={i} className="relative h-16 rounded-xl overflow-hidden border border-slate-200 group">
                        <img src={url} className="w-full h-full object-cover" />
                        <button 
                          type="button" 
                          onClick={() => removePhoto(i)}
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
              <div className="max-w-xl mx-auto w-full text-left py-4">
                <h2 className="text-2xl font-black text-black mb-2 text-center tracking-tight">Dados do Lead</h2>
                <p className="text-slate-500 text-xs mb-8 text-center font-medium">Informe os dados do lead para quem você enviará este link de reserva e sinal.</p>
                
                <div className="space-y-4">
                  <div>
                    <label className={labelClass}>Nome do Lead *</label>
                    <input type="text" name="fullName" value={vehicleData.fullName} onChange={handleInputChange} className={inputClass} placeholder="Ex: Allan Salgado" required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>CPF do Lead *</label>
                      <input type="text" name="cpf" value={vehicleData.cpf} onChange={handleInputChange} className={inputClass} placeholder="Ex: 370.875.668-14" required />
                    </div>
                    <div>
                      <label className={labelClass}>WhatsApp do Lead *</label>
                      <input type="text" name="phone" value={vehicleData.phone} onChange={handleInputChange} className={inputClass} placeholder="Ex: (11) 96840-3485" required />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
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
          <div className="flex justify-between items-center border-t border-slate-200 pt-6 mt-8">
            <button
              type="button"
              onClick={() => {
                if (step === 1) {
                  navigateTo('dashboard');
                } else {
                  setStep(prev => prev - 1);
                }
              }}
              className="flex items-center gap-1 text-slate-500 hover:text-black font-bold text-xs transition uppercase tracking-wider"
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
                className="bg-slate-900 hover:bg-black text-white font-bold text-xs px-6 py-3.5 rounded-xl flex items-center gap-1 transition"
              >
                Continuar <ChevronRight size={14} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePreviewRedirect}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-6 py-3.5 rounded-xl flex items-center gap-1 transition"
              >
                Visualizar Link de Reserva <ChevronRight size={14} />
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

// --- NEW COMPONENT: WIZARD FLOW "ASSINATURA CONCESSIONÁRIA" ---
function AssinaturaEmpresaView({ navigateTo, showToast, setTotalReservasPlano, setReservasUsadas, setEmpresaLogada }) {
  const [step, setStep] = useState(1);
  const [empresaData, setEmpresaData] = useState<any>({
    nome: '',
    cnpj: '',
    email: '',
    telefone: '',
    plano: 'Plus', // 'Basic', 'Plus', 'Premium'
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
    let basePrice = 239.90;
    if (empresaData.plano === 'Basic') basePrice = 159.90;
    if (empresaData.plano === 'Premium') basePrice = 349.90;
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

  const getPlanCredits = () => {
    if (empresaData.plano === 'Basic') return 10;
    if (empresaData.plano === 'Premium') return 50;
    return 30; // Plus
  };

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

  const handleFinalize = () => {
    if (!empresaData.nome || !empresaData.cnpj || !empresaData.email) {
      showToast('Por favor, preencha todos os campos obrigatórios da Concessionária.', 'error');
      return;
    }
    const credits = getPlanCredits();
    setTotalReservasPlano(credits);
    setReservasUsadas(0);
    setEmpresaLogada({
      nome: empresaData.nome,
      cnpj: empresaData.cnpj,
      email: empresaData.email,
      telefone: empresaData.telefone,
      plano: empresaData.plano,
      planoAtivo: empresaData.plano,
      valorMinimoSinal: 1500,
      endereco: empresaData.endereco || 'Endereço não informado',
      enderecoCobranca: empresaData.enderecoCobranca || empresaData.endereco || 'Endereço não informado',
      cep: empresaData.cep || '00000-000',
      ramos: empresaData.ramos.length > 0 ? empresaData.ramos : ['Geral'],
      estoque: Number(empresaData.estoque) || 0,
      vendedores: empresaData.vendedores.length > 0 ? empresaData.vendedores : [
        { id: 1, nome: 'Carla Silva', cargo: 'Consultora Premium', ativo: true, dataCadastro: '31/05/2026', linksGerados: 14, conversao: 64 },
        { id: 2, nome: 'Roberto Oliveira', cargo: 'Gerente de Vendas', ativo: true, dataCadastro: '24/05/2026', linksGerados: 28, conversao: 71 },
        { id: 3, nome: 'Marcos Souza', cargo: 'Consultor de Vendas', ativo: true, dataCadastro: '28/05/2026', linksGerados: 9, conversao: 56 }
      ]
    });
    showToast(`Assinatura realizada com sucesso! Você contratou o Plano ${empresaData.plano} com ${credits} créditos.`, 'success');
    navigateTo('hub');
  };

  const inputClass = "w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3.5 text-sm font-bold text-slate-800 outline-none focus:border-slate-900 transition";
  const labelClass = "block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2";

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-slate-900 pt-28 pb-20 px-4 md:px-8 relative">
      
      <div className="max-w-4xl mx-auto">
        {/* Progress Tracker bar */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-6">
          <div className="flex justify-between items-center text-xs font-bold mb-4 text-slate-500 uppercase tracking-widest">
            <span className="text-xl font-black text-slate-900 tracking-tight">Assinar Reservacar</span>
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
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white ${step >= s.num ? 'bg-blue-600' : 'bg-slate-200'}`}>
                    {step > s.num ? '✓' : s.num}
                  </span>
                  <span className="font-bold text-[10px] text-slate-500 hidden md:inline">{s.label}</span>
                </div>
                <div className={`h-1 w-full rounded-full ${step >= s.num ? 'bg-blue-600' : 'bg-slate-200'}`}></div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Content Box */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-10 min-h-[480px] flex flex-col justify-between">
          
          <div>
            {/* STEP 1: IDENTIFICACAO */}
            {step === 1 && (
              <div className="max-w-xl mx-auto w-full py-4 text-left">
                <h2 className="text-2xl font-black text-slate-900 mb-2 text-center tracking-tight">Identificação Corporativa</h2>
                <p className="text-slate-500 text-xs mb-8 text-center font-medium">Informe os dados da sua empresa ou concessionária para cadastro.</p>

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
                <h2 className="text-2xl font-black text-slate-900 mb-2 text-center tracking-tight">Dados Operacionais e Showroom</h2>
                <p className="text-slate-500 text-xs mb-8 text-center font-medium">Configure as informações operacionais essenciais da sua loja.</p>

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
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Endereço de Cobrança</label>
                      <button 
                        type="button" 
                        onClick={() => setEmpresaData(prev => ({ ...prev, enderecoCobranca: prev.endereco }))}
                        className="text-[10px] font-bold text-blue-600 hover:underline"
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
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
                                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
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
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 md:p-6 mt-4">
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Vendedores do Showroom</h3>
                    
                    <div className="flex flex-col md:flex-row gap-3 mb-4">
                      <div className="flex-1">
                        <input 
                          type="text" 
                          placeholder="Nome do Vendedor" 
                          value={novoVendedorNome} 
                          onChange={(e) => setNovoVendedorNome(e.target.value)} 
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 outline-none"
                        />
                      </div>
                      <div className="w-full md:w-48">
                        <select 
                          value={novoVendedorCargo} 
                          onChange={(e) => setNovoVendedorCargo(e.target.value)} 
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-850 outline-none"
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
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition"
                      >
                        + Adicionar
                      </button>
                    </div>

                    {empresaData.vendedores.length > 0 ? (
                      <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                        {empresaData.vendedores.map((v) => (
                          <div key={v.id} className="flex justify-between items-center bg-white border border-slate-200 px-3 py-2.5 rounded-xl text-xs font-bold">
                            <div>
                              <span className="text-slate-800">{v.nome}</span>
                              <span className="bg-slate-100 text-slate-500 text-[9px] px-2 py-0.5 rounded-full ml-2 uppercase">{v.cargo}</span>
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
                      <p className="text-[11px] text-slate-400 font-medium italic">Nenhum vendedor cadastrado ainda. O sistema carregará os 3 vendedores padrão como demonstração caso prossiga em branco.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: ESCOLHA DO PLANO */}
            {step === 3 && (
              <div className="w-full py-4 text-center">
                <h2 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">Escolha o plano de créditos ideal para sua concessionária</h2>
                <p className="text-slate-500 text-xs mb-8 font-medium">Selecione a quantidade de propostas ativas que deseja gerenciar em paralelo.</p>

                <div className="grid md:grid-cols-3 gap-5 max-w-3xl mx-auto">
                  {/* Basic */}
                  <div 
                    onClick={() => setEmpresaData(prev => ({ ...prev, plano: 'Basic' }))}
                    className={`bg-white border-2 rounded-2xl p-5 text-left cursor-pointer transition-all flex flex-col justify-between h-56 ${empresaData.plano === 'Basic' ? 'border-blue-600' : 'border-slate-200 opacity-60 hover:opacity-100'}`}
                  >
                    <div>
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">PLANO BASICO</span>
                      <h4 className="text-xl font-black text-slate-900 mt-1">Basic</h4>
                      <p className="text-2xl font-black text-slate-900 mt-3">R$ 159,90</p>
                      <p className="text-[10px] text-slate-500 font-bold">10 links de reserva ativos</p>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400">Recomendado para pequenas lojas</span>
                  </div>

                  {/* Plus */}
                  <div 
                    onClick={() => setEmpresaData(prev => ({ ...prev, plano: 'Plus' }))}
                    className={`bg-white border-2 rounded-2xl p-5 text-left cursor-pointer transition-all flex flex-col justify-between h-56 relative ${empresaData.plano === 'Plus' ? 'border-blue-600' : 'border-slate-200 opacity-60 hover:opacity-100'}`}
                  >
                    <span className="absolute -top-2.5 right-4 bg-blue-600 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">Mais Popular</span>
                    <div>
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">PLANO RECOMENDADO</span>
                      <h4 className="text-xl font-black text-slate-900 mt-1">Plus</h4>
                      <p className="text-2xl font-black text-slate-900 mt-3">R$ 239,90</p>
                      <p className="text-[10px] text-slate-500 font-bold">30 links de reserva ativos</p>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400">Melhor custo benefício</span>
                  </div>

                  {/* Premium */}
                  <div 
                    onClick={() => setEmpresaData(prev => ({ ...prev, plano: 'Premium' }))}
                    className={`bg-white border-2 rounded-2xl p-5 text-left cursor-pointer transition-all flex flex-col justify-between h-56 ${empresaData.plano === 'Premium' ? 'border-blue-600' : 'border-slate-200 opacity-60 hover:opacity-100'}`}
                  >
                    <div>
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">PLANO CORPORATIVO</span>
                      <h4 className="text-xl font-black text-slate-900 mt-1">Premium</h4>
                      <p className="text-2xl font-black text-slate-900 mt-3">R$ 349,90</p>
                      <p className="text-[10px] text-slate-500 font-bold">50 links de reserva ativos</p>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400">Exposição máxima do showroom</span>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: CHECKOUT PAGAMENTO */}
            {step === 4 && (
              <div className="max-w-2xl mx-auto w-full py-4">
                <h2 className="text-2xl font-black text-slate-900 text-center mb-6 tracking-tight">Forma de Pagamento da Assinatura</h2>
                
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="md:col-span-2 space-y-4 text-left">
                    <div 
                      onClick={() => setEmpresaData(prev => ({ ...prev, paymentMethod: 'credit_card' }))}
                      className={`bg-slate-50 border rounded-2xl p-4 flex items-center justify-between cursor-pointer transition-all ${empresaData.paymentMethod === 'credit_card' ? 'border-blue-600 bg-white' : 'border-slate-200'}`}
                    >
                      <div className="flex items-center gap-3">
                        <input type="radio" checked={empresaData.paymentMethod === 'credit_card'} onChange={() => {}} className="accent-blue-600 w-4 h-4" />
                        <div>
                          <h4 className="font-extrabold text-xs text-slate-900">Cartão de Crédito</h4>
                          <p className="text-[10px] text-slate-500">Liberação instantânea dos créditos</p>
                        </div>
                      </div>
                      <CreditCard className="text-slate-500" size={20} />
                    </div>

                    <div 
                      onClick={() => setEmpresaData(prev => ({ ...prev, paymentMethod: 'pix' }))}
                      className={`bg-slate-50 border rounded-2xl p-4 flex items-center justify-between cursor-pointer transition-all ${empresaData.paymentMethod === 'pix' ? 'border-blue-600 bg-white' : 'border-slate-200'}`}
                    >
                      <div className="flex items-center gap-3">
                        <input type="radio" checked={empresaData.paymentMethod === 'pix'} onChange={() => {}} className="accent-blue-600 w-4 h-4" />
                        <div className="flex items-center gap-1.5">
                          <div>
                            <h4 className="font-extrabold text-xs text-slate-900">Pix</h4>
                            <p className="text-[10px] text-slate-500">Aprovação em segundos</p>
                          </div>
                          <span className="bg-emerald-600 text-white text-[7px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest shrink-0 self-start">5% OFF</span>
                        </div>
                      </div>
                      <DollarSign className="text-slate-500" size={20} />
                    </div>

                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Possui cupom de desconto?</label>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          name="couponCode"
                          value={empresaData.couponCode}
                          onChange={handleInputChange}
                          placeholder="DIGITE O CUPOM"
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none uppercase"
                        />
                        <button 
                          type="button" 
                          onClick={applyCoupon}
                          className="bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs px-4 py-2 rounded-xl border border-slate-200 transition"
                        >
                          Aplicar
                        </button>
                      </div>
                      {empresaData.discountApplied && (
                        <p className="text-[10px] text-emerald-600 font-bold mt-1.5">✓ Cupom aplicado com sucesso!</p>
                      )}
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl text-left h-max">
                    <h4 className="text-[9px] font-bold text-slate-555 uppercase tracking-widest mb-3">Resumo da Assinatura</h4>
                    <div className="text-xs space-y-2 border-b border-slate-200 pb-3 mb-3">
                      <div className="flex justify-between text-slate-550">
                        <span>Plano:</span>
                        <span className="text-slate-900 font-bold">{empresaData.plano}</span>
                      </div>
                      <div className="flex justify-between text-slate-550">
                        <span>Créditos:</span>
                        <span className="text-slate-900 font-bold">{getPlanCredits()} links</span>
                      </div>
                      <div className="flex justify-between text-slate-550">
                        <span>Preço:</span>
                        <span className="text-slate-900 font-bold">{formatCurrency(getPlanPrice())}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-700">Total a pagar:</span>
                      <span className="text-lg font-black text-slate-900">{formatCurrency(getPlanPrice())}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Navigation */}
          <div className="flex justify-between items-center border-t border-slate-200 pt-6 mt-8">
            <button
              type="button"
              onClick={() => {
                if (step === 1) {
                  navigateTo('home');
                } else {
                  setStep(prev => prev - 1);
                }
              }}
              className="flex items-center gap-1 text-slate-550 hover:text-slate-900 font-bold text-xs transition uppercase tracking-wider"
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
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-6 py-3.5 rounded-xl flex items-center gap-1 transition"
              >
                Continuar <ChevronRight size={14} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinalize}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-6 py-3.5 rounded-xl flex items-center gap-1 transition"
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
function ConfiguracoesView({ navigateTo, showToast, empresaLogada, setEmpresaLogada, totalReservasPlano, setTotalReservasPlano, setPlanoUpgrade }) {
  const [formData, setFormData] = useState({
    nome: empresaLogada.nome || '',
    telefone: empresaLogada.telefone || '',
    valorMinimoSinal: empresaLogada.valorMinimoSinal || 1500,
    plano: empresaLogada.planoAtivo || 'Plus',
    endereco: empresaLogada.endereco || '',
    cep: empresaLogada.cep || ''
  });

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

    setEmpresaLogada(prev => ({
      ...prev,
      nome: formData.nome,
      telefone: formData.telefone,
      valorMinimoSinal: Number(formData.valorMinimoSinal),
      endereco: formData.endereco,
      cep: formData.cep
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
    <div className="min-h-screen bg-[#f8f9fa] pt-24 pb-12 px-4 md:px-12">
      <div className="max-w-[1600px] mx-auto">
        <div className="mb-8 text-left">
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Configurações do Lojista</h2>
          <p className="text-slate-500 text-sm mt-1 font-medium">Ajuste os parâmetros da sua loja e gerencie seu plano SaaS Autolock.</p>
        </div>

        <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          <div className="bg-white border border-slate-200 rounded-2xl p-6 text-left flex flex-col justify-between">
            <div>
              <div className="mb-6">
                <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider">
                  Dados da Loja / Perfil
                </span>
                <div className="h-px bg-slate-100 mt-2"></div>
              </div>

              <div className="space-y-5">
                <div>
                  <label htmlFor="nome" className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">
                    Nome da Loja Exibida na Vitrine
                  </label>
                  <input
                    type="text"
                    id="nome"
                    name="nome"
                    value={formData.nome}
                    onChange={handleInputChange}
                    placeholder="Ex: Veloce Premium Motors"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-slate-800 focus:bg-white rounded-xl px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition"
                  />
                </div>

                <div>
                  <label htmlFor="telefone" className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">
                    Número Oficial de WhatsApp do Lojista
                  </label>
                  <input
                    type="text"
                    id="telefone"
                    name="telefone"
                    value={formData.telefone}
                    onChange={handleInputChange}
                    placeholder="Ex: (11) 99999-8822"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-slate-800 focus:bg-white rounded-xl px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label htmlFor="endereco" className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">
                      Endereço Comercial da Loja
                    </label>
                    <input
                      type="text"
                      id="endereco"
                      name="endereco"
                      value={formData.endereco}
                      onChange={handleInputChange}
                      placeholder="Ex: Av. das Nações Unidas, 12345"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-slate-800 focus:bg-white rounded-xl px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition"
                    />
                  </div>
                  <div>
                    <label htmlFor="cep" className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">
                      CEP
                    </label>
                    <input
                      type="text"
                      id="cep"
                      name="cep"
                      value={formData.cep}
                      onChange={handleInputChange}
                      placeholder="Ex: 04578-000"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-slate-800 focus:bg-white rounded-xl px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="valorMinimoSinal" className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">
                    Valor Mínimo para Sinal Pix de Reserva (R$)
                  </label>
                  <input
                    type="number"
                    id="valorMinimoSinal"
                    name="valorMinimoSinal"
                    value={formData.valorMinimoSinal}
                    onChange={handleInputChange}
                    placeholder="Ex: 1500"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-slate-800 focus:bg-white rounded-xl px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition"
                  />
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100">
              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3.5 rounded-xl transition text-sm flex items-center justify-center gap-2"
              >
                Salvar Configurações
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 text-left flex flex-col justify-between">
            <div>
              <div className="mb-6">
                <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider">
                  Seu Plano SaaS Autolock
                </span>
                <div className="h-px bg-slate-100 mt-2"></div>
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
                          ? 'opacity-40 cursor-not-allowed pointer-events-none bg-slate-50 border-slate-200'
                          : isSelected
                            ? 'border-blue-600 bg-blue-50/40 cursor-pointer'
                            : 'border-slate-200 hover:border-slate-400 bg-white cursor-pointer opacity-40 hover:opacity-75'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded">
                              {plano.tag}
                            </span>
                            {plano.destaque && (
                              <span className="text-[9px] font-black text-blue-600 uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded">
                                Destaque
                              </span>
                            )}
                          </div>
                          <h4 className="text-sm font-black text-slate-900">{plano.nome}</h4>
                          <p className="text-xs text-slate-650 font-semibold">{plano.limite}</p>
                          <p className="text-[11px] text-slate-400 font-semibold">{plano.detalhe}</p>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <span className="block text-base font-black text-slate-900">{plano.preco}</span>
                            <span className="block text-[9px] text-slate-400 font-bold uppercase">/mês</span>
                          </div>

                          <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition ${
                            isSelected 
                              ? 'border-blue-600 bg-blue-600 text-white' 
                              : isDowngrade
                                ? 'border-slate-200 bg-slate-100 text-slate-400'
                                : 'border-slate-300 bg-white'
                          }`}>
                            {isSelected && <Check size={12} strokeWidth={3} />}
                          </div>
                        </div>
                      </div>

                      {/* Linha heurística para Upgrade com botão */}
                      {isSelected && isUpgrade && (
                        <div className="mt-4 pt-4 border-t border-slate-150 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 animate-fadeIn w-full">
                          <p className="text-[10px] text-slate-600 font-semibold leading-relaxed">
                            💡 Você selecionou um plano maior. Clique em upgrade para realizar o pagamento.
                          </p>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpgradeClick(plano.nome);
                            }}
                            className="bg-blue-600 hover:bg-blue-750 text-white font-bold text-[10px] px-4 py-2 rounded-xl transition uppercase tracking-wider shrink-0"
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

            <div className="mt-8 pt-4 border-t border-slate-100">
              <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                *Nota: No plano Premium/Enterprise, a plataforma retém 1,5% sobre o sinal PIX processado para fins de cobertura de infraestrutura de webhook e processamento de segurança.
              </p>
            </div>
          </div>

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

  // Mapeamento dos valores e limites dos planos
  const infoPlanos = {
    'Basic': { preco: 'R$ 159,90', valor: 159.90, limite: 10, descricao: 'Plano Básico - 10 links ativos' },
    'Plus': { preco: 'R$ 239,90', valor: 239.90, limite: 30, descricao: 'Plano Recomendado - 30 links ativos' },
    'Premium': { preco: 'R$ 349,90', valor: 349.90, limite: 50, descricao: 'Plano Corporativo - 50 links ativos' }
  };

  const planoInfo = infoPlanos[planoUpgrade] || infoPlanos['Plus'];

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
    <div className="min-h-screen bg-[#f8f9fa] pt-24 pb-12 px-4 sm:px-6 lg:px-8 text-slate-900">
      <div className="max-w-5xl mx-auto">
        
        {/* Header */}
        <div className="mb-8 text-left">
          <button 
            type="button"
            onClick={() => navigateTo('configuracoes')}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition mb-3 uppercase tracking-wider"
          >
            <ArrowLeft size={14} /> Voltar para Configurações
          </button>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Checkout de Assinatura SaaS</h2>
          <p className="text-slate-500 text-sm mt-1 font-medium">Finalize seu pagamento para liberar o limite do plano {planoUpgrade}.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-left">
          
          {/* Coluna Esquerda: Formulário de Pagamento */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <div className="mb-6">
                <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider">
                  Método de Pagamento
                </span>
                <div className="h-px bg-slate-100 mt-2"></div>
              </div>

              {/* Seletor de Abas Flat */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('credit_card')}
                  className={`py-3 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 border-2 ${
                    paymentMethod === 'credit_card'
                      ? 'border-blue-600 bg-blue-50/40 text-blue-700 font-extrabold'
                      : 'border-slate-200 hover:border-slate-300 text-slate-650 bg-white'
                  }`}
                >
                  <CreditCard size={16} /> Cartão de Crédito
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('pix')}
                  className={`py-3 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 border-2 ${
                    paymentMethod === 'pix'
                      ? 'border-blue-600 bg-blue-50/40 text-blue-700 font-extrabold'
                      : 'border-slate-200 hover:border-slate-300 text-slate-655 bg-white'
                  }`}
                >
                  <CircleDollarSign size={16} /> Pix Instantâneo
                </button>
              </div>

              {/* Conteúdo do Cartão de Crédito */}
              {paymentMethod === 'credit_card' && (
                <form onSubmit={handleConfirmarPagamento} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">
                      Número do Cartão
                    </label>
                    <input
                      type="text"
                      name="numero"
                      value={cardData.numero}
                      onChange={handleInputChange}
                      placeholder="0000 0000 0000 0000"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-slate-800 focus:bg-white rounded-xl px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">
                      Nome Impresso no Cartão
                    </label>
                    <input
                      type="text"
                      name="nome"
                      value={cardData.nome}
                      onChange={handleInputChange}
                      placeholder="MARIA SILVA SOUZA"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-slate-800 focus:bg-white rounded-xl px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition uppercase"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">
                        Validade (MM/AA)
                      </label>
                      <input
                        type="text"
                        name="validade"
                        value={cardData.validade}
                        onChange={handleInputChange}
                        placeholder="MM/AA"
                        className="w-full bg-slate-50 border border-slate-200 focus:border-slate-800 focus:bg-white rounded-xl px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">
                        CVC / CVV
                      </label>
                      <input
                        type="text"
                        name="cvv"
                        value={cardData.cvv}
                        onChange={handleInputChange}
                        placeholder="123"
                        className="w-full bg-slate-50 border border-slate-200 focus:border-slate-800 focus:bg-white rounded-xl px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition"
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
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
                        <h4 className="text-sm font-bold text-slate-900 mb-2">Pague instantaneamente via PIX</h4>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          Ao clicar no botão abaixo, geraremos um QR Code dinâmico do Pix e um código Pix Copia e Cola no valor de <strong className="text-slate-800">{planoInfo.preco}</strong> correspondente ao primeiro mês.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPixGenerated(true)}
                        className="w-full bg-slate-900 hover:bg-slate-950 text-white font-bold px-6 py-3.5 rounded-xl transition text-sm flex items-center justify-center gap-2"
                      >
                        Gerar QR Code e Copia e Cola
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
                        {/* Placeholder QR Code Flat com design legal */}
                        <div className="w-40 h-40 bg-white border border-slate-300 p-2 rounded-lg flex flex-col justify-between items-center relative mb-4">
                          {/* Desenho Flat de QR Code */}
                          <div className="w-full h-full grid grid-cols-5 grid-rows-5 gap-1.5 p-1 bg-slate-50">
                            <div className="bg-slate-900 rounded-sm"></div>
                            <div className="bg-slate-900 rounded-sm"></div>
                            <div className="bg-slate-100"></div>
                            <div className="bg-slate-900 rounded-sm"></div>
                            <div className="bg-slate-900 rounded-sm"></div>
                            
                            <div className="bg-slate-900 rounded-sm"></div>
                            <div className="bg-slate-100"></div>
                            <div className="bg-slate-900 rounded-sm"></div>
                            <div className="bg-slate-100"></div>
                            <div className="bg-slate-900 rounded-sm"></div>
                            
                            <div className="bg-slate-100"></div>
                            <div className="bg-slate-900 rounded-sm"></div>
                            <div className="bg-slate-100"></div>
                            <div className="bg-slate-900 rounded-sm"></div>
                            <div className="bg-slate-100"></div>
                            
                            <div className="bg-slate-900 rounded-sm"></div>
                            <div className="bg-slate-100"></div>
                            <div className="bg-slate-900 rounded-sm"></div>
                            <div className="bg-slate-100"></div>
                            <div className="bg-slate-900 rounded-sm"></div>
                            
                            <div className="bg-slate-900 rounded-sm"></div>
                            <div className="bg-slate-900 rounded-sm"></div>
                            <div className="bg-slate-100"></div>
                            <div className="bg-slate-900 rounded-sm"></div>
                            <div className="bg-slate-900 rounded-sm"></div>
                          </div>
                          <span className="absolute text-[8px] font-black uppercase text-blue-600 bg-white px-2 py-0.5 border border-blue-600 rounded">PIX RESERVACAR</span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-bold mb-2">Escaneie o QR Code acima usando o aplicativo do seu banco.</p>
                      </div>

                      <div className="space-y-2 text-left">
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
                          Pix Copia e Cola
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            readOnly
                            value="00020101021226830014br.gov.bcb.pix2561api.reservacar.com.br/pix/v2/cob46a782b5e2"
                            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-semibold text-slate-500 outline-none"
                          />
                          <button
                            type="button"
                            onClick={handleCopyPix}
                            className="bg-slate-900 hover:bg-slate-950 text-white font-bold px-4 py-3 rounded-xl transition text-xs flex items-center gap-1.5 shrink-0"
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
            <div className="mt-8 pt-6 border-t border-slate-100 space-y-3">
              <button
                type="button"
                onClick={handleConfirmarPagamento}
                disabled={isProcessing}
                className="w-full bg-blue-600 hover:bg-blue-750 text-white font-bold px-6 py-4 rounded-xl transition text-sm flex items-center justify-center gap-2"
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
          <div className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-2xl p-6 flex flex-col justify-between h-fit space-y-6">
            <div>
              <div className="mb-4">
                <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider">
                  Resumo do Pedido
                </span>
                <div className="h-px bg-slate-200 mt-2"></div>
              </div>

              {/* Card de Detalhe do Plano */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black text-blue-600 uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded">
                    PLANO SELECIONADO
                  </span>
                  <span className="text-xs text-slate-500 font-bold">Recorrência Mensal</span>
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">{planoUpgrade}</h3>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">{planoInfo.descricao}</p>
                </div>
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">Valor Mensal</span>
                  <span className="text-lg font-black text-slate-900">{planoInfo.preco}</span>
                </div>
              </div>

              {/* Detalhes de Limites */}
              <div className="mt-6 space-y-3">
                <div className="flex justify-between items-center text-xs font-semibold text-slate-650">
                  <span>Links de Reserva Disponíveis:</span>
                  <span className="font-bold text-slate-950">{planoInfo.limite} links ativos</span>
                </div>
                <div className="flex justify-between items-center text-xs font-semibold text-slate-650">
                  <span>Taxa de Processamento de Sinal:</span>
                  <span className="font-bold text-slate-950">1,5% retido</span>
                </div>
                <div className="flex justify-between items-center text-xs font-semibold text-slate-650">
                  <span>Atendimento Integrado:</span>
                  <span className="font-bold text-slate-950">Disponível</span>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-200 space-y-3 text-left">
              <div className="flex justify-between items-center">
                <span className="text-sm font-extrabold text-slate-900">Total a pagar:</span>
                <span className="text-2xl font-black text-blue-600">{planoInfo.preco}</span>
              </div>
              <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
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
function VendedoresView({ navigateTo, showToast, empresaLogada, setEmpresaLogada }) {
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

  const inputClass = "w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-600 transition";
  const labelClass = "block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5";

  return (
    <div className="pt-28 pb-16 px-6 md:px-12 max-w-[1600px] mx-auto">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Equipe de Vendedores</h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">Cadastre e gerencie a equipe do showroom autorizada a gerar links Pix.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl transition flex items-center gap-1.5"
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
                v.ativo ? 'border-slate-200 hover:border-slate-400' : 'border-slate-100 opacity-60'
              }`}
            >
              {/* Top Tag & Date Row */}
              <div className="flex justify-between items-center mb-5">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50 px-2.5 py-1 border border-slate-200 rounded-md">
                  {v.cargo || 'Consultor'}
                </span>
                <span className="text-[10px] font-bold text-slate-400 font-mono">
                  {v.dataCadastro || '31/05/2026'}
                </span>
              </div>

              {/* Vendedor Name */}
              <div className="mb-4">
                <h3 className="text-[16px] font-bold text-blue-600 tracking-tight leading-snug uppercase">
                  {v.nome}
                </h3>
                <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 mt-0.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${v.ativo ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                  {v.ativo ? 'Ativo no Showroom' : 'Inativo / Bloqueado'}
                </span>
              </div>

              {/* Performance Metric Panel */}
              <div className="grid grid-cols-2 divide-x divide-slate-200 bg-slate-50 border border-slate-150 rounded-2xl p-4 mb-4 text-center">
                <div>
                  <span className="block text-[9px] font-bold text-slate-400 tracking-wider uppercase mb-1">
                    Links Gerados
                  </span>
                  <span className="block text-base font-bold font-mono text-slate-900">
                    {v.linksGerados !== undefined ? v.linksGerados : 0}
                  </span>
                </div>
                <div>
                  <span className="block text-[9px] font-bold text-slate-400 tracking-wider uppercase mb-1">
                    Taxa Conversão
                  </span>
                  <span className="block text-base font-bold text-slate-900 font-mono">
                    {v.conversao !== undefined ? `${v.conversao}%` : '0%'}
                  </span>
                </div>
              </div>

              {/* Auxiliary buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => showToast(`Desempenho detalhado de ${v.nome} carregado no log.`, 'info')}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 bg-white"
                >
                  <BarChart2 size={12} /> Desempenho
                </button>
                <button
                  onClick={() => window.open(`https://api.whatsapp.com/send?phone=${empresaLogada.telefone}&text=Olá%20${v.nome},%20sua%20conta%20está%20configurada!`, '_blank')}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 bg-white"
                >
                  <MessageCircle size={12} /> WhatsApp
                </button>
              </div>

              {/* Main Manage Button */}
              <button
                onClick={() => handleOpenEdit(v)}
                className="w-full bg-slate-900 hover:bg-black text-white font-bold py-3 rounded-xl transition text-xs flex items-center justify-center gap-2 mt-4"
              >
                <Settings size={12} /> Gerenciar Vendedor
              </button>

            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-3xl p-10 max-w-xl mx-auto">
          <Users size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-bold text-slate-800">Nenhum vendedor cadastrado</h3>
          <p className="text-slate-500 text-xs mt-1">Sua concessionária precisa cadastrar vendedores para assinar e emitir links de propostas Pix.</p>
        </div>
      )}

      {/* MODAL ADICIONAR VENDEDOR */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 md:p-8 text-left animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-xl font-black text-slate-900 tracking-tight mb-1">Adicionar Vendedor</h3>
            <p className="text-slate-500 text-xs mb-6 font-medium">Cadastre um novo atendente para habilitá-lo na criação de reservas.</p>

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

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 text-slate-500 hover:bg-slate-50 hover:text-slate-800 font-bold text-xs rounded-xl border border-slate-200 transition uppercase tracking-wider text-center"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition uppercase tracking-wider text-center"
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
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 md:p-8 text-left animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start mb-1">
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Gerenciar Vendedor</h3>
              <button 
                onClick={() => handleExcluirVendedor(vendedorParaGerenciar.id)}
                className="text-rose-600 hover:text-rose-800 font-bold text-[10px] uppercase bg-rose-50 px-2.5 py-1.5 rounded-lg border border-rose-100"
              >
                Excluir Cadastro
              </button>
            </div>
            <p className="text-slate-500 text-xs mb-6 font-medium">Modifique as informações ou bloqueie o acesso do atendente.</p>

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
              <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Vendedor Ativo</h4>
                  <p className="text-[10px] text-slate-500">Inativo bloqueia a criação de links</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditFormData(prev => ({ ...prev, ativo: !prev.ativo }))}
                  className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 focus:outline-none ${
                    editFormData.ativo ? 'bg-blue-600' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-200 ${
                      editFormData.ativo ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100 mt-6">
                <button
                  type="button"
                  onClick={() => setVendedorParaGerenciar(null)}
                  className="flex-1 py-3 text-slate-500 hover:bg-slate-50 hover:text-slate-800 font-bold text-xs rounded-xl border border-slate-200 transition uppercase tracking-wider text-center"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition uppercase tracking-wider text-center"
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
function RelatorioReservasView({ navigateTo, showToast, recentReservations, setRecentReservations }) {
  const [selectedId, setSelectedId] = useState<any>(null);
  
  // Form states for the selected reservation
  const [sinal, setSinal] = useState('');
  const [vendedor, setVendedor] = useState('');
  const [status, setStatus] = useState('Active');

  // Sync selected reservation with states
  const selectedRes = recentReservations.find((r: any) => r.id === selectedId) || recentReservations[0];

  useEffect(() => {
    if (selectedRes) {
      setSelectedId(selectedRes.id);
      setSinal(String(selectedRes.signal || selectedRes.sinal || 0));
      setVendedor(selectedRes.vendedores || '');
      setStatus(selectedRes.status || 'Active');
    }
  }, [selectedRes?.id]);

  const handleSave = () => {
    if (!selectedRes) return;
    
    const novosLogs = [...(selectedRes.logs || [])];
    const originalSignal = Number(selectedRes.signal || selectedRes.sinal || 0);
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
          signal: newSignal,
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
    setSinal(String(selectedRes.signal || selectedRes.sinal || 0));
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
        return 'bg-emerald-50 text-emerald-700 border-emerald-250';
      case 'Expired':
        return 'bg-rose-50 text-rose-700 border-rose-250';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
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

  const inputClass = "w-full bg-[#f8fafc] border border-slate-200 rounded-2xl px-5 py-4 text-sm font-semibold text-slate-800 outline-none focus:border-blue-600 transition";
  const labelClass = "block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2.5";

  return (
    <div className="pt-28 pb-16 px-6 md:px-12 max-w-[1600px] mx-auto">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10 border-b border-slate-200 pb-6 text-left">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileText size={28} className="text-blue-600" /> Relatório de Reservas
          </h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">Monitore a auditoria completa de propostas, alteração de valores, status e acessos de leads.</p>
        </div>
      </div>

      {recentReservations.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: List of Reservations */}
          <div className="space-y-4 lg:col-span-1 text-left max-h-[80vh] overflow-y-auto pr-2">
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">Selecione uma Proposta</span>
            {recentReservations.map((res: any) => {
              const isSelected = res.id === selectedId;
              const dateOnly = res.created ? res.created.split('de')[1] || res.created : 'Recente';
              return (
                <button
                  key={res.id}
                  onClick={() => setSelectedId(res.id)}
                  className={`w-full text-left bg-white border p-5 rounded-[22px] transition flex flex-col gap-3.5 ${
                    isSelected ? 'border-slate-800' : 'border-slate-200 hover:border-slate-400'
                  }`}
                >
                  <div>
                    <h4 className="text-[13px] font-bold text-slate-900 tracking-tight leading-tight line-clamp-2">
                      {res.title}
                    </h4>
                    <span className="text-[10px] font-bold text-slate-400 block mt-1">{res.vendedores || 'Sem Atendente'}</span>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-1">
                    <span className="text-[10px] font-mono text-slate-400">{dateOnly.trim()}</span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${getStatusBadge(res.status)}`}>
                      {getStatusLabel(res.status)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right Column: Detailed Proposal Log Panel */}
          {selectedRes ? (
            <div className="lg:col-span-2">
              <div className="bg-white border border-slate-200 rounded-[32px] p-6 md:p-8 text-left">
                
                {/* Proposal Title Header */}
                <div className="border-b border-slate-100 pb-5 mb-6">
                  <h3 className="text-xl font-bold text-slate-900 tracking-tight leading-tight">Gerenciar Reserva</h3>
                  <p className="text-[11px] font-semibold text-slate-400 tracking-wide mt-1">
                    {selectedRes.title}
                  </p>
                </div>

                <div className="space-y-6">
                  
                  {/* Lead and Date Card */}
                  <div className="grid grid-cols-2 gap-4 bg-slate-50 border border-slate-200 p-5 rounded-[20px] text-xs">
                    <div>
                      <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1">Lead Associado</span>
                      <strong className="text-slate-800 text-sm font-extrabold">
                        {selectedRes.clienteNome || 'Não informado'}
                      </strong>
                    </div>
                    <div>
                      <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1">Criado em</span>
                      <strong className="text-slate-800 text-sm font-semibold">
                        {selectedRes.created || 'Hoje'}
                      </strong>
                    </div>
                  </div>

                  {/* Valor do Sinal */}
                  <div>
                    <label className={labelClass}>Valor do Sinal (R$)</label>
                    <input 
                      type="text" 
                      value={sinal}
                      onChange={(e) => setSinal(e.target.value.replace(/\D/g, ''))}
                      className={inputClass}
                      placeholder="Ex: 1500"
                    />
                  </div>

                  {/* Atendente Responsável */}
                  <div>
                    <label className={labelClass}>Atendente Responsável</label>
                    <input 
                      type="text" 
                      value={vendedor}
                      onChange={(e) => setVendedor(e.target.value)}
                      className={inputClass}
                      placeholder="Nome do vendedor"
                    />
                  </div>

                  {/* Status */}
                  <div>
                    <label className={labelClass}>Status da Reserva</label>
                    <div className="relative">
                      <select 
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className={`${inputClass} appearance-none bg-no-repeat bg-[right_1.25rem_center] bg-[length:1em]`}
                        style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%25236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")` }}
                      >
                        <option value="Active">Aguardando Sinal</option>
                        <option value="Completed">PIX Recebido</option>
                        <option value="Expired">Expirado / Cancelado</option>
                      </select>
                    </div>
                  </div>

                  {/* Proposal History Logs */}
                  <div>
                    <label className={labelClass}>Histórico da Proposta</label>
                    <div className="space-y-4 bg-[#f8fafc] border border-slate-200 p-5 rounded-[22px] max-h-56 overflow-y-auto">
                      {selectedRes.logs && selectedRes.logs.length > 0 ? (
                        selectedRes.logs.map((log: any, idx: number) => {
                          const isAccess = log.time.toLowerCase().includes('acesso') || log.text.toLowerCase().includes('visualizada') || log.text.toLowerCase().includes('visualizado');
                          return (
                            <div key={idx} className="flex items-start gap-4">
                              <span className={`text-[10px] font-mono shrink-0 w-36 mt-0.5 font-bold ${
                                isAccess ? 'text-[#94a3b8]' : 'text-slate-400'
                              }`}>
                                {log.time}
                              </span>
                              <p className={`text-xs leading-snug font-bold ${
                                isAccess ? 'text-[#1e3a8a]' : 'text-slate-800'
                              }`}>{log.text}</p>
                            </div>
                          );
                        })
                      ) : (
                        // Fallback logs generated on the fly if logs array is not present yet
                        <>
                          <div className="flex items-start gap-4">
                            <span className="text-[10px] font-mono text-slate-400 shrink-0 w-36 mt-0.5 font-bold">
                              {selectedRes.created || 'Hoje'}
                            </span>
                            <p className="text-xs font-bold text-slate-800 leading-snug">
                              Proposta criada por {selectedRes.vendedores ? selectedRes.vendedores.split(',')[0] : 'Consultor'}
                            </p>
                          </div>
                          <div className="flex items-start gap-4">
                            <span className="text-[10px] font-mono text-slate-400 shrink-0 w-36 mt-0.5 font-bold">
                              {selectedRes.created || 'Hoje'}
                            </span>
                            <p className="text-xs font-bold text-slate-800 leading-snug">
                              Link de sinal de R$ {Number(selectedRes.signal || selectedRes.sinal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ativado
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                </div>

                {/* Footer Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-slate-100 mt-8 justify-between">
                  {status === 'Active' ? (
                    <button
                      onClick={handleCancel}
                      className="bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 font-bold py-4 px-6 rounded-2xl text-xs transition uppercase tracking-wider"
                    >
                      Cancelar Reserva
                    </button>
                  ) : (
                    <div />
                  )}
                  <div className="flex gap-3">
                    <button
                      onClick={handleDiscard}
                      className="bg-white border border-slate-200 text-slate-750 font-bold py-4 px-6 rounded-2xl text-xs hover:bg-slate-50 transition uppercase tracking-wider"
                    >
                      Descartar
                    </button>
                    <button
                      onClick={handleSave}
                      className="bg-blue-600 hover:bg-blue-750 text-white font-bold py-4 px-6 rounded-2xl text-xs transition uppercase tracking-wider"
                    >
                      Salvar Alterações
                    </button>
                  </div>
                </div>

              </div>
            </div>
          ) : (
            <div className="lg:col-span-2 text-center py-20 bg-white border border-slate-200 rounded-[32px] p-10">
              <FileText size={48} className="mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-bold text-slate-800">Selecione uma reserva</h3>
              <p className="text-slate-550 text-xs mt-1">Escolha uma proposta na coluna da esquerda para auditar o log completo.</p>
            </div>
          )}

        </div>
      ) : (
        <div className="text-center py-20 bg-white border border-slate-200 rounded-[32px] p-10 max-w-xl mx-auto">
          <FileText size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-bold text-slate-800">Nenhum histórico disponível</h3>
          <p className="text-slate-555 text-xs mt-1">Crie novas propostas de reservas no painel para visualizar o log de auditoria.</p>
        </div>
      )}

    </div>
  );
}

