
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
    setBlocks([]);
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
        console.error("Image analysis error:", err);
        const errMsg = err?.message || String(err);
        const msg = errMsg.includes('API_KEY') 
          ? "Configuration Error: API_KEY not detected. Please check Vercel environment variables." 
          : errMsg.includes('fetch') || errMsg.includes('network') || errMsg.includes('Failed to fetch')
          ? `Network Error: ${errMsg}. Please check your connection and try again.`
          : `Analysis Error: ${errMsg}`;
        setError(msg);
        setStatus(AppStatus.ERROR);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleTextClick = useCallback(async (text: string, block: TextBlock) => {
    if (status === AppStatus.SPEAKING || status === AppStatus.TRANSLATING || status === AppStatus.ANALYZING) {
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
      setError("Processing failed. Please try again.");
      setStatus(AppStatus.READY);
      setActiveBlock(null);
    }
  }, [status, mode]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-10 px-4">
      <header className="max-w-4xl w-full text-center mb-10">
        <h1 className="text-4xl font-extrabold text-slate-800 mb-4 tracking-tight flex items-center justify-center gap-2">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-500">Magic Point-to-Read</span>
          <span className="text-3xl animate-bounce">🪄</span>
        </h1>
        <div className="space-y-2">
          <p className="text-lg text-slate-600">
            Upload any reading material and click on text to hear it spoken or translated.
          </p>
          <p className="text-md text-slate-400 font-medium">
            上传图片，点击文字，Gemini 为你朗读和翻译
          </p>
        </div>
      </header>

      <main className="max-w-4xl w-full flex flex-col items-center">
        {imageUrl && (
          <div className="flex bg-white p-1 rounded-xl shadow-sm mb-6 border border-slate-200 sticky top-4 z-30">
            {[
              { id: 'ORIGINAL', label: 'Read Original' },
              { id: 'TRANSLATE_EN', label: 'To English' },
              { id: 'TRANSLATE_ZH', label: 'To Chinese' },
              { id: 'TRANSLATE_ES', label: 'To Spanish' },
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
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-24 h-24 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-8 relative">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <div className="absolute inset-0 rounded-full border-2 border-blue-200 animate-ping opacity-25"></div>
              </div>
              <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-12 rounded-2xl transition-all shadow-xl shadow-blue-200 active:scale-95 text-lg">
                Upload Image
                <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
              </label>
              <p className="mt-6 text-slate-400 text-sm italic">Try uploading storybooks, newspapers, or signs.</p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="flex justify-between w-full mb-6 items-center">
                <div className="flex items-center space-x-3">
                  <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest ${
                    status === AppStatus.ANALYZING ? 'bg-indigo-600 text-white animate-pulse' :
                    status === AppStatus.SPEAKING ? 'bg-green-500 text-white' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {status === AppStatus.ANALYZING && (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-3 w-3 text-white" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Reading with Gemini...
                      </span>
                    )}
                    {status === AppStatus.READY && 'Ready'}
                    {status === AppStatus.SPEAKING && '🔊 Speaking'}
                    {status === AppStatus.TRANSLATING && 'Translating...'}
                  </div>
                </div>
                <button 
                  onClick={() => { setImageUrl(null); setBlocks([]); setStatus(AppStatus.IDLE); }}
                  className="px-3 py-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all text-sm font-medium"
                >
                  Change Image
                </button>
              </div>

              {error && (
                <div className="w-full bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm border border-red-100 flex items-center gap-3">
                  <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                  {error}
                </div>
              )}

              <PointReader 
                imageUrl={imageUrl} 
                blocks={blocks} 
                onTextClick={handleTextClick} 
                activeBlock={activeBlock}
                isAnalyzing={status === AppStatus.ANALYZING}
              />
              
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-slate-400 text-xs font-bold uppercase mb-2">Original Text</p>
                  <p className="text-slate-800 font-medium min-h-[1.5rem] break-words">
                    {activeBlock?.text || (status === AppStatus.ANALYZING ? 'Waiting for analysis...' : 'Click any highlighted text block')}
                  </p>
                </div>
                <div className="p-5 bg-blue-50/50 rounded-2xl border border-blue-100">
                  <p className="text-blue-400 text-xs font-bold uppercase mb-2">Voice Output / Translation</p>
                  <p className="text-blue-800 font-medium min-h-[1.5rem]">
                    {status === AppStatus.TRANSLATING ? 'Processing translation...' : 
                     status === AppStatus.SPEAKING ? 'Playing high-quality audio...' : 
                     (mode === 'ORIGINAL' ? 'Ready to speak' : 'Ready to translate & speak')}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="mt-auto py-8 text-slate-400 text-xs flex flex-col items-center gap-2">
        <div className="flex items-center gap-3">
          <span>Powered by Gemini 3 Flash & 2.5 TTS</span>
          <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
          <span>Multimodal Learning Assistant</span>
        </div>
        <div className="flex gap-4">
            <a href="https://ai.google.dev" target="_blank" className="hover:text-blue-500 transition-colors">Gemini API</a>
            <span className="text-slate-200">|</span>
            <a href="https://github.com" target="_blank" className="hover:text-blue-500 transition-colors">GitHub Repository</a>
        </div>
      </footer>
    </div>
  );
};

export default App;
