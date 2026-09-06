import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Calendar, Clock, User, AlertCircle, CheckCircle, XCircle, Plus, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import './CustomerDashboard.css';

// Initial mock appointments aligned with API contracts
const INITIAL_APPOINTMENTS = [
  {
    id: 'apt-c1',
    service: 'Haircut & Styling',
    stylist: 'Sarah Jenkins',
    date: '2026-09-10',
    time: '14:00',
    duration: 45,
    price: '$35.00',
    status: 'confirmed',
    notes: 'Requested low taper fade',
  },
  {
    id: 'apt-c2',
    service: 'Hair Spa & Scalp Massage',
    stylist: 'Emma Watson',
    date: '2026-09-18',
    time: '16:30',
    duration: 60,
    price: '$50.00',
    status: 'pending',
    notes: 'Allergic to peppermint oil',
  },
  {
    id: 'apt-c3',
    service: 'Beard Grooming & Shape',
    stylist: 'David Miller',
    date: '2026-08-28',
    time: '11:00',
    duration: 20,
    price: '$20.00',
    status: 'completed',
    notes: 'Completed successfully',
  },
];

export default function CustomerDashboard() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState(INITIAL_APPOINTMENTS);
  const [filter, setFilter] = useState('upcoming'); // 'upcoming' | 'all' | 'past'
  const [feedbackMessage, setFeedbackMessage] = useState(null);

  const handleCancel = (id) => {
    setAppointments((prev) =>
      prev.map((apt) => (apt.id === id ? { ...apt, status: 'cancelled' } : apt))
    );
    setFeedbackMessage('Appointment cancelled successfully.');
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  const handleReschedulePrompt = (id) => {
    setFeedbackMessage(`Reschedule requested for #${id.slice(-4)}. You can also ask the AI assistant: "Move my appointment #${id.slice(-4)} to Saturday at 3 PM".`);
    setTimeout(() => setFeedbackMessage(null), 6000);
  };

  const filteredAppointments = appointments.filter((apt) => {
    if (filter === 'upcoming') return apt.status === 'confirmed' || apt.status === 'pending';
    if (filter === 'past') return apt.status === 'completed' || apt.status === 'cancelled';
    return true;
  });

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Customer Dashboard</h1>
          <p className="dashboard-subtitle">
            Welcome back, <strong>{user?.name || 'Customer'}</strong>. Track your reservations and appointments.
          </p>
        </div>

        <div className="header-actions">
          <Link to="/" className="btn-assistant">
            <Sparkles size={16} />
            <span>Book with AI</span>
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
          Upcoming ({appointments.filter(a => a.status === 'confirmed' || a.status === 'pending').length})
        </button>
        <button
          type="button"
          onClick={() => setFilter('past')}
          className={`filter-btn ${filter === 'past' ? 'active' : ''}`}
        >
          History ({appointments.filter(a => a.status === 'completed' || a.status === 'cancelled').length})
        </button>
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
        >
          All ({appointments.length})
        </button>
      </div>

      {/* Appointments List */}
      <div className="appointments-grid">
        {filteredAppointments.length === 0 ? (
          <div className="empty-state">
            <Calendar size={48} className="empty-icon" />
            <h3>No appointments found</h3>
            <p>You don't have any appointments in this view.</p>
            <Link to="/" className="btn-primary-small">
              <Plus size={16} /> Book Appointment
            </Link>
          </div>
        ) : (
          filteredAppointments.map((apt) => (
            <div key={apt.id} className={`appointment-card status-${apt.status}`}>
              <div className="card-top">
                <div className="service-info">
                  <span className="service-name">{apt.service}</span>
                  <span className="service-price">{apt.price}</span>
                </div>
                <span className={`status-badge badge-${apt.status}`}>
                  {apt.status === 'confirmed' && <CheckCircle size={13} />}
                  {apt.status === 'cancelled' && <XCircle size={13} />}
                  {apt.status.toUpperCase()}
                </span>
              </div>

              <div className="card-details">
                <div className="detail-row">
                  <User size={15} />
                  <span>Stylist: <strong>{apt.stylist}</strong></span>
                </div>
                <div className="detail-row">
                  <Calendar size={15} />
                  <span>{apt.date}</span>
                </div>
                <div className="detail-row">
                  <Clock size={15} />
                  <span>{apt.time} ({apt.duration} mins)</span>
                </div>
                {apt.notes && (
                  <div className="detail-notes">
                    <em>"{apt.notes}"</em>
                  </div>
                )}
              </div>

              {(apt.status === 'confirmed' || apt.status === 'pending') && (
                <div className="card-actions">
                  <button
                    type="button"
                    onClick={() => handleReschedulePrompt(apt.id)}
                    className="btn-action reschedule"
                  >
                    Reschedule
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCancel(apt.id)}
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
    </div>
  );
}
