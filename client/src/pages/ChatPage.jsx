import React, { useState, useCallback } from 'react';
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
import { ArrowLeft, Volume2, VolumeX } from 'lucide-react';
import './ChatPage.css';

const WELCOME_MSG = {
  id: 'welcome',
  role: 'assistant',
  text: "Hi there! Ready for your next look? What are we doing today?\n\nI can help you book with **Sarah**, **Emma**, or **David** — just tell me what service you need, when, and any stylist preference.",
};

export default function ChatPage() {
  const { user } = useAuth();
  const { bookAppointment } = useAppointments();

  const [messages,       setMessages]       = useState([WELCOME_MSG]);
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState(null);
  const [pendingBooking, setPendingBooking] = useState(null);
  const [latestIntent,   setLatestIntent]   = useState(null);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);

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

  const sendMessage = useCallback(async (text) => {
    if (!text.trim() || loading) return;

    // Stop previous voice articulation if user starts speaking/sending
    stopSpeaking();

    const userMsg = { id: Date.now(), role: 'user', text: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);
    setError(null);

    try {
      const { data } = await api.post('/chat', {
        message:        text.trim(),
        history:        buildHistory(),
        pendingBooking,
      });

      const assistantMsg = {
        id:          Date.now() + 1,
        role:        'assistant',
        text:        data.message,
        appointment: data.appointment || null,
      };

      setMessages(prev => [...prev, assistantMsg]);
      setPendingBooking(data.pendingBooking || null);
      if (data.intent) setLatestIntent(data.intent);

      // 1. Text-to-Speech Output
      if (isVoiceEnabled && data.message) {
        speakText(data.message);
      }

      // 2. EmailJS Confirmation Email Dispatch
      if (data.appointment) {
        sendBookingEmail(data.appointment);

        // Sync with local shared appointment store
        bookAppointment({
          customerName: data.appointment.customer_name || user?.name || 'Customer',
          customerEmail: data.appointment.customer_email || user?.email || 'customer@example.com',
          serviceName: data.appointment.services?.name || 'Haircut',
          serviceDuration: data.appointment.services?.duration_minutes || 45,
          employeeName: data.appointment.employees?.name || 'Sarah Jenkins',
          date: data.appointment.appointment_date,
          time: data.appointment.appointment_time,
          notes: data.appointment.notes || 'Booked via AI Assistant',
        });
      }

    } catch (err) {
      setError(err.response?.data?.error || 'AI service unavailable. You can also book directly from the Customer Portal!');
    } finally {
      setLoading(false);
    }
  }, [loading, pendingBooking, buildHistory, isVoiceEnabled, bookAppointment, user]);

  const handleConfirm = () => sendMessage('Yes, please confirm the appointment.');
  const handleCancel  = () => sendMessage('No, cancel this booking.');

  // Clear / Restart Chat Option
  const handleReset = () => {
    stopSpeaking();
    setMessages([WELCOME_MSG]);
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
          margin: '12px auto 0 auto',
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
                      <div className="chat-canvas-sub">ASSISTANT</div>
                    </div>
                  </div>
                  <div className="chat-canvas-dots">
                    <span /><span /><span />
                  </div>
                </div>

                {/* Messages */}
                <ChatWindow
                  messages={messages}
                  pendingBooking={pendingBooking}
                  loading={loading}
                  onConfirm={handleConfirm}
                  onCancel={handleCancel}
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
