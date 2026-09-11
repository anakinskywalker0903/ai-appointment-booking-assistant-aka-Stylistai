import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, Scissors, Shield, Check, ArrowRight, Sparkles } from 'lucide-react';
import './LandingGateway.css';

export default function LandingGateway() {
  const { user, role, switchRolePreview, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleSelectRole = (roleKey, targetPath) => {
    switchRolePreview(roleKey);
    navigate(targetPath);
  };

  const getPortalPathForRole = (r) => {
    if (r === 'CUSTOMER') return '/dashboard';
    if (r === 'STAFF') return '/staff';
    if (r === 'ADMIN') return '/admin';
    return '/dashboard';
  };

  return (
    <div className="gateway-page">
      <div className="gateway-hero">
        <div className="gateway-badge">
          <Sparkles size={14} />
          <span>StylistAI V2 • Full-Stack Appointment Platform</span>
        </div>
        <h1 className="gateway-title">
          Smart Appointments, <span>Reliable Scheduling</span>
        </h1>
        <p className="gateway-sub">
          Choose your portal below to enter as a Customer, Staff Member, or Salon Administrator.
          All appointment bookings and schedule changes sync in real-time.
        </p>
      </div>

      {/* Active Session Indicator */}
      {isAuthenticated && (
        <div className="active-session-banner">
          <div className="active-session-info">
            <div className="active-session-avatar">
              {user.name.charAt(0)}
            </div>
            <div>
              <strong>Currently Signed In: {user.name}</strong>
              <div style={{ fontSize: '13px', color: '#555' }}>
                Role: <strong>{role}</strong> ({user.email})
              </div>
            </div>
          </div>
          <Link to={getPortalPathForRole(role)} className="btn-continue-portal">
            <span>Continue to {role.charAt(0) + role.slice(1).toLowerCase()} Portal</span>
            <ArrowRight size={15} />
          </Link>
        </div>
      )}

      {/* Role Cards Grid */}
      <div className="roles-grid">
        {/* Card 1: Customer */}
        <div className="role-card card-customer">
          <div>
            <div className="role-card-header">
              <div className="role-icon-box">
                <User size={22} />
              </div>
              <div>
                <h2 className="role-card-title">Customer</h2>
                <span className="role-card-tag">Public & Client Access</span>
              </div>
            </div>

            <p className="role-card-desc">
              Book salon treatments, view upcoming appointments, reschedule or cancel, and interact with the AI assistant.
            </p>

            <ul className="role-card-features">
              <li><Check size={16} /> Browse salon services & pricing</li>
              <li><Check size={16} /> Choose preferred stylist & time</li>
              <li><Check size={16} /> Manage & reschedule bookings</li>
              <li><Check size={16} /> Conversational AI booking helper</li>
            </ul>
          </div>

          <button
            type="button"
            onClick={() => handleSelectRole('CUSTOMER', '/dashboard')}
            className="btn-enter-role"
          >
            <span>Enter as Customer</span>
            <ArrowRight size={16} />
          </button>
        </div>

        {/* Card 2: Staff / Stylist */}
        <div className="role-card card-staff">
          <div>
            <div className="role-card-header">
              <div className="role-icon-box">
                <Scissors size={22} />
              </div>
              <div>
                <h2 className="role-card-title">Staff / Stylist</h2>
                <span className="role-card-tag">Employee Access</span>
              </div>
            </div>

            <p className="role-card-desc">
              Access your assigned client appointments, view specific customer requests & notes, and manage blocked breaks.
            </p>

            <ul className="role-card-features">
              <li><Check size={16} /> Daily & upcoming appointment roster</li>
              <li><Check size={16} /> View client details & styling notes</li>
              <li><Check size={16} /> Set blocked times & lunch breaks</li>
              <li><Check size={16} /> Live schedule pause / resume toggle</li>
            </ul>
          </div>

          <button
            type="button"
            onClick={() => handleSelectRole('STAFF', '/staff')}
            className="btn-enter-role"
          >
            <span>Enter as Staff</span>
            <ArrowRight size={16} />
          </button>
        </div>

        {/* Card 3: Admin */}
        <div className="role-card card-admin">
          <div>
            <div className="role-card-header">
              <div className="role-icon-box">
                <Shield size={22} />
              </div>
              <div>
                <h2 className="role-card-title">Salon Admin</h2>
                <span className="role-card-tag">Management Access</span>
              </div>
            </div>

            <p className="role-card-desc">
              Full salon management: oversee all team bookings, configure service durations and pricing, and monitor KPIs.
            </p>

            <ul className="role-card-features">
              <li><Check size={16} /> Master booking timeline & audit</li>
              <li><Check size={16} /> Manage team & service assignments</li>
              <li><Check size={16} /> Business performance & metrics</li>
              <li><Check size={16} /> Google Calendar integration status</li>
            </ul>
          </div>

          <button
            type="button"
            onClick={() => handleSelectRole('ADMIN', '/admin')}
            className="btn-enter-role"
          >
            <span>Enter as Admin</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>

      <div className="gateway-bottom">
        <span>Looking for standard email credentials? </span>
        <Link to="/login">Sign in with email and password</Link>
      </div>
    </div>
  );
}
