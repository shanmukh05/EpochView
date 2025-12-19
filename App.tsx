
import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, Calendar, Users, MapPin, Activity, Image as ImageIcon, Mic, Volume2, StopCircle, Video, Play, X, Map, AlertTriangle, ArrowLeft } from 'lucide-react';
import * as L from 'leaflet';
import { TimelineData, HistoricalEra, DetailModalData, HistoricalSitesData } from './types';
import { fetchHistoricalTimeline, fetchHistoricalSites, fetchTimelineEntityImages, generateEraImage, generateEraSpeech, generateTimelineVideo } from './services/geminiService';

// Components
import GlobeBackground from './components/GlobeBackground';
import Timeline from './components/Timeline';
import CardRow from './components/CardRow';
import DetailModal from './components/DetailModal';
import ChatWidget from './components/ChatWidget';
import LoadingScreen from './components/LoadingScreen';

const APP_LOGO = "https://i.ibb.co/GfMV5j1B/Logo.png";

const App: React.FC = () => {
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [locationName, setLocationName] = useState('');
  const [timelineData, setTimelineData] = useState<TimelineData | null>(null);
  const [currentEraIndex, setCurrentEraIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showFullLoading, setShowFullLoading] = useState(false); 
  const [exitingLoading, setExitingLoading] = useState(false); 
  const [viewMode, setViewMode] = useState<'globe' | 'details'>('globe');
  const [loadingStatus, setLoadingStatus] = useState<string>("");
  
  // Audio State
  const [isReading, setIsReading] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  // Video State
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  // Maps Exploration State
  const [mapsModalOpen, setMapsModalOpen] = useState(false);
  const [mapsLoading, setMapsLoading] = useState(false);
  const [mapsData, setMapsData] = useState<HistoricalSitesData | null>(null);
  const siteMapContainerRef = useRef<HTMLDivElement>(null);
  const siteMapInstanceRef = useRef<L.Map | null>(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState<DetailModalData | null>(null);

  // Handle Voice Search
  const startVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      alert("Voice input is not supported in this browser. Please use Chrome or Safari.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.start();

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setSearchQuery(transcript);
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'aborted') return;
        if (event.error === 'not-allowed') {
            alert("Microphone permission denied. Please allow microphone access to use voice search.");
            return;
        }
        console.error("Voice recognition error", event.error);
      };
    } catch (e) {
      console.error("Failed to start speech recognition", e);
    }
  };

  const performSearch = async (query: string) => {
    if (!query.trim()) return;
    
    setSearchQuery(query);
    setLocationName(query); // Trigger map zoom immediately
    setLoading(true);
    setExitingLoading(false);
    setViewMode('globe'); 
    setLoadingStatus("Connecting to historical archives...");
    
    try {
      // 1. Wait for Map Fly-to (simulated wait to sync with globe animation)
      await new Promise(resolve => setTimeout(resolve, 2500));
      setShowFullLoading(true);

      // --- SEQUENCE STEP 1: Fetch Textual Timeline ---
      setLoadingStatus("Retrieving historical timeline data...");
      const textData = await fetchHistoricalTimeline(query);
      
      if (!textData) throw new Error("No data returned from service");

      // Update location name if more canonical
      if (textData.location && textData.location !== query) {
        setLocationName(textData.location); 
      }
      
      setCurrentEraIndex(0);
      stopAudio();
      
      // Update intermediate state (allows data to exist before images)
      let currentData = textData;
      setTimelineData(currentData);

      // --- SEQUENCE STEP 2: Fetch Historical Sites (Maps) ---
      setLoadingStatus("Mapping historical sites...");
      const sitesData = await fetchHistoricalSites(currentData.location);
      currentData = { ...currentData, historicalSites: sitesData };
      setTimelineData(currentData);

      // --- SEQUENCE STEP 3: Fetch Entity Images (Cards) ---
      setLoadingStatus("Gathering archival images for records...");
      const erasWithImages = await fetchTimelineEntityImages(currentData.location, currentData.eras);
      currentData = { ...currentData, eras: erasWithImages };
      setTimelineData(currentData);

      // --- SEQUENCE STEP 4: Generate Era Visualizations (Nano Banana Pro) ---
      const eraImages: Record<string, string | null> = {};
      if (currentData.eras && currentData.eras.length > 0) {
        for (let i = 0; i < currentData.eras.length; i++) {
            const era = currentData.eras[i];
            setLoadingStatus(`Synthesizing visual archives for ${era.eraName} (${i + 1}/${currentData.eras.length})...`);
            try {
                const img = await generateEraImage(currentData.location, era.eraName, era.visualPrompt);
                eraImages[era.eraName] = img;
            } catch (err) {
                console.error(`Failed to generate image for ${era.eraName}`, err);
                eraImages[era.eraName] = null;
            }
        }
      }
      currentData = { ...currentData, eraImages };
      setTimelineData(currentData);

      // --- SEQUENCE STEP 5: Generate Timeline Video (Veo 3) - Single Video for All Eras ---
      if (currentData.eras && currentData.eras.length > 0) {
        setLoadingStatus(`Initializing cinematic reconstruction of full history...`);
        try {
            // Initiate video generation (awaited for the first response to ensure it's started/ready)
            const video = await generateTimelineVideo(currentData.location, currentData.eras);
            if (video) {
                currentData = { ...currentData, globalVideoUrl: video };
                setTimelineData(currentData);
            }
        } catch (err) {
            console.error("Video pre-generation failed", err);
        }
      }

      // 6. Finalizing
      setLoadingStatus("Finalizing temporal reconstruction...");
      await new Promise(resolve => setTimeout(resolve, 800));

      // 7. Exit Loading Screen
      setExitingLoading(true); 
      setTimeout(() => {
        setShowFullLoading(false);
        setExitingLoading(false);
        setLoading(false);
        setViewMode('details');
      }, 1000); 

    } catch (error: any) {
      console.error(error);
      if (error.message?.includes('429') || error.status === 429) {
        alert("Server is busy (Rate Limit Exceeded). Please wait a moment before searching again.");
      } else {
        alert("Could not retrieve historical data. Please check the API key or try another location.");
      }
      setLoading(false);
      setShowFullLoading(false);
      setExitingLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(searchQuery);
  };

  const handleMapLocationSelect = (place: string) => {
      performSearch(place);
  };

  const handleReadAloud = async () => {
    if (isReading) {
      stopAudio();
      return;
    }
    if (!timelineData || !timelineData.eras[currentEraIndex]) return;
    setIsAudioLoading(true);
    try {
      const source = await generateEraSpeech(locationName, timelineData.eras[currentEraIndex]);
      if (source) {
        audioSourceRef.current = source;
        setIsReading(true);
        source.onended = () => {
          setIsReading(false);
          audioSourceRef.current = null;
        };
      } else {
        alert("Unable to generate speech. Quota may be exceeded.");
      }
    } catch (error) {
      console.error("Playback error", error);
    } finally {
      setIsAudioLoading(false);
    }
  };

  const stopAudio = () => {
    if (audioSourceRef.current) {
      try { audioSourceRef.current.stop(); } catch (e) {}
      audioSourceRef.current = null;
    }
    setIsReading(false);
  };

  const handleGenerateVideo = async () => {
    setVideoUrl(null);
    setVideoModalOpen(true);
    setVideoLoading(true);

    if (timelineData?.globalVideoUrl) {
        setVideoUrl(timelineData.globalVideoUrl);
        setVideoLoading(false);
        return;
    }
  };

  const handleExplorePlaces = () => {
    setMapsModalOpen(true);
    // Data is already fetched
    if (timelineData && timelineData.historicalSites) {
        setMapsData(timelineData.historicalSites);
    } else {
        setMapsData(null);
    }
  };

  // Maps Modal Map Initialization
  useEffect(() => {
    if (mapsModalOpen && mapsData && siteMapContainerRef.current && !siteMapInstanceRef.current) {
       // Using requestAnimationFrame to ensure container is ready
       requestAnimationFrame(() => {
         if (!siteMapContainerRef.current) return;
         
         // Default to Rome coords if not provided, or first link's coords
         const defaultLat = 41.9028;
         const defaultLng = 12.4964;
         const startLat = mapsData.links.find(l => l.lat)?.lat || defaultLat;
         const startLng = mapsData.links.find(l => l.lng)?.lng || defaultLng;

         try {
             const map = L.map(siteMapContainerRef.current).setView([startLat, startLng], 13);
             
             // Satellite Layer
             L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                attribution: 'Tiles &copy; Esri',
                maxZoom: 18,
             }).addTo(map);

             // Labels Layer
             L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
                maxZoom: 18
             }).addTo(map);

             const markers: L.Layer[] = [];

             // Define Google Maps-like Red Icon
             const redIcon = new L.Icon({
               iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
               shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
               iconSize: [25, 41],
               iconAnchor: [12, 41],
               popupAnchor: [1, -34],
               shadowSize: [41, 41]
             });

             // Add markers for sites
             mapsData.links.forEach(link => {
                if (link.lat && link.lng) {
                   const marker = L.marker([link.lat, link.lng], { icon: redIcon }).addTo(map);
                   
                   marker.bindPopup(`
                     <div style="color: #1a1614; font-family: serif;">
                        <strong style="display:block; margin-bottom: 4px; font-size: 14px;">${link.title}</strong>
                        <a href="${link.uri}" target="_blank" style="color: #8b7355; text-decoration: underline; font-size: 12px; font-weight: bold; text-transform: uppercase;">View on Google Maps</a>
                     </div>
                   `);
                   markers.push(marker);
                }
             });

             if (markers.length > 0) {
                 const group = L.featureGroup(markers);
                 map.fitBounds(group.getBounds().pad(0.2));
             }

             siteMapInstanceRef.current = map;
         } catch (e) {
             console.error("Error initializing site map", e);
         }
       });
    } else if (!mapsModalOpen && siteMapInstanceRef.current) {
       siteMapInstanceRef.current.remove();
       siteMapInstanceRef.current = null;
    }
  }, [mapsModalOpen, mapsData]);


  const currentEra = timelineData?.eras?.[currentEraIndex];
  // Determine current image from pre-fetched map
  const currentEraImage = currentEra && timelineData?.eraImages ? timelineData.eraImages[currentEra.eraName] : null;

  // Modified openDetails to accept full object
  const openDetails = (item: any) => {
    setModalData({
        title: item.title,
        description: item.content || item.subtitle, // Fallback to short bio/subtitle if content missing
        imageUrl: item.imageUrl,
        links: item.links,
        mapLink: item.mapLink
    });
    setModalOpen(true);
  };

  return (
    <div className="relative min-h-screen flex flex-col font-sans">
      <GlobeBackground zoomed={viewMode === 'details'} locationName={locationName} onLocationClick={handleMapLocationSelect} />

      {showFullLoading && <LoadingScreen location={locationName} isExiting={exitingLoading} customStatus={loadingStatus} />}

      <div className={`absolute top-4 left-4 right-4 md:left-8 md:right-auto md:top-8 z-50 transition-all duration-700 transform ${viewMode === 'details' || showFullLoading ? '-translate-x-full opacity-0' : 'translate-x-0 opacity-100'}`}>
        <div className="bg-[#1a1614]/90 backdrop-blur-2xl border border-[#443c38]/50 p-6 md:p-8 rounded-xl shadow-[0_30px_60px_rgba(0,0,0,0.6)] w-full md:w-[450px] relative overflow-hidden group hover:border-[#8b7355]/30 transition-colors duration-500">
          <div className="flex items-center justify-center gap-4 mb-8 relative z-10">
              <img src={APP_LOGO} alt="EpochView" className="w-40 h-40 object-contain drop-shadow-md opacity-90" />
              <div className="text-center">
                  <div className="inline-block border-b border-[#d4b483]/30 pb-1 mb-1">
                      <span className="text-[10px] uppercase tracking-[0.4em] text-[#d4b483] font-sans">Historical Atlas</span>
                  </div>
                  <h1 className="text-4xl font-display font-bold text-[#e5e0d8] tracking-widest drop-shadow-md">EPOCHVIEW</h1>
              </div>
          </div>

          <form onSubmit={handleSearch} className="relative z-10 mb-4">
            <div className="relative group/field flex items-center bg-[#0c0a09]/60 border border-[#443c38] rounded-lg transition-all focus-within:border-[#d4b483] focus-within:bg-[#0c0a09]/80 focus-within:shadow-[0_0_15px_rgba(212,180,131,0.1)]">
                <div className="pl-4 text-[#8b7355] group-focus-within/field:text-[#d4b483] transition-colors"><Search size={18} /></div>
                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Enter a location..." className="w-full bg-transparent text-[#e5e0d8] placeholder-[#5c5552] text-base px-3 py-4 font-serif focus:outline-none" />
                <div className="pr-1 flex items-center gap-1">
                    <button type="button" onClick={startVoiceInput} className="p-2 text-[#5c5552] hover:text-[#d4b483] hover:bg-[#2a2420] rounded-md transition-all"><Mic size={18} /></button>
                    <button type="submit" disabled={loading} className="bg-[#d4b483] hover:bg-[#c2a878] text-[#1a1614] p-2.5 rounded-md transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-[#d4b483]/20">
                      {loading ? <Loader2 className="animate-spin" size={18} /> : <div className="font-bold text-xs uppercase tracking-wider px-2">Explore</div>}
                    </button>
                </div>
            </div>
          </form>

          {/* Suggested Locations */}
          <div className="flex items-center justify-center gap-2 mb-6 relative z-10">
            <span className="text-[#5c5552] text-[10px] uppercase tracking-widest mr-1">Try:</span>
            <button 
              onClick={() => performSearch("India")} 
              className="text-[#8b7355] hover:text-[#d4b483] text-[10px] font-bold uppercase tracking-wider border border-[#443c38] hover:border-[#d4b483] px-3 py-1.5 rounded-sm transition-all bg-[#0c0a09]/40 hover:bg-[#2a2420]"
            >
              India
            </button>
            <button 
              onClick={() => performSearch("Rome")} 
              className="text-[#8b7355] hover:text-[#d4b483] text-[10px] font-bold uppercase tracking-wider border border-[#443c38] hover:border-[#d4b483] px-3 py-1.5 rounded-sm transition-all bg-[#0c0a09]/40 hover:bg-[#2a2420]"
            >
              Rome
            </button>
            <button 
              onClick={() => performSearch("Egypt")} 
              className="text-[#8b7355] hover:text-[#d4b483] text-[10px] font-bold uppercase tracking-wider border border-[#443c38] hover:border-[#d4b483] px-3 py-1.5 rounded-sm transition-all bg-[#0c0a09]/40 hover:bg-[#2a2420]"
            >
              Egypt
            </button>
          </div>

          <div className="relative z-10 border-t border-[#443c38]/50 pt-6 text-center">
            <p className="text-[#8b7355] italic font-serif text-sm leading-relaxed">
              "History is the witness that testifies to the passing of time; it illumines reality, vitalizes memory, provides guidance in daily life and brings us tidings of antiquities."
            </p>
            <span className="text-[#5c5552] text-xs font-bold uppercase tracking-widest mt-2 block">— Cicero</span>
          </div>

          {/* Caution Note */}
          <div className="relative z-10 mt-6 bg-[#2a201c]/60 border border-[#8b4513]/30 rounded-lg p-3 flex items-start gap-3">
             <AlertTriangle size={16} className="text-[#cd5c5c] shrink-0 mt-0.5" />
             <p className="text-[#a89f91] text-xs leading-relaxed">
                <strong className="text-[#cd5c5c] block mb-1 uppercase text-[10px] tracking-wider">Note</strong>
                Deep historical analysis and media generation (Video/Images) may take 3-4 minutes to complete. Please be patient while the engine reconstructs the past.
             </p>
          </div>
          
          {/* Decorative Elements */}
          <div className="absolute top-0 left-0 w-16 h-16 border-t border-l border-[#d4b483]/20 rounded-tl-xl pointer-events-none"></div>
          <div className="absolute bottom-0 right-0 w-16 h-16 border-b border-r border-[#d4b483]/20 rounded-br-xl pointer-events-none"></div>
        </div>
      </div>

      {/* Main Content Area - Visible only in details mode */}
      <div 
        className={`fixed inset-0 z-30 flex flex-col transition-all duration-1000 transform ${viewMode === 'details' && !showFullLoading ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}
      >
        {/* Header Bar */}
        <div className="bg-[#1a1614] border-b border-[#443c38] px-4 md:px-8 py-4 flex items-center justify-between shadow-lg relative z-50">
          <button 
            onClick={() => { setViewMode('globe'); setLocationName(''); setTimelineData(null); }}
            className="flex items-center text-[#8b7355] hover:text-[#d4b483] uppercase tracking-widest text-xs font-bold group absolute left-8 top-1/2 -translate-y-1/2"
          >
            <ArrowLeft className="mr-2 group-hover:-translate-x-1 transition-transform" size={16} />
            Return to Globe
          </button>
          
          <div className="mx-auto text-center">
              <h1 className="text-2xl md:text-3xl font-display font-bold text-[#e5e0d8]">{locationName}</h1>
          </div>
          
          <div className="w-24 flex justify-end">
             <img src={APP_LOGO} alt="Logo" className="h-8 w-8 object-contain opacity-80" />
          </div>
        </div>

        {/* Control Bar */}
        {currentEra && (
            <div className="bg-[#231e1b] border-b border-[#443c38] py-3 flex justify-center gap-4 z-40">
                <button 
                  onClick={handleGenerateVideo}
                  className="bg-[#2a2420] hover:bg-[#352e2a] text-[#d4b483] border border-[#d4b483]/30 hover:border-[#d4b483] px-4 py-2 rounded-sm flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-all shadow-md hover:shadow-[#d4b483]/10"
                >
                  <Video size={14} /> 
                  Generate Video
                </button>

                <button 
                  onClick={handleReadAloud}
                  className={`bg-[#2a2420] hover:bg-[#352e2a] border px-4 py-2 rounded-sm flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-all shadow-md ${isReading ? 'text-[#d4b483] border-[#d4b483] animate-pulse' : 'text-[#d4b483] border-[#d4b483]/30 hover:border-[#d4b483]'}`}
                >
                  {isAudioLoading ? <Loader2 className="animate-spin" size={14} /> : isReading ? <StopCircle size={14} /> : <Volume2 size={14} />}
                  {isReading ? "Stop Audio" : "Listen"}
                </button>

                <button 
                  onClick={handleExplorePlaces}
                  className="bg-[#2a2420] hover:bg-[#352e2a] text-[#d4b483] border border-[#d4b483]/30 hover:border-[#d4b483] px-4 py-2 rounded-sm flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-all shadow-md hover:shadow-[#d4b483]/10"
                >
                  <Map size={14} /> 
                  Explore Sites
                </button>
            </div>
        )}

        {/* Timeline */}
        {timelineData && (
          <Timeline 
            eras={timelineData.eras} 
            currentIndex={currentEraIndex} 
            onSelectEra={(idx) => { setCurrentEraIndex(idx); stopAudio(); }} 
          />
        )}
        
        {/* Content Panels */}
        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row bg-[#1a1614] relative">
           <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/black-paper.png')] opacity-20 pointer-events-none"></div>

          {currentEra && (
            <>
              {/* Left Panel: Visuals & Summary */}
              <div className="w-full lg:w-[35%] lg:min-w-[380px] h-[40%] lg:h-auto border-b lg:border-b-0 lg:border-r border-[#443c38] p-4 md:p-8 overflow-y-auto custom-scrollbar bg-[#1e1a18]">
                
                {/* Image Container */}
                <div className="aspect-square w-full rounded-sm overflow-hidden mb-8 border border-[#443c38] shadow-2xl relative group bg-[#151210]">
                  {currentEraImage ? (
                    <img src={currentEraImage} alt={currentEra.eraName} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-[#5c5552] bg-[#1a1614]">
                      <ImageIcon size={48} className="mb-4 opacity-50" />
                      <span className="text-xs uppercase tracking-widest font-bold">Visual Archive</span>
                      <span className="text-[10px] mt-1 opacity-70">Image Data Unavailable</span>
                    </div>
                  )}
                  {/* Overlay Gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1a1614] via-transparent to-transparent opacity-60"></div>
                </div>

                <div className="relative">
                  <h2 className="text-4xl md:text-5xl font-display font-bold text-[#e5e0d8] mb-2 drop-shadow-lg">{currentEra.yearRange}</h2>
                  <h3 className="text-xl text-[#d4b483] font-serif italic mb-6">{currentEra.eraName}</h3>
                  <div className="w-12 h-1 bg-[#8b7355] mb-6"></div>
                  <p className="text-[#a89f91] text-lg leading-relaxed font-serif">
                    {currentEra.summary}
                  </p>
                </div>
              </div>

              {/* Right Panel: Data Cards */}
              <div className="w-full flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 bg-[#1a1614]">
                 <div className="max-w-5xl mx-auto flex flex-col justify-center min-h-full py-4">
                    
                    {/* People Section */}
                    <CardRow 
                      title="Historical Figures" 
                      icon={<Users size={20} />}
                      items={currentEra.people.map(p => ({ 
                          id: p.name, 
                          title: p.name, 
                          subtitle: p.role + (p.shortBio ? ` - ${p.shortBio}` : ''), 
                          imageUrl: p.imageUrl,
                          type: 'person',
                          ...p // Pass full object for detailed view
                      }))}
                      onItemClick={openDetails}
                    />

                    {/* Events Section */}
                    <CardRow 
                      title="Key Events" 
                      icon={<Activity size={20} />}
                      items={currentEra.events.map(e => ({ 
                          id: e.title, 
                          title: e.title, 
                          subtitle: `${e.year} - ${e.description}`, 
                          imageUrl: e.imageUrl,
                          type: 'event',
                          ...e // Pass full object
                      }))}
                      onItemClick={openDetails}
                    />

                    {/* Locations Section */}
                    <CardRow 
                      title="Landmarks & Locations" 
                      icon={<MapPin size={20} />}
                      items={currentEra.locations.map(l => ({ 
                          id: l.name, 
                          title: l.name, 
                          subtitle: `${l.type} - ${l.significance}`, 
                          imageUrl: l.imageUrl,
                          type: 'location',
                          ...l // Pass full object
                      }))}
                      onItemClick={openDetails}
                    />
                 </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Chat Widget - Only visible in details mode */}
      {viewMode === 'details' && (
        <ChatWidget context={{ 
            location: locationName, 
            era: currentEra?.eraName, 
            summary: currentEra?.summary 
        }} />
      )}

      {/* Modals */}
      {modalOpen && modalData && (
        <DetailModal data={modalData} onClose={() => setModalOpen(false)} />
      )}

      {/* Video Modal */}
      {videoModalOpen && (
         <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 backdrop-blur-md p-4">
            <div className="relative w-full max-w-5xl aspect-video bg-black rounded-lg overflow-hidden border border-[#443c38] shadow-2xl">
               <button onClick={() => setVideoModalOpen(false)} className="absolute top-4 right-4 z-10 text-white hover:text-[#d4b483] bg-black/50 rounded-full p-2"><X /></button>
               
               {videoLoading ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-[#d4b483]">
                      <Loader2 size={48} className="animate-spin mb-4" />
                      <span className="text-xl font-display font-bold tracking-widest">Generating Cinematic History...</span>
                      <span className="text-sm mt-2 text-[#a89f91]">This may take a moment</span>
                  </div>
               ) : videoUrl ? (
                  <video controls autoPlay className="w-full h-full object-contain">
                      <source src={videoUrl} type="video/mp4" />
                      Your browser does not support the video tag.
                  </video>
               ) : (
                   <div className="absolute inset-0 flex items-center justify-center text-[#a89f91]">
                       Video unavailable.
                   </div>
               )}
            </div>
         </div>
      )}

      {/* Explore Sites Map Modal */}
      {mapsModalOpen && mapsData && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
              <div className="relative w-full max-w-6xl h-[85vh] bg-[#1a1614] rounded-lg border border-[#443c38] flex flex-col overflow-hidden shadow-2xl">
                  {/* Header */}
                  <div className="flex justify-between items-center p-4 border-b border-[#443c38] bg-[#231e1b]">
                      <h2 className="text-xl font-display font-bold text-[#d4b483] flex items-center gap-2">
                          <MapPin size={20} /> Historical Landmarks in {locationName}
                      </h2>
                      <button onClick={() => setMapsModalOpen(false)} className="text-[#a89f91] hover:text-[#d4b483]"><X /></button>
                  </div>
                  
                  {/* Content Container */}
                  <div className="flex-1 relative">
                      {/* Leaflet Map Container */}
                      <div ref={siteMapContainerRef} className="absolute inset-0 w-full h-full z-0" />
                      
                      {/* Overlay Info Panel */}
                      <div className="absolute top-4 left-4 z-10 w-full md:w-96 max-h-[60vh] overflow-y-auto bg-[#1a1614]/90 backdrop-blur-md border border-[#443c38] p-4 rounded-sm shadow-xl custom-scrollbar">
                          <h3 className="text-[#d4b483] font-bold uppercase tracking-widest text-xs mb-3 border-b border-[#443c38] pb-2 sticky top-0 bg-[#1a1614]/95">Analysis</h3>
                          <div className="text-sm text-[#e5e0d8] leading-relaxed font-serif space-y-2">
                            {mapsData.text.split('\n').map((paragraph, idx) => (
                                <p key={idx}>
                                    {paragraph.split(/(\*\*.*?\*\*)/).map((part, i) => 
                                        part.startsWith('**') && part.endsWith('**') 
                                            ? <strong key={i} className="text-[#d4b483]">{part.slice(2, -2)}</strong> 
                                            : part
                                    )}
                                </p>
                            ))}
                          </div>
                          
                          <h3 className="text-[#d4b483] font-bold uppercase tracking-widest text-xs mt-6 mb-3 border-b border-[#443c38] pb-2 sticky top-0 bg-[#1a1614]/95">Key Sites</h3>
                          <div className="space-y-2">
                              {mapsData.links.map((link, i) => (
                                  <a key={i} href={link.uri} target="_blank" rel="noopener noreferrer" className="block p-3 bg-[#2a2420] hover:bg-[#352e2a] border border-[#443c38] hover:border-[#d4b483] rounded-sm group transition-all">
                                      <div className="flex justify-between items-center">
                                          <span className="font-bold text-[#e5e0d8] group-hover:text-[#d4b483] text-sm">{link.title}</span>
                                          <MapPin size={14} className="text-[#8b7355] group-hover:text-[#d4b483]" />
                                      </div>
                                  </a>
                              ))}
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default App;
