import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Calendar, User, Shield, Sparkles, LogOut, LogIn, Users } from 'lucide-react';
import PersonaModal from './PersonaModal';
import './Navbar.css';

export default function Navbar() {
  const { user, role, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showPersonaModal, setShowPersonaModal] = useState(false);

  const isActive = (path) => location.pathname === path;

  return (
    <>
      <header className="navbar-container">
        <div className="navbar-inner">
          {/* Brand */}
          <Link to="/" className="navbar-brand">
            <div className="brand-badge">V2</div>
            <span className="brand-title">Stylist<span>AI</span></span>
          </Link>

          {/* Role-Scoped Navigation Links */}
          <nav className="navbar-links">
            {/* If NOT authenticated */}
            {!isAuthenticated && (
              <Link to="/" className={`nav-link ${isActive('/') ? 'active' : ''}`}>
                <span>Home & Roles</span>
              </Link>
            )}

            {/* CUSTOMER Links */}
            {isAuthenticated && role === 'CUSTOMER' && (
              <>
                <Link
                  to="/dashboard"
                  className={`nav-link ${isActive('/dashboard') ? 'active' : ''}`}
                >
                  <Calendar size={16} />
                  <span>My Appointments</span>
                </Link>

                <Link
                  to="/ai-booking"
                  className={`nav-link ${isActive('/ai-booking') ? 'active' : ''}`}
                >
                  <Sparkles size={16} />
                  <span>Book with AI Assistant</span>
                </Link>
              </>
            )}

            {/* STAFF Links */}
            {isAuthenticated && role === 'STAFF' && (
              <Link
                to="/staff"
                className={`nav-link ${isActive('/staff') ? 'active' : ''}`}
              >
                <User size={16} />
                <span>My Stylist Schedule</span>
              </Link>
            )}

            {/* ADMIN Links */}
            {isAuthenticated && role === 'ADMIN' && (
              <>
                <Link
                  to="/admin"
                  className={`nav-link ${isActive('/admin') ? 'active' : ''}`}
                >
                  <Shield size={16} />
                  <span>Admin Hub</span>
                </Link>

                <Link
                  to="/ai-booking"
                  className={`nav-link ${isActive('/ai-booking') ? 'active' : ''}`}
                >
                  <Sparkles size={16} />
                  <span>AI Assistant</span>
                </Link>

                <Link
                  to="/staff"
                  className={`nav-link ${isActive('/staff') ? 'active' : ''}`}
                >
                  <User size={16} />
                  <span>Staff Portal</span>
                </Link>

                <Link
                  to="/dashboard"
                  className={`nav-link ${isActive('/dashboard') ? 'active' : ''}`}
                >
                  <Calendar size={16} />
                  <span>Customer View</span>
                </Link>
              </>
            )}
          </nav>

          {/* User & Persona Actions */}
          <div className="navbar-actions">
            {/* Sleek Switch Persona Button */}
            <button
              type="button"
              onClick={() => setShowPersonaModal(true)}
              className="btn-persona-trigger"
              title="Click to explore as Customer, Staff, or Admin"
            >
              <Users size={15} />
              <span>Switch Persona</span>
            </button>

            {isAuthenticated ? (
              <div className="user-profile-badge">
                <div className="user-details">
                  <span className="user-name">{user.name}</span>
                  <span className={`user-role-tag role-${role?.toLowerCase()}`}>{role}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    navigate('/');
                  }}
                  className="logout-btn"
                  title="Sign out"
                >
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <Link to="/login" className="login-link-btn">
                <LogIn size={16} />
                <span>Sign In</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Interactive Persona Modal */}
      <PersonaModal
        isOpen={showPersonaModal}
        onClose={() => setShowPersonaModal(false)}
      />
    </>
  );
}
