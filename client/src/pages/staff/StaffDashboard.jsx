import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAppointments } from '../../context/AppointmentContext';
import { Clock, PlusCircle, Scissors, CheckCircle, AlertCircle, Phone, Mail, UserCheck, Calendar, X } from 'lucide-react';
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

  // Active stylist view: defaults to logged-in user if they are staff, else first active stylist
  const [selectedStylistName, setSelectedStylistName] = useState(() => {
    const isStaff = (staffList || []).some(s => s.name?.toLowerCase() === (user?.name || '').toLowerCase());
    if (isStaff && user?.name) return user.name;
    return (staffList && staffList[0]?.name) || 'Sarah Jenkins';
  });

  // Ensure selected stylist always corresponds to a real member in staffList
  React.useEffect(() => {
    if (staffList && staffList.length > 0) {
      const exists = staffList.some(s => s.name?.toLowerCase() === selectedStylistName.toLowerCase());
      if (!exists) {
        setSelectedStylistName(staffList[0].name);
      }
    }
  }, [staffList, selectedStylistName]);

  const [activeMainTab, setActiveMainTab] = useState('bookings'); // 'bookings' | 'timetable' | 'services_breaks'
  const [bookingFilter, setBookingFilter] = useState('all'); // 'all' | 'upcoming' | 'completed' | 'cancelled'
  const [selectedAptDetails, setSelectedAptDetails] = useState(null);

  const staffAppointments = getAppointmentsForStaff(selectedStylistName);

  const currentStylistProfile = (staffList || []).find(s =>
    s.name.toLowerCase() === selectedStylistName.toLowerCase()
  );

  // Services this stylist is certified to provide
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

  // Filtered bookings
  const filteredStaffBookings = staffAppointments.filter(apt => {
    if (bookingFilter === 'upcoming') return apt.status === 'confirmed' || apt.status === 'pending';
    if (bookingFilter === 'completed') return apt.status === 'completed';
    if (bookingFilter === 'cancelled') return apt.status === 'cancelled';
    return true;
  });

  const upcomingCount = staffAppointments.filter(a => a.status === 'confirmed' || a.status === 'pending').length;
  const completedCount = staffAppointments.filter(a => a.status === 'completed').length;
  const cancelledCount = staffAppointments.filter(a => a.status === 'cancelled').length;

  return (
    <div className="staff-page">
      {/* Top Header */}
      <div className="staff-header">
        <div>
          <h1 className="staff-title">Stylist & Staff Schedule</h1>
          <p className="staff-subtitle">
            Manage your client appointments, update statuses, view visual timetable, and control shift breaks.
          </p>
        </div>

        <div className="staff-header-controls">
          {/* Stylist Selector */}
          <div className="stylist-selector-container">
            <UserCheck size={18} style={{ color: 'var(--orange)' }} />
            <label htmlFor="stylist-select" className="stylist-selector-label">Stylist:</label>
            <select
              id="stylist-select"
              value={selectedStylistName}
              onChange={(e) => setSelectedStylistName(e.target.value)}
              className="stylist-selector-input"
            >
              {(staffList || []).map(s => (
                <option key={s.id} value={s.name}>
                  {s.name} ({s.role})
                </option>
              ))}
            </select>
          </div>

          {/* Live Availability Switch */}
          <div className="availability-card">
            <div className="toggle-label">
              <span className={`status-dot ${isAvailable ? 'dot-active' : 'dot-blocked'}`}></span>
              <span><strong>{isAvailable ? 'Taking Bookings' : 'Paused'}</strong></span>
            </div>
            <button
              type="button"
              onClick={() => setIsAvailable(!isAvailable)}
              className={`btn-toggle ${isAvailable ? 'btn-toggle-on' : 'btn-toggle-off'}`}
            >
              {isAvailable ? 'Pause Shift' : 'Resume Shift'}
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

      {/* Hero Stylist Card */}
      <div className="staff-stylist-hero-card">
        <div className="staff-stylist-avatar">
          {selectedStylistName.charAt(0)}
        </div>
        <div className="staff-stylist-info">
          <h2>{selectedStylistName}</h2>
          <span className="staff-stylist-role">{currentStylistProfile?.role || 'Professional Stylist'}</span>
          <p className="staff-stylist-bio">
            Certified for {myServices.length} salon treatments • {currentStylistBlocks.length} schedule break(s) configured.
          </p>
        </div>
      </div>

      {/* Main Segmented Navigation Tabs (Matching Customer Bookings Pattern) */}
      <div className="staff-main-tabs">
        <button
          type="button"
          onClick={() => setActiveMainTab('bookings')}
          className={`staff-tab-btn ${activeMainTab === 'bookings' ? 'active' : ''}`}
        >
          <Clock size={16} />
          <span>Assigned Bookings ({staffAppointments.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab('timetable')}
          className={`staff-tab-btn ${activeMainTab === 'timetable' ? 'active' : ''}`}
        >
          <Calendar size={16} />
          <span>Visual Timetable Grid</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab('services_breaks')}
          className={`staff-tab-btn ${activeMainTab === 'services_breaks' ? 'active' : ''}`}
        >
          <Scissors size={16} />
          <span>Certified Services & Breaks ({myServices.length})</span>
        </button>
      </div>

      {/* ── TAB 1: ASSIGNED BOOKINGS LIST ── */}
      {activeMainTab === 'bookings' && (
        <div className="staff-bookings-section">
          {/* Sub Filters */}
          <div className="staff-filter-tabs">
            <button
              type="button"
              onClick={() => setBookingFilter('all')}
              className={`staff-filter-chip ${bookingFilter === 'all' ? 'active' : ''}`}
            >
              All ({staffAppointments.length})
            </button>
            <button
              type="button"
              onClick={() => setBookingFilter('upcoming')}
              className={`staff-filter-chip ${bookingFilter === 'upcoming' ? 'active' : ''}`}
            >
              Upcoming ({upcomingCount})
            </button>
            <button
              type="button"
              onClick={() => setBookingFilter('completed')}
              className={`staff-filter-chip ${bookingFilter === 'completed' ? 'active' : ''}`}
            >
              Completed ({completedCount})
            </button>
            <button
              type="button"
              onClick={() => setBookingFilter('cancelled')}
              className={`staff-filter-chip ${bookingFilter === 'cancelled' ? 'active' : ''}`}
            >
              Cancelled ({cancelledCount})
            </button>
          </div>

          {filteredStaffBookings.length === 0 ? (
            <div className="staff-empty-card">
              <Clock size={44} style={{ color: '#888', marginBottom: 10 }} />
              <h3>No bookings in this filter</h3>
              <p>Appointments booked by customers or the AI Assistant will appear here in real time.</p>
            </div>
          ) : (
            <div className="staff-appointments-grid">
              {filteredStaffBookings.map((apt) => (
                <div
                  key={apt.id}
                  className={`staff-booking-card status-border-${apt.status}`}
                  onClick={() => setSelectedAptDetails(apt)}
                >
                  <div className="staff-booking-top">
                    <div>
                      <h3 className="staff-booking-client-name">
                        {apt.customerName || apt.customer_name || 'Salon Client'}
                      </h3>
                      <span className="staff-booking-client-tag">Client</span>
                    </div>
                    <span className={`staff-status-badge badge-${apt.status}`}>
                      {apt.status?.toUpperCase()}
                    </span>
                  </div>

                  <div className="staff-booking-details">
                    <div className="detail-row">
                      <Scissors size={14} />
                      <span>{apt.serviceName || apt.services?.name || 'Haircut'}</span>
                      <strong style={{ marginLeft: 6, color: 'var(--orange)' }}>
                        {apt.servicePrice || (apt.services?.price ? `$${apt.services.price}` : '')}
                      </strong>
                    </div>

                    <div className="detail-row">
                      <Calendar size={14} />
                      <span>{apt.date || apt.appointment_date}</span>
                    </div>

                    <div className="detail-row">
                      <Clock size={14} />
                      <span>{apt.time || apt.appointment_time} ({apt.serviceDuration || 45} mins)</span>
                    </div>

                    {(apt.customerEmail || apt.customer_email) && (
                      <div className="detail-row contact-row">
                        <Mail size={13} />
                        <span>{apt.customerEmail || apt.customer_email}</span>
                      </div>
                    )}

                    {(apt.customerPhone || apt.customer_phone) && (
                      <div className="detail-row contact-row">
                        <Phone size={13} />
                        <span>{apt.customerPhone || apt.customer_phone}</span>
                      </div>
                    )}

                    {apt.notes && (
                      <div className="staff-booking-notes">
                        <em>"{apt.notes}"</em>
                      </div>
                    )}
                  </div>

                  <div className="staff-booking-actions" onClick={(e) => e.stopPropagation()}>
                    {apt.status !== 'completed' && (
                      <button
                        type="button"
                        onClick={() => handleStatusChange(apt.id, 'completed')}
                        className="btn-staff-action complete"
                      >
                        <CheckCircle size={14} />
                        <span>Complete</span>
                      </button>
                    )}
                    {apt.status === 'pending' && (
                      <button
                        type="button"
                        onClick={() => handleStatusChange(apt.id, 'confirmed')}
                        className="btn-staff-action confirm"
                      >
                        <span>Confirm</span>
                      </button>
                    )}
                    {apt.status !== 'cancelled' && (
                      <button
                        type="button"
                        onClick={() => handleStatusChange(apt.id, 'cancelled')}
                        className="btn-staff-action cancel"
                      >
                        <span>Cancel</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setSelectedAptDetails(apt)}
                      className="btn-staff-action details"
                    >
                      <span>Details</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: VISUAL TIMETABLE GRID ── */}
      {activeMainTab === 'timetable' && (
        <div className="staff-timetable-section">
          <ScheduleCalendar
            appointments={staffAppointments}
            staffList={staffList}
            blockedTimes={currentStylistBlocks}
            businessSettings={businessSettings}
            filterStaffName={selectedStylistName}
            onAppointmentClick={(apt) => setSelectedAptDetails(apt)}
          />
        </div>
      )}

      {/* ── TAB 3: CERTIFIED SERVICES & SHIFT BREAKS ── */}
      {activeMainTab === 'services_breaks' && (
        <div className="staff-services-breaks-grid">
          {/* Certified Services */}
          <div className="staff-subcard">
            <div className="subcard-header">
              <div>
                <h2>Services I Provide ({myServices.length})</h2>
                <p>Treatments certified for {selectedStylistName}.</p>
              </div>
              <Scissors size={20} style={{ color: 'var(--orange)' }} />
            </div>

            <div className="staff-services-list">
              {myServices.length === 0 ? (
                <p style={{ color: '#777', fontStyle: 'italic', fontSize: '13px' }}>
                  No services currently assigned to this stylist.
                </p>
              ) : (
                myServices.map((srv) => (
                  <div key={srv.id} className="staff-service-item">
                    <div className="staff-service-info">
                      <strong>{srv.name}</strong>
                      <p>{srv.description}</p>
                    </div>
                    <div className="staff-service-pills">
                      <span className="price-pill">${srv.price}</span>
                      <span className="duration-pill"><Clock size={12} /> {srv.duration} min</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Shift Breaks & Blocked Hours */}
          <div className="staff-subcard">
            <div className="subcard-header">
              <div>
                <h2>Shift Breaks & Blocked Hours ({currentStylistBlocks.length})</h2>
                <p>Breaks are respected by the AI booking engine.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowBlockModal(true)}
                className="btn-add-break"
              >
                <PlusCircle size={15} />
                <span>+ Block Time</span>
              </button>
            </div>

            <div className="staff-breaks-list">
              {currentStylistBlocks.length === 0 ? (
                <p style={{ color: '#777', fontStyle: 'italic', fontSize: '13px' }}>
                  No active breaks blocked for {selectedStylistName}.
                </p>
              ) : (
                currentStylistBlocks.map((b) => (
                  <div key={b.id} className="staff-break-item">
                    <div className="staff-break-info">
                      <strong>{b.reason}</strong>
                      <span>{b.start} – {b.end} ({b.recurring || 'Daily'})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveBlock(b.id)}
                      className="btn-delete-break"
                      title="Remove break"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Block Modal */}
      {showBlockModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Block Stylist Break</h2>
              <button
                type="button"
                onClick={() => setShowBlockModal(false)}
                className="modal-close-btn"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleAddBlock} className="modal-form">
              <div className="modal-form-group">
                <label>Stylist</label>
                <input type="text" value={selectedStylistName} disabled />
              </div>

              <div className="modal-form-group">
                <label>Break Reason / Label</label>
                <input
                  type="text"
                  placeholder="e.g. Lunch Break, Training, Personal Time"
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  required
                />
              </div>

              <div className="modal-form-row">
                <div className="modal-form-group">
                  <label>Start Time</label>
                  <input
                    type="time"
                    value={blockStart}
                    onChange={(e) => setBlockStart(e.target.value)}
                    required
                  />
                </div>
                <div className="modal-form-group">
                  <label>End Time</label>
                  <input
                    type="time"
                    value={blockEnd}
                    onChange={(e) => setBlockEnd(e.target.value)}
                    required
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
                  Save Break Block
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Appointment Details Modal */}
      {selectedAptDetails && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Booking Details</h2>
              <button
                type="button"
                onClick={() => setSelectedAptDetails(null)}
                className="modal-close-btn"
              >
                ×
              </button>
            </div>
            <div className="modal-details-body">
              <div className="detail-item">
                <span className="detail-label">Client Name</span>
                <strong>{selectedAptDetails.customerName || selectedAptDetails.customer_name || 'Client'}</strong>
              </div>
              <div className="detail-item">
                <span className="detail-label">Service</span>
                <strong>{selectedAptDetails.serviceName || selectedAptDetails.services?.name}</strong>
              </div>
              <div className="detail-item">
                <span className="detail-label">Price & Duration</span>
                <span>{selectedAptDetails.servicePrice || (selectedAptDetails.services?.price ? `$${selectedAptDetails.services.price}` : '')} ({selectedAptDetails.serviceDuration || 45} mins)</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Date & Time</span>
                <span>{selectedAptDetails.date || selectedAptDetails.appointment_date} at {selectedAptDetails.time || selectedAptDetails.appointment_time}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Status</span>
                <span className={`staff-status-badge badge-${selectedAptDetails.status}`}>{selectedAptDetails.status?.toUpperCase()}</span>
              </div>
              {selectedAptDetails.notes && (
                <div className="detail-item">
                  <span className="detail-label">Client Notes</span>
                  <em>"{selectedAptDetails.notes}"</em>
                </div>
              )}
            </div>
            <div className="modal-actions" style={{ marginTop: 16 }}>
              <button
                type="button"
                onClick={() => setSelectedAptDetails(null)}
                className="btn-modal-submit"
                style={{ width: '100%' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
