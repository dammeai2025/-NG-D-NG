import React, { useState, useCallback, useEffect, useRef } from 'react';
import { explainGrammar, getWordDetails } from '../services/geminiService';
import Spinner from './common/Spinner';
import BackButton from './common/BackButton';
import { marked } from 'marked';
import type { WordDetails } from '../types';

interface GrammarModuleProps {
  onBack: () => void;
}

interface TooltipState {
  visible: boolean;
  content: React.ReactNode;
  x: number;
  y: number;
}

const grammarTopics = [
  "Thì Hiện tại đơn",
  "Thì Hiện tại tiếp diễn",
  "Thì Hiện tại hoàn thành",
  "Thì Quá khứ đơn",
  "Thì Tương lai đơn",
  "Giới từ chỉ thời gian (in, on, at)",
];

const GrammarModule: React.FC<GrammarModuleProps> = ({ onBack }) => {
  const [topic, setTopic] = useState<string>(grammarTopics[0]);
  const [explanation, setExplanation] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, content: null, x: 0, y: 0 });
  const [isSpeaking, setIsSpeaking] = useState(false);

  const contentRef = useRef<HTMLDivElement>(null);
  const listenersRef = useRef<{ el: HTMLElement; type: string; handler: EventListener }[]>([]);
  const hoverWordRef = useRef<string | null>(null);
  const leaveTimerRef = useRef<number | null>(null);


  const handleGenerate = useCallback(async (selectedTopic: string) => {
    setLoading(true);
    setError(null);
    setExplanation('');
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    try {
      const result = await explainGrammar(selectedTopic);
      const htmlResult = await marked.parse(result);
      setExplanation(htmlResult);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    handleGenerate(topic);
    return () => {
        window.speechSynthesis.cancel();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTopicClick = (newTopic: string) => {
    if (loading) return;
    setTopic(newTopic);
    handleGenerate(newTopic);
  };
  
  useEffect(() => {
    const container = contentRef.current;
    if (!container || !explanation) return;

    const cleanup = () => {
      listenersRef.current.forEach(({ el, type, handler }) => el.removeEventListener(type, handler));
      listenersRef.current = [];
      if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
    };
    cleanup();

    const handleMouseLeave = () => {
      leaveTimerRef.current = window.setTimeout(() => {
        setTooltip(prevState => ({ ...prevState, visible: false }));
      }, 100);
    };

    const handleMouseOver = (e: MouseEvent) => {
      if (leaveTimerRef.current) {
        clearTimeout(leaveTimerRef.current);
        leaveTimerRef.current = null;
      }

      const target = e.target as HTMLElement;
      const word = target.textContent?.trim().replace(/[^a-zA-Z'’]/g, '') || '';
      if (!word || word.length <= 2) return;

      hoverWordRef.current = word;
      setTooltip({ visible: true, content: 'Đang tra cứu...', x: e.pageX, y: e.pageY });
      
      getWordDetails(word)
        .then(details => {
          if (hoverWordRef.current === word) {
            if (details.pronunciation && details.translation) {
              const content = (
                <>
                  <p className="font-bold font-mono text-indigo-300">/{details.pronunciation}/</p>
                  <p className="mt-1">{details.translation}</p>
                </>
              );
              setTooltip(prev => ({ ...prev, visible: true, content }));
            } else {
              setTooltip(prev => ({ ...prev, visible: false }));
            }
          }
        })
        .catch(() => {
          if (hoverWordRef.current === word) {
            setTooltip(prev => ({ ...prev, visible: false }));
          }
        });
    };
    
    const handleMouseMove = (e: MouseEvent) => {
       setTooltip(prev => ({ ...prev, x: e.pageX, y: e.pageY }));
    }

    const allTextNodes: Text[] = [];
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    let node;
    while(node = walker.nextNode()) {
        allTextNodes.push(node as Text);
    }

    allTextNodes.forEach(textNode => {
      if (!/[a-zA-Z]/.test(textNode.textContent || '') || (textNode.parentElement?.closest('a,button,code,pre,h1,h2,h3,h4'))) return;
      
      const fragment = document.createDocumentFragment();
      const parts = textNode.textContent?.split(/([a-zA-Z'’]+)/) || [];

      parts.forEach(part => {
        if (/^[a-zA-Z'’]+$/.test(part) && part.length > 2) {
          const span = document.createElement('span');
          span.textContent = part;
          span.className = 'interactive-word-grammar';
          
          const mouseOverListener = handleMouseOver as EventListener;
          const mouseMoveListener = handleMouseMove as EventListener;
          const mouseLeaveListener = handleMouseLeave as EventListener;
          
          span.addEventListener('mouseover', mouseOverListener);
          span.addEventListener('mousemove', mouseMoveListener);
          span.addEventListener('mouseleave', mouseLeaveListener);
          
          listenersRef.current.push({ el: span, type: 'mouseover', handler: mouseOverListener });
          listenersRef.current.push({ el: span, type: 'mousemove', handler: mouseMoveListener });
          listenersRef.current.push({ el: span, type: 'mouseleave', handler: mouseLeaveListener });
          
          fragment.appendChild(span);
        } else {
          fragment.appendChild(document.createTextNode(part));
        }
      });
      textNode.parentNode?.replaceChild(fragment, textNode);
    });

    return cleanup;
  }, [explanation]);

  const handleSpeak = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    if (explanation && 'speechSynthesis' in window) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = explanation;
      const textToSpeak = tempDiv.textContent || tempDiv.innerText || '';
      
      if (!textToSpeak.trim()) return;

      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = 'vi-VN';
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => {
        console.error("Speech synthesis error");
        setIsSpeaking(false);
      };
      
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    }
  };

  const handleNextLesson = () => {
      const currentIndex = grammarTopics.indexOf(topic);
      const nextIndex = (currentIndex + 1) % grammarTopics.length;
      const nextTopic = grammarTopics[nextIndex];
      handleTopicClick(nextTopic);
  };


  return (
    <div>
      <BackButton onClick={onBack} />
      <h2 className="text-2xl font-bold text-slate-900">Ôn tập Ngữ pháp</h2>
      <p className="mt-2 text-slate-600">Chọn một chủ điểm ngữ pháp để xem giải thích chi tiết.</p>
      
      <div className="mt-6 flex flex-wrap gap-2">
        {grammarTopics.map((t) => (
          <button
            key={t}
            onClick={() => handleTopicClick(t)}
            disabled={loading}
            className={`px-4 py-2 text-sm font-semibold rounded-full border transition-colors disabled:opacity-50 ${
              topic === t
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {error && <p className="mt-4 text-red-600">{error}</p>}
      
      {loading && <Spinner />}

      {explanation && !loading && (
        <div className="mt-8 bg-white p-6 rounded-lg shadow-sm border border-slate-200">
           <div className="flex justify-end mb-4">
              <button
                onClick={handleSpeak}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-600 font-semibold rounded-md shadow-sm hover:bg-slate-200 transition-colors text-sm"
                aria-label={isSpeaking ? "Dừng đọc" : "Đọc nội dung bài học"}
              >
                  {isSpeaking ? (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M5.5 4A1.5 1.5 0 004 5.5v9A1.5 1.5 0 005.5 16h9a1.5 1.5 0 001.5-1.5v-9A1.5 1.5 0 0014.5 4h-9z" /></svg>
                      <span>Dừng đọc</span>
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                      </svg>
                      <span>Đọc bài</span>
                    </>
                  )}
              </button>
           </div>
           <div
              ref={contentRef}
              className="prose prose-indigo max-w-none"
              dangerouslySetInnerHTML={{ __html: explanation }}
            />
        </div>
      )}
      
      {explanation && !loading && (
        <div className="mt-8 pt-6 border-t border-slate-200 flex flex-col sm:flex-row justify-center gap-4">
          <button 
            onClick={() => handleGenerate(topic)} 
            className="px-6 py-2 bg-white text-indigo-700 font-semibold rounded-md shadow-sm border border-indigo-200 hover:bg-indigo-50 transition-colors"
          >
            Học lại
          </button>
          <button 
            onClick={() => alert('Tính năng sẽ sớm được cập nhật!')}
            className="px-6 py-2 bg-white text-slate-700 font-semibold rounded-md shadow-sm border border-slate-300 hover:bg-slate-100 transition-colors"
          >
            Lưu bài đang học
          </button>
          <button 
            onClick={handleNextLesson}
            className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-md shadow-sm hover:bg-indigo-700 transition-colors"
          >
            Học bài mới
          </button>
        </div>
      )}

      {tooltip.visible && (
        <div 
          className="fixed top-0 left-0 bg-slate-800 text-white text-sm rounded-lg shadow-lg p-3 z-50 pointer-events-none"
          style={{ transform: `translate(calc(${tooltip.x}px - 50%), calc(${tooltip.y}px - 100% - 10px))` }}
        >
          {tooltip.content}
        </div>
      )}
      <style>{`
        .interactive-word-grammar {
          cursor: pointer;
          text-decoration: underline;
          text-decoration-style: dotted;
          text-decoration-color: rgba(99, 102, 241, 0.5);
          transition: text-decoration-color 0.2s;
        }
        .interactive-word-grammar:hover {
          text-decoration-color: rgba(99, 102, 241, 1);
        }
      `}</style>
    </div>
  );
};

export default GrammarModule;