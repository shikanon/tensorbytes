import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  Send, 
  Image as ImageIcon, 
  X, 
  Plus, 
  Loader2, 
  Video, 
  Play, 
  Download, 
  Trash2, 
  ChevronRight, 
  CheckCircle2, 
  Languages, 
  Layout, 
  ShoppingBag,
  Type,
  ChevronDown,
  Sparkles,
  FileText,
  Files,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  ExternalLink,
  MoreHorizontal,
  Search,
  Check,
  Zap,
  DownloadCloud
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

// --- Types ---
type Lang = 'zh' | 'en';
type VideoType = 'text_poster' | 'ecommerce';
type ModelType = 'seedance' | 'veo3';
type TaskStatus = 'queued' | 'generating' | 'completed' | 'failed';
type RightViewType = 'files' | 'document' | 'parsing';

interface Attachment {
  id: string;
  url: string;
  file: File;
}

interface VideoTask {
  id: string;
  title: string;
  type: VideoType;
  model: ModelType;
  status: TaskStatus;
  createdAt: number;
  url?: string;
  duration?: string;
  size?: string;
  thumbnail?: string;
  progress?: number;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  type?: VideoType;
  model?: ModelType;
  attachments?: string[];
  isConfirmation?: boolean;
}

// --- Translations ---
const translations = {
  zh: {
    appName: '小名广告生成平台',
    brand: 'Tensorbytes',
    videoType: '视频类型',
    textPoster: '大字报广告',
    ecommerce: '电商视频宣传',
    modelSelect: '选择模型',
    seedance: 'Seedance 模型',
    veo3: 'Veo3 视频模型',
    inputPlaceholder: '描述您的广告创意... (Enter 发送, Shift + Enter 换行)',
    send: '发送',
    history: '历史记录',
    gallery: '资源库',
    document: '方案详情',
    confirmTitle: '需求确认清单',
    confirmBtn: '确认并开始生成',
    cancelBtn: '放弃',
    queued: '排队中',
    generating: '生成中',
    completed: '已完成',
    failed: '生成失败',
    preview: '预览',
    download: '下载',
    delete: '删除',
    parsing: 'Manus 正在思考并解析需求...',
    heroTitle: '让创意瞬间变成大片',
    heroSub: '领先的 AI 广告生成平台，助力品牌快速出片',
    back: '返回',
    versions: '生成版本数量',
    confirmDesc: '请审阅由 Manus AI 深度解析的制作方案。',
    oneClickExport: '一键导出所有视频',
    customCount: '自定义数量',
    exportSuccess: '正在打包并导出完成的视频...',
  },
  en: {
    appName: 'Ad Generator',
    brand: 'Tensorbytes',
    videoType: 'Video Type',
    textPoster: 'Text Poster Ad',
    ecommerce: 'E-commerce Ad',
    modelSelect: 'Select Model',
    seedance: 'Seedance Model',
    veo3: 'Veo3 Video',
    inputPlaceholder: 'Describe your ad idea... (Enter to send, Shift + Enter for newline)',
    send: 'Send',
    history: 'History',
    gallery: 'Files',
    document: 'Document',
    confirmTitle: 'Project Specification',
    confirmBtn: 'Approve & Build',
    cancelBtn: 'Discard',
    queued: 'Queued',
    generating: 'Generating',
    completed: 'Completed',
    failed: 'Failed',
    preview: 'Preview',
    download: 'Download',
    delete: 'Delete',
    parsing: 'Manus is analyzing your request...',
    heroTitle: 'Cinematic Ads, Instant Results',
    heroSub: 'The professional AI workspace for high-conversion video ads.',
    back: 'Back',
    versions: 'Versions to Generate',
    confirmDesc: 'Please review the project specification analyzed by Manus AI.',
    oneClickExport: 'One-click Export All',
    customCount: 'Custom Amount',
    exportSuccess: 'Packaging and exporting completed videos...',
  }
};

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SimpleMarkdown = ({ content }: { content: string }) => {
  const lines = content.split('\n');
  return (
    <div className="space-y-4">
      {lines.map((line, i) => {
        if (line.startsWith('###')) return <h3 key={i} className="text-xl font-bold text-gray-900 mt-6">{line.replace('###', '')}</h3>;
        if (line.startsWith('##')) return <h2 key={i} className="text-2xl font-bold text-gray-900 mt-8 border-b pb-2">{line.replace('##', '')}</h2>;
        if (line.startsWith('#')) return <h1 key={i} className="text-3xl font-black text-gray-900 mb-6">{line.replace('#', '')}</h1>;
        if (line.startsWith('-') || line.startsWith('*')) return <li key={i} className="ml-4 list-disc text-gray-700">{line.substring(1).trim()}</li>;
        if (line.trim() === '') return <br key={i} />;
        const formattedLine = line.split(/\*\*(.*?)\*\*/g).map((part, index) => 
          index % 2 === 1 ? <strong key={index} className="text-indigo-600 font-bold">{part}</strong> : part
        );
        return <p key={i} className="text-gray-600 leading-relaxed">{formattedLine}</p>;
      })}
    </div>
  );
};

