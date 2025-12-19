
import React from 'react';
import { ChevronRight, ImageOff } from 'lucide-react';

interface CardProps {
  title: string;
  subtitle: string;
  imageUrl?: string;
  icon?: React.ReactNode;
  onClick: () => void;
}

const Card: React.FC<CardProps> = ({ title, subtitle, imageUrl, icon, onClick }) => {
  return (
    <div 
      onClick={onClick}
      className="min-w-[280px] w-[280px] h-[340px] bg-[#2a2420] hover:bg-[#352e2a] border border-[#443c38] hover:border-[#d4b483]/60 rounded-lg overflow-hidden cursor-pointer transition-all duration-300 flex flex-col group relative shadow-md hover:shadow-xl"
    >
      {/* Image Area */}
      <div className="h-[180px] w-full bg-[#151210] relative overflow-hidden border-b border-[#443c38]">
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt={title} 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 sepia-[0.2]"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
              (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
            }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-[#231e1b] text-[#5c5552]">
            <ImageOff size={32} />
          </div>
        )}
        {/* Fallback for error within image tag */}
        <div className="hidden absolute inset-0 flex items-center justify-center bg-[#231e1b] text-[#5c5552]">
             <ImageOff size={32} />
        </div>
        
        {/* Vignette Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#2a2420] via-transparent to-transparent opacity-40"></div>
      </div>

      {/* Content Area */}
      <div className="p-5 flex-1 flex flex-col justify-between relative">
        {/* Decorative corner */}
        <div className="absolute top-2 right-2 w-3 h-3 border-t border-r border-[#443c38] opacity-50"></div>

        <div>
          <div className="flex items-start justify-between mb-3">
            <h4 className="font-serif font-bold text-xl text-[#e5e0d8] leading-tight line-clamp-2 group-hover:text-[#d4b483] transition-colors">{title}</h4>
            {icon && <div className="text-[#8b7355] opacity-80 scale-90 origin-top-right">{icon}</div>}
          </div>
          <p className="text-sm text-[#a89f91] line-clamp-3 font-light leading-relaxed">{subtitle}</p>
        </div>
        <div className="flex items-center text-xs text-[#d4b483] font-bold tracking-widest uppercase opacity-0 group-hover:opacity-100 transition-opacity mt-3 pt-3 border-t border-[#443c38]/50">
          Read More <ChevronRight size={12} className="ml-1" />
        </div>
      </div>
    </div>
  );
};

interface CardRowProps {
  title: string;
  // Allow any extra properties to pass through (like content, links)
  items: { title: string; subtitle: string; imageUrl?: string; id: string | number; type: any; [key: string]: any }[];
  onItemClick: (item: any) => void;
  icon?: React.ReactNode;
}

const CardRow: React.FC<CardRowProps> = ({ title, items, onItemClick, icon }) => {
  if (!items || items.length === 0) return null;

  return (
    <div className="mb-12">
      <h3 className="text-2xl font-display font-bold text-[#d4b483] mb-6 px-2 flex items-center gap-3 border-b border-[#443c38] pb-2 inline-block">
        {icon} {title}
      </h3>
      <div className="flex overflow-x-auto hide-scrollbar space-x-6 pb-6 px-2">
        {items.map((item, idx) => (
          <Card 
            key={idx}
            title={item.title}
            subtitle={item.subtitle}
            imageUrl={item.imageUrl}
            icon={icon}
            onClick={() => onItemClick(item)}
          />
        ))}
      </div>
    </div>
  );
};

export default CardRow;
