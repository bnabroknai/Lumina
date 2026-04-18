import React, { useState, useEffect, useRef } from 'react';
import Spline from '@splinetool/react-spline';
import { Mic, Send, MessageCircle, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from '@google/genai';

// Using a fallback public Spline scene that has a glassy/floating entity
// Change this to your exact Spline URL
const SPLINE_SCENE_URL = "https://prod.spline.design/6Wq1Q7YGyM-iab9i/scene.splinecode"; 

export default function App() {
  const [hasGreeted, setHasGreeted] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<{role: 'user' | 'lumina', text: string}[]>([
    { role: 'lumina', text: 'Hey cutie, what’s on your mind? ✨' }
  ]);
  const [isThinking, setIsThinking] = useState(false);
  const [isHoveringAvatar, setIsHoveringAvatar] = useState(false);
  const [isPulsing, setIsPulsing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<any>(null);
  const recognitionRef = useRef<any>(null);

  // Initialize Gemini Chat
  useEffect(() => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (apiKey) {
        const ai = new GoogleGenAI({ apiKey });
        chatRef.current = ai.chats.create({
          model: 'gemini-3-flash-preview',
          config: {
            systemInstruction: "You are Lumina, a cute, empathetic, and approachable AI companion. You have a warm, slightly breathy, and cheerful personality. Keep your responses conversational, short (1-3 sentences max), and natural for text-to-speech. Never use emojis in your text because they will be read aloud awkwardly.",
          }
        });
      }
    } catch (e) {
      console.error("Failed to initialize AI:", e);
    }
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    if (isChatOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isChatOpen]);

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.3; // Higher, cuter pitch
      
      const voices = window.speechSynthesis.getVoices();
      
      // Attempt to pick a premium/smooth female voice
      const preferredVoices = voices.filter(v => 
        v.name.includes('Samantha') || 
        v.name.includes('Victoria') || 
        v.name.includes('Google UK English Female') || 
        v.name.toLowerCase().includes('female')
      );
      
      if (preferredVoices.length > 0) {
        utterance.voice = preferredVoices[0];
      }

      window.speechSynthesis.speak(utterance);
    }
  };

  const handleInteraction = () => {
    // Add tactile pulse effect on background
    setIsPulsing(true);
    setTimeout(() => setIsPulsing(false), 400);

    if (!hasGreeted) {
      setHasGreeted(true);
      speak("Hey cutie, what's on your mind?");
      // Optionally open chat immediately when interacted
      setTimeout(() => setIsChatOpen(true), 2000);
    } else if (!isChatOpen && !window.speechSynthesis.speaking) {
      // Small acknowledgment sound if interacting while chat is closed & not already talking
      const acknowledgments = ["Mhmm?", "Yes?", "I'm right here.", "Still listening."];
      const randomAck = acknowledgments[Math.floor(Math.random() * acknowledgments.length)];
      speak(randomAck);
      setIsChatOpen(true);
    }
  };

  // Load voices proactively so they're ready when tapped
  useEffect(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
    }
  }, []);

  const sendMessage = async (textToProcess: string) => {
    if (!textToProcess.trim() || isThinking) return;
    
    setMessages(prev => [...prev, { role: 'user', text: textToProcess }]);
    setInputText('');
    setIsThinking(true);

    if (chatRef.current) {
      try {
        const response = await chatRef.current.sendMessage({ message: textToProcess });
        const responseText = response.text || "I'm not sure what to say.";
        
        setMessages(prev => [...prev, { role: 'lumina', text: responseText }]);
        speak(responseText);
      } catch (error) {
        console.error("Gemini Error:", error);
        const errorMsg = "Oops, my cosmic connection glitched. Try again?";
        setMessages(prev => [...prev, { role: 'lumina', text: errorMsg }]);
        speak(errorMsg);
      } finally {
        setIsThinking(false);
      }
    } else {
      // Fallback
      setTimeout(() => {
        const responseText = "I don't have an API key yet, but that sounds absolutely magical! Let's talk more about it.";
        setMessages(prev => [...prev, { role: 'lumina', text: responseText }]);
        speak(responseText);
        setIsThinking(false);
      }, 1200);
    }
  };

  const handleSendMessage = () => sendMessage(inputText);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice input is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognitionRef.current = recognition;

    recognition.onstart = () => setIsListening(true);
    
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((r: any) => r[0].transcript)
        .join('');
      setInputText(transcript);
      
      if (event.results[0].isFinal) {
        recognition.stop();
        setIsListening(false);
        sendMessage(transcript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  return (
    <main 
      className="relative w-full h-[100dvh] bg-[#0A0A1F] overflow-hidden flex flex-col items-center select-none"
    >
      {/* Background Glow */}
      <div 
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150vw] h-[150vw] sm:w-[90vw] sm:h-[90vw] rounded-full pointer-events-none transition-all duration-700 ease-out flex items-center justify-center
          ${isPulsing ? 'bg-indigo-400/25 blur-[60px] scale-110' : 
            isHoveringAvatar ? 'bg-indigo-500/15 blur-[80px] scale-105' : 'bg-indigo-500/10 blur-[100px] scale-100'}
        `} 
      />

      {/* Spline 3D Scene */}
      <div 
        className="absolute inset-0 z-0 pointer-events-auto cursor-pointer"
        onPointerEnter={() => setIsHoveringAvatar(true)}
        onPointerLeave={() => setIsHoveringAvatar(false)}
        onPointerDown={handleInteraction}
      >
        <Spline 
          scene={SPLINE_SCENE_URL} 
          className="w-full h-full object-cover transition-transform duration-500 ease-out"
          style={{ transform: isPulsing ? 'scale(0.98)' : 'scale(1)' }}
        />
      </div>

      {/* Header / Brand */}
      <div className="absolute top-0 left-0 w-full p-6 sm:p-8 z-10 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-400 drop-shadow-[0_0_10px_rgba(129,140,248,0.8)]" />
          <h1 className="text-white/90 text-2xl font-light tracking-wide text-shadow-glow flex items-center justify-center">
            Lumina
          </h1>
        </div>
        
        {/* Toggle Chat Button (top right) if we want to dismiss or show */}
        {!isChatOpen && hasGreeted && (
          <button 
            onClick={(e) => { e.stopPropagation(); setIsChatOpen(true); }}
            className="p-3 bg-white/5 backdrop-blur-md border border-white/10 rounded-full text-white pointer-events-auto hover:bg-white/10 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.05)]"
          >
            <MessageCircle className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Glassmorphic Chat Panel Bottom Overlay */}
      <AnimatePresence>
        {isChatOpen && (
          <motion.div 
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="absolute bottom-0 left-0 w-full z-20 pointer-events-auto"
            onClick={(e) => e.stopPropagation()} // Prevent triggering handleInteraction again
            onTouchStart={(e) => e.stopPropagation()}
          >
            <div className="w-full h-[55vh] sm:h-[50vh] sm:max-h-[500px] mx-auto bg-black/40 backdrop-blur-2xl border-t border-white/10 sm:border sm:rounded-t-3xl sm:mb-0 pb-safe shadow-[0_-20px_50px_rgba(0,0,0,0.5)] flex flex-col sm:max-w-xl">
              {/* Drag Handle to close */}
              <div 
                className="w-full flex justify-center pt-4 pb-3 cursor-pointer shrink-0"
                onClick={() => setIsChatOpen(false)}
              >
                <div className="w-12 h-1.5 bg-white/20 rounded-full" />
              </div>

              {/* Chat Scroll Area */}
              <div className="flex-1 overflow-y-auto px-4 pb-4 flex flex-col gap-4 custom-scrollbar">
                {messages.map((msg, i) => (
                  <div 
                    key={i} 
                    className={`flex flex-col max-w-[85%] ${msg.role === 'user' ? 'items-end self-end text-right' : 'items-start self-start text-left'}`}
                  >
                    <span className="text-xs font-medium text-white/40 mb-1 ml-1">{msg.role === 'user' ? 'You' : 'Lumina'}</span>
                    <div className={`px-4 py-3 text-sm leading-relaxed ${
                      msg.role === 'user' 
                        ? 'bg-indigo-600/90 text-white rounded-2xl rounded-br-sm shadow-md' 
                        : 'bg-white/10 text-white/90 rounded-2xl rounded-bl-sm border border-white/10 shadow-inner'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {isThinking && (
                  <div className="flex flex-col max-w-[85%] items-start self-start text-left">
                    <span className="text-xs font-medium text-white/40 mb-1 ml-1">Lumina</span>
                    <div className="px-4 py-4 text-sm leading-relaxed bg-white/10 text-white/90 rounded-2xl rounded-bl-sm border border-white/10 shadow-inner flex items-center gap-1.5 h-[44px]">
                      <span className="w-1.5 h-1.5 bg-white/50 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-white/50 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-white/50 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} className="h-1 shrink-0" />
              </div>

              {/* Chat Input */}
              <div className="p-4 pt-2 border-t border-white/10 shrink-0">
                <div className="relative flex items-center bg-white/5 border border-white/10 rounded-full pl-4 pr-1 py-1 overflow-hidden transition-all focus-within:bg-white/10 focus-within:border-white/20">
                  <input 
                    type="text" 
                    placeholder="Whisper something..." 
                    className="flex-1 bg-transparent border-none outline-none text-white text-sm placeholder:text-white/30 h-10"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSendMessage();
                    }}
                  />
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={toggleListening}
                      className={`p-2.5 transition-colors rounded-full ${isListening ? 'text-rose-400 bg-rose-500/20 animate-pulse' : 'text-white/50 hover:text-white/90'}`}
                      title="Dictate message"
                    >
                      <Mic className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={handleSendMessage}
                      className="p-2.5 bg-indigo-500/80 hover:bg-indigo-400 text-white rounded-full transition-all shadow-lg"
                    >
                      <Send className="w-4 h-4 translate-y-[1px] -translate-x-[1px]" />
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Helper text on first load if chat closed */}
      {!hasGreeted && !isChatOpen && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="absolute bottom-16 sm:bottom-12 left-1/2 -translate-x-1/2 text-white/40 text-sm tracking-wide pointer-events-none drop-shadow-md z-10 font-light"
        >
          Tap anywhere to interact
        </motion.div>
      )}

    </main>
  );
}
