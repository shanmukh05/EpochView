
import { GoogleGenAI, Modality, FunctionDeclaration, Tool, Schema } from "@google/genai";
import { TimelineData, ChatMessage, DetailModalData, HistoricalEra, HistoricalPerson, HistoricalEvent, HistoricalLocation, HistoricalSitesData } from "../types";

// Helper to get a fresh AI instance with the current key
const getAI = () => {
  const key = process.env.API_KEY;
  if (!key) {
    console.error("API_KEY is missing from environment variables.");
    throw new Error("API Key missing");
  }
  return new GoogleGenAI({ apiKey: key });
};

// Helper to clean JSON string from Markdown code blocks or preamble
const cleanJson = (text: string): string => {
  if (!text) return "{}";

  // 1. Try to extract from markdown code blocks first (most reliable)
  const codeBlockRegex = /```json\s*([\s\S]*?)\s*```/;
  const match = text.match(codeBlockRegex);
  if (match && match[1]) {
    return match[1].trim();
  }

  // 2. Fallback: heuristic extraction based on braces
  // Remove potential markdown markers if regex failed (e.g. malformed block)
  let clean = text.replace(/```json\s*|```/g, "").trim();

  const firstBrace = clean.indexOf('{');
  const firstBracket = clean.indexOf('[');

  // If no JSON-like start found, return empty object string to prevent parse error
  if (firstBrace === -1 && firstBracket === -1) return "{}";

  let start = 0;
  let end = clean.length;

  // Determine if it looks like an Object or Array
  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    start = firstBrace;
    end = clean.lastIndexOf('}') + 1;
  } else {
    start = firstBracket;
    end = clean.lastIndexOf(']') + 1;
  }

  // Extract the substring
  if (end > start) {
      return clean.substring(start, end);
  }
  
  return "{}";
};

// Helper for delay to prevent rate limiting
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- AUDIO HELPERS ---

function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

// --- FALLBACK DATA (Offline Mode) ---
const PLACEHOLDER_BASE = "https://placehold.co/400x300/2a2420/d4b483?text=";

