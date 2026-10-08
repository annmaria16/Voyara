import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { aiBookingApi } from '../../api/aiBooking';
import { useAuth } from '../../context/AuthContext';
import {
  formatDisplayName,
  formatPropertyName,
  formatLocationName,
  formatRoomName,
  formatPropertyType
} from '../../utils/formatters';
import {
  Sparkles,
  Send,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Users,
  MapPin,
  Home,
  Bed,
  CreditCard,
  AlertCircle,
  Clock,
  ArrowRight,
  RefreshCw,
  Star,
  Compass,
  Check,
  ChevronRight,
  Flame,
  Info,
  Layers,
  FileCheck,
  XCircle,
  Plus,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Copy,
  SlidersHorizontal,
  Wallet,
  Car,
  Palmtree,
  MessageSquare,
  ListOrdered,
  PanelRight,
  Lock,
  Search,
  CheckCheck
} from 'lucide-react';

import VoyaraRobotAvatar from '../../components/ai/VoyaraRobotAvatar';
import BookingVerificationPanel from '../../components/ai/BookingVerificationPanel';
import GuidedBookingStepper from '../../components/ai/GuidedBookingStepper';
import AlternativeStayCard from '../../components/ai/AlternativeStayCard';
import BookingExecutionModal from '../../components/ai/BookingExecutionModal';
import AIMessageRenderer from '../../components/ai/AIMessageRenderer';
import { loadRazorpayScript } from '../../utils/razorpay';

