import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAppointments } from '../../context/AppointmentContext';
import { Clock, PlusCircle, Scissors, CheckCircle, AlertCircle, Phone, Mail } from 'lucide-react';
import './StaffDashboard.css';

const INITIAL_BLOCKED_TIMES = [
  { id: 'b1', reason: 'Lunch Break', start: '13:00', end: '14:00', recurring: 'Daily' },
  { id: 'b2', reason: 'Team Standup', start: '09:00', end: '09:30', recurring: 'Mondays' },
];

export default function StaffDashboard() {
  const { user } = useAuth();
  const { getAppointmentsForStaff, updateAppointmentStatus } = useAppointments();

  // Get appointments specifically booked for this logged-in stylist
  const staffAppointments = getAppointmentsForStaff(user?.name || 'Sarah');

  const [blockedTimes, setBlockedTimes] = useState(INITIAL_BLOCKED_TIMES);
  const [isAvailable, setIsAvailable] = useState(true);
  const [blockReason, setBlockReason] = useState('');
  const [blockStart, setBlockStart] = useState('15:30');
  const [blockEnd, setBlockEnd] = useState('16:30');
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const handleStatusChange = (id, newStatus) => {
    updateAppointmentStatus(id, newStatus);
    setFeedback(`Appointment #${id.slice(-4)} marked as ${newStatus}.`);
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleAddBlock = (e) => {
    e.preventDefault();
    if (!blockReason) return;
    setBlockedTimes((prev) => [
      ...prev,
      {
        id: 'b-' + Date.now(),
        reason: blockReason,
        start: blockStart,
        end: blockEnd,
        recurring: 'One-time',
      },
    ]);
    setBlockReason('');
    setShowBlockModal(false);
    setFeedback('Blocked time added to schedule.');
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleRemoveBlock = (id) => {
    setBlockedTimes((prev) => prev.filter((b) => b.id !== id));
  };

  return (
    <div className="staff-page">
      <div className="staff-header">
        <div>
          <h1 className="staff-title">Staff Portal</h1>
          <p className="staff-subtitle">
            Stylist: <strong>{user?.name || 'Stylist'}</strong> ({user?.title || 'Staff Member'}).
            Showing appointments assigned to you.
          </p>
        </div>

        {/* Live Availability Toggle */}
        <div className="availability-card">
          <div className="toggle-label">
            <span className={`status-dot ${isAvailable ? 'dot-active' : 'dot-blocked'}`}></span>
            <span>Status: <strong>{isAvailable ? 'Taking Bookings' : 'Schedule Paused'}</strong></span>
          </div>
          <button
            type="button"
            onClick={() => setIsAvailable(!isAvailable)}
            className={`btn-toggle ${isAvailable ? 'btn-toggle-on' : 'btn-toggle-off'}`}
          >
            {isAvailable ? 'Pause Schedule' : 'Resume Schedule'}
          </button>
        </div>
      </div>

      {feedback && (
        <div className="staff-feedback-banner">
          <AlertCircle size={16} />
          <span>{feedback}</span>
        </div>
      )}

      <div className="staff-grid">
        {/* Left: Assigned Appointments */}
        <div className="schedule-section">
          <div className="section-header">
            <h2>My Assigned Appointments</h2>
            <span className="badge-count">{staffAppointments.length} bookings</span>
          </div>

          {staffAppointments.length === 0 ? (
            <div className="empty-state-staff">
              <Clock size={36} style={{ color: '#888', marginBottom: 8 }} />
              <h3>No appointments assigned yet</h3>
              <p>When clients book with you in the Customer Portal, they will appear here in real-time.</p>
            </div>
          ) : (
            <div className="timeline-cards">
              {staffAppointments.map((item) => (
                <div key={item.id} className={`timeline-card status-border-${item.status}`}>
                  <div className="timeline-time">
                    <Clock size={16} />
                    <span>{item.time}</span>
                    <small style={{ fontSize: '10px', color: '#ccc' }}>{item.date}</small>
                  </div>

                  <div className="timeline-content">
                    <div className="client-header">
                      <div>
                        <h3 className="client-name">{item.customerName}</h3>
                        <span className="client-role-badge">Client</span>
                      </div>
                      <span className={`staff-status-badge badge-${item.status}`}>
                        {item.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="client-meta-row">
                      <span><Mail size={13} style={{ display: 'inline', marginRight: 4 }} />{item.customerEmail}</span>
                      {item.customerPhone && (
                        <span><Phone size={13} style={{ display: 'inline', marginRight: 4 }} />{item.customerPhone}</span>
                      )}
                    </div>

                    <div className="service-assigned-tag">
                      <Scissors size={14} />
                      <span>{item.serviceName} ({item.serviceDuration} mins • {item.servicePrice})</span>
                    </div>

                    {item.notes && (
                      <div className="client-notes">
                        <strong>Client Requests:</strong> "{item.notes}"
                      </div>
                    )}

                    {/* Staff Actions */}
                    <div className="staff-item-actions">
                      {item.status !== 'completed' && item.status !== 'cancelled' && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(item.id, 'in_progress')}
                            className="btn-status-action start"
                          >
                            In Service
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(item.id, 'completed')}
                            className="btn-status-action complete"
                          >
                            <CheckCircle size={13} style={{ display: 'inline', marginRight: 3 }} />
                            Done
                          </button>
                        </>
                      )}
                      {item.status !== 'cancelled' && item.status !== 'completed' && (
                        <button
                          type="button"
                          onClick={() => handleStatusChange(item.id, 'cancelled')}
                          className="btn-status-action cancel"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Blocked Times & Qualified Services */}
        <div className="side-section">
          <div className="side-card">
            <div className="section-header">
              <h2>Blocked Times</h2>
              <button
                type="button"
                onClick={() => setShowBlockModal(!showBlockModal)}
                className="btn-add-block"
              >
                <PlusCircle size={15} />
                <span>Add Break</span>
              </button>
            </div>

            {showBlockModal && (
              <form onSubmit={handleAddBlock} className="block-form">
                <label>Reason / Note</label>
                <input
                  type="text"
                  placeholder="e.g. Lunch, Doctor, Training"
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  required
                />

                <div className="time-inputs">
                  <div>
                    <label>Start</label>
                    <input
                      type="time"
                      value={blockStart}
                      onChange={(e) => setBlockStart(e.target.value)}
                    />
                  </div>
                  <div>
                    <label>End</label>
                    <input
                      type="time"
                      value={blockEnd}
                      onChange={(e) => setBlockEnd(e.target.value)}
                    />
                  </div>
                </div>

                <button type="submit" className="btn-save-block">
                  Save Block
                </button>
              </form>
            )}

            <div className="blocked-list">
              {blockedTimes.map((b) => (
                <div key={b.id} className="blocked-item">
                  <div>
                    <strong>{b.reason}</strong>
                    <div className="blocked-time-range">
                      {b.start} – {b.end} ({b.recurring})
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveBlock(b.id)}
                    className="btn-remove-block"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="side-card">
            <h3>My Qualified Services</h3>
            <ul className="qualified-services">
              <li><Scissors size={14} /> Haircut & Styling</li>
              <li><Scissors size={14} /> Hair Coloring (Balayage)</li>
              <li><Scissors size={14} /> Hair Spa & Scalp Therapy</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
