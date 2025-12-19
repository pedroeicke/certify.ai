import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { 
  Upload, 
  FileText, 
  Users, 
  Download, 
  CheckCircle2, 
  Loader2,
  AlertCircle,
  Type,
  List,
  Moon,
  Sun,
  ChevronRight,
  RefreshCw,
  MoveVertical,
  Settings2
} from 'lucide-react';
import { Step, Participant, LayoutConfig, GenerationProgress } from './types';
import { parseParticipants, generateCertificatesZip } from './services/pdfService';

// Define explicit interfaces for ErrorBoundary to fix TypeScript property access errors
interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// Error Boundary para evitar tela branca fatal
// Fixed "Property 'state' does not exist" and "Property 'props' does not exist" by providing generic types to Component
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  componentDidCatch(error: Error, errorInfo: ErrorInfo) { console.error("Uncaught error:", error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
          <div className="text-center space-y-6 max-w-md bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] shadow-2xl border border-red-100 dark:border-red-900/30">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-2xl flex items-center justify-center mx-auto">
              <AlertCircle size={32} />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Ops! Algo deu errado</h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                {this.state.error?.message || "Ocorreu um erro inesperado ao carregar a interface."}
              </p>
            </div>
            <button 
              onClick={() => window.location.reload()} 
              className="w-full py-4 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all active:scale-95"
            >
              <RefreshCw size={18} /> Tentar Novamente
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const GradientDefs = () => (
  <svg width="0" height="0" className="absolute">
    <defs>
      <linearGradient id="main-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#0ea5e9" />
        <stop offset="100%" stopColor="#2dd4bf" />
      </linearGradient>
    </defs>
  </svg>
);

const Logo = () => (
  <div className="flex items-center gap-2 group cursor-default select-none">
    <div className="relative w-9 h-9">
      <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full transform group-hover:rotate-12 transition-transform duration-300">
        <path d="M10 4C7.79086 4 6 5.79086 6 8V32C6 34.2091 7.79086 36 10 36H30C32.2091 36 34 34.2091 34 32V12L26 4H10Z" stroke="url(#main-gradient)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M26 4V12H34" stroke="url(#main-gradient)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M14 22L18 26L26 16" stroke="url(#main-gradient)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
    <div className="flex items-baseline font-sans">
      <span className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white">certify</span>
      <span className="text-2xl font-bold tracking-tight bg-gradient-to-br from-sky-500 to-teal-400 bg-clip-text text-transparent">.ai</span>
    </div>
  </div>
);

const DEFAULT_LAYOUT: LayoutConfig = {
  x: 421, 
  y: 340, // Ajustado para ficar acima da linha central conforme feedback
  fontSize: 65,
  color: '#FFFFFF',
  fontFamily: 'Great Vibes'
};

const AppContent: React.FC = () => {
  const [step, setStep] = useState<Step>(Step.UPLOAD_TEMPLATE);
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [templateBytes, setTemplateBytes] = useState<ArrayBuffer | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [manualNames, setManualNames] = useState<string>('');
  const [inputMethod, setInputMethod] = useState<'file' | 'manual'>('file');
  const [layoutConfig, setLayoutConfig] = useState<LayoutConfig>(DEFAULT_LAYOUT);
  const [progress, setProgress] = useState<GenerationProgress>({ total: 0, current: 0, status: '' });
  const [zipUrl, setZipUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  useEffect(() => {
    if (inputMethod === 'manual') {
      const names = manualNames.split('\n').map(n => n.trim()).filter(n => n.length > 0).map(nome => ({ nome }));
      setParticipants(names);
    }
  }, [manualNames, inputMethod]);

  const handleTemplateUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setTemplateFile(file);
      const bytes = await file.arrayBuffer();
      setTemplateBytes(bytes);
      setError(null);
      setStep(Step.UPLOAD_LIST);
    }
  };

  const handleListUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const data = await parseParticipants(file);
        if (data.length === 0) throw new Error("Planilha vazia.");
        setParticipants(data);
        setError(null);
      } catch (err: any) {
        setError(err.message);
      }
    }
  };

  const startGeneration = async () => {
    if (!templateBytes || !participants.length) return;
    setStep(Step.GENERATION);
    try {
      const zipBlob = await generateCertificatesZip(templateBytes, participants, layoutConfig, (current) => 
        setProgress(prev => ({ ...prev, current, total: participants.length, status: `Gerando ${current}/${participants.length}...` }))
      );
      setZipUrl(URL.createObjectURL(zipBlob));
      setStep(Step.COMPLETE);
    } catch (err) {
      console.error(err);
      setError("Falha na geração dos documentos.");
      setStep(Step.UPLOAD_LIST);
    }
  };

  const resetApp = () => {
    setStep(Step.UPLOAD_TEMPLATE);
    setTemplateFile(null);
    setTemplateBytes(null);
    setParticipants([]);
    setManualNames('');
    setZipUrl(null);
    setError(null);
    setProgress({ total: 0, current: 0, status: '' });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors duration-500">
      <GradientDefs />
      <header className="backdrop-blur-xl bg-white/70 dark:bg-slate-900/70 border-b border-slate-200/50 dark:border-slate-800/50 py-5 px-6 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Logo />
          <button onClick={() => setDarkMode(!darkMode)} className="p-2.5 rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 hover:scale-110 transition-all">
            {darkMode ? <Sun size={20} className="text-teal-400" /> : <Moon size={20} className="text-sky-600" />}
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto p-6 sm:p-12">
        <div className="backdrop-blur-2xl bg-white/80 dark:bg-slate-900/80 rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] border border-white/40 dark:border-slate-800/40 overflow-hidden">
          {step === Step.GENERATION ? (
            <div className="p-24 flex flex-col items-center justify-center space-y-8">
              <Loader2 className="animate-spin text-sky-500" size={64} />
              <div className="text-center w-full max-w-md">
                <p className="text-xl font-bold mb-4">{progress.status}</p>
                <div className="w-full h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-1 shadow-inner">
                  <div className="h-full bg-gradient-to-r from-sky-500 to-teal-400 rounded-full transition-all duration-500" style={{ width: `${(progress.current / progress.total) * 100}%` }} />
                </div>
              </div>
            </div>
          ) : step === Step.COMPLETE ? (
            <div className="p-24 flex flex-col items-center text-center space-y-8">
              <div className="w-28 h-28 bg-gradient-to-br from-emerald-400 to-teal-500 text-white rounded-[2rem] flex items-center justify-center shadow-lg shadow-teal-500/30">
                <CheckCircle2 size={64} />
              </div>
              <div>
                <h2 className="text-4xl font-black mb-3 italic tracking-tight">Missão Cumprida!</h2>
                <p className="text-slate-500 dark:text-slate-400 text-lg">Seus {participants.length} certificados foram gerados.</p>
              </div>
              <a href={zipUrl!} download="certificados.zip" className="group bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-600 hover:to-teal-600 text-white font-black py-6 px-14 rounded-3xl flex items-center gap-4 shadow-2xl shadow-sky-500/40 transition-all hover:scale-105 active:scale-95">
                <Download size={28} /> BAIXAR TUDO AGORA
              </a>
              <button onClick={resetApp} className="text-slate-400 hover:text-sky-500 font-bold transition-colors">Gerar Novo Lote</button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100/50 dark:divide-slate-800/50">
              {error && <div className="p-6 bg-red-500/10 text-red-500 text-center font-bold flex items-center justify-center gap-2 border-b border-red-500/20"><AlertCircle size={20} /> {error}</div>}
              
              <div className="p-10 sm:p-14">
                <h3 className="text-2xl font-bold mb-8 flex items-center gap-4">
                  <span className="w-10 h-10 rounded-2xl bg-sky-500/10 text-sky-500 flex items-center justify-center text-lg font-black italic">01</span>
                  Modelo Base
                </h3>
                {!templateFile ? (
                  <label className="group border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2rem] p-16 flex flex-col items-center justify-center cursor-pointer hover:bg-sky-50/30 dark:hover:bg-sky-900/10 hover:border-sky-300 transition-all duration-300">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-xl group-hover:scale-110 transition-transform duration-300">
                      <Upload stroke="url(#main-gradient)" size={48} />
                    </div>
                    <p className="text-xl font-bold mt-6">Arraste seu PDF aqui</p>
                    <p className="text-slate-400 mt-2">Padrão: A4 Paisagem</p>
                    <input type="file" accept=".pdf" className="hidden" onChange={handleTemplateUpload} />
                  </label>
                ) : (
                  <div className="p-8 bg-sky-500/5 border border-sky-500/20 rounded-3xl flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-sm"><FileText stroke="url(#main-gradient)" size={32} /></div>
                      <div>
                        <p className="text-lg font-bold truncate max-w-xs">{templateFile.name}</p>
                        <p className="text-sky-500 font-bold text-sm uppercase tracking-widest">Modelo Carregado</p>
                      </div>
                    </div>
                    <button onClick={() => setTemplateFile(null)} className="px-6 py-3 bg-white dark:bg-slate-800 rounded-xl font-bold text-sky-500 shadow-sm hover:bg-sky-500 hover:text-white transition-all">Alterar</button>
                  </div>
                )}
              </div>

              <div className={`p-10 sm:p-14 transition-opacity duration-500 ${!templateFile ? 'opacity-20 pointer-events-none grayscale' : ''}`}>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
                  <h3 className="text-2xl font-bold flex items-center gap-4">
                    <span className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-500 flex items-center justify-center text-lg font-black italic">02</span>
                    Participantes
                  </h3>
                  <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                    <button onClick={() => setInputMethod('file')} className={`px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${inputMethod === 'file' ? 'bg-white dark:bg-slate-700 text-sky-600 shadow-lg' : 'text-slate-400'}`}><List size={16} /> Excel</button>
                    <button onClick={() => setInputMethod('manual')} className={`px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${inputMethod === 'manual' ? 'bg-white dark:bg-slate-700 text-sky-600 shadow-lg' : 'text-slate-400'}`}><Type size={16} /> Texto</button>
                  </div>
                </div>

                {inputMethod === 'file' ? (
                  <label className="group border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2rem] p-12 flex flex-col items-center justify-center cursor-pointer hover:border-teal-300 transition-all duration-300">
                    <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl shadow-lg group-hover:scale-110 transition-transform duration-300"><Users stroke="url(#main-gradient)" size={40} /></div>
                    <p className="text-lg font-bold mt-6">{participants.length > 0 ? `${participants.length} nomes identificados` : 'Carregue sua planilha'}</p>
                    <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleListUpload} />
                  </label>
                ) : (
                  <div className="space-y-4">
                    <textarea value={manualNames} onChange={(e) => setManualNames(e.target.value)} placeholder="Um nome por linha..." className="w-full h-56 p-8 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-800 rounded-3xl focus:border-sky-300 focus:bg-white transition-all outline-none text-lg font-medium" />
                    <div className="flex justify-between items-center text-xs font-black uppercase tracking-widest px-4"><span className="text-slate-400">Separe por quebra de linha</span><span className="text-teal-500">{participants.length} nomes</span></div>
                  </div>
                )}
              </div>

              {participants.length > 0 && (
                <div className="p-10 bg-gradient-to-br from-sky-500/5 to-teal-500/5 space-y-8">
                  <div className="bg-white dark:bg-slate-800/50 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <h4 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-400 mb-6">
                      <Settings2 size={16} /> Ajuste Fino do Layout
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <label className="flex items-center gap-2 font-bold text-slate-600 dark:text-slate-300">
                            <MoveVertical size={18} className="text-sky-500" /> Altura (Eixo Y)
                          </label>
                          <span className="bg-sky-500/10 text-sky-600 px-3 py-1 rounded-lg font-mono font-bold">{layoutConfig.y}pt</span>
                        </div>
                        <input 
                          type="range" min="0" max="595" value={layoutConfig.y} 
                          onChange={(e) => setLayoutConfig({...layoutConfig, y: parseInt(e.target.value)})}
                          className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
                        />
                        <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                          <span>Base do PDF</span>
                          <span>Topo do PDF</span>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <label className="flex items-center gap-2 font-bold text-slate-600 dark:text-slate-300">
                            <Type size={18} className="text-teal-500" /> Tamanho da Fonte
                          </label>
                          <span className="bg-teal-500/10 text-teal-600 px-3 py-1 rounded-lg font-mono font-bold">{layoutConfig.fontSize}pt</span>
                        </div>
                        <input 
                          type="range" min="20" max="150" value={layoutConfig.fontSize} 
                          onChange={(e) => setLayoutConfig({...layoutConfig, fontSize: parseInt(e.target.value)})}
                          className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-500"
                        />
                         <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                          <span>Pequeno</span>
                          <span>Enorme</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                       <p className="text-slate-400 text-sm italic">O nome será centralizado horizontalmente.</p>
                       <div className="font-script text-3xl text-sky-500 opacity-60">Exemplo de Nome</div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-8 pt-4">
                    <div className="space-y-1">
                      <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Resumo</p>
                      <p className="text-slate-600 dark:text-slate-300 font-bold">
                        {participants.length} nomes • Great Vibes • Branco
                      </p>
                    </div>
                    <button onClick={startGeneration} className="w-full sm:w-auto bg-gradient-to-r from-sky-500 to-teal-500 text-white font-black py-5 px-16 rounded-3xl shadow-2xl shadow-sky-500/30 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 text-lg">
                      GERAR EM LOTE <ChevronRight size={24} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <footer className="py-12 text-center">
        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
          APP Desenvolvido por <a href="https://www.pastelapps.dev/" className="bg-gradient-to-r from-sky-500 to-teal-400 bg-clip-text text-transparent hover:opacity-70 transition-opacity">PASTEL APPS</a>
        </p>
      </footer>
    </div>
  );
};

const App = () => (
  <ErrorBoundary>
    <AppContent />
  </ErrorBoundary>
);

export default App;