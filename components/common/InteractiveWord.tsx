import React, { useState, useRef } from 'react';
import { getWordDetails } from '../../services/geminiService';
import type { WordDetails } from '../../types';

interface InteractiveWordProps {
  word: string;
}

const InteractiveWord: React.FC<InteractiveWordProps> = ({ word }) => {
  const [details, setDetails] = useState<WordDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [show, setShow] = useState(false);
  const fetchFired = useRef(false);

  const handleMouseEnter = () => {
    setShow(true);
    if (!details && !isLoading && !fetchFired.current) {
      fetchFired.current = true;
      setIsLoading(true);
      setError(null);
      getWordDetails(word)
        .then(data => {
          if (data.pronunciation && data.translation) {
            setDetails(data);
          }
        })
        .catch(() => setError('Không thể tra cứu.'))
        .finally(() => setIsLoading(false));
    }
  };

  const handleMouseLeave = () => {
    setShow(false);
  };

  return (
    <span 
      className="relative inline-block cursor-pointer underline decoration-dotted decoration-indigo-400/50 hover:decoration-indigo-400" 
      onMouseEnter={handleMouseEnter} 
      onMouseLeave={handleMouseLeave}
    >
      {word}
      {show && (fetchFired.current) && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-slate-800 text-white text-sm rounded-lg shadow-lg p-3 z-20 pointer-events-none animate-fade-in-up-sm">
          {isLoading && <p className="text-slate-300">Đang tra cứu...</p>}
          {error && <p className="text-red-400">{error}</p>}
          {details && (
            <>
              <p className="font-bold font-mono text-indigo-300">/{details.pronunciation}/</p>
              <p className="mt-1">{details.translation}</p>
            </>
          )}
        </div>
      )}
      <style>{`
        @keyframes fade-in-up-sm {
          from { opacity: 0; transform: translate(-50%, 5px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        .animate-fade-in-up-sm {
          animation: fade-in-up-sm 0.2s ease-out forwards;
        }
      `}</style>
    </span>
  );
};

export default InteractiveWord;