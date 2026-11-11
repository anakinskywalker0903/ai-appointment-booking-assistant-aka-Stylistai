import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Calendar, Sparkles, Shield, User, Home } from 'lucide-react';
import './MobileActionDock.css';

export default function MobileActionDock() {
  const { role, isAuthenticated } = useAuth();
  const location = useLocation();

  const isCurrent = (path) => location.pathname === path;

  return (
    <aside className="mobile-action-dock" aria-label="Mobile Navigation Dock">
      <div className="dock-buttons">
        <Link
          to="/"
          className={`dock-btn ${isCurrent('/') ? 'dock-btn-active' : ''}`}
        >
          <Home size={18} />
          <span>Gateway</span>
        </Link>

        {(!isAuthenticated || role === 'CUSTOMER') && (
          <>
            <Link
              to="/dashboard"
              className={`dock-btn ${isCurrent('/dashboard') ? 'dock-btn-active' : ''}`}
            >
              <Calendar size={18} />
              <span>Bookings</span>
            </Link>

            <Link
              to="/ai-booking"
              className={`dock-btn dock-btn-primary ${isCurrent('/ai-booking') ? 'dock-btn-active' : ''}`}
            >
              <Sparkles size={18} />
              <span>AI Stylist</span>
            </Link>
          </>
        )}

        {isAuthenticated && role === 'STAFF' && (
          <>
            <Link
              to="/staff"
              className={`dock-btn dock-btn-primary ${isCurrent('/staff') ? 'dock-btn-active' : ''}`}
            >
              <User size={18} />
              <span>My Schedule</span>
            </Link>

            <Link
              to="/ai-booking"
              className={`dock-btn ${isCurrent('/ai-booking') ? 'dock-btn-active' : ''}`}
            >
              <Sparkles size={18} />
              <span>AI Booking</span>
            </Link>
          </>
        )}

        {isAuthenticated && role === 'ADMIN' && (
          <>
            <Link
              to="/admin"
              className={`dock-btn ${isCurrent('/admin') ? 'dock-btn-active' : ''}`}
            >
              <Shield size={18} />
              <span>Admin</span>
            </Link>

            <Link
              to="/ai-booking"
              className={`dock-btn dock-btn-primary ${isCurrent('/ai-booking') ? 'dock-btn-active' : ''}`}
            >
              <Sparkles size={18} />
              <span>AI Stylist</span>
            </Link>

            <Link
              to="/dashboard"
              className={`dock-btn ${isCurrent('/dashboard') ? 'dock-btn-active' : ''}`}
            >
              <Calendar size={18} />
              <span>Client View</span>
            </Link>
          </>
        )}
      </div>
    </aside>
  );
}
