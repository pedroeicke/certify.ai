
import React, { useState, useEffect } from 'react';
import { 
  Upload, 
  FileText, 
  Users, 
  Download, 
  CheckCircle2, 
  Loader2,
  AlertCircle,
  Settings,
  Type,
  List,
  Moon,
  Sun
} from 'lucide-react';
import { Step, Participant, LayoutConfig, GenerationProgress } from './types.ts';
import { parseParticipants, generateCertificatesZip, pdfToImageBase64 } from './services/pdfService.ts';
import { analyzeCertificateLayout } from './services/geminiService.ts';
import { APP_NAME } from './constants.tsx';

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
      <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <path 
          d="M10 4C7.79086 4 6 5.79086 6 8V32C6 34.2091 7.79086 36 10 36H30C32.2091 36 34 34.2091 34 32V12L26 4H10Z" 
          stroke="url(#main-gradient)" 
          strokeWidth="3" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />
        <path 
          d="M26 4V12H34" 
          stroke="url(#main-gradient)" 
          strokeWidth="3" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />
        <path 
          d="M14 22L18 26L26 16" 
          stroke="url(#main-gradient)" 
          strokeWidth="3.5" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />
      </svg>
    </div>
    <div className="flex items-baseline font-sans">
      <span className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white">certify</span>
      <span className="text-2xl font-bold tracking-tight bg-gradient-to-br from-sky-500 to-teal-400 bg-clip-text text-transparent">.ai</span>
    </div>
  </div>
);

