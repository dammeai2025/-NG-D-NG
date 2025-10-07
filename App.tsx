
import React, { useState } from 'react';
import { ModuleType } from './types';
import Dashboard from './components/Dashboard';
import VocabularyModule from './components/VocabularyModule';
import GrammarModule from './components/GrammarModule';
import ListeningModule from './components/ListeningModule';
import SpeakingModule from './components/SpeakingModule';
import PronunciationModule from './components/PronunciationModule';
import LookupModule from './components/LookupModule';

const Header: React.FC = () => (
  <header className="bg-white shadow-sm">
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between h-16">
        <div className="flex items-center space-x-2">
           <svg className="h-8 w-8 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
          </svg>
          <span className="text-xl font-bold text-slate-800">EngBoost</span>
        </div>
        <p className="text-sm text-slate-500 hidden sm:block">Tiếng Anh cho người đi làm</p>
      </div>
    </div>
  </header>
);

const App: React.FC = () => {
  const [activeModule, setActiveModule] = useState<ModuleType>(ModuleType.DASHBOARD);

  const renderModule = () => {
    switch (activeModule) {
      case ModuleType.LOOKUP:
        return <LookupModule onBack={() => setActiveModule(ModuleType.DASHBOARD)} />;
      case ModuleType.VOCABULARY:
        return <VocabularyModule onBack={() => setActiveModule(ModuleType.DASHBOARD)} />;
      case ModuleType.GRAMMAR:
        return <GrammarModule onBack={() => setActiveModule(ModuleType.DASHBOARD)} />;
      case ModuleType.LISTENING:
        return <ListeningModule onBack={() => setActiveModule(ModuleType.DASHBOARD)} />;
      case ModuleType.SPEAKING:
        return <SpeakingModule onBack={() => setActiveModule(ModuleType.DASHBOARD)} />;
      case ModuleType.PRONUNCIATION:
        return <PronunciationModule onBack={() => setActiveModule(ModuleType.DASHBOARD)} />;
      case ModuleType.DASHBOARD:
      default:
        return <Dashboard onSelectModule={setActiveModule} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      <Header />
      <main>
        <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          {renderModule()}
        </div>
      </main>
    </div>
  );
};

export default App;