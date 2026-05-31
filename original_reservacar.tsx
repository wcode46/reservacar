import React, { useState, useEffect, useRef } from 'react';
import { 
  Car, Clock, ShieldCheck, ChevronRight, CheckCircle2, 
  Play, ChevronLeft, X, LogIn, BarChart2, Link as LinkIcon, 
  MessageCircle, Phone, Heart, Share, ArrowRight, ArrowUpRight, ArrowLeft, Shield,
  Bell, Send, Check, Copy, Sparkles, RefreshCw, Smartphone, Laptop, AlertCircle,
  TrendingUp, DollarSign, Users, Award, ShieldAlert, UploadCloud, Info, HelpCircle, CreditCard,
  CircleDollarSign
} from 'lucide-react';

// --- UTILITY FUNCTIONS ---
const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
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
    { codigo: 'ix', nome: 'iX M60 El├®trico' }
  ],
  'Audi': [
    { codigo: 'a3', nome: 'A3 Sedan Prestige 2.0 TFSI' },
    { codigo: 'rs4', nome: 'RS4 Avant V6 Twin-Turbo' },
    { codigo: 'etron', nome: 'e-tron S Sportback' }
  ],
  'Porsche': [
    { codigo: '911', nome: '911 Carrera S 3.0 Coup├®' },
    { codigo: 'taycan', nome: 'Taycan 4S El├®trico' }
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
  { codigo: '2022-ele', nome: '2022 El├®trico', valor: 310000, comb: 'El├®trico' }
];

