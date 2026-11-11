import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { User, Scissors, Shield, ArrowRight, Sparkles } from 'lucide-react';
import './PersonaModal.css';

export default function PersonaModal({ isOpen, onClose }) {
  const { role, switchRolePreview } = useAuth();
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleSelectPersona = (roleKey, targetPath) => {
    switchRolePreview(roleKey);
    navigate(targetPath);
    onClose();
  };

  return (
    <div className="persona-modal-backdrop" onClick={onClose}>
      <div className="persona-modal-window" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={onClose}
          className="persona-modal-close"
          aria-label="Close modal"
        >
          ×
        </button>

        <div className="persona-modal-header">
          <div className="persona-modal-badge">
            <Sparkles size={13} />
            <span>Interactive Demo Explorer</span>
          </div>
          <h2 className="persona-modal-title">Switch Persona & Explore</h2>
          <p className="persona-modal-subtitle">
            Experience StylistAI from different perspectives. Selecting a persona updates your permissions and views immediately.
          </p>
        </div>

        <div className="persona-cards-grid">
          {/* Customer Persona */}
          <button
            type="button"
            onClick={() => handleSelectPersona('CUSTOMER', '/dashboard')}
            className={`persona-card ${role === 'CUSTOMER' ? 'active-persona' : ''}`}
          >
            <div className="persona-card-left">
              <div className="persona-avatar avatar-customer">
                <User size={20} />
              </div>
              <div className="persona-info">
                <span className="persona-role-label">Customer Persona</span>
                <strong>Alex Johnson (Client)</strong>
                <p>Chat with AI Assistant, book treatments, and manage appointments.</p>
              </div>
            </div>

            <div className="persona-card-right">
              {role === 'CUSTOMER' ? (
                <span className="active-pill">ACTIVE</span>
              ) : (
                <ArrowRight size={16} />
              )}
            </div>
          </button>

          {/* Staff Persona */}
          <button
            type="button"
            onClick={() => handleSelectPersona('STAFF', '/staff')}
            className={`persona-card ${role === 'STAFF' ? 'active-persona' : ''}`}
          >
            <div className="persona-card-left">
              <div className="persona-avatar avatar-staff">
                <Scissors size={20} />
              </div>
              <div className="persona-info">
                <span className="persona-role-label">Staff Persona</span>
                <strong>Sarah Jenkins (Senior Stylist)</strong>
                <p>View assigned client appointments, manage breaks, and pause schedule.</p>
              </div>
            </div>

            <div className="persona-card-right">
              {role === 'STAFF' ? (
                <span className="active-pill">ACTIVE</span>
              ) : (
                <ArrowRight size={16} />
              )}
            </div>
          </button>

          {/* Admin Persona */}
          <button
            type="button"
            onClick={() => handleSelectPersona('ADMIN', '/admin')}
            className={`persona-card ${role === 'ADMIN' ? 'active-persona' : ''}`}
          >
            <div className="persona-card-left">
              <div className="persona-avatar avatar-admin">
                <Shield size={20} />
              </div>
              <div className="persona-info">
                <span className="persona-role-label">Management Persona</span>
                <strong>Elena Vance (Salon Administrator)</strong>
                <p>Oversee all team schedules, configure services, and track business KPIs.</p>
              </div>
            </div>

            <div className="persona-card-right">
              {role === 'ADMIN' ? (
                <span className="active-pill">ACTIVE</span>
              ) : (
                <ArrowRight size={16} />
              )}
            </div>
          </button>
        </div>

        <div className="persona-modal-footer">
          <span>Tip: You can reopen this persona selector anytime using the <strong>Switch Persona</strong> button in the navigation bar.</span>
        </div>
      </div>
    </div>
  );
}
