import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAppointments } from '../../context/AppointmentContext';
import { Clock, PlusCircle, Scissors, CheckCircle, AlertCircle, Phone, Mail, UserCheck, Calendar } from 'lucide-react';
import ScheduleCalendar from '../../components/shared/ScheduleCalendar';
import './StaffDashboard.css';

export default function StaffDashboard() {
  const { user } = useAuth();
  const {
    getAppointmentsForStaff,
    updateAppointmentStatus,
    staffList,
    services,
    businessSettings,
    blockedTimes,
    addBlockedTime,
    removeBlockedTime,
  } = useAppointments();

  // Active stylist view: defaults to logged-in user or first active staff
  const [selectedStylistName, setSelectedStylistName] = useState(() => {
    return user?.name || (staffList && staffList[0]?.name) || 'Sarah Jenkins';
  });

  const [viewMode, setViewMode] = useState('list'); // 'list' | 'timetable'
  const [selectedAptDetails, setSelectedAptDetails] = useState(null);

  const staffAppointments = getAppointmentsForStaff(selectedStylistName);

  const currentStylistProfile = (staffList || []).find(s =>
    s.name.toLowerCase() === selectedStylistName.toLowerCase()
  );

  // Services this stylist is certified to provide (Spec Page 5 & 9)
  const myServices = (services || []).filter(srv =>
    currentStylistProfile?.assignedServiceIds?.includes(srv.id)
  );

  // Filter blocked times for this stylist
  const currentStylistBlocks = (blockedTimes || []).filter(b => {
    if (!b.employeeName) return true;
    return b.employeeName.toLowerCase().includes(selectedStylistName.toLowerCase()) ||
           selectedStylistName.toLowerCase().includes(b.employeeName.toLowerCase());
  });

  const [isAvailable, setIsAvailable] = useState(true);
  const [blockReason, setBlockReason] = useState('');
  const [blockStart, setBlockStart] = useState('13:00');
  const [blockEnd, setBlockEnd] = useState('14:00');
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const handleStatusChange = (id, newStatus) => {
    updateAppointmentStatus(id, newStatus);
    setFeedback(`Appointment #${id.slice(-4)} marked as ${newStatus}.`);
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleAddBlock = (e) => {
    e.preventDefault();
    if (!blockReason.trim()) return;

    addBlockedTime({
      employeeName: selectedStylistName,
      reason: blockReason.trim(),
      start: blockStart,
      end: blockEnd,
      recurring: 'Daily',
    });

    setBlockReason('');
    setShowBlockModal(false);
    setFeedback(`Blocked time (${blockStart} - ${blockEnd}) added to ${selectedStylistName}'s schedule.`);
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleRemoveBlock = (id) => {
    removeBlockedTime(id);
    setFeedback('Blocked time removed.');
    setTimeout(() => setFeedback(null), 3000);
  };

  return (
    <div className="staff-page">
      <div className="staff-header">
        <div>
          <h1 className="staff-title">Staff Portal</h1>
          <p className="staff-subtitle">
            Viewing schedule for: <strong>{selectedStylistName}</strong>. Manage your appointments, update client statuses, and set schedule breaks.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Stylist Selector Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#ffffff', padding: '6px 12px', borderRadius: 8, border: '2px solid #000' }}>
            <UserCheck size={16} />
            <label htmlFor="stylist-select" style={{ fontSize: '0.8rem', fontWeight: 800 }}>Stylist:</label>
            <select
              id="stylist-select"
              value={selectedStylistName}
              onChange={(e) => setSelectedStylistName(e.target.value)}
              style={{ border: 'none', background: 'transparent', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', outline: 'none' }}
            >
              {(staffList || []).map(s => (
                <option key={s.id} value={s.name}>
                  {s.name} ({s.role})
                </option>
              ))}
            </select>
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
      </div>

      {feedback && (
        <div className="staff-feedback-banner">
          <AlertCircle size={16} />
          <span>{feedback}</span>
        </div>
      )}

      {/* View Switcher: List vs Timetable */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className={`btn-toggle ${viewMode === 'list' ? 'btn-toggle-on' : 'btn-toggle-off'}`}
            onClick={() => setViewMode('list')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px' }}
          >
            <Clock size={15} />
            <span>Schedule List</span>
          </button>
          <button
            type="button"
            className={`btn-toggle ${viewMode === 'timetable' ? 'btn-toggle-on' : 'btn-toggle-off'}`}
            onClick={() => setViewMode('timetable')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px' }}
          >
            <Calendar size={15} />
            <span>Visual Timetable Grid</span>
          </button>
        </div>

        <div style={{ fontSize: '0.8rem', color: '#555', fontWeight: 700 }}>
          {staffAppointments.length} assigned booking(s) for {selectedStylistName}
        </div>
      </div>

      {viewMode === 'timetable' ? (
        <div style={{ marginBottom: 24 }}>
          <ScheduleCalendar
            appointments={staffAppointments}
            staffList={staffList}
            blockedTimes={currentStylistBlocks}
            businessSettings={businessSettings}
            filterStaffName={selectedStylistName}
            onAppointmentClick={(apt) => setSelectedAptDetails(apt)}
          />
        </div>
      ) : (
        <div className="staff-grid">
          {/* Left: Assigned Appointments */}
          <div className="schedule-section">
            <div className="section-header">
              <h2>Assigned Appointments</h2>
              <span className="badge-count">{staffAppointments.length} bookings</span>
            </div>

            {staffAppointments.length === 0 ? (
              <div className="empty-state-staff">
                <Clock size={36} style={{ color: '#888', marginBottom: 8 }} />
                <h3>No appointments assigned yet</h3>
                <p>When clients book with {selectedStylistName} in the AI Assistant, they will appear here in real-time.</p>
              </div>
            ) : (
              <div className="timeline-cards">
                {staffAppointments.map((item) => (
                  <div
                    key={item.id}
                    className={`timeline-card status-border-${item.status}`}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setSelectedAptDetails(item)}
                  >
                    <div className="timeline-time">
                      <Clock size={16} />
                      <span>{item.time}</span>
                      <small style={{ fontSize: '10px', color: '#666' }}>{item.date}</small>
                    </div>

                    <div className="timeline-content">
                      <div className="client-header">
                        <div>
                          <h3 className="client-name">{item.customerName || item.customer_name || 'Client'}</h3>
                          <span className="client-role-badge">Customer</span>
                        </div>
                        <span className={`staff-status-badge badge-${item.status}`}>
                          {item.status.toUpperCase()}
                        </span>
                      </div>

                      <div className="service-badge">
                        <Scissors size={14} />
                        <span>{item.serviceName || item.services?.name || 'Haircut'}</span>
                        <small style={{ marginLeft: 6, opacity: 0.8 }}>({item.serviceDuration || 45} mins)</small>
                      </div>

                      <div className="client-contact-row">
                        <div className="contact-item">
                          <Mail size={13} />
                          <span>{item.customerEmail || item.customer_email || 'client@example.com'}</span>
                        </div>
                        {item.customerPhone && (
                          <div className="contact-item">
                            <Phone size={13} />
                            <span>{item.customerPhone}</span>
                          </div>
                        )}
                      </div>

                      {item.notes && (
                        <p className="item-notes">"{item.notes}"</p>
                      )}

                      {/* Actions: Confirmed / Completed / Cancelled */}
                      <div className="staff-actions-row" onClick={(e) => e.stopPropagation()}>
                        {item.status !== 'completed' && (
                          <button
                            type="button"
                            onClick={() => handleStatusChange(item.id, 'completed')}
                            className="btn-staff-action complete"
                          >
                            <CheckCircle size={14} />
                            <span>Mark Completed</span>
                          </button>
                        )}
                        {item.status !== 'cancelled' && (
                          <button
                            type="button"
                            onClick={() => handleStatusChange(item.id, 'cancelled')}
                            className="btn-staff-action cancel"
                          >
                            Cancel
                          </button>
                        )}
                        {item.status === 'pending' && (
                          <button
                            type="button"
                            onClick={() => handleStatusChange(item.id, 'confirmed')}
                            className="btn-staff-action confirm"
                          >
                            Confirm
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Shift Breaks + Services Provided */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Blocked Times & Shift Breaks */}
            <div className="blocks-section">
              <div className="section-header">
                <h2>Shift Breaks & Blocked Hours</h2>
                <button
                  type="button"
                  onClick={() => setShowBlockModal(true)}
                  className="btn-add-block"
                >
                  <PlusCircle size={15} />
                  <span>Block Time</span>
                </button>
              </div>

              <p className="block-desc">
                Breaks added here are immediately enforced by the AI Assistant so clients cannot book over your break.
              </p>

              <div className="blocks-list">
                {currentStylistBlocks.length === 0 ? (
                  <p style={{ fontSize: '13px', color: '#777', fontStyle: 'italic' }}>
                    No active breaks blocked for this stylist.
                  </p>
                ) : (
                  currentStylistBlocks.map((b) => (
                    <div key={b.id} className="block-item">
                      <div className="block-info">
                        <span className="block-reason">{b.reason}</span>
                        <span className="block-hours">
                          {b.start} – {b.end} ({b.recurring || 'Daily'})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveBlock(b.id)}
                        className="btn-remove-block"
                        title="Remove break"
                      >
                        ×
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Services Provided (Spec Page 5 & 9) */}
            <div className="blocks-section" style={{ background: '#ffffff' }}>
              <div className="section-header">
                <h2>Services I Provide ({myServices.length})</h2>
                <Scissors size={18} style={{ color: 'var(--orange)' }} />
              </div>

              <p className="block-desc">
                Treatments assigned to {selectedStylistName}. Customers can book these with you via the AI Assistant.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {myServices.length === 0 ? (
                  <p style={{ fontSize: '12px', color: '#777', fontStyle: 'italic' }}>
                    No services certified yet. Contact the Business Admin.
                  </p>
                ) : (
                  myServices.map(s => (
                    <div
                      key={s.id}
                      style={{
                        padding: '10px 12px',
                        border: '1.5px solid #000',
                        borderRadius: 8,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: '#f8fafc',
                      }}
                    >
                      <div>
                        <strong style={{ fontSize: '0.85rem' }}>{s.name}</strong>
                        <div style={{ fontSize: '0.72rem', color: '#666' }}>
                          ⏱️ {s.duration || 45} mins
                        </div>
                      </div>
                      <span style={{ fontWeight: 800, color: 'var(--orange)', fontSize: '0.9rem' }}>
                        ${s.price}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Customer Appointment Details Modal (Spec Page 5 & 9) */}
      {selectedAptDetails && (
        <div className="modal-overlay" style={{ display: 'flex' }}>
          <div className="modal-content" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h2>Appointment Details</h2>
              <button
                type="button"
                onClick={() => setSelectedAptDetails(null)}
                className="modal-close-btn"
              >
                ×
              </button>
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span className={`staff-status-badge badge-${selectedAptDetails.status}`}>
                  {selectedAptDetails.status.toUpperCase()}
                </span>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#15803d' }}>
                  Fee: ${selectedAptDetails.services?.price || selectedAptDetails.servicePrice || 45}
                </span>
              </div>

              <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1.5px solid #000', marginBottom: 14 }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#666', textTransform: 'uppercase' }}>CLIENT INFORMATION</div>
                <div style={{ fontSize: '1rem', fontWeight: 900, marginTop: 4 }}>
                  {selectedAptDetails.customerName || selectedAptDetails.customer_name || 'Client'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', marginTop: 4 }}>
                  <Mail size={13} />
                  <span>{selectedAptDetails.customerEmail || selectedAptDetails.customer_email || '—'}</span>
                </div>
                {selectedAptDetails.customerPhone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', marginTop: 4 }}>
                    <Phone size={13} />
                    <span>{selectedAptDetails.customerPhone}</span>
                  </div>
                )}
              </div>

              <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1.5px solid #000', marginBottom: 14 }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#666', textTransform: 'uppercase' }}>SERVICE & SCHEDULE</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 900, marginTop: 4 }}>
                  {selectedAptDetails.serviceName || selectedAptDetails.services?.name}
                </div>
                <div style={{ fontSize: '0.82rem', color: '#444', marginTop: 4 }}>
                  📅 Date: <strong>{selectedAptDetails.date || selectedAptDetails.appointment_date}</strong> at <strong>{selectedAptDetails.time || selectedAptDetails.appointment_time}</strong>
                </div>
                <div style={{ fontSize: '0.82rem', color: '#444', marginTop: 2 }}>
                  ⏱️ Duration: <strong>{selectedAptDetails.serviceDuration || selectedAptDetails.services?.duration_min || 45} mins</strong>
                </div>
                {selectedAptDetails.notes && (
                  <div style={{ marginTop: 8, fontSize: '0.82rem', fontStyle: 'italic', background: '#fff', padding: 8, borderRadius: 6, border: '1px solid #ddd' }}>
                    Note: "{selectedAptDetails.notes}"
                  </div>
                )}
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setSelectedAptDetails(null)}
                  className="btn-modal-cancel"
                >
                  Close
                </button>
                {selectedAptDetails.status !== 'completed' && (
                  <button
                    type="button"
                    onClick={() => {
                      handleStatusChange(selectedAptDetails.id, 'completed');
                      setSelectedAptDetails(null);
                    }}
                    className="btn-modal-submit"
                  >
                    Mark as Completed
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Block Modal */}
      {showBlockModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Block Schedule Break</h2>
              <button
                type="button"
                onClick={() => setShowBlockModal(false)}
                className="modal-close-btn"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleAddBlock} className="modal-form">
              <p style={{ fontSize: '13px', color: '#555', marginBottom: 12 }}>
                Blocking time for <strong>{selectedStylistName}</strong>. The AI Assistant will refuse customer bookings during this window.
              </p>

              <div className="modal-form-group">
                <label>Reason / Activity</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lunch Break, Training, Personal"
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                />
              </div>

              <div className="modal-form-row">
                <div className="modal-form-group">
                  <label>Start Time</label>
                  <input
                    type="time"
                    required
                    value={blockStart}
                    onChange={(e) => setBlockStart(e.target.value)}
                  />
                </div>
                <div className="modal-form-group">
                  <label>End Time</label>
                  <input
                    type="time"
                    required
                    value={blockEnd}
                    onChange={(e) => setBlockEnd(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setShowBlockModal(false)}
                  className="btn-modal-cancel"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-modal-submit">
                  Save Block
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
