import React, { useState, useEffect } from 'react';
import { FeatureCard } from './FeatureCard';
import { AppMode } from '../../types';
import { BookOpen, BrainCircuit, GraduationCap, Flame, Star, TrendingUp } from 'lucide-react';

interface DashboardProps {
  setMode: (mode: AppMode) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ setMode }) => {
  const [streak, setStreak] = useState(3);

  // Simulate streak calculation
  useEffect(() => {
    // In a real app, check localStorage dates
    const saved = localStorage.getItem('uniTalkStreak');
    if (saved) setStreak(parseInt(saved));
  }, []);

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      <header className="mb-10">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2 font-serif">Welcome back, Student</h1>
        <p className="text-gray-500 text-lg">Ready to continue your learning journey today?</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl p-6 text-white shadow-lg shadow-orange-200 relative overflow-hidden group">
          <div className="absolute top-0 right-0 -mr-4 -mt-4 bg-white opacity-10 rounded-full w-32 h-32 blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
          <div className="flex items-center gap-3 mb-4 opacity-90">
            <Flame size={20} className="fill-current" />
            <span className="font-medium">Study Streak</span>
          </div>
          <div className="text-4xl font-bold mb-1 font-serif">{streak} Days</div>
          <div className="text-white/80 text-sm">You're on fire! Keep it up.</div>
        </div>
        
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-4 text-gray-500">
            <Star size={20} className="text-yellow-400 fill-current" />
            <span className="font-medium">Average Score</span>
          </div>
          <div className="text-4xl font-bold text-gray-900 mb-1 font-serif">92%</div>
          <div className="text-primary-600 text-sm font-medium flex items-center gap-1">
            <TrendingUp size={14} />
            +4% vs last week
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-4 text-gray-500">
             <BookOpen size={20} className="text-blue-400" />
            <span className="font-medium">Materials Read</span>
          </div>
          <div className="text-4xl font-bold text-gray-900 mb-1 font-serif">24</div>
          <div className="text-gray-400 text-sm">Library growing fast</div>
        </div>
      </div>

      <h2 className="text-2xl font-bold text-gray-900 mb-6 font-serif">Quick Actions</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <FeatureCard
          title="Live Tutor"
          description="Have a real-time voice conversation with your AI tutor in any language."
          icon={GraduationCap}
          onClick={() => setMode(AppMode.TUTOR)}
        />
        <FeatureCard
          title="Quiz Arena"
          description="Test your knowledge with voice-enabled quizzes."
          icon={BrainCircuit}
          onClick={() => setMode(AppMode.QUIZ)}
        />
        <FeatureCard
          title="Study Library"
          description="Create comprehensive guides with pronunciation coaches."
          icon={BookOpen}
          onClick={() => setMode(AppMode.LIBRARY)}
        />
      </div>
    </div>
  );
};