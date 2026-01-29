
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
    if (savedKey || process.env.API_KEY) {
      setHasKey(true);
      if (savedKey) setApiKeyInput(atob(savedKey));
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
      const newResult: TransformationResult = {
        originalUrl: uploadedImage,
        resultUrl: transformedImageUrl,
        timestamp: Date.now()
      };
      setResults(prev => [newResult, ...prev]);
    } catch (err: any) {
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

  // API 키 입력 오버레이
  const KeyModal = () => (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/95 backdrop-blur-md">
      <div className="glass max-w-md w-full p-10 rounded-[40px] border-white/20 shadow-2xl">
        <h2 className="text-3xl serif italic text-center text-white mb-6">API 키 설정</h2>
        <p className="text-gray-400 text-sm text-center mb-8 leading-relaxed">
          고화질 이미지 생성을 위해 Google API 키가 필요합니다.<br/>
          (무료 등급 키도 사용 가능하도록 최적화되었습니다)
        </p>
        <div className="space-y-4">
          <input 
            type="password"
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
            placeholder="AI Studio API 키 입력"
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-white/40 transition-all text-center"
          />
          <button 
            onClick={handleSaveKey}
            disabled={isTestingKey || !apiKeyInput.trim()}
            className="w-full py-4 bg-white text-black rounded-full font-bold hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
          >
            {isTestingKey ? "연결 확인 중..." : "설정 저장 및 시작"}
          </button>
          <div className="text-center">
            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-[10px] text-gray-500 underline hover:text-white">키 발급받기 (Google AI Studio)</a>
          </div>
        </div>
        {error && <p className="text-red-400 text-xs mt-4 text-center">{error}</p>}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col items-center p-4 md:p-12 max-w-7xl mx-auto">
      {showKeyModal && <KeyModal />}

      {/* Header */}
      <header className="w-full text-center mb-16">
        <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full glass mb-6">
          <span className={`w-2 h-2 rounded-full ${hasKey ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-300">
            {hasKey ? 'Engine Connected' : 'Engine Offline'}
          </span>
          <button onClick={() => setShowKeyModal(true)} className="ml-2 text-[10px] underline text-yellow-500">변경</button>
        </div>
        <h1 className="text-6xl md:text-8xl serif mb-6 tracking-tighter">
          스튜디오 <span className="italic text-gray-400">비전</span>
        </h1>
        <p className="text-gray-400 text-lg font-light">평범한 사진을 전문가의 손길이 닿은 상업용 화보로 변환하세요.</p>
      </header>

      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Sidebar */}
        <div className="lg:col-span-4 space-y-8">
          <section className="glass p-8 rounded-[32px] border-white/5 shadow-xl">
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
              <span className="bg-white text-black w-6 h-6 rounded-full flex items-center justify-center text-[10px]">1</span>
              사진 업로드
            </h2>
            {!uploadedImage ? (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-white/10 rounded-2xl h-64 flex flex-col items-center justify-center cursor-pointer hover:border-white/30 transition-all bg-white/2 group"
              >
                <svg className="w-10 h-10 text-gray-600 mb-4 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4v16m8-8H4"></path></svg>
                <span className="text-sm text-gray-500 group-hover:text-white">클릭하여 이미지 선택</span>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
              </div>
            ) : (
              <div className="relative rounded-2xl overflow-hidden aspect-square border border-white/10">
                <img src={uploadedImage} alt="Uploaded" className="w-full h-full object-cover" />
                <button onClick={reset} className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold text-sm">이미지 교체</button>
              </div>
            )}
          </section>

          <section className="glass p-8 rounded-[32px] border-white/5 shadow-xl">
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
              <span className="bg-white text-black w-6 h-6 rounded-full flex items-center justify-center text-[10px]">2</span>
              스타일 테마
            </h2>
            <div className="space-y-3">
              {STUDIO_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => setSelectedStyle(preset.id)}
                  className={`w-full flex items-center gap-4 p-3 rounded-2xl transition-all border ${
                    selectedStyle === preset.id ? 'bg-white text-black border-white' : 'bg-white/5 border-transparent text-gray-400 hover:bg-white/10'
                  }`}
                >
                  <img src={preset.thumbnail} className="w-10 h-10 rounded-lg object-cover" />
                  <span className="text-xs font-bold text-left flex-1">{preset.name}</span>
                </button>
              ))}
            </div>
          </section>

          <button
            disabled={!uploadedImage || isProcessing || !hasKey}
            onClick={generateTransformation}
            className="w-full py-6 rounded-full bg-white text-black font-black text-lg hover:scale-[1.02] active:scale-95 transition-all shadow-2xl disabled:opacity-20 disabled:scale-100"
          >
            {isProcessing ? "스튜디오 촬영 중..." : "결과 생성하기"}
          </button>
          
          {error && <div className="p-4 bg-red-900/20 border border-red-500/50 rounded-2xl text-red-400 text-xs text-center">{error}</div>}
        </div>

        {/* Results Area */}
        <div className="lg:col-span-8">
          {isProcessing && (
            <div className="glass rounded-[40px] h-[600px] flex flex-col items-center justify-center p-12 text-center animate-pulse">
              <div className="w-24 h-24 border-4 border-white/10 border-t-white rounded-full animate-spin mb-8"></div>
              <h3 className="text-4xl serif italic mb-4">현상 중...</h3>
              <p className="text-gray-500">AI가 조명과 텍스처를 스튜디오급으로 보정하고 있습니다.</p>
            </div>
          )}

          {!isProcessing && results.length === 0 && (
            <div className="glass rounded-[40px] h-[600px] flex flex-col items-center justify-center p-12 text-center border-dashed border-white/10">
              <div className="opacity-10 mb-8 scale-150">
                <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
              </div>
              <h3 className="text-2xl serif text-white/40">생성된 이미지가 여기에 표시됩니다.</h3>
            </div>
          )}

          <div className="space-y-24">
            {results.map((res, i) => (
              <div key={res.timestamp} className="animate-in fade-in slide-in-from-bottom-12 duration-1000">
                <div className="flex items-center justify-between mb-8 border-b border-white/10 pb-4">
                  <h3 className="text-3xl serif italic">Result #{results.length - i}</h3>
                  <a href={res.resultUrl} download={`studio-${res.timestamp}.png`} className="text-[10px] font-bold uppercase tracking-widest text-yellow-500 border border-yellow-500/50 px-6 py-2 rounded-full hover:bg-yellow-500 hover:text-black transition-all">Download</a>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Original Input</span>
                    <div className="rounded-[32px] overflow-hidden glass aspect-square border border-white/5">
                      <img src={res.originalUrl} className="w-full h-full object-cover grayscale opacity-50" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <span className="text-[10px] font-bold text-yellow-500 uppercase tracking-widest">Studio Shot</span>
                    <div className="rounded-[32px] overflow-hidden glass aspect-square border-2 border-white/20 shadow-2xl">
                      <img src={res.resultUrl} className="w-full h-full object-cover" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <footer className="mt-40 py-20 border-t border-white/5 w-full text-center opacity-30 text-xs font-light tracking-widest">
        POWERED BY GEMINI 2.5 FLASH ENGINE &copy; 2025 STUDIO VISION AI
      </footer>
    </div>
  );
};

export default App;
