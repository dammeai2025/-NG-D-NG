import React from 'react';
import type { ModuleType } from '../types';

interface LessonCardProps {
  title: string;
  description: string;
  // fix: Changed JSX.Element to React.ReactNode to fix "Cannot find namespace 'JSX'" error.
  icon: React.ReactNode;
  module: ModuleType;
  onSelect: (module: ModuleType) => void;
}

const LessonCard: React.FC<LessonCardProps> = ({ title, description, icon, module, onSelect }) => {
  return (
    <button
      onClick={() => onSelect(module)}
      className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 border border-slate-200 flex flex-col text-left hover:scale-[1.03] hover:border-indigo-300 group"
    >
      <div className="flex-shrink-0">
        <div className="flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white">
          {icon}
        </div>
      </div>
      <div className="mt-4 flex-grow">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <p className="mt-2 text-base text-slate-500">{description}</p>
      </div>
      <div className="mt-6">
        <span
          className="text-sm font-semibold text-indigo-600 group-hover:text-indigo-500 transition-colors"
        >
          Bắt đầu học →
        </span>
      </div>
    </button>
  );
};

export default LessonCard;
