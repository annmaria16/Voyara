import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { tripPlannerApi } from '../../api/tripPlanner';
import { TripPlannerMap } from '../../components/trip_planner/TripPlannerMap';
import { VoyaraRobotAvatar } from '../../components/ai/VoyaraRobotAvatar';
import { resolveImageUrl } from '../../utils/imageUrl';
import {
  Compass,
  MapPin,
  Calendar,
  Users,
  Building,
  Bookmark,
  RefreshCw,
  ArrowRight,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Clock,
  Car,
  Check,
  Eye,
  SlidersHorizontal,
  X,
  Map,
  ShieldCheck,
  CheckCircle2,
  Utensils,
  Camera,
  Bed,
  Sparkles,
  Share2,
  Trash2,
  Printer,
  Copy,
  Send,
  Star,
  MessageSquare,
  RotateCcw,
  History,
  Plus,
  ArrowUpDown,
  Filter,
  Info,
  CheckCheck
} from 'lucide-react';

const POPULAR_DESTINATION_CARDS = [
  {
    name: 'Munnar',
    state: 'Kerala',
    tagline: 'Mist, Tea Highlands & Waterfalls',
    weather: '18°C · Cool & Misty',
    img: 'https://images.unsplash.com/photo-1593693397690-362cb9666fc2?auto=format&fit=crop&w=600&q=80',
    prompt: 'Plan a 4-day family trip to Munnar for 2 adults and 1 child around ₹20,000.',
  },
  {
    name: 'Wayanad',
    state: 'Kerala',
    tagline: 'Rainforest Sanctuaries & Waterfalls',
    weather: '22°C · Pleasant & Green',
    img: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=600&q=80',
    prompt: 'Plan a 3-day romantic getaway to Wayanad with rainforest views.',
  },
  {
    name: 'Goa',
    state: 'West Coast',
    tagline: 'Golden Coast, Heritage & Sunsets',
    weather: '28°C · Tropical Breeze',
    img: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=600&q=80',
    prompt: 'Plan a 3-day beach trip to Goa for 2 adults under ₹25,000.',
  },
  {
    name: 'Jaipur',
    state: 'Rajasthan',
    tagline: 'Royal Forts, Palaces & Bazaars',
    weather: '26°C · Sunny & Clear',
    img: 'https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=600&q=80',
    prompt: 'Plan a 3-day heritage and food tour in Jaipur for 2 people.',
  },
];

