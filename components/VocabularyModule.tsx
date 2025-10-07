import React, { useState, useCallback } from 'react';
import { generateVocabulary } from '../services/geminiService';
import type { VocabularyItem } from '../types';
import Spinner from './common/Spinner';
import BackButton from './common/BackButton';

interface VocabularyModuleProps {
  onBack: () => void;
}

const cardColors = [
  { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-800', hoverBg: 'hover:bg-indigo-100' },
  { bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-800', hoverBg: 'hover:bg-pink-100' },
  { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', hoverBg: 'hover:bg-green-100' },
  { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', hoverBg: 'hover:bg-amber-100' },
  { bg: 'bg-sky-50', border: 'border-sky-200', text: 'text-sky-800', hoverBg: 'hover:bg-sky-100' },
  { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-800', hoverBg: 'hover:bg-purple-100' },
];

const VocabularyModule: React.FC<VocabularyModuleProps> = ({ onBack }) => {
  const [topic, setTopic] = useState<string>('Marketing');
  const [vocabList, setVocabList] = useState<VocabularyItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedVocab, setSelectedVocab] = useState<VocabularyItem | null>(null);

  const handleGenerate = useCallback(async () => {
    if (!topic.trim()) {
      setError('Vui lòng nhập chủ đề.');
      return;
    }
    setLoading(true);
    setError(null);
    setVocabList([]);
    try {
      const result = await generateVocabulary(topic);
      setVocabList(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [topic]);

  const handleSpeak = (text: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    } else {
      alert('Rất tiếc, trình duyệt của bạn không hỗ trợ tính năng phát âm.');
    }
  };
  
  const closeModal = () => setSelectedVocab(null);

  return (
    <div>
      <BackButton onClick={onBack} />
      <h2 className="text-2xl font-bold text-slate-900">Xây dựng Từ vựng</h2>
      <p className="mt-2 text-slate-600">Nhập một chủ đề công việc (ví dụ: Marketing, IT, Nhân sự) để học từ vựng liên quan.</p>
      
      <div className="mt-6 flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Nhập chủ đề..."
          className="flex-grow w-full px-4 py-2 text-slate-900 bg-white border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          disabled={loading}
        />
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="w-full sm:w-auto px-6 py-2 bg-indigo-600 text-white font-semibold rounded-md shadow-sm hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Đang tạo...' : 'Tạo từ vựng'}
        </button>
      </div>

      {error && <p className="mt-4 text-red-600">{error}</p>}
      
      {loading && <Spinner />}

      {vocabList.length > 0 && (
        <div className="mt-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {vocabList.map((item, index) => {
            const color = cardColors[index % cardColors.length];
            return (
              <div 
                key={index} 
                className={`group relative p-4 rounded-lg border cursor-pointer transition-all duration-300 overflow-hidden h-36 flex flex-col justify-center items-center text-center ${color.bg} ${color.border} ${color.hoverBg}`}
                onClick={() => setSelectedVocab(item)}
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/50 backdrop-blur-sm flex flex-col justify-center items-center p-2">
                   <p className="font-mono text-sm text-slate-700">/{item.pronunciation}/</p>
                   <p className="mt-1 font-semibold text-slate-800 text-base">{item.translation}</p>
                </div>
                
                <h3 className={`font-bold text-xl group-hover:scale-90 group-hover:opacity-20 transition-all duration-300 ${color.text}`}>{item.word}</h3>
                
                <button 
                  onClick={(e) => handleSpeak(item.word, e)} 
                  className="absolute top-2 right-2 text-slate-500 opacity-20 group-hover:opacity-100 transition-opacity z-10"
                  aria-label={`Listen to the pronunciation of ${item.word}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {vocabList.length > 0 && !loading && (
        <div className="mt-8 pt-6 border-t border-slate-200 flex justify-center">
          <button
            onClick={handleGenerate}
            className="px-8 py-3 bg-indigo-600 text-white font-semibold rounded-md shadow-sm hover:bg-indigo-700 transition-colors"
          >
            Tiếp tục
          </button>
        </div>
      )}

      {selectedVocab && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4" 
          onClick={closeModal}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md relative animate-fade-in-up" 
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={closeModal} 
              className="absolute top-3 right-3 text-slate-400 hover:text-slate-600"
              aria-label="Đóng"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

             <div className="flex items-center gap-4">
                <h3 className="font-bold text-2xl text-indigo-700">{selectedVocab.word}</h3>
                <button 
                  onClick={() => handleSpeak(selectedVocab.word)} 
                  className="text-slate-500 hover:text-indigo-600 transition-colors"
                  aria-label={`Listen to the pronunciation of ${selectedVocab.word}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                  </svg>
                </button>
              </div>
              <p className="font-mono text-sm text-slate-600 bg-slate-100 rounded-md px-2 py-1 inline-block mt-1">
                /{selectedVocab.pronunciation}/
              </p>
              
              <div className="mt-4 space-y-2 text-slate-700">
                <p><strong className="font-semibold text-slate-800">Định nghĩa:</strong> {selectedVocab.definition}</p>
                <p><strong className="font-semibold text-slate-800">Ví dụ:</strong> <em className="italic">"{selectedVocab.example}"</em></p>
                <p><strong className="font-semibold text-slate-800">Dịch nghĩa:</strong> {selectedVocab.translation}</p>
              </div>
          </div>
        </div>
      )}
      <style>{`
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default VocabularyModule;