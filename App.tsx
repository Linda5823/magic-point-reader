
import React, { useState, useCallback, useRef } from 'react';
import { analyzeImage, generateSpeech, decodeAudioData, processText } from './services/geminiService';
import { TextBlock, AppStatus, TranslationMode } from './types';
import PointReader from './components/PointReader';

const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<TextBlock[]>([]);
  const [activeBlock, setActiveBlock] = useState<TextBlock | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<TranslationMode>('ORIGINAL');
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setStatus(AppStatus.UPLOADING);
    setActiveBlock(null);

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      setImageUrl(reader.result as string);
      
      try {
        setStatus(AppStatus.ANALYZING);
        const results = await analyzeImage(base64);
        setBlocks(results);
        setStatus(AppStatus.READY);
      } catch (err: any) {
        console.error(err);
        const msg = err.message?.includes('API_KEY') 
          ? "配置错误：未检测到 API_KEY，请检查环境变量设置。" 
          : "无法识别图片中的文字，请检查网络或图片质量。";
        setError(msg);
        setStatus(AppStatus.ERROR);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleTextClick = useCallback(async (text: string, block: TextBlock) => {
    if (status === AppStatus.SPEAKING || status === AppStatus.TRANSLATING) {
      currentSourceRef.current?.stop();
    }

    try {
      setActiveBlock(block);
      setError(null);
      
      let textToRead = text;
      if (mode !== 'ORIGINAL') {
        setStatus(AppStatus.TRANSLATING);
        textToRead = await processText(text, mode);
      }

      setStatus(AppStatus.SPEAKING);

      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const pcmData = await generateSpeech(textToRead);
      const audioBuffer = await decodeAudioData(new Uint8Array(pcmData), audioContextRef.current);
      
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      
      currentSourceRef.current = source;
      source.onended = () => {
        setStatus(AppStatus.READY);
        setActiveBlock(null);
      };
      
      source.start();
    } catch (err: any) {
      console.error(err);
      setError(err.message?.includes('API_KEY') ? "配置错误：API_KEY 缺失。" : "处理失败，请重试。");
      setStatus(AppStatus.READY);
      setActiveBlock(null);
    }
  }, [status, mode]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-10 px-4">
      <header className="max-w-4xl w-full text-center mb-10">
        <h1 className="text-4xl font-extrabold text-slate-800 mb-4 tracking-tight flex items-center justify-center gap-2">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-500">Magic Point-to-Read</span>
          <span className="text-3xl">🪄</span>
        </h1>
        <p className="text-lg text-slate-600">
          上传图片，点击文字，Gemini 为你朗读和翻译。
        </p>
      </header>

      <main className="max-w-4xl w-full flex flex-col items-center">
        {/* Mode Selector */}
        {imageUrl && (
          <div className="flex bg-white p-1 rounded-xl shadow-sm mb-6 border border-slate-200">
            {[
              { id: 'ORIGINAL', label: '原声点读' },
              { id: 'TRANSLATE_EN', label: '译为英文' },
              { id: 'TRANSLATE_ZH', label: '译为中文' },
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => setMode(m.id as TranslationMode)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  mode === m.id 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        )}

        <div className={`w-full bg-white rounded-2xl shadow-sm border p-8 mb-8 transition-all ${!imageUrl ? 'border-dashed border-2' : ''}`}>
          {!imageUrl ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mb-6 rotate-3">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <label className="cursor-pointer bg-slate-900 hover:bg-black text-white font-semibold py-3 px-10 rounded-xl transition-all shadow-xl active:scale-95">
                上传学习素材
                <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
              </label>
              <p className="mt-4 text-slate-400 text-sm">支持绘本、路牌、课件等图片</p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="flex justify-between w-full mb-4 items-center">
                <div className="flex items-center space-x-3">
                  <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    status === AppStatus.ANALYZING || status === AppStatus.TRANSLATING ? 'bg-amber-100 text-amber-700' :
                    status === AppStatus.SPEAKING ? 'bg-green-100 text-green-700 animate-pulse' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {status === AppStatus.UPLOADING && 'Uploading'}
                    {status === AppStatus.ANALYZING && 'Analyzing'}
                    {status === AppStatus.READY && 'Ready to play'}
                    {status === AppStatus.TRANSLATING && 'Translating'}
                    {status === AppStatus.SPEAKING && 'Speaking'}
                    {status === AppStatus.ERROR && 'Error'}
                  </div>
                  {status === AppStatus.READY && (
                    <span className="text-xs text-slate-400">检测到 {blocks.length} 块文本</span>
                  )}
                </div>
                <button 
                  onClick={() => { setImageUrl(null); setBlocks([]); setStatus(AppStatus.IDLE); }}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              {error && (
                <div className="w-full bg-red-50 text-red-600 p-4 rounded-xl mb-4 text-sm border border-red-100 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                  {error}
                </div>
              )}

              <PointReader 
                imageUrl={imageUrl} 
                blocks={blocks} 
                onTextClick={handleTextClick} 
                activeBlock={activeBlock}
              />
              
              <div className="mt-8 grid grid-cols-2 gap-4 w-full text-sm">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-slate-400 mb-1">当前文字</p>
                  <p className="text-slate-800 font-medium truncate">{activeBlock?.text || '点击上方文字...'}</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                  <p className="text-blue-400 mb-1">翻译结果</p>
                  <p className="text-blue-800 font-medium truncate">
                    {status === AppStatus.TRANSLATING ? '翻译中...' : (mode === 'ORIGINAL' ? '原样输出' : '已就绪')}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="mt-auto py-8 text-slate-400 text-sm flex items-center gap-4">
        <span>Powering the future with Gemini 3</span>
        <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
        <a href="https://gemini3.devpost.com/" target="_blank" className="hover:text-blue-500 underline">Join the Competition</a>
      </footer>
    </div>
  );
};

export default App;
