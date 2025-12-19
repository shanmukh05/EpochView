import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X, ChevronUp, Loader2 } from 'lucide-react';
import { ChatMessage } from '../types';
import { sendChatMessage } from '../services/geminiService';

interface ChatWidgetProps {
  context: {
    location: string;
    era?: string;
    summary?: string;
  };
}

const ChatWidget: React.FC<ChatWidgetProps> = ({ context }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: 'Greetings. I am your historical guide. How may I assist your exploration of this era?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    
    const userMsg: ChatMessage = { role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    const responseText = await sendChatMessage(messages, input, context);
    
    setMessages(prev => [...prev, { role: 'model', text: responseText }]);
    setLoading(false);
  };

  const suggestions = ["Cultural significance?", "Key conflicts?", "Technological advances?"];

  return (
    <div className={`fixed bottom-0 right-4 z-40 flex flex-col items-end transition-all duration-300 ${isOpen ? 'w-full md:w-[450px]' : 'w-auto'}`}>
      
      {/* Toggle Button */}
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="bg-[#2a2420] hover:bg-[#352e2a] text-[#d4b483] border border-[#443c38] rounded-t-lg px-6 py-3 font-serif font-bold shadow-2xl flex items-center gap-2 transition-all mb-0"
        >
          <MessageSquare size={18} />
          Consult Historian
        </button>
      )}

      {/* Chat Interface */}
      {isOpen && (
        <div className="bg-[#1a1614] border border-[#443c38] rounded-t-lg shadow-2xl w-full flex flex-col h-[600px] font-serif">
          
          {/* Header */}
          <div className="bg-[#231e1b] p-4 rounded-t-lg flex justify-between items-center border-b border-[#443c38]">
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-[#d4b483] animate-pulse shadow-[0_0_8px_rgba(212,180,131,0.6)]" />
              <span className="font-bold text-sm text-[#e5e0d8] tracking-wide">HISTORICAL GUIDE</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-[#8b7355] hover:text-[#d4b483]">
              <ChevronUp className="rotate-180" size={20} />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-6 bg-[#1a1614] custom-scrollbar">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-5 py-3 text-sm leading-relaxed ${
                  m.role === 'user' 
                    ? 'bg-[#352e2a] text-[#e5e0d8] rounded-t-xl rounded-bl-xl border border-[#443c38]' 
                    : 'bg-transparent text-[#a89f91] border-l-2 border-[#d4b483] pl-4 italic'
                }`}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start pl-4">
                 <div className="flex items-center gap-3">
                    <Loader2 className="animate-spin text-[#8b7355]" size={16} />
                    <span className="text-xs text-[#5c5552] italic">Consulting archives...</span>
                 </div>
              </div>
            )}
          </div>

          {/* Suggestions */}
          {messages.length < 3 && !loading && (
             <div className="px-5 pb-3 flex gap-2 overflow-x-auto hide-scrollbar bg-[#1a1614]">
                {suggestions.map((s, i) => (
                   <button 
                      key={i} 
                      onClick={() => setInput(s)}
                      className="whitespace-nowrap bg-[#231e1b] hover:bg-[#2a2420] border border-[#443c38] text-xs px-3 py-1.5 rounded-full text-[#8b7355] hover:text-[#d4b483] transition-colors"
                    >
                      {s}
                   </button>
                ))}
             </div>
          )}

          {/* Input */}
          <div className="p-4 bg-[#231e1b] border-t border-[#443c38]">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Inquire about history..."
                className="flex-1 bg-[#1a1614] border border-[#443c38] rounded px-4 py-3 text-sm text-[#e5e0d8] focus:outline-none focus:border-[#8b7355] placeholder-[#5c5552] font-sans"
              />
              <button 
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="bg-[#d4b483] hover:bg-[#c2a878] disabled:opacity-30 disabled:cursor-not-allowed text-[#1a1614] p-3 rounded transition-colors"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatWidget;