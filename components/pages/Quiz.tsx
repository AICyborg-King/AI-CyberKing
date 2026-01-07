import React, { useState, useRef } from 'react';
import { generateQuiz, interpretVoiceAnswer } from '../../services/geminiService';
import { Subject, QuizData } from '../../types';
import { BrainCircuit, CheckCircle2, XCircle, ArrowRight, Loader2, RefreshCw, Mic, AlertCircle } from 'lucide-react';

export const Quiz: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [subject, setSubject] = useState<Subject>(Subject.MATH);
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswerChecked, setIsAnswerChecked] = useState(false);

  // Voice State
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;
    
    setLoading(true);
    setQuizData(null);
    setShowResult(false);
    setScore(0);
    setCurrentQuestionIndex(0);
    
    const data = await generateQuiz(topic, subject);
    if (data) {
      setQuizData(data);
    }
    setLoading(false);
  };

  const handleOptionSelect = (index: number) => {
    if (isAnswerChecked) return;
    setSelectedOption(index);
  };

  const checkAnswer = () => {
    if (selectedOption === null || !quizData) return;
    
    const correct = quizData.questions[currentQuestionIndex].correctAnswer;
    if (selectedOption === correct) {
      setScore(s => s + 1);
      // Update streak in local storage
      const current = localStorage.getItem('uniTalkStreak');
      localStorage.setItem('uniTalkStreak', current ? (parseInt(current) + 1).toString() : '1');
    }
    setIsAnswerChecked(true);
  };

  const nextQuestion = () => {
    if (!quizData) return;
    
    if (currentQuestionIndex < quizData.questions.length - 1) {
      setCurrentQuestionIndex(i => i + 1);
      setSelectedOption(null);
      setIsAnswerChecked(false);
    } else {
      setShowResult(true);
    }
  };

  // --- Voice Logic ---
  const toggleVoiceInput = async () => {
    if (isAnswerChecked || isProcessingVoice) return;

    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        setIsProcessingVoice(true);
        const blob = new Blob(chunks, { type: 'audio/wav' });
        
        // Convert Blob to Base64
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(',')[1];
          if (quizData) {
            const currentQ = quizData.questions[currentQuestionIndex];
            const resultIndex = await interpretVoiceAnswer(
              base64Audio, 
              currentQ.question, 
              currentQ.options
            );
            
            if (resultIndex !== null && resultIndex >= 0 && resultIndex < 4) {
              setSelectedOption(resultIndex);
            }
          }
          setIsProcessingVoice(false);
          stream.getTracks().forEach(track => track.stop());
        };
      };

      recorder.start();
      setIsRecording(true);
      mediaRecorderRef.current = recorder;
    } catch (e) {
      console.error("Mic error", e);
      setIsProcessingVoice(false);
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 font-serif">Quiz Arena</h1>
        <p className="text-gray-500">Generate a custom quiz on any topic instantly.</p>
      </div>

      {!quizData && !loading && (
        <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm max-w-lg mx-auto">
          <form onSubmit={handleGenerate} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
              <select 
                value={subject}
                onChange={(e) => setSubject(e.target.value as Subject)}
                className="w-full p-3 rounded-xl border border-gray-200 bg-sand-50 focus:ring-2 focus:ring-primary-200 outline-none"
              >
                {(Object.values(Subject) as Subject[]).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Topic</label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., Photosynthesis, Calculus, World War II"
                className="w-full p-3 rounded-xl border border-gray-200 bg-sand-50 focus:ring-2 focus:ring-primary-200 outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={!topic.trim()}
              className="w-full bg-primary-600 text-white py-3 rounded-xl font-bold hover:bg-primary-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-md shadow-primary-200"
            >
              <BrainCircuit size={20} />
              Generate Quiz
            </button>
          </form>
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="animate-spin text-primary-600 w-12 h-12 mb-4" />
          <p className="text-gray-500 font-medium">Constructing your challenge...</p>
        </div>
      )}

      {quizData && !showResult && !loading && (
        <div className="max-w-2xl mx-auto">
          <div className="mb-6 flex items-center justify-between text-sm font-medium text-gray-500">
             <span>Question {currentQuestionIndex + 1} of {quizData.questions.length}</span>
             <span className="bg-primary-50 text-primary-700 px-3 py-1 rounded-full border border-primary-100">{subject}</span>
          </div>

          <div className="bg-white rounded-3xl p-8 border border-gray-200 shadow-lg mb-6 relative overflow-hidden">
            {/* Audio Wave Visualizer Background (subtle) */}
            {isRecording && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-10">
                 <div className="w-full h-32 bg-primary-500 animate-pulse rounded-full blur-3xl"></div>
              </div>
            )}

            <h2 className="text-xl font-bold text-gray-900 mb-6 font-serif relative z-10">
              {quizData.questions[currentQuestionIndex].question}
            </h2>

            <div className="space-y-3 relative z-10">
              {quizData.questions[currentQuestionIndex].options.map((option, idx) => {
                let btnClass = "w-full text-left p-4 rounded-xl border-2 transition-all duration-200 flex items-center justify-between ";
                
                if (isAnswerChecked) {
                   if (idx === quizData.questions[currentQuestionIndex].correctAnswer) {
                     btnClass += "border-primary-500 bg-primary-50 text-primary-900";
                   } else if (idx === selectedOption) {
                     btnClass += "border-red-500 bg-red-50 text-red-900";
                   } else {
                     btnClass += "border-gray-100 opacity-50";
                   }
                } else {
                  if (selectedOption === idx) {
                    btnClass += "border-primary-600 bg-primary-50 text-primary-900 shadow-sm ring-1 ring-primary-600";
                  } else {
                    btnClass += "border-gray-100 hover:border-primary-200 hover:bg-sand-50";
                  }
                }

                return (
                  <button
                    key={idx}
                    onClick={() => handleOptionSelect(idx)}
                    disabled={isAnswerChecked}
                    className={btnClass}
                  >
                    <span>{option}</span>
                    {isAnswerChecked && idx === quizData.questions[currentQuestionIndex].correctAnswer && (
                        <CheckCircle2 size={20} className="text-primary-600" />
                    )}
                    {isAnswerChecked && idx === selectedOption && idx !== quizData.questions[currentQuestionIndex].correctAnswer && (
                        <XCircle size={20} className="text-red-600" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Voice Input Trigger */}
            {!isAnswerChecked && (
              <div className="mt-6 flex justify-center">
                 <button
                   onClick={toggleVoiceInput}
                   className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                     isRecording 
                       ? 'bg-red-50 text-red-600 animate-pulse border border-red-200'
                       : isProcessingVoice 
                         ? 'bg-gray-100 text-gray-400'
                         : 'bg-sand-100 text-gray-600 hover:bg-sand-200'
                   }`}
                   disabled={isProcessingVoice}
                 >
                   {isProcessingVoice ? (
                     <>
                       <Loader2 size={14} className="animate-spin" />
                       Processing...
                     </>
                   ) : (
                     <>
                       <Mic size={14} className={isRecording ? "text-red-600" : ""} />
                       {isRecording ? "Listening... (Click to stop)" : "Answer with Voice"}
                     </>
                   )}
                 </button>
              </div>
            )}

            {isAnswerChecked && (
              <div className="mt-6 p-5 bg-blue-50 text-blue-900 rounded-xl text-sm border border-blue-100 animate-in fade-in slide-in-from-bottom-2">
                <div className="flex gap-2 mb-1 font-bold text-blue-700 items-center">
                   <AlertCircle size={16} />
                   Feedback
                </div>
                <div className="leading-relaxed">
                  {quizData.questions[currentQuestionIndex].explanation}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end">
            {!isAnswerChecked ? (
              <button
                onClick={checkAnswer}
                disabled={selectedOption === null}
                className="bg-primary-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-primary-700 disabled:opacity-50 disabled:hover:bg-primary-600 transition-colors shadow-lg shadow-primary-200"
              >
                Check Answer
              </button>
            ) : (
              <button
                onClick={nextQuestion}
                className="bg-gray-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-black transition-colors flex items-center gap-2 shadow-lg"
              >
                {currentQuestionIndex < quizData.questions.length - 1 ? 'Next Question' : 'Finish Quiz'}
                <ArrowRight size={18} />
              </button>
            )}
          </div>
        </div>
      )}

      {showResult && quizData && (
        <div className="max-w-lg mx-auto bg-white p-10 rounded-3xl border border-gray-200 shadow-xl text-center">
           <div className="w-24 h-24 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-primary-100">
              <span className="text-4xl font-bold text-white font-serif">{Math.round((score / quizData.questions.length) * 100)}%</span>
           </div>
           <h2 className="text-2xl font-bold text-gray-900 mb-2 font-serif">Quiz Completed!</h2>
           <p className="text-gray-500 mb-8">
             You answered {score} out of {quizData.questions.length} questions correctly.
           </p>
           
           <button
             onClick={() => {
               setQuizData(null);
               setTopic('');
             }}
             className="w-full bg-gray-900 text-white py-3 rounded-xl font-bold hover:bg-black transition-colors flex items-center justify-center gap-2"
           >
             <RefreshCw size={18} />
             Start New Quiz
           </button>
        </div>
      )}
    </div>
  );
};