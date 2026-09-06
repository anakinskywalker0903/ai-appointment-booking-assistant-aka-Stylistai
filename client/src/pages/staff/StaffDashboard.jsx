import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Clock, PlusCircle, Scissors } from 'lucide-react';
import './StaffDashboard.css';

const STAFF_SCHEDULE = [
  {
    id: 'apt-s1',
    time: '09:30 - 10:15',
    customer: 'Jessica Taylor',
    email: 'jessica.t@example.com',
    service: 'Haircut & Styling',
    status: 'confirmed',
    notes: 'Bob cut with bangs',
  },
  {
    id: 'apt-s2',
    time: '11:00 - 13:00',
    customer: 'Michael Chang',
    email: 'm.chang@example.com',
    service: 'Hair Coloring (Highlights)',
    status: 'confirmed',
    notes: 'Ash blonde highlights, test strand done last week',
  },
  {
    id: 'apt-s3',
    time: '14:30 - 15:15',
    customer: 'David Kim',
    email: 'dkim@example.com',
    service: 'Haircut',
    status: 'confirmed',
    notes: 'Regular maintenance cut',
  },
];

const INITIAL_BLOCKED_TIMES = [
  { id: 'b1', reason: 'Lunch Break', start: '13:00', end: '14:00', recurring: 'Daily' },
  { id: 'b2', reason: 'Team Sync', start: '09:00', end: '09:30', recurring: 'Mondays' },
];

export default function StaffDashboard() {
  const { user } = useAuth();
  const [schedule] = useState(STAFF_SCHEDULE);
  const [blockedTimes, setBlockedTimes] = useState(INITIAL_BLOCKED_TIMES);
  const [isAvailable, setIsAvailable] = useState(true);
  const [blockReason, setBlockReason] = useState('');
  const [blockStart, setBlockStart] = useState('15:30');
  const [blockEnd, setBlockEnd] = useState('16:30');
  const [showBlockModal, setShowBlockModal] = useState(false);

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
            Welcome, <strong>{user?.name || 'Stylist'}</strong> ({user?.title || 'Staff Member'}).
          </p>
        </div>

        {/* Live Availability Toggle */}
        <div className="availability-card">
          <div className="toggle-label">
            <span className={`status-dot ${isAvailable ? 'dot-active' : 'dot-blocked'}`}></span>
            <span>Roster Status: <strong>{isAvailable ? 'Taking Bookings' : 'Schedule Paused'}</strong></span>
          </div>
          <button
            type="button"
            onClick={() => setIsAvailable(!isAvailable)}
            className={`btn-toggle ${isAvailable ? 'btn-toggle-on' : 'btn-toggle-off'}`}
          >
            {isAvailable ? 'Pause Appointments' : 'Resume Appointments'}
          </button>
        </div>
      </div>

      <div className="staff-grid">
        {/* Left: Today's Appointments */}
        <div className="schedule-section">
          <div className="section-header">
            <h2>Today's Appointments</h2>
            <span className="badge-count">{schedule.length} bookings</span>
          </div>

          <div className="timeline-cards">
            {schedule.map((item) => (
              <div key={item.id} className="timeline-card">
                <div className="timeline-time">
                  <Clock size={16} />
                  <span>{item.time}</span>
                </div>

                <div className="timeline-content">
                  <div className="client-header">
                    <h3 className="client-name">{item.customer}</h3>
                    <span className="service-tag">{item.service}</span>
                  </div>

                  <div className="client-meta">
                    <span>{item.email}</span>
                  </div>

                  {item.notes && (
                    <div className="client-notes">
                      <strong>Client Notes:</strong> {item.notes}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Blocked Times & Quick Schedule Management */}
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
                <span>Add Block</span>
              </button>
            </div>

            {showBlockModal && (
              <form onSubmit={handleAddBlock} className="block-form">
                <label>Reason / Note</label>
                <input
                  type="text"
                  placeholder="e.g. Training, Dentist, Personal"
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
                  Save Blocked Time
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
              <li><Scissors size={14} /> Haircut & Beard Trim</li>
              <li><Scissors size={14} /> Full Hair Coloring & Balayage</li>
              <li><Scissors size={14} /> Deep Conditioning Hair Spa</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
