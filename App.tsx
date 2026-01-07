import React, { useState } from 'react';
import { Navigation } from './components/Navigation';
import { Dashboard } from './pages/Dashboard';
import { Tutor } from './pages/Tutor';
import { Quiz } from './pages/Quiz';
import { Library } from './pages/Library';
import { AppMode } from './types';
import { Menu, X } from 'lucide-react';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.DASHBOARD);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const renderContent = () => {
    switch (mode) {
      case AppMode.DASHBOARD:
        return <Dashboard setMode={setMode} />;
      case AppMode.TUTOR:
        return <Tutor />;
      case AppMode.QUIZ:
        return <Quiz />;
      case AppMode.LIBRARY:
        return <Library />;
      default:
        return <Dashboard setMode={setMode} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
      {/* Desktop Navigation */}
      <Navigation currentMode={mode} setMode={setMode} />

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 w-full bg-white z-50 border-b border-gray-200 px-4 py-3 flex justify-between items-center">
        <div className="font-bold text-lg text-primary-600">UniTalk</div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-white z-40 pt-16 px-6 pb-6 md:hidden flex flex-col gap-4">
           {[
             { m: AppMode.DASHBOARD, l: 'Dashboard' },
             { m: AppMode.TUTOR, l: 'Tutor' },
             { m: AppMode.LIBRARY, l: 'Library' },
             { m: AppMode.QUIZ, l: 'Quiz' }
           ].map(item => (
             <button
               key={item.m}
               onClick={() => {
                 setMode(item.m);
                 setMobileMenuOpen(false);
               }}
               className={`text-lg font-medium py-3 border-b border-gray-100 ${mode === item.m ? 'text-primary-600' : 'text-gray-600'}`}
             >
               {item.l}
             </button>
           ))}
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 w-full md:w-auto pt-16 md:pt-0 overflow-y-auto">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;