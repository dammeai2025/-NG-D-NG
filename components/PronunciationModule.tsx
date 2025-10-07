
import React, { useState, useEffect, useRef } from 'react';
import BackButton from './common/BackButton';
import { ipaSoundsData } from '../data/ipaSounds';
import type { IPASound, PronunciationFeedback } from '../types';
import { evaluatePronunciation } from '../services/geminiService';
import Spinner from './common/Spinner';


interface PronunciationModuleProps {
  onBack: () => void;
}

const SoundCard: React.FC<IPASound & { onShowDetails: (sound: IPASound) => void; }> = 
  ({ symbol, examples, description, type, imageUrl, onShowDetails }) => {
  const handleSpeak = (text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  };
  
  return (
    <div 
      className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 text-center flex flex-col justify-between cursor-pointer hover:shadow-md hover:border-indigo-300 transition-all"
      onClick={() => onShowDetails({ symbol, examples, description, type, imageUrl })}
      role="button"
      aria-label={`Details for sound ${symbol}`}
    >
      <div 
        className="text-3xl font-bold text-indigo-600"
        title={`Xem chi tiết âm ${symbol}`}
      >
        {symbol}
      </div>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {examples.slice(0, 2).map((word, index) => (
          <div 
            key={index}
            className="text-sm text-slate-700 bg-slate-100 rounded-full px-3 py-1"
          >
            {word}
          </div>
        ))}
      </div>
    </div>
  );
};

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64data = reader.result as string;
      // remove the data type prefix 'data:audio/webm;base64,'
      resolve(base64data.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};


