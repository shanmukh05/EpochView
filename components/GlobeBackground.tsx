
import React, { useEffect, useRef, useState } from 'react';
import * as L from 'leaflet';
import { Plus, Minus } from 'lucide-react';

interface GlobeBackgroundProps {
  zoomed: boolean;
  locationName?: string;
  onLocationClick?: (location: string) => void;
}

const GlobeBackground: React.FC<GlobeBackgroundProps> = ({ zoomed, locationName, onLocationClick }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  
  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Prevent double initialization
    if (mapInstanceRef.current) return;

    try {
        const map = L.map(mapContainerRef.current, {
          center: [20, 0],
          zoom: 2,
          zoomControl: false, // Disable default zoom control to add custom one
          attributionControl: true,
          scrollWheelZoom: true, // Enable scroll zoom
          dragging: true,
          doubleClickZoom: true
        });

        // 1. Add Esri World Imagery (Satellite) Layer - Base
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
          attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
          maxZoom: 18,
          minZoom: 2,
          crossOrigin: true
        }).addTo(map);

        // 2. Add Esri World Boundaries and Places (Labels) Layer - Overlay
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
          maxZoom: 18,
          minZoom: 2,
          crossOrigin: true
        }).addTo(map);

        // Map Click Handler for Interactive Selection
        map.on('click', async (e: L.LeafletMouseEvent) => {
            if (!e.latlng) return;
            
            const { lat, lng } = e.latlng;
            
            // Validate Click Coordinates
            if (isNaN(lat) || isNaN(lng)) return;
            
            // Reverse Geocoding to get place name
            try {
                // Use zoom=18 to get maximum detail (building/street level) so we can find small villages/towns
                const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18`);
                if (!response.ok) return;
                
                const data = await response.json();
                
                if (data && data.address) {
                    const addr = data.address;
                    // Prioritize specific local names: City > Town > Village > Hamlet > Suburb > Neighbourhood > County > State > Country
                    const placeName = 
                        addr.city || 
                        addr.town || 
                        addr.village || 
                        addr.hamlet || 
                        addr.suburb || 
                        addr.neighbourhood || 
                        addr.county || 
                        addr.state || 
                        addr.country;

                    if (placeName && onLocationClick) {
                        onLocationClick(placeName);
                    }
                }
            } catch (error) {
                console.error("Reverse geocoding failed", error);
            }
        });

        mapInstanceRef.current = map;
    } catch (err) {
        console.error("Error initializing map", err);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []); // Remove onLocationClick dependency to avoid re-init

  // Handle Fly-To Location Logic (Geocoding via Nominatim)
  useEffect(() => {
    // Check if map is initialized and locationName exists
    if (!mapInstanceRef.current || !locationName) return;

    const geocodeAndFly = async () => {
      try {
        // Strip any " (Demo Mode)" suffix or similar cleanups before geocoding to ensure results
        const cleanQuery = locationName.replace(/\s*\(.*?\)\s*/g, "").trim();
        
        if (!cleanQuery) return;

        // Use OpenStreetMap Nominatim for free geocoding
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(cleanQuery)}`);
        
        if (!response.ok) return;

        const data = await response.json();

        // Check if map is still mounted after async fetch
        if (!mapInstanceRef.current) return;

        if (Array.isArray(data) && data.length > 0) {
          const result = data[0];
          
          // Strict Number Conversion
          const lat = Number(result.lat);
          const lon = Number(result.lon);
          
          // Validate Finite Numbers (prevents NaN errors)
          if (!isNaN(lat) && !isNaN(lon) && isFinite(lat) && isFinite(lon)) {
            // Fly to the location safely
            try {
                // Reduced zoom level to 10 for a better overview
                mapInstanceRef.current.flyTo([lat, lon], 5, {
                  duration: 3, // Duration in seconds
                  easeLinearity: 0.25
                });
            } catch (flyError) {
                console.error("Leaflet flyTo error:", flyError);
            }
          } else {
             console.warn("Invalid coordinates returned for location:", cleanQuery, result.lat, result.lon);
          }
        } else {
          console.log("No geocoding results found for:", cleanQuery);
        }
      } catch (error) {
        console.error("Geocoding failed:", error);
      }
    };

    geocodeAndFly();
  }, [locationName]);

  // Handle Zoomed State (Overview vs Detail Mode)
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (!zoomed) {
      // Fly back to World View
      try {
          mapInstanceRef.current.flyTo([20, 0], 2, {
            duration: 2.5
          });
      } catch (e) {
          console.error("Error flying to global view", e);
      }
    }
    // If zoomed is true, the location effect above handles the positioning
  }, [zoomed]);

  // Zoom Handlers
  const handleZoomIn = () => {
    mapInstanceRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapInstanceRef.current?.zoomOut();
  };

  return (
    <div 
      className={`fixed inset-0 z-0 transition-all duration-1000 ease-in-out ${zoomed ? 'opacity-20 pointer-events-none grayscale-[50%] sepia-[40%]' : 'opacity-100 grayscale-0'}`}
    >
        {/* Leaflet Map Container */}
        <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} className="cursor-crosshair" />
      
        {/* Overlay gradient to blend map with app theme (Warm Dark Brown) */}
        <div className="absolute inset-0 bg-[#1a1614]/30 pointer-events-none mix-blend-overlay"></div>
        
        {/* Vignette effect - Warm Sepia */}
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(26,22,20,0.8)_100%)]"></div>

        {/* Custom Zoom Controls */}
        <div className="absolute bottom-8 right-8 z-[1000] flex flex-col gap-2">
            <button 
                onClick={handleZoomIn}
                className="bg-[#2a2420] hover:bg-[#352e2a] text-[#d4b483] border border-[#443c38] hover:border-[#d4b483] p-2 rounded-sm shadow-lg transition-all"
                title="Zoom In"
            >
                <Plus size={24} />
            </button>
            <button 
                onClick={handleZoomOut}
                className="bg-[#2a2420] hover:bg-[#352e2a] text-[#d4b483] border border-[#443c38] hover:border-[#d4b483] p-2 rounded-sm shadow-lg transition-all"
                title="Zoom Out"
            >
                <Minus size={24} />
            </button>
        </div>
    </div>
  );
};

export default GlobeBackground;
