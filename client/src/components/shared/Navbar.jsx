import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth, PRESET_ACCOUNTS } from '../../context/AuthContext';
import { Calendar, User, Shield, Sparkles, LogOut, LogIn } from 'lucide-react';
import './Navbar.css';

export default function Navbar() {
  const { user, role, isAuthenticated, logout, switchRolePreview } = useAuth();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <header className="navbar-container">
      <div className="navbar-inner">
        {/* Brand */}
        <Link to="/" className="navbar-brand">
          <div className="brand-badge">V2</div>
          <span className="brand-title">Stylist<span>AI</span></span>
        </Link>

        {/* Navigation Links */}
        <nav className="navbar-links">
          <Link
            to="/"
            className={`nav-link ${isActive('/') ? 'active' : ''}`}
          >
            <Sparkles size={16} />
            <span>AI Assistant</span>
          </Link>

          <Link
            to="/dashboard"
            className={`nav-link ${isActive('/dashboard') ? 'active' : ''}`}
          >
            <Calendar size={16} />
            <span>Customer Portal</span>
          </Link>

          <Link
            to="/staff"
            className={`nav-link ${isActive('/staff') ? 'active' : ''}`}
          >
            <User size={16} />
            <span>Staff Schedule</span>
          </Link>

          <Link
            to="/admin"
            className={`nav-link ${isActive('/admin') ? 'active' : ''}`}
          >
            <Shield size={16} />
            <span>Admin Portal</span>
          </Link>
        </nav>

        {/* User & Role Switcher */}
        <div className="navbar-actions">
          {/* Quick Demo Role Switcher */}
          <div className="role-switcher" title="Simulate different roles for development & testing">
            <span className="role-switcher-label">Dev Role:</span>
            <div className="role-buttons">
              {Object.keys(PRESET_ACCOUNTS).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => switchRolePreview(key)}
                  className={`role-btn ${role === key ? 'active' : ''}`}
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
                onClick={logout}
                className="logout-btn"
                title="Log out"
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