const FALLBACK_TIMELINE_DATA: TimelineData = {
  location: "Rome",
  eras: [
    {
      eraName: "The Roman Republic",
      yearRange: "509 BC – 27 BC",
      summary: "A period of massive expansion and political experimentation, transitioning from a monarchy to a republic. Rome grew from a city-state to a dominant power in the Mediterranean, marked by the Punic Wars and internal political strife.",
      visualPrompt: "Ancient Rome, forum, white marble temples, toga-clad citizens, sunny mediterranean day",
      people: [
        { 
          name: "Julius Caesar", 
          role: "Dictator", 
          shortBio: "Roman general and statesman who played a critical role in the events that led to the demise of the Roman Republic and the rise of the Roman Empire.",
          imageUrl: `${PLACEHOLDER_BASE}Julius+Caesar`,
          content: "Gaius Julius Caesar was a Roman general and statesman. A member of the First Triumvirate, Caesar led the Roman armies in the Gallic Wars before defeating his political rival Pompey in a civil war, and subsequently became dictator from 49 BC until his assassination in 44 BC. He played a critical role in the events that led to the demise of the Roman Republic and the rise of the Roman Empire.",
          links: [
            { title: "Wikipedia: Julius Caesar", url: "https://en.wikipedia.org/wiki/Julius_Caesar" },
            { title: "Britannica: Julius Caesar", url: "https://www.britannica.com/biography/Julius-Caesar-Roman-ruler" }
          ]
        },
        { 
          name: "Cicero", 
          role: "Orator", 
          shortBio: "Roman statesman, lawyer, scholar, philosopher, and Academic Skeptic, who tried to uphold optimate principles during the political crises that led to the establishment of the Roman Empire.",
          imageUrl: `${PLACEHOLDER_BASE}Cicero`,
          content: "Marcus Tullius Cicero was a Roman statesman, lawyer, scholar, philosopher, writer and Academic Skeptic, who tried to uphold optimate principles during the political crises that led to the establishment of the Roman Empire. His extensive writings include treatises on rhetoric, philosophy and politics, and he is considered one of Rome's greatest orators and prose stylists.",
          links: [
            { title: "Wikipedia: Cicero", url: "https://en.wikipedia.org/wiki/Cicero" },
            { title: "Stanford Encyclopedia of Philosophy", url: "https://plato.stanford.edu/entries/cicero/" }
          ]
        }
      ],
      events: [
        { 
          title: "Assassination of Julius Caesar", 
          year: "44 BC", 
          description: "Caesar is stabbed to death at a meeting of the Senate.",
          imageUrl: `${PLACEHOLDER_BASE}Assassination`,
          content: "The assassination of Julius Caesar was the result of a conspiracy by about 60 Roman senators, led by Gaius Cassius Longinus and Marcus Junius Brutus, to remove Caesar from power. Caesar was stabbed to death at a meeting of the Senate in the Theatre of Pompey on the Ides of March (15 March) 44 BC.",
          links: [
            { title: "Wikipedia: Assassination", url: "https://en.wikipedia.org/wiki/Assassination_of_Julius_Caesar" }
          ]
        },
        { 
          title: "Crossing the Rubicon", 
          year: "49 BC", 
          description: "Caesar crosses the Rubicon river, sparking civil war.",
          imageUrl: `${PLACEHOLDER_BASE}Rubicon`,
          content: "Caesar's crossing the Rubicon river in January 49 BC precipitated the Roman Civil War, which ultimately led to Caesar becoming dictator and the rise of the imperial era of Rome. Caesar had been appointed to a governorship over a region that ranged from southern Gaul to Illyricum (but not Italy). As his term of office ended, the Senate ordered Caesar to disband his army and return to Rome.",
          links: [
            { title: "History.com", url: "https://www.history.com/news/julius-caesar-crossing-rubicon" }
          ]
        }
      ],
      locations: [
        { 
          name: "Roman Forum", 
          type: "Plaza", 
          significance: "The center of day-to-day life in Rome: the site of triumphal processions and elections.",
          imageUrl: `${PLACEHOLDER_BASE}Roman+Forum`,
          content: "The Roman Forum is a rectangular forum (plaza) surrounded by the ruins of several important ancient government buildings at the center of the city of Rome. Citizens of the ancient city referred to this space, originally a marketplace, as the Forum Magnum, or simply the Forum.",
          mapLink: "https://maps.google.com/?q=Roman+Forum",
          links: [
             { title: "Wikipedia: Roman Forum", url: "https://en.wikipedia.org/wiki/Roman_Forum" }
          ]
        },
        { 
          name: "Theater of Pompey", 
          type: "Theater", 
          significance: "One of the first permanent theatres in Rome.",
          imageUrl: `${PLACEHOLDER_BASE}Theater+of+Pompey`,
          content: "The Theatre of Pompey was a structure in Ancient Rome built during the latter part of the Roman Republican era by Pompey the Great (Gnaeus Pompeius Magnus). Completed in 55 BC, it was the first permanent theatre to be built in Rome. It was the site of Caesar's assassination.",
          mapLink: "https://maps.google.com/?q=Theatre+of+Pompey",
          links: [
              { title: "Wikipedia: Theatre of Pompey", url: "https://en.wikipedia.org/wiki/Theatre_of_Pompey" }
          ]
        }
      ]
    },
    {
      eraName: "The Roman Empire",
      yearRange: "27 BC – 476 AD",
      summary: "The peak of Roman power, engineering, and culture. The Pax Romana brought relative peace and stability, allowing for the construction of iconic landmarks like the Colosseum and Pantheon.",
      visualPrompt: "The Colosseum, crowded streets, roman legions, imperial majesty, marble statues",
      people: [
        { 
          name: "Augustus", 
          role: "Emperor", 
          shortBio: "First Roman emperor, he led Rome's transformation from a republic to an empire.",
          imageUrl: `${PLACEHOLDER_BASE}Augustus`,
          content: "Augustus was the first Roman emperor, reigning from 27 BC until his death in AD 14. His status as the founder of the Roman Principate (the first phase of the Roman Empire) has consolidated a legacy as one of the most effective and controversial leaders in human history.",
          links: [{ title: "Wikipedia", url: "https://en.wikipedia.org/wiki/Augustus" }]
        },
        { 
          name: "Nero", 
          role: "Emperor", 
          shortBio: "Fifth Roman emperor, whose rule is often associated with tyranny and extravagance.",
          imageUrl: `${PLACEHOLDER_BASE}Nero`,
          content: "Nero was the fifth Roman emperor, ruling from 54 to 68. His infamous reign is commonly associated with tyranny, extravagance, and debauchery. He is known for the Great Fire of Rome, during which he was rumored to have played the fiddle while the city burned.",
          links: [{ title: "Britannica", url: "https://www.britannica.com/biography/Nero-Roman-emperor" }]
        }
      ],
      events: [
        { 
          title: "Great Fire of Rome", 
          year: "64 AD", 
          description: "A fire that caused widespread devastation in the city.",
          imageUrl: `${PLACEHOLDER_BASE}Great+Fire`,
          content: "The Great Fire of Rome was an urban fire that started on the night between 18 and 19 July in the year 64 AD. It caused widespread devastation, before being brought under control after six days. Differing accounts either blame Emperor Nero for initiating the fire or credit him with organizing measures to contain it.",
          links: [{ title: "Wikipedia", url: "https://en.wikipedia.org/wiki/Great_Fire_of_Rome" }]
        },
        { 
          title: "Completion of the Colosseum", 
          year: "80 AD", 
          description: "The largest amphitheatre ever built at the time is finished.",
          imageUrl: `${PLACEHOLDER_BASE}Colosseum+Built`,
          content: "The Colosseum was completed in 80 AD under Emperor Titus, with further modifications included during the reign of Domitian. Inaugural games were held in 80 AD, and the building was used for gladiatorial contests and public spectacles.",
          links: [{ title: "History Today", url: "https://www.historytoday.com/archive/months-past/colosseum-opens-rome" }]
        }
      ],
      locations: [
        { 
          name: "Colosseum", 
          type: "Amphitheatre", 
          significance: "The largest ancient amphitheatre ever built, and is still the largest standing amphitheatre in the world today.",
          imageUrl: `${PLACEHOLDER_BASE}Colosseum`,
          content: "The Colosseum is an oval amphitheatre in the centre of the city of Rome, Italy, just east of the Roman Forum. It is the largest ancient amphitheatre ever built, and is still the largest standing amphitheatre in the world today, despite its age.",
          mapLink: "https://maps.google.com/?q=Colosseum",
          links: [{ title: "Official Site", url: "https://parcocolosseo.it/en/" }]
        },
        { 
          name: "Pantheon", 
          type: "Temple", 
          significance: "A former Roman temple, now a Catholic church, commissioned by Marcus Agrippa.",
          imageUrl: `${PLACEHOLDER_BASE}Pantheon`,
          content: "The Pantheon is a former Roman temple and, since 609 AD, a Catholic church in Rome, Italy, on the site of an earlier temple commissioned by Marcus Agrippa during the reign of Augustus.",
          mapLink: "https://maps.google.com/?q=Pantheon+Rome",
          links: [{ title: "Wikipedia", url: "https://en.wikipedia.org/wiki/Pantheon,_Rome" }]
        }
      ]
    },
    {
       eraName: "Medieval Rome",
       yearRange: "476 – 1400",
       summary: "After the fall of the Western Empire, Rome's population dwindled. The city became the spiritual center of Western Christendom.",
       visualPrompt: "Medieval Rome",
       people: [{ name: "Charlemagne", role: "Emperor", shortBio: "King of the Franks", imageUrl: `${PLACEHOLDER_BASE}Charlemagne`, content: "Charlemagne was King of the Franks, King of the Lombards, and Emperor of the Romans. He united much of western and central Europe during the Early Middle Ages.", links: [{ title: "Wikipedia", url: "https://en.wikipedia.org/wiki/Charlemagne" }] }],
       events: [{ title: "Coronation", year: "800", description: "Charlemagne crowned.", imageUrl: `${PLACEHOLDER_BASE}Coronation`, content: "Charlemagne was crowned Emperor of the Romans by Pope Leo III on Christmas Day, 800.", links: [{ title: "Wikipedia", url: "https://en.wikipedia.org/wiki/Charlemagne" }] }],
       locations: [{ name: "Old St. Peter's", type: "Church", significance: "Ancient Basilica", imageUrl: `${PLACEHOLDER_BASE}Old+St+Peters`, content: "Old St. Peter's Basilica was the building that stood, from the 4th to 16th centuries, where the new St. Peter's Basilica stands today.", mapLink: "https://maps.google.com/?q=St+Peter+Basilica", links: [{ title: "Britannica", url: "https://www.britannica.com/topic/Old-St-Peters-Basilica" }] }]
    },
    {
       eraName: "Renaissance Rome",
       yearRange: "1400 – 1600",
       summary: "The Papacy restored Rome to greatness, commissioning master artists.",
       visualPrompt: "Renaissance Rome",
       people: [{ name: "Michelangelo", role: "Artist", shortBio: "Sculptor, painter.", imageUrl: `${PLACEHOLDER_BASE}Michelangelo`, content: "Michelangelo di Lodovico Buonarroti Simoni was an Italian sculptor, painter, architect, and poet of the High Renaissance.", links: [{ title: "Wikipedia", url: "https://en.wikipedia.org/wiki/Michelangelo" }] }],
       events: [{ title: "Sistine Chapel", year: "1512", description: "Ceiling painted.", imageUrl: `${PLACEHOLDER_BASE}Sistine`, content: "The Sistine Chapel ceiling, painted by Michelangelo between 1508 and 1512, is a cornerstone work of High Renaissance art.", links: [{ title: "Vatican Museums", url: "https://m.museivaticani.va/content/museivaticani-mobile/en/collezioni/musei/cappella-sistina/storia-cappella-sistina.html" }] }],
       locations: [{ name: "St. Peter's Basilica", type: "Church", significance: "Renaissance masterpiece", imageUrl: `${PLACEHOLDER_BASE}St+Peters`, content: "The Papal Basilica of Saint Peter in the Vatican is a church built in the Renaissance style located in Vatican City.", mapLink: "https://maps.google.com/?q=St+Peters", links: [{ title: "Wikipedia", url: "https://en.wikipedia.org/wiki/St._Peter%27s_Basilica" }] }]
    },
    {
       eraName: "Modern Rome",
       yearRange: "1870 – Present",
       summary: "Rome became the capital of the unified Kingdom of Italy.",
       visualPrompt: "Modern Rome",
       people: [{ name: "Fellini", role: "Director", shortBio: "Filmmaker.", imageUrl: `${PLACEHOLDER_BASE}Fellini`, content: "Federico Fellini was an Italian film director and screenwriter known for his distinctive style, which blends fantasy and baroque images with earthiness.", links: [{ title: "Wikipedia", url: "https://en.wikipedia.org/wiki/Federico_Fellini" }] }],
       events: [{ title: "Rome Capital", year: "1871", description: "Becomes capital.", imageUrl: `${PLACEHOLDER_BASE}Rome+Capital`, content: "Rome was captured by the Kingdom of Italy on September 20, 1870, and became the capital in 1871.", links: [{ title: "Britannica", url: "https://www.britannica.com/place/Rome/History" }] }],
       locations: [{ name: "Trevi Fountain", type: "Fountain", significance: "Baroque fountain", imageUrl: `${PLACEHOLDER_BASE}Trevi`, content: "The Trevi Fountain is a fountain in the Trevi district in Rome, Italy, designed by Italian architect Nicola Salvi and completed by Giuseppe Pannini.", mapLink: "https://maps.google.com/?q=Trevi+Fountain", links: [{ title: "Rome.net", url: "https://www.rome.net/trevi-fountain" }] }]
    }
  ],
  historicalSites: {
      text: "Explore these historical landmarks in Rome. (Demo Data)",
      links: [
          { title: "Colosseum", uri: "https://maps.google.com/?q=Colosseum", lat: 41.8902, lng: 12.4922 },
          { title: "Roman Forum", uri: "https://maps.google.com/?q=Roman+Forum", lat: 41.8925, lng: 12.4853 },
          { title: "Pantheon", uri: "https://maps.google.com/?q=Pantheon", lat: 41.8986, lng: 12.4769 },
          { title: "St. Peter's Basilica", uri: "https://maps.google.com/?q=St+Peters", lat: 41.9022, lng: 12.4539 }
      ]
  }
};

