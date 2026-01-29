
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
        setError("유효하지 않은 API 키입니다.");
      }
    } catch (err) {
      setError("연결 오류가 발생했습니다. 키를 다시 확인해주세요.");
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
      setError(err.message || "이미지 생성 중 오류가 발생했습니다.");
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
    <div className="min-h-screen flex flex-col items-center p-4 md:p-8 max-w-7xl mx-auto">
      {/* Key Management Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
          <div className="glass max-w-md w-full p-8 rounded-[32px] border-white/20 shadow-2xl">
            <h2 className="text-2xl serif italic text-center text-white mb-4">API 키 설정</h2>
            <p className="text-gray-400 text-xs text-center mb-6 leading-relaxed">
              Vercel 배포 환경에서 이미지를 생성하기 위해<br/>직접 발급받은 Google API 키를 입력해주세요.
            </p>
            <div className="space-y-4">
              <input 
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="AI Studio API 키 입력"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/30 transition-all text-center text-sm"
              />
              <button 
                onClick={handleSaveKey}
                disabled={isTestingKey || !apiKeyInput.trim()}
                className="w-full py-3 bg-white text-black rounded-full font-bold hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
              >
                {isTestingKey ? "연결 확인 중..." : "설정 저장"}
              </button>
              <div className="text-center">
                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-[10px] text-gray-500 underline hover:text-white">API 키 발급 사이트로 이동</a>
              </div>
            </div>
            {error && <p className="text-red-400 text-[10px] mt-4 text-center">{error}</p>}
          </div>
        </div>
      )}

      {/* Header */}
      <header className="w-full text-center mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass mb-4">
          <span className={`w-1.5 h-1.5 rounded-full ${hasKey ? 'bg-green-500' : 'bg-red-500'}`}></span>
          <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400">
            {hasKey ? 'Engine Connected' : 'Engine Offline'}
          </span>
          <button onClick={() => setShowKeyModal(true)} className="ml-1 text-[9px] underline text-yellow-500">키 관리</button>
        </div>
        <h1 className="text-5xl md:text-7xl serif mb-4 tracking-tighter">
          스튜디오 <span className="italic text-gray-500">비전</span>
        </h1>
        <p className="text-gray-400 text-base font-light">당신의 사진을 상업용 스튜디오 화보급으로 재구성합니다.</p>
      </header>

      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Controls */}
        <div className="lg:col-span-4 space-y-6">
          <section className="glass p-6 rounded-[24px]">
            <h2 className="text-sm font-bold mb-4 uppercase tracking-widest text-gray-400">1. 이미지 업로드</h2>
            {!uploadedImage ? (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-white/10 rounded-2xl h-48 flex flex-col items-center justify-center cursor-pointer hover:border-white/20 transition-all bg-white/2"
              >
                <svg className="w-8 h-8 text-gray-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4v16m8-8H4"></path></svg>
                <span className="text-xs text-gray-500">클릭하여 사진 선택</span>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
              </div>
            ) : (
              <div className="relative rounded-2xl overflow-hidden aspect-square border border-white/10">
                <img src={uploadedImage} alt="Uploaded" className="w-full h-full object-cover" />
                <button onClick={reset} className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">이미지 교체</button>
              </div>
            )}
          </section>

          <section className="glass p-6 rounded-[24px]">
            <h2 className="text-sm font-bold mb-4 uppercase tracking-widest text-gray-400">2. 스타일 선택</h2>
            <div className="space-y-2">
              {STUDIO_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => setSelectedStyle(preset.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all border ${
                    selectedStyle === preset.id ? 'bg-white text-black border-white' : 'bg-white/5 border-transparent text-gray-400 hover:bg-white/10'
                  }`}
                >
                  <img src={preset.thumbnail} className="w-8 h-8 rounded object-cover" alt={preset.name} />
                  <span className="text-[11px] font-bold text-left flex-1 truncate">{preset.name}</span>
                </button>
              ))}
            </div>
          </section>

          <button
            disabled={!uploadedImage || isProcessing || !hasKey}
            onClick={generateTransformation}
            className="w-full py-5 rounded-full bg-white text-black font-black text-base hover:scale-[1.01] active:scale-95 transition-all shadow-xl disabled:opacity-20"
          >
            {isProcessing ? "AI 작업 중..." : "결과물 생성하기"}
          </button>
          
          {error && <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-xl text-red-400 text-[10px] text-center leading-relaxed">{error}</div>}
        </div>

        {/* Right: Display */}
        <div className="lg:col-span-8 min-h-[500px]">
          {isProcessing && (
            <div className="glass rounded-[32px] h-full flex flex-col items-center justify-center p-12 text-center">
              <div className="w-16 h-16 border-4 border-white/5 border-t-white rounded-full animate-spin mb-6"></div>
              <h3 className="text-2xl serif italic mb-2">이미지 렌더링 중...</h3>
              <p className="text-gray-500 text-sm">스튜디오 조명과 배경을 정밀하게 합성하고 있습니다.</p>
            </div>
          )}

          {!isProcessing && results.length === 0 && (
            <div className="glass rounded-[32px] h-full flex flex-col items-center justify-center p-12 text-center opacity-30 border-dashed border-white/10">
              <svg className="w-16 h-16 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
              <h3 className="text-xl serif italic">이미지가 여기에 표시됩니다.</h3>
            </div>
          )}

          <div className="space-y-20 pb-20">
            {results.map((res) => (
              <div key={res.timestamp} className="animate-in fade-in duration-700">
                <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
                  <span className="text-[10px] font-black uppercase tracking-widest text-yellow-500">AI Studio Shot</span>
                  <a href={res.resultUrl} download={`studio-${res.timestamp}.png`} className="text-[10px] font-bold underline text-gray-400 hover:text-white transition-colors">다운로드</a>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Original</span>
                    <div className="rounded-[24px] overflow-hidden glass aspect-square">
                      <img src={res.originalUrl} className="w-full h-full object-cover opacity-50 grayscale" alt="Original" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <span className="text-[9px] font-bold text-yellow-500 uppercase tracking-widest">Masterpiece</span>
                    <div className="rounded-[24px] overflow-hidden glass aspect-square border-2 border-white/10 shadow-2xl">
                      <img 
                        src={res.resultUrl} 
                        className="w-full h-full object-cover" 
                        alt="Result" 
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <footer className="mt-20 py-12 border-t border-white/5 w-full text-center opacity-30 text-[9px] font-light tracking-[0.4em] uppercase">
        Powered by Studio Vision AI &copy; 2025
      </footer>
    </div>
  );
};

export default App;
