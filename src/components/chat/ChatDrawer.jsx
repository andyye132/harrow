import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useStore from '../../store/useStore';
import { FIPS_TO_ABBR, STATE_NAMES } from '../../utils/geoToShape';
import { CROP_GROWING_STATS } from '../../utils/cropStats';
import './ChatDrawer.css';

export default function ChatDrawer() {
  const chatOpen = useStore(s => s.chatOpen);
  const toggleChat = useStore(s => s.toggleChat);
  const selectedState = useStore(s => s.selectedState);
  const plantingGuide = useStore(s => s.plantingGuide);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const stateAbbr = selectedState ? FIPS_TO_ABBR[selectedState] : null;
  const stateName = stateAbbr ? STATE_NAMES[stateAbbr] : null;

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (chatOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [chatOpen]);

  // Add welcome message when opened with a selected state
  useEffect(() => {
    if (chatOpen && messages.length === 0) {
      const welcome = stateName
        ? `Hey! I see you're looking at **${stateName}**. Ask me anything about planting corn or soybeans there — best timing, expected yields, weather risks, you name it.`
        : `Hey! I'm your agricultural advisor. Select a state on the map or just ask me about planting corn or soybeans anywhere in the US.`;
      setMessages([{ role: 'assistant', content: welcome }]);
    }
  }, [chatOpen]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    // Build context for Claude
    const guideData = stateAbbr && plantingGuide ? plantingGuide[stateAbbr] : null;

    try {
      const res = await fetch('/api/plant-helper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          state: stateName || 'Unknown',
          stateAbbr: stateAbbr || '',
          crop: 'general',
          plantDate: new Date().toISOString().split('T')[0],
          historicalData: guideData,
          chatHistory: messages.concat(userMsg).map(m => ({
            role: m.role,
            content: m.content,
          })),
          userMessage: text,
        }),
      });
      if (!res.ok) {
        throw new Error(`Server responded with ${res.status}`);
      }
      const data = await res.json();
      if (!data.response) {
        throw new Error('Empty response from server');
      }
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
    } catch (err) {
      const isNetworkOrServer =
        err instanceof TypeError || // fetch network failure
        (err.message && /Server responded|Failed to fetch|NetworkError|Empty response/.test(err.message));
      const fallback = isNetworkOrServer
        ? 'Chat requires the local server. Run `npm run server` (needs GEMINI_API_KEY in .env).'
        : 'Sorry, something went wrong. Please try again.';
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: fallback,
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Quick suggestion chips
  const suggestions = stateAbbr
    ? [
        `Best time to plant corn in ${stateName}?`,
        `How does ${stateName} compare for soybeans?`,
        `Weather risks this season?`,
      ]
    : [
        'Which state is best for corn?',
        'Corn vs soybeans — which is more profitable?',
        'What weather kills yield the most?',
      ];

  return (
    <>
      {/* Floating chat button */}
      <button
        className={`chat-fab ${chatOpen ? 'hidden' : ''}`}
        onClick={toggleChat}
        title="Ask the crop advisor"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </button>

      {/* Backdrop */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div
            className="chat-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={toggleChat}
          />
        )}
      </AnimatePresence>

      {/* Drawer panel */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div
            className="chat-drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            {/* Header */}
            <div className="chat-header">
              <div className="chat-header-left">
                <span className="chat-header-icon">&#x2728;</span>
                <div>
                  <h3 className="chat-header-title">Crop Advisor</h3>
                  <span className="chat-header-sub">
                    {stateName ? `Focused on ${stateName}` : 'Powered by Gemini'}
                  </span>
                </div>
              </div>
              <button className="chat-close" onClick={toggleChat}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Messages */}
            <div className="chat-messages">
              {messages.map((msg, i) => (
                <div key={i} className={`chat-msg ${msg.role}`}>
                  {msg.role === 'assistant' && (
                    <span className="chat-msg-avatar">&#x2728;</span>
                  )}
                  <div className="chat-msg-bubble">
                    {msg.content.split('\n').map((line, j) => (
                      <p key={j}>{renderBold(line)}</p>
                    ))}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="chat-msg assistant">
                  <span className="chat-msg-avatar">&#x2728;</span>
                  <div className="chat-msg-bubble typing">
                    <span className="dot" /><span className="dot" /><span className="dot" />
                  </div>
                </div>
              )}

              {/* Suggestion chips — only show when few messages */}
              {messages.length <= 1 && !loading && (
                <div className="chat-suggestions">
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      className="chat-suggestion"
                      onClick={() => {
                        setInput(s);
                        setTimeout(() => inputRef.current?.focus(), 0);
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="chat-input-area">
              <textarea
                ref={inputRef}
                className="chat-input"
                placeholder="Ask about planting, yields, weather..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
              />
              <button
                className="chat-send"
                onClick={handleSend}
                disabled={!input.trim() || loading}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/** Simple markdown bold renderer: **text** → <strong>text</strong> */
function renderBold(text) {
  if (!text) return null;
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i}>{part}</strong> : part
  );
}