// 1. Fetch Structured Historical Data (Timeline Text Only)
export const fetchHistoricalTimeline = async (location: string): Promise<TimelineData> => {
  const ai = getAI();
  const prompt = `
      Perform a deep historical analysis of ${location}. 
      Divide its history into <5> distinct, chronologically ordered eras.
      
      For each era, provide:
      1. Era Name & Year Range
      2. Summary (80 words)
      3. Visual Prompt (for 3D generation)
      4. People (3): Name, Role, Short Bio.
         - PLUS: 'content' (Detailed 2-paragraph biography), 'links' (Array of {title, url}).
      5. Events (3): Title, Year, Description.
         - PLUS: 'content' (Detailed description), 'links' (Array of {title, url}).
      6. Locations (3): Name, Type, Significance.
         - PLUS: 'content' (Description), 'links' (Array of {title, url}), 'mapLink' (Google Maps URL).

      Return JSON matching schema:
      {
        "location": "${location}",
        "eras": [
          {
            "eraName": "string",
            "yearRange": "string",
            "summary": "string",
            "visualPrompt": "string",
            "people": [{ "name": "string", "role": "string", "shortBio": "string", "content": "string", "links": [{ "title": "string", "url": "string" }] }],
            "events": [{ "title": "string", "year": "string", "description": "string", "content": "string", "links": [{ "title": "string", "url": "string" }] }],
            "locations": [{ "name": "string", "type": "string", "significance": "string", "content": "string", "links": [{ "title": "string", "url": "string" }], "mapLink": "string" }]
          }
        ]
      }
    `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', // Pro model for text reasoning
      contents: prompt,
      config: {
         // No tools needed for pure text generation structure, allows caching
      }
    });

    const jsonString = cleanJson(response.text);
    if (!jsonString || jsonString === "{}") throw new Error("Empty JSON from Timeline");
    return JSON.parse(jsonString) as TimelineData;

  } catch (error) {
    console.warn("Primary Model (Gemini 3 Pro) failed, switching to Fallback (Gemini 2.5 Flash).", error);
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-lite',
            contents: prompt,
            config: {
               // No tools
            }
          });
          const jsonString = cleanJson(response.text);
          if (!jsonString || jsonString === "{}") throw new Error("Empty JSON from Timeline Fallback");
          return JSON.parse(jsonString) as TimelineData;

    } catch (fallbackError) {
        console.error("Historical Timeline Fetch Failed:", fallbackError);
        await delay(1000);
        return { ...FALLBACK_TIMELINE_DATA, location: location.replace(/\s*\(.*?\)\s*/g, "") || "Rome" };
    }
  }
};

// 2. Fetch Historical Sites (Geospatial Data)
export const fetchHistoricalSites = async (location: string): Promise<HistoricalSitesData> => {
    const ai = getAI();
    // Simplified prompt to reduce chance of non-JSON chatter
    const prompt = `
        List 5 historical landmarks in ${location}.
        Get their specific latitude and longitude.
        Return ONLY valid JSON:
        { 
            "text": "Short analysis...", 
            "links": [{ "title": "Name", "uri": "Map URL", "lat": 0.0, "lng": 0.0 }] 
        }
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                tools: [{ googleMaps: {} }],
                // No responseMimeType to allow tools
            }
        });
        
        const jsonString = cleanJson(response.text);
        if (!jsonString || jsonString === "{}") throw new Error("Empty JSON from Historical Sites");
        
        const data = JSON.parse(jsonString);
        
        // Validation: Ensure lat/lng are present
        if (data.links && Array.isArray(data.links)) {
           data.links = data.links.map((link: any) => ({
             ...link,
             lat: typeof link.lat === 'number' ? link.lat : 41.9028,
             lng: typeof link.lng === 'number' ? link.lng : 12.4964
           }));
        }
        
        return data as HistoricalSitesData;
    } catch (error) {
        console.error("Historical Sites Fetch Failed:", error);
        return FALLBACK_TIMELINE_DATA.historicalSites!;
    }
};

// 3. Fetch Entity Images (Batched per Era for Reliability)
export const fetchTimelineEntityImages = async (location: string, eras: HistoricalEra[]): Promise<HistoricalEra[]> => {
    const ai = getAI();

    // Helper to process a single era
    const processEraImages = async (era: HistoricalEra): Promise<HistoricalEra> => {
        const names = [
            ...era.people.map(p => p.name),
            ...era.events.map(e => e.title),
            ...era.locations.map(l => l.name)
        ];

        if (names.length === 0) return era;

        const prompt = `
            You are an image searcher.
            Find a valid public image URL for these ${location} history topics: ${JSON.stringify(names)}.
            
            Return ONLY a JSON object mapping names to URLs.
            Example: { "Julius Caesar": "http://image.com/caesar.jpg" }
        `;

        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    tools: [{ googleSearch: {} }]
                    // No responseMimeType to allow tools
                }
            });
            
            const jsonString = cleanJson(response.text);
            let urlMap: Record<string, string> = {};
            
            if (jsonString && jsonString !== "{}") {
                urlMap = JSON.parse(jsonString);
            }

            // Merge back
            return {
                ...era,
                people: era.people.map(p => ({ ...p, imageUrl: urlMap[p.name] || `${PLACEHOLDER_BASE}${encodeURIComponent(p.name)}` })),
                events: era.events.map(e => ({ ...e, imageUrl: urlMap[e.title] || `${PLACEHOLDER_BASE}${encodeURIComponent(e.title)}` })),
                locations: era.locations.map(l => ({ ...l, imageUrl: urlMap[l.name] || `${PLACEHOLDER_BASE}${encodeURIComponent(l.name)}` }))
            };
        } catch (error) {
            console.warn(`Failed to fetch images for era ${era.eraName}`, error);
            // Fallback to placeholders
            return {
                ...era,
                people: era.people.map(p => ({ ...p, imageUrl: `${PLACEHOLDER_BASE}${encodeURIComponent(p.name)}` })),
                events: era.events.map(e => ({ ...e, imageUrl: `${PLACEHOLDER_BASE}${encodeURIComponent(e.title)}` })),
                locations: era.locations.map(l => ({ ...l, imageUrl: `${PLACEHOLDER_BASE}${encodeURIComponent(l.name)}` }))
            };
        }
    };

    // Process all eras in parallel
    const promises = eras.map(era => processEraImages(era));
    const updatedEras = await Promise.all(promises);
    return updatedEras;
};

// 4. Generate Historical Image (Visual Archive)
export const generateEraImage = async (location: string, eraName: string, visualDescription: string): Promise<string | null> => {
  try {
    const ai = getAI();
    // Prompt optimized for isometric miniature scene as requested
    const prompt = `Present a clear, top-down isometric miniature 3D cartoon scene of ${location} during the era of ${eraName}. 
    Description: ${visualDescription}. 
    Features: Iconic landmarks, architectural elements, historic locations, scenes from the era.
    Style: Soft, refined textures, realistic PBR materials, gentle lifelike lighting and shadows. Clean, minimalistic composition with a soft, solid-colored background.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview', // Nano Banana Pro
      contents: {
        parts: [{ text: prompt }]
      },
      config: {
        // Nano Banana Pro supports limited config, aspectRatio defaults to 1:1 if not set
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    // Return a placeholder if image gen fails but no error thrown
    return `https://placehold.co/800x800/2a2420/d4b483?text=${encodeURIComponent(eraName)}+Visual`;
  } catch (error) {
    console.error("Image generation failed:", error);
    // Demo Mode: Return a placeholder instead of null so Sequential Loading logic shows a result
    console.log("Demo Mode: Simulating image generation for", eraName);
    await delay(600);
    return `https://placehold.co/800x800/2a2420/d4b483?text=${encodeURIComponent(eraName)}+Visual`;
  }
};