export const AIBooking = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Mode: 'conversational' | 'guided'
  const [activeMode, setActiveMode] = useState('conversational');
  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [conversationId, setConversationId] = useState(null);
  const [requirementsSnapshot, setRequirementsSnapshot] = useState({});
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [activeStep, setActiveStep] = useState('Ready for your request');
  const [sessions, setSessions] = useState([]);
  const [showSessionsSidebar, setShowSessionsSidebar] = useState(false);
  const [showRightPanelMobile, setShowRightPanelMobile] = useState(false);
  const [copiedBookingNum, setCopiedBookingNum] = useState(false);

  // Metadata for Verification & Progress
  const [stepProgress, setStepProgress] = useState(null);
  const [agentStatus, setAgentStatus] = useState(null);
  const [verinovaStatus, setVerinovaStatus] = useState(null);
  const [verificationScore, setVerificationScore] = useState(null);
  const [latestPreview, setLatestPreview] = useState(null);
  const [latestConfirmedBooking, setLatestConfirmedBooking] = useState(null);
  const [executionModalOpen, setExecutionModalOpen] = useState(false);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, confirming]);

  const userName = user?.name ? formatDisplayName(user.name.split(' ')[0]) : 'Traveler';

  const getCurrentTimeString = () => {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Load sessions on mount
  useEffect(() => {
    fetchRecentSessions();
    if (location.state?.initialPrompt) {
      handleSendMessage(location.state.initialPrompt);
    } else {
      setMessages([
        {
          id: 'welcome-1',
          sender: 'assistant',
          text: `Hi ${userName}! 👋\nTell me where you want to stay, your dates, guests and budget. I'll search verified stays, check availability and guide you through the booking.`,
          intent: 'GREETING',
          showQuickActions: true,
          created_at: getCurrentTimeString()
        }
      ]);
    }
  }, [user]);

  const fetchRecentSessions = async () => {
    try {
      const data = await aiBookingApi.getSessions();
      setSessions(data || []);
    } catch (err) {
      console.warn('Could not load booking sessions:', err);
    }
  };

  const handleSendMessage = async (textToSend, customContext = null) => {
    const text = textToSend || inputMessage;
    if (!text || !text.trim() || loading) return;

    const timeStr = getCurrentTimeString();
    const userMsgObj = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: text.trim(),
      created_at: timeStr
    };

    setMessages((prev) => [...prev, userMsgObj]);
    setInputMessage('');
    setLoading(true);
    setActiveStep('Searching verified stays...');
    setAgentStatus({
      state: 'WORKING',
      task: `Searching verified stays for "${text.trim().slice(0, 30)}..."`,
      is_working: true
    });

    try {
      const payload = {
        message: text.trim(),
        session_id: sessionId,
        conversation_id: conversationId,
        trip_context: customContext || {}
      };

      const response = await aiBookingApi.sendChatMessage(payload);

      setSessionId(response.session_id);
      setConversationId(response.conversation_id);
      if (response.context_snapshot) {
        setRequirementsSnapshot(response.context_snapshot);
      }
      if (response.progress_step) {
        setActiveStep(response.progress_step);
      }

      // Sync state panels
      if (response.step_progress) setStepProgress(response.step_progress);
      if (response.agent_status) setAgentStatus(response.agent_status);
      if (response.verinova_verification) setVerinovaStatus(response.verinova_verification);
      if (response.ai_verification_score) setVerificationScore(response.ai_verification_score);
      if (response.booking_preview) setLatestPreview(response.booking_preview);
      if (response.booking) setLatestConfirmedBooking(response.booking);

      const respTimeStr = getCurrentTimeString();
      const assistantMsgObj = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: response.message,
        intent: response.intent,
        requires_user_action: response.requires_user_action,
        action: response.action,
        search_state: response.search_state,
        configuration_choices: response.configuration_choices || [],
        location_options: response.location_options || [],
        suggested_destinations: response.suggested_destinations || [],
        alternatives: response.alternatives || [],
        properties: response.properties || [],
        rooms: response.rooms || [],
        booking_preview: response.booking_preview,
        booking: response.booking,
        verification: response.verification,
        extracted_requirements: response.extracted_requirements || response.context_snapshot,
        created_at: respTimeStr
      };

      setMessages((prev) => [...prev, assistantMsgObj]);
      fetchRecentSessions();
    } catch (err) {
      console.error('Error sending message to Voyara AI:', err);
      const errMsg = err.message || 'Could not connect to Voyara AI agent.';
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          sender: 'assistant',
          text: `I encountered an issue: ${errMsg}. Please try again or refine your dates/destination.`,
          intent: 'ERROR',
          created_at: getCurrentTimeString()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAlternative = (alt) => {
    if (!alt) return;
    const msg = `Book option ${alt.option_index || 1}: ${alt.property_name} (${alt.room_name})`;
    handleSendMessage(msg);
  };

  const handleConfirmBooking = async (preview) => {
    if (!preview || confirming) return;

    setConfirming(true);
    setActiveStep('Creating secure payment order...');
    setAgentStatus({
      state: 'WORKING',
      task: 'Initializing 256-bit encrypted Razorpay payment order...',
      is_working: true
    });

    try {
      // 1. Ensure Razorpay SDK script is loaded
      const isScriptLoaded = await loadRazorpayScript();
      if (!isScriptLoaded) {
        throw new Error('Razorpay SDK failed to load. Please check your internet connection and try again.');
      }

      // 2. Request backend to create a server-side verified Razorpay Order
      const idempotencyKey = `voy-idemp-${preview.preview_id}-${Date.now()}`;
      const orderData = await aiBookingApi.createPaymentOrder({
        preview_id: preview.preview_id,
        idempotency_key: idempotencyKey,
        rules_accepted: true,
        customer_notes: ''
      });

      setActiveStep('Awaiting payment in Razorpay Checkout...');
      setAgentStatus({
        state: 'WORKING',
        task: 'Awaiting traveler payment in Razorpay Checkout...',
        is_working: true
      });

      // 3. Configure Razorpay Standard Checkout Options
      const cleanContact = (orderData.customer_phone || user?.phone || '9999999999').replace(/[^0-9]/g, '') || '9999999999';

      const options = {
        key: orderData.key_id,
        amount: orderData.amount_paise,
        currency: orderData.currency || 'INR',
        name: 'Voyara Stays & Sanctuaries',
        description: `${orderData.property_name} • ${orderData.room_name} (${orderData.nights}N)`,
        order_id: orderData.order_id,
        prefill: {
          name: orderData.customer_name || user?.name || 'Voyara Traveler',
          email: orderData.customer_email || user?.email || 'traveler@voyara.com',
          contact: cleanContact,
        },
        notes: {
          booking_number: orderData.booking_number,
          property_name: orderData.property_name,
          preview_id: preview.preview_id,
        },
        theme: {
          color: '#087F8C',
        },
        modal: {
          ondismiss: async () => {
            setConfirming(false);
            setActiveStep('Payment Cancelled');
            setAgentStatus({
              state: 'IDLE',
              task: 'Payment window was closed. Booking remains pending and unpaid.',
              is_working: false
            });

            const cancelMsgObj = {
              id: `cancel-${Date.now()}`,
              sender: 'assistant',
              text: '⚠️ **Payment Cancelled**\n\nThe payment checkout window was closed before completing the transaction. Your booking remains **pending and unpaid**.\n\nYou can click **Confirm Booking** on the reservation preview above anytime whenever you are ready to complete payment.',
              intent: 'PAYMENT_CANCELLED',
              booking_preview: preview,
              created_at: getCurrentTimeString()
            };
            setMessages((prev) => [...prev, cancelMsgObj]);

            try {
              await aiBookingApi.recordPaymentFailure({
                booking_id: orderData.booking_id,
                razorpay_order_id: orderData.order_id,
                error_code: 'PAYMENT_CANCELLED_BY_USER',
                error_description: 'User dismissed Razorpay checkout window.',
              });
            } catch (cancelErr) {
              console.warn('Could not record cancellation status:', cancelErr);
            }
          },
        },
        handler: async (response) => {
          // 4. Payment succeeded on Razorpay modal -> Verify cryptographically on backend
          setConfirming(true);
          setActiveStep('Verifying payment signature & VeriNova checks...');
          setAgentStatus({
            state: 'WORKING',
            task: 'Verifying Razorpay HMAC-SHA256 signature and finalizing VeriNova outcome...',
            is_working: true
          });

          try {
            const verifyPayload = {
              preview_id: preview.preview_id,
              booking_id: orderData.booking_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              idempotency_key: idempotencyKey,
            };

            const verifyResponse = await aiBookingApi.verifyPayment(verifyPayload);

            const confirmMsgObj = {
              id: `confirm-res-${Date.now()}`,
              sender: 'assistant',
              text: verifyResponse.message,
              intent: verifyResponse.status === 'VERIFIED' ? 'BOOKING_COMPLETED' : 'BOOKING_FAILED',
              booking: verifyResponse.booking,
              verification: verifyResponse.verification,
              status: verifyResponse.status,
              created_at: getCurrentTimeString()
            };

            setMessages((prev) => [...prev, confirmMsgObj]);
            setActiveStep(verifyResponse.status === 'VERIFIED' ? 'Booking confirmed & verified' : 'Verification outcome received');

            if (verifyResponse.booking) {
              setLatestConfirmedBooking(verifyResponse.booking);
            }

            if (verifyResponse.verification) {
              setVerinovaStatus(verifyResponse.verification);
              setVerificationScore(verifyResponse.verification.verinova_score);
            }

            setAgentStatus({
              state: verifyResponse.status === 'VERIFIED' ? 'CONFIRMED' : 'FAILED',
              task: verifyResponse.status === 'VERIFIED' ? 'Booking verified & confirmed by VeriNova' : 'Verification discrepancy detected',
              is_working: false
            });

            // Open confirmation modal ONLY after successful payment verification
            setExecutionModalOpen(true);
            fetchRecentSessions();
          } catch (verifyErr) {
            console.error('Error verifying payment:', verifyErr);
            setActiveStep('Payment Verification Pending');
            setAgentStatus({
              state: 'FAILED',
              task: 'Payment verification could not be validated.',
              is_working: false
            });

            setMessages((prev) => [
              ...prev,
              {
                id: `err-verify-${Date.now()}`,
                sender: 'assistant',
                text: `⚠️ **Payment Verification Pending**\n\nYour payment transaction was processed, but server-side cryptographic signature verification could not be finalized (${verifyErr.message || 'Verification mismatch'}).\n\nYour booking has **not** been marked as confirmed yet. Please contact Voyara Support or retry.`,
                intent: 'PAYMENT_VERIFICATION_FAILED',
                booking_preview: preview,
                created_at: getCurrentTimeString()
              }
            ]);
          } finally {
            setConfirming(false);
          }
        },
      };

      // 4. Open Razorpay Checkout Modal
      if (typeof window.Razorpay === 'undefined') {
        await loadRazorpayScript();
      }

      if (typeof window.Razorpay === 'undefined') {
        throw new Error('Razorpay payment gateway could not be initialized. Please refresh the page and try again.');
      }

      const razorpayInstance = new window.Razorpay(options);
      razorpayInstance.on('payment.failed', async function (failedResponse) {
        setConfirming(false);
        const errDesc = failedResponse.error?.description || 'Transaction declined by bank or gateway.';
        setActiveStep('Payment Failed');
        setAgentStatus({
          state: 'FAILED',
          task: `Payment failed: ${errDesc}`,
          is_working: false
        });

        setMessages((prev) => [
          ...prev,
          {
            id: `fail-${Date.now()}`,
            sender: 'assistant',
            text: `❌ **Payment Failed**\n\n${errDesc}\n\nYour booking remains **unpaid/pending** and your card has not been charged for this stay. You can click **Confirm Booking** above to retry payment with another method.`,
            intent: 'PAYMENT_FAILED',
            booking_preview: preview,
            created_at: getCurrentTimeString()
          }
        ]);

        try {
          await aiBookingApi.recordPaymentFailure({
            booking_id: orderData.booking_id,
            razorpay_order_id: orderData.order_id,
            error_code: failedResponse.error?.code || 'GATEWAY_DECLINE',
            error_description: errDesc,
          });
        } catch (recordErr) {
          console.warn('Could not record payment failure:', recordErr);
        }
      });

      razorpayInstance.open();

    } catch (err) {
      console.error('Error confirming booking payment:', err);
      setConfirming(false);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-confirm-${Date.now()}`,
          sender: 'assistant',
          text: `Payment reservation initialization could not be completed: ${err.message || 'Gateway connection issue'}. Please try again.`,
          intent: 'ERROR',
          booking_preview: preview,
          created_at: getCurrentTimeString()
        }
      ]);
    }
  };

  const handleStartNewSession = () => {
    setSessionId(null);
    setConversationId(null);
    setRequirementsSnapshot({});
    setStepProgress(null);
    setVerinovaStatus(null);
    setVerificationScore(null);
    setLatestPreview(null);
    setLatestConfirmedBooking(null);
    setActiveStep('Ready for your request');
    setAgentStatus({
      state: 'ACTIVE',
      task: 'Listening to traveler requirements...',
      is_working: false
    });
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'assistant',
        text: `Hi ${userName}! 👋\nTell me where you want to stay, your dates, guests and budget. I'll search verified stays, check availability and guide you through the booking.`,
        intent: 'GREETING',
        showQuickActions: true,
        created_at: getCurrentTimeString()
      }
    ]);
  };

  const loadSessionHistory = async (sessId) => {
    setLoading(true);
    try {
      const detail = await aiBookingApi.getSessionDetail(sessId);
      setSessionId(detail.id);
      setConversationId(detail.conversation_id);
      setRequirementsSnapshot(detail.requirements || {});

      const mappedMsgs = (detail.messages || []).map((m) => ({
        id: m.id,
        sender: m.sender,
        text: m.text,
        intent: m.intent,
        requires_user_action: m.requires_user_action,
        action: m.action,
        properties: m.properties || [],
        rooms: m.rooms || [],
        alternatives: m.alternatives || [],
        configuration_choices: m.configuration_choices || [],
        location_options: m.location_options || [],
        search_state: m.search_state,
        booking_preview: m.booking_preview,
        booking: m.booking,
        verification: m.verification,
        extracted_requirements: detail.requirements,
        created_at: m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
      }));

      setMessages(mappedMsgs);
      setShowSessionsSidebar(false);
    } catch (err) {
      console.error('Could not load session:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyBookingNumber = (num) => {
    if (!num) return;
    navigator.clipboard.writeText(num);
    setCopiedBookingNum(true);
    setTimeout(() => setCopiedBookingNum(false), 2000);
  };

  const handleQuickAction = (actionType) => {
    switch (actionType) {
      case 'find_stay':
        handleSendMessage('Help me find a stay');
        break;
      case 'book_stay':
        handleSendMessage('I would like to book a stay');
        break;
      case 'find_nearby':
        handleSendMessage('Find nearby available stays');
        break;
      case 'check_availability':
        handleSendMessage('Check room availability for my trip');
        break;
      case 'plan_trip':
        navigate('/traveler/trip-planner');
        break;
      case 'my_bookings':
        navigate('/customer/bookings');
        break;
      default:
        break;
    }
  };

  return (
    <div className="relative min-h-screen w-full font-sans text-slate-900 dark:text-white transition-colors duration-200">
      
      {/* 1. FULL-PAGE TRAVEL / MOUNTAIN LAKE HD BACKGROUND */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden select-none">
        <img
          src="/images/ai-booking-bg.jpg"
          onError={(e) => {
            e.currentTarget.src = "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=2000&auto=format&fit=crop&q=85";
          }}
          alt="Voyara Scenic Alpine Mountain Lake"
          className="w-full h-full object-cover object-center opacity-85 dark:opacity-60 filter brightness-100 contrast-105 dark:brightness-75 scale-100 transition-all duration-700"
        />
        {/* Ambient vignette so the scenic photo is vivid and clear */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-black/25 dark:from-[#091B29]/75 dark:via-[#0B1E2E]/65 dark:to-[#081724]/85" />
      </div>

      {/* 2. MAIN SCROLLABLE CONTENT CONTAINER */}
      <div className="relative z-10 max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-7 space-y-6">
        
        {/* Top Header Floating Glass Pill */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-3.5 sm:p-4 rounded-3xl bg-white/90 dark:bg-[#0E273C]/90 backdrop-blur-md border border-white/80 dark:border-white/10 shadow-md">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#087F8C] to-[#0F9D9A] flex items-center justify-center text-white shadow-md shadow-teal-900/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#17324D] dark:text-white font-serif">
                Book with AI
              </h1>
              <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                Your autonomous travel booking assistant
              </p>
            </div>
          </div>

          {/* Mode Switcher & History Bar */}
          <div className="flex items-center gap-2">
            {/* Mode Switcher */}
            <div className="bg-white/90 dark:bg-white/10 backdrop-blur-md p-1 rounded-2xl border border-slate-200/80 dark:border-white/10 flex items-center text-xs font-bold shadow-2xs">
              <button
                type="button"
                onClick={() => setActiveMode('conversational')}
                className={`px-3 py-1.5 rounded-xl flex items-center space-x-1.5 transition cursor-pointer ${
                  activeMode === 'conversational'
                    ? 'bg-gradient-to-r from-[#087F8C] to-[#0F9D9A] text-white shadow-xs font-black'
                    : 'text-slate-600 dark:text-slate-300 hover:text-[#087F8C] dark:hover:text-white'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Conversational AI</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveMode('guided')}
                className={`px-3 py-1.5 rounded-xl flex items-center space-x-1.5 transition cursor-pointer ${
                  activeMode === 'guided'
                    ? 'bg-gradient-to-r from-[#087F8C] to-[#0F9D9A] text-white shadow-xs font-black'
                    : 'text-slate-600 dark:text-slate-300 hover:text-[#087F8C] dark:hover:text-white'
                }`}
              >
                <ListOrdered className="w-3.5 h-3.5" />
                <span>Step-by-Step</span>
              </button>
            </div>

            {/* New Journey */}
            <button
              type="button"
              onClick={handleStartNewSession}
              className="px-3 py-1.5 rounded-2xl bg-white/90 dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/20 border border-slate-200/80 dark:border-white/10 text-xs font-bold text-[#17324D] dark:text-white transition flex items-center space-x-1.5 shadow-2xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-[#087F8C]" />
              <span className="hidden sm:inline">New Journey</span>
            </button>

            {/* History Button */}
            <button
              type="button"
              onClick={() => setShowSessionsSidebar(!showSessionsSidebar)}
              className="px-3 py-1.5 rounded-2xl bg-white/90 dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/20 border border-slate-200/80 dark:border-white/10 text-xs font-bold text-[#17324D] dark:text-white transition flex items-center space-x-1.5 shadow-2xs cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5 text-[#087F8C]" />
              <span>History ({sessions.length})</span>
            </button>

            {/* Mobile Verification Panel Trigger */}
            <button
              type="button"
              onClick={() => setShowRightPanelMobile(!showRightPanelMobile)}
              className="lg:hidden px-3 py-1.5 rounded-2xl bg-[#087F8C] text-white text-xs font-bold transition flex items-center space-x-1.5 shadow-2xs cursor-pointer"
            >
              <PanelRight className="w-3.5 h-3.5" />
              <span>Progress</span>
            </button>
          </div>
        </div>

        {/* 3. MAIN WORKSPACE: Left 8 Cols (Conversation) + Right 4 Cols (Verification & Progress) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT / CENTER: MAIN CONVERSATION / GUIDED AREA (8 COLS) */}
          <div className="lg:col-span-8 space-y-5">
            
            {/* MODE 1: STEP-BY-STEP GUIDED WIZARD */}
            {activeMode === 'guided' && (
              <GuidedBookingStepper
                onComplete={(prompt, ctx) => {
                  setActiveMode('conversational');
                  handleSendMessage(prompt, ctx);
                }}
                onSkip={() => setActiveMode('conversational')}
                className="w-full"
              />
            )}

            {/* MODE 2: CONVERSATIONAL ASSISTANT */}
            {activeMode === 'conversational' && (
              <div className="space-y-5">
                
                {/* Independent Scrollable Message Stream Container */}
                <div className="max-h-[640px] overflow-y-auto space-y-5 pr-1.5 custom-scrollbar">
                  {messages.map((msg, idx) => (
                    <div key={msg.id || idx} className="space-y-3">
                      
                      {/* USER MESSAGE BUBBLE */}
                      {msg.sender === 'user' ? (
                        <div className="flex justify-end items-start gap-3">
                          <div className="max-w-xl bg-white dark:bg-[#0E273C] text-[#17324D] dark:text-white border border-slate-200/80 dark:border-white/10 rounded-3xl rounded-tr-sm p-4 sm:p-5 shadow-sm space-y-1.5">
                            <p className="text-xs sm:text-sm font-medium leading-relaxed">
                              {msg.text}
                            </p>
                            <div className="flex items-center justify-end space-x-1 text-[10px] text-slate-400">
                              <span>{msg.created_at || getCurrentTimeString()}</span>
                              <CheckCheck className="w-3.5 h-3.5 text-[#087F8C]" />
                            </div>
                          </div>

                          {/* User Avatar */}
                          <div className="w-9 h-9 rounded-2xl bg-[#17324D] text-white flex items-center justify-center text-xs font-black shrink-0 shadow-sm">
                            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                          </div>
                        </div>
                      ) : (
                        /* ASSISTANT MESSAGE WITH ROBOT AVATAR */
                        <div className="flex items-start gap-3 sm:gap-4">
                          
                          {/* Left Robot Avatar with glowing halo */}
                          <div className="shrink-0 pt-0.5">
                            <div className="relative p-1.5 rounded-3xl bg-teal-500/10 dark:bg-teal-400/10 ring-4 ring-teal-500/10 dark:ring-teal-400/10 backdrop-blur-md shadow-xs">
                              <VoyaraRobotAvatar size={idx === 0 ? 56 : 42} animate={idx === 0} waving={idx === 0} />
                            </div>
                          </div>

                          {/* Assistant Bubble Content */}
                          <div className="flex-1 max-w-2xl space-y-3">
                            <div className="bg-white/95 dark:bg-[#0E273C]/95 backdrop-blur-md text-[#17324D] dark:text-slate-100 border border-slate-200/80 dark:border-white/10 rounded-3xl rounded-tl-sm p-4 sm:p-5 shadow-sm space-y-3.5">
                              
                              {/* Clean Markdown Message Renderer */}
                              <AIMessageRenderer text={msg.text} />

                              {/* INITIAL TURN: 6 Quick Action Pill Buttons */}
                              {msg.showQuickActions && (
                                <div className="pt-2 border-t border-slate-100 dark:border-white/10">
                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                                    {[
                                      { key: 'find_stay', label: 'Find a Stay', icon: Search },
                                      { key: 'book_stay', label: 'Book a Stay', icon: Calendar },
                                      { key: 'find_nearby', label: 'Find Nearby', icon: MapPin },
                                      { key: 'check_availability', label: 'Check Availability', icon: Clock },
                                      { key: 'plan_trip', label: 'Plan a Trip', icon: Sparkles },
                                      { key: 'my_bookings', label: 'My Bookings', icon: Wallet }
                                    ].map((action) => {
                                      const Icon = action.icon;
                                      return (
                                        <button
                                          key={action.key}
                                          type="button"
                                          onClick={() => handleQuickAction(action.key)}
                                          className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 hover:bg-[#DDF3E7] dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 hover:text-[#087F8C] dark:hover:text-teal-300 border border-slate-200/60 dark:border-white/5 font-bold transition flex items-center justify-center space-x-1.5 shadow-2xs cursor-pointer group"
                                        >
                                          <Icon className="w-3.5 h-3.5 text-[#087F8C] group-hover:scale-110 transition-transform" />
                                          <span className="text-[11px] truncate">{action.label}</span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {/* EXTRACTED REQUIREMENTS GRID */}
                              {msg.extracted_requirements && Object.keys(msg.extracted_requirements).length > 0 && (
                                <div className="p-4 rounded-2xl bg-slate-50/90 dark:bg-slate-900/60 border border-slate-200/60 dark:border-white/5 space-y-3">
                                  <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-white/5">
                                    <span className="text-xs font-black text-[#17324D] dark:text-white uppercase tracking-wider flex items-center space-x-1.5">
                                      <Sparkles className="w-3.5 h-3.5 text-[#087F8C]" />
                                      <span>Trip Requirements</span>
                                    </span>
                                    <span className="text-[10px] text-teal-700 dark:text-teal-300 font-bold bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded-full border border-teal-200/40">
                                      AI Extracted
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                                    {msg.extracted_requirements.destination && (
                                      <div className="flex items-center space-x-2">
                                        <div className="w-7 h-7 rounded-xl bg-teal-50 dark:bg-teal-950/60 flex items-center justify-center text-[#087F8C] shrink-0 border border-teal-200/60 dark:border-teal-800/40">
                                          <MapPin className="w-3.5 h-3.5" />
                                        </div>
                                        <div className="min-w-0">
                                          <span className="text-[10px] text-slate-400 font-bold uppercase block">Destination</span>
                                          <span className="font-bold text-[#17324D] dark:text-white truncate block">{msg.extracted_requirements.destination}</span>
                                        </div>
                                      </div>
                                    )}

                                    {msg.extracted_requirements.check_in && msg.extracted_requirements.check_out && (
                                      <div className="flex items-center space-x-2">
                                        <div className="w-7 h-7 rounded-xl bg-teal-50 dark:bg-teal-950/60 flex items-center justify-center text-[#087F8C] shrink-0 border border-teal-200/60 dark:border-teal-800/40">
                                          <Calendar className="w-3.5 h-3.5" />
                                        </div>
                                        <div className="min-w-0">
                                          <span className="text-[10px] text-slate-400 font-bold uppercase block">Dates</span>
                                          <span className="font-bold text-[#17324D] dark:text-white truncate block">{msg.extracted_requirements.check_in} – {msg.extracted_requirements.check_out}</span>
                                        </div>
                                      </div>
                                    )}

                                    {msg.extracted_requirements.adults && (
                                      <div className="flex items-center space-x-2">
                                        <div className="w-7 h-7 rounded-xl bg-teal-50 dark:bg-teal-950/60 flex items-center justify-center text-[#087F8C] shrink-0 border border-teal-200/60 dark:border-teal-800/40">
                                          <Users className="w-3.5 h-3.5" />
                                        </div>
                                        <div className="min-w-0">
                                          <span className="text-[10px] text-slate-400 font-bold uppercase block">Guests</span>
                                          <span className="font-bold text-[#17324D] dark:text-white truncate block">
                                            {msg.extracted_requirements.adults} Adult{msg.extracted_requirements.adults > 1 ? 's' : ''}{msg.extracted_requirements.children > 0 ? `, ${msg.extracted_requirements.children} Ch` : ''}
                                          </span>
                                        </div>
                                      </div>
                                    )}

                                    <div className="flex items-center space-x-2">
                                      <div className="w-7 h-7 rounded-xl bg-teal-50 dark:bg-teal-950/60 flex items-center justify-center text-[#087F8C] shrink-0 border border-teal-200/60 dark:border-teal-800/40">
                                        <Bed className="w-3.5 h-3.5" />
                                      </div>
                                      <div className="min-w-0">
                                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Rooms</span>
                                        <span className="font-bold text-[#17324D] dark:text-white truncate block">
                                          {msg.extracted_requirements.requested_rooms_count || (msg.extracted_requirements.room_type ? `1 (${msg.extracted_requirements.room_type})` : '1 Room')}
                                        </span>
                                      </div>
                                    </div>

                                    {msg.extracted_requirements.budget_max ? (
                                      <div className="flex items-center space-x-2">
                                        <div className="w-7 h-7 rounded-xl bg-teal-50 dark:bg-teal-950/60 flex items-center justify-center text-[#087F8C] shrink-0 border border-teal-200/60 dark:border-teal-800/40">
                                          <Wallet className="w-3.5 h-3.5" />
                                        </div>
                                        <div className="min-w-0">
                                          <span className="text-[10px] text-slate-400 font-bold uppercase block">Budget</span>
                                          <span className="font-bold text-[#17324D] dark:text-white truncate block">₹{Number(msg.extracted_requirements.budget_max).toLocaleString('en-IN')}</span>
                                        </div>
                                      </div>
                                    ) : null}

                                    <div className="flex items-center space-x-2">
                                      <div className="w-7 h-7 rounded-xl bg-teal-50 dark:bg-teal-950/60 flex items-center justify-center text-[#087F8C] shrink-0 border border-teal-200/60 dark:border-teal-800/40">
                                        <Sparkles className="w-3.5 h-3.5" />
                                      </div>
                                      <div className="min-w-0">
                                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Preferences</span>
                                        <span className="font-bold text-[#17324D] dark:text-white truncate block">
                                          {msg.extracted_requirements.amenities && msg.extracted_requirements.amenities.length > 0
                                            ? msg.extracted_requirements.amenities.join(', ')
                                            : (msg.extracted_requirements.property_type || 'Any')}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Timestamp */}
                              <div className="text-[10px] text-slate-400 pt-1">
                                {msg.created_at || getCurrentTimeString()}
                              </div>
                            </div>

                            {/* CASE A & B: ALTERNATIVE STAYS LIST */}
                            {msg.alternatives && msg.alternatives.length > 0 && (
                              <div className="space-y-3 pt-2">
                                <span className="text-xs font-black text-[#17324D] dark:text-white uppercase tracking-wider flex items-center space-x-1.5">
                                  <Sparkles className="w-3.5 h-3.5 text-[#087F8C]" />
                                  <span>Available Verified Stays ({msg.alternatives.length})</span>
                                </span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  {msg.alternatives.map((alt, aIdx) => (
                                    <AlternativeStayCard
                                      key={aIdx}
                                      stay={alt}
                                      isRecommended={aIdx === 0}
                                      onSelect={handleSelectAlternative}
                                    />
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* CASE C: BOOKING READY PREVIEW */}
                            {msg.booking_preview && (
                              <div className="bg-gradient-to-br from-white via-teal-50/30 to-teal-100/40 dark:from-[#0E273C] dark:via-[#0E273C]/95 dark:to-teal-950/40 border-2 border-[#087F8C] rounded-3xl p-5 space-y-4 shadow-md">
                                <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-white/10">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-6 h-6 rounded-md bg-[#087F8C] text-white flex items-center justify-center shadow-xs">
                                      <CheckCircle2 className="w-4 h-4" />
                                    </div>
                                    <span className="font-bold text-sm text-[#17324D] dark:text-white uppercase tracking-wide">
                                      Booking Preview
                                    </span>
                                  </div>
                                  <span className="text-[11px] bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-200 px-2.5 py-0.5 rounded-full font-mono font-bold">
                                    {msg.booking_preview.preview_id}
                                  </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-white/80 dark:bg-slate-800/80 p-3.5 rounded-2xl border border-slate-200/60 dark:border-white/5">
                                  <div className="space-y-1">
                                    <span className="text-[10px] text-slate-400 uppercase font-bold">Stay</span>
                                    <div className="font-bold text-sm text-[#17324D] dark:text-white">
                                      {formatPropertyName(msg.booking_preview.property_name)}
                                    </div>
                                    <div className="text-slate-500 text-[11px] flex items-center">
                                      <MapPin className="w-3 h-3 mr-1 text-[#087F8C]" />
                                      <span>{msg.booking_preview.city}, {msg.booking_preview.state}</span>
                                    </div>
                                  </div>

                                  <div className="space-y-1">
                                    <span className="text-[10px] text-slate-400 uppercase font-bold">Room & Guests</span>
                                    <div className="font-bold text-sm text-[#087F8C] dark:text-teal-400">
                                      {formatRoomName(msg.booking_preview.room_name)}{msg.booking_preview.room_quantity > 1 ? ` × ${msg.booking_preview.room_quantity}` : ''}
                                    </div>
                                    <div className="text-slate-600 dark:text-slate-300 text-[11px]">
                                      {msg.booking_preview.adults} Adult{msg.booking_preview.adults > 1 ? 's' : ''}{msg.booking_preview.children > 0 ? `, ${msg.booking_preview.children} Children` : ''} · {msg.booking_preview.room_quantity || 1} Room
                                    </div>
                                  </div>
                                </div>

                                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl flex items-center justify-between text-xs">
                                  <div>
                                    <span className="text-slate-500">Dates:</span> <strong className="text-slate-800 dark:text-slate-200">{msg.booking_preview.check_in} → {msg.booking_preview.check_out}</strong>
                                    <span className="text-slate-400 ml-2">({msg.booking_preview.total_nights || msg.booking_preview.pricing?.nights || 1} nights)</span>
                                  </div>
                                  <div className="text-right">
                                    <span className="text-slate-400 text-[10px] uppercase font-bold block">
                                      ₹{Number(msg.booking_preview.pricing?.room_nightly_price || 0).toLocaleString('en-IN')}/night
                                    </span>
                                    <span className="text-base font-black font-mono text-[#087F8C] dark:text-teal-400">
                                      Total: ₹{Number(msg.booking_preview.pricing?.total_price || msg.booking_preview.total_price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between text-xs px-1">
                                  <span className="text-emerald-700 dark:text-emerald-300 font-bold flex items-center space-x-1">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Availability: Verified</span>
                                  </span>
                                  <span className="text-teal-700 dark:text-teal-300 font-bold flex items-center space-x-1">
                                    <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                                    <span>VeriNova Protected</span>
                                  </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setInputMessage('Change requirements: ');
                                      const inputEl = document.querySelector('input[type="text"]');
                                      if (inputEl) inputEl.focus();
                                    }}
                                    className="w-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold py-2.5 px-4 rounded-2xl transition text-xs cursor-pointer border border-slate-200/60 dark:border-white/5"
                                  >
                                    Change Requirements
                                  </button>

                                  <button
                                    type="button"
                                    disabled={confirming}
                                    onClick={() => handleConfirmBooking(msg.booking_preview)}
                                    className="w-full bg-gradient-to-r from-[#087F8C] to-[#0F9D9A] hover:from-[#0F9D9A] hover:to-[#087F8C] text-white font-bold py-2.5 px-4 rounded-2xl shadow-md transition flex items-center justify-center space-x-2 text-xs cursor-pointer"
                                  >
                                    <CreditCard className="w-4 h-4" />
                                    <span>Confirm Booking</span>
                                    <ArrowRight className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* CONFIRMED BOOKING RESULT */}
                            {(msg.intent === 'BOOKING_COMPLETED' || msg.intent === 'BOOKING_VERIFIED') && msg.booking && (
                              <div className="bg-emerald-50/95 dark:bg-emerald-950/40 border-2 border-emerald-500 rounded-3xl p-5 space-y-4 shadow-md">
                                <div className="flex items-center justify-between pb-3 border-b border-emerald-200 dark:border-emerald-800/40">
                                  <div className="flex items-center space-x-2">
                                    <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                                    <span className="font-bold text-sm text-[#17324D] dark:text-white">
                                      ✓ Booking Confirmed & VeriNova Verified
                                    </span>
                                  </div>
                                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200">
                                    Score: {msg.verification?.verinova_score ?? 100}/100
                                  </span>
                                </div>

                                <div className="bg-white dark:bg-slate-900/80 rounded-2xl p-4 space-y-2 border border-emerald-200 dark:border-emerald-800/40 text-xs">
                                  <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-white/5">
                                    <div>
                                      <span className="text-[10px] text-slate-400 font-bold uppercase">Booking Reference</span>
                                      <div className="font-mono font-bold text-sm text-[#087F8C] dark:text-teal-400 flex items-center space-x-1.5">
                                        <span>{msg.booking.booking_number}</span>
                                        <button
                                          type="button"
                                          onClick={() => handleCopyBookingNumber(msg.booking.booking_number)}
                                          className="text-slate-400 hover:text-slate-600 cursor-pointer"
                                          title="Copy reference"
                                        >
                                          <Copy className="w-3 h-3" />
                                        </button>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <span className="text-[10px] text-slate-400 font-bold uppercase">Total Paid</span>
                                      <div className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                                        ₹{Number(msg.booking.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-2 pt-1 text-slate-700 dark:text-slate-300">
                                    <div><span className="text-slate-400">Stay:</span> <strong>{formatPropertyName(msg.booking.property_name)}</strong></div>
                                    <div><span className="text-slate-400">Room:</span> <strong>{formatRoomName(msg.booking.rooms?.[0]?.room_name || 'Room')}</strong></div>
                                    <div><span className="text-slate-400">Dates:</span> <strong>{msg.booking.check_in} → {msg.booking.check_out}</strong></div>
                                    <div><span className="text-slate-400">Status:</span> <strong className="text-emerald-600">Confirmed</strong></div>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between pt-1">
                                  <span className="text-[11px] text-slate-500">Autonomous booking completed via Voyara AI.</span>
                                  <Link
                                    to="/customer/bookings"
                                    className="px-4 py-2 rounded-xl bg-[#087F8C] hover:bg-[#0F9D9A] text-white font-bold text-xs transition flex items-center space-x-1 shadow-xs"
                                  >
                                    <span>View My Journeys</span>
                                    <ArrowRight className="w-3.5 h-3.5" />
                                  </Link>
                                </div>
                              </div>
                            )}

                          </div>
                        </div>
                      )}

                    </div>
                  ))}

                  {/* Live Loading Indicator */}
                  {loading && (
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-2xl bg-teal-500/10 flex items-center justify-center shrink-0">
                        <VoyaraRobotAvatar size={32} />
                      </div>
                      <div className="flex items-center space-x-2.5 bg-white/90 dark:bg-[#0E273C]/90 backdrop-blur-md border border-slate-200/80 dark:border-white/10 rounded-2xl p-3.5 text-xs text-slate-700 dark:text-slate-200 shadow-xs">
                        <RefreshCw className="w-4 h-4 animate-spin text-[#087F8C]" />
                        <span>Evaluating live inventory and verifying authoritative database state...</span>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* 4. FLOATING MESSAGE INPUT DOCK */}
                <div className="pt-2">
                  <div className="bg-white/95 dark:bg-[#0E273C]/95 backdrop-blur-md border border-slate-200/80 dark:border-white/10 rounded-3xl p-3 sm:p-4 shadow-lg space-y-2.5">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSendMessage();
                      }}
                      className="flex items-center gap-2"
                    >
                      <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/60 flex items-center justify-center text-[#087F8C] shrink-0">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        placeholder="Ask me anything about your trip..."
                        className="flex-1 bg-transparent border-0 text-xs sm:text-sm text-[#17324D] dark:text-white placeholder-slate-400 focus:outline-none focus:ring-0"
                      />
                      <button
                        type="submit"
                        disabled={!inputMessage.trim() || loading}
                        className="w-10 h-10 rounded-2xl bg-gradient-to-r from-[#087F8C] to-[#0F9D9A] hover:from-[#0F9D9A] hover:to-[#087F8C] text-white flex items-center justify-center disabled:opacity-40 transition shadow-md shrink-0 cursor-pointer"
                        title="Send Request"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </form>

                    {/* Quick suggestion tags below input */}
                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 dark:border-white/5 text-[11px]">
                      <button
                        type="button"
                        onClick={() => handleSendMessage('Show top popular verified destinations in India')}
                        className="px-2.5 py-1 rounded-xl bg-slate-50 dark:bg-white/5 hover:bg-teal-50 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 font-medium transition cursor-pointer flex items-center space-x-1"
                      >
                        <span>📍 Popular Destinations</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSendMessage('What are best travel tips for booking hill stations in Kerala?')}
                        className="px-2.5 py-1 rounded-xl bg-slate-50 dark:bg-white/5 hover:bg-teal-50 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 font-medium transition cursor-pointer flex items-center space-x-1"
                      >
                        <span>💡 Travel Tips</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate('/customer/bookings')}
                        className="px-2.5 py-1 rounded-xl bg-slate-50 dark:bg-white/5 hover:bg-teal-50 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 font-medium transition cursor-pointer flex items-center space-x-1"
                      >
                        <span>🧳 My Bookings</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* 5. BOTTOM TRUST BADGES */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <div className="flex items-center space-x-2.5 p-3 rounded-2xl bg-white/80 dark:bg-[#0E273C]/80 backdrop-blur-md border border-slate-200/60 dark:border-white/5 shadow-2xs">
                    <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/60 flex items-center justify-center text-[#087F8C] shrink-0">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-[#17324D] dark:text-white truncate">Verified Stays</div>
                      <div className="text-[10px] text-slate-400 truncate">Only trusted properties</div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2.5 p-3 rounded-2xl bg-white/80 dark:bg-[#0E273C]/80 backdrop-blur-md border border-slate-200/60 dark:border-white/5 shadow-2xs">
                    <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/60 flex items-center justify-center text-[#087F8C] shrink-0">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-[#17324D] dark:text-white truncate">Real-time Availability</div>
                      <div className="text-[10px] text-slate-400 truncate">Live room & price updates</div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2.5 p-3 rounded-2xl bg-white/80 dark:bg-[#0E273C]/80 backdrop-blur-md border border-slate-200/60 dark:border-white/5 shadow-2xs">
                    <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/60 flex items-center justify-center text-[#087F8C] shrink-0">
                      <Lock className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-[#17324D] dark:text-white truncate">Secure Payments</div>
                      <div className="text-[10px] text-slate-400 truncate">100% safe & reliable</div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2.5 p-3 rounded-2xl bg-white/80 dark:bg-[#0E273C]/80 backdrop-blur-md border border-slate-200/60 dark:border-white/5 shadow-2xs">
                    <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/60 flex items-center justify-center text-[#087F8C] shrink-0">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-[#17324D] dark:text-white truncate">Powered by VeriNova</div>
                      <div className="text-[10px] text-slate-400 truncate">Independent verification</div>
                    </div>
                  </div>
                </div>

              </div>
            )}

          </div>

          {/* RIGHT: PERSISTENT BOOKING PROGRESS & VERIFICATION PANEL (4 COLS) */}
          <div className="hidden lg:block lg:col-span-4 sticky top-20 space-y-4 max-h-[calc(100vh-100px)] overflow-y-auto custom-scrollbar">
            <BookingVerificationPanel
              stepProgress={stepProgress}
              agentStatus={agentStatus}
              verinovaStatus={verinovaStatus}
              verificationScore={verificationScore}
              bookingPreview={latestPreview}
              confirmedBooking={latestConfirmedBooking}
            />
          </div>

          {/* MOBILE DRAWER FOR VERIFICATION PANEL */}
          {showRightPanelMobile && (
            <div className="lg:hidden fixed inset-0 z-50 flex">
              <div
                className="fixed inset-0 bg-black/60 backdrop-blur-xs"
                onClick={() => setShowRightPanelMobile(false)}
              />
              <div className="relative ml-auto max-w-sm w-full bg-white dark:bg-[#091B29] p-4 overflow-y-auto h-full space-y-4 shadow-2xl">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-white/10">
                  <h3 className="font-bold text-sm text-[#17324D] dark:text-white flex items-center space-x-2">
                    <ShieldCheck className="w-4 h-4 text-[#087F8C]" />
                    <span>Booking Progress & Verification</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowRightPanelMobile(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <BookingVerificationPanel
                  stepProgress={stepProgress}
                  agentStatus={agentStatus}
                  verinovaStatus={verinovaStatus}
                  verificationScore={verificationScore}
                  bookingPreview={latestPreview}
                  confirmedBooking={latestConfirmedBooking}
                />
              </div>
            </div>
          )}

        </div>

      </div>

      {/* 6. SLIDE-OVER TRIP HISTORY DRAWER */}
      {showSessionsSidebar && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => setShowSessionsSidebar(false)}
          />
          <div className="relative ml-auto max-w-sm w-full bg-white dark:bg-[#091B29] p-5 overflow-y-auto h-full space-y-4 shadow-2xl z-50">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
              <h3 className="font-bold text-sm text-[#17324D] dark:text-white flex items-center space-x-2">
                <Clock className="w-4 h-4 text-[#087F8C]" />
                <span>AI Trip Journeys ({sessions.length})</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowSessionsSidebar(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              {sessions.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">No previous AI bookings found.</p>
              ) : (
                sessions.map((sess) => (
                  <button
                    key={sess.id}
                    type="button"
                    onClick={() => loadSessionHistory(sess.id)}
                    className={`w-full text-left p-3.5 rounded-2xl border transition text-xs space-y-1.5 cursor-pointer ${
                      sessionId === sess.id
                        ? 'bg-teal-50 dark:bg-teal-950/40 border-[#087F8C] text-[#17324D] dark:text-white shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span className="truncate">{sess.destination || sess.requirements?.destination || 'Journey'}</span>
                      <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded font-bold ${
                        sess.status === 'CONFIRMED' || sess.status === 'COMPLETED'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}>
                        {sess.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {sess.dates_formatted || 'Custom dates'}
                    </div>
                    {sess.booking_number && (
                      <div className="font-mono text-[#087F8C] font-bold text-[10px]">
                        Ref: {sess.booking_number}
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 7. LIVE BOOKING EXECUTION MODAL */}
      <BookingExecutionModal
        isOpen={executionModalOpen}
        confirming={confirming}
        booking={latestConfirmedBooking}
        verification={verinovaStatus}
        onClose={() => setExecutionModalOpen(false)}
      />

    </div>
  );
};

export default AIBooking;
