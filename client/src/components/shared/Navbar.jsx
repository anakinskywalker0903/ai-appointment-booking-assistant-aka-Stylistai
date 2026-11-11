import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Calendar, User, Shield, Sparkles, LogOut, LogIn, Users, Menu, X } from 'lucide-react';
import PersonaModal from './PersonaModal';
import './Navbar.css';

export default function Navbar() {
  const { user, role, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showPersonaModal, setShowPersonaModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path) => location.pathname === path;

  // Auto-close mobile menu when changing route
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <>
      <header className="navbar-container">
        <div className="navbar-inner">
          {/* Brand */}
          <Link to="/" className="navbar-brand">
            <span className="brand-title">Stylist<span>AI</span></span>
          </Link>

          {/* Desktop Role-Scoped Navigation Links */}
          <nav className="navbar-links desktop-only-flex">
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

          {/* User & Persona Actions (Desktop) */}
          <div className="navbar-actions desktop-only-flex">
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

          {/* Mobile Right Controls: Persona Pill & Hamburger Menu Button */}
          <div className="navbar-mobile-controls">
            <button
              type="button"
              onClick={() => setShowPersonaModal(true)}
              className="btn-persona-trigger mobile-persona-btn"
              title="Switch Persona"
            >
              <Users size={14} />
              <span>{role || 'Persona'}</span>
            </button>

            <button
              type="button"
              className="navbar-mobile-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile Slide-Down Drawer */}
        {mobileMenuOpen && (
          <div className="navbar-mobile-drawer">
            <div className="mobile-drawer-inner">
              {/* Authenticated User Header Card */}
              {isAuthenticated ? (
                <div className="mobile-user-card">
                  <div className="mobile-user-avatar">
                    {user?.name?.charAt(0) || 'U'}
                  </div>
                  <div className="mobile-user-info">
                    <strong>{user?.name}</strong>
                    <div className="mobile-user-meta">
                      <span className={`user-role-tag role-${role?.toLowerCase()}`}>{role}</span>
                      <span className="mobile-user-email">{user?.email}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mobile-auth-prompt">
                  <p>Access your bookings and customized views:</p>
                  <Link to="/login" className="login-link-btn mobile-full-btn" onClick={() => setMobileMenuOpen(false)}>
                    <LogIn size={16} />
                    <span>Sign In to Account</span>
                  </Link>
                </div>
              )}

              {/* Navigation Links */}
              <div className="mobile-nav-links">
                <div className="mobile-nav-heading">PORTAL SECTIONS</div>
                <Link
                  to="/"
                  className={`mobile-nav-item ${isActive('/') ? 'active' : ''}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span>Home & Role Gateway</span>
                </Link>

                {role === 'CUSTOMER' && (
                  <>
                    <Link
                      to="/dashboard"
                      className={`mobile-nav-item ${isActive('/dashboard') ? 'active' : ''}`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Calendar size={18} />
                      <span>My Appointments & Booking</span>
                    </Link>
                    <Link
                      to="/ai-booking"
                      className={`mobile-nav-item ${isActive('/ai-booking') ? 'active' : ''}`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Sparkles size={18} />
                      <span>AI Booking Assistant</span>
                    </Link>
                  </>
                )}

                {role === 'STAFF' && (
                  <Link
                    to="/staff"
                    className={`mobile-nav-item ${isActive('/staff') ? 'active' : ''}`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <User size={18} />
                    <span>My Stylist Schedule</span>
                  </Link>
                )}

                {role === 'ADMIN' && (
                  <>
                    <Link
                      to="/admin"
                      className={`mobile-nav-item ${isActive('/admin') ? 'active' : ''}`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Shield size={18} />
                      <span>Admin Hub & Analytics</span>
                    </Link>
                    <Link
                      to="/ai-booking"
                      className={`mobile-nav-item ${isActive('/ai-booking') ? 'active' : ''}`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Sparkles size={18} />
                      <span>AI Assistant</span>
                    </Link>
                    <Link
                      to="/staff"
                      className={`mobile-nav-item ${isActive('/staff') ? 'active' : ''}`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <User size={18} />
                      <span>Staff Portal</span>
                    </Link>
                    <Link
                      to="/dashboard"
                      className={`mobile-nav-item ${isActive('/dashboard') ? 'active' : ''}`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Calendar size={18} />
                      <span>Customer View</span>
                    </Link>
                  </>
                )}
              </div>

              {/* Persona Switcher Quick Trigger */}
              <div className="mobile-drawer-footer">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setShowPersonaModal(true);
                  }}
                  className="btn-persona-trigger mobile-full-btn"
                >
                  <Users size={16} />
                  <span>Switch Demo Persona</span>
                </button>

                {isAuthenticated && (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      logout();
                      navigate('/');
                    }}
                    className="mobile-logout-btn"
                  >
                    <LogOut size={16} />
                    <span>Log Out</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Interactive Persona Modal */}
      <PersonaModal
        isOpen={showPersonaModal}
        onClose={() => setShowPersonaModal(false)}
      />
    </>
  );
}
