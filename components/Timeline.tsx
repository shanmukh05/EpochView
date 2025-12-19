import React from 'react';
import { HistoricalEra } from '../types';

interface TimelineProps {
  eras: HistoricalEra[];
  currentIndex: number;
  onSelectEra: (index: number) => void;
}

const Timeline: React.FC<TimelineProps> = ({ eras, currentIndex, onSelectEra }) => {
  return (
    <div className="w-full bg-[#1a1614]/90 backdrop-blur-md border-b border-[#443c38] py-5 sticky top-0 z-40 shadow-lg">
      <div className="flex overflow-x-auto hide-scrollbar px-4 space-x-8 items-center justify-center max-w-7xl mx-auto">
        {eras.map((era, index) => {
          const isActive = index === currentIndex;
          return (
            <button
              key={index}
              onClick={() => onSelectEra(index)}
              className={`flex flex-col items-center min-w-[140px] transition-all duration-300 group relative ${
                isActive ? 'scale-105 opacity-100' : 'opacity-50 hover:opacity-80'
              }`}
            >
              {/* Connector Line (Virtual) */}
              <div className="absolute top-[5px] w-full h-[2px] bg-[#443c38] -z-10 hidden md:block"></div>
              
              <div className={`h-3 w-3 rounded-full mb-3 border-2 transition-colors duration-300 z-10 ${
                isActive 
                  ? 'bg-[#d4b483] border-[#d4b483] shadow-[0_0_10px_rgba(212,180,131,0.5)]' 
                  : 'bg-[#1a1614] border-[#5c5552] group-hover:border-[#8b7355]'
              }`} />
              
              <span className={`text-sm font-bold font-display tracking-wider ${
                isActive ? 'text-[#d4b483]' : 'text-[#8b7355]'
              }`}>
                {era.yearRange}
              </span>
              <span className="text-xs text-[#a89f91] uppercase tracking-widest mt-1 font-serif">
                {era.eraName}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Timeline;