// 5. Sequential Image Generation Helper
export const generateAllEraImages = async (location: string, eras: HistoricalEra[]): Promise<Record<string, string | null>> => {
    const images: Record<string, string | null> = {};
    for (const era of eras) {
        images[era.eraName] = await generateEraImage(location, era.eraName, era.visualPrompt);
    }
    return images;
};

// 6. Chat with Context
export const sendChatMessage = async (
  history: ChatMessage[], 
  newMessage: string, 
  context: { location: string, era?: string, summary?: string }
): Promise<string> => {
  try {
    const ai = getAI();
    const chat = ai.chats.create({
      model: 'gemini-2.5-flash-lite', // Smaller, faster model for chat
      config: {
        systemInstruction: `You are a knowledgeable historian guide for the location: ${context.location}. 
        Current Era Context: ${context.era || 'General History'}. 
        Summary: ${context.summary || ''}.
        Keep answers concise, engaging, and historically accurate. Focus on the requested era if applicable.`
      },
      history: history.map(h => ({
        role: h.role,
        parts: [{ text: h.text }]
      }))
    });

    const result = await chat.sendMessage({ message: newMessage });
    return result.text;
  } catch (error) {
    console.error("Chat error:", error);
    // Demo Mode fallback
    console.log("Demo Mode: Chat API disabled");
    await delay(600);
    return "I am currently in Demo Mode due to high API traffic or connectivity issues. I can't generate new responses right now, but feel free to explore the visual timeline!";
  }
};

