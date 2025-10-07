import React from 'react';
import LessonCard from './LessonCard';
// fix: Changed import to be a value import since ModuleType enum is used as a value.
import { ModuleType } from '../types';

interface DashboardProps {
  onSelectModule: (module: ModuleType) => void;
}

const modules = [
  {
    title: 'Tra cứu từ vựng',
    description: 'Tra cứu nhanh từ điển Anh-Việt, xem ví dụ, từ đồng nghĩa và trái nghĩa.',
    icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
    ),
    module: ModuleType.LOOKUP,
  },
  {
    title: 'Xây dựng từ vựng',
    description: 'Học từ vựng chuyên ngành và giao tiếp hàng ngày qua các chủ đề.',
    icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
        </svg>
    ),
    module: ModuleType.VOCABULARY,
  },
  {
    title: 'Ôn tập ngữ pháp',
    description: 'Giải thích các chủ điểm ngữ pháp cốt lõi một cách đơn giản, dễ hiểu.',
    icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
        </svg>
    ),
    module: ModuleType.GRAMMAR,
  },
  {
    title: 'Luyện nghe',
    description: 'Nghe các đoạn hội thoại ngắn trong môi trường công sở và trả lời câu hỏi.',
    icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
        </svg>
    ),
    module: ModuleType.LISTENING,
  },
  {
    title: 'Luyện nói',
    description: 'Thực hành giao tiếp với AI qua các tình huống giả lập thực tế.',
    icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.76 9.76 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
        </svg>
    ),
    module: ModuleType.SPEAKING,
  },
  {
    title: 'Luyện Phát Âm (IPA)',
    description: 'Học và luyện tập 44 âm cơ bản trong bảng phiên âm quốc tế.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
      </svg>
    ),
    module: ModuleType.PRONUNCIATION,
  },
];

const Dashboard: React.FC<DashboardProps> = ({ onSelectModule }) => {
  return (
    <div>
      <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Chào mừng bạn trở lại!</h2>
      <p className="mt-4 text-lg text-slate-600">
        Hãy chọn một kỹ năng để bắt đầu buổi học hôm nay.
      </p>
      <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((mod) => (
          <LessonCard
            key={mod.module}
            title={mod.title}
            description={mod.description}
            icon={mod.icon}
            module={mod.module}
            onSelect={onSelectModule}
          />
        ))}
      </div>
    </div>
  );
};

export default Dashboard;