import { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';

/**
 * Scrollable chat message list with avatars, typing indicator, inline suggested slot card,
 * and clickable smart alternative suggestion chips.
 */
export default function ChatWindow({
  messages,
  pendingBooking,
  loading,
  onConfirm,
  onCancel,
  onSelectAlternative,
}) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, pendingBooking]);

  const lastMsgId = messages[messages.length - 1]?.id;

  function formatTime(t) {
    if (!t) return '';
    const [hh, mm] = t.split(':').map(Number);
    return `${hh % 12 || 12}:${String(mm).padStart(2, '0')} ${hh >= 12 ? 'PM' : 'AM'}`;
  }

  function formatDate(d) {
    if (!d) return '';
    const dt = new Date(d + 'T12:00:00');
    return dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  return (
    <div className="chat-window" role="log" aria-live="polite">
      {messages.map(msg => (
        <MessageBubble key={msg.id} role={msg.role} text={msg.text}>

          {/* Dynamic Clickable Alternative Chips */}
          {msg.alternatives && msg.alternatives.length > 0 && (
            <div className="slot-alternatives-container">
              <div className="slot-alternatives-header">
                <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--orange)' }}>
                  auto_awesome
                </span>
                <span>Suggested Alternatives (Click to Select):</span>
              </div>
              <div className="slot-alternatives-list">
                {msg.alternatives.map((alt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="alt-chip-btn"
                    onClick={() => onSelectAlternative && onSelectAlternative(alt)}
                    title={`Select ${alt.employee?.name || alt.stylist?.name || 'Stylist'} on ${alt.date} at ${alt.time}`}
                  >
                    <div className="alt-chip-title">
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>schedule</span>
                      {alt.label || `${alt.time} with ${alt.employee?.name || alt.stylist?.name || 'Stylist'}`}
                    </div>
                    {alt.badge && <span className="alt-chip-badge">{alt.badge}</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Inline Suggested Slot Card with Estimated Price */}
          {msg.role === 'assistant' && pendingBooking && msg.id === lastMsgId && (
            <div className="inline-slot-container">
              <div className="inline-slot-label">SUGGESTED APPOINTMENT SLOT</div>
              <div className="inline-slot-card neo-shadow-md">
                <div className="inline-slot-header">
                  <span className="inline-slot-date">{formatDate(pendingBooking.date)}</span>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span className="inline-slot-price">
                      {pendingBooking.servicePrice || pendingBooking.price || '$45.00'}
                    </span>
                    <span className="inline-slot-duration">
                      {pendingBooking.durationMin || pendingBooking.serviceDuration || 45} mins
                    </span>
                  </div>
                </div>

                <div className="inline-slot-body">
                  <div className="inline-slot-time">{formatTime(pendingBooking.time)}</div>
                  <div className="inline-slot-service">{pendingBooking.serviceName}</div>
                  <div className="inline-slot-stylist">
                    <span className="material-symbols-outlined" style={{ fontSize: 15 }}>badge</span>
                    Stylist: <strong>{pendingBooking.employeeName}</strong>
                  </div>
                </div>

                <div className="inline-slot-actions">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={onConfirm}
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check_circle</span>
                    Confirm Booking
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={onCancel}
                    style={{ justifyContent: 'center' }}
                  >
                    Decline
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Confirmed appointment badge */}
          {msg.appointment && (
            <div className="appt-confirmed-badge">
              <span className="material-symbols-outlined fill" style={{ fontSize: 16 }}>check_circle</span>
              Booking ID: {msg.appointment.id?.slice(0, 8).toUpperCase()}
            </div>
          )}
        </MessageBubble>
      ))}

      {/* Typing indicator with AI Avatar */}
      {loading && (
        <div className="msg-row msg-row--ai">
          <div className="msg-avatar msg-avatar--ai" title="StylistAI Assistant">
            <span className="material-symbols-outlined fill" style={{ fontSize: 18 }}>smart_toy</span>
          </div>
          <div className="typing-dots">
            <span /><span /><span />
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
