import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAppointments } from '../../context/AppointmentContext';
import { Calendar, Clock, AlertCircle, CheckCircle, XCircle, Plus, Sparkles, Scissors } from 'lucide-react';
import { Link } from 'react-router-dom';
import './CustomerDashboard.css';

const AVAILABLE_SERVICES = [
  { id: 's1', name: 'Haircut & Styling', duration: 45, price: '$35.00' },
  { id: 's2', name: 'Hair Coloring (Balayage)', duration: 120, price: '$95.00' },
  { id: 's3', name: 'Hair Spa & Scalp Therapy', duration: 60, price: '$50.00' },
  { id: 's4', name: 'Classic Beard Grooming', duration: 30, price: '$25.00' },
];

const AVAILABLE_STYLISTS = [
  { id: 'emp-1', name: 'Sarah Jenkins', role: 'Senior Hair Stylist' },
  { id: 'emp-2', name: 'Emma Watson', role: 'Hair & Beauty Expert' },
  { id: 'emp-3', name: 'David Miller', role: 'Master Barber' },
];

export default function CustomerDashboard() {
  const { user } = useAuth();
  const {
    getAppointmentsForCustomer,
    bookAppointment,
    cancelAppointment,
    rescheduleAppointment,
  } = useAppointments();

  const customerAppointments = getAppointmentsForCustomer(user?.email);

  const [filter, setFilter] = useState('upcoming');
  const [feedbackMessage, setFeedbackMessage] = useState(null);

  // New Booking Modal State
  const [showBookModal, setShowBookModal] = useState(false);
  const [selectedService, setSelectedService] = useState(AVAILABLE_SERVICES[0]);
  const [selectedStylist, setSelectedStylist] = useState(AVAILABLE_STYLISTS[0]);
  const [bookDate, setBookDate] = useState('2026-09-17');
  const [bookTime, setBookTime] = useState('15:00');
  const [bookNotes, setBookNotes] = useState('');

  // Reschedule Modal State
  const [rescheduleApt, setRescheduleApt] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('14:00');

  const handleCreateBooking = (e) => {
    e.preventDefault();
    const newApt = bookAppointment({
      customerName: user?.name || 'Customer',
      customerEmail: user?.email || 'customer@example.com',
      customerPhone: user?.phone || '',
      serviceName: selectedService.name,
      serviceDuration: selectedService.duration,
      servicePrice: selectedService.price,
      employeeName: selectedStylist.name,
      employeeRole: selectedStylist.role,
      date: bookDate,
      time: bookTime,
      notes: bookNotes,
    });

    setShowBookModal(false);
    setBookNotes('');
    setFeedbackMessage(
      `Appointment confirmed with ${newApt.employeeName} on ${newApt.date} at ${newApt.time}! It is now saved in their schedule.`
    );
    setTimeout(() => setFeedbackMessage(null), 6000);
  };

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
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Customer Portal</h1>
          <p className="dashboard-subtitle">
            Welcome, <strong>{user?.name || 'Customer'}</strong> ({user?.email}).
            Bookings are saved locally and synced with your chosen stylist.
          </p>
        </div>

        <div className="header-actions">
          <button
            type="button"
            onClick={() => setShowBookModal(true)}
            className="btn-book-direct"
          >
            <Plus size={16} />
            <span>Book Treatment</span>
          </button>

          <Link to="/ai-booking" className="btn-assistant">
            <Sparkles size={16} />
            <span>AI Assistant</span>
          </Link>
        </div>
      </div>

      {feedbackMessage && (
        <div className="feedback-banner">
          <AlertCircle size={18} />
          <span>{feedbackMessage}</span>
        </div>
      )}

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
            <p>You don't have any appointments in this view.</p>
            <button
              type="button"
              onClick={() => setShowBookModal(true)}
              className="btn-primary-small"
            >
              <Plus size={16} /> Book an Appointment
            </button>
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
                    <strong>My Request:</strong> <em>"{apt.notes}"</em>
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

      {/* Direct Booking Modal */}
      {showBookModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Book an Appointment</h2>
              <button
                type="button"
                onClick={() => setShowBookModal(false)}
                className="modal-close-btn"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateBooking} className="modal-form">
              <div className="modal-form-group">
                <label>Select Treatment</label>
                <select
                  value={selectedService.id}
                  onChange={(e) => {
                    const found = AVAILABLE_SERVICES.find(s => s.id === e.target.value);
                    if (found) setSelectedService(found);
                  }}
                >
                  {AVAILABLE_SERVICES.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.duration} min) - {s.price}
                    </option>
                  ))}
                </select>
              </div>

              <div className="modal-form-group">
                <label>Select Stylist</label>
                <select
                  value={selectedStylist.id}
                  onChange={(e) => {
                    const found = AVAILABLE_STYLISTS.find(st => st.id === e.target.value);
                    if (found) setSelectedStylist(found);
                  }}
                >
                  {AVAILABLE_STYLISTS.map(st => (
                    <option key={st.id} value={st.id}>
                      {st.name} ({st.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="modal-form-row">
                <div className="modal-form-group">
                  <label>Date</label>
                  <input
                    type="date"
                    required
                    value={bookDate}
                    onChange={(e) => setBookDate(e.target.value)}
                  />
                </div>
                <div className="modal-form-group">
                  <label>Time</label>
                  <input
                    type="time"
                    required
                    value={bookTime}
                    onChange={(e) => setBookTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-form-group">
                <label>Notes & Requests</label>
                <input
                  type="text"
                  placeholder="e.g. Skin fade, sensitive skin, beard shape"
                  value={bookNotes}
                  onChange={(e) => setBookNotes(e.target.value)}
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setShowBookModal(false)}
                  className="btn-modal-cancel"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-modal-submit">
                  Confirm Booking
                </button>
              </div>
            </form>
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
