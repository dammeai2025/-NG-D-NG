import React, { useState, useCallback } from 'react';
import { lookupWord, generateMoreExamples, findSynonyms, findAntonyms } from '../services/geminiService';
import type { LookupResult } from '../types';
import Spinner from './common/Spinner';
import BackButton from './common/BackButton';

interface LookupModuleProps {
  onBack: () => void;
}

const LookupModule: React.FC<LookupModuleProps> = ({ onBack }) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [result, setResult] = useState<LookupResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingMore, setLoadingMore] = useState<{ examples?: boolean; synonyms?: boolean; antonyms?: boolean }>({});
  const [error, setError] = useState<string | null>(null);

  const handleSearch = useCallback(async () => {
    if (!searchTerm.trim()) {
      setError('Vui lòng nhập từ cần tra cứu.');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await lookupWord(searchTerm);
      setResult(response);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  const handleSpeak = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleAddExamples = async () => {
    if (!result) return;
    setLoadingMore(prev => ({ ...prev, examples: true }));
    try {
      const newExamples = await generateMoreExamples(result.word, result.examples);
      setResult(prev => prev ? { ...prev, examples: [...prev.examples, ...newExamples] } : null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingMore(prev => ({ ...prev, examples: false }));
    }
  };

  const handleFindSynonyms = async () => {
    if (!result) return;
    setLoadingMore(prev => ({ ...prev, synonyms: true }));
    try {
      const synonyms = await findSynonyms(result.word);
      setResult(prev => prev ? { ...prev, synonyms } : null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingMore(prev => ({ ...prev, synonyms: false }));
    }
  };

  const handleFindAntonyms = async () => {
    if (!result) return;
    setLoadingMore(prev => ({ ...prev, antonyms: true }));
    try {
      const antonyms = await findAntonyms(result.word);
      setResult(prev => prev ? { ...prev, antonyms } : null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingMore(prev => ({ ...prev, antonyms: false }));
    }
  };
  
  const renderSubResult = (title: string, items: string[] | undefined, isLoading: boolean | undefined) => {
      if (isLoading) return <div className="mt-4"><Spinner /></div>;
      if (!items) return null;
      if (items.length === 0) {
          return (
              <div className="mt-6 p-4 bg-slate-100 rounded-lg">
                  <h4 className="font-semibold text-slate-800">{title}</h4>
                  <p className="text-slate-600 mt-2">Không tìm thấy kết quả phù hợp.</p>
              </div>
          );
      }
      return (
          <div className="mt-6 p-4 bg-slate-100 rounded-lg">
              <h4 className="font-semibold text-slate-800">{title}</h4>
              <div className="mt-2 flex flex-wrap gap-2">
                  {items.map((item, index) => (
                      <span key={index} className="bg-white border border-slate-200 text-slate-700 rounded-full px-3 py-1 text-sm">{item}</span>
                  ))}
              </div>
          </div>
      );
  }

  return (
    <div>
      <BackButton onClick={onBack} />
      <h2 className="text-2xl font-bold text-slate-900">Tra cứu từ vựng</h2>
      <p className="mt-2 text-slate-600">Nhập một từ Tiếng Anh hoặc Tiếng Việt để tra cứu thông tin chi tiết.</p>
      
      <div className="mt-6 flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Nhập từ cần tra..."
          className="flex-grow w-full px-4 py-2 text-slate-900 bg-white border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          disabled={loading}
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className="w-full sm:w-auto px-6 py-2 bg-indigo-600 text-white font-semibold rounded-md shadow-sm hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Đang tìm...' : 'Tìm kiếm'}
        </button>
      </div>

      {error && <p className="mt-4 text-red-600">{error}</p>}
      
      {loading && <Spinner />}

      {result && !loading && (
        <div className="mt-8 bg-white p-6 rounded-lg shadow-sm border border-slate-200 animate-fade-in">
            <div className="flex items-center gap-4">
                <h3 className="font-bold text-3xl text-indigo-700">{result.word}</h3>
                <p className="font-mono text-lg text-slate-600 bg-slate-100 rounded-md px-2 py-1">
                    /{result.pronunciation}/
                </p>
                <button 
                  onClick={() => handleSpeak(result.word)} 
                  className="text-slate-500 hover:text-indigo-600 transition-colors"
                  aria-label={`Listen to the pronunciation of ${result.word}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                  </svg>
                </button>
            </div>
            <p className="mt-2 text-lg text-slate-800"><strong className="font-semibold">Nghĩa:</strong> {result.translation}</p>
          
            <div className="mt-6 border-t border-slate-200 pt-5">
              <h4 className="font-semibold text-slate-800">Ví dụ:</h4>
              <ul className="mt-2 space-y-3 list-disc list-inside text-slate-700">
                {result.examples.map((ex, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <span className="flex-grow italic">"{ex}"</span>
                    <button 
                      onClick={() => handleSpeak(ex)} 
                      className="text-slate-400 hover:text-indigo-600 transition-colors"
                      aria-label={`Listen to example sentence ${index + 1}`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            
            {renderSubResult("Từ đồng nghĩa", result.synonyms, loadingMore.synonyms)}
            {renderSubResult("Từ trái nghĩa", result.antonyms, loadingMore.antonyms)}

        </div>
      )}

      {result && !loading && (
        <div className="mt-8 pt-6 border-t border-slate-200 flex flex-col sm:flex-row justify-center gap-4">
          <button 
            onClick={handleAddExamples} 
            disabled={!!loadingMore.examples}
            className="px-6 py-2 bg-white text-indigo-700 font-semibold rounded-md shadow-sm border border-indigo-200 hover:bg-indigo-50 transition-colors disabled:opacity-50"
          >
            {loadingMore.examples ? 'Đang tải...' : 'Thêm 5 câu ví dụ'}
          </button>
          <button 
            onClick={handleFindSynonyms}
            disabled={!!loadingMore.synonyms || result.synonyms !== undefined}
            className="px-6 py-2 bg-white text-slate-700 font-semibold rounded-md shadow-sm border border-slate-300 hover:bg-slate-100 transition-colors disabled:opacity-50"
          >
            {loadingMore.synonyms ? 'Đang tìm...' : 'Tìm từ đồng nghĩa'}
          </button>
          <button 
            onClick={handleFindAntonyms}
            disabled={!!loadingMore.antonyms || result.antonyms !== undefined}
            className="px-6 py-2 bg-white text-slate-700 font-semibold rounded-md shadow-sm border border-slate-300 hover:bg-slate-100 transition-colors disabled:opacity-50"
          >
            {loadingMore.antonyms ? 'Đang tìm...' : 'Tìm từ trái nghĩa'}
          </button>
        </div>
      )}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default LookupModule;
