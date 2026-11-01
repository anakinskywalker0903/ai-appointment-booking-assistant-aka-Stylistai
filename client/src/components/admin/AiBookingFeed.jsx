import React from 'react';

/**
 * Live AI Booking Feed — shows recent AI-booked appointments with real statuses and timestamps.
 * appointments: full list
 */
export default function AiBookingFeed({ appointments = [] }) {
  // Sort by date/time descending to show the most recent bookings first
  const recent = [...appointments]
    .sort((a, b) => {
      const dateA = a.created_at || a.appointment_date || a.date || '';
      const dateB = b.created_at || b.appointment_date || b.date || '';
      return dateB.localeCompare(dateA);
    })
    .slice(0, 4);

  function timeAgo(ts, dateStr) {
    const raw = ts || dateStr;
    if (!raw) return 'Recently';

    const parsed = new Date(raw);
    if (isNaN(parsed.getTime())) {
      return 'Recently';
    }

    const diff = Math.floor((Date.now() - parsed.getTime()) / 1000);
    if (diff < 60 && diff >= 0) return 'Just now';
    if (diff < 3600 && diff >= 0) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400 && diff >= 0) return `${Math.floor(diff / 3600)}h ago`;
    if (diff >= 86400 && diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
    return dateStr || 'Recently';
  }

  function formatTime(t) {
    if (!t) return '';
    const [hh, mm] = t.slice(0, 5).split(':').map(Number);
    return `${hh % 12 || 12}:${String(mm).padStart(2, '0')} ${hh >= 12 ? 'PM' : 'AM'}`;
  }

  if (recent.length === 0) {
    return (
      <div className="feed-empty">
        <span className="material-symbols-outlined" style={{ fontSize: 32, opacity: 0.3 }}>smart_toy</span>
        <p>No recent AI bookings recorded.</p>
      </div>
    );
  }

  return (
    <div className="feed-list">
      {recent.map(appt => {
        const isConfirmed = appt.status === 'confirmed';
        const isPending = appt.status === 'pending';
        const isCancelled = appt.status === 'cancelled';
        const hasCalSync = !!appt.calendar_event_id;

        return (
          <div
            key={appt.id}
            className={`feed-card neo-shadow-sm feed-card--${appt.status}`}
          >
            <div className="feed-card-header">
              <span className={`feed-badge feed-badge--${appt.status}`}>
                {isConfirmed && (
                  <>
                    <span className="material-symbols-outlined" style={{ fontSize: 13 }}>check_circle</span>
                    Confirmed
                  </>
                )}
                {isPending && (
                  <>
                    <span className="material-symbols-outlined" style={{ fontSize: 13 }}>pending_actions</span>
                    Needs Approval
                  </>
                )}
                {isCancelled && (
                  <>
                    <span className="material-symbols-outlined" style={{ fontSize: 13 }}>cancel</span>
                    Cancelled
                  </>
                )}
              </span>
              <span className="feed-card-time">
                {timeAgo(appt.created_at, appt.appointment_date || appt.date)}
              </span>
            </div>

            <div className="feed-card-main">
              <div className="feed-card-service-title">
                {appt.services?.name || appt.serviceName || 'Haircut & Styling'}
              </div>
              <div className="feed-card-client">
                Client: <strong>{appt.customer_name || appt.customerName || 'Anonymous'}</strong>
              </div>
            </div>

            <div className="feed-card-tags">
              <span className="feed-tag">
                📅 {appt.appointment_date || appt.date}
              </span>
              <span className="feed-tag">
                ⏰ {formatTime(appt.appointment_time || appt.time)}
              </span>
              {(appt.employees?.name || appt.employeeName) && (
                <span className="feed-tag">
                  ✂️ {appt.employees?.name || appt.employeeName}
                </span>
              )}
            </div>

            <div className="feed-card-footer">
              <span className="feed-card-price">
                ${appt.services?.price || appt.servicePrice || 45}
              </span>
              {hasCalSync ? (
                <span className="feed-cal-synced" title="Synced to Google Calendar">
                  <span className="material-symbols-outlined" style={{ fontSize: 13 }}>cloud_done</span>
                  Calendar Synced
                </span>
              ) : (
                <span className="feed-source-label">
                  <span className="material-symbols-outlined" style={{ fontSize: 12 }}>smart_toy</span>
                  AI Processed
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
