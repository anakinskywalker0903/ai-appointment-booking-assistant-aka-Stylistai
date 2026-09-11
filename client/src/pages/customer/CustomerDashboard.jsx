import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAppointments } from '../../context/AppointmentContext';
import { Calendar, Clock, AlertCircle, CheckCircle, XCircle, Sparkles, Scissors, Bot } from 'lucide-react';
import { Link } from 'react-router-dom';
import './CustomerDashboard.css';

export default function CustomerDashboard() {
  const { user } = useAuth();
  const {
    getAppointmentsForCustomer,
    cancelAppointment,
    rescheduleAppointment,
  } = useAppointments();

  const customerAppointments = getAppointmentsForCustomer(user?.email);

  const [filter, setFilter] = useState('upcoming');
  const [feedbackMessage, setFeedbackMessage] = useState(null);

  // Reschedule Modal State
  const [rescheduleApt, setRescheduleApt] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('14:00');

  const handleOpenReschedule = (apt) => {
    setRescheduleApt(apt);
    setRescheduleDate(apt.date);
    setRescheduleTime(apt.time);
  };

  const handleSaveReschedule = (e) => {
    e.preventDefault();
    if (!rescheduleApt) return;
    rescheduleAppointment(rescheduleApt.id, rescheduleDate, rescheduleTime);
    setRescheduleApt(null);
    setFeedbackMessage(`Appointment rescheduled to ${rescheduleDate} at ${rescheduleTime}.`);
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
          <h1 className="dashboard-title">Customer Portal</h1>
          <p className="dashboard-subtitle">
            Welcome, <strong>{user?.name || 'Customer'}</strong> ({user?.email}).
            Track, reschedule, or cancel your appointments below.
          </p>
        </div>

        {/* AI Booking Call-To-Action (No manual form!) */}
        <div className="header-actions">
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

      {/* AI Booking Banner / Tip */}
      <div className="ai-booking-banner">
        <div className="ai-banner-left">
          <Sparkles size={20} className="sparkle-icon" />
          <div>
            <strong>Need to schedule a new treatment?</strong>
            <p>Our intelligent AI Assistant checks real-time stylist availability, handles preferences, and confirms appointments seamlessly.</p>
          </div>
        </div>
        <Link to="/ai-booking" className="btn-ai-banner-cta">
          Talk to AI Assistant
        </Link>
      </div>

      {/* Filter Tabs */}
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
          All Bookings ({customerAppointments.length})
        </button>
      </div>

      {/* Appointments List */}
      <div className="appointments-grid">
        {filteredAppointments.length === 0 ? (
          <div className="empty-state">
            <Calendar size={48} className="empty-icon" />
            <h3>No appointments found</h3>
            <p>You don't have any appointments in this view. Use the AI Assistant to book your next session!</p>
            <Link to="/ai-booking" className="btn-primary-small">
              <Bot size={16} /> Book with AI Assistant
            </Link>
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

              {(apt.status === 'confirmed' || apt.status === 'pending') && (
                <div className="card-actions">
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
                </div>
              )}
            </div>
          ))
        )}
      </div>

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
    </div>
  );
}
