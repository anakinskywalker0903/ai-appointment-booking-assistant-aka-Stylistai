import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, PRESET_ACCOUNTS } from '../../context/AuthContext';
import { Calendar, User, Shield, Sparkles, LogOut, LogIn, Repeat } from 'lucide-react';
import './Navbar.css';

export default function Navbar() {
  const { user, role, isAuthenticated, logout, switchRolePreview } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path) => location.pathname === path;

  const handleRoleSwitch = (roleKey) => {
    switchRolePreview(roleKey);
    if (roleKey === 'CUSTOMER') navigate('/dashboard');
    else if (roleKey === 'STAFF') navigate('/staff');
    else if (roleKey === 'ADMIN') navigate('/admin');
  };

  return (
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
              <span>Select Portal</span>
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
                <span>AI Booking Assistant</span>
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
            <Link
              to="/admin"
              className={`nav-link ${isActive('/admin') ? 'active' : ''}`}
            >
              <Shield size={16} />
              <span>Admin Management</span>
            </Link>
          )}
        </nav>

        {/* User & Role Switcher Actions */}
        <div className="navbar-actions">
          {/* Quick Switcher between Customer / Staff / Admin */}
          <div className="role-switcher">
            <span className="role-switcher-label">
              <Repeat size={12} style={{ display: 'inline', marginRight: 4 }} />
              Role:
            </span>
            <div className="role-buttons">
              {Object.keys(PRESET_ACCOUNTS).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleRoleSwitch(key)}
                  className={`role-btn ${role === key ? 'active' : ''}`}
                  title={`Switch active view to ${key}`}
                >
                  {key.charAt(0) + key.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

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
  );
}