const PronunciationModule: React.FC<PronunciationModuleProps> = ({ onBack }) => {
  const [selectedSound, setSelectedSound] = useState<IPASound | null>(null);
  const [selectedWordForPractice, setSelectedWordForPractice] = useState<string | null>(null);
  
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedback, setFeedback] = useState<PronunciationFeedback | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);


  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeModal();
      }
    };
    if (selectedSound) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedSound]);

  const closeModal = () => {
      setSelectedSound(null);
      setSelectedWordForPractice(null);
      setFeedback(null);
      setIsListening(false);
      setIsProcessing(false);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
  }


  const handleSpeak = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    } else {
      alert('Rất tiếc, trình duyệt của bạn không hỗ trợ tính năng phát âm.');
    }
  };

  const handleMicClick = async () => {
    if (isProcessing) return;

    if (isListening) {
      mediaRecorderRef.current?.stop();
      setIsListening(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream);
        audioChunksRef.current = [];

        mediaRecorderRef.current.ondataavailable = (event) => {
          audioChunksRef.current.push(event.data);
        };

        mediaRecorderRef.current.onstop = async () => {
          setIsProcessing(true);
          setFeedback(null);
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          try {
              const base64Audio = await blobToBase64(audioBlob);
              if (selectedWordForPractice) {
                  const result = await evaluatePronunciation(selectedWordForPractice, base64Audio);
                  setFeedback(result);
              }
          } catch (error: any) {
              setFeedback({ type: 'incorrect', message: error.message || 'Đã xảy ra lỗi khi phân tích.' });
          } finally {
              setIsProcessing(false);
              // Clean up stream tracks
              stream.getTracks().forEach(track => track.stop());
          }
        };
        
        mediaRecorderRef.current.start();
        setIsListening(true);
        setFeedback(null);
      } catch (err) {
        console.error("Error accessing microphone:", err);
        setFeedback({ type: 'incorrect', message: 'Không thể truy cập micro. Vui lòng cấp quyền.' });
      }
    }
  };

  const handleSelectWord = (word: string) => {
    setSelectedWordForPractice(word);
    setFeedback(null);
  };

  const getFeedbackClass = (type: PronunciationFeedback['type']) => {
    switch (type) {
      case 'correct':
        return 'bg-green-100 text-green-800';
      case 'incorrect':
        return 'bg-red-100 text-red-800';
      case 'info':
      default:
        return 'bg-indigo-100 text-indigo-800';
    }
  };

  const vowels = ipaSoundsData.filter(sound => sound.type === 'vowel');
  const consonants = ipaSoundsData.filter(sound => sound.type === 'consonant');

  return (
    <div>
      <BackButton onClick={onBack} />
      <h2 className="text-2xl font-bold text-slate-900">Luyện Phát Âm - 44 Âm IPA</h2>
      <p className="mt-2 text-slate-600">Nhấp vào một ký hiệu IPA để xem hướng dẫn chi tiết và luyện tập.</p>

      <div className="mt-8">
        <h3 className="text-xl font-semibold text-slate-800 mb-4">Nguyên âm (Vowels)</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {vowels.map(sound => (
            <SoundCard key={sound.symbol} {...sound} onShowDetails={setSelectedSound} />
          ))}
        </div>
      </div>

      <div className="mt-10">
        <h3 className="text-xl font-semibold text-slate-800 mb-4">Phụ âm (Consonants)</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {consonants.map(sound => (
            <SoundCard key={sound.symbol} {...sound} onShowDetails={setSelectedSound} />
          ))}
        </div>
      </div>
      
      {selectedSound && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4" 
          onClick={closeModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="pronunciation-modal-title"
        >
          <div 
            className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg relative animate-fade-in-up flex flex-col max-h-[90vh]" 
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
            
            <div className="overflow-y-auto pr-4 -mr-4">
              <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
                <div className="flex-shrink-0 bg-slate-100 p-2 rounded-md border border-slate-200">
                  <img 
                    src={selectedSound.imageUrl} 
                    alt={`Sơ đồ khẩu hình miệng cho âm ${selectedSound.symbol}`}
                    className="w-40 h-40 object-contain"
                  />
                </div>
                <div className="flex-grow">
                  <div className="flex items-center justify-center md:justify-start gap-3">
                    <h3 id="pronunciation-modal-title" className="text-5xl font-bold text-indigo-600">{selectedSound.symbol}</h3>
                    <button
                      onClick={() => handleSpeak(selectedSound.examples[0])}
                      className="text-slate-500 hover:text-indigo-600 transition-colors p-2 rounded-full hover:bg-indigo-50"
                      aria-label={`Listen to the sound ${selectedSound.symbol}`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                      </svg>
                    </button>
                  </div>
                  <div className="mt-2 text-slate-700">
                    <p className="font-semibold text-slate-800">Cách phát âm:</p>
                    <p>{selectedSound.description}</p>
                  </div>
                </div>
              </div>

              <div className="mt-5 border-t border-slate-200 pt-4">
                <p className="font-semibold text-slate-800 mb-3 text-center">Chọn một từ để luyện tập:</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {selectedSound.examples.map((word, index) => (
                    <button 
                      key={index}
                      onClick={() => handleSelectWord(word)}
                      className={`text-base text-slate-700 bg-white border-2 rounded-full px-4 py-2 transition-all flex items-center gap-2 hover:border-indigo-400 ${selectedWordForPractice === word ? 'border-indigo-600 font-semibold' : 'border-slate-300'}`}
                    >
                      <span>{word}</span>
                      <svg onClick={(e) => { e.stopPropagation(); handleSpeak(word); }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-slate-500 hover:text-indigo-600">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                      </svg>
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="mt-4 text-center">
                 <button
                    onClick={handleMicClick}
                    disabled={!selectedWordForPractice || isProcessing}
                    className={`relative w-20 h-20 rounded-full transition-colors duration-300 flex items-center justify-center text-white shadow-lg disabled:bg-slate-300 disabled:cursor-not-allowed ${
                      isListening ? 'bg-red-500 hover:bg-red-600' : 'bg-indigo-600 hover:bg-indigo-700'
                    }`}
                    aria-label={isListening ? 'Dừng ghi âm' : 'Bắt đầu ghi âm'}
                  >
                  {isListening && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>}
                   <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                     <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                   </svg>
                 </button>
              </div>
              
              <div className="mt-4 min-h-[60px] flex items-center justify-center">
                {isProcessing ? (
                  <div className="flex flex-col items-center text-slate-600">
                    <Spinner />
                    <p>Đang phân tích...</p>
                  </div>
                ) : feedback ? (
                  <div className={`p-3 rounded-lg text-center ${getFeedbackClass(feedback.type)}`}>
                    {feedback.message}
                  </div>
                ) : selectedWordForPractice ? (
                   <p className="text-slate-500 text-center">Nhấn nút micro để bắt đầu phát âm từ "{selectedWordForPractice}".</p>
                ) : (
                  <p className="text-slate-500 text-center">Chọn một từ bên trên để bắt đầu.</p>
                )}
              </div>
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

export default PronunciationModule;