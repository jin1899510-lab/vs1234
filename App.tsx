
import React, { useState, useEffect, useRef } from 'react';
import { StudioStyle, TransformationResult } from './types';
import { STUDIO_PRESETS } from './constants';
import { studioService } from './geminiService';

const App: React.FC = () => {
  const [apiKeyInput, setApiKeyInput] = useState<string>('');
  const [hasKey, setHasKey] = useState<boolean>(false);
  const [showKeyModal, setShowKeyModal] = useState<boolean>(false);
  const [isTestingKey, setIsTestingKey] = useState<boolean>(false);
  
  const [selectedStyle, setSelectedStyle] = useState<StudioStyle>(StudioStyle.CINEMATIC_FOOD);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<TransformationResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedKey = localStorage.getItem('_sv_api_key_');
    if (savedKey) {
      try {
        setApiKeyInput(atob(savedKey));
        setHasKey(true);
      } catch (e) {
        localStorage.removeItem('_sv_api_key_');
        setShowKeyModal(true);
      }
    } else if (process.env.API_KEY) {
      setHasKey(true);
    } else {
      setShowKeyModal(true);
    }
  }, []);

  const handleSaveKey = async () => {
    if (!apiKeyInput.trim()) return;
    setIsTestingKey(true);
    setError(null);
    try {
      const isValid = await studioService.testConnection(apiKeyInput);
      if (isValid) {
        localStorage.setItem('_sv_api_key_', btoa(apiKeyInput));
        setHasKey(true);
        setShowKeyModal(false);
      } else {
        setError("유효하지 않은 API 키입니다. (연결 테스트 실패)");
      }
    } catch (err) {
      setError("연결 오류가 발생했습니다. 키를 다시 확인하세요.");
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
      const newResult: TransformationResult = {
        originalUrl: uploadedImage,
        resultUrl: transformedImageUrl,
        timestamp: Date.now()
      };
      setResults(prev => [newResult, ...prev]);
    } catch (err: any) {
      setError(err.message || "이미지 생성에 실패했습니다.");
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
    <div className="min-h-screen flex flex-col items-center p-4 md:p-10 max-w-7xl mx-auto">
      {/* API Key Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/95 backdrop-blur-md">
          <div className="glass max-w-md w-full p-10 rounded-[40px] border-white/20 shadow-2xl">
            <h2 className="text-3xl serif italic text-center text-white mb-6">스튜디오 가동</h2>
            <p className="text-gray-400 text-sm text-center mb-8 leading-relaxed">
              Vercel 서버에서 안정적인 이미지 생성을 위해<br/>Google AI Studio API 키가 필요합니다.
            </p>
            <div className="space-y-4">
              <input 
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="AI Studio API 키 입력"
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-white/40 transition-all text-center tracking-widest text-sm"
              />
              <button 
                onClick={handleSaveKey}
                disabled={isTestingKey || !apiKeyInput.trim()}
                className="w-full py-4 bg-white text-black rounded-full font-bold hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
              >
                {isTestingKey ? "연결 확인 중..." : "설정 저장 및 시작"}
              </button>
              <div className="text-center">
                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-[10px] text-gray-500 underline hover:text-white">API 키 발급받기</a>
              </div>
            </div>
            {error && <p className="text-red-400 text-xs mt-4 text-center bg-red-400/10 py-2 rounded-lg">{error}</p>}
          </div>
        </div>
      )}

      {/* Header */}
      <header className="w-full text-center mb-16">
        <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full glass mb-6">
          <span className={`w-2 h-2 rounded-full ${hasKey ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-300">
            {hasKey ? 'Engine Connected' : 'Engine Offline'}
          </span>
          <button onClick={() => setShowKeyModal(true)} className="ml-2 text-[10px] underline text-yellow-500 font-bold">키 관리</button>
        </div>
        <h1 className="text-6xl md:text-8xl serif mb-6 tracking-tighter text-white">
          스튜디오 <span className="italic text-gray-500">비전</span>
        </h1>
        <p className="text-gray-400 text-lg font-light max-w-xl mx-auto">당신의 평범한 일상을 시네마틱 화보로 재탄생시킵니다.</p>
      </header>

      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Input Column */}
        <div className="lg:col-span-4 space-y-8">
          <section className="glass p-8 rounded-[40px] border-white/5 shadow-2xl">
            <h2 className="text-xs font-black uppercase tracking-widest mb-6 text-gray-500">Step 1. 사진 업로드</h2>
            {!uploadedImage ? (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-white/10 rounded-3xl h-64 flex flex-col items-center justify-center cursor-pointer hover:border-white/30 transition-all bg-white/2 group"
              >
                <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-4 group-hover:bg-white group-hover:text-black transition-all">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4v16m8-8H4"></path></svg>
                </div>
                <span className="text-xs text-gray-400 font-medium">이미지 업로드</span>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
              </div>
            ) : (
              <div className="relative rounded-3xl overflow-hidden aspect-square border border-white/10 group shadow-2xl">
                <img src={uploadedImage} alt="Uploaded" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                  <button onClick={reset} className="bg-white text-black px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl">교체하기</button>
                </div>
              </div>
            )}
          </section>

          <section className="glass p-8 rounded-[40px] border-white/5 shadow-2xl">
            <h2 className="text-xs font-black uppercase tracking-widest mb-6 text-gray-500">Step 2. 스타일 테마</h2>
            <div className="space-y-3">
              {STUDIO_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => setSelectedStyle(preset.id)}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all border ${
                    selectedStyle === preset.id ? 'bg-white text-black border-white shadow-xl' : 'bg-white/5 border-transparent text-gray-400 hover:bg-white/10'
                  }`}
                >
                  <img src={preset.thumbnail} className="w-10 h-10 rounded-lg object-cover" alt={preset.name} />
                  <span className="text-[11px] font-black uppercase tracking-tight flex-1 text-left">{preset.name}</span>
                </button>
              ))}
            </div>
          </section>

          <button
            disabled={!uploadedImage || isProcessing || !hasKey}
            onClick={generateTransformation}
            className="w-full py-6 rounded-full bg-white text-black font-black text-lg hover:shadow-[0_0_40px_rgba(255,255,255,0.2)] hover:scale-[1.02] active:scale-95 transition-all shadow-2xl disabled:opacity-20"
          >
            {isProcessing ? "스튜디오 촬영 중..." : "결과물 생성"}
          </button>
          
          {error && <div className="p-5 bg-red-900/20 border border-red-500/30 rounded-3xl text-red-400 text-xs text-center leading-relaxed animate-in fade-in zoom-in duration-300">{error}</div>}
        </div>

        {/* Output Column */}
        <div className="lg:col-span-8 min-h-[700px]">
          {isProcessing && (
            <div className="glass rounded-[50px] h-full flex flex-col items-center justify-center p-16 text-center border-white/10 animate-in fade-in duration-700">
              <div className="w-24 h-24 border-8 border-white/5 border-t-white rounded-full animate-spin mb-10 shadow-[0_0_60px_rgba(255,255,255,0.1)]"></div>
              <h3 className="text-4xl serif italic mb-4 text-white">필름 현상 중...</h3>
              <p className="text-gray-500 max-w-sm mx-auto text-lg font-light leading-relaxed">
                AI 아티스트가 조명과 배경을 스튜디오급으로 재구성하고 있습니다. 약 10-20초 정도 소요됩니다.
              </p>
            </div>
          )}

          {!isProcessing && results.length === 0 && (
            <div className="glass rounded-[50px] h-full flex flex-col items-center justify-center p-16 text-center border-dashed border-white/5">
              <div className="w-32 h-32 bg-white/5 rounded-full flex items-center justify-center mb-10 text-gray-800">
                <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
              </div>
              <h3 className="text-2xl serif text-white/30 italic">생성된 이미지가 이곳에 전시됩니다.</h3>
            </div>
          )}

          <div className="space-y-32 pb-32">
            {results.map((res, i) => (
              <div key={res.timestamp} className="animate-in fade-in slide-in-from-bottom-20 duration-1000">
                <div className="flex items-center justify-between mb-10 border-b border-white/10 pb-8">
                  <div>
                    <span className="text-yellow-500 text-[10px] font-black uppercase tracking-[0.4em] mb-2 block">Professional AI Render</span>
                    <h3 className="text-5xl serif italic text-white tracking-tighter">걸작 #{results.length - i}</h3>
                  </div>
                  <a 
                    href={res.resultUrl} 
                    download={`studio-shot-${res.timestamp}.png`} 
                    className="px-10 py-3.5 rounded-full bg-white text-black text-xs font-black uppercase tracking-widest hover:scale-110 active:scale-95 transition-all shadow-2xl"
                  >
                    이미지 저장
                  </a>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div className="space-y-4">
                    <span className="text-[10px] font-black text-gray-600 uppercase tracking-[0.3em] ml-4">Before (Original)</span>
                    <div className="rounded-[40px] overflow-hidden glass aspect-square border border-white/5">
                      <img src={res.originalUrl} className="w-full h-full object-cover opacity-20 grayscale" alt="Original" />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <span className="text-[10px] font-black text-yellow-500 uppercase tracking-[0.3em] ml-4">After (Studio)</span>
                    <div className="rounded-[40px] overflow-hidden glass aspect-square border-2 border-white/20 shadow-2xl bg-black">
                      <img 
                        src={res.resultUrl} 
                        className="w-full h-full object-cover block" 
                        alt="Studio Result" 
                        loading="eager"
                        decoding="async"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <footer className="mt-20 py-24 border-t border-white/5 w-full text-center opacity-30 text-xs font-light tracking-[0.4em] uppercase text-gray-500">
        Professional Studio Intelligence &copy; 2025 STUDIO VISION
      </footer>
    </div>
  );
};

export default App;
