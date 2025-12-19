
export interface HistoricalPerson {
  name: string;
  role: string;
  shortBio: string;
  imageUrl?: string;
  content?: string;
  links?: { title: string; url: string }[];
}

export interface HistoricalEvent {
  title: string;
  year: string;
  description: string;
  imageUrl?: string;
  content?: string;
  links?: { title: string; url: string }[];
}

export interface HistoricalLocation {
  name: string;
  type: string;
  significance: string;
  imageUrl?: string;
  content?: string;
  links?: { title: string; url: string }[];
  mapLink?: string;
}

export interface HistoricalEra {
  eraName: string;
  yearRange: string;
  summary: string;
  visualPrompt: string; // Used to generate the image
  people: HistoricalPerson[];
  events: HistoricalEvent[];
  locations: HistoricalLocation[];
}

export interface HistoricalSiteLink {
  title: string;
  uri: string;
  lat?: number;
  lng?: number;
}

export interface HistoricalSitesData {
  text: string;
  links: HistoricalSiteLink[];
}

export interface TimelineData {
  location: string;
  eras: HistoricalEra[];
  historicalSites?: HistoricalSitesData;
  eraImages?: Record<string, string | null>; // Map of Era Name -> Image URL
  globalVideoUrl?: string | null; // Single video URL for the entire timeline
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  isThinking?: boolean;
}

export interface DetailModalData {
  title: string;
  description: string;
  imageUrl?: string;
  links?: { title: string; url: string }[];
  mapLink?: string;
}
