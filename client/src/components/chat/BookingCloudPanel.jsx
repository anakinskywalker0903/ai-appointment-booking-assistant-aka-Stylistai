import React from 'react';
import { useAppointments } from '../../context/AppointmentContext';

/**
 * BookingCloudPanel — Right-hand side cloud panel showing real-time
 * user selections, floating chips, dynamic treatment price, pending booking confirmation, and Clear/Restart Chat option.
 */
export default function BookingCloudPanel({
  intent,
  pendingBooking,
  onReset,
  onConfirm,
  onCancel,
  loading
}) {
  const { services } = useAppointments();

  const serviceName = pendingBooking?.serviceName  || intent?.service            || null;
  const date        = pendingBooking?.date         || intent?.date               || null;
  const time        = pendingBooking?.time         || intent?.time               || null;
  const stylist     = pendingBooking?.employeeName || intent?.employeePreference || null;
  const duration    = pendingBooking?.durationMin  || pendingBooking?.serviceDuration || null;
  const name        = pendingBooking?.customerName || intent?.customerName       || null;
  const email       = pendingBooking?.customerEmail || intent?.customerEmail     || null;

  // Resolve dynamic price from service catalog or pending booking (Zero Hardcoding!)
  const matchedService = services?.find(s => s.name?.toLowerCase() === serviceName?.toLowerCase());
  const price = pendingBooking?.servicePrice || (matchedService ? `$${matchedService.price}.00` : null);

  function formatDate(d) {
    if (!d) return null;
    const dt = new Date(d + 'T12:00:00');
    return dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  function formatTime(t) {
    if (!t) return null;
    const [hh, mm] = t.split(':').map(Number);
    return `${hh % 12 || 12}:${String(mm).padStart(2, '0')} ${hh >= 12 ? 'PM' : 'AM'}`;
  }

  const chips = [
    { icon: 'content_cut',     label: serviceName,         tag: 'Service',     key: 'service' },
    { icon: 'payments',        label: price,               tag: 'Est. Cost',   key: 'price' },
    { icon: 'person',          label: stylist,             tag: 'Stylist',     key: 'stylist' },
    { icon: 'calendar_today',  label: formatDate(date),    tag: 'Date',        key: 'date' },
    { icon: 'schedule',        label: formatTime(time),    tag: 'Time',        key: 'time' },
    { icon: 'timer',           label: duration ? `${duration} min` : null, tag: 'Duration', key: 'duration' },
    { icon: 'badge',           label: name,                tag: 'Name',        key: 'name' },
    { icon: 'mail',            label: email,               tag: 'Email',       key: 'email' },
  ].filter(c => c.label);

  const hasSelections = chips.length > 0;

  return (
    <aside className="cloud-panel neo-shadow-lg" aria-label="Booking Information Cloud">
      {/* Cloud Header */}
      <div className="cloud-panel-header">
        <div className="cloud-panel-title-wrap">
          <span className="material-symbols-outlined fill" style={{ color: 'var(--orange)', fontSize: 22 }}>
            cloud_queue
          </span>
          <h2 className="cloud-panel-title">Active Booking Cloud</h2>
        </div>
        <button
          type="button"
          className="cloud-reset-btn"
          onClick={onReset}
          title="Restart Conversation & Clear Cloud"
          aria-label="Restart Conversation"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>refresh</span>
          Reset
        </button>
      </div>

      <p className="cloud-panel-subtitle">
        Real-time booking parameters extracted by our dynamic availability engine.
      </p>

      {/* Dynamic Floating Chips */}
      <div className="cloud-chips-wrap">
        {!hasSelections ? (
          <div className="cloud-empty-state">
            <span className="material-symbols-outlined" style={{ fontSize: 32, color: 'var(--charcoal-light)' }}>
              bubble_chart
            </span>
            <p>Tell the assistant what you need — your parameters will materialize here.</p>
          </div>
        ) : (
          chips.map(chip => (
            <div key={chip.key} className="cloud-chip neo-shadow-sm">
              <span className="material-symbols-outlined cloud-chip-icon">{chip.icon}</span>
              <div className="cloud-chip-text">
                <span className="cloud-chip-tag">{chip.tag}</span>
                <strong className="cloud-chip-label">{chip.label}</strong>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Confirmation Widget inside Cloud Panel */}
      {pendingBooking && (
        <div className="cloud-pending-card neo-shadow-md">
          <div className="cloud-pending-header">
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--orange)' }}>
              event_available
            </span>
            <strong>Slot Ready for Confirmation</strong>
          </div>
          <div className="cloud-pending-details">
            <div><strong>Treatment:</strong> {pendingBooking.serviceName}</div>
            <div><strong>Stylist:</strong> {pendingBooking.employeeName}</div>
            <div><strong>When:</strong> {formatDate(pendingBooking.date)} at {formatTime(pendingBooking.time)}</div>
            <div><strong>Price:</strong> {price}</div>
          </div>
          <div className="cloud-pending-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={onConfirm}
              disabled={loading}
              style={{ flex: 1, justifyContent: 'center' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check_circle</span>
              Confirm
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onCancel}
              disabled={loading}
              style={{ justifyContent: 'center' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
