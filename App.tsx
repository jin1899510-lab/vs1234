
import React, { useState, useEffect, useRef } from 'react';
import { StudioStyle, TransformationResult } from './types';
import { STUDIO_PRESETS } from './constants';
import { studioService } from './geminiService';

const App: React.FC = () => {
  const [apiKeyInput, setApiKeyInput] = useState<string>('');
  const [engineReady, setEngineReady] = useState<boolean>(false);
  const [showKeyModal, setShowKeyModal] = useState<boolean>(false);
  const [isTestingKey, setIsTestingKey] = useState<boolean>(false);
  
  const [selectedStyle, setSelectedStyle] = useState<StudioStyle>(StudioStyle.CINEMATIC_FOOD);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<TransformationResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 초기 엔진 상태 확인
  useEffect(() => {
    const checkKey = () => {
      const ready = studioService.hasValidKeyConfig();
      setEngineReady(ready);
      if (!ready) setShowKeyModal(true);
    };
    checkKey();
  }, []);

  const handleSaveKey = async () => {
    if (!apiKeyInput.trim()) return;
    setIsTestingKey(true);
    setError(null);
    try {
      const isValid = await studioService.testConnection(apiKeyInput);
      if (isValid) {
        localStorage.setItem('_sv_api_key_', btoa(apiKeyInput));
        setEngineReady(true);
        setShowKeyModal(false);
      } else {
        setError("유효하지 않은 API 키입니다.");
      }
    } catch (err) {
      setError("연결 테스트 중 오류가 발생했습니다.");
    } finally {
      setIsTestingKey(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result as string);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const generateTransformation = async () => {
    if (!uploadedImage) return;
    setIsProcessing(true);
    setError(null);

    const preset = STUDIO_PRESETS.find(p => p.id === selectedStyle);
    if (!preset) return;

    try {
      const transformedImageUrl = await studioService.transformImage(uploadedImage, preset.prompt);
      if (!transformedImageUrl) throw new Error("이미지 데이터가 비어있습니다.");
      
      const newResult: TransformationResult = {
        originalUrl: uploadedImage,
        resultUrl: transformedImageUrl,
        timestamp: Date.now()
      };
      setResults(prev => [newResult, ...prev]);
    } catch (err: any) {
      console.error("Generate failed:", err);
      setError(err.message || "변환 중 오류가 발생했습니다.");
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setUploadedImage(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-white selection:text-black">
      {/* API Key Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl">
          <div className="glass max-w-md w-full p-10 rounded-[40px] border-white/10 shadow-2xl">
            <h2 className="text-3xl serif italic text-center mb-6">엔진 활성화</h2>
            <p className="text-gray-400 text-sm text-center mb-8 leading-relaxed">
              Vercel 배포 환경에서 이미지를 생성하려면<br/>Google AI Studio API 키를 입력해야 합니다.
            </p>
            <div className="space-y-4">
              <input 
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="AI Studio API 키 (sk-...)"
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-white/30 transition-all text-center tracking-widest text-sm"
              />
              <button 
                onClick={handleSaveKey}
                disabled={isTestingKey || !apiKeyInput.trim()}
                className="w-full py-4 bg-white text-black rounded-full font-bold hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
              >
                {isTestingKey ? "연결 테스트 중..." : "설정 저장"}
              </button>
            </div>
            {error && <p className="text-red-400 text-[10px] mt-4 text-center">{error}</p>}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 py-12 md:py-20">
        {/* Header */}
        <header className="text-center mb-20 animate-in fade-in slide-in-from-top-4 duration-1000">
          <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full glass mb-8">
            <span className={`w-2 h-2 rounded-full ${engineReady ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-red-500'}`}></span>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-300">
              {engineReady ? 'Engine Active' : 'Engine Offline'}
            </span>
            <button onClick={() => setShowKeyModal(true)} className="ml-2 text-[10px] underline text-yellow-500 font-bold hover:text-yellow-400">키 관리</button>
          </div>
          <h1 className="text-7xl md:text-9xl serif mb-6 tracking-tighter leading-none">
            STUDIO <span className="italic text-gray-500">VISION</span>
          </h1>
          <p className="text-gray-500 text-xl font-light tracking-wide max-w-2xl mx-auto">
            AI 사진 작가가 당신의 결과물을 최고급 상업 화보로 진화시킵니다.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          {/* Controls */}
          <div className="lg:col-span-4 space-y-10">
            <section className="space-y-6">
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 border-l-2 border-white pl-4">01 Image Source</h2>
              {!uploadedImage ? (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="group relative border border-white/5 rounded-[40px] h-80 flex flex-col items-center justify-center cursor-pointer overflow-hidden transition-all hover:border-white/20 hover:bg-white/[0.02]"
                >
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4 group-hover:bg-white group-hover:text-black transition-all">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M12 4v16m8-8H4"></path></svg>
                  </div>
                  <span className="text-xs text-gray-500 group-hover:text-white transition-colors">사진 업로드</span>
                  <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
                </div>
              ) : (
                <div className="relative rounded-[40px] overflow-hidden aspect-square border border-white/10 group shadow-2xl">
                  <img src={uploadedImage} alt="Uploaded" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                    <button onClick={reset} className="bg-white text-black px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all">이미지 교체</button>
                  </div>
                </div>
              )}
            </section>

            <section className="space-y-6">
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 border-l-2 border-white pl-4">02 Theme Style</h2>
              <div className="grid grid-cols-1 gap-3">
                {STUDIO_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => setSelectedStyle(preset.id)}
                    className={`w-full flex items-center gap-4 p-4 rounded-3xl transition-all border ${
                      selectedStyle === preset.id ? 'bg-white text-black border-white shadow-xl scale-[1.02]' : 'bg-white/5 border-transparent text-gray-400 hover:bg-white/10'
                    }`}
                  >
                    <img src={preset.thumbnail} className="w-12 h-12 rounded-2xl object-cover" alt={preset.name} />
                    <span className="text-[11px] font-black uppercase tracking-tight flex-1 text-left">{preset.name}</span>
                  </button>
                ))}
              </div>
            </section>

            <button
              disabled={!uploadedImage || isProcessing || !engineReady}
              onClick={generateTransformation}
              className="w-full py-8 rounded-full bg-white text-black font-black text-xl hover:shadow-[0_0_50px_rgba(255,255,255,0.3)] hover:scale-[1.02] active:scale-95 transition-all shadow-2xl disabled:opacity-20 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <div className="flex items-center justify-center gap-4">
                  <div className="w-6 h-6 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
                  <span>촬영 중...</span>
                </div>
              ) : "걸작 생성"}
            </button>
            
            {error && <div className="p-6 bg-red-900/10 border border-red-500/20 rounded-[30px] text-red-500 text-[11px] text-center leading-relaxed animate-in fade-in zoom-in duration-300">{error}</div>}
          </div>

          {/* Result Area */}
          <div className="lg:col-span-8 min-h-[600px]">
            {isProcessing && (
              <div className="glass rounded-[60px] h-full flex flex-col items-center justify-center p-20 text-center border-white/5 animate-in fade-in duration-700">
                <div className="w-24 h-24 border-[10px] border-white/5 border-t-white rounded-full animate-spin mb-12 shadow-[0_0_60px_rgba(255,255,255,0.1)]"></div>
                <h3 className="text-5xl serif italic mb-6 text-white tracking-tight">현상 작업 중...</h3>
                <p className="text-gray-500 max-w-sm mx-auto text-lg font-light leading-relaxed">
                  조명 설계, 배경 합성, 질감 개선 작업을 거쳐 전문가급 화보로 재탄생 시키고 있습니다.
                </p>
              </div>
            )}

            {!isProcessing && results.length === 0 && (
              <div className="glass rounded-[60px] h-full flex flex-col items-center justify-center p-20 text-center border-dashed border-white/5 opacity-50">
                <div className="w-32 h-32 bg-white/5 rounded-full flex items-center justify-center mb-8">
                  <svg className="w-16 h-16 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                </div>
                <h3 className="text-2xl serif text-white/30 italic tracking-widest uppercase">Your Masterpiece Gallery</h3>
              </div>
            )}

            <div className="space-y-40 pb-40">
              {results.map((res, i) => (
                <div key={res.timestamp} className="animate-in fade-in slide-in-from-bottom-12 duration-1000">
                  <div className="flex items-end justify-between mb-12 border-b border-white/10 pb-10">
                    <div>
                      <span className="text-yellow-500 text-[10px] font-black uppercase tracking-[0.5em] mb-4 block">Studio Vision Masterpiece</span>
                      <h3 className="text-6xl serif italic text-white tracking-tighter">걸작 #{results.length - i}</h3>
                    </div>
                    <a 
                      href={res.resultUrl} 
                      download={`studio-vision-${res.timestamp}.png`} 
                      className="px-12 py-4 rounded-full bg-white text-black text-xs font-black uppercase tracking-widest hover:scale-110 active:scale-95 transition-all shadow-2xl"
                    >
                      다운로드
                    </a>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="space-y-6">
                      <span className="text-[10px] font-black text-gray-700 uppercase tracking-[0.4em] ml-6">Before</span>
                      <div className="rounded-[50px] overflow-hidden glass aspect-square border border-white/5">
                        <img src={res.originalUrl} className="w-full h-full object-cover grayscale opacity-20" alt="Original" />
                      </div>
                    </div>
                    <div className="space-y-6">
                      <span className="text-[10px] font-black text-yellow-500 uppercase tracking-[0.4em] ml-6">After</span>
                      <div className="rounded-[50px] overflow-hidden glass aspect-square border-2 border-white/20 shadow-[0_0_80px_rgba(255,255,255,0.1)] bg-black">
                        <img 
                          src={res.resultUrl} 
                          className="w-full h-full object-cover" 
                          alt="Studio Result" 
                          onError={() => setError("이미지 로딩에 실패했습니다. (Base64 Error)")}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <footer className="py-24 border-t border-white/5 text-center opacity-20">
        <p className="text-[10px] font-black tracking-[1em] uppercase">Professional AI Creative Engine</p>
      </footer>
    </div>
  );
};

export default App;
