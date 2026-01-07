import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Subject, Message } from '../types';
import { Mic, MicOff, Send, Volume2, User, Bot, AlertCircle, GraduationCap } from 'lucide-react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { generateTextResponse } from '../services/geminiService';

export const Tutor: React.FC = () => {
  const [activeSubject, setActiveSubject] = useState<Subject>(Subject.MATH);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'model',
      text: 'Hello! I am your UniTalk tutor. We can chat via text, or enable the microphone for a real-time voice conversation. What shall we learn today?',
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  // Voice State
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<string>('Ready');
  
  // Refs for Live API
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const inputProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);

  // --- Live API Helpers ---

  const createBlob = (data: Float32Array) => {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      int16[i] = data[i] * 32768;
    }
    const uint8 = new Uint8Array(int16.buffer);
    let binary = '';
    const len = uint8.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(uint8[i]);
    }
    const b64 = btoa(binary);
    
    return {
      data: b64,
      mimeType: 'audio/pcm;rate=16000',
    };
  };

  const decodeAudioData = async (base64: string, ctx: AudioContext): Promise<AudioBuffer> => {
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

  const stopVoiceSession = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (inputProcessorRef.current) {
      inputProcessorRef.current.disconnect();
      inputProcessorRef.current = null;
    }
    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    // Note: We can't explicitly "close" the session promise object from the SDK easily 
    // without the session object itself having a close method exposed cleanly in all states,
    // but stopping the stream essentially kills the loop.
    setIsConnected(false);
    setIsVoiceActive(false);
    setVoiceStatus('Ready');
  }, []);

  const startVoiceSession = async () => {
    try {
      setVoiceStatus('Connecting...');
      setIsVoiceActive(true);
      
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      
      // Initialize Audio Contexts
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ac = new AudioContextClass({ sampleRate: 24000 }); // Output rate
      audioContextRef.current = ac;
      
      // Input capture
      const stream = await navigator.mediaDevices.getUserMedia({ audio: {
        sampleRate: 16000,
        channelCount: 1,
        echoCancellation: true
      }});
      mediaStreamRef.current = stream;

      // Connect to Gemini Live
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: `You are a helpful, knowledgeable, and patient school tutor specializing in ${activeSubject}. 
          Speak clearly and adapt to the user's language. Keep answers concise for voice conversation.`,
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
        },
        callbacks: {
          onopen: () => {
            setVoiceStatus('Listening');
            setIsConnected(true);
            
            // Setup Audio Processing for Input
            const inputCtx = new AudioContextClass({ sampleRate: 16000 });
            const source = inputCtx.createMediaStreamSource(stream);
            const processor = inputCtx.createScriptProcessor(4096, 1, 1);
            
            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const blob = createBlob(inputData);
              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: blob });
              });
            };
            
            source.connect(processor);
            processor.connect(inputCtx.destination);
            
            inputProcessorRef.current = processor;
            sourceNodeRef.current = source;
          },
          onmessage: async (msg: LiveServerMessage) => {
            const base64Audio = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && audioContextRef.current) {
              const buffer = await decodeAudioData(base64Audio, audioContextRef.current);
              
              const source = audioContextRef.current.createBufferSource();
              source.buffer = buffer;
              source.connect(audioContextRef.current.destination);
              
              // Simple scheduling
              const now = audioContextRef.current.currentTime;
              const start = Math.max(now, nextStartTimeRef.current);
              source.start(start);
              nextStartTimeRef.current = start + buffer.duration;
            }
          },
          onclose: () => {
            console.log("Session closed");
            stopVoiceSession();
          },
          onerror: (err) => {
            console.error("Session error", err);
            setVoiceStatus('Error');
            stopVoiceSession();
          }
        }
      });
      sessionPromiseRef.current = sessionPromise;

    } catch (e) {
      console.error("Failed to start voice:", e);
      setVoiceStatus('Error starting voice');
      setIsVoiceActive(false);
    }
  };

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: inputText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    // Format history for Gemini
    const history = messages.map(m => ({
      role: m.role,
      parts: [{ text: m.text }]
    }));

    const responseText = await generateTextResponse(inputText, history, activeSubject);
    
    const botMsg: Message = {
      id: (Date.now() + 1).toString(),
      role: 'model',
      text: responseText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, botMsg]);
    setIsTyping(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopVoiceSession();
    };
  }, [stopVoiceSession]);

  return (
    <div className="flex flex-col h-screen md:h-auto md:min-h-screen max-w-7xl mx-auto p-4 md:p-6 gap-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <GraduationCap className="text-primary-600" />
            AI Tutor
          </h1>
          <p className="text-gray-500 text-sm">Real-time support for your studies</p>
        </div>
        
        <div className="flex items-center gap-3 bg-white p-1.5 rounded-xl border border-gray-200 shadow-sm overflow-x-auto no-scrollbar">
          {Object.values(Subject).map((sub) => (
            <button
              key={sub}
              onClick={() => {
                setActiveSubject(sub);
                stopVoiceSession(); // Reset voice if subject changes
              }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                activeSubject === sub
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {sub}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 flex flex-col bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden h-[600px]">
        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50">
           {isVoiceActive ? (
             <div className="h-full flex flex-col items-center justify-center space-y-8 animate-in fade-in duration-500">
                <div className="relative">
                  <div className={`absolute inset-0 bg-primary-400 rounded-full blur-3xl opacity-20 ${isConnected ? 'animate-pulse' : ''}`}></div>
                  <div className={`w-32 h-32 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center shadow-xl relative z-10 transition-transform duration-700 ${isConnected ? 'scale-110' : 'scale-100'}`}>
                    <Mic className="text-white w-12 h-12" />
                  </div>
                  {isConnected && (
                     <div className="absolute -inset-4 border-2 border-primary-200 rounded-full animate-ping opacity-50"></div>
                  )}
                </div>
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-gray-800">{isConnected ? 'Listening...' : 'Connecting...'}</h3>
                  <p className="text-gray-500 mt-2">Speak naturally to your {activeSubject} tutor.</p>
                  <p className="text-xs text-gray-400 mt-4 font-mono">{voiceStatus}</p>
                </div>
             </div>
           ) : (
             messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  msg.role === 'user' ? 'bg-gray-200' : 'bg-primary-100 text-primary-600'
                }`}>
                  {msg.role === 'user' ? <User size={20} /> : <Bot size={20} />}
                </div>
                <div className={`p-4 rounded-2xl max-w-[80%] text-sm leading-relaxed shadow-sm ${
                  msg.role === 'user' 
                    ? 'bg-gray-900 text-white rounded-tr-none' 
                    : 'bg-white text-gray-700 border border-gray-100 rounded-tl-none'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))
           )}
           {isTyping && !isVoiceActive && (
             <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center">
                  <Bot size={20} />
                </div>
                <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-gray-100 flex items-center gap-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
             </div>
           )}
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-gray-100">
          <div className="flex items-center gap-3">
            <button
              onClick={isVoiceActive ? stopVoiceSession : startVoiceSession}
              className={`p-3 rounded-full transition-all duration-300 flex-shrink-0 ${
                isVoiceActive 
                  ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200' 
                  : 'bg-gray-50 text-gray-600 hover:bg-primary-50 hover:text-primary-600 border border-gray-200'
              }`}
              title={isVoiceActive ? "Stop Voice Mode" : "Start Voice Mode"}
            >
              {isVoiceActive ? <MicOff size={24} /> : <Volume2 size={24} />}
            </button>

            <form onSubmit={handleTextSubmit} className="flex-1 flex gap-2 relative">
              <input
                type="text"
                disabled={isVoiceActive}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={isVoiceActive ? "Voice mode active..." : "Ask anything about " + activeSubject + "..."}
                className="w-full pl-5 pr-12 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-300 transition-all disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!inputText.trim() || isVoiceActive}
                className="absolute right-2 top-1.5 p-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:hover:bg-primary-600 transition-colors"
              >
                <Send size={18} />
              </button>
            </form>
          </div>
          {isVoiceActive && (
            <div className="mt-2 flex items-center gap-2 text-xs text-primary-600 justify-center">
              <AlertCircle size={12} />
              <span>Voice mode uses microphone. Wear headphones for best experience.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};