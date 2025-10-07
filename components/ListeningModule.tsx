import React, { useState, useCallback, useEffect } from 'react';
import { generateListeningExercise } from '../services/geminiService';
import type { ListeningExercise } from '../types';
import Spinner from './common/Spinner';
import BackButton from './common/BackButton';
import InteractiveText from './common/InteractiveText';

interface ListeningModuleProps {
  onBack: () => void;
}

const ListeningModule: React.FC<ListeningModuleProps> = ({ onBack }) => {
  const [exercise, setExercise] = useState<ListeningExercise | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showAnswers, setShowAnswers] = useState<boolean>(false);
  const [userAnswers, setUserAnswers] = useState<string[]>([]);
  const [topic, setTopic] = useState<string>('');
  const [showTranslation, setShowTranslation] = useState<boolean>(false);
  const [isPlayingEnglish, setIsPlayingEnglish] = useState<boolean>(false);
  const [highlightedWord, setHighlightedWord] = useState<{ lineIndex: number; wordIndex: number } | null>(null);


  const loadExercise = useCallback(async () => {
    window.speechSynthesis.cancel();
    setIsPlayingEnglish(false);
    setHighlightedWord(null);
    setShowTranslation(false);
    setExercise(null);
    setShowAnswers(false);
    setUserAnswers([]);
    setError(null);

    if (!topic.trim()) {
      return;
    }

    setLoading(true);
    try {
      const result = await generateListeningExercise(topic);
      setExercise(result);
      setUserAnswers(new Array(result.questions.length).fill(''));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [topic]);

  useEffect(() => {
    // On unmount, cancel any speech
    return () => {
        window.speechSynthesis.cancel();
    }
  }, []);

  const handleAnswerChange = (questionIndex: number, answer: string) => {
    const newAnswers = [...userAnswers];
    newAnswers[questionIndex] = answer;
    setUserAnswers(newAnswers);
  };
  
  const getOptionClass = (questionIndex: number, option: string) => {
    if (!showAnswers) return 'border-slate-300 hover:border-indigo-500';
    const correctAnswer = exercise?.questions[questionIndex].answer;
    if (option === correctAnswer) return 'border-green-500 bg-green-50';
    if (userAnswers[questionIndex] === option) return 'border-red-500 bg-red-50';
    return 'border-slate-300';
  }

  const handleSpeak = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // Stop any currently playing speech
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    } else {
      alert('Rất tiếc, trình duyệt của bạn không hỗ trợ tính năng phát âm.');
    }
  };

  const handlePlayEnglishDialogue = () => {
    if (!exercise) return;

    if (isPlayingEnglish) {
      window.speechSynthesis.cancel();
      setIsPlayingEnglish(false);
      setHighlightedWord(null);
      return;
    }

    window.speechSynthesis.cancel();
    setHighlightedWord(null);

    let currentLineIndex = 0;

    const playLine = () => {
      if (currentLineIndex >= exercise.dialogue.length) {
        setIsPlayingEnglish(false);
        setHighlightedWord(null);
        return;
      }
      
      const currentLineData = exercise.dialogue[currentLineIndex];
      const textToSpeak = `${currentLineData.speaker}: ${currentLineData.line}`;
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = 'en-US';
      
      const prefixLength = `${currentLineData.speaker}: `.length;

      utterance.onboundary = (event) => {
        const adjustedCharIndex = event.charIndex - prefixLength;

        if (adjustedCharIndex < 0) {
          return;
        }

        const words = currentLineData.line.split(/(\s+)/);
        let charCount = 0;
        let wordIndex = -1;
        for (let i = 0; i < words.length; i++) {
          charCount += words[i].length;
          if (charCount > adjustedCharIndex) {
            wordIndex = i;
            break;
          }
        }
        
        if (wordIndex !== -1) {
          setHighlightedWord({ lineIndex: currentLineIndex, wordIndex: wordIndex });
        }
      };

      utterance.onend = () => {
        currentLineIndex++;
        playLine();
      };

      utterance.onerror = (e) => {
        console.error("Speech synthesis error:", e);
        setIsPlayingEnglish(false);
        setHighlightedWord(null);
      };

      window.speechSynthesis.speak(utterance);
    };

    setIsPlayingEnglish(true);
    playLine();
  };


  return (
    <div>
      <BackButton onClick={onBack} />
      <h2 className="text-2xl font-bold text-slate-900">Luyện Nghe</h2>
      <p className="mt-2 text-slate-600">Nhập chủ đề để tạo bài nghe, sau đó nghe đoạn hội thoại và trả lời các câu hỏi bên dưới.</p>
      
      <div className="mt-6 flex flex-col sm:flex-row gap-2">
        <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Nhập chủ đề bài nghe, ví dụ: Phỏng vấn xin việc"
            className="flex-grow w-full px-4 py-2 text-slate-900 bg-white border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            disabled={loading}
        />
        <button
          onClick={loadExercise}
          disabled={loading || !topic.trim()}
          className="w-full sm:w-auto px-4 py-2 bg-indigo-600 text-white font-semibold rounded-md shadow-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Đang tạo...' : 'Tạo bài nghe'}
        </button>
      </div>

      {error && <p className="mt-4 text-red-600">{error}</p>}
      {loading && <Spinner />}

      {exercise && (
        <div className="mt-4 animate-fade-in">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-slate-800">Hội thoại:</h3>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handlePlayEnglishDialogue}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-semibold rounded-md shadow-sm hover:bg-indigo-700 transition-colors"
                        aria-label={isPlayingEnglish ? "Dừng nghe" : "Nghe hội thoại"}
                    >
                        {isPlayingEnglish ? (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M5.5 4A1.5 1.5 0 004 5.5v9A1.5 1.5 0 005.5 16h9a1.5 1.5 0 001.5-1.5v-9A1.5 1.5 0 0014.5 4h-9z" /></svg>
                                <span>Dừng</span>
                            </>
                        ) : (
                            <>
                               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                               </svg>
                                <span>Nghe hội thoại</span>
                            </>
                        )}
                    </button>
                    <button
                        onClick={() => setShowTranslation(prev => !prev)}
                        className="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white font-semibold rounded-md shadow-sm hover:bg-sky-700 transition-colors"
                        aria-label={showTranslation ? "Xem bản gốc" : "Xem bản dịch"}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                           <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.432 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                           <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>{showTranslation ? 'Xem bản gốc' : 'Xem bản dịch'}</span>
                    </button>
                </div>
            </div>
            <div className="space-y-4">
              {exercise.dialogue.map((line, index) => (
                <div key={index} className="flex items-start gap-3 text-slate-700">
                  <p>
                    <strong className="font-semibold text-slate-900">{line.speaker}:</strong> {showTranslation ? line.translation : <InteractiveText text={line.line} highlightIndex={highlightedWord?.lineIndex === index ? highlightedWord.wordIndex : -1} />}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-4 text-slate-800">Câu hỏi:</h3>
            <div className="space-y-6">
              {exercise.questions.map((q, qIndex) => (
                <div key={qIndex} className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                  <div className="flex items-start gap-3">
                     <button
                        onClick={() => handleSpeak(q.question)}
                        className="text-slate-400 hover:text-indigo-600 transition-colors flex-shrink-0 mt-1 p-1 rounded-full hover:bg-slate-100"
                        aria-label={`Nghe câu hỏi ${qIndex + 1}`}
                     >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                        </svg>
                     </button>
                    <p className="font-semibold text-slate-800">{qIndex + 1}. <InteractiveText text={q.question} /></p>
                  </div>

                  <div className="mt-4 space-y-3 pl-10">
                    {q.options.map((option, oIndex) => (
                      <label key={oIndex} className={`flex items-center p-3 rounded-md border-2 transition-all cursor-pointer ${getOptionClass(qIndex, option)}`}>
                        <input
                          type="radio"
                          name={`question-${qIndex}`}
                          value={option}
                          checked={userAnswers[qIndex] === option}
                          onChange={() => handleAnswerChange(qIndex, option)}
                          disabled={showAnswers}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 flex-shrink-0"
                        />
                        <span className="ml-3 text-slate-700 flex-grow"><InteractiveText text={option} /></span>
                        <button
                          onClick={(e) => { e.preventDefault(); handleSpeak(option); }}
                          className="ml-3 text-slate-400 hover:text-indigo-600 transition-colors flex-shrink-0 p-1 rounded-full hover:bg-slate-100"
                          aria-label={`Nghe lựa chọn ${option}`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                          </svg>
                        </button>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-8 text-center">
            <button
                onClick={() => setShowAnswers(!showAnswers)}
                className="px-8 py-3 bg-indigo-600 text-white font-semibold rounded-md shadow-sm hover:bg-indigo-700 disabled:bg-indigo-300 transition-colors"
            >
                {showAnswers ? 'Ẩn đáp án' : 'Kiểm tra đáp án'}
            </button>
          </div>
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

export default ListeningModule;