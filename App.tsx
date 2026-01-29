
import React, { useState, useEffect, useRef } from 'react';
import { StudioStyle, TransformationResult } from './types';
import { STUDIO_PRESETS } from './constants';
import { studioService } from './geminiService';

const App: React.FC = () => {
  const [hasKey, setHasKey] = useState<boolean>(false);
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  
  const [selectedStyle, setSelectedStyle] = useState<StudioStyle>(StudioStyle.CINEMATIC_FOOD);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<TransformationResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check for API key selection on mount as per guidelines for gemini-3-pro-image-preview
  useEffect(() => {
    const checkKey = async () => {
      try {
        if ((window as any).aistudio) {
          const has = await (window as any).aistudio.hasSelectedApiKey();
          setHasKey(has);
        }
      } catch (err) {
        console.error("Error checking API key status:", err);
      } finally {
        setIsInitialLoading(false);
      }
    };
    checkKey();
  }, []);

  // Open the official AI Studio key selection dialog
  const handleSelectKey = async () => {
    try {
      if ((window as any).aistudio) {
        await (window as any).aistudio.openSelectKey();
        // Assume success as per guidelines to avoid race conditions
        setHasKey(true);
        setError(null);
      }
    } catch (err) {
      setError("API 키 선택 중 오류가 발생했습니다.");
    }
  };

  // Fix: Added the missing reset function to clear the current image upload
  const reset = () => {
    setUploadedImage(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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
      // Handle the case where the key might have been revoked or lost
      if (err?.message?.includes("Requested entity was not found")) {
        setHasKey(false);
        setError("API 키가 유효하지 않습니다. 다시 선택해주세요.");
      } else {
        setError(err.message || "이미지 변환 중 오류가 발생했습니다.");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Official API Key Selection Overlay for high-quality image generation
  const KeySelectionOverlay = () => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
      <div className="glass max-w-md w-full p-8 rounded-[40px] space-y-6 shadow-2xl border-white/20">
        <div className="text-center">
          <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path></svg>
          </div>
          <h2 className="text-2xl serif italic text-white">API 키가 필요합니다</h2>
          <p className="text-gray-400 text-sm mt-2 leading-relaxed">
            고품질 이미지 스튜디오 기능을 사용하려면<br/>유료 결제가 설정된 API 키를 선택해야 합니다.
          </p>
        </div>

        <div className="space-y-4">
          <button 
            onClick={handleSelectKey}
            className="w-full py-4 bg-white text-black rounded-full font-bold hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            API 키 선택하기
          </button>

          <div className="text-center">
            <a 
              href="https://ai.google.dev/gemini-api/docs/billing" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-gray-500 underline hover:text-white transition-colors"
            >
              결제 및 비용 관련 문서 확인하기
            </a>
          </div>
        </div>

        {error && <p className="text-red-400 text-xs text-center font-medium animate-pulse">{error}</p>}
      </div>
    </div>
  );

  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-white/10 border-t-white rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center p-4 md:p-8">
      {!hasKey && <KeySelectionOverlay />}

      {/* Header */}
      <header className="w-full max-w-6xl flex flex-col items-center mb-12 text-center">
        <div className="flex items-center gap-4 mb-4">
          <div className="px-4 py-1 rounded-full glass text-[10px] font-semibold uppercase tracking-widest text-yellow-500">
            Professional Studio AI
          </div>
          <button 
            onClick={handleSelectKey}
            className={`flex items-center gap-2 px-3 py-1 rounded-full border transition-all text-[10px] font-bold uppercase tracking-tight ${
              hasKey 
              ? 'bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20' 
              : 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${hasKey ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
            {hasKey ? 'API Connected' : 'API Required'}
          </button>
        </div>
        <h1 className="text-5xl md:text-7xl serif mb-6 tracking-tight">
          스튜디오 <span className="italic text-gray-400">비전</span>
        </h1>
        <p className="text-gray-400 max-w-xl text-lg font-light leading-relaxed">
          평범한 사진을 프리미엄 상업 사진 수준으로 격상시키세요. 스타일을 선택하기만 하면 AI가 조명, 소품, 구도를 완벽하게 재구성합니다.
        </p>
      </header>

      <main className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sidebar: Controls */}
        <div className="lg:col-span-4 space-y-8">
          <section className="glass rounded-3xl p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-white">
              <span className="w-6 h-6 rounded-full bg-white text-black flex items-center justify-center text-xs font-bold">1</span>
              원본 이미지
            </h2>
            
            {!uploadedImage ? (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-700 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-white transition-colors group h-64 bg-white/5"
              >
                <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center mb-4 group-hover:bg-white group-hover:text-black transition-all">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                </div>
                <p className="text-sm text-gray-400 group-hover:text-white font-medium">사진을 업로드하세요</p>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
              </div>
            ) : (
              <div className="relative rounded-2xl overflow-hidden group">
                <img src={uploadedImage} alt="Uploaded" className="w-full h-64 object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button onClick={reset} className="bg-white text-black px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest shadow-xl">이미지 교체</button>
                </div>
              </div>
            )}
          </section>

          <section className="glass rounded-3xl p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-white">
              <span className="w-6 h-6 rounded-full bg-white text-black flex items-center justify-center text-xs font-bold">2</span>
              스타일 선택
            </h2>
            <div className="grid grid-cols-1 gap-3">
              {STUDIO_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => setSelectedStyle(preset.id)}
                  className={`flex items-center gap-4 p-3 rounded-xl transition-all text-left ${
                    selectedStyle === preset.id 
                    ? 'bg-white text-black ring-2 ring-white/20' 
                    : 'bg-gray-900/50 hover:bg-gray-800 text-gray-400'
                  }`}
                >
                  <img src={preset.thumbnail} alt={preset.name} className="w-12 h-12 rounded-lg object-cover" />
                  <div>
                    <div className="text-sm font-bold leading-tight">{preset.name}</div>
                    <div className="text-[10px] opacity-70 leading-tight mt-0.5 line-clamp-1">{preset.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <button
            disabled={!uploadedImage || isProcessing || !hasKey}
            onClick={generateTransformation}
            className={`w-full py-5 rounded-full font-bold text-lg transition-all flex items-center justify-center gap-2 ${
              !uploadedImage || isProcessing || !hasKey
              ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
              : 'bg-white text-black hover:shadow-[0_0_40px_rgba(255,255,255,0.2)] hover:scale-[1.02]'
            }`}
          >
            {isProcessing ? (
              <>
                <svg className="animate-spin h-5 w-5 border-2 border-black border-t-transparent rounded-full" viewBox="0 0 24 24"></svg>
                AI가 촬영 중...
              </>
            ) : (
              '스튜디오 샷 생성'
            )}
          </button>

          {error && (
            <div className="p-4 bg-red-900/20 border border-red-500/50 rounded-2xl text-red-400 text-sm animate-in fade-in zoom-in duration-300">
              {error}
            </div>
          )}
          
          <div className="pt-4 border-t border-white/5 flex flex-col gap-2">
            <button 
              onClick={handleSelectKey}
              className="text-[10px] text-gray-600 uppercase tracking-widest hover:text-gray-400 transition-colors"
            >
              API 키 재설정
            </button>
          </div>
        </div>

        {/* Results Area */}
        <div className="lg:col-span-8 space-y-8">
          {results.length === 0 && !isProcessing && (
            <div className="h-full min-h-[500px] glass rounded-[40px] flex flex-col items-center justify-center p-12 text-center border-dashed border-white/5">
              <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mb-8">
                <svg className="w-12 h-12 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path></svg>
              </div>
              <h3 className="text-3xl serif mb-4 text-white font-light">나만의 걸작을 시작하세요</h3>
              <p className="text-gray-500 max-w-sm leading-relaxed">
                좌측에서 이미지를 업로드하고 원하는 스튜디오 스타일을 선택하면 AI가 새로운 구도와 조명을 입힌 결과를 보여줍니다.
              </p>
            </div>
          )}

          {isProcessing && (
            <div className="h-full min-h-[500px] glass rounded-[40px] flex flex-col items-center justify-center p-12 text-center animate-in fade-in duration-500">
              <div className="relative">
                <div className="w-40 h-40 rounded-full border-[12px] border-white/5 border-t-white animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                   <svg className="w-16 h-16 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M12 21a9 9 0 100-18 9 9 0 000 18z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3"></path></svg>
                </div>
              </div>
              <h3 className="text-4xl serif mt-12 mb-4 text-white italic font-light">Developing Studio Quality...</h3>
              <p className="text-gray-500 font-medium tracking-wide">질감 합성 및 시네마틱 컬러 그레이딩 진행 중</p>
            </div>
          )}

          <div className="space-y-24">
            {results.map((result, idx) => (
              <div key={result.timestamp} className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                <div className="flex items-end justify-between border-b border-white/10 pb-6">
                  <div>
                    <span className="text-yellow-500 text-[10px] font-bold uppercase tracking-[0.3em] mb-2 block">Studio Generation</span>
                    <h3 className="text-3xl serif italic text-white">결과물 #{results.length - idx}</h3>
                  </div>
                  <button 
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = result.resultUrl;
                      link.download = `studio-vision-${result.timestamp}.png`;
                      link.click();
                    }}
                    className="px-8 py-3 rounded-full bg-white text-black text-xs font-bold uppercase tracking-widest hover:scale-105 transition-all shadow-xl"
                  >
                    Download 4K
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="group relative rounded-[40px] overflow-hidden glass aspect-[4/5] border border-white/5">
                    <img src={result.originalUrl} alt="Original" className="w-full h-full object-cover opacity-30 grayscale group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-1000" />
                    <div className="absolute top-8 left-8 bg-black/40 backdrop-blur-md border border-white/10 px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest text-white">Original Source</div>
                  </div>
                  <div className="relative rounded-[40px] overflow-hidden glass aspect-[4/5] shadow-[0_0_80px_rgba(255,255,255,0.05)] border border-white/20">
                    <img src={result.resultUrl} alt="Studio Result" className="w-full h-full object-cover" />
                    <div className="absolute top-8 left-8 bg-yellow-500 px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest text-black shadow-2xl font-black">AI Studio Shot</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="w-full max-w-6xl mt-32 py-16 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-12 opacity-40 hover:opacity-100 transition-opacity">
        <div className="text-sm font-light text-gray-400">
          Built for High-End Commercial Visuals & Studio Photography
        </div>
        <div className="flex gap-12 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">
          <a href="#" className="hover:text-white transition-colors">Documentation</a>
          <a href="https://ai.google.dev" className="hover:text-white transition-colors">Gemini API</a>
          <a href="#" className="hover:text-white transition-colors">Vercel Config</a>
        </div>
      </footer>
    </div>
  );
};

export default App;