export const TripPlanner = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Mode: 'CHAT' | 'SAVED_TRIPS'
  const [activeTab, setActiveTab] = useState('CHAT');

  // Mobile view switch: 'CONVERSATION' | 'PLAN'
  const [mobileView, setMobileView] = useState('CONVERSATION');

  // Chat Sessions Drawer (ChatGPT-like history)
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [chatSessions, setChatSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState(null);

  // Chat State
  const [messages, setMessages] = useState([
    {
      id: 'welcome-msg',
      sender: 'assistant',
      text: "Hello! I'm your personal Voyara travel planner. Tell me about the trip you're dreaming of — where you'd like to go, who's traveling, your preferred pace, or your budget. You don't need to fill out a long form; we'll shape it together naturally.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      suggestions: [
        'Plan a 4-day family trip to Munnar',
        'Romantic weekend in Wayanad',
        'Beach trip to Goa under ₹25,000',
        'Somewhere peaceful in Kerala'
      ],
      budgetAnalysis: null,
      planStatus: null,
    },
  ]);

  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentContext, setCurrentContext] = useState({});
  const [currentPlan, setCurrentPlan] = useState(null);
  const [latestBudgetAnalysis, setLatestBudgetAnalysis] = useState(null);

  // Stay Comparison & Selection State
  const [showStayComparisonModal, setShowStayComparisonModal] = useState(false);
  const [expandedPropertyId, setExpandedPropertyId] = useState(null);
  const [staySortBy, setStaySortBy] = useState('RECOMMENDED');
  const [stayTypeFilter, setStayTypeFilter] = useState('ALL');
  const [selectingStay, setSelectingStay] = useState(false);
  const [staySelectSuccessMsg, setStaySelectSuccessMsg] = useState('');

  // Map toggle
  const [showRouteMap, setShowRouteMap] = useState(true);

  // Saved Trips State
  const [savedTrips, setSavedTrips] = useState([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [savingTrip, setSavingTrip] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [copiedToast, setCopiedToast] = useState(false);

  // Day Regeneration State
  const [regenDayNumber, setRegenDayNumber] = useState(null);
  const [regenNotes, setRegenNotes] = useState('');
  const [regeneratingDay, setRegeneratingDay] = useState(false);
  const [activeDayTab, setActiveDayTab] = useState(1);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const staysCarouselRef = useRef(null);
  const experiencesCarouselRef = useRef(null);
  const placesCarouselRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Fetch Chat Sessions
  const loadChatSessions = async () => {
    if (!user) return;
    setLoadingSessions(true);
    try {
      const data = await tripPlannerApi.getSessions();
      setChatSessions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load chat sessions:', err);
    } finally {
      setLoadingSessions(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadChatSessions();
    }
  }, [user]);

  // Open Chat Session
  const handleOpenSession = async (sessionId) => {
    setLoading(true);
    try {
      const detail = await tripPlannerApi.getSessionDetails(sessionId);
      setCurrentSessionId(detail.id);
      setCurrentContext(detail.current_context || {});
      if (detail.current_plan_snapshot) {
        setCurrentPlan(detail.current_plan_snapshot);
        setActiveDayTab(1);
      } else {
        setCurrentPlan(null);
      }

      if (detail.messages && detail.messages.length > 0) {
        const mapped = detail.messages.map((m) => ({
          id: `db-msg-${m.id}`,
          sender: m.sender,
          text: m.text,
          timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          suggestions: m.suggestions || [],
          budgetAnalysis: m.budget_analysis,
          planStatus: m.plan_status,
          actionType: m.action_type,
          bookingPayload: m.booking_payload,
        }));
        setMessages(mapped);
      }
      setShowHistoryDrawer(false);
      setActiveTab('CHAT');
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to retrieve session.');
    } finally {
      setLoading(false);
    }
  };

  // Delete Session
  const handleDeleteSession = async (sessionId, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this conversation?')) return;
    try {
      await tripPlannerApi.deleteSession(sessionId);
      if (currentSessionId === sessionId) {
        handleResetConversation(false);
      }
      loadChatSessions();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete conversation.');
    }
  };

  // Start New Chat Session
  const handleStartNewSession = () => {
    handleResetConversation(false);
    setShowHistoryDrawer(false);
  };

  // Handle Sending a Message
  const handleSendMessage = async (textToSend = null) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || loading) return;

    const userMessageId = `user-${Date.now()}`;
    const newMsg = {
      id: userMessageId,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputMessage('');
    setLoading(true);

    try {
      const payload = {
        session_id: currentSessionId,
        message: text,
        current_context: currentContext,
        current_plan: currentPlan,
      };

      const res = await tripPlannerApi.chatTripPlanner(payload);

      if (res.session_id) {
        setCurrentSessionId(res.session_id);
      }

      // Handle direct booking action if bot decided to route to checkout
      if (res.action_type === 'PROCEED_TO_BOOKING' && res.booking_payload) {
        navigate('/booking', { state: res.booking_payload });
        return;
      }

      // Update current context
      if (res.trip_context) {
        setCurrentContext(res.trip_context);
      }

      // Update current plan if returned
      if (res.trip_plan) {
        setCurrentPlan(res.trip_plan);
        setActiveDayTab(1);
      }

      if (res.budget_analysis) {
        setLatestBudgetAnalysis(res.budget_analysis);
      }

      const assistantMessageId = `assistant-${Date.now()}`;
      const assistantMsg = {
        id: assistantMessageId,
        sender: 'assistant',
        text: res.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestions: res.suggested_actions || [],
        budgetAnalysis: res.budget_analysis,
        planStatus: res.plan_status,
        actionType: res.action_type,
        bookingPayload: res.booking_payload,
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // Refresh chat sessions list in background
      if (user) {
        loadChatSessions();
      }
    } catch (err) {
      console.error('Chat error:', err);
      const errorMsg = {
        id: `error-${Date.now()}`,
        sender: 'assistant',
        text: "I couldn't complete that plan right now. Please try again or rephrase your request.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestions: ['Try Again', 'Plan a 4-day trip to Munnar', 'Suggest a realistic budget'],
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Reset Conversation
  const handleResetConversation = (promptConfirm = true) => {
    if (promptConfirm && messages.length > 1) {
      if (!window.confirm('Start a fresh travel planning conversation?')) return;
    }
    setCurrentSessionId(null);
    setCurrentPlan(null);
    setCurrentContext({});
    setLatestBudgetAnalysis(null);
    setActiveDayTab(1);
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'assistant',
        text: "Hello! I'm your personal Voyara travel planner. Tell me about the trip you're dreaming of — where you'd like to go, who's traveling, your preferred pace, or your budget.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestions: [
          'Plan a 4-day family trip to Munnar',
          'Romantic weekend in Wayanad',
          'Beach trip to Goa under ₹25,000',
          'Somewhere peaceful in Kerala'
        ],
      },
    ]);
  };

  // Stay / Room Selection Handler
  const handleSelectStayAndRoom = async (propertyId, roomId) => {
    if (!currentPlan) return;
    setSelectingStay(true);
    setStaySelectSuccessMsg('');

    try {
      const payload = {
        session_id: currentSessionId,
        current_plan: currentPlan,
        property_id: propertyId,
        room_id: roomId,
        current_context: currentContext,
      };

      const updatedPlan = await tripPlannerApi.selectStay(payload);
      setCurrentPlan(updatedPlan);

      const propName = updatedPlan.stay?.property_name || 'Selected Property';
      const roomName = updatedPlan.stay?.room_name || '';
      setStaySelectSuccessMsg(`${propName} (${roomName})`);
      setShowStayComparisonModal(false);

      const notifyMsg = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: `I've updated your trip accommodation to **${propName}** (${roomName}). Your daily itinerary timings, travel distances, and total budget have been refreshed!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestions: ['Proceed to book stay', 'Make it cheaper', 'Save this trip'],
        planStatus: updatedPlan.pricing_summary?.budget_status,
      };
      setMessages((prev) => [...prev, notifyMsg]);

      setTimeout(() => setStaySelectSuccessMsg(''), 4000);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to select accommodation.');
    } finally {
      setSelectingStay(false);
    }
  };

  // Save Trip Handler
  const handleSaveTrip = async () => {
    if (!currentPlan) return;
    setSavingTrip(true);
    setSaveSuccessMsg('');
    try {
      const tripTitle = `${currentPlan.trip.destination} Journey`;
      await tripPlannerApi.saveTrip({
        name: tripTitle,
        plan: currentPlan,
      });
      setSaveSuccessMsg('Trip saved to your planned journeys collection!');
      loadSavedTrips();
    } catch (err) {
      alert(err.response?.data?.detail || 'Please sign in to save your trip plan.');
    } finally {
      setSavingTrip(false);
    }
  };

  // Load Saved Trips
  const loadSavedTrips = async () => {
    setLoadingSaved(true);
    try {
      const data = await tripPlannerApi.getMyTrips();
      setSavedTrips(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load saved trips:', err);
    } finally {
      setLoadingSaved(false);
    }
  };

  // Open Saved Trip Details
  const handleOpenSavedTrip = async (tripId) => {
    setLoadingSaved(true);
    try {
      const detail = await tripPlannerApi.getTripDetails(tripId);
      setCurrentPlan(detail.full_plan);
      setActiveDayTab(1);
      setActiveTab('CHAT');
      setMobileView('PLAN');
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to retrieve saved trip.');
    } finally {
      setLoadingSaved(false);
    }
  };

  // Delete Saved Trip
  const handleDeleteSavedTrip = async (tripId, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to remove this saved trip?')) return;
    try {
      await tripPlannerApi.deleteTrip(tripId);
      loadSavedTrips();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete saved trip.');
    }
  };

  // Regenerate Day Handler
  const handleRegenerateDaySubmit = async () => {
    if (!currentPlan || !regenDayNumber) return;
    setRegeneratingDay(true);
    try {
      const updatedPlan = await tripPlannerApi.regenerateDay({
        plan: currentPlan,
        day_number: regenDayNumber,
        user_notes: regenNotes || null,
      });
      setCurrentPlan(updatedPlan);
      setRegenDayNumber(null);
      setRegenNotes('');
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to refresh day.');
    } finally {
      setRegeneratingDay(false);
    }
  };

  // Direct Booking Navigation
  const handleBookStayDirect = () => {
    if (!currentPlan || !currentPlan.stay) return;
    const stay = currentPlan.stay;
    const exp = currentPlan.experiences?.[0];

    const bookingPayload = {
      property_id: stay.property_id,
      property_name: stay.property_name,
      property_type: stay.property_type,
      property_city: stay.city,
      room_id: stay.room_id,
      room_name: stay.room_name,
      room_price: stay.price_per_night,
      room_quantity: 1,
      check_in: currentPlan.trip.start_date,
      check_out: currentPlan.trip.end_date,
      nights: stay.total_nights,
      guests: currentPlan.trip.adults + currentPlan.trip.children,
      adults: currentPlan.trip.adults,
      children: currentPlan.trip.children,
      child_ages: currentPlan.trip.child_ages,
      room_subtotal: stay.room_subtotal,
      children_subtotal: stay.child_charge_subtotal,
      total_amount: currentPlan.pricing_summary.known_cost,
    };

    if (exp) {
      bookingPayload.experience_id = exp.experience_id;
      bookingPayload.experience_title = exp.title;
      bookingPayload.experience_price = exp.price;
      bookingPayload.experience_pricing_model = exp.pricing_model;
      bookingPayload.experience_participants = exp.participants;
      bookingPayload.experience_subtotal = exp.total_experience_cost;
    }

    navigate('/booking', { state: bookingPayload });
  };

  // Copy Itinerary Text Summary
  const handleShareItinerary = () => {
    if (!currentPlan) return;
    const text = `✨ Voyara Travel Itinerary: ${currentPlan.trip.destination} (${currentPlan.trip.total_days} Days, ${currentPlan.trip.total_nights} Nights)\n🏨 Stay: ${currentPlan.stay?.property_name || 'Sanctuary'} - ${currentPlan.stay?.room_name || ''}\n💰 Estimated Known Cost: ₹${currentPlan.pricing_summary.known_cost.toLocaleString('en-IN')}\n\nPlanned with Voyara.`;
    navigator.clipboard.writeText(text);
    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 2500);
  };

  // Print / PDF Itinerary
  const handlePrintItinerary = () => {
    window.print();
  };

  useEffect(() => {
    if (activeTab === 'SAVED_TRIPS') {
      loadSavedTrips();
    }
  }, [activeTab]);

  // Filter & Sort Available Stays
  const filteredAvailableStays = (currentPlan?.available_stays || []).filter((prop) => {
    if (stayTypeFilter === 'ALL') return true;
    return prop.property_type.toLowerCase() === stayTypeFilter.toLowerCase();
  }).sort((a, b) => {
    if (staySortBy === 'PRICE_ASC') return a.starting_price_per_night - b.starting_price_per_night;
    if (staySortBy === 'RATING_DESC') return (b.rating || 0) - (a.rating || 0);
    return 0; // Default RECOMMENDED
  });

  const scrollCarousel = (ref, direction) => {
    if (ref.current) {
      const scrollAmount = direction === 'left' ? -280 : 280;
      ref.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden space-y-3">
      {/* 1. Header Navigation Bar (Compact) */}
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E0ECEF] dark:border-white/10 pb-2.5">
        <div className="flex items-center space-x-3">
          <div className="relative shrink-0">
            <VoyaraRobotAvatar size={36} waving={true} animate={true} />
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-[#091B29]" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#17324D] dark:text-white leading-tight">
              Plan Your Journey
            </h1>
            <p className="text-[11px] text-[#607080] dark:text-slate-400 font-light hidden sm:block">
              Conversational travel studio with live sanctuary comparison & verified itineraries.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-center shrink-0">
          {user && (
            <button
              type="button"
              onClick={() => setShowHistoryDrawer(true)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 bg-white dark:bg-[#0F273D] text-[#17324D] dark:text-slate-300 border border-[#E0ECEF] dark:border-white/10 hover:bg-slate-50 dark:hover:bg-slate-800"
              title="Trip History"
            >
              <History className="w-3.5 h-3.5 text-[#087F8C]" />
              <span>Trip History</span>
              {chatSessions.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-[#087F8C]/15 text-[#087F8C] text-[9px] font-mono font-bold">
                  {chatSessions.length}
                </span>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveTab('CHAT')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'CHAT'
                ? 'bg-gradient-to-r from-[#087F8C] to-[#0F9D9A] text-white shadow-sm'
                : 'bg-white dark:bg-[#0F273D] text-[#17324D] dark:text-slate-300 border border-[#E0ECEF] dark:border-white/10 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Trip Planner</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('SAVED_TRIPS')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'SAVED_TRIPS'
                ? 'bg-gradient-to-r from-[#087F8C] to-[#0F9D9A] text-white shadow-sm'
                : 'bg-white dark:bg-[#0F273D] text-[#17324D] dark:text-slate-300 border border-[#E0ECEF] dark:border-white/10 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Saved Plans</span>
            {savedTrips.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-orange-500 text-white text-[9px] font-mono font-bold">
                {savedTrips.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleResetConversation(true)}
            className="p-1.5 rounded-xl text-slate-400 hover:text-[#087F8C] bg-white dark:bg-[#0F273D] border border-[#E0ECEF] dark:border-white/10 cursor-pointer"
            title="Start New Journey"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. MODE: CONVERSATIONAL SPLIT STUDIO (FIXED VIEWPORT) */}
      {activeTab === 'CHAT' && (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden space-y-2">
          {/* Mobile Tab Switcher */}
          <div className="shrink-0 flex lg:hidden items-center justify-between p-1 bg-slate-100 dark:bg-[#0F273D] rounded-2xl border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setMobileView('CONVERSATION')}
              className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
                mobileView === 'CONVERSATION'
                  ? 'bg-white dark:bg-[#091B29] text-[#087F8C] dark:text-[#27B7A8] shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Conversation</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileView('PLAN')}
              className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 relative ${
                mobileView === 'PLAN'
                  ? 'bg-white dark:bg-[#091B29] text-[#087F8C] dark:text-[#27B7A8] shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <Map className="w-3.5 h-3.5" />
              <span>Your Journey {currentPlan ? '✓' : ''}</span>
              {currentPlan && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 absolute top-2 right-4" />
              )}
            </button>
          </div>

          {/* MAIN TWO-PANEL WORKSPACE WITH INDEPENDENT SCROLLING */}
          <div className="flex-1 min-h-0 overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
            {/* LEFT COLUMN: CHAT STREAM (lg:col-span-5) */}
            <div
              className={`lg:col-span-5 flex flex-col h-full min-h-0 bg-white dark:bg-[#0F273D] rounded-3xl border border-[#E0ECEF] dark:border-white/10 shadow-xs overflow-hidden ${
                mobileView === 'PLAN' ? 'hidden lg:flex' : 'flex'
              }`}
            >
              {/* Chat Header */}
              <div className="shrink-0 px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-[#091B29]/40">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-full bg-[#087F8C]/15 text-[#087F8C] dark:text-[#27B7A8] flex items-center justify-center font-bold text-xs">
                    <Compass className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-xs font-bold text-[#17324D] dark:text-white">
                    Voyara Travel Planner
                  </h3>
                </div>
                <div className="flex items-center space-x-1.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Live & Adaptive</span>
                </div>
              </div>

              {/* Chat Messages Scroll Container */}
              <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-3.5 scrollbar-thin">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col space-y-1.5 ${
                      msg.sender === 'user' ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div className="flex items-end space-x-2 max-w-[90%]">
                      {msg.sender === 'assistant' && (
                        <div className="shrink-0 mb-1">
                          <VoyaraRobotAvatar size={24} animate={false} />
                        </div>
                      )}

                      <div
                        className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                          msg.sender === 'user'
                            ? 'bg-[#087F8C] text-white rounded-br-xs shadow-xs'
                            : 'bg-slate-100 dark:bg-[#091B29] text-[#17324D] dark:text-slate-100 border border-slate-200/60 dark:border-slate-800 rounded-bl-xs'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                      </div>
                    </div>

                    {/* Contextual Budget Note if available */}
                    {msg.sender === 'assistant' && msg.budgetAnalysis && msg.budgetAnalysis.why_higher_explanation && (
                      <div className="max-w-[85%] ml-8 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 space-y-1">
                        <div className="flex items-center space-x-1 text-amber-800 dark:text-amber-300 font-bold text-[10px]">
                          <Info className="w-3 h-3" />
                          <span>Budget Analysis:</span>
                        </div>
                        <p className="text-[10px] text-slate-600 dark:text-slate-300 font-light">
                          {msg.budgetAnalysis.why_higher_explanation}
                        </p>
                      </div>
                    )}

                    {/* Contextual Suggestion Chips */}
                    {msg.sender === 'assistant' && msg.suggestions && msg.suggestions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-0.5 ml-8 max-w-[90%]">
                        {msg.suggestions.map((sug, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => handleSendMessage(sug)}
                            className="px-2.5 py-1 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-[#087F8C] hover:text-white dark:hover:bg-[#087F8C] text-slate-700 dark:text-slate-300 text-[10px] font-semibold transition-all cursor-pointer border border-slate-200/80 dark:border-slate-700"
                          >
                            {sug}
                          </button>
                        ))}
                      </div>
                    )}

                    <span className="text-[9px] text-slate-400 font-mono px-2">
                      {msg.timestamp}
                    </span>
                  </div>
                ))}

                {loading && (
                  <div className="flex items-center space-x-2 text-slate-400 p-2 text-xs">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#087F8C]" />
                    <span className="italic">Voyara is checking real accommodations & shaping your plan...</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input Composer (Pinned to Bottom) */}
              <div className="shrink-0 p-3 border-t border-slate-100 dark:border-slate-800 bg-[#FFFDF7] dark:bg-[#091B29] space-y-1.5">
                <div className="relative flex items-center">
                  <textarea
                    ref={textareaRef}
                    rows={2}
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Tell me about the trip you're dreaming of..."
                    className="w-full py-2 pl-3 pr-10 bg-white dark:bg-[#0F273D] border border-slate-200 dark:border-slate-700 rounded-2xl text-xs text-[#17324D] dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:border-[#087F8C] resize-none shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => handleSendMessage()}
                    disabled={!inputMessage.trim() || loading}
                    className="absolute right-2 w-7 h-7 rounded-xl bg-gradient-to-r from-[#087F8C] to-[#0F9D9A] hover:opacity-90 disabled:opacity-40 text-white flex items-center justify-center transition-all cursor-pointer shadow-xs"
                  >
                    <Send className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 px-1 font-light">
                  <span>Enter to send · Shift+Enter for newline</span>
                  {currentContext.destination && (
                    <span className="font-mono text-[#087F8C] font-semibold">
                      📍 {currentContext.destination} ({currentContext.duration_days || 4}d)
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: LIVE VISUAL JOURNEY STUDIO (lg:col-span-7) */}
            <div
              className={`lg:col-span-7 flex flex-col h-full min-h-0 bg-white dark:bg-[#0F273D] rounded-3xl border border-[#E0ECEF] dark:border-white/10 shadow-xs overflow-hidden ${
                mobileView === 'CONVERSATION' ? 'hidden lg:flex' : 'flex'
              }`}
            >
              {currentPlan ? (
                <>
                  {/* Sticky Journey Summary Header */}
                  <div className="shrink-0 px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 bg-slate-50/80 dark:bg-[#091B29]/60 backdrop-blur-md z-10">
                    <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                      <span className="px-2.5 py-0.5 rounded-full bg-[#087F8C] text-white text-[10px] font-bold uppercase font-mono truncate">
                        {currentPlan.trip.destination}
                      </span>
                      <span className="text-xs font-bold text-[#17324D] dark:text-white">
                        {currentPlan.trip.total_days} Days · {currentPlan.trip.total_nights} Nights
                      </span>
                      <span className="text-[11px] text-slate-500 font-light hidden sm:inline">
                        ({currentPlan.trip.adults} Adults {currentPlan.trip.children > 0 ? `· ${currentPlan.trip.children} Kid` : ''})
                      </span>
                    </div>

                    <div className="flex items-center space-x-1.5 shrink-0">
                      <div className="text-right mr-1 hidden sm:block">
                        <span className="text-[9px] text-slate-400 font-mono block">Known Cost</span>
                        <span className="text-xs font-mono font-bold text-[#087F8C] dark:text-[#27B7A8]">
                          ₹{currentPlan.pricing_summary.known_cost.toLocaleString('en-IN')}
                        </span>
                      </div>

                      {currentPlan.stay && (
                        <button
                          type="button"
                          onClick={handleBookStayDirect}
                          className="px-3 py-1.5 bg-gradient-to-r from-orange-500 to-[#EA580C] hover:opacity-90 text-white font-bold rounded-xl text-xs flex items-center space-x-1 shadow-xs cursor-pointer transition-all"
                        >
                          <span>Book Stay</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={handleSaveTrip}
                        disabled={savingTrip}
                        className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer"
                        title="Save Trip"
                      >
                        <Bookmark className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={handleShareItinerary}
                        className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer"
                        title="Share Summary"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={handlePrintItinerary}
                        className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer"
                        title="Print Itinerary"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Scrollable Travel Journal Content */}
                  <div className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-5 space-y-5 scrollbar-thin">
                    {saveSuccessMsg && (
                      <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs flex items-center justify-between shadow-xs">
                        <div className="flex items-center space-x-2 font-bold">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>{saveSuccessMsg}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveTab('SAVED_TRIPS')}
                          className="underline font-semibold cursor-pointer"
                        >
                          View in Saved Plans →
                        </button>
                      </div>
                    )}

                    {staySelectSuccessMsg && (
                      <div className="p-3 rounded-2xl bg-teal-50 dark:bg-teal-950/50 border border-teal-300 dark:border-teal-800 text-[#087F8C] dark:text-teal-200 text-xs font-bold flex items-center space-x-2">
                        <Check className="w-4 h-4" />
                        <span>{staySelectSuccessMsg} updated in your itinerary!</span>
                      </div>
                    )}

                    {copiedToast && (
                      <div className="p-3 rounded-2xl bg-teal-50 dark:bg-teal-950/50 border border-teal-300 dark:border-teal-800 text-[#087F8C] dark:text-teal-200 text-xs font-bold flex items-center space-x-2">
                        <Check className="w-4 h-4" />
                        <span>Itinerary summary copied to clipboard!</span>
                      </div>
                    )}

                    {/* Compact Destination Hero Banner */}
                    <div className="relative rounded-2xl overflow-hidden text-white shadow-sm border border-slate-200/50 dark:border-white/10 h-36 sm:h-40 flex flex-col justify-end p-4 group">
                      <img
                        src={currentPlan.destination_info?.hero_image || 'https://images.unsplash.com/photo-1593693397690-362cb9666fc2?auto=format&fit=crop&w=1200&q=80'}
                        alt={currentPlan.trip.destination}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#091B29] via-[#091B29]/60 to-transparent" />

                      <div className="relative z-10 space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-full bg-orange-500 text-white text-[9px] font-bold uppercase">
                            {currentPlan.trip.travel_style.replace('_', ' ')} Pacing
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-xs text-white text-[9px] font-semibold">
                            {currentPlan.destination_info?.weather_note || 'Ideal Season'}
                          </span>
                        </div>
                        <h2 className="text-xl sm:text-2xl font-serif font-bold leading-tight">
                          {currentPlan.trip.destination} Journey
                        </h2>
                        <p className="text-[11px] text-slate-200 font-light line-clamp-1">
                          {currentPlan.destination_info?.tagline || currentPlan.explanation}
                        </p>
                      </div>
                    </div>

                    {/* SECTION: YOUR STAY */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Your Selected Stay
                        </span>
                        {currentPlan.available_stays && currentPlan.available_stays.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setShowStayComparisonModal(true)}
                            className="text-[11px] font-bold text-[#087F8C] hover:underline cursor-pointer flex items-center space-x-1"
                          >
                            <span>Compare {currentPlan.available_stays.length} Stays</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      {currentPlan.stay ? (
                        <div className="p-3.5 rounded-2xl bg-[#FFFDF7] dark:bg-[#091B29] border border-teal-500/20 shadow-2xs space-y-3">
                          <div className="flex flex-col sm:flex-row gap-3">
                            <img
                              src={
                                resolveImageUrl(currentPlan.stay.image_url) ||
                                'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=500&q=80'
                              }
                              alt={currentPlan.stay.property_name}
                              className="w-full sm:w-36 h-24 object-cover rounded-xl border border-slate-200/60 dark:border-slate-700 shrink-0"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=500&q=80';
                              }}
                            />

                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                                  <ShieldCheck className="w-2.5 h-2.5 text-emerald-600" />
                                  <span>Verified Sanctuary</span>
                                </span>
                                <span className="text-[10px] font-mono text-slate-400">
                                  {currentPlan.stay.total_nights} Nights
                                </span>
                              </div>

                              <h4 className="text-xs font-bold text-[#17324D] dark:text-white truncate">
                                {currentPlan.stay.property_name}
                              </h4>
                              <p className="text-[11px] text-slate-500 truncate">
                                {currentPlan.stay.room_name} • {currentPlan.stay.city}
                              </p>

                              <div className="flex items-center justify-between pt-1">
                                <div className="flex items-baseline space-x-1">
                                  <span className="text-sm font-mono font-bold text-[#087F8C] dark:text-[#27B7A8]">
                                    ₹{currentPlan.stay.price_per_night.toLocaleString('en-IN')}
                                  </span>
                                  <span className="text-[10px] text-slate-400">/ night</span>
                                </div>

                                <div className="flex items-center space-x-1.5">
                                  <Link
                                    to={`/properties/${currentPlan.stay.property_id}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 text-[10px] font-bold transition-all flex items-center space-x-1"
                                  >
                                    <Eye className="w-3 h-3" />
                                    <span>View</span>
                                  </Link>

                                  <button
                                    type="button"
                                    onClick={handleBookStayDirect}
                                    className="px-3 py-1 rounded-xl bg-[#087F8C] text-white text-[10px] font-bold hover:opacity-90 cursor-pointer shadow-2xs"
                                  >
                                    Book Stay
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>

                          {currentPlan.stay.why_this_stay && (
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 italic bg-white/70 dark:bg-[#0F273D]/70 p-2 rounded-xl border border-slate-100 dark:border-slate-800/80">
                              <span className="font-bold text-[#17324D] dark:text-white not-italic">Why this stay: </span>
                              {currentPlan.stay.why_this_stay}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-dashed border-amber-300 dark:border-amber-800 text-xs text-slate-600 dark:text-slate-300">
                          <span className="font-bold text-amber-700 dark:text-amber-400 block mb-0.5">Custom Itinerary Prepared</span>
                          We've mapped your sights and activities. You can select a verified sanctuary from nearby regions or explore options below.
                        </div>
                      )}

                      {/* Horizontal Carousel of Other Available Stays */}
                      {currentPlan.available_stays && currentPlan.available_stays.length > 1 && (
                        <div className="space-y-2 pt-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-slate-700 dark:text-slate-300">
                              Available Stay Options ({currentPlan.available_stays.length})
                            </span>
                            <div className="flex items-center space-x-1">
                              <button
                                type="button"
                                onClick={() => scrollCarousel(staysCarouselRef, 'left')}
                                className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 cursor-pointer"
                              >
                                <ChevronLeft className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => scrollCarousel(staysCarouselRef, 'right')}
                                className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 cursor-pointer"
                              >
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div
                            ref={staysCarouselRef}
                            className="flex space-x-3 overflow-x-auto pb-2 scrollbar-thin scroll-smooth"
                          >
                            {filteredAvailableStays.map((prop) => {
                              const isSelected = currentPlan.stay && currentPlan.stay.property_id === prop.property_id;

                              return (
                                <div
                                  key={prop.property_id}
                                  className={`w-60 shrink-0 p-3 rounded-2xl border transition-all flex flex-col justify-between space-y-2.5 ${
                                    isSelected
                                      ? 'bg-teal-50/50 dark:bg-teal-950/30 border-[#087F8C] shadow-xs'
                                      : 'bg-white dark:bg-[#091B29] border-slate-200/80 dark:border-slate-800 hover:border-[#087F8C]'
                                  }`}
                                >
                                  <div className="space-y-2">
                                    <div className="relative h-28 w-full rounded-xl overflow-hidden">
                                      <img
                                        src={resolveImageUrl(prop.image_url) || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=500&q=80'}
                                        alt={prop.property_name}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                          e.target.onerror = null;
                                          e.target.src = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=500&q=80';
                                        }}
                                      />
                                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-[#17324D]/80 backdrop-blur-xs text-white text-[9px] font-bold">
                                        {prop.property_type}
                                      </span>
                                      {prop.rating > 0 && (
                                        <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center space-x-0.5">
                                          <Star className="w-2.5 h-2.5 fill-current" />
                                          <span>{prop.rating.toFixed(1)}</span>
                                        </span>
                                      )}
                                    </div>

                                    <div>
                                      <h4 className="text-xs font-bold text-[#17324D] dark:text-white truncate">
                                        {prop.property_name}
                                      </h4>
                                      <p className="text-[10px] text-slate-500 truncate">{prop.city}, {prop.state}</p>
                                    </div>

                                    <div className="flex items-baseline justify-between text-[11px] pt-0.5">
                                      <span className="text-slate-400 text-[9px]">Starting</span>
                                      <span className="font-mono font-bold text-[#087F8C] dark:text-[#27B7A8]">
                                        ₹{prop.starting_price_per_night.toLocaleString('en-IN')}/nt
                                      </span>
                                    </div>
                                  </div>

                                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1">
                                    <Link
                                      to={`/properties/${prop.property_id}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="p-1 text-slate-500 hover:text-[#087F8C] text-[10px] font-bold flex items-center space-x-0.5"
                                    >
                                      <Eye className="w-3 h-3" />
                                      <span>Details</span>
                                    </Link>

                                    <button
                                      type="button"
                                      onClick={() => handleSelectStayAndRoom(prop.property_id, prop.selected_room_id)}
                                      disabled={selectingStay || isSelected}
                                      className={`px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all cursor-pointer flex items-center space-x-1 ${
                                        isSelected
                                          ? 'bg-[#087F8C] text-white shadow-2xs'
                                          : 'bg-orange-500 hover:bg-orange-600 text-white shadow-2xs'
                                      }`}
                                    >
                                      {isSelected ? (
                                        <>
                                          <Check className="w-3 h-3" />
                                          <span>Chosen</span>
                                        </>
                                      ) : (
                                        <span>Choose Stay</span>
                                      )}
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* SECTION: DAILY TRAVEL JOURNAL (COMPACT TIMELINE) */}
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E0ECEF] dark:border-white/10 pb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Daily Travel Journal
                        </span>

                        {/* Day Selector Tabs */}
                        <div className="flex flex-wrap gap-1">
                          {currentPlan.days.map((d) => (
                            <button
                              key={d.day_number}
                              type="button"
                              onClick={() => setActiveDayTab(d.day_number)}
                              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                                activeDayTab === d.day_number
                                  ? 'bg-orange-500 text-white shadow-xs'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                              }`}
                            >
                              Day {d.day_number}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Active Day Card & Timeline */}
                      {(() => {
                        const activeDay =
                          currentPlan.days.find((d) => d.day_number === activeDayTab) || currentPlan.days[0];
                        if (!activeDay) return null;

                        return (
                          <div className="p-4 rounded-2xl bg-white dark:bg-[#091B29] border border-slate-200/80 dark:border-slate-800 space-y-3.5 shadow-xs">
                            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                              <div>
                                <span className="text-[10px] font-mono font-bold uppercase text-orange-600">
                                  {activeDay.date}
                                </span>
                                <h4 className="text-xs font-serif font-bold text-[#17324D] dark:text-white">
                                  {activeDay.theme}
                                </h4>
                              </div>

                              <button
                                type="button"
                                onClick={() => setRegenDayNumber(activeDay.day_number)}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-[10px] flex items-center space-x-1 cursor-pointer transition-all"
                              >
                                <RefreshCw className="w-3 h-3 text-orange-500" />
                                <span>Refresh Day</span>
                              </button>
                            </div>

                            {/* Timeline Items */}
                            <div className="relative pl-3 space-y-2.5 before:absolute before:left-1 before:top-2 before:bottom-2 before:w-0.5 before:bg-teal-500/20">
                              {activeDay.items.map((item, idx) => (
                                <div
                                  key={idx}
                                  className="relative p-2.5 rounded-xl bg-[#FFFDF7] dark:bg-[#0F273D] border border-slate-200/60 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:border-[#087F8C]/40 transition-all shadow-2xs"
                                >
                                  <div className="flex items-start space-x-2.5 min-w-0 flex-1">
                                    {/* Item Photo if Available */}
                                    {item.photo_url ? (
                                      <img
                                        src={resolveImageUrl(item.photo_url)}
                                        alt={item.title}
                                        className="w-12 h-12 object-cover rounded-lg border border-slate-200/60 dark:border-slate-700 shrink-0"
                                        onError={(e) => {
                                          e.target.style.display = 'none';
                                        }}
                                      />
                                    ) : (
                                      <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex flex-col items-center justify-center text-[9px] font-mono font-bold text-slate-600 dark:text-slate-300 shrink-0">
                                        <span>{item.start_time.split(' ')[0]}</span>
                                      </div>
                                    )}

                                    <div className="space-y-0.5 min-w-0 flex-1">
                                      <div className="flex flex-wrap items-center gap-1">
                                        <span className="text-[9px] font-mono font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded">
                                          {item.start_time} - {item.end_time}
                                        </span>
                                        <h5 className="text-xs font-bold text-[#17324D] dark:text-white truncate">
                                          {item.title}
                                        </h5>
                                        {item.item_type === 'STAY_CHECKIN' && (
                                          <span className="px-1.5 py-0.2 rounded text-[8px] font-bold bg-teal-500/15 text-[#087F8C]">
                                            Check-in
                                          </span>
                                        )}
                                        {item.item_type === 'STAY_CHECKOUT' && (
                                          <span className="px-1.5 py-0.2 rounded text-[8px] font-bold bg-amber-500/15 text-amber-600">
                                            Check-out
                                          </span>
                                        )}
                                        {item.item_type === 'VOYARA_EXPERIENCE' && (
                                          <span className="px-1.5 py-0.2 rounded text-[8px] font-bold bg-purple-500/15 text-purple-600">
                                            Experience
                                          </span>
                                        )}
                                      </div>

                                      <p className="text-[10px] text-slate-600 dark:text-slate-400 font-light leading-snug line-clamp-2">
                                        {item.description}
                                      </p>

                                      {item.distance_km > 0 && (
                                        <div className="flex items-center space-x-1.5 text-[8px] text-slate-400 font-mono pt-0.5">
                                          <Car className="w-2.5 h-2.5 text-orange-500" />
                                          <span>~{item.distance_km} km</span>
                                          <span>•</span>
                                          <span>~{item.travel_time_minutes} mins travel</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {item.pricing_note && (
                                    <span className="text-[10px] font-mono font-bold text-[#087F8C] dark:text-[#27B7A8] shrink-0 text-right">
                                      {item.pricing_note}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* SECTION: EXPERIENCES CAROUSEL */}
                    {currentPlan.experiences && currentPlan.experiences.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                            <span>Verified Regional Experiences</span>
                          </span>
                          <div className="flex items-center space-x-1">
                            <button
                              type="button"
                              onClick={() => scrollCarousel(experiencesCarouselRef, 'left')}
                              className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 cursor-pointer"
                            >
                              <ChevronLeft className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => scrollCarousel(experiencesCarouselRef, 'right')}
                              className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 cursor-pointer"
                            >
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div
                          ref={experiencesCarouselRef}
                          className="flex space-x-3 overflow-x-auto pb-2 scrollbar-thin scroll-smooth"
                        >
                          {currentPlan.experiences.map((exp, i) => (
                            <div
                              key={i}
                              className="w-56 shrink-0 p-2.5 rounded-2xl bg-[#FFFDF7] dark:bg-[#091B29] border border-slate-200/80 dark:border-slate-800 space-y-2 shadow-2xs"
                            >
                              <div className="h-24 w-full rounded-xl overflow-hidden relative">
                                <img
                                  src={resolveImageUrl(exp.image_url) || 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=500&q=80'}
                                  alt={exp.title}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=500&q=80';
                                  }}
                                />
                                <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-[#17324D]/80 backdrop-blur-xs text-white text-[8px] font-bold">
                                  {exp.category || 'Experience'}
                                </span>
                              </div>

                              <div>
                                <h5 className="text-xs font-bold text-[#17324D] dark:text-white truncate">
                                  {exp.title}
                                </h5>
                                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                                  <span>{exp.duration || '2 Hours'}</span>
                                  <span className="font-mono font-bold text-purple-600 dark:text-purple-400">
                                    ₹{exp.price?.toLocaleString('en-IN') || 0}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* SECTION: PLACES TO EXPLORE */}
                    {currentPlan.external_places && currentPlan.external_places.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                            <MapPin className="w-3.5 h-3.5 text-teal-600" />
                            <span>Places to Explore</span>
                          </span>
                          <div className="flex items-center space-x-1">
                            <button
                              type="button"
                              onClick={() => scrollCarousel(placesCarouselRef, 'left')}
                              className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 cursor-pointer"
                            >
                              <ChevronLeft className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => scrollCarousel(placesCarouselRef, 'right')}
                              className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 cursor-pointer"
                            >
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div
                          ref={placesCarouselRef}
                          className="flex space-x-3 overflow-x-auto pb-2 scrollbar-thin scroll-smooth"
                        >
                          {currentPlan.external_places.map((place, i) => (
                            <div
                              key={i}
                              className="w-52 shrink-0 p-2.5 rounded-2xl bg-[#FFFDF7] dark:bg-[#091B29] border border-slate-200/80 dark:border-slate-800 space-y-2 shadow-2xs"
                            >
                              <div className="h-24 w-full rounded-xl overflow-hidden relative">
                                <img
                                  src={resolveImageUrl(place.photo_url) || 'https://images.unsplash.com/photo-1593693397690-362cb9666fc2?auto=format&fit=crop&w=500&q=80'}
                                  alt={place.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = 'https://images.unsplash.com/photo-1593693397690-362cb9666fc2?auto=format&fit=crop&w=500&q=80';
                                  }}
                                />
                                <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-[#17324D]/80 backdrop-blur-xs text-white text-[8px] font-bold">
                                  {place.category || 'Sightseeing'}
                                </span>
                              </div>

                              <div>
                                <h5 className="text-xs font-bold text-[#17324D] dark:text-white truncate">
                                  {place.name}
                                </h5>
                                <p className="text-[10px] text-slate-500 truncate">{place.tagline || place.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* SECTION: INTERACTIVE ROUTE MAP (COLLAPSIBLE) */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => setShowRouteMap(!showRouteMap)}
                          className="text-xs font-bold text-[#17324D] dark:text-white flex items-center space-x-1.5 cursor-pointer hover:text-[#087F8C]"
                        >
                          <Map className="w-3.5 h-3.5 text-[#087F8C]" />
                          <span>Interactive Route & Geographic Map</span>
                          <span className="text-[10px] text-slate-400 font-normal">
                            ({showRouteMap ? 'Hide' : 'Show'})
                          </span>
                        </button>
                      </div>

                      {showRouteMap && (
                        <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xs">
                          <TripPlannerMap
                            stay={currentPlan.stay}
                            experiences={currentPlan.experiences}
                            days={currentPlan.days}
                          />
                        </div>
                      )}
                    </div>

                    {/* SECTION: BUDGET & COST TRANSPARENCY */}
                    <div className="p-4 rounded-2xl bg-[#FFFDF7] dark:bg-[#091B29] border border-slate-200/80 dark:border-slate-800 space-y-2.5 shadow-2xs">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Cost Transparency & Summary
                      </span>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div className="p-2.5 rounded-xl bg-white dark:bg-[#0F273D] border border-slate-100 dark:border-slate-800">
                          <span className="text-[9px] text-slate-400 uppercase font-mono block">Accommodation</span>
                          <span className="font-mono font-bold text-[#17324D] dark:text-white">
                            ₹{currentPlan.pricing_summary.accommodation_total.toLocaleString('en-IN')}
                          </span>
                        </div>

                        <div className="p-2.5 rounded-xl bg-white dark:bg-[#0F273D] border border-slate-100 dark:border-slate-800">
                          <span className="text-[9px] text-slate-400 uppercase font-mono block">Experiences</span>
                          <span className="font-mono font-bold text-[#17324D] dark:text-white">
                            ₹{currentPlan.pricing_summary.experiences_total.toLocaleString('en-IN')}
                          </span>
                        </div>

                        <div className="p-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800">
                          <span className="text-[9px] text-[#087F8C] dark:text-teal-300 uppercase font-mono block">Estimated Known Cost</span>
                          <span className="font-mono font-bold text-sm text-[#087F8C] dark:text-[#27B7A8]">
                            ₹{currentPlan.pricing_summary.known_cost.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>

                      <p className="text-[10px] text-slate-400 font-light">
                        {currentPlan.pricing_summary.disclaimer}
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                /* WAITING / INSPIRING STUDIO STATE */
                <div className="flex-1 overflow-y-auto min-h-0 p-5 space-y-5 scrollbar-thin flex flex-col justify-center">
                  <div className="text-center space-y-2 py-4">
                    <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-[#087F8C] dark:text-[#27B7A8] mx-auto flex items-center justify-center">
                      <Compass className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-serif font-bold text-[#17324D] dark:text-white">
                      Your Journey Will Take Shape Here
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto font-light leading-relaxed">
                      Tell me where you want to go, who's traveling, or your budget in the chat on the left. I'll assemble verified sanctuaries, live room choices, and a day-by-day travel journal for you here.
                    </p>
                  </div>

                  {/* Parameter Badges */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-[#091B29] border border-slate-200/80 dark:border-slate-800 text-center">
                      <span className="text-[9px] font-mono text-slate-400 uppercase block">Destination</span>
                      <span className="font-bold text-[#17324D] dark:text-white truncate block">
                        {currentContext.destination || 'Flexible'}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-[#091B29] border border-slate-200/80 dark:border-slate-800 text-center">
                      <span className="text-[9px] font-mono text-slate-400 uppercase block">Duration</span>
                      <span className="font-bold text-[#17324D] dark:text-white">
                        {currentContext.duration_days ? `${currentContext.duration_days} Days` : 'Flexible'}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-[#091B29] border border-slate-200/80 dark:border-slate-800 text-center">
                      <span className="text-[9px] font-mono text-slate-400 uppercase block">Travelers</span>
                      <span className="font-bold text-[#17324D] dark:text-white">
                        {currentContext.adults ? `${currentContext.adults} Adults` : '2 Adults'}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-[#091B29] border border-slate-200/80 dark:border-slate-800 text-center">
                      <span className="text-[9px] font-mono text-slate-400 uppercase block">Budget</span>
                      <span className="font-bold text-[#087F8C] dark:text-[#27B7A8]">
                        {currentContext.budget ? `₹${parseInt(currentContext.budget).toLocaleString('en-IN')}` : 'Flexible'}
                      </span>
                    </div>
                  </div>

                  {/* Popular Starter Destination Cards */}
                  <div className="space-y-2 pt-2">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                      Explore Popular Getaways (Click to start):
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {POPULAR_DESTINATION_CARDS.map((dest) => (
                        <div
                          key={dest.name}
                          onClick={() => handleSendMessage(dest.prompt)}
                          className="p-2.5 rounded-2xl bg-slate-50 dark:bg-[#091B29] border border-slate-200/80 dark:border-slate-800 hover:border-[#087F8C] transition-all cursor-pointer flex items-center space-x-3 shadow-2xs group"
                        >
                          <img
                            src={dest.img}
                            alt={dest.name}
                            className="w-14 h-12 object-cover rounded-xl shrink-0 group-hover:scale-105 transition-transform"
                          />
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-[#17324D] dark:text-white group-hover:text-[#087F8C] dark:group-hover:text-[#27B7A8] transition-colors truncate">
                              {dest.name}
                            </h4>
                            <p className="text-[10px] text-slate-500 truncate">{dest.tagline}</p>
                            <p className="text-[9px] text-amber-600 dark:text-amber-400 font-mono mt-0.5">{dest.weather}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. MODE: SAVED TRIPS TAB */}
      {activeTab === 'SAVED_TRIPS' && (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden space-y-4">
          <div className="shrink-0 flex items-center justify-between border-b border-[#E0ECEF] dark:border-white/10 pb-3">
            <h2 className="text-base font-serif font-bold text-[#17324D] dark:text-white flex items-center space-x-2">
              <Bookmark className="w-4 h-4 text-[#087F8C]" />
              <span>My Saved Plans</span>
            </h2>

            <button
              type="button"
              onClick={loadSavedTrips}
              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold flex items-center space-x-1.5 cursor-pointer hover:bg-slate-200"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingSaved ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 pr-1 scrollbar-thin">
            {loadingSaved ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#087F8C]" />
                <span>Loading your saved journey plans...</span>
              </div>
            ) : savedTrips.length === 0 ? (
              <div className="p-12 text-center rounded-3xl bg-white dark:bg-[#0F273D] border border-[#E0ECEF] dark:border-white/10 space-y-3 shadow-xs max-w-md mx-auto mt-8">
                <Compass className="w-8 h-8 mx-auto text-slate-300" />
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Saved Trip Plans Yet</h4>
                <p className="text-xs text-slate-500 font-light">
                  Chat with the Travel Planner to shape your journey, then click "Save Plan" to view it here anytime.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('CHAT')}
                  className="px-4 py-2 bg-[#087F8C] text-white font-bold rounded-xl text-xs cursor-pointer inline-block shadow-xs"
                >
                  Start a Conversation
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-6">
                {savedTrips.map((trip) => (
                  <div
                    key={trip.id}
                    onClick={() => handleOpenSavedTrip(trip.id)}
                    className="p-4 rounded-2xl bg-white dark:bg-[#0F273D] border border-[#E0ECEF] dark:border-white/10 space-y-3 hover:border-[#087F8C] transition-all cursor-pointer shadow-xs group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full bg-[#087F8C]/15 text-[#087F8C] dark:text-[#27B7A8] text-[10px] font-bold font-mono">
                        {trip.destination}
                      </span>

                      <button
                        type="button"
                        onClick={(e) => handleDeleteSavedTrip(trip.id, e)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded-lg transition-colors cursor-pointer"
                        title="Delete Plan"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-[#17324D] dark:text-white group-hover:text-[#087F8C] dark:group-hover:text-[#27B7A8] transition-colors truncate">
                        {trip.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                        {trip.start_date} → {trip.end_date} ({trip.total_days} Days)
                      </p>
                    </div>

                    {trip.stay_name && (
                      <div className="text-[10px] text-slate-600 dark:text-slate-300 flex items-center space-x-1.5 truncate">
                        <Building className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{trip.stay_name}</span>
                      </div>
                    )}

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="block text-[8px] text-slate-400 uppercase font-mono">Known Cost</span>
                        <span className="text-xs font-mono font-bold text-[#087F8C] dark:text-[#27B7A8]">
                          ₹{trip.estimated_known_cost.toLocaleString('en-IN')}
                        </span>
                      </div>

                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 group-hover:translate-x-1 transition-transform flex items-center space-x-1">
                        <span>View Plan</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. MODAL / DRAWER: TRIP HISTORY (ChatGPT-Style) */}
      {showHistoryDrawer && (
        <div className="fixed inset-0 z-50 bg-[#091B29]/70 backdrop-blur-xs flex justify-end animate-fadeIn">
          <div className="bg-white dark:bg-[#0F273D] w-full max-w-md h-full flex flex-col p-6 space-y-4 border-l border-slate-200 dark:border-slate-700 shadow-2xl animate-slideLeft">
            <div className="flex items-center justify-between border-b border-[#E0ECEF] dark:border-white/10 pb-3">
              <div className="flex items-center space-x-2">
                <History className="w-4 h-4 text-[#087F8C]" />
                <h3 className="text-sm font-bold text-[#17324D] dark:text-white">Trip History & Past Chats</h3>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleStartNewSession}
                  className="px-2.5 py-1 rounded-xl bg-[#087F8C] hover:bg-[#0F9D9A] text-white text-[11px] font-bold flex items-center space-x-1 cursor-pointer transition-all shadow-xs"
                >
                  <Plus className="w-3 h-3" />
                  <span>New Trip</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowHistoryDrawer(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 space-y-2.5 scrollbar-thin pr-1">
              {loadingSessions ? (
                <div className="p-8 text-center text-xs text-slate-400">Loading conversation history...</div>
              ) : chatSessions.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">No past conversations found.</div>
              ) : (
                chatSessions.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => handleOpenSession(s.id)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between text-xs ${
                      currentSessionId === s.id
                        ? 'bg-teal-50 dark:bg-teal-950/40 border-[#087F8C] text-[#087F8C]'
                        : 'bg-slate-50 dark:bg-[#091B29] border-slate-200 dark:border-slate-800 hover:border-[#087F8C]'
                    }`}
                  >
                    <div className="min-w-0 flex-1 pr-2 space-y-0.5">
                      <div className="flex items-center space-x-1.5">
                        <span className="px-2 py-0.2 rounded-md bg-[#087F8C]/15 text-[#087F8C] text-[9px] font-bold font-mono">
                          {s.destination || 'Trip'}
                        </span>
                        <h4 className="font-bold truncate text-[#17324D] dark:text-white">{s.title}</h4>
                      </div>
                      <p className="text-[10px] text-slate-400 truncate">{s.last_message || 'No messages'}</p>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleDeleteSession(s.id, e)}
                      className="text-slate-400 hover:text-rose-500 p-1.5 cursor-pointer shrink-0 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                      title="Delete conversation"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. MODAL: ALL STAYS COMPARISON */}
      {showStayComparisonModal && currentPlan && (
        <div className="fixed inset-0 z-50 bg-[#091B29]/75 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-[#0F273D] rounded-3xl max-w-3xl w-full max-h-[85vh] flex flex-col p-6 space-y-4 border border-slate-200 dark:border-slate-700 shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between border-b border-[#E0ECEF] dark:border-white/10 pb-3 shrink-0">
              <div className="flex items-center space-x-2">
                <Building className="w-4 h-4 text-[#087F8C]" />
                <h4 className="text-sm font-bold text-[#17324D] dark:text-white">
                  Compare Stays in {currentPlan.trip.destination}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowStayComparisonModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 space-y-4 pr-1 scrollbar-thin">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {currentPlan.available_stays.map((prop) => {
                  const isSelected = currentPlan.stay && currentPlan.stay.property_id === prop.property_id;
                  const isExpanded = expandedPropertyId === prop.property_id;

                  return (
                    <div
                      key={prop.property_id}
                      className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
                        isSelected
                          ? 'bg-teal-50/50 dark:bg-teal-950/40 border-[#087F8C]'
                          : 'bg-slate-50 dark:bg-[#091B29] border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <div className="space-y-2.5">
                        <div className="relative h-32 w-full rounded-xl overflow-hidden">
                          <img
                            src={resolveImageUrl(prop.image_url) || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=500&q=80'}
                            alt={prop.property_name}
                            className="w-full h-full object-cover"
                          />
                          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-[#17324D]/80 backdrop-blur-xs text-white text-[9px] font-bold">
                            {prop.property_type}
                          </span>
                        </div>

                        <div>
                          <h4 className="text-xs font-bold text-[#17324D] dark:text-white">{prop.property_name}</h4>
                          <p className="text-[10px] text-slate-500">{prop.address}</p>
                        </div>

                        <div className="flex items-baseline justify-between text-xs pt-1">
                          <span className="text-[10px] text-slate-400">Total Stay Price</span>
                          <span className="font-mono font-bold text-[#087F8C] dark:text-[#27B7A8]">
                            ₹{prop.total_stay_cost.toLocaleString('en-IN')}
                          </span>
                        </div>

                        {/* Room options dropdown */}
                        {prop.available_rooms && prop.available_rooms.length > 0 && (
                          <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 space-y-1.5">
                            <button
                              type="button"
                              onClick={() => setExpandedPropertyId(isExpanded ? null : prop.property_id)}
                              className="text-[10px] font-bold text-slate-600 dark:text-slate-300 flex items-center justify-between w-full cursor-pointer"
                            >
                              <span>{prop.available_rooms.length} Room Options</span>
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>

                            {isExpanded && (
                              <div className="space-y-1.5 pt-1">
                                {prop.available_rooms.map((rm) => (
                                  <div
                                    key={rm.room_id}
                                    className="p-2 rounded-xl bg-white dark:bg-[#0F273D] border border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-[10px]"
                                  >
                                    <div>
                                      <span className="font-bold block text-[#17324D] dark:text-white">{rm.room_name}</span>
                                      <span className="text-slate-400">Max {rm.capacity} guests · ₹{rm.price_per_night.toLocaleString('en-IN')}/nt</span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleSelectStayAndRoom(prop.property_id, rm.room_id)}
                                      className="px-2 py-1 bg-[#087F8C] text-white rounded-lg font-bold cursor-pointer"
                                    >
                                      Select
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSelectStayAndRoom(prop.property_id, prop.selected_room_id)}
                        disabled={selectingStay || isSelected}
                        className={`w-full py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#087F8C] text-white'
                            : 'bg-orange-500 hover:bg-orange-600 text-white'
                        }`}
                      >
                        {isSelected ? 'Currently Selected' : 'Choose This Stay'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL: REGENERATE SPECIFIC DAY */}
      {regenDayNumber !== null && (
        <div className="fixed inset-0 z-50 bg-[#091B29]/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-[#0F273D] rounded-3xl max-w-md w-full p-6 space-y-4 border border-slate-200 dark:border-slate-700 shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between border-b border-[#E0ECEF] dark:border-white/10 pb-3">
              <h4 className="text-sm font-bold text-[#17324D] dark:text-white flex items-center space-x-2">
                <RefreshCw className="w-4 h-4 text-orange-500" />
                <span>Refresh Day {regenDayNumber}</span>
              </h4>
              <button
                type="button"
                onClick={() => setRegenDayNumber(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#607080] dark:text-slate-400 font-light leading-relaxed">
              Voyara will keep your stay, dates, and other days unchanged, and refresh Day {regenDayNumber} with alternative regional highlights.
            </p>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Any specific requests for Day {regenDayNumber}? (Optional)
              </label>
              <textarea
                rows={3}
                value={regenNotes}
                onChange={(e) => setRegenNotes(e.target.value)}
                placeholder="e.g. Prefer lakeside boating or tea factory tour instead of long walks."
                className="w-full p-3 bg-[#FFFDF7] dark:bg-[#091B29] border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-[#17324D] dark:text-white focus:outline-hidden focus:border-orange-500"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setRegenDayNumber(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRegenerateDaySubmit}
                disabled={regeneratingDay}
                className="px-4 py-2 bg-gradient-to-r from-orange-500 to-[#EA580C] hover:opacity-95 text-white rounded-xl text-xs font-bold cursor-pointer flex items-center space-x-1.5 shadow-xs"
              >
                {regeneratingDay ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Refreshing...</span>
                  </>
                ) : (
                  <span>Refresh Day {regenDayNumber}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TripPlanner;
