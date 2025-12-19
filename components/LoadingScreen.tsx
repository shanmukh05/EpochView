
import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingScreenProps {
  location: string;
  isExiting?: boolean;
  customStatus?: string;
}

const APP_LOGO = "https://i.ibb.co/GfMV5j1B/Logo.png";

const STATUS_MESSAGES = [
  "Triangulating geospatial coordinates...",
  "Accessing ChronoGlobe archives...",
  "Retrieving ancient topographical data...",
  "Reconstructing historical timelines...",
  "Identifying key historical figures...",
  "Synthesizing era visualizations...",
  "Finalizing temporal calibration..."
];

const LoadingScreen: React.FC<LoadingScreenProps> = ({ location, isExiting = false, customStatus }) => {
  const [progress, setProgress] = useState(0);
  const [statusIndex, setStatusIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger fade-in on mount
    setIsVisible(true);

    // Progress Bar Animation
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        // Random increment for organic feel
        return prev + Math.random() * 5; 
      });
    }, 150);

    // Status Text Cycling
    const statusInterval = setInterval(() => {
      setStatusIndex(prev => (prev + 1) % STATUS_MESSAGES.length);
    }, 800);

    return () => {
      clearInterval(progressInterval);
      clearInterval(statusInterval);
    };
  }, []);

  return (
    <div 
      className={`fixed inset-0 z-[60] flex items-center justify-center bg-black/30 backdrop-blur-sm text-[#e5e0d8] font-serif shadow-2xl transition-opacity duration-1000 ease-in-out ${isVisible && !isExiting ? 'opacity-100' : 'opacity-0'}`}
    >
      {/* Background Texture/Effects */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(circle, #5c5552 1px, transparent 1px)', backgroundSize: '30px 30px' }}>
      </div>
      {/* Reduced gradient opacity so map shows through better */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/40 pointer-events-none"></div>

      <div className="relative z-10 max-w-2xl w-full px-8 flex flex-col items-center text-center">
        
        {/* Logo and Title */}
        <div className="mb-10 opacity-90 flex flex-col items-center gap-3">
            <img src={APP_LOGO} alt="Logo" className="w-64 h-64 object-contain drop-shadow-2xl mb-2 opacity-90" />
            <span className="text-[10px] md:text-xs font-bold uppercase tracking-[0.5em] text-[#d4b483] text-shadow-sm">
                EpochView Temporal Engine
            </span>
            <div className="w-16 h-px bg-gradient-to-r from-transparent via-[#8b7355]/50 to-transparent"></div>
        </div>

        {/* Location Display */}
        <h1 className="text-5xl md:text-7xl font-display font-bold text-[#d4b483] mb-2 tracking-wide drop-shadow-xl shadow-black/50">
          {location}
        </h1>
        <div className="h-1 w-24 bg-[#8b7355] mb-12 opacity-80 shadow-lg"></div>

        {/* Loading Indicator */}
        <div className="w-full max-w-md relative mb-6">
          {/* Progress Bar Container */}
          <div className="h-1 w-full bg-[#2a2420]/60 overflow-hidden relative backdrop-blur-md rounded-full">
            <div 
              className="h-full bg-[#d4b483] transition-all duration-300 ease-out shadow-[0_0_15px_#d4b483]"
              style={{ width: `${Math.min(progress, 100)}%` }}
            ></div>
          </div>
          
          {/* Progress Percentage */}
          <div className="absolute -right-12 -top-3 text-xs font-mono text-[#d4b483] font-bold drop-shadow-md">
            {Math.round(progress)}%
          </div>
        </div>

        {/* Status Text */}
        <div className="h-8 flex items-center justify-center gap-3 text-[#e5e0d8] bg-black/40 px-4 py-1 rounded-full backdrop-blur-md border border-[#443c38]/30">
            <Loader2 size={16} className="animate-spin text-[#d4b483]" />
            <span className="text-sm italic tracking-wide">
              {customStatus || STATUS_MESSAGES[statusIndex]}
            </span>
        </div>

      </div>
    </div>
  );
};

export default LoadingScreen;
