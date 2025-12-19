
import React from 'react';
import { X, ExternalLink, MapPin, Image as ImageIcon } from 'lucide-react';
import { DetailModalData } from '../types';

interface DetailModalProps {
  data: DetailModalData;
  onClose: () => void;
}

const DetailModal: React.FC<DetailModalProps> = ({ data, onClose }) => {
  // Use data passed directly from props. 
  // If data is somehow incomplete, fallback strings prevent crashes.
  const displayImage = data.imageUrl;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
      <div className="bg-[#1a1614] border border-[#443c38] rounded-sm w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl relative flex flex-col custom-scrollbar">
        
        {/* Header */}
        <div className="p-4 md:p-8 border-b border-[#443c38] flex justify-between items-start sticky top-0 bg-[#1a1614] z-10 shadow-sm">
          <div>
             <span className="text-xs font-bold text-[#8b7355] uppercase tracking-[0.2em] block mb-2">HISTORICAL ARCHIVE</span>
             <h2 className="text-2xl md:text-3xl font-serif font-bold text-[#e5e0d8]">{data.title}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[#2a2420] rounded-full transition-colors border border-transparent hover:border-[#443c38]">
            <X className="text-[#8b7355] hover:text-[#d4b483]" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 md:p-8 bg-[#1a1614]">
            <div className="flex flex-col gap-6">
              
              {/* Image Display */}
              {displayImage ? (
                <div className="w-full h-48 md:h-72 rounded-sm overflow-hidden border border-[#443c38] relative shadow-lg mb-2">
                   <img src={displayImage} alt={data.title} className="w-full h-full object-cover sepia-[0.2]" />
                   <div className="absolute inset-0 bg-gradient-to-t from-[#1a1614] via-transparent to-transparent opacity-60"></div>
                </div>
              ) : (
                <div className="w-full h-32 bg-[#231e1b] flex items-center justify-center border border-[#443c38] border-dashed rounded-sm">
                    <ImageIcon className="text-[#443c38]" size={32} />
                </div>
              )}

              {/* Description Content */}
              <div className="prose prose-invert max-w-none text-[#a89f91] leading-loose whitespace-pre-line font-serif border-l-2 border-[#2a2420] pl-6 text-sm md:text-base">
                {data.description || "No detailed records available for this entry."}
              </div>

              {/* Location Section (Only for Locations with Map Link) */}
              {data.mapLink && (
                <div className="bg-[#2a2420] rounded-sm p-4 md:p-6 border border-[#443c38]">
                  <h4 className="text-sm font-bold text-[#d4b483] uppercase tracking-widest mb-4 font-display">Location</h4>
                  <a href={data.mapLink} target="_blank" rel="noopener noreferrer" className="flex items-center text-[#a89f91] hover:text-[#d4b483] transition-colors group text-sm md:text-base">
                    <MapPin size={16} className="mr-3 text-[#8b7355] group-hover:text-[#d4b483]" />
                    View on Map
                  </a>
                </div>
              )}

              {/* References Section */}
              {data.links && data.links.length > 0 && (
                <div className="bg-[#2a2420] rounded-sm p-4 md:p-6 border border-[#443c38]">
                  <h4 className="text-sm font-bold text-[#d4b483] uppercase tracking-widest mb-4 font-display">References</h4>
                  <div className="space-y-3">
                    {data.links.map((link, i) => (
                      <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center text-[#a89f91] hover:text-[#d4b483] transition-colors truncate group text-sm md:text-base">
                        <ExternalLink size={16} className="mr-3 flex-shrink-0 text-[#8b7355] group-hover:text-[#d4b483]" />
                        <span className="truncate border-b border-transparent group-hover:border-[#d4b483]">{link.title}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default DetailModal;