// --- MAIN APP COMPONENT ---
export default function App() {
  const [currentRoute, setCurrentRoute] = useState('home'); // home, login, hub, sales-stats, dashboard, preview, mobile-preview, assinar, cadastrar-reserva
  const [activeReservation, setActiveReservation] = useState<any>(null); 
  const [toastMessage, setToastMessage] = useState<any>(null);
  
  // Credit Plan state management
  const [totalReservasPlano, setTotalReservasPlano] = useState(30);
  const [reservasUsadas, setReservasUsadas] = useState(12);
  const [empresaLogada, setEmpresaLogada] = useState<any>({
    nome: 'BMW Premium SP',
    cnpj: '12.345.678/0001-90',
    email: 'vendedor@bmwpremium.com.br'
  });
  
  // Real-time live notifications (makes the dashboard dynamic!)
  const [liveNotifications, setLiveNotifications] = useState([
    { id: 1, type: 'view', text: 'Cliente Carlos S. acabou de abrir a proposta da Audi RS4.', time: 'Agora' },
    { id: 2, type: 'pix', text: 'Sinal recebido! R$5.000 pagos por Rafael Mendes (BMW 320i).', time: 'H├í 4 min' },
    { id: 3, type: 'create', text: 'Vendedor Carla Silva gerou um link para JAC iEV 20.', time: 'H├í 12 min' },
  ]);

  // Initial Seed for Reservations
  const [recentReservations, setRecentReservations] = useState([
    { 
      id: 1, title: 'JAC iEV 20 68cv 5p Aut. (El├®trico)', signal: 1500, duration: '60', created: '12:16:33 de 24/05/2026',
      anoText: '2022', corText: 'Branco', motorText: '1.0 El├®trico', fipeValue: 81262, valorVenda: 78262, km: '8.200', cambio: 'Autom├ítico',
      opcionais: 'Ar Condicionado, Dire├º├úo El├®trica, Vidro El├®trico, Airbag, Freio ABS, Central Multim├¡dia',
      fotos: 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&w=800&q=80',
      sinal: 1500, expiracao: 60, vendedores: 'Carla Silva, Roberto Oliveira, Marcos Souza', video: '',
      laudoAprovado: true, status: 'Active', elapsedSeconds: 3200 // in seconds
    },
    { 
      id: 2, title: 'Audi RS4 2.9 Avant V6 TFSI Quattro', signal: 5000, duration: '30', created: '12:14:52 de 24/05/2026',
      anoText: '2024', corText: 'Azul Navarra', motorText: '2.9 V6 Twin-Turbo', fipeValue: 650000, valorVenda: 630000, km: '1.500', cambio: 'Tiptronic 8v',
      opcionais: 'Teto Solar Panor├ómico, Sistema Bang & Olufsen, Bancos RS, Escapamento Esportivo',
      fotos: 'https://images.unsplash.com/photo-1606016159991-dfe4f2746ad5?auto=format&fit=crop&w=800&q=80',
      sinal: 5000, expiracao: 30, vendedores: 'Roberto Oliveira, Marcos Souza', video: '',
      laudoAprovado: true, status: 'Pending', elapsedSeconds: 800
    },
  ]);

  const showToast = (msg, type = 'info') => {
    setToastMessage({ text: msg, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const navigateTo = (route) => {
    window.scrollTo(0, 0);
    setCurrentRoute(route);
  };

  // Automated notification generator to simulate real traffic
  useEffect(() => {
    const intervals = [
      "Cliente Patricia M. est├í negociando a BMW 320i.",
      "Vendedor Roberto enviou um link de proposta via WhatsApp.",
      "Cliente na Mooca est├í visualizando os opcionais do Audi RS4.",
      "Alerta de Urg├¬ncia: Link da Mercedes C200 expira em menos de 5 min!",
      "Uma nova proposta est├í sendo montada por Marcos Souza."
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

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900 transition-colors duration-200">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[99] max-w-sm bg-white border border-slate-200 border-l-4 border-blue-600 text-slate-900 p-4 rounded-r-xl flex items-center gap-3 animate-bounce">
          <Sparkles className="text-blue-600 shrink-0" size={20} />
          <span className="text-sm font-medium">{toastMessage.text}</span>
        </div>
      )}

      {/* Hide standard navbar on preview simulator layouts */}
      {currentRoute !== 'preview' && currentRoute !== 'mobile-preview' && (
        <Navbar currentRoute={currentRoute} navigateTo={navigateTo} />
      )}
      
      <main className="transition-all duration-300">
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
          />
        )}
        
        {currentRoute === 'dashboard' && (
          <DashboardView 
            navigateTo={navigateTo} 
            setActiveReservation={setActiveReservation}
            recentReservations={recentReservations}
            setRecentReservations={setRecentReservations}
            showToast={showToast}
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

        {currentRoute === 'cadastrar-reserva' && (
          <CadastroReservaClienteView 
            navigateTo={navigateTo} 
            showToast={showToast}
            setActiveReservation={setActiveReservation}
          />
        )}
      </main>
      {currentRoute === 'home' && <Footer navigateTo={navigateTo} />}
    </div>
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
            {['hub', 'sales-stats', 'dashboard', 'assinar'].includes(currentRoute) && (
              <>
                <button 
                  onClick={() => navigateTo('hub')}
                  className="text-sm font-semibold text-slate-600 hover:text-blue-600 transition mr-4 py-2"
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

// --- HOME VIEW ---
function HomeView({ navigateTo }) {
  const [visibleNotifications, setVisibleNotifications] = useState<any[]>([]);

  useEffect(() => {
    const staticNotifications = [
      { id: 1, name: "Veiculo Reservado", time: "Hoje as 11:28", price: "+R$ 17.850", color: "#00C9A7" },
      { id: 2, name: "Veiculo Reservado", time: "Hoje as 11:15", price: "+R$ 24.500", color: "#FFB800" },
      { id: 3, name: "Veiculo Reservado", time: "Hoje as 11:02", price: "+R$ 15.000", color: "#FF3D71" },
      { id: 4, name: "Veiculo Reservado", time: "Hoje as 10:48", price: "+R$ 31.200", color: "#1E86FF" },
      { id: 5, name: "Veiculo Reservado", time: "Hoje as 10:30", price: "+R$ 12.850", color: "#8B5CF6" },
    ];

    setVisibleNotifications([
      { ...staticNotifications[0], key: Math.random() }
    ]);

    let currentIdx = 0;
    const interval = setInterval(() => {
      currentIdx = (currentIdx + 1) % staticNotifications.length;
      setVisibleNotifications(prev => {
        const newItem = { ...staticNotifications[currentIdx], key: Math.random() };
        return [newItem, ...prev].slice(0, 2);
      });
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="overflow-hidden relative bg-[#030712]">
      {/* Estilos espec├¡ficos para a lista animada da Hero */}
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
      
      {/* 1. Hero Area (Estilo Revolut) */}
      <div className="relative w-full min-h-[750px] lg:h-[700px] bg-[#030712] flex items-center justify-center overflow-hidden py-24 lg:py-0">
        {/* Fundo de Imagem (Porsche Cayman vermelho do Unsplash) */}
        <img 
          src="https://images.unsplash.com/photo-1614905218621-99262ff8f8e1?q=80&w=2087&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" 
          className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none" 
          alt="Porsche Cayman vermelho premium" 
        />
        {/* Overlay escuro de leitura na esquerda e transi├º├úo na base */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/25 to-transparent z-10" />
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#f8f9fa] to-transparent z-10" />

        {/* Grid de Conte├║do */}
        <div className="relative max-w-7xl mx-auto px-6 lg:px-8 z-20 w-full grid lg:grid-cols-12 gap-16 lg:gap-8 items-center text-left">
          
          {/* Lado Esquerdo: Textos e CTAs */}
          <div className="lg:col-span-7 flex flex-col items-start max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 mb-8 text-slate-300 select-none backdrop-blur-md">
              <Sparkles size={14} className="text-blue-400" />
              <span className="text-xs font-semibold tracking-wider uppercase">NOVA VERS├âO 2026 DISPONIVEL</span>
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-[64px] font-extrabold leading-[1.08] text-white tracking-tighter mb-6">
              Seu ingresso para o <br />
              showroom digital
            </h1>
            
            <p className="text-base md:text-lg font-medium text-slate-300 mb-10 leading-relaxed max-w-lg">
              Crie p├íginas de propostas exclusivas e personalizadas para cada lead. Receba o sinal por Pix e trave o neg├│cio em minutos antes mesmo do cliente chegar ao showroom.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
              <button 
                onClick={() => navigateTo('cadastrar-reserva')}
                className="w-full sm:w-auto bg-blue-600 text-white px-8 py-4 rounded-xl text-sm font-bold hover:bg-blue-700 transition duration-250 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
              >
                Simular Reserva (Cliente)
              </button>
              <button 
                onClick={() => navigateTo('assinar')}
                className="w-full sm:w-auto bg-white text-slate-900 hover:bg-slate-50 px-8 py-4 rounded-xl text-sm font-bold transition duration-250 border border-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-350 focus-visible:ring-offset-2"
              >
                Assinar Reservacar
              </button>
            </div>
          </div>

          {/* Lado Direito: Ret├óngulo Frame Transl├║cido */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end pb-12 lg:pb-0">
            <div className="relative w-[320px] md:w-[360px] h-[480px] rounded-[36px] border border-white/20 bg-white/5 backdrop-blur-[4px] flex flex-col items-center justify-start pt-20 px-8 select-none">
              
              <span className="text-[10px] font-bold text-slate-400 tracking-[0.25em] uppercase mb-4">APLICATIVO</span>
              
              <h3 className="text-5xl md:text-6xl font-black text-white tracking-tighter mb-8">
                <NumberTicker value={46911} />
              </h3>
              
              <div className="border border-white/25 bg-transparent px-6 py-2.5 rounded-lg text-[10px] font-bold tracking-widest text-white uppercase">
                CARROS RESERVADOS
              </div>

              {/* Card de Push de Pre├ºo Horizontal Interno Animado */}
              <div className="absolute bottom-6 left-6 right-6 flex flex-col gap-2.5 overflow-hidden h-[165px] justify-end z-30 pointer-events-none">
                {visibleNotifications.map((item) => (
                  <div
                    key={item.key}
                    className="bg-[#dcdcdc] border border-white/10 p-4 rounded-3xl flex items-center justify-between text-left text-slate-900 w-full animate-slide-in-top transition-all duration-300 pointer-events-auto"
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 text-white rounded-full flex items-center justify-center shrink-0"
                        style={{ backgroundColor: item.color }}
                      >
                        <CircleDollarSign size={20} className="text-white" />
                      </div>
                      <div>
                        <span className="text-xs font-extrabold text-slate-900 block leading-tight">{item.name}</span>
                        <span className="text-[9px] text-slate-500 block mt-0.5">{item.time}</span>
                      </div>
                    </div>
                    <span className="text-sm font-black text-slate-900 tracking-tight">{item.price}</span>
                  </div>
                ))}
              </div>

            </div>
          </div>

        </div>
      </div>

      {/* 2. Se├º├úo "Propostas Exclusivas" (Cart├Áes para chamar de seus) */}
      <div className="py-24 bg-white border-t border-b border-slate-200 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
            P├íginas de reserva para chamar de suas
          </h2>
          <p className="text-slate-500 font-semibold max-w-2xl mx-auto mb-16">
            Crie links de vitrine digital altamente envolventes, personalizados com a logo da sua concession├íria, fotos de alta qualidade e ficha t├®cnica integrada.
          </p>

          <div className="relative h-[320px] max-w-3xl mx-auto flex items-center justify-center mt-12 mb-12 select-none">
            {/* Card 1: Esquerda (Fiat JAC CS) */}
            <div className="absolute left-4 md:left-20 top-8 bg-slate-50 border-2 border-slate-200 p-6 rounded-3xl w-72 text-left rotate-[-8deg] hover:rotate-0 transition duration-300 z-10">
              <span className="bg-blue-50 text-blue-600 text-[9px] font-black px-2 py-0.5 rounded uppercase">EL├ëTRICO</span>
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

      {/* 3. Se├º├úo "Sinal em Minutos" (Envie dinheiro) */}
      <div className="py-24 bg-[#f8f9fa]">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center">
          
          {/* Coluna Esquerda: Mockup m├│vel */}
          <div className="flex justify-center select-none">
            <div className="w-[320px] h-[520px] bg-slate-950 rounded-[40px] overflow-hidden border-[6px] border-slate-800 flex flex-col relative shadow-md">
              <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-24 h-4 bg-black rounded-full z-30" />
              
              <div className="bg-white flex-1 p-5 flex flex-col justify-between text-slate-900 text-left">
                <div className="pt-6">
                  <span className="bg-emerald-550 text-white text-[8px] font-black px-2 py-0.5 rounded">PIX INTEGRADO</span>
                  <h4 className="font-black text-lg text-slate-900 mt-2">Pagamento do Sinal</h4>
                  <p className="text-[10px] text-slate-500 mt-1">Efetue o sinal de garantia e reserve o ve├¡culo imediatamente.</p>
                  
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
                  Simula├º├úo Pix Ativa
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
              N├úo perca vendas para outros showrooms. Compartilhe o link de proposta exclusiva via WhatsApp. O cliente realiza o pagamento do sinal com Pix direto da tela de propostas e garante o carro de forma segura.
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
          alt="Concession├íria showroom moderno" 
        />
        <div className="absolute inset-0 bg-slate-950/50 z-10" />

        <div className="relative max-w-4xl mx-auto px-6 z-20 text-center">
          <span className="bg-blue-600 text-white text-[10px] font-black px-3.5 py-1.5 rounded-full uppercase tracking-widest mb-4 inline-block">
            ESCASSEZ CONTROLADA
          </span>
          <h3 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight mb-4">
            Sinta a urg├¬ncia com a contagem regressiva
          </h3>
          <p className="text-slate-300 font-medium max-w-xl mx-auto text-sm md:text-base mb-6 leading-relaxed">
            Nossos links de propostas contam com contagem regressiva psicol├│gica e selo de laudo cautelar verificado, estimulando o lead quente a fechar a reserva rapidamente.
          </p>
        </div>
      </div>

      {/* 5. Se├º├úo de M├®tricas */}
      <div className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-12">
            M├®tricas que aceleram concession├írias
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8 text-left">
            <div className="bg-[#f8f9fa] border border-slate-200 p-8 rounded-3xl">
              <span className="text-6xl font-black text-blue-600 block mb-2">71.4%</span>
              <h4 className="font-extrabold text-slate-900 text-lg mb-2">Taxa de Convers├úo</h4>
              <p className="text-slate-500 text-sm leading-relaxed font-medium">
                Lojas que usam links do Reservacar conseguem converter mais de 70% dos leads de WhatsApp em reservas de showroom pagas.
              </p>
            </div>

            <div className="bg-[#f8f9fa] border border-slate-200 p-8 rounded-3xl">
              <span className="text-6xl font-black text-slate-900 block mb-2">1h 48m</span>
              <h4 className="font-extrabold text-slate-900 text-lg mb-2">Tempo M├®dio de Fechamento</h4>
              <p className="text-slate-500 text-sm leading-relaxed font-medium">
                Reduza o tempo de negocia├º├úo drasticamente. Do envio do link ├á confirma├º├úo do sinal via Pix, a m├®dia de decis├úo ├® menor que 2 horas.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 6. Se├º├úo Como Come├ºar */}
      <div className="py-24 bg-[#f8f9fa] border-t border-slate-200">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-4">
            Como come├ºar a usar o Reservacar?
          </h2>
          <p className="text-slate-500 font-semibold max-w-xl mx-auto mb-16">
            Siga tr├¬s passos simples e comece a fechar suas propostas de forma digital hoje mesmo.
          </p>

          <div className="grid md:grid-cols-3 gap-6 text-left mb-12">
            <div className="bg-white border border-slate-200 p-8 rounded-3xl">
              <span className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-black text-sm mb-6 select-none">
                1
              </span>
              <h4 className="font-extrabold text-slate-900 text-lg mb-3">Assine um Plano</h4>
              <p className="text-slate-500 text-xs leading-relaxed font-medium">
                Escolha o plano ideal para o volume de vendas do seu showroom e adquira os cr├®ditos de links ativos.
              </p>
            </div>

            <div className="bg-white border border-slate-200 p-8 rounded-3xl">
              <span className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-black text-sm mb-6 select-none">
                2
              </span>
              <h4 className="font-extrabold text-slate-900 text-lg mb-3">Crie a Proposta</h4>
              <p className="text-slate-500 text-xs leading-relaxed font-medium">
                Consulte o ve├¡culo na FIPE, insira quilometragem, fotos, opcionais e defina o valor do sinal Pix.
              </p>
            </div>

            <div className="bg-white border border-slate-200 p-8 rounded-3xl">
              <span className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-black text-sm mb-6 select-none">
                3
              </span>
              <h4 className="font-extrabold text-slate-900 text-lg mb-3">Receba e Feche</h4>
              <p className="text-slate-500 text-xs leading-relaxed font-medium">
                Envie o link ao lead. Quando ele pagar o sinal, o carro sai do showroom virtual e voc├¬ finaliza a venda presencial.
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
            Revolucione as vendas do seu showroom de ve├¡culos.
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16 border-t border-b border-slate-800 py-12 text-left">
          <div>
            <h4 className="text-white font-bold text-sm mb-4">Plataforma</h4>
            <ul className="space-y-2 text-xs">
              <li><button onClick={() => navigateTo('home')} className="hover:text-white transition">In├¡cio</button></li>
              <li><button onClick={() => navigateTo('assinar')} className="hover:text-white transition">Planos</button></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-white font-bold text-sm mb-4">Parcerias</h4>
            <ul className="space-y-2 text-xs">
              <li><a href="#" className="hover:text-white transition">Multimarcas</a></li>
              <li><a href="#" className="hover:text-white transition">Concession├írias Premium</a></li>
              <li><a href="#" className="hover:text-white transition">Integradores CRM</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold text-sm mb-4">Empresa</h4>
            <ul className="space-y-2 text-xs">
              <li><a href="#" className="hover:text-white transition">Sobre N├│s</a></li>
              <li><a href="#" className="hover:text-white transition">Carreiras</a></li>
              <li><a href="#" className="hover:text-white transition">Contato</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold text-sm mb-4">Suporte</h4>
            <ul className="space-y-2 text-xs">
              <li><a href="#" className="hover:text-white transition">Central de Ajuda</a></li>
              <li><a href="#" className="hover:text-white transition">Status do Sistema</a></li>
              <li><a href="#" className="hover:text-white transition">Seguran├ºa Pix</a></li>
            </ul>
          </div>
        </div>

        {/* Textos legais pequenos e direitos autorais */}
        <div className="text-left text-[11px] text-slate-500 leading-relaxed space-y-4">
          <p>
            O Reservacar ├® uma plataforma de tecnologia voltada para a otimiza├º├úo e acelera├º├úo de processos comerciais em concession├írias multimarcas de seminovos. N├úo somos uma institui├º├úo financeira ou intermediador direto de pagamentos. As transa├º├Áes financeiras (sinais via Pix) s├úo liquidadas diretamente entre o comprador final (lead) e a concession├íria parceira atrav├®s dos provedores de pagamento integrados ├á conta banc├íria de cada concession├íria, sob total responsabilidade dos envolvidos.
          </p>
          <p>
            A seguran├ºa dos dados ├® garantida atrav├®s de seguran├ºa avan├ºada e conformidade total com a Lei Geral de Prote├º├úo de Dados (LGPD). A expira├º├úo dos cron├┤metros e a trava de showroom s├úo l├│gicas simuladas configuradas livremente pelas equipes comerciais a fim de otimizar sua taxa de convers├úo local.
          </p>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pt-8 border-t border-slate-800 gap-4 mt-8">
            <span className="text-[11px] font-semibold text-slate-600">┬® 2026 Reservacar Ltda. Todos os direitos reservados. CNPJ 12.345.678/0001-90.</span>
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
    <div className="min-h-screen pt-32 pb-20 px-6 bg-[#f8f9fa] flex flex-col items-center">
      <div className="w-full max-w-5xl mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Ol├í, {empresaLogada?.nome || 'Marcos Freitas'} ­ƒæï</h1>
            <p className="text-lg font-medium text-slate-550 mt-1">{empresaLogada?.nome || 'BMW Premium SP'} ÔÇö Central de Vendas</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-full px-4 py-2 flex items-center gap-2 text-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
            <span className="font-semibold text-slate-700">Showroom Conectado</span>
          </div>
        </div>

        {/* Credit System Visual Widget */}
        <div className="mt-8 bg-white border border-slate-200 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row justify-between md:items-center gap-8 relative overflow-hidden">
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Plano Atual: Concession├íria Starter</h3>
            <p className="text-4xl font-black text-slate-900 leading-none">
              {reservasDisponiveis} <span className="text-base font-semibold text-slate-500 ml-1">links dispon├¡veis</span>
            </p>
            <p className="text-xs text-slate-600 mt-3">Renova automaticamente em: 10/06/2026</p>
          </div>
          
          <div className="w-full md:w-5/12 bg-slate-50 p-5 rounded-2xl border border-slate-200">
            <div className="flex justify-between items-center text-xs font-bold text-slate-500 mb-3">
              <span>CR├ëDITOS UTILIZADOS</span>
              <span className="text-slate-900 text-sm">{reservasUsadas} / {totalReservasPlano}</span>
            </div>
            <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden mb-2">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ${percentagemUso > 80 ? 'bg-amber-500' : 'bg-blue-600'}`} 
                style={{ width: `${percentagemUso}%` }}
              ></div>
            </div>
            {percentagemUso > 80 ? (
              <p className="text-[11px] font-semibold text-amber-600">Voc├¬ est├í pr├│ximo do limite. Considere um upgrade de plano.</p>
            ) : (
              <p className="text-[11px] text-slate-550">Excelente margem de vendas dispon├¡vel.</p>
            )}
          </div>
        </div>
      </div>

      <div className="w-full max-w-5xl grid md:grid-cols-3 gap-6">
        
        {/* Module Choice Left */}
        <div className="md:col-span-2 grid sm:grid-cols-2 gap-6">
          <button 
            onClick={() => navigateTo('sales-stats')}
            className="bg-white border border-slate-200 rounded-3xl p-8 flex flex-col items-center text-center hover:border-blue-600 transition duration-200 group relative overflow-hidden"
          >
            <div className="absolute top-4 right-4 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md text-[10px] font-bold">ATIVIDADE AO VIVO</div>
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-600 transition duration-200">
              <BarChart2 size={32} className="text-blue-600 group-hover:text-white transition duration-200" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2 group-hover:text-blue-650 transition duration-200">Painel de Vendas</h2>
            <p className="text-slate-500 font-medium text-sm px-2">Acompanhe propostas ativas, visualize o fluxo do cliente e registre pagamentos.</p>
          </button>

          <button 
            onClick={() => navigateTo('dashboard')}
            className="bg-white border border-slate-200 rounded-3xl p-8 flex flex-col items-center text-center hover:border-blue-600 transition duration-200 group"
          >
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-600 transition duration-200">
              <LinkIcon size={32} className="text-blue-600 group-hover:text-white transition duration-200" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2 group-hover:text-blue-650 transition duration-200">Gerador de Links</h2>
            <p className="text-slate-500 font-medium text-sm px-2">Crie novas p├íginas de reserva instant├óneas, consulte FIPE e monte checklists.</p>
          </button>
        </div>

        {/* Live Notification Activity Ticker */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 flex flex-col h-full min-h-[350px]">
          <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <Bell size={14} className="text-blue-600" />
              Notifica├º├Áes do Showroom
            </h3>
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping"></span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 max-h-[250px] pr-1">
            {liveNotifications.map(notif => (
              <div key={notif.id} className="text-xs bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col gap-1">
                <p className="font-semibold text-slate-800">{notif.text}</p>
                <span className="text-[10px] text-slate-500 font-medium self-end">{notif.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- SALES STATS VIEW (LIVE FEED) ---
function SalesStatsView({ navigateTo, reservasUsadas, totalReservasPlano, recentReservations, setRecentReservations, liveNotifications, showToast, empresaLogada }) {
  const reservasDisponiveis = totalReservasPlano - reservasUsadas;

  // Simulator helper to let vendors mock real scenarios instantly
  const handleSimulatePayment = (resId, clientName) => {
    setRecentReservations(prev => 
      prev.map(item => {
        if (item.id === resId) {
          return { ...item, status: 'Completed', paidSignal: true };
        }
        return item;
      })
    );
    showToast(`Simulador: Pagamento registrado com sucesso para ${clientName}!`, 'success');
  };

  const handleSimulateTimeExpiration = (resId) => {
    setRecentReservations(prev => 
      prev.map(item => {
        if (item.id === resId) {
          return { ...item, status: 'Expired', elapsedSeconds: item.expiracao * 60 };
        }
        return item;
      })
    );
    showToast(`Simulador: Proposta expirada.`, 'info');
  };

  return (
    <div className="pt-28 pb-20 px-6 lg:px-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Painel da Loja</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">{empresaLogada?.nome || 'BMW Premium SP'} ÔÇö Atividade Comercial</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white border border-slate-200 px-4 py-2.5 rounded-2xl flex items-center gap-3">
            <span className="text-xl font-bold text-slate-900 leading-none">{reservasDisponiveis}</span>
            <span className="text-xs font-semibold text-slate-550 leading-none">cr├®ditos de links livres</span>
          </div>
        </div>
      </div>

      {/* Grid of Key Performance Indicators (SaaS Style) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
        <div className="bg-white border border-slate-200 p-6 rounded-3xl">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Resgates Ativos</span>
            <Users size={16} className="text-blue-600" />
          </div>
          <span className="block text-4xl font-extrabold text-slate-900 mb-1">7</span>
          <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
            <ArrowUpRight size={14}/> 3 novos hoje
          </span>
        </div>
        
        <div className="bg-white border border-slate-200 p-6 rounded-3xl">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Convers├úo L├¡quida</span>
            <TrendingUp size={16} className="text-emerald-600" />
          </div>
          <span className="block text-4xl font-extrabold text-slate-900 mb-1">71%</span>
          <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
            <ArrowUpRight size={14}/> +8% vs m├¬s anterior
          </span>
        </div>

        <div className="bg-white border border-slate-200 p-6 rounded-3xl">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Sinal em Caixa</span>
            <DollarSign size={16} className="text-blue-600" />
          </div>
          <span className="block text-4xl font-extrabold text-slate-900 mb-1">R$ 42k</span>
          <span className="text-xs text-slate-550 font-semibold">Este m├¬s corrente</span>
        </div>

        <div className="bg-white border border-slate-200 p-6 rounded-3xl">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Velocidade M├®dia</span>
            <Clock size={16} className="text-blue-600" />
          </div>
          <span className="block text-4xl font-extrabold text-slate-900 mb-1">1h 48m</span>
          <span className="text-xs text-emerald-600 font-semibold">Fechamento r├ípido</span>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        
        {/* Main Feed Column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-bold text-slate-550 uppercase tracking-widest">MONITORAMENTO DE LINKS EM TEMPO REAL</h3>
            
            {/* Quick Demo Simulator Instructions */}
            <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-md border border-blue-100">
              M├│dulo de Teste de Vendas
            </span>
          </div>
          
          {recentReservations.map((res) => {
            const isCompleted = res.status === 'Completed' || res.paidSignal;
            const isExpired = res.status === 'Expired';
            
            return (
              <div key={res.id} className="bg-white border border-slate-200 rounded-3xl p-6 transition hover:border-slate-350">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="font-extrabold text-xl text-slate-900 tracking-tight">{res.title}</h4>
                    <p className="text-xs font-medium text-slate-500 mt-1">
                      Assinado para: <strong className="text-slate-800">{res.vendedores ? res.vendedores.split(',')[0] : 'Consultor'}</strong>
                    </p>
                  </div>
                  
                  {isCompleted ? (
                    <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-full border border-emerald-100 flex items-center gap-1.5">
                      <CheckCircle2 size={12} /> PIX RECEBIDO
                    </span>
                  ) : isExpired ? (
                    <span className="bg-rose-50 text-rose-700 text-xs font-bold px-3 py-1.5 rounded-full border border-rose-100 flex items-center gap-1.5">
                      <X size={12} /> EXPIRADO
                    </span>
                  ) : (
                    <span className="bg-amber-50 text-amber-700 text-xs font-bold px-3 py-1.5 rounded-full border border-amber-100 flex items-center gap-1.5">
                      <Clock size={12} /> AGUARDANDO SINAL
                    </span>
                  )}
                </div>

                {/* Progress Visual Timer */}
                {!isCompleted && !isExpired && (
                  <div className="flex items-center gap-4 mb-6 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <div className="flex-1 h-2.5 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 w-[65%]"></div>
                    </div>
                    <span className="text-xs font-semibold text-slate-500 font-mono">Simulado Regressivo</span>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 pt-4 border-t border-slate-100">
                  <div>
                    <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">PROPOSTA COMERCIAL</span>
                    <div className="font-black text-2xl text-slate-900">{formatCurrency(res.valorVenda)}</div>
                    <div className="text-xs font-semibold text-slate-500 mt-1">Sinal Exigido: <span className="text-blue-600 font-bold">{formatCurrency(res.signal)}</span></div>
                  </div>
                  
                  {/* Real interactive simulations */}
                  <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                    {!isCompleted && !isExpired && (
                      <>
                        <button 
                          onClick={() => handleSimulatePayment(res.id, 'Cliente Simulado')}
                          className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition"
                        >
                          Confirmar PIX
                        </button>
                        <button 
                          onClick={() => handleSimulateTimeExpiration(res.id)}
                          className="flex-1 sm:flex-none bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-xl transition border border-slate-200"
                        >
                          Expirar Link
                        </button>
                      </>
                    )}
                    <button 
                      onClick={() => {
                        window.open(`https://api.whatsapp.com/send?text=Sua%20proposta%20exclusiva%20Reservacar%20est├í%20pronta!`, '_blank');
                      }}
                      className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center justify-center gap-1.5"
                    >
                      <Share size={12} /> WhatsApp
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Sidebar Activity logs */}
        <div className="space-y-6">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Logs de Atividade Recentes</h3>
          <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4">
            {liveNotifications.slice(0, 5).map((log, index) => (
              <div key={index} className="flex gap-3 text-xs">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0 mt-1"></div>
                <div>
                  <p className="font-semibold text-slate-800 leading-tight">{log.text}</p>
                  <span className="text-[10px] text-slate-500 mt-1 block">{log.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

// --- DASHBOARD VIEW (CREATOR FORM) ---
function DashboardView({ navigateTo, setActiveReservation, recentReservations, setRecentReservations, showToast }) {
  return (
    <div className="pt-28 pb-16 px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Gerador de Reservas</h1>
          <p className="text-lg font-medium text-slate-500 mt-1 font-sans">Gere p├íginas exclusivas personalizadas para cada lead.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              setRecentReservations([]);
              showToast('Hist├│rico de links limpo com sucesso.', 'info');
            }}
            className="text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-xl border border-slate-200 transition"
          >
            Limpar Tudo
          </button>
          <button 
            onClick={() => navigateTo('cadastrar-reserva')}
            className="text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl transition"
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
              <div key={res.id} className="bg-white border border-slate-200 rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden group hover:border-blue-600 transition-colors duration-200">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="bg-slate-50 border border-slate-200 text-[9px] font-black text-slate-500 px-2.5 py-1 rounded-md uppercase tracking-wider">
                      {res.marcaText || 'Ve├¡culo'}
                    </span>
                    <span className="text-[10px] text-slate-500 font-semibold">{res.created?.split(' ')[0] || 'Hoje'}</span>
                  </div>
                  
                  <h4 className="font-extrabold text-lg text-slate-900 tracking-tight leading-snug mb-4 group-hover:text-blue-600 transition-colors uppercase">
                    {res.title || `${res.marcaText} ${res.modeloText}`}
                  </h4>

                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex items-center justify-between gap-2 text-xs font-semibold text-slate-700 mb-6">
                    <div className="flex flex-col">
                      <span className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Sinal Requerido</span>
                      <span className="text-sm font-black text-slate-900">{formatCurrency(res.signal || 1500)}</span>
                    </div>
                    <div className="w-px h-8 bg-slate-200"></div>
                    <div className="flex flex-col">
                      <span className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Tempo Limiar</span>
                      <span className="text-sm font-black text-slate-800">{res.duration || 60}m</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 border-t border-slate-100 pt-4 mt-auto">
                  <button 
                    onClick={() => {
                      setActiveReservation(res);
                      navigateTo('preview');
                    }}
                    className="flex-1 bg-white border border-slate-200 text-slate-700 text-xs font-bold py-3 rounded-xl hover:bg-slate-50 hover:text-slate-900 transition flex items-center justify-center gap-1.5"
                  >
                    <Laptop size={14} /> Desktop
                  </button>
                  <button 
                    onClick={() => {
                      setActiveReservation(res);
                      navigateTo('mobile-preview');
                    }}
                    className="flex-1 bg-blue-600 text-white text-xs font-bold py-3 rounded-xl hover:bg-blue-700 transition flex items-center justify-center gap-1.5"
                  >
                    <Smartphone size={14} /> Mobile Sim
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center max-w-xl mx-auto">
            <Car className="text-slate-300 mx-auto mb-4 animate-bounce" size={42} />
            <h4 className="font-extrabold text-slate-900 text-lg mb-2">Nenhum link ativo gerado</h4>
            <p className="text-xs text-slate-500 leading-relaxed font-medium mb-6">
              Os links criados pelos clientes finais a partir da p├ígina inicial aparecer├úo aqui automaticamente.
            </p>
            <button 
              onClick={() => navigateTo('cadastrar-reserva')}
              className="bg-blue-600 text-white font-bold text-xs px-5 py-3 rounded-xl hover:bg-blue-700 transition"
            >
              Simular Fluxo do Cliente
            </button>
          </div>
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
  totalReservasPlano = 30 
}) {
  const data = reservation || {
    title: 'BMW 320i Sport GP 2.0 Turbo ActiveFlex',
    anoText: '2024', corText: 'Preto Safira', motorText: '2.0 TwinPower Turbo', fipeValue: 285000, valorVenda: 269000,
    km: '4.500', cambio: 'ZF 8 marchas', combustivel: 'Flex',
    opcionais: 'Ar Condicionado Dual Zone, Interior Mocha, Far├│is Full LED, Teto Solar, Painel Curvo BMW Live Cockpit',
    fotos: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=800&q=80',
    video: 'https://www.youtube.com/embed/PJgQ2V20jiY',
    sinal: 5000, expiracao: 30, vendedores: 'Marcos Freitas, Roberto Oliveira',
    laudoAprovado: true
  };

  const [timeLeft, setTimeLeft] = useState(data.expiracao * 60); 
  const [showPixModal, setShowPixModal] = useState(false);
  const [selectedVendedor, setSelectedVendedor] = useState('');
  
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showVideo, setShowVideo] = useState(false);
  
  const economia = data.fipeValue - data.valorVenda;
  const photosArray = data.fotos ? data.fotos.split(',').map((url: any) => url.trim()).filter(Boolean) : ['https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=800&q=80'];

  const isPrePublish = reservation && !recentReservations.some((r: any) => r.id === reservation.id);

  const handlePublish = () => {
    if (reservasUsadas >= totalReservasPlano) {
      showToast('Limite de links do plano atingido pela concession├íria.', 'error');
      return;
    }
    setRecentReservations([reservation, ...recentReservations]);
    setReservasUsadas((prev: any) => prev + 1);
    showToast('Link de reserva criado e publicado com sucesso!', 'success');
    navigateTo('home');
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
        onClick={() => navigateTo(isPrePublish ? 'cadastrar-reserva' : 'dashboard')} 
        className="absolute top-6 left-6 text-slate-600 hover:text-slate-900 font-semibold flex items-center text-sm transition z-20 bg-white border border-slate-200 px-4 py-2 rounded-xl"
      >
        <ChevronLeft size={16} className="mr-1"/> {isPrePublish ? 'Voltar para o Cadastro' : 'Voltar ao Sistema'}
      </button>

      {isPrePublish && (
        <div className="w-full max-w-5xl bg-white border border-slate-200 p-5 rounded-3xl flex flex-col sm:flex-row justify-between items-center gap-4 mt-12 relative overflow-hidden">
          <div className="text-left">
            <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
              <Sparkles className="text-blue-600" size={16} /> Modo Pr├®-visualiza├º├úo da Reserva
            </h4>
            <p className="text-xs text-slate-500 mt-1 font-medium">Voc├¬ est├í visualizando a proposta antes de ativ├í-la. Confirme abaixo para gerar o link.</p>
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
              <span className="font-bold text-xs uppercase tracking-wider">Ve├¡culo com Laudo Cautelar Verificado</span>
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
                      alt={`Foto do ve├¡culo ${index + 1}`} 
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
              <h3 className="text-xl font-bold mb-6 text-slate-900 tracking-tight">Ficha T├®cnica e Destaques</h3>
              
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
                  <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">C├ómbio</span>
                  <span className="font-extrabold text-base text-slate-900">{data.cambio || 'Autom├ítico'}</span>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">Motor</span>
                  <span className="font-extrabold text-base text-slate-900">{data.motorText || 'N/D'}</span>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-4 mb-8">
                <div className="w-full md:w-1/3 bg-slate-50 border border-slate-200 p-5 rounded-2xl flex flex-col justify-center">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">M├®dia FIPE Oficial</span>
                  <span className="font-black text-xl text-slate-800">{formatCurrency(data.fipeValue)}</span>
                </div>
                {economia > 0 && (
                  <div className="w-full md:w-2/3 bg-blue-50 border border-blue-100 rounded-2xl p-5 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-blue-600 uppercase tracking-widest block mb-0.5">Oportunidade de Mercado</span>
                      <span className="font-black text-lg text-slate-900">Abaixo da tabela oficial</span>
                    </div>
                    <span className="bg-blue-600 text-white font-extrabold text-xs px-3.5 py-2 rounded-full">
                      Voc├¬ economiza {formatCurrency(economia)}
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
            </div>
            
            {/* Live Chat Drawer */}
            <LiveChatSimulator sellerName={data.vendedores ? data.vendedores.split(',')[0].trim() : 'Consultor'} showToast={showToast} />
          </div>

          {/* Pricing Signal Booking card */}
          <div>
            <div className="bg-white rounded-3xl p-8 border border-slate-200 sticky top-24">
              <h3 className="text-2xl font-bold mb-4 text-slate-900 tracking-tight">Garantir Reserva</h3>
              <p className="text-sm font-medium text-slate-500 mb-8 leading-relaxed">
                Ao efetuar o sinal de garantia, este ve├¡culo ├® bloqueado imediatamente de visitas, testes e outros vendedores at├® voc├¬ assinar o contrato final.
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
                  {data.vendedores.split(',').map((v, i) => (
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
        <PixModal onClose={() => setShowPixModal(false)} sinal={data.sinal} vendedor={selectedVendedor} showToast={showToast} />
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
  totalReservasPlano = 30 
}) {
  const data = reservation || {
    title: 'BMW 320i Sport GP 2024',
    anoText: '2024', corText: 'Preto Safira', motorText: '2.0 TwinPower Flex', km: '3.200', cambio: 'ZF Autom├ítico', combustivel: 'Flex',
    fipeValue: 285000, valorVenda: 269000,
    fotos: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=800&q=80',
    sinal: 5000, expiracao: 120, vendedores: 'Marcos Freitas',
    laudoAprovado: true,
    opcionais: 'Teto Solar, Couro Mocha, Rodas Liga Leve 18", Far├│is Full LED, Painel Widescreen Curvo'
  };

  const [timeLeft, setTimeLeft] = useState(data.expiracao * 60); 
  const [showPixModal, setShowPixModal] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  
  const economiaPct = Math.round((1 - (data.valorVenda / data.fipeValue)) * 100) || 6;
  const photosArray = data.fotos ? data.fotos.split(',').map((url: any) => url.trim()).filter(Boolean) : ['https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=800&q=80'];

  const isPrePublish = reservation && !recentReservations.some((r: any) => r.id === reservation.id);

  const handlePublish = () => {
    if (reservasUsadas >= totalReservasPlano) {
      showToast('Limite de links do plano atingido pela concession├íria.', 'error');
      return;
    }
    setRecentReservations([reservation, ...recentReservations]);
    setReservasUsadas((prev: any) => prev + 1);
    showToast('Link de reserva criado e publicado com sucesso!', 'success');
    navigateTo('home');
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
        onClick={() => navigateTo(isPrePublish ? 'cadastrar-reserva' : 'dashboard')} 
        className="absolute top-6 left-6 text-slate-600 hover:text-slate-900 font-semibold flex items-center text-sm transition z-20 bg-white border border-slate-200 px-4 py-2 rounded-xl"
      >
        <ChevronLeft size={16} className="mr-1"/> {isPrePublish ? 'Voltar para o Cadastro' : 'Voltar ao Painel'}
      </button>

      {isPrePublish && (
        <div className="absolute top-6 right-6 bg-white border border-slate-200 p-5 rounded-2xl flex flex-col justify-between items-center gap-3 z-20 w-64">
          <div className="text-center">
            <h4 className="font-extrabold text-xs text-slate-900">Visualiza├º├úo Mobile</h4>
            <p className="text-[10px] text-slate-500 mt-1 font-semibold leading-relaxed">Confirme a proposta abaixo para salv├í-la no painel.</p>
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
            <ArrowLeft size={20} className="mr-3 cursor-pointer text-slate-850" onClick={() => navigateTo('dashboard')} />
            <h2 className="text-base font-bold">Proposta de Showroom</h2>
          </div>
          <Share size={18} className="cursor-pointer text-slate-850" />
        </div>

        {/* Scrollable container on phone view */}
        <div className="flex-1 overflow-y-auto pb-24 bg-white">
          
          {/* Photos and Indicators */}
          <div className="relative w-full h-56 bg-slate-50 overflow-hidden">
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
              {data.anoText || '2024'} ÔÇó {data.km || '0 km'} ÔÇó {data.corText || 'Preto'} ÔÇó {data.cambio || 'Autom├ítico'}
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
              <h3 className="text-[10px] font-bold uppercase tracking-widest mb-1 text-slate-500">RESERVADO EXCLUSIVAMENTE PARA VOC├è</h3>
              <div className="flex justify-between items-end mb-3">
                <span className="text-3xl font-black leading-none font-mono text-slate-900">{formatTimeFull(timeLeft)}</span>
                <span className="bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase">ATIVO</span>
              </div>
              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden border border-slate-300">
                 <div className="bg-blue-600 h-full" style={{ width: `${progressPercent}%` }}></div>
              </div>
              <p className="text-[10px] text-slate-500 font-semibold mt-1">4 clientes est├úo visualizando este link agora</p>
            </div>

            {/* Specs visual cards */}
            <div className="grid grid-cols-2 gap-2 mb-6">
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                <span className="block text-[10px] text-slate-500 mb-0.5 font-bold uppercase tracking-wider">Combust├¡vel</span>
                <span className="block text-xs font-bold text-slate-900">{data.combustivel || 'Flex'}</span>
              </div>
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                <span className="block text-[10px] text-slate-500 mb-0.5 font-bold uppercase tracking-wider">Quilometragem</span>
                <span className="block text-xs font-bold text-slate-900">{data.km || 'N/A'}</span>
              </div>
            </div>

            {/* Simulated instant client messaging pane inside the mobile frame */}
            <div className="border-t border-slate-200 pt-6">
              <LiveChatSimulator sellerName={data.vendedores ? data.vendedores.split(',')[0].trim() : 'Consultor'} showToast={showToast} embeddedInMobile />
            </div>

          </div>
        </div>

        {/* Bottom Fixed Sticky Action Bar in phone emulator */}
        <div className="absolute bottom-0 left-0 w-full bg-white border-t border-slate-200 p-4 flex items-center justify-between space-x-3 z-50 text-black">
          <button 
            onClick={() => setShowPixModal(true)}
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
        <PixModal onClose={() => setShowPixModal(false)} sinal={data.sinal} vendedor={data.vendedores ? data.vendedores.split(',')[0] : 'Consultor'} showToast={showToast} />
      )}
    </div>
  );
}

// --- NEW CHAT SIMULATOR COMPONENT ---
function LiveChatSimulator({ sellerName, showToast, embeddedInMobile = false }) {
  const [messages, setMessages] = useState([
    { id: 1, sender: 'seller', text: `Ol├í! Sou o ${sellerName}. Montei esta proposta com muito carinho. O sinal garante que o carro saia da vitrine virtual para voc├¬ vir fechar a compra sem pressa. D├║vidas?` }
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
      let responseText = "Perfeito! Assim que confirmar o sinal, eu j├í emito seu contrato pr├®-aprovado de reserva digital no nosso sistema administrativo.";
      if (inputText.toLowerCase().includes('garantia') || inputText.toLowerCase().includes('laudo')) {
        responseText = "Sim! Nosso laudo ├® 100% aprovado pela vistoria. Se voc├¬ fechar o PIX do sinal, eu deixo a chave guardada na minha mesa para seu teste amanh├ú.";
      } else if (inputText.toLowerCase().includes('fipe') || inputText.toLowerCase().includes('pre├ºo') || inputText.toLowerCase().includes('preco')) {
        responseText = "Esse valor ├® exclusivo para fechamento digital pelo link. Conseguimos cobrir a FIPE neste lote de ofertas especiais de showroom.";
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
function PixModal({ onClose, sinal, vendedor, showToast }) {
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState('waiting'); 
  const pixHash = "00020101021226840014br.gov.bcb.pix2562reservacar_sinal_exclusivo_bmw_showroom_premium_token_secure_uuid_9921_04";

  const handleCopy = () => {
    copyToClipboard(pixHash, (success) => {
      if (success) {
        setCopied(true);
        showToast('C├│digo PIX copiado para a ├írea de transfer├¬ncia!', 'success');
        setTimeout(() => setCopied(false), 2500);
      } else {
        showToast('Erro ao copiar c├│digo.', 'error');
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
              }}
              className="w-full bg-white hover:bg-slate-50 text-slate-850 border border-slate-200 font-bold text-xs rounded-xl py-3.5 transition"
            >
              Simular Confirma├º├úo de Pagamento PIX
            </button>
          </>
        ) : (
          <div className="text-center py-6">
            <div className="w-20 h-20 bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={40} className="text-emerald-600 animate-bounce" />
            </div>
            <h3 className="text-3xl font-black mb-3 text-slate-900 tracking-tight">Reserva Confirmada!</h3>
            <p className="text-sm font-medium text-slate-500 mb-8 leading-relaxed px-2">
              O sinal foi processado com sucesso. O ve├¡culo foi travado e retirado da vitrine comercial do showroom para seu fechamento presencial presencial.
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
function CadastroReservaClienteView({ navigateTo, showToast, setActiveReservation }) {
  const [step, setStep] = useState(1);
  const [marcas, setMarcas] = useState([]);
  const [modelos, setModelos] = useState([]);
  const [anos, setAnos] = useState([]);
  
  const [selectedMarca, setSelectedMarca] = useState('');
  const [selectedModelo, setSelectedModelo] = useState('');
  const [selectedAno, setSelectedAno] = useState('');
  const [isFipeLoading, setIsFipeLoading] = useState(false);

  const [vehicleData, setVehicleData] = useState<any>({
    brand: '',
    model: '',
    version: '',
    year: '',
    color: 'Branco',
    fuel: 'Flex',
    doors: '4 Portas',
    transmission: 'Autom├ítico',
    selectedOpcionais: ['Ar Condicionado', 'Dire├º├úo El├®trica', 'Freio ABS', 'Central Multim├¡dia'],
    km: '15.000',
    description: 'Ve├¡culo em excelente estado de conserva├º├úo, ├║nico dono e com todas as revis├Áes peri├│dicas em dia.',
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
  });

  const [sinal, setSinal] = useState('');
  const [expiracao, setExpiracao] = useState(60);

  useEffect(() => {
    if (vehicleData.sinal) {
      setSinal(String(vehicleData.sinal));
    }
    if (vehicleData.expiracaoMinutos) {
      setExpiracao(vehicleData.expiracaoMinutos);
    }
  }, [vehicleData.sinal, vehicleData.expiracaoMinutos]);

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
    'Banco em Couro', 'Travas El├®tricas', 'Vidros El├®tricos', 'Dire├º├úo El├®trica',
    'Rodas de Liga Leve', 'Teto Solar', 'Air Bag', 'Alarme', 'Desemba├ºador Traseiro',
    'Freio ABS', 'Central Multim├¡dia', 'Sensores de Estacionamento'
  ];

  // Carrega as marcas na inicializa├º├úo
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

    setIsFipeLoading(true);
    fetch(`https://parallelum.com.br/fipe/api/v1/carros/marcas/${id}/modelos`)
      .then(res => res.json())
      .then(data => {
        if (data && data.modelos) setModelos(data.modelos);
        setIsFipeLoading(false);
      })
      .catch(() => {
        setModelos(MOCK_MODELS[brandName] || []);
        setIsFipeLoading(false);
      });
  };

  const handleModeloChange = (e) => {
    const id = e.target.value;
    setSelectedModelo(id);
    setAnos([]); setSelectedAno('');
    if (!id) return;

    const modelName = modelos.find(m => m.codigo == id)?.nome || id;
    setVehicleData((prev) => ({ ...prev, model: modelName }));

    setIsFipeLoading(true);
    fetch(`https://parallelum.com.br/fipe/api/v1/carros/marcas/${selectedMarca}/modelos/${id}/anos`)
      .then(res => res.json())
      .then(data => {
        if (data && data.length > 0) setAnos(data);
        setIsFipeLoading(false);
      })
      .catch(() => {
        setAnos(MOCK_YEARS);
        setIsFipeLoading(false);
      });
  };

  const handleAnoChange = (e) => {
    const id = e.target.value;
    setSelectedAno(id);
    if (!id) return;

    setIsFipeLoading(true);
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
        setIsFipeLoading(false);
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
        setIsFipeLoading(false);
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
    setVehicleData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
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
      showToast('Por favor, preencha a FIPE e o pre├ºo do ve├¡culo.', 'error');
      return;
    }
    if (!vehicleData.fullName || !vehicleData.cpf || !vehicleData.phone) {
      showToast('Por favor, preencha os dados da reserva (Passo 5).', 'error');
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
      vendedores: vehicleData.fullName,
      laudoAprovado: true,
      status: 'Active',
      elapsedSeconds: 0
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
              { num: 2, label: 'KM & Pre├ºo' },
              { num: 3, label: 'Opcionais' },
              { num: 4, label: 'Fotos' },
              { num: 5, label: 'Dados de Contato' }
            ].map(s => (
              <div key={s.num} className="flex flex-col gap-2">
                <div className="flex items-center gap-1.5">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white ${step >= s.num ? 'bg-blue-600' : 'bg-slate-200'}`}>
                    {step > s.num ? 'Ô£ô' : s.num}
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
          {isFipeLoading && (
            <div className="absolute inset-0 bg-white/75 backdrop-blur-sm flex items-center justify-center gap-2 text-indigo-600 font-bold z-35">
              <RefreshCw className="animate-spin" size={20} /> Carregando base FIPE...
            </div>
          )}

          <div>
            {/* STEP 1: BUSCA FIPE */}
            {step === 1 && (
              <div className="max-w-xl mx-auto w-full text-center py-4">
                <h2 className="text-2xl font-black text-black mb-2 tracking-tight">Selecione a fipe do veiculo</h2>
                <p className="text-slate-500 text-xs mb-8 font-medium">Consulte em tempo real as informa├º├Áes oficiais da FIPE para preencher seu an├║ncio.</p>
                
                <div className="text-left space-y-4">
                  <div>
                    <label className={labelClass}>Marca</label>
                    <select className={inputClass} onChange={handleMarcaChange} value={selectedMarca}>
                      <option value="">Selecione a marca...</option>
                      {marcas.map(m => <option key={m.codigo} value={m.codigo}>{m.nome}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Modelo</label>
                    <select className={inputClass} onChange={handleModeloChange} value={selectedModelo} disabled={!selectedMarca}>
                      <option value="">Selecione o modelo...</option>
                      {modelos.map(m => <option key={m.codigo} value={m.codigo}>{m.nome}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Ano / Vers├úo</label>
                    <select className={inputClass} onChange={handleAnoChange} value={selectedAno} disabled={!selectedModelo}>
                      <option value="">Selecione a vers├úo...</option>
                      {anos.map(a => <option key={a.codigo} value={a.codigo}>{a.nome}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: PRE├çO / KM */}
            {step === 2 && (
              <div className="max-w-xl mx-auto w-full py-4 text-left">
                <h2 className="text-2xl font-black text-black mb-2 text-center tracking-tight">Qual o pre├ºo e quilometragem do ve├¡culo?</h2>
                <p className="text-slate-500 text-xs mb-8 text-center font-medium">Informe a quilometragem atual e compare os valores oficiais.</p>

                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
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
                      <label className={labelClass}>Pre├ºo de Venda (R$)</label>
                      <input 
                        type="text" 
                        name="price" 
                        value={vehicleData.price} 
                        onChange={handleInputChange} 
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
                        onChange={(e) => setSinal(e.target.value.replace(/\D/g, ''))} 
                        className={inputClass} 
                        placeholder="Ex: 1500"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className={labelClass}>Expira├º├úo da reserva *</label>
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

                  {/* Webmotors evaluation chart */}
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 text-center">Comparativo de M├®dia Webmotors</h4>
                    
                    <div className="flex justify-around items-end h-28 mb-4 pt-4 relative">
                      <div className="flex flex-col items-center w-20">
                        <span className="text-[9px] font-bold text-slate-500 mb-1">{formatCurrency(vehicleData.webmotorsMin)}</span>
                        <div className="w-8 bg-slate-300 rounded-t-md h-12"></div>
                        <span className="text-[10px] font-bold text-slate-500 mt-2">M├¡nimo</span>
                      </div>

                      <div className="flex flex-col items-center w-20">
                        <span className="text-[9px] font-black text-blue-600 mb-1">{formatCurrency(vehicleData.webmotorsMed)}</span>
                        <div className="w-8 bg-blue-600 rounded-t-md h-20"></div>
                        <span className="text-[10px] font-black text-blue-600 mt-2">M├®dio</span>
                      </div>

                      <div className="flex flex-col items-center w-20">
                        <span className="text-[9px] font-bold text-slate-500 mb-1">{formatCurrency(vehicleData.webmotorsMax)}</span>
                        <div className="w-8 bg-slate-400 rounded-t-md h-24"></div>
                        <span className="text-[10px] font-bold text-slate-500 mt-2">M├íximo</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center border-t border-slate-200 pt-3 text-xs font-semibold text-slate-600">
                      <span>Pre├ºo FIPE Lido</span>
                      <span className="font-bold text-black">{formatCurrency(vehicleData.fipePrice)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: OPCIONAIS */}
            {step === 3 && (
              <div className="max-w-3xl mx-auto w-full text-center py-4">
                <h2 className="text-2xl font-black text-black mb-2 tracking-tight">Informe os opcionais do seu ve├¡culo</h2>
                <p className="text-slate-500 text-xs mb-8 font-medium">Selecione os diferenciais do ve├¡culo que chamam a aten├º├úo dos compradores de showroom.</p>
                
                <div className="flex flex-wrap justify-center gap-2.5 max-w-2xl mx-auto">
                  {opcionaisPool.map((opc, idx) => {
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
                        <span>{isSelected ? 'Ô£ô' : '+'}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STEP 4: FOTOS */}
            {step === 4 && (
              <div className="max-w-2xl mx-auto w-full text-center py-4">
                <h2 className="text-2xl font-black text-black mb-2 tracking-tight">Adicione as fotos do ve├¡culo</h2>
                <p className="text-slate-500 text-xs mb-8 font-medium">Boas fotos aumentam as chances de reserva em at├® 70%.</p>
                
                <div className="border-2 border-dashed border-slate-350 rounded-3xl p-6 hover:border-black transition bg-slate-50 cursor-pointer flex flex-col items-center">
                  <UploadCloud className="text-slate-450 mb-2" size={32} />
                  <span className="font-bold text-xs text-slate-800">Carregar fotos do ve├¡culo</span>
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

            {/* STEP 5: DADOS DE CONTATO */}
            {step === 5 && (
              <div className="max-w-xl mx-auto w-full text-left py-4">
                <h2 className="text-2xl font-black text-black mb-2 text-center tracking-tight">Quem receber├í as propostas de sinal?</h2>
                <p className="text-slate-500 text-xs mb-8 text-center font-medium">Informe seus dados para a emiss├úo do contrato de reserva digital.</p>
                
                <div className="space-y-4">
                  <div>
                    <label className={labelClass}>Nome Completo *</label>
                    <input type="text" name="fullName" value={vehicleData.fullName} onChange={handleInputChange} className={inputClass} placeholder="Ex: Allan Salgado" required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>CPF *</label>
                      <input type="text" name="cpf" value={vehicleData.cpf} onChange={handleInputChange} className={inputClass} placeholder="Ex: 370.875.668-14" required />
                    </div>
                    <div>
                      <label className={labelClass}>WhatsApp / Celular *</label>
                      <input type="text" name="phone" value={vehicleData.phone} onChange={handleInputChange} className={inputClass} placeholder="Ex: (11) 96840-3485" required />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>E-mail *</label>
                      <input type="email" name="email" value={vehicleData.email} onChange={handleInputChange} className={inputClass} placeholder="Ex: wollace@gmail.com" required />
                    </div>
                    <div>
                      <label className={labelClass}>CEP do An├║ncio *</label>
                      <input type="text" name="cep" value={vehicleData.cep} onChange={handleInputChange} className={inputClass} placeholder="Ex: 02522-000" required />
                    </div>
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
                  navigateTo('home');
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
                    if (!vehicleData.price) {
                      showToast('Por favor, informe o pre├ºo do ve├¡culo.', 'error');
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

// --- NEW COMPONENT: WIZARD FLOW "ASSINATURA CONCESSION├üRIA" ---
function AssinaturaEmpresaView({ navigateTo, showToast, setTotalReservasPlano, setReservasUsadas, setEmpresaLogada }) {
  const [step, setStep] = useState(1);
  const [empresaData, setEmpresaData] = useState({
    nome: '',
    cnpj: '',
    email: '',
    telefone: '',
    plano: 'Plus', // 'Basic', 'Plus', 'Premium'
    paymentMethod: 'credit_card',
    couponCode: '',
    discountApplied: false
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEmpresaData(prev => ({ ...prev, [name]: value }));
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
      showToast('Cupom inv├ílido.', 'error');
    }
  };

  const getPlanCredits = () => {
    if (empresaData.plano === 'Basic') return 10;
    if (empresaData.plano === 'Premium') return 50;
    return 30; // Plus
  };

  const handleFinalize = () => {
    if (!empresaData.nome || !empresaData.cnpj || !empresaData.email) {
      showToast('Por favor, preencha todos os campos obrigat├│rios.', 'error');
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
      plano: empresaData.plano
    });
    showToast(`Assinatura realizada com sucesso! Voc├¬ contratou o Plano ${empresaData.plano} com ${credits} cr├®ditos.`, 'success');
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
              { num: 1, label: 'Identifica├º├úo' },
              { num: 2, label: 'Escolha o Plano' },
              { num: 3, label: 'Pagamento' },
              { num: 4, label: 'Acesso Admin' }
            ].map(s => (
              <div key={s.num} className="flex flex-col gap-2">
                <div className="flex items-center gap-1.5">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white ${step >= s.num ? 'bg-blue-600' : 'bg-slate-200'}`}>
                    {step > s.num ? 'Ô£ô' : s.num}
                  </span>
                  <span className="font-bold text-[10px] text-slate-500 hidden md:inline">{s.label}</span>
                </div>
                <div className={`h-1 w-full rounded-full ${step >= s.num ? 'bg-blue-600' : 'bg-slate-200'}`}></div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Content Box */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-10 min-h-[460px] flex flex-col justify-between">
          
          <div>
            {/* STEP 1: IDENTIFICACAO */}
            {step === 1 && (
              <div className="max-w-xl mx-auto w-full py-4 text-left">
                <h2 className="text-2xl font-black text-slate-900 mb-2 text-center tracking-tight">Identifica├º├úo Corporativa</h2>
                <p className="text-slate-500 text-xs mb-8 text-center font-medium">Informe os dados da sua empresa ou concession├íria para cadastro.</p>

                <div className="space-y-4">
                  <div>
                    <label className={labelClass}>Nome da Concession├íria *</label>
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

            {/* STEP 2: ESCOLHA DO PLANO */}
            {step === 2 && (
              <div className="w-full py-4 text-center">
                <h2 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">Escolha o plano de cr├®ditos ideal para sua concession├íria</h2>
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
                    <span className="text-[10px] font-bold text-slate-400">Melhor custo benef├¡cio</span>
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
                    <span className="text-[10px] font-bold text-slate-400">Exposi├º├úo m├íxima do showroom</span>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: CHECKOUT PAGAMENTO */}
            {step === 3 && (
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
                          <h4 className="font-extrabold text-xs text-slate-900">Cart├úo de Cr├®dito</h4>
                          <p className="text-[10px] text-slate-500">Libera├º├úo instant├ónea dos cr├®ditos</p>
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
                            <p className="text-[10px] text-slate-500">Aprova├º├úo em segundos</p>
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
                        <p className="text-[10px] text-emerald-600 font-bold mt-1.5">Ô£ô Cupom aplicado com sucesso!</p>
                      )}
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl text-left h-max">
                    <h4 className="text-[9px] font-bold text-slate-550 uppercase tracking-widest mb-3">Resumo da Assinatura</h4>
                    <div className="text-xs space-y-2 border-b border-slate-200 pb-3 mb-3">
                      <div className="flex justify-between text-slate-550">
                        <span>Plano:</span>
                        <span className="text-slate-900 font-bold">{empresaData.plano}</span>
                      </div>
                      <div className="flex justify-between text-slate-550">
                        <span>Cr├®ditos:</span>
                        <span className="text-slate-900 font-bold">{getPlanCredits()} links</span>
                      </div>
                      <div className="flex justify-between text-slate-550">
                        <span>Pre├ºo:</span>
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
            
            {step < 3 ? (
              <button
                type="button"
                onClick={() => {
                  if (step === 1 && (!empresaData.nome || !empresaData.cnpj || !empresaData.email)) {
                    showToast('Por favor, preencha todos os campos obrigat├│rios.', 'error');
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