// 7. Generate Speech (TTS)
export const generateEraSpeech = async (location: string, era: HistoricalEra): Promise<AudioBufferSourceNode | null> => {
  try {
    const ai = getAI();
    const narrative = `
      Exploring ${location} during the era of ${era.eraName}, covering the years ${era.yearRange}.
      Overview: ${era.summary}
      Notable Historical Figures: ${era.people.map(p => `${p.name}, ${p.role}`).join('. ')}.
      Key Events: ${era.events.map(e => `${e.year}: ${e.title}`).join('. ')}.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: narrative }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("No audio data returned");

    const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
    const audioBytes = decodeBase64(base64Audio);
    const audioBuffer = await decodeAudioData(audioBytes, outputAudioContext, 24000, 1);
    
    const source = outputAudioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(outputAudioContext.destination);
    source.start();
    
    return source; 

  } catch (error) {
    console.error("TTS Generation Error:", error);
    return null;
  }
};

// 8. Generate Single Timeline Evolution Video (Veo 3)
export const generateTimelineVideo = async (location: string, eras: HistoricalEra[]): Promise<string | null> => {
  try {
    const ai = getAI();
    
    // Construct a narrative sequence for the video
    // Limit to top 5 eras to keep prompt concise
    const eraSequence = eras.slice(0, 5).map(e => `${e.eraName} (${e.yearRange}): ${e.visualPrompt}`).join(' -> then transition to -> ');
    
    const prompt = `Cinematic timelapse video of ${location} evolving through time. 
    Show the transition through these historical periods: ${eraSequence}.
    Style: Historical documentary, realistic, smooth transitions showing architectural evolution.`;

    console.log("Starting timeline video generation...");

    // 1. Initiate the Long Running Operation
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',  //'veo-2.0-generate-001', // 'veo-3.1-fast-generate-preview', 
      prompt: prompt,
      config: {
        resolution: '720p', 
        aspectRatio: '16:9' 
      }
    });

    if (!operation || !operation.name) {
      throw new Error("Failed to initialize video generation operation.");
    }

    const opName = operation.name;
    console.log(`Operation started: ${opName}`);

    // 2. Poll for completion
    while (!operation.done) {
      // console.log("Video generation in progress...");
      await delay(5000); // Wait 5 seconds
      
      const updatedOp = await ai.operations.getVideosOperation({ 
        operation: operation 
      });

      if (!updatedOp) {
        throw new Error("Failed to poll status: Operation not found.");
      }
      operation = updatedOp;
    }

    // 3. Handle Errors explicitly
    if (operation.error) {
      throw new Error(`Generation failed: ${operation.error.message}`);
    }

    // 4. Extract Video URI
    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;

    if (videoUri) {
      // Append API key to authorize playback/download as per Veo requirements
      const separator = videoUri.includes('?') ? '&' : '?';
      const authorizedUrl = `${videoUri}${separator}key=${process.env.API_KEY}`;

      const videoUriResponse = await fetch(authorizedUrl);
      // 3. Process the response (e.g., convert to a Blob, create a local object URL, or save to disk)
      const videoBlob = await videoUriResponse.blob();

      // In a browser environment, you would create an object URL to display it:
      const objectUrl = URL.createObjectURL(videoBlob);

      return objectUrl;
    }

    return null;

  } catch (error) {
    console.error("Video generation failed:", error);
    
    // Fallback logic
    console.log("Demo Mode: Starting Video Generation fallback for", location);
    await delay(2000); 
    return "https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4"; 
  }
};