interface InputBoxProps {
  isHero?: boolean;
  videoType: VideoType;
  setVideoType: (v: VideoType) => void;
  modelType: ModelType;
  setModelType: (m: ModelType) => void;
  attachments: Attachment[];
  removeAttachment: (id: string) => void;
  inputText: string;
  setInputText: (t: string) => void;
  handleSend: () => void;
  isParsing: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  t: any;
}

const InputBox = ({ 
  isHero = false, videoType, setVideoType, modelType, setModelType, 
  attachments, removeAttachment, inputText, setInputText, 
  handleSend, isParsing, fileInputRef, t 
}: InputBoxProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [inputText]);

  return (
    <div className={`w-full transition-all duration-500 ${isHero ? 'max-w-3xl scale-110' : ''}`}>
      <div className="flex items-center gap-2 mb-3 px-2">
        <div className="relative group">
          <select 
            value={videoType} 
            onChange={(e) => setVideoType(e.target.value as VideoType)}
            className="appearance-none bg-white border border-gray-200 rounded-lg px-3 py-1.5 pr-8 text-[11px] font-bold text-gray-600 shadow-sm focus:ring-2 focus:ring-indigo-100 cursor-pointer outline-none transition-all"
          >
            <option value="text_poster">{t.textPoster}</option>
            <option value="ecommerce">{t.ecommerce}</option>
          </select>
          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
        <div className="relative group">
          <select 
            value={modelType} 
            onChange={(e) => setModelType(e.target.value as ModelType)}
            className="appearance-none bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-1.5 pr-8 text-[11px] font-bold text-indigo-600 shadow-sm focus:ring-2 focus:ring-indigo-100 cursor-pointer outline-none transition-all"
          >
            <option value="veo3">{t.veo3}</option>
            <option value="seedance">{t.seedance}</option>
          </select>
          <Sparkles size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-indigo-400 pointer-events-none" />
        </div>
      </div>
      <div className="relative group/input-container">
        {attachments.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-3 custom-scrollbar px-2">
            {attachments.map(att => (
              <div key={att.id} className="relative group shrink-0">
                <div className="relative rounded-lg overflow-hidden border border-gray-200 bg-white">
                  <img src={att.url} className="w-14 h-14 object-cover" />
                  <button onClick={() => removeAttachment(att.id)} className="absolute top-0.5 right-0.5 bg-black/60 hover:bg-red-500 text-white rounded-full p-0.5 shadow-md transition-all backdrop-blur-sm opacity-0 group-hover:opacity-100"><X size={10} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className={`flex items-end gap-2 bg-white p-2 rounded-[24px] border border-gray-200 transition-all shadow-sm focus-within:shadow-xl focus-within:border-indigo-200 ${isHero ? 'p-3 rounded-[32px] border-gray-300 shadow-2xl' : ''}`}>
          <button onClick={() => fileInputRef.current?.click()} className="p-2.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all mb-1"><ImageIcon size={20} /></button>
          <textarea ref={textareaRef} value={inputText} onChange={(e) => setInputText(e.target.value.slice(0, 500))} placeholder={t.inputPlaceholder} className="flex-1 bg-transparent border-none focus:ring-0 text-sm md:text-base py-3 resize-none max-h-[300px] min-h-[48px] custom-scrollbar placeholder:text-gray-400 font-medium" rows={1} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} />
          <button onClick={handleSend} disabled={!inputText.trim() || isParsing} className={`p-3 rounded-full transition-all mb-1 ${inputText.trim() && !isParsing ? 'bg-black text-white shadow-xl hover:scale-105 active:scale-95' : 'bg-gray-100 text-gray-300 cursor-not-allowed'}`}>{isParsing ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}</button>
        </div>
      </div>
    </div>
  );
};

const App = () => {
  const [lang, setLang] = useState<Lang>('zh');
  const [videoType, setVideoType] = useState<VideoType>('text_poster');
  const [modelType, setModelType] = useState<ModelType>('veo3');
  const [inputText, setInputText] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [tasks, setTasks] = useState<VideoTask[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [currentConfirmation, setCurrentConfirmation] = useState<ChatMessage | null>(null);
  const [previewVideo, setPreviewVideo] = useState<VideoTask | null>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [rightView, setRightView] = useState<RightViewType>('files');
  const [versionCount, setVersionCount] = useState<number>(1);
  const [isExporting, setIsExporting] = useState(false);

  const t = translations[lang];
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (attachments.length + files.length > 10) {
      alert(lang === 'zh' ? '最多上传10张图片' : 'Max 10 images allowed');
      return;
    }
    const newAttachments = files.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      url: URL.createObjectURL(file),
      file
    }));
    setAttachments([...attachments, ...newAttachments]);
  };

  const removeAttachment = (id: string) => setAttachments(prev => prev.filter(a => a.id !== id));

  const handleSend = async () => {
    if (!inputText.trim() || isParsing) return;
    if (!hasStarted) setHasStarted(true);
    const messageContent = inputText.trim();
    const newMessage: ChatMessage = {
      id: Date.now().toString(), role: 'user', content: messageContent,
      type: videoType, model: modelType, attachments: attachments.map(a => a.url)
    };
    setChatHistory(prev => [...prev, newMessage]);
    setInputText(''); setAttachments([]); setIsParsing(true); setRightView('parsing');
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Act as Manus AI. Input: "${messageContent}", Type: "${videoType}", Model: "${modelType}". Create professional markdown project spec in ${lang === 'zh' ? 'Chinese' : 'English'}. Include headers: # Analysis, ## Strategy, ## Visuals.`,
      });
      const assistantMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'assistant', content: response.text || 'Done.', isConfirmation: true };
      setChatHistory(prev => [...prev, assistantMsg]);
      setCurrentConfirmation(assistantMsg); setRightView('document');
    } catch (error) { console.error(error); setRightView('files'); } finally { setIsParsing(false); }
  };

  const confirmGeneration = (count: number) => {
    const num = Math.min(Math.max(1, count), 100);
    if (!currentConfirmation) return;
    const newTasks: VideoTask[] = Array.from({ length: num }).map((_, i) => ({
      id: Math.random().toString(36).substr(2, 9),
      title: `${videoType === 'text_poster' ? t.textPoster : t.ecommerce} - ${new Date().toLocaleTimeString()}`,
      type: videoType, model: modelType, status: 'queued', createdAt: Date.now(), progress: 0
    }));
    setTasks(prev => [...newTasks, ...prev]);
    setCurrentConfirmation(null); setRightView('files');
    newTasks.forEach(task => simulateGeneration(task.id));
  };

  const simulateGeneration = (id: string) => {
    setTimeout(() => {
      setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'generating', progress: 5 } : t));
      let progress = 5;
      const interval = setInterval(() => {
        progress += Math.floor(Math.random() * 20) + 2;
        if (progress >= 100) {
          clearInterval(interval);
          setTasks(prev => prev.map(t => t.id === id ? { 
            ...t, status: 'completed', progress: 100, 
            url: 'https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4',
            thumbnail: `https://picsum.photos/seed/${id}/640/360`, duration: '00:15', size: '2.4 MB'
          } : t));
        } else {
          setTasks(prev => prev.map(t => t.id === id ? { ...t, progress } : t));
        }
      }, 1500);
    }, Math.random() * 2000);
  };

  const handleExportAll = () => {
    const completed = tasks.filter(t => t.status === 'completed');
    if (completed.length === 0) return;
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      alert(t.exportSuccess);
    }, 2000);
  };

  const WorkspaceHeader = ({ title, icon: Icon, type }: { title: string, icon: any, type: string }) => (
    <div className="h-14 border-b bg-white flex items-center px-4 justify-between select-none shrink-0">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <button onClick={() => setRightView('files')} className="p-1.5 hover:bg-gray-100 rounded-md transition-colors text-gray-400"><ArrowLeft size={16} /></button>
          <button className="p-1.5 text-gray-200 cursor-not-allowed"><ArrowRight size={16} /></button>
          <button className="p-1.5 hover:bg-gray-100 rounded-md transition-colors text-gray-400" onClick={() => window.location.reload()}><RotateCcw size={16} /></button>
        </div>
        <div className="h-4 w-[1px] bg-gray-200 mx-1"></div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-100 min-w-[280px]">
          <Icon size={14} className="text-gray-400" />
          <span className="text-xs font-semibold text-gray-600 truncate max-w-[150px]">{title}</span>
          <div className="ml-auto text-[10px] text-gray-300 font-mono tracking-tighter">workspace/{type}</div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {type === 'files' && tasks.some(t => t.status === 'completed') && (
          <button 
            onClick={handleExportAll}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg text-xs font-bold hover:bg-gray-800 transition-all shadow-lg active:scale-95 disabled:opacity-50"
          >
            {isExporting ? <Loader2 size={14} className="animate-spin" /> : <DownloadCloud size={14} />}
            {t.oneClickExport}
          </button>
        )}
        <div className="h-6 w-[1px] bg-gray-200"></div>
        <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-400"><ExternalLink size={16} /></button>
        <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-400"><MoreHorizontal size={16} /></button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen w-full bg-white text-gray-900 font-inter antialiased">
      {!hasStarted ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[radial-gradient(circle_at_20%_20%,_rgba(0,0,0,0.02),_transparent),radial-gradient(circle_at_80%_80%,_rgba(0,0,0,0.02),_transparent)] relative overflow-hidden">
          <div className="absolute top-12 left-12 flex items-center gap-3">
            <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-white font-black">M</div>
            <h1 className="font-bold text-xl tracking-tighter text-gray-950 uppercase">{t.brand}</h1>
          </div>
          <button onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')} className="absolute top-12 right-12 px-4 py-2 hover:bg-gray-50 rounded-full transition-all text-gray-600 flex items-center gap-2 text-xs font-bold border border-gray-200 shadow-sm"><Languages size={16} />{lang === 'zh' ? 'EN' : 'ZH'}</button>
          <div className="w-full flex flex-col items-center text-center space-y-10 animate-in fade-in zoom-in-95 duration-700">
            <div className="space-y-4 max-w-4xl px-4">
              <h2 className="text-5xl md:text-7xl font-black text-gray-950 tracking-tight leading-[1.1]">{t.heroTitle}</h2>
              <p className="text-lg md:text-xl text-gray-400 font-medium">{t.heroSub}</p>
            </div>
            <InputBox isHero videoType={videoType} setVideoType={setVideoType} modelType={modelType} setModelType={setModelType} attachments={attachments} removeAttachment={removeAttachment} inputText={inputText} setInputText={setInputText} handleSend={handleSend} isParsing={isParsing} fileInputRef={fileInputRef} t={t} />
          </div>
          <input type="file" ref={fileInputRef} multiple className="hidden" accept="image/*" onChange={handleFileUpload} />
        </div>
      ) : (
        <>
          {/* Chat Side */}
          <div style={{ width: 440 }} className="flex flex-col border-r bg-white relative z-10 shrink-0">
            <header className="h-16 border-b flex items-center justify-between px-6 shrink-0">
              <div className="flex items-center gap-3 cursor-pointer" onClick={() => setHasStarted(false)}>
                <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white font-black">M</div>
                <h1 className="font-bold text-sm tracking-tight text-gray-900 uppercase">{t.brand}</h1>
              </div>
              <button onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"><Languages size={18} /></button>
            </header>
            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
              {chatHistory.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[90%] rounded-2xl p-4 transition-all animate-in fade-in slide-in-from-bottom-2 ${msg.role === 'user' ? 'bg-black text-white rounded-tr-none shadow-xl' : 'bg-gray-50 text-gray-800 rounded-tl-none border border-gray-100'}`}>
                    <div className="text-[14px] leading-relaxed font-medium whitespace-pre-wrap">{msg.content}</div>
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {msg.attachments.map((url, i) => <img key={i} src={url} className="w-12 h-12 rounded-lg object-cover border border-black/5" />)}
                      </div>
                    )}
                    {msg.isConfirmation && (
                      <button onClick={() => { setCurrentConfirmation(msg); setRightView('document'); }} className="mt-4 w-full py-2.5 bg-black text-white rounded-xl text-xs font-bold hover:bg-gray-800 transition-all flex items-center justify-center gap-2 group">
                        <FileText size={14} />{t.confirmBtn}<ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {isParsing && (
                <div className="flex justify-start">
                  <div className="bg-gray-50 border border-gray-100 text-gray-400 p-4 rounded-2xl rounded-tl-none flex items-center gap-3"><Loader2 size={16} className="animate-spin" /><span className="text-xs font-bold uppercase tracking-widest">{t.parsing}</span></div>
                </div>
              )}
            </div>
            <div className="p-6 border-t bg-white">
              <InputBox videoType={videoType} setVideoType={setVideoType} modelType={modelType} setModelType={setModelType} attachments={attachments} removeAttachment={removeAttachment} inputText={inputText} setInputText={setInputText} handleSend={handleSend} isParsing={isParsing} fileInputRef={fileInputRef} t={t} />
              <input type="file" ref={fileInputRef} multiple className="hidden" accept="image/*" onChange={handleFileUpload} />
            </div>
          </div>

          {/* Right workspace (Manus style) */}
          <div className="flex-1 flex flex-col bg-gray-100 p-4 overflow-hidden">
            <div className="flex-1 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col relative">
              {rightView === 'parsing' ? (
                <div className="flex-1 flex flex-col items-center justify-center bg-white">
                  <div className="w-64 space-y-4 text-center">
                    <Loader2 className="text-indigo-600 animate-spin mx-auto" size={48} />
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest">{t.parsing}</p>
                  </div>
                </div>
              ) : rightView === 'document' ? (
                <>
                  <WorkspaceHeader title={t.document} icon={FileText} type="document" />
                  <div className="flex-1 overflow-y-auto bg-white custom-scrollbar scroll-smooth">
                    <div className="max-w-4xl mx-auto py-20 px-10">
                      <div className="mb-12 flex items-center justify-between border-b pb-10">
                        <div className="space-y-3">
                          <h1 className="text-5xl font-black text-gray-900 tracking-tighter uppercase">{t.confirmTitle}</h1>
                          <p className="text-gray-500 font-medium text-lg">{t.confirmDesc}</p>
                        </div>
                      </div>
                      <SimpleMarkdown content={currentConfirmation?.content || ''} />
                      <div className="mt-20 border-t pt-10 space-y-10 pb-40">
                        <div className="space-y-6">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-black text-indigo-600 uppercase tracking-[0.4em]">{t.versions}</label>
                            <span className="text-[10px] text-gray-400 font-bold uppercase">{t.customCount} (1-100)</span>
                          </div>
                          <div className="flex gap-4 items-center">
                            {[1, 3, 5].map(n => (
                              <button key={n} onClick={() => setVersionCount(n)} className={`flex-1 py-6 rounded-2xl transition-all font-black text-2xl border-2 ${versionCount === n ? 'border-indigo-600 bg-indigo-50 text-indigo-600 shadow-lg' : 'border-gray-100 bg-white text-gray-400 hover:border-gray-200'}`}>{n}</button>
                            ))}
                            <div className="flex-[1.5] relative">
                              <input type="number" value={versionCount} onChange={(e) => setVersionCount(Number(e.target.value))} className="w-full py-6 px-6 bg-white border-2 border-gray-100 rounded-2xl font-black text-2xl text-center focus:border-indigo-600 focus:ring-0 transition-all outline-none" min="1" max="100" />
                              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white px-2 text-[8px] font-black text-gray-300 uppercase">Input</div>
                            </div>
                          </div>
                        </div>
                        <button onClick={() => confirmGeneration(versionCount)} className="w-full py-6 bg-black text-white rounded-3xl font-black text-base uppercase tracking-[0.4em] hover:bg-gray-800 transition-all shadow-2xl active:scale-[0.98] flex items-center justify-center gap-4 group">
                          <Zap size={22} className="group-hover:scale-125 transition-transform text-indigo-400" />
                          {t.confirmBtn}
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <WorkspaceHeader title={t.gallery} icon={Files} type="files" />
                  <div className="flex-1 overflow-y-auto bg-gray-50/20 custom-scrollbar p-8">
                    {tasks.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-gray-300 space-y-4">
                        <div className="w-20 h-20 bg-white rounded-[40px] shadow-sm flex items-center justify-center border border-gray-100"><Video size={32} strokeWidth={1.5} className="text-gray-100" /></div>
                        <p className="text-xs font-black uppercase tracking-[0.4em]">{t.noVideos}</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 animate-in fade-in duration-500">
                        {tasks.map(task => (
                          <div key={task.id} className="bg-white rounded-3xl border border-gray-200 overflow-hidden group hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                            <div className="aspect-video bg-gray-50 relative overflow-hidden">
                              {task.status === 'completed' ? (
                                <>
                                  <img src={task.thumbnail} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" />
                                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-300 backdrop-blur-sm">
                                    <button onClick={() => setPreviewVideo(task)} className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-black shadow-2xl scale-75 group-hover:scale-100 transition-all hover:scale-110"><Play size={22} fill="currentColor" /></button>
                                  </div>
                                  <span className="absolute bottom-3 right-3 bg-black/70 text-white text-[9px] px-2 py-1 rounded-md font-black backdrop-blur-md">{task.duration}</span>
                                </>
                              ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center p-6 space-y-4 bg-white">
                                  <div className="relative"><Loader2 className="text-indigo-600 animate-spin" size={32} /></div>
                                  <div className="w-full bg-gray-50 h-1.5 rounded-full overflow-hidden shadow-inner"><div className="bg-indigo-600 h-full transition-all duration-700" style={{ width: `${task.progress}%` }} /></div>
                                  <span className="text-[10px] font-black text-gray-300 tracking-widest uppercase">{t[task.status as keyof typeof t]} {task.progress}%</span>
                                </div>
                              )}
                            </div>
                            <div className="p-5 space-y-4">
                              <div className="flex justify-between items-start gap-2">
                                <h3 className="font-bold text-[12px] text-gray-800 line-clamp-1 leading-tight tracking-tight uppercase">{task.title}</h3>
                                {task.status === 'completed' && <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>}
                              </div>
                              <div className="flex items-center gap-2 text-[9px] text-gray-400 font-bold uppercase tracking-widest">
                                <span className="bg-gray-50 px-2 py-0.5 rounded-lg border border-gray-100">{task.model}</span>
                                <span>{task.size || '--'}</span>
                              </div>
                              {task.status === 'completed' && (
                                <div className="flex gap-2 pt-2 border-t border-gray-50">
                                  <button className="flex-1 py-2.5 bg-gray-50 hover:bg-black hover:text-white text-gray-600 rounded-xl text-[10px] font-black transition-all flex items-center justify-center gap-1.5 uppercase tracking-widest active:scale-95"><Download size={14} /> {t.download}</button>
                                  <button onClick={() => setTasks(prev => prev.filter(t => t.id !== task.id))} className="p-2.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={16} /></button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* Video Preview */}
      {previewVideo && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-10 bg-black/98 backdrop-blur-3xl animate-in fade-in duration-300">
          <button onClick={() => setPreviewVideo(null)} className="absolute top-10 right-10 p-4 text-white/30 hover:text-white hover:bg-white/10 rounded-full transition-all group"><X size={40} className="group-hover:rotate-90 transition-transform" /></button>
          <div className="w-full max-w-6xl aspect-video bg-black rounded-[48px] overflow-hidden shadow-2xl relative group/preview">
            <video src={previewVideo.url} controls autoPlay className="w-full h-full" />
            <div className="absolute top-10 left-10 opacity-0 group-hover/preview:opacity-100 transition-all duration-500">
              <h2 className="text-white font-black text-3xl drop-shadow-2xl uppercase tracking-tighter">{previewVideo.title}</h2>
              <div className="flex items-center gap-4 mt-2">
                <span className="bg-indigo-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">{previewVideo.model}</span>
                <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.2em]">{previewVideo.duration} • {previewVideo.size}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

createRoot(document.getElementById('root')!).render(<App />);
