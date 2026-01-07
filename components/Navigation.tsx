import React from 'react';
import { LayoutDashboard, GraduationCap, BookOpen, BrainCircuit, LogOut } from 'lucide-react';
import { AppMode } from '../types';

interface NavigationProps {
  currentMode: AppMode;
  setMode: (mode: AppMode) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ currentMode, setMode }) => {
  const navItems = [
    { mode: AppMode.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
    { mode: AppMode.TUTOR, label: 'Live Tutor', icon: GraduationCap },
    { mode: AppMode.LIBRARY, label: 'Library', icon: BookOpen },
    { mode: AppMode.QUIZ, label: 'Quiz Arena', icon: BrainCircuit },
  ];

  return (
    <div className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 h-screen sticky top-0">
      <div className="p-6">
        <div className="flex items-center gap-2 text-primary-600 font-bold text-2xl">
          <GraduationCap size={32} />
          <span>UniTalk</span>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-2 mt-4">
        {navItems.map((item) => {
          const isActive = currentMode === item.mode;
          return (
            <button
              key={item.mode}
              onClick={() => setMode(item.mode)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${
                isActive
                  ? 'bg-primary-50 text-primary-700 shadow-sm ring-1 ring-primary-100'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <item.icon size={20} className={isActive ? 'text-primary-600' : 'text-gray-400'} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-100">
        <button className="flex items-center gap-3 px-4 py-3 w-full text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors text-sm font-medium">
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </div>
  );
};