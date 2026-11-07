import React, { useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import ChatHero          from '../components/chat/ChatHero';
import ChatWindow        from '../components/chat/ChatWindow';
import ChatInput         from '../components/chat/ChatInput';
import BookingCloudPanel from '../components/chat/BookingCloudPanel';
import ClickSpark        from '../components/shared/ClickSpark';
import { speakText, stopSpeaking } from '../services/ttsService';
import { sendBookingEmail } from '../services/emailService';
import { useAuth } from '../context/AuthContext';
import { useAppointments } from '../context/AppointmentContext';
import {
  detectUserIntent,
  executeAssistantTool,
  formatTime12h,
  formatDatePretty,
} from '../services/availabilityEngine';
import { ArrowLeft, Volume2, VolumeX } from 'lucide-react';
import './ChatPage.css';

export default function ChatPage() {
  const { user } = useAuth();
  const {
    services,
    staffList,
    appointments,
    blockedTimes,
    businessSettings,
    bookAppointment,
    cancelAppointment,
    rescheduleAppointment,
  } = useAppointments();

  const welcomeMessage = useMemo(() => {
    const activeStaff = (staffList || []).filter(s => s.active !== false);
    const names = activeStaff.map(s => `**${s.name.split(' ')[0]}**`).join(', ');
    return {
      id: 'welcome',
      role: 'assistant',
      text: `Hi there! Ready for your next look? What are we doing today?\n\nI can help you book with our specialists (${names || 'Sarah, Emma, David, Aria, Marcus, Chloe'}) — just tell me what service you need, when, and any stylist preference!`,
    };
  }, [staffList]);

  const [messages,       setMessages]       = useState(() => [welcomeMessage]);
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState(null);
  const [pendingBooking, setPendingBooking] = useState(null);
  const [latestIntent,   setLatestIntent]   = useState(null);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false); // Muted by default

  // Toggle Voice Output
  const handleToggleVoice = () => {
    setIsVoiceEnabled(prev => {
      const next = !prev;
      if (!next) stopSpeaking();
      return next;
    });
  };

  // Build conversation history from messages
  const buildHistory = useCallback(() => {
    return messages
      .filter(m => m.id !== 'welcome')
      .map(m => ({
        role:  m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.text }],
      }));
  }, [messages]);

  // Handle customer choosing a suggested alternative chip
  const handleSelectAlternative = useCallback((alt) => {
    stopSpeaking();
    const serviceName = alt.service?.name || pendingBooking?.serviceName || services[0]?.name || 'Haircut & Styling';
    const targetService = services.find(s => s.name === serviceName) || services[0];
    const targetEmp = alt.employee || alt.stylist || staffList[0];

    const newPending = {
      serviceName: targetService.name,
      serviceDuration: Number(targetService.duration || 45),
      servicePrice: `$${targetService.price}.00`,
      employeeName: targetEmp.name,
      employeeRole: targetEmp.role || 'Stylist',
      date: alt.date,
      time: alt.time,
      customerName: user?.name || 'Valued Client',
      customerEmail: user?.email || 'customer@example.com',
    };

    setPendingBooking(newPending);
    setLatestIntent({
      service: targetService.name,
      employeePreference: targetEmp.name,
      date: alt.date,
      time: alt.time,
    });

    const replyText = `Awesome! I have set up your **${targetService.name}** with **${targetEmp.name}** for **${formatDatePretty(alt.date)} at ${formatTime12h(alt.time)}**.\n\nPlease click **Confirm Booking** below to secure your spot!`;

    const assistantMsg = {
      id: Date.now(),
      role: 'assistant',
      text: replyText,
    };

    setMessages(prev => [...prev, assistantMsg]);
    if (isVoiceEnabled) {
      speakText(`Selected ${targetService.name} with ${targetEmp.name} at ${formatTime12h(alt.time)}. Click confirm to finalize.`);
    }
  }, [pendingBooking, services, staffList, user, isVoiceEnabled]);

  const sendMessage = useCallback(async (text) => {
    if (!text.trim() || loading) return;

    // Stop previous voice articulation if user sends a new message
    stopSpeaking();

    const userText = text.trim();
    const userMsg = { id: Date.now(), role: 'user', text: userText };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);
    setError(null);

    const lower = userText.toLowerCase();
    const isConfirm = ['yes', 'confirm', 'book', 'book it', 'please', 'ok', 'sure', 'sounds good', 'perfect', 'yes please'].some(w => lower === w || lower.startsWith(w));
    const isDecline = ['no', 'cancel', 'nevermind', 'stop', 'no thanks', 'change'].some(w => lower === w || lower.startsWith(w));

    // ── Quick Action: User Declines Booking ─────────────────────────────────
    if (pendingBooking && isDecline) {
      setPendingBooking(null);
      setLatestIntent(null);
      const cancelMsg = {
        id: Date.now() + 1,
        role: 'assistant',
        text: "No problem at all! I've cleared that proposed slot. What treatment, stylist, or time would you like to explore instead?",
      };
      setMessages(prev => [...prev, cancelMsg]);
      setLoading(false);
      return;
    }

    // ── Intelligent Cascade: Backend AI or Dynamic Client Engine ────────────
    let handled = false;

    // Try backend AI service if reachable
    try {
      const { data } = await api.post('/chat', {
        message:        userText,
        history:        buildHistory(),
        pendingBooking,
      });

      if (data && data.message) {
        const assistantMsg = {
          id:          Date.now() + 1,
          role:        'assistant',
          text:        data.message,
          appointment: data.appointment || null,
        };

        setMessages(prev => [...prev, assistantMsg]);
        setPendingBooking(data.pendingBooking || null);
        if (data.intent) setLatestIntent(data.intent);

        if (isVoiceEnabled && data.message) {
          speakText(data.message);
        }

        if (data.appointment) {
          sendBookingEmail(data.appointment);
          bookAppointment({
            customerName: data.appointment.customer_name || user?.name || 'Customer',
            customerEmail: data.appointment.customer_email || user?.email || 'customer@example.com',
            serviceName: data.appointment.services?.name || 'Haircut & Styling',
            serviceDuration: data.appointment.services?.duration_minutes || 45,
            employeeName: data.appointment.employees?.name || 'Sarah Jenkins',
            date: data.appointment.appointment_date,
            time: data.appointment.appointment_time,
            notes: data.appointment.notes || 'Booked via AI Assistant',
          });
        }
        handled = true;
      }
    } catch {
      // Backend not running or in local preview: use dynamic availability engine!
      handled = false;
    }

    if (!handled) {
      // ── Offline fallback: User Confirms Booking when backend is offline ──
      if (pendingBooking && isConfirm) {
        try {
          const newApt = bookAppointment({
            customerName: pendingBooking.customerName || user?.name || 'Valued Client',
            customerEmail: pendingBooking.customerEmail || user?.email || 'client@example.com',
            serviceName: pendingBooking.serviceName,
            serviceDuration: pendingBooking.serviceDuration || 45,
            servicePrice: pendingBooking.servicePrice || '$45.00',
            employeeName: pendingBooking.employeeName,
            employeeRole: pendingBooking.employeeRole || 'Stylist',
            date: pendingBooking.date,
            time: pendingBooking.time,
            notes: 'Booked via StylistAI Assistant (Offline Mode)',
          });

          try {
            sendBookingEmail(newApt);
          } catch {
            /* non-blocking local preview */
          }

          const confirmMsg = {
            id: Date.now() + 1,
            role: 'assistant',
            text: `🎉 You're all set! Your appointment for **${pendingBooking.serviceName}** with **${pendingBooking.employeeName}** has been confirmed for **${formatDatePretty(pendingBooking.date)} at ${formatTime12h(pendingBooking.time)}**.\n\n📩 A confirmation email has been dispatched to **${pendingBooking.customerEmail || 'your email'}** *(please check your **Spam / Junk** folder if it doesn't appear in your main inbox!)*\n\nA confirmation has been generated in your account timeline. See you at the salon!`,
            appointment: newApt,
          };

          setMessages(prev => [...prev, confirmMsg]);
          if (isVoiceEnabled) {
            speakText(`You're all set! Your appointment for ${pendingBooking.serviceName} with ${pendingBooking.employeeName} is confirmed.`);
          }
          setPendingBooking(null);
          setLatestIntent(null);
        } catch (err) {
          setError('Failed to finalize booking: ' + err.message);
        } finally {
          setLoading(false);
        }
        return;
      }

      // ── Dynamic Availability & Alternatives Engine Fallback ───────────────
      // Execute controlled AI Assistant Tool (Spec Pages 10-12, 23)
      const detectedTool = detectUserIntent(userText);
      const toolResult = executeAssistantTool({
        tool: detectedTool,
        userText,
        user,
        services,
        staffList,
        appointments,
        blockedTimes,
        businessSettings,
        actions: {
          cancelAppointment,
          rescheduleAppointment,
        },
      });

      // Update cloud panel intent
      setLatestIntent(toolResult.structuredOutput || null);

      if (toolResult.intent === 'BOOK_APPOINTMENT' && toolResult.available) {
        setPendingBooking({
          serviceName: toolResult.service.name,
          serviceDuration: toolResult.duration,
          servicePrice: toolResult.price,
          employeeName: toolResult.employee.name,
          employeeRole: toolResult.employee.role,
          date: toolResult.date,
          time: toolResult.time,
          customerName: user?.name || 'Customer',
          customerEmail: user?.email || 'customer@example.com',
        });
      }

      let replyText = toolResult.message;
      if (toolResult.intent === 'BOOK_APPOINTMENT' && toolResult.available) {
        replyText += "\n\nI have prepared your reservation card below. Would you like to confirm this appointment?";
      }

      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          role: 'assistant',
          text: replyText,
          alternatives: toolResult.alternatives || [],
        },
      ]);

      if (isVoiceEnabled && replyText) {
        speakText(replyText.split('\n')[0]);
      }
    }

    setLoading(false);
  }, [
    loading,
    pendingBooking,
    buildHistory,
    isVoiceEnabled,
    bookAppointment,
    cancelAppointment,
    rescheduleAppointment,
    user,
    services,
    staffList,
    appointments,
    blockedTimes,
    businessSettings,
  ]);

  const handleConfirm = () => sendMessage('Yes, please confirm the appointment.');
  const handleCancel  = () => sendMessage('No, cancel this booking.');

  // Clear / Restart Chat Option
  const handleReset = () => {
    stopSpeaking();
    setMessages([welcomeMessage]);
    setPendingBooking(null);
    setLatestIntent(null);
    setError(null);
  };

  return (
    <ClickSpark
      sparkColor="#FF6F20"
      sparkSize={12}
      sparkRadius={20}
      sparkCount={8}
      duration={400}
    >
      <div className="chat-page">
        {/* Clean Chat Toolbar */}
        <div style={{
          maxWidth: 1320,
          margin: '4px auto 0 auto',
          padding: '0 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%',
        }}>
          <Link
            to="/dashboard"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13,
              fontWeight: 700,
              textDecoration: 'none',
              color: 'var(--charcoal-dark)',
              background: 'var(--surface-white)',
              padding: '6px 12px',
              borderRadius: 6,
              border: '1.5px solid var(--charcoal-dark)',
              boxShadow: '2px 2px 0px var(--charcoal-dark)'
            }}
          >
            <ArrowLeft size={15} />
            <span>Back to Appointments</span>
          </Link>

          <button
            type="button"
            onClick={handleToggleVoice}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              fontWeight: 800,
              cursor: 'pointer',
              background: isVoiceEnabled ? 'var(--orange)' : 'var(--surface-white)',
              color: isVoiceEnabled ? '#fff' : 'var(--charcoal-dark)',
              padding: '6px 12px',
              borderRadius: 6,
              border: '1.5px solid var(--charcoal-dark)',
              boxShadow: '2px 2px 0px var(--charcoal-dark)'
            }}
          >
            {isVoiceEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
            <span>{isVoiceEnabled ? 'VOICE ON' : 'MUTED'}</span>
          </button>
        </div>

        <main className="chat-main">
          <ChatHero />

          {/* Error banner */}
          {error && (
            <div className="chat-error-banner" role="alert">
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>warning</span>
              {error}
              <button
                type="button"
                onClick={() => setError(null)}
                aria-label="Dismiss error"
                style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: 8, fontWeight: 700 }}
              >
                ×
              </button>
            </div>
          )}

          {/* ── Parallel 2-Column Bento: Left (Chat) + Right (Selection Cloud) ── */}
          <div className="chat-bento">
            {/* Left side: Chat Canvas & Input */}
            <div className="chat-left">
              <div className="chat-canvas neo-shadow-lg">
                {/* Canvas header */}
                <div className="chat-canvas-header">
                  <div className="chat-canvas-brand">
                    <span className="material-symbols-outlined fill" style={{ color: 'var(--orange)', fontSize: 22 }}>
                      smart_toy
                    </span>
                    <div>
                      <div className="chat-canvas-name">StylistAI</div>
                      <div className="chat-canvas-sub">DYNAMIC BOOKING ASSISTANT</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button
                      type="button"
                      onClick={handleToggleVoice}
                      title={isVoiceEnabled ? 'Click to Mute Voice' : 'Click to Enable Voice'}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        fontSize: 11,
                        fontWeight: 800,
                        cursor: 'pointer',
                        background: isVoiceEnabled ? 'var(--orange)' : '#f3f4f6',
                        color: isVoiceEnabled ? '#fff' : '#4b5563',
                        padding: '4px 8px',
                        borderRadius: 4,
                        border: '1.5px solid var(--charcoal-dark)',
                        boxShadow: '1.5px 1.5px 0px var(--charcoal-dark)',
                      }}
                    >
                      {isVoiceEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
                      <span>{isVoiceEnabled ? 'VOICE ON' : 'MUTED'}</span>
                    </button>
                    <div className="chat-canvas-dots">
                      <span /><span /><span />
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <ChatWindow
                  messages={messages}
                  pendingBooking={pendingBooking}
                  loading={loading}
                  onConfirm={handleConfirm}
                  onCancel={handleCancel}
                  onSelectAlternative={handleSelectAlternative}
                />
              </div>

              {/* Input bar */}
              <ChatInput onSend={sendMessage} disabled={loading} />
            </div>

            {/* Right side: Cloud Panel with user info & clear chat option */}
            <div className="chat-right">
              <BookingCloudPanel
                intent={latestIntent}
                pendingBooking={pendingBooking}
                onReset={handleReset}
                onConfirm={handleConfirm}
                onCancel={handleCancel}
                loading={loading}
              />
            </div>
          </div>
        </main>
      </div>
    </ClickSpark>
  );
}
