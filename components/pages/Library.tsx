import React, { useState } from 'react';
import { generateStudyMaterial } from '../../services/geminiService';
import { StudyMaterial, Subject } from '../../types';
import { BookOpen, Loader2, PlayCircle, StopCircle, Library as LibraryIcon, Volume2 } from 'lucide-react';
import { GoogleGenAI, Modality } from '@google/genai';

// Simple Markdown component wrapper
const MarkdownContent: React.FC<{ content: string }> = ({ content }) => {
  return (
    <div className="prose prose-slate max-w-none prose-headings:font-serif prose-p:text-gray-600 prose-a:text-primary-600">
       <div className="whitespace-pre-wrap font-sans text-gray-700 leading-relaxed">
         {content}
       </div>
    </div>
  );
};

export const Library: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [subject, setSubject] = useState<Subject>(Subject.HISTORY);
  const [material, setMaterial] = useState<StudyMaterial | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Audio State
  const [playingState, setPlayingState] = useState<{type: 'summary' | 'word', id?: string}>({ type: 'summary' });
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioSource, setAudioSource] = useState<AudioBufferSourceNode | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setLoading(true);
    setMaterial(null);
    stopAudio();

    const data = await generateStudyMaterial(topic, subject);
    if (data) {
      setMaterial(data);
    }
    setLoading(false);
  };

  const decodeAudio = async (base64: string, ctx: AudioContext) => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    const dataInt16 = new Int16Array(bytes.buffer);
    const frameCount = dataInt16.length;
    const buffer = ctx.createBuffer(1, frameCount, 24000);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i] / 32768.0;
    }
    return buffer;
  };

  const playTTS = async (text: string, type: 'summary' | 'word', id?: string) => {
    // Stop current audio
    stopAudio();
    
    setPlayingState({ type, id });
    setIsPlaying(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Fenrir' } },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioContextClass({ sampleRate: 24000 });
        const buffer = await decodeAudio(base64Audio, ctx);
        
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.onended = () => {
             setIsPlaying(false);
             setPlayingState({ type: 'summary' }); // reset default
        };
        source.start();
        setAudioSource(source);
      }
    } catch (e) {
      console.error("TTS Error", e);
      setIsPlaying(false);
    }
  };

  const stopAudio = () => {
    if (audioSource) {
      audioSource.stop();
      setAudioSource(null);
    }
    setIsPlaying(false);
  };

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2 font-serif">
            <LibraryIcon className="text-primary-600" />
            Study Library
          </h1>
          <p className="text-gray-500">Generate comprehensive learning materials with pronunciation guides.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sidebar Form */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm sticky top-6">
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <select 
                  value={subject}
                  onChange={(e) => setSubject(e.target.value as Subject)}
                  className="w-full p-2.5 rounded-lg border border-gray-200 bg-sand-50 focus:ring-2 focus:ring-primary-200 outline-none"
                >
                  {Object.values(Subject).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Topic</label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. The French Revolution"
                  className="w-full p-2.5 rounded-lg border border-gray-200 bg-sand-50 focus:ring-2 focus:ring-primary-200 outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !topic.trim()}
                className="w-full bg-primary-600 text-white py-2.5 rounded-lg font-bold hover:bg-primary-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-md shadow-primary-200"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : <BookOpen size={18} />}
                Create Material
              </button>
            </form>
          </div>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-2">
          {loading && (
             <div className="bg-white h-96 rounded-2xl border border-gray-100 flex flex-col items-center justify-center text-gray-400">
                <Loader2 className="animate-spin w-10 h-10 mb-4 text-primary-400" />
                <p>Researching and writing...</p>
             </div>
          )}

          {!loading && !material && (
            <div className="bg-sand-50 border-2 border-dashed border-slate-200 rounded-2xl h-96 flex flex-col items-center justify-center text-gray-400 p-8 text-center">
              <BookOpen size={48} className="mb-4 text-slate-300" />
              <p className="text-lg font-medium text-slate-500">Your library is empty</p>
              <p>Enter a topic to generate a study guide.</p>
            </div>
          )}

          {material && !loading && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              {/* Header / Summary */}
              <div className="bg-sand-50 p-6 border-b border-sand-100 flex justify-between items-start">
                <div>
                   <h2 className="text-2xl font-bold text-gray-900 mb-2 font-serif">{material.title}</h2>
                   <p className="text-gray-600 text-sm font-medium leading-relaxed">{material.summary}</p>
                </div>
                <button
                  onClick={() => isPlaying && playingState.type === 'summary' ? stopAudio() : playTTS(material.summary, 'summary')}
                  className="bg-white p-3 rounded-full shadow-sm text-primary-600 hover:text-primary-700 hover:bg-primary-50 transition-colors flex-shrink-0 ml-4"
                  title="Read Summary Aloud"
                >
                  {isPlaying && playingState.type === 'summary' ? <StopCircle size={24} /> : <PlayCircle size={24} />}
                </button>
              </div>
              
              {/* Pronunciation Guide */}
              {material.vocabulary && material.vocabulary.length > 0 && (
                <div className="p-6 bg-slate-50 border-b border-gray-100">
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Vocabulary & Pronunciation</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {material.vocabulary.map((item, idx) => (
                      <div key={idx} className="bg-white p-3 rounded-xl border border-gray-200 flex items-start gap-3 shadow-sm">
                        <button
                           onClick={() => isPlaying && playingState.id === item.term ? stopAudio() : playTTS(item.term, 'word', item.term)}
                           className="mt-1 p-2 rounded-lg bg-primary-50 text-primary-600 hover:bg-primary-100 transition-colors"
                        >
                          {isPlaying && playingState.id === item.term ? <StopCircle size={16} /> : <Volume2 size={16} />}
                        </button>
                        <div>
                          <div className="flex items-baseline gap-2">
                             <span className="font-bold text-gray-900">{item.term}</span>
                             <span className="text-xs font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{item.phonetic}</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1 leading-tight">{item.definition}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Main Content */}
              <div className="p-8">
                <MarkdownContent content={material.content} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};