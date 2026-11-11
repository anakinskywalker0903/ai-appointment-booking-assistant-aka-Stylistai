import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAppointments } from '../../context/AppointmentContext';
import { validateAndFindSlots } from '../../services/availabilityEngine';
import { Calendar, Clock, AlertCircle, CheckCircle, XCircle, Sparkles, Scissors, Bot, Settings, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import './CustomerDashboard.css';

export default function CustomerDashboard() {
  const { user, updateProfile } = useAuth();
  const {
    appointments,
    services,
    staffList,
    blockedTimes,
    businessSettings,
    getAppointmentsForCustomer,
    cancelAppointment,
    rescheduleAppointment,
  } = useAppointments();

  const customerAppointments = getAppointmentsForCustomer(user?.email);

  // Default to bookings if user has active appointments, otherwise show services menu
  const [mainTab, setMainTab] = useState(customerAppointments.length > 0 ? 'bookings' : 'services');
  const [filter, setFilter] = useState('upcoming');
  const [feedbackMessage, setFeedbackMessage] = useState(null);

  // Profile Modal State (Spec Page 5, 9)
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profilePhone, setProfilePhone] = useState(user?.phone || '');
  const [preferredStylist, setPreferredStylist] = useState(user?.preferredStylist || '');

  // Appointment Details Modal State (Spec Page 5, 9)
  const [selectedAptDetails, setSelectedAptDetails] = useState(null);

  // Reschedule Modal State
  const [rescheduleApt, setRescheduleApt] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('14:00');
  const [rescheduleError, setRescheduleError] = useState(null);

  const handleOpenProfile = () => {
    setProfileName(user?.name || '');
    setProfilePhone(user?.phone || '');
    setPreferredStylist(user?.preferredStylist || '');
    setShowProfileModal(true);
  };

  const handleSaveProfile = (e) => {
    e.preventDefault();
    if (updateProfile) {
      updateProfile({
        name: profileName,
        phone: profilePhone,
        preferredStylist,
      });
    }
    setShowProfileModal(false);
    setFeedbackMessage('Profile settings updated successfully.');
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  const handleOpenReschedule = (apt) => {
    setRescheduleApt(apt);
    setRescheduleDate(apt.date);
    setRescheduleTime(apt.time);
    setRescheduleError(null);
  };

  const handleSaveReschedule = (e) => {
    e.preventDefault();
    if (!rescheduleApt) return;

    // Validate requested slot with dynamic availability engine
    const check = validateAndFindSlots({
      service: rescheduleApt.serviceName,
      stylist: rescheduleApt.employeeName,
      date: rescheduleDate,
      time: rescheduleTime,
      services,
      staffList,
      appointments: appointments.filter(a => a.id !== rescheduleApt.id),
      blockedTimes,
      businessSettings,
    });

    if (!check.available) {
      setRescheduleError(check.message);
      return;
    }

    rescheduleAppointment(rescheduleApt.id, rescheduleDate, rescheduleTime);
    setRescheduleApt(null);
    setRescheduleError(null);
    setFeedbackMessage(`Appointment successfully rescheduled to ${rescheduleDate} at ${rescheduleTime}.`);
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  const handleCancelBooking = (id) => {
    cancelAppointment(id);
    setFeedbackMessage('Appointment cancelled.');
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  const filteredAppointments = customerAppointments.filter((apt) => {
    if (filter === 'upcoming') return apt.status === 'confirmed' || apt.status === 'pending';
    if (filter === 'past') return apt.status === 'completed' || apt.status === 'cancelled';
    return true;
  });

  return (
    <div className="dashboard-page">
      {/* Top Header */}
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Customer Appointments</h1>
          <p className="dashboard-subtitle">
            Welcome, <strong>{user?.name || 'Customer'}</strong> ({user?.email}).
            Book salon treatments and manage your appointments below.
          </p>
        </div>

        {/* Actions in Header */}
        <div className="header-actions">
          <button
            type="button"
            onClick={handleOpenProfile}
            className="btn-profile-settings"
          >
            <Settings size={16} />
            <span>Profile Settings</span>
          </button>
          <Link to="/ai-booking" className="btn-assistant-hero">
            <Bot size={18} />
            <span>Book with AI Assistant</span>
          </Link>
        </div>
      </div>

      {feedbackMessage && (
        <div className="feedback-banner">
          <AlertCircle size={18} />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {/* AI Booking Hero Card */}
      <div className="ai-booking-banner">
        <div className="ai-banner-left">
          <div className="ai-banner-icon-box">
            <Sparkles size={22} className="sparkle-icon" />
          </div>
          <div>
            <strong>Conversational AI Stylist & Booking</strong>
            <p>Our intelligent AI Assistant checks real-time stylist availability, handles breaks & certifications, and books in seconds.</p>
          </div>
        </div>
        <Link to="/ai-booking" className="btn-ai-banner-cta">
          <span>Talk to AI Stylist</span>
          <ArrowRight size={14} />
        </Link>
      </div>

      {/* Primary Section Switcher Tabs */}
      <div className="main-section-tabs">
        <button
          type="button"
          onClick={() => setMainTab('services')}
          className={`main-tab-btn ${mainTab === 'services' ? 'active' : ''}`}
        >
          <Scissors size={16} />
          <span>Browse Salon Services ({services.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setMainTab('bookings')}
          className={`main-tab-btn ${mainTab === 'bookings' ? 'active' : ''}`}
        >
          <Calendar size={16} />
          <span>My Appointments ({customerAppointments.length})</span>
        </button>
      </div>

      {/* ── TAB 1: BROWSE SALON SERVICES ── */}
      {mainTab === 'services' && (
        <div className="services-showcase-section">
          <div className="services-section-intro">
            <h2>Our Signature Salon Menu</h2>
            <p>Select any service to review duration and pricing, or tap <strong>Book with AI</strong> to pick your stylist and date.</p>
          </div>

          <div className="services-cards-grid">
            {services.map((srv) => (
              <div key={srv.id} className="service-card-item">
                <div className="service-card-header">
                  <div className="service-icon-box">
                    <Scissors size={18} />
                  </div>
                  <div className="service-badge-row">
                    <span className="service-price-pill">${srv.price}</span>
                    <span className="service-duration-pill">
                      <Clock size={12} /> {srv.duration} min
                    </span>
                  </div>
                </div>

                <h3 className="service-card-title">{srv.name}</h3>
                <p className="service-card-description">{srv.description}</p>

                <div className="service-card-footer">
                  <Link
                    to={`/ai-booking?service=${encodeURIComponent(srv.name)}`}
                    className="btn-book-service-now"
                  >
                    <Sparkles size={14} />
                    <span>Book with AI Stylist</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB 2: MY APPOINTMENTS ── */}
      {mainTab === 'bookings' && (
        <div className="appointments-section">
          {/* Sub Filter Tabs */}
          <div className="filter-tabs">
            <button
              type="button"
              onClick={() => setFilter('upcoming')}
              className={`filter-btn ${filter === 'upcoming' ? 'active' : ''}`}
            >
              Upcoming ({customerAppointments.filter(a => a.status === 'confirmed' || a.status === 'pending').length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('past')}
              className={`filter-btn ${filter === 'past' ? 'active' : ''}`}
            >
              History ({customerAppointments.filter(a => a.status === 'completed' || a.status === 'cancelled').length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            >
              All ({customerAppointments.length})
            </button>
          </div>

          {/* Appointments Grid */}
          <div className="appointments-grid">
            {filteredAppointments.length === 0 ? (
              <div className="empty-state">
                <Calendar size={48} className="empty-icon" />
                <h3>No appointments in this view</h3>
                <p>You haven't scheduled any treatments here yet. Explore our salon services or book with the AI assistant!</p>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 14, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setMainTab('services')}
                    className="btn-primary-small"
                    style={{ background: '#3b82f6' }}
                  >
                    <Scissors size={15} /> Browse Services Menu
                  </button>
                  <Link to="/ai-booking" className="btn-primary-small">
                    <Bot size={15} /> Book with AI Assistant
                  </Link>
                </div>
              </div>
            ) : (
              filteredAppointments.map((apt) => (
                <div key={apt.id} className={`appointment-card status-${apt.status}`}>
                  <div className="card-top">
                    <div className="service-info">
                      <span className="service-name">{apt.serviceName}</span>
                      <span className="service-price">{apt.servicePrice}</span>
                    </div>
                    <span className={`status-badge badge-${apt.status}`}>
                      {apt.status === 'confirmed' && <CheckCircle size={13} />}
                      {apt.status === 'cancelled' && <XCircle size={13} />}
                      {apt.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="card-details">
                    <div className="detail-row">
                      <Scissors size={15} />
                      <span>Stylist: <strong>{apt.employeeName}</strong></span>
                    </div>
                    <div className="detail-row">
                      <Calendar size={15} />
                      <span>{apt.date}</span>
                    </div>
                    <div className="detail-row">
                      <Clock size={15} />
                      <span>{apt.time} ({apt.serviceDuration} mins)</span>
                    </div>
                    {apt.notes && (
                      <div className="detail-notes">
                        <strong>Note:</strong> <em>"{apt.notes}"</em>
                      </div>
                    )}
                  </div>

                  <div className="card-actions">
                    <button
                      type="button"
                      onClick={() => setSelectedAptDetails(apt)}
                      className="btn-action"
                      style={{ background: '#f1f5f9', color: '#0f172a' }}
                    >
                      View Details
                    </button>
                    {(apt.status === 'confirmed' || apt.status === 'pending') && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleOpenReschedule(apt)}
                          className="btn-action reschedule"
                        >
                          Reschedule
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCancelBooking(apt.id)}
                          className="btn-action cancel"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {rescheduleApt && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Reschedule Appointment</h2>
              <button
                type="button"
                onClick={() => setRescheduleApt(null)}
                className="modal-close-btn"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveReschedule} className="modal-form">
              <p style={{ fontSize: '13px', color: '#555', marginBottom: 12 }}>
                Rescheduling <strong>{rescheduleApt.serviceName}</strong> with <strong>{rescheduleApt.employeeName}</strong>.
              </p>

              <div className="modal-form-row">
                <div className="modal-form-group">
                  <label>New Date</label>
                  <input
                    type="date"
                    required
                    value={rescheduleDate}
                    onChange={(e) => setRescheduleDate(e.target.value)}
                  />
                </div>
                <div className="modal-form-group">
                  <label>New Time</label>
                  <input
                    type="time"
                    required
                    value={rescheduleTime}
                    onChange={(e) => setRescheduleTime(e.target.value)}
                  />
                </div>
              </div>

              {rescheduleError && (
                <div style={{ padding: '8px 12px', background: '#fee2e2', color: '#b91c1c', border: '1px solid #f87171', borderRadius: 6, fontSize: '0.82rem', fontWeight: 600, marginTop: 4 }}>
                  {rescheduleError}
                </div>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setRescheduleApt(null)}
                  className="btn-modal-cancel"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-modal-submit">
                  Save New Time
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Profile Settings Modal (Spec Page 5, 9) */}
      {showProfileModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>My Profile Settings</h2>
              <button
                type="button"
                onClick={() => setShowProfileModal(false)}
                className="modal-close-btn"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="modal-form">
              <div className="modal-form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  required
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                />
              </div>

              <div className="modal-form-group">
                <label>Email Address (Account ID)</label>
                <input
                  type="email"
                  disabled
                  value={user?.email || ''}
                  style={{ opacity: 0.7, cursor: 'not-allowed' }}
                />
              </div>

              <div className="modal-form-group">
                <label>Contact Phone Number</label>
                <input
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  value={profilePhone}
                  onChange={(e) => setProfilePhone(e.target.value)}
                />
              </div>

              <div className="modal-form-group">
                <label>Preferred Stylist (Optional)</label>
                <select
                  value={preferredStylist}
                  onChange={(e) => setPreferredStylist(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #000', borderRadius: 6, fontWeight: 600 }}
                >
                  <option value="">No preference (Any qualified specialist)</option>
                  {(staffList || []).map(s => (
                    <option key={s.id} value={s.name}>{s.name} ({s.role})</option>
                  ))}
                </select>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setShowProfileModal(false)}
                  className="btn-modal-cancel"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-modal-submit">
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Appointment Details Modal (Spec Page 5 & 9) */}
      {selectedAptDetails && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h2>Appointment Confirmation & Details</h2>
              <button
                type="button"
                onClick={() => setSelectedAptDetails(null)}
                className="modal-close-btn"
              >
                ×
              </button>
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <span className={`status-badge badge-${selectedAptDetails.status}`}>
                  {selectedAptDetails.status.toUpperCase()}
                </span>
                <span style={{ fontSize: '1.1rem', fontWeight: 900, color: '#15803d' }}>
                  {selectedAptDetails.servicePrice || '$45'}
                </span>
              </div>

              <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '2px solid #000', marginBottom: 14 }}>
                <h3 style={{ margin: '0 0 6px 0', fontSize: '1.05rem', fontWeight: 900, color: 'var(--orange)' }}>
                  {selectedAptDetails.serviceName}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.85rem' }}>
                  <div>✂️ Stylist: <strong>{selectedAptDetails.employeeName}</strong></div>
                  <div>📅 Date: <strong>{selectedAptDetails.date}</strong> at <strong>{selectedAptDetails.time}</strong></div>
                  <div>⏱️ Session Duration: <strong>{selectedAptDetails.serviceDuration || 45} minutes</strong></div>
                  {selectedAptDetails.notes && (
                    <div style={{ marginTop: 4, fontStyle: 'italic', color: '#555' }}>
                      Special Request: "{selectedAptDetails.notes}"
                    </div>
                  )}
                </div>
              </div>

              <div style={{ background: '#f0fdf4', padding: 10, borderRadius: 6, border: '1px solid #86efac', fontSize: '0.78rem', color: '#166534', marginBottom: 14 }}>
                <strong>Salon Cancellation Policy:</strong> Free cancellation & rescheduling up to 2 hours prior to your scheduled slot.
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setSelectedAptDetails(null)}
                  className="btn-modal-cancel"
                >
                  Close
                </button>
                {(selectedAptDetails.status === 'confirmed' || selectedAptDetails.status === 'pending') && (
                  <button
                    type="button"
                    onClick={() => {
                      const apt = selectedAptDetails;
                      setSelectedAptDetails(null);
                      handleOpenReschedule(apt);
                    }}
                    className="btn-modal-submit"
                  >
                    Reschedule
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
