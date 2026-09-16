import React, { useState, useRef, useEffect } from 'react';
import { voyaraAiApi } from '../../api/stayguide';
import { VoyaraRobotAvatar } from './VoyaraRobotAvatar';
import {
  Send,
  X,
  Minimize2,
  Maximize2,
  Sparkles,
  Loader2,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Dog,
  Baby,
  Cigarette,
  VolumeX,
  Users,
  PartyPopper,
  FileCheck,
  ArrowDown,
  User,
  BedDouble,
  Info,
  Layers,
  Calendar,
  IndianRupee,
} from 'lucide-react';

const QUICK_QUESTIONS = [
  { text: 'What amenities are available?', icon: Sparkles },
  { text: 'What are the child policies?', icon: Baby },
  { text: 'Is an extra bed available?', icon: BedDouble },
  { text: 'Is a baby cot available?', icon: Sparkles },
  { text: 'What are the check-in and check-out times?', icon: Clock },
  { text: 'What are the home rules?', icon: ShieldCheck },
  { text: 'Which rooms are available?', icon: Layers },
  { text: 'What is the cancellation policy?', icon: FileCheck },
];

export const VoyaraAIChat = ({
  propertyId,
  propertyName,
  propertyLoading = false,
  selectedRoomId = null,
  selectedRoomName = null,
  checkIn = null,
  checkOut = null,
  requestedRooms = 1,
  adults = 2,
  childrenCount = 0,
  childAges = [],
  cotRequested = false,
  extraBedRequested = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isBouncing, setIsBouncing] = useState(false);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);

  const getWelcomeText = (name, isLoading) => {
    if (isLoading) {
      return 'Let me load this property’s information for you.';
    }
    return `Hi! I’m Voyara AI – Property Information Assistant for ${name || 'this property'}. I can answer all questions about this property, its rooms, pricing, capacity, child policies, extra beds, amenities, check-in rules, and cancellation policies.`;
  };

  const [messages, setMessages] = useState([
    {
      id: 'welcome-msg',
      sender: 'assistant',
      text: getWelcomeText(propertyName, propertyLoading),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      ruleCategory: 'WELCOME',
    },
  ]);

  // When propertyId changes or propertyName loads from PostgreSQL, update or reset messages
  const prevPropertyIdRef = useRef(propertyId);
  useEffect(() => {
    if (prevPropertyIdRef.current !== propertyId) {
      prevPropertyIdRef.current = propertyId;
      setMessages([
        {
          id: `welcome-msg-${propertyId || Date.now()}`,
          sender: 'assistant',
          text: getWelcomeText(propertyName, propertyLoading),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          ruleCategory: 'WELCOME',
        },
      ]);
    } else {
      setMessages((prev) => {
        if (prev.length === 1 && prev[0].ruleCategory === 'WELCOME') {
          return [
            {
              ...prev[0],
              text: getWelcomeText(propertyName, propertyLoading),
            },
          ];
        }
        return prev;
      });
    }
  }, [propertyId, propertyName, propertyLoading]);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom();
    }
  }, [messages, isOpen, isMinimized]);

  const handleOpenClick = () => {
    setIsBouncing(true);
    setTimeout(() => {
      setIsBouncing(false);
      setIsOpen(true);
      setIsMinimized(false);
    }, 280);
  };

  const handleScrollToHomeRules = () => {
    const el = document.getElementById('property-home-rules') || document.querySelector('[data-testid="property-home-rules"]');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleSendMessage = async (queryText = null) => {
    const textToSend = (queryText || question).trim();
    if (!textToSend || loading) return;

    const userMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!queryText) setQuestion('');
    setLoading(true);

    try {
      const payload = {
        property_id: propertyId,
        room_id: selectedRoomId || undefined,
        question: textToSend,
        adults: adults || 2,
        children: childrenCount || 0,
        child_ages: childAges || [],
        requested_rooms: requestedRooms || 1,
        check_in: checkIn || undefined,
        check_out: checkOut || undefined,
        cot_requested: cotRequested || false,
        extra_bed_requested: extraBedRequested || false,
      };

      const response = await voyaraAiApi.askQuestion(payload);

      const aiMessage = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: response.answer,
        source: response.source,
        ruleReferences: response.rule_references || [],
        requiresStayPartnerConfirmation: response.requires_stay_partner_confirmation,
        availabilityChecked: response.availability_checked,
        bookingAllowed: response.booking_allowed,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (err) {
      const errorMessage = {
        id: `assistant-err-${Date.now()}`,
        sender: 'assistant',
        text: 'Sorry, I could not query the property information right now. Please refer directly to the Home Rules & Guest Policies section below or try again.',
        isError: true,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes voyaraBounceClick {
          0%, 100% { transform: scale(1) translateY(0); }
          30% { transform: scale(0.92) translateY(-12px); }
          60% { transform: scale(1.05) translateY(-4px); }
          80% { transform: scale(0.98) translateY(0); }
        }
        .voyara-btn-bounce {
          animation: voyaraBounceClick 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @media (prefers-reduced-motion: reduce) {
          .voyara-btn-bounce {
            animation: none !important;
          }
        }
      `}</style>

      {/* Floating Launcher Button */}
      {!isOpen && (
        <button
          type="button"
          data-testid="voyara-ai-button"
          onClick={handleOpenClick}
          className={`fixed bottom-6 right-6 z-40 pl-3 pr-5 py-2.5 bg-gradient-to-r from-[#065A63] via-[#087F8C] to-[#0A96A6] hover:from-[#087F8C] hover:to-[#065A63] text-white rounded-full shadow-2xl hover:shadow-teal-900/50 flex items-center space-x-3 transition-all cursor-pointer border-2 border-white/25 group select-none ${
            isBouncing ? 'voyara-btn-bounce' : 'hover:scale-105'
          }`}
          aria-label="Ask Voyara AI about this property"
        >
          <div className="relative shrink-0">
            <VoyaraRobotAvatar size={38} waving={true} animate={false} />
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-[#065A63] animate-pulse"></span>
          </div>
          <div className="text-left">
            <div className="flex items-center space-x-1.5">
              <span className="text-xs font-bold font-serif tracking-wide block">Ask Voyara AI</span>
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-[#F6C945] text-slate-900 leading-none uppercase">
                AI
              </span>
            </div>
            <span className="text-[10px] text-teal-100 block font-light">Ask about this property</span>
          </div>
        </button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div
          data-testid="voyara-ai-panel"
          className="fixed bottom-6 right-6 z-50 w-[92vw] max-w-sm sm:max-w-md bg-white dark:bg-[#0F273D] rounded-3xl border border-slate-200/90 dark:border-teal-900/50 shadow-2xl overflow-hidden flex flex-col transition-all duration-200 animate-in fade-in slide-in-from-bottom-6"
        >
          {/* Header */}
          <div className="relative bg-gradient-to-r from-[#06545D] via-[#086E78] to-[#0A808C] text-white pt-4 px-4 pb-7 overflow-hidden rounded-t-3xl select-none">
            <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />

            <div className="relative z-10 flex items-start justify-between">
              <div className="flex items-center space-x-3 pl-1">
                <div className="relative -mb-3 shrink-0 drop-shadow-lg transition-transform duration-300 hover:scale-105">
                  <VoyaraRobotAvatar size={52} waving={true} animate={true} />
                </div>

                <div className="space-y-0.5 max-w-[200px] sm:max-w-[260px]">
                  <h3 className="text-base font-bold font-serif text-white tracking-wide leading-tight">
                    Voyara AI – Property Information Assistant
                  </h3>
                  <div
                    data-testid="voyara-ai-property-context"
                    className="text-xs text-teal-100/95 font-medium truncate"
                    title={`Ask Voyara AI about: ${propertyName || 'Selected Property'}`}
                  >
                    Ask Voyara AI about: {propertyName || (propertyLoading ? 'Loading Property...' : 'This Property')}
                  </div>
                  {selectedRoomName && (
                    <div
                      data-testid="voyara-ai-room-context"
                      className="text-[11px] text-teal-200/90 font-light truncate"
                      title={`Room: ${selectedRoomName}`}
                    >
                      Room: {selectedRoomName}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons: Minimize & Close */}
              <div className="flex items-center space-x-1 pt-0.5">
                <button
                  type="button"
                  data-testid="voyara-ai-minimize"
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="p-1.5 rounded-xl hover:bg-white/15 text-white/90 transition-colors cursor-pointer"
                  title={isMinimized ? 'Expand' : 'Minimize'}
                >
                  {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  data-testid="voyara-ai-close"
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-xl hover:bg-white/15 text-white/90 transition-colors cursor-pointer"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Organic Bottom Wave Svg Divider */}
            <div className="absolute bottom-0 left-0 right-0 w-full overflow-hidden leading-none pointer-events-none">
              <svg
                viewBox="0 0 500 40"
                preserveAspectRatio="none"
                className="relative block w-full h-5 text-white dark:text-[#0F273D] fill-current"
              >
                <path d="M0,0 C140,35 340,-5 500,22 L500,40 L0,40 Z"></path>
              </svg>
            </div>
          </div>

          {/* Minimized Bar or Expanded Body */}
          {!isMinimized ? (
            <>
              {/* Messages Scroll Area */}
              <div className="p-4 overflow-y-auto max-h-[360px] min-h-[250px] space-y-3.5 bg-white dark:bg-[#0F273D]">
                {messages.map((msg) => {
                  const isAssistant = msg.sender === 'assistant';
                  return (
                    <div
                      key={msg.id}
                      className={`flex items-start space-x-2.5 ${isAssistant ? 'justify-start' : 'justify-end'}`}
                    >
                      {isAssistant && (
                        <div className="shrink-0 -mt-0.5">
                          <VoyaraRobotAvatar size={30} waving={false} />
                        </div>
                      )}

                      <div
                        data-testid="voyara-ai-message"
                        className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed space-y-1.5 ${
                          isAssistant
                            ? 'bg-[#EEF9FA] dark:bg-[#11384E] text-[#0C3246] dark:text-slate-100 border border-teal-100/70 dark:border-teal-900/40 rounded-tl-xs shadow-xs'
                            : 'bg-gradient-to-r from-[#F97316] to-[#EA580C] text-white rounded-tr-xs shadow-xs'
                        }`}
                      >
                        <p className="whitespace-pre-line">{msg.text}</p>

                        <span
                          className={`text-[9px] block text-right font-light ${
                            isAssistant ? 'text-teal-700/60 dark:text-teal-300/60' : 'text-orange-100'
                          }`}
                        >
                          {msg.timestamp}
                        </span>
                      </div>

                      {!isAssistant && (
                        <div className="w-7 h-7 rounded-xl bg-[#F97316] text-white flex items-center justify-center shrink-0 text-xs shadow-xs">
                          <User className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                  );
                })}

                {loading && (
                  <div className="flex items-start space-x-2.5">
                    <div className="shrink-0 -mt-0.5">
                      <VoyaraRobotAvatar size={30} waving={false} />
                    </div>
                    <div className="bg-[#EEF9FA] dark:bg-[#11384E] rounded-2xl rounded-tl-xs p-3 border border-teal-100/70 dark:border-teal-900/40 shadow-xs flex items-center space-x-2">
                      <Loader2 className="w-4 h-4 text-[#087F8C] animate-spin" />
                      <span className="text-xs text-[#0C3246] dark:text-slate-200">
                        Checking property details & availability...
                      </span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Quick Questions Chips Carousel */}
              <div className="px-3 py-2 bg-slate-50/70 dark:bg-[#0C2235] border-t border-slate-100 dark:border-slate-800 overflow-x-auto flex items-center space-x-2 scrollbar-none">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center space-x-1">
                  <Sparkles className="w-3 h-3 text-[#F6C945]" />
                  <span>Popular:</span>
                </span>
                {QUICK_QUESTIONS.map((qq, i) => {
                  const Icon = qq.icon;
                  return (
                    <button
                      key={i}
                      type="button"
                      data-testid="voyara-ai-quick-question"
                      disabled={loading}
                      onClick={() => handleSendMessage(qq.text)}
                      className="text-[11px] px-2.5 py-1.5 rounded-full bg-white dark:bg-[#0F273D] hover:bg-[#087F8C]/10 text-[#087F8C] dark:text-[#27B7A8] border border-[#087F8C]/25 shrink-0 transition-colors cursor-pointer disabled:opacity-50 flex items-center space-x-1 font-medium"
                    >
                      <Icon className="w-3 h-3" />
                      <span>{qq.text}</span>
                    </button>
                  );
                })}
              </div>

              {/* Home Rules Link Banner */}
              <div className="px-3 py-1.5 bg-teal-50/60 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center space-x-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#087F8C]" />
                  <span>Verified Property Information</span>
                </span>
                <button
                  type="button"
                  onClick={handleScrollToHomeRules}
                  className="text-[10px] font-bold text-[#087F8C] dark:text-[#27B7A8] hover:underline flex items-center space-x-0.5 cursor-pointer"
                >
                  <span>View Home Rules</span>
                  <ArrowDown className="w-3 h-3" />
                </button>
              </div>

              {/* Input Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="p-3 bg-white dark:bg-[#0F273D] border-t border-slate-100 dark:border-slate-800 flex items-center space-x-2"
              >
                <input
                  type="text"
                  data-testid="voyara-ai-input"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Ask about capacity, cots, extra beds, rooms, check-in..."
                  className="flex-1 px-3.5 py-2.5 bg-[#F8FAFC] dark:bg-[#091B29] border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-[#17324D] dark:text-white focus:outline-hidden focus:border-[#087F8C] placeholder:text-slate-400"
                />
                <button
                  type="submit"
                  data-testid="voyara-ai-send"
                  disabled={!question.trim() || loading}
                  className="w-9 h-9 rounded-xl bg-gradient-to-r from-[#087F8C] to-[#0A8F9E] hover:from-[#0A8F9E] hover:to-[#087F8C] text-white flex items-center justify-center transition-all shadow-sm disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed shrink-0"
                  aria-label="Send question to Voyara AI"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          ) : (
            <div className="p-3 bg-white dark:bg-[#0F273D] flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium flex items-center space-x-1.5">
                <VoyaraRobotAvatar size={20} />
                <span>Voyara AI is minimized</span>
              </span>
              <button
                type="button"
                onClick={() => setIsMinimized(false)}
                className="text-xs font-bold text-[#087F8C] dark:text-[#27B7A8] hover:underline cursor-pointer"
              >
                Open Chat
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default VoyaraAIChat;
