import React from 'react';
import InteractiveWord from './InteractiveWord';

interface InteractiveTextProps {
  text: string;
  highlightIndex?: number;
}

const InteractiveText: React.FC<InteractiveTextProps> = ({ text, highlightIndex = -1 }) => {
  // Split by spaces to match highlight logic
  const parts = text.split(/(\s+)/);

  return (
    <>
      {parts.map((part, index) => {
        const highlightClass = index === highlightIndex ? 'bg-indigo-200/70 rounded' : '';
        // Further split a part by words to handle punctuation correctly for InteractiveWord
        const wordParts = part.split(/([a-zA-Z'’]+)/);
        
        return (
          <span key={index} className={highlightClass}>
            {wordParts.map((wp, i) => {
              if (/^[a-zA-Z'’]+$/.test(wp)) {
                if (wp.length <= 2 && !['go', 'do', 'be'].includes(wp.toLowerCase())) {
                  return <React.Fragment key={i}>{wp}</React.Fragment>;
                }
                return <InteractiveWord key={i} word={wp} />;
              }
              return <React.Fragment key={i}>{wp}</React.Fragment>;
            })}
          </span>
        );
      })}
    </>
  );
};

export default InteractiveText;