const App: React.FC = () => {
  const [step, setStep] = useState<Step>(Step.UPLOAD_TEMPLATE);
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [templateBytes, setTemplateBytes] = useState<ArrayBuffer | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [manualNames, setManualNames] = useState<string>('');
  const [inputMethod, setInputMethod] = useState<'file' | 'manual'>('file');
  const [layoutConfig, setLayoutConfig] = useState<LayoutConfig | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
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
      const names = manualNames
        .split('\n')
        .map(n => n.trim())
        .filter(n => n.length > 0)
        .map(nome => ({ nome }));
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
      
      setIsAnalyzing(true);
      setStep(Step.AI_ANALYSIS);
      try {
        const base64 = await pdfToImageBase64(file);
        const config = await analyzeCertificateLayout(base64);
        setLayoutConfig(config);
        setStep(Step.UPLOAD_LIST);
      } catch (err: any) {
        console.error(err);
        setError("Erro na análise da IA. Usando posicionamento padrão centralizado.");
        setLayoutConfig({ x: 421, y: 285, fontSize: 50, color: '#FFFFFF', fontFamily: 'Great Vibes' });
        setStep(Step.UPLOAD_LIST);
      } finally {
        setIsAnalyzing(false);
      }
    }
  };

  const handleListUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const data = await parseParticipants(file);
        if (data.length === 0) throw new Error("Nenhum participante encontrado na planilha.");
        setParticipants(data);
        setError(null);
      } catch (err: any) {
        setError(err.message || "Erro ao processar a planilha.");
      }
    }
  };

  const startGeneration = async () => {
    if (!templateBytes || !participants.length || !layoutConfig) return;
    setStep(Step.GENERATION);
    try {
      const zipBlob = await generateCertificatesZip(
        templateBytes,
        participants,
        layoutConfig,
        (current) => setProgress(prev => ({ 
          ...prev, 
          current, 
          total: participants.length, 
          status: `Gerando certificado ${current} de ${participants.length}...` 
        }))
      );
      setZipUrl(URL.createObjectURL(zipBlob));
      setStep(Step.COMPLETE);
    } catch (err) {
      setError("Falha ao gerar os certificados.");
      setStep(Step.UPLOAD_LIST);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans transition-colors duration-300">
      <GradientDefs />
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-6 px-4 sm:px-8 sticky top-0 z-50 shadow-sm backdrop-blur-md bg-opacity-90">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-sky-100 dark:hover:bg-sky-900/40 hover:text-sky-600 dark:hover:text-sky-400 transition-all border border-transparent hover:border-sky-200 dark:hover:border-sky-800"
              title={darkMode ? "Ativar Modo Claro" : "Ativar Modo Escuro"}
              aria-label="Alternar tema"
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-8">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden transition-all">
          {step === Step.AI_ANALYSIS ? (
            <div className="p-16 flex flex-col items-center justify-center space-y-6 text-center animate-pulse">
              <div className="relative">
                  <Loader2 className="animate-spin text-sky-500" size={64} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <FileText size={24} className="text-teal-400" />
                  </div>
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Analisando Certificado com IA</h2>
                <p className="text-slate-500 dark:text-slate-400 max-w-sm">O Gemini está lendo seu template para encontrar o local ideal para os nomes.</p>
              </div>
            </div>
          ) : step === Step.GENERATION ? (
            <div className="p-16 bg-slate-50 dark:bg-slate-900/50 flex flex-col items-center justify-center space-y-6">
              <Loader2 className="animate-spin text-sky-500" size={48} />
              <div className="text-center w-full max-w-md">
                <p className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">{progress.status}</p>
                <div className="w-full h-3 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
                  <div 
                    className="h-full bg-gradient-to-r from-sky-500 to-teal-400 transition-all duration-300 shadow-[0_0_10px_rgba(14,165,233,0.5)]" 
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  />
                </div>
                <p className="mt-2 text-sm text-slate-400">{Math.round((progress.current / progress.total) * 100)}% concluído</p>
              </div>
            </div>
          ) : step === Step.COMPLETE ? (
            <div className="p-16 flex flex-col items-center text-center space-y-6 animate-in slide-in-from-bottom-4">
              <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center shadow-inner">
                <CheckCircle2 size={56} />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Certificados Prontos!</h2>
                <p className="text-slate-500 dark:text-slate-400">{participants.length} documentos gerados individualmente.</p>
              </div>
              <a 
                href={zipUrl!} 
                download="certificados_gerados.zip" 
                className="bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-600 hover:to-teal-600 text-white font-bold py-5 px-12 rounded-2xl flex items-center gap-3 shadow-xl transition-all hover:scale-105 active:scale-95"
              >
                <Download size={24} /> Baixar Pacote Completo (ZIP)
              </a>
              <button 
                onClick={() => {
                  setStep(Step.UPLOAD_TEMPLATE);
                  setTemplateFile(null);
                  setParticipants([]);
                  setManualNames('');
                }} 
                className="text-slate-400 dark:text-slate-500 font-medium hover:text-sky-500 dark:hover:text-teal-400 underline underline-offset-4 transition-colors"
              >
                Começar Novo Lote
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border-b border-red-100 dark:border-red-900/30 text-red-700 dark:text-red-400 text-sm flex items-center gap-2 animate-in fade-in">
                  <AlertCircle size={16} /> {error}
                </div>
              )}
              
              <div className="p-8">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400 flex items-center justify-center text-sm font-bold">1</span>
                  Modelo do Certificado (PDF)
                </h3>
                {!templateFile ? (
                  <label className="group border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-12 flex flex-col items-center justify-center cursor-pointer bg-slate-50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 hover:border-sky-300 dark:hover:border-teal-700 transition-all shadow-sm">
                    <div className="bg-white dark:bg-slate-700 p-4 rounded-xl shadow-md mb-4 group-hover:scale-110 transition-transform">
                      <Upload stroke="url(#main-gradient)" size={32} />
                    </div>
                    <p className="font-semibold text-slate-700 dark:text-slate-300">Escolha seu arquivo PDF</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 text-center max-w-xs leading-relaxed">A IA identificará onde inserir o texto automaticamente usando o modelo Gemini 3 Flash.</p>
                    <input type="file" accept=".pdf" className="hidden" onChange={handleTemplateUpload} />
                  </label>
                ) : (
                  <div className="p-5 bg-sky-50 dark:bg-sky-900/20 border border-sky-100 dark:border-sky-900/30 rounded-xl flex justify-between items-center animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-3">
                      <FileText stroke="url(#main-gradient)" size={24} />
                      <div>
                        <p className="font-bold text-sky-900 dark:text-sky-100">{templateFile.name}</p>
                        <p className="text-xs text-sky-600/70 dark:text-sky-400/70">Analisado com sucesso</p>
                      </div>
                    </div>
                    <button onClick={() => setTemplateFile(null)} className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-sky-200 dark:border-sky-800 rounded-lg text-sky-600 dark:text-sky-400 text-xs font-bold uppercase tracking-wider hover:bg-sky-500 hover:text-white transition-all">Alterar</button>
                  </div>
                )}
              </div>

              <div className={`p-8 transition-all duration-500 ${!templateFile ? 'opacity-30 pointer-events-none grayscale' : ''}`}>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400 flex items-center justify-center text-sm font-bold">2</span>
                    Participantes
                  </h3>
                  
                  <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl self-end sm:self-auto">
                    <button 
                      onClick={() => setInputMethod('file')}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${inputMethod === 'file' ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-teal-400 shadow-md' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                    >
                      <List size={14} /> Planilha Excel
                    </button>
                    <button 
                      onClick={() => setInputMethod('manual')}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${inputMethod === 'manual' ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-teal-400 shadow-md' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                    >
                      <Type size={14} /> Digitar Lista
                    </button>
                  </div>
                </div>

                {inputMethod === 'file' ? (
                  <label className="group border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer bg-slate-50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 hover:border-teal-300 dark:hover:border-teal-700 transition-all shadow-sm">
                    <div className="bg-white dark:bg-slate-700 p-3 rounded-xl shadow-md mb-3 group-hover:scale-110 transition-transform">
                      <Users stroke="url(#main-gradient)" size={28} />
                    </div>
                    <p className="font-semibold text-slate-700 dark:text-slate-300 text-center">
                      {participants.length > 0 && inputMethod === 'file' ? `${participants.length} nomes carregados` : 'Arraste .xlsx, .xls ou .csv'}
                    </p>
                    <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleListUpload} />
                  </label>
                ) : (
                  <div className="space-y-3">
                    <textarea
                      value={manualNames}
                      onChange={(e) => setManualNames(e.target.value)}
                      placeholder="João da Silva&#10;Maria Santos Oliveira&#10;Pedro de Alcântara..."
                      className="w-full h-40 p-5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-2xl focus:bg-white dark:focus:bg-slate-900 focus:border-sky-300 dark:focus:border-teal-700 focus:ring-4 focus:ring-sky-50 dark:focus:ring-sky-900/10 outline-none transition-all font-mono text-sm resize-none placeholder:text-slate-400"
                    />
                    <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider">
                      <span className="text-slate-400 dark:text-slate-500">Um nome por linha</span>
                      <span className="text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/30 px-3 py-1 rounded-full">{participants.length} nomes identificados</span>
                    </div>
                  </div>
                )}
              </div>

              {participants.length > 0 && layoutConfig && (
                <div className="p-8 bg-sky-50/30 dark:bg-sky-950/20 flex flex-col sm:flex-row items-center justify-between gap-6">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300">
                      <Settings stroke="url(#main-gradient)" size={14} />
                      Configuração de Estilo
                    </div>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      Fonte: <span className="font-script text-lg bg-gradient-to-r from-sky-500 to-teal-400 bg-clip-text text-transparent mx-1">Great Vibes</span> • Tamanho: {layoutConfig.fontSize}pt
                    </p>
                  </div>
                  <button 
                    onClick={startGeneration} 
                    className="w-full sm:w-auto bg-gradient-to-r from-sky-500 to-teal-500 text-white font-bold py-4 px-12 rounded-2xl shadow-xl shadow-sky-600/20 hover:from-sky-600 hover:to-teal-600 hover:-translate-y-0.5 transition-all active:scale-95 flex items-center justify-center gap-3"
                  >
                    <Download size={20} /> Iniciar Geração em Lote
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <footer className="py-10 text-center border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 transition-colors duration-300">
        <div className="max-w-5xl mx-auto px-4">
          <p className="text-sm text-slate-500 dark:text-slate-400 font-semibold">
            Feito por <a href="https://www.pastelapps.dev/" target="_blank" rel="noopener noreferrer" className="bg-gradient-to-r from-sky-500 to-teal-400 bg-clip-text text-transparent hover:opacity-80 transition-opacity">Pastel Apps</a>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
