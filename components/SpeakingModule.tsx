import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createSpeakingChat, sendChatMessage, transcribeAndEvaluateSpeaking } from '../services/geminiService';
import type { Chat } from '@google/genai';
import type { ChatMessage } from '../types';
import BackButton from './common/BackButton';
import InteractiveText from './common/InteractiveText';
import Spinner from './common/Spinner';

interface SpeakingModuleProps {
  onBack: () => void;
}

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64data = reader.result as string;
      resolve(base64data.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};


const SpeakingModule: React.FC<SpeakingModuleProps> = ({ onBack }) => {
  const [mode, setMode] = useState<'topic_selection' | 'chatting'>('topic_selection');
  const [conversationTopic, setConversationTopic] = useState<string>('');
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isProcessingAudio, setIsProcessingAudio] = useState<boolean>(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const [isSpeakingConversation, setIsSpeakingConversation] = useState(false);
  const [highlightedMessage, setHighlightedMessage] = useState<{ messageIndex: number; wordIndex: number } | null>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, highlightedMessage]);
  
  // Cleanup speech synthesis on unmount
  useEffect(() => {
      return () => {
          window.speechSynthesis.cancel();
      }
  }, []);

  const handleStartConversation = useCallback(async () => {
    if (!conversationTopic.trim()) {
      setError('Vui lòng nhập chủ đề hội thoại.');
      return;
    }
    setLoading(true);
    setError(null);
    setMessages([]);

    try {
      const newChat = createSpeakingChat(conversationTopic);
      setChat(newChat);
      const initialResponse = await sendChatMessage(newChat, "Hello, please start the conversation.");
      
      setMessages([{ sender: 'model', text: initialResponse.text }]);
      setMode('chatting');

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [conversationTopic]);

  const handleSendMessage = useCallback(async () => {
    if (!userInput.trim() || !chat || loading || isListening || isProcessingAudio) return;
    
    const newUserMessage: ChatMessage = { sender: 'user', text: userInput };
    setMessages(prev => [...prev, newUserMessage]);
    setUserInput('');
    setLoading(true);
    setError(null);

    try {
      const response = await sendChatMessage(chat, userInput);
      const modelMessage: ChatMessage = { sender: 'model', text: response.text };
      setMessages(prev => [...prev, modelMessage]);
    } catch (err: any) {
      setError(err.message);
      const errorMessage: ChatMessage = { sender: 'model', text: "Sorry, I encountered an error. Please try again." };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  }, [userInput, chat, loading, isListening, isProcessingAudio]);

  const handleMicClick = async () => {
    if (loading || isProcessingAudio) return;

    if (isListening) {
      mediaRecorderRef.current?.stop();
      setIsListening(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        audioChunksRef.current = [];

        mediaRecorderRef.current.ondataavailable = (event) => {
          audioChunksRef.current.push(event.data);
        };

        mediaRecorderRef.current.onstop = async () => {
          setIsProcessingAudio(true);
          setError(null);
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          
          try {
            const base64Audio = await blobToBase64(audioBlob);
            const { transcription, feedback } = await transcribeAndEvaluateSpeaking(base64Audio);
            
            if (transcription && chat) {
              const newUserMessage: ChatMessage = { sender: 'user', text: transcription, feedback };
              setMessages(prev => [...prev, newUserMessage]);
              
              setLoading(true);
              const response = await sendChatMessage(chat, transcription);
              const modelMessage: ChatMessage = { sender: 'model', text: response.text };
              setMessages(prev => [...prev, modelMessage]);
            } else {
              const infoMessage: ChatMessage = { sender: 'model', text: feedback };
              setMessages(prev => [...prev, infoMessage]);
            }
          } catch (err: any) {
            setError(err.message);
          } finally {
            setIsProcessingAudio(false);
            setLoading(false);
            stream.getTracks().forEach(track => track.stop());
          }
        };

        mediaRecorderRef.current.start();
        setIsListening(true);
        setUserInput('');
      } catch (err) {
        console.error("Microphone access error:", err);
        setError("Không thể truy cập micro. Vui lòng cấp quyền và thử lại.");
      }
    }
  };

  const handlePlayConversation = () => {
    if (isSpeakingConversation) {
        window.speechSynthesis.cancel();
        setIsSpeakingConversation(false);
        setHighlightedMessage(null);
        return;
    }

    const modelMessages = messages
        .map((msg, index) => ({ ...msg, originalIndex: index }))
        .filter(msg => msg.sender === 'model');
    
    if (modelMessages.length === 0) return;

    let currentMessageIndex = 0;

    const playNextMessage = () => {
        if (currentMessageIndex >= modelMessages.length) {
            setIsSpeakingConversation(false);
            setHighlightedMessage(null);
            return;
        }

        const message = modelMessages[currentMessageIndex];
        const utterance = new SpeechSynthesisUtterance(message.text);
        utterance.lang = 'en-US';

        utterance.onboundary = (event) => {
            const words = message.text.split(/(\s+)/);
            let charCount = 0;
            let wordIndex = -1;
            for (let i = 0; i < words.length; i++) {
                charCount += words[i].length;
                if (charCount > event.charIndex) {
                    wordIndex = i;
                    break;
                }
            }
            setHighlightedMessage({ messageIndex: message.originalIndex, wordIndex: wordIndex });
        };

        utterance.onend = () => {
            setHighlightedMessage(null);
            currentMessageIndex++;
            playNextMessage();
        };
        
        utterance.onerror = () => {
            console.error("SpeechSynthesis Error");
            setIsSpeakingConversation(false);
            setHighlightedMessage(null);
        }

        window.speechSynthesis.speak(utterance);
    };

    setIsSpeakingConversation(true);
    playNextMessage();
  };

  const handleLearnAgain = () => {
    handleStartConversation();
  };
  
  const handleNewLesson = () => {
      setMode('topic_selection');
      setConversationTopic('');
      setMessages([]);
      setChat(null);
      setError(null);
      window.speechSynthesis.cancel();
      setIsSpeakingConversation(false);
      setHighlightedMessage(null);
  }

  const renderTopicSelection = () => (
    <div>
        <BackButton onClick={onBack} />
        <div className="text-center mt-4">
          <h2 className="text-2xl font-bold text-slate-900">Luyện Nói</h2>
          <p className="mt-2 text-slate-600">Nhập chủ đề bạn muốn thực hành hội thoại (bằng Tiếng Việt hoặc Tiếng Anh).</p>
          <div className="mt-8 max-w-lg mx-auto">
              <input
                  type="text"
                  value={conversationTopic}
                  onChange={(e) => setConversationTopic(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleStartConversation()}
                  placeholder="Ví dụ: Thảo luận về hiệu suất công việc..."
                  className="w-full px-4 py-3 text-slate-900 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <button
                  onClick={handleStartConversation}
                  disabled={loading || !conversationTopic.trim()}
                  className="mt-4 w-full px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-sm hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed transition-colors"
              >
                  {loading ? <Spinner /> : 'Bắt đầu học'}
              </button>
              {error && <p className="mt-4 text-red-600">{error}</p>}
          </div>
      </div>
    </div>
  );

  const renderChat = () => (
    <div className="flex flex-col h-[calc(100vh-120px)] max-h-[700px]">
      <div className="flex-shrink-0 flex justify-between items-start">
        <div>
            <BackButton onClick={onBack} />
            <h2 className="text-2xl font-bold text-slate-900">Luyện Nói: <span className="text-indigo-600">{conversationTopic}</span></h2>
            <p className="mt-2 text-slate-600">Thực hành hội thoại với trợ lý AI.</p>
        </div>
        <button 
            onClick={handlePlayConversation}
            disabled={messages.filter(m=>m.sender==='model').length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white font-semibold rounded-md shadow-sm hover:bg-sky-700 transition-colors disabled:opacity-50"
        >
           {isSpeakingConversation ? (
             <>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M5.5 4A1.5 1.5 0 004 5.5v9A1.5 1.5 0 005.5 16h9a1.5 1.5 0 001.5-1.5v-9A1.5 1.5 0 0014.5 4h-9z" /></svg>
              Dừng
             </>
           ) : (
             <>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" /></svg>
              <span>Nghe hội thoại</span>
             </>
           )}
        </button>
      </div>

      <div ref={chatContainerRef} className="flex-grow overflow-y-auto p-4 bg-slate-100/70 rounded-lg my-4 scroll-smooth">
        <div className="space-y-4">
          {messages.map((msg, index) => (
            <div key={index} className={`flex items-start gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.sender === 'model' && (
                <div className="w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M15.965 4.366a.75.75 0 01.288 1.026l-2.002 4.003a.75.75 0 00.375.96l2.003 1.001a.75.75 0 01-.223 1.348l-4.002 1.001a.75.75 0 00-.63.468l-1.002 3.004a.75.75 0 01-1.382 0l-1.002-3.004a.75.75 0 00-.63-.468l-4.002-1.001a.75.75 0 01-.223-1.348l2.003-1.001a.75.75 0 00.375-.96l-2.002-4.003a.75.75 0 011.314-.658L8.75 6.432l2.25-4.5a.75.75 0 011.332.664l-1.34 3.752 3.973 1.986.9-1.8a.75.75 0 011.05-.27z" clipRule="evenodd" /></svg>
                </div>
              )}
              <div className={`max-w-md p-3 rounded-lg ${msg.sender === 'user' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-800 border border-slate-200'}`}>
                {msg.sender === 'model' ? (
                  <InteractiveText text={msg.text} highlightIndex={highlightedMessage?.messageIndex === index ? highlightedMessage.wordIndex : -1} />
                ) : (
                  <p>{msg.text}</p>
                )}
                {msg.feedback && <p className="mt-2 text-xs italic border-t border-indigo-400 pt-2">{msg.feedback}</p>}
              </div>
            </div>
          ))}
          {loading && messages.length > 0 && messages[messages.length - 1]?.sender === 'user' && (
            <div className="flex items-start gap-3 justify-start">
               <div className="w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M15.965 4.366a.75.75 0 01.288 1.026l-2.002 4.003a.75.75 0 00.375.96l2.003 1.001a.75.75 0 01-.223 1.348l-4.002 1.001a.75.75 0 00-.63.468l-1.002 3.004a.75.75 0 01-1.382 0l-1.002-3.004a.75.75 0 00-.63-.468l-4.002-1.001a.75.75 0 01-.223-1.348l2.003-1.001a.75.75 0 00.375-.96l-2.002-4.003a.75.75 0 011.314-.658L8.75 6.432l2.25-4.5a.75.75 0 011.332.664l-1.34 3.752 3.973 1.986.9-1.8a.75.75 0 011.05-.27z" clipRule="evenodd" /></svg>
                </div>
                <div className="max-w-md p-3 rounded-lg bg-white text-slate-800 border border-slate-200">
                   <Spinner />
                </div>
            </div>
          )}
        </div>
      </div>
       {messages.length > 2 && !loading && (
        <div className="mt-8 pt-6 border-t border-slate-200 flex flex-col sm:flex-row justify-center gap-4">
          <button onClick={handleLearnAgain} className="px-6 py-2 bg-white text-indigo-700 font-semibold rounded-md shadow-sm border border-indigo-200 hover:bg-indigo-50 transition-colors">
            Học lại
          </button>
          <button onClick={handleNewLesson} className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-md shadow-sm hover:bg-indigo-700 transition-colors">
            Học chủ đề mới
          </button>
        </div>
      )}

      <div className="flex-shrink-0 mt-auto pt-4">
        <div className="relative">
          <textarea
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
            placeholder={isListening ? "Đang lắng nghe..." : "Nhập tin nhắn hoặc dùng micro..."}
            className="w-full px-4 py-3 pr-24 text-slate-900 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
            rows={1}
            disabled={loading || isListening || isProcessingAudio}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <button
                onClick={handleMicClick}
                disabled={loading || isProcessingAudio}
                className={`p-2 rounded-full transition-colors ${
                    isListening
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
                aria-label={isListening ? 'Dừng ghi âm' : 'Ghi âm giọng nói'}
            >
                {isProcessingAudio ? <Spinner/> : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                    </svg>
                )}
            </button>
            <button
                onClick={handleSendMessage}
                disabled={!userInput.trim() || loading || isListening || isProcessingAudio}
                className="p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:bg-indigo-300 transition-colors"
                aria-label="Gửi tin nhắn"
            >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6">
                  <path d="M3.105 4.165a.75.75 0 011.06-.02l14.123 7.061a.75.75 0 010 1.348L4.165 19.866a.75.75 0 01-1.04-1.128L15.938 11.5 3.125 5.293a.75.75 0 01-.02-1.128z" />
                </svg>
            </button>
          </div>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>
      <style>{`
          .scroll-smooth { scroll-behavior: smooth; }
      `}</style>
    </div>
  );

  return (
    <div>
        {mode === 'topic_selection' ? renderTopicSelection() : renderChat()}
    </div>
  );
};

export default SpeakingModule;
