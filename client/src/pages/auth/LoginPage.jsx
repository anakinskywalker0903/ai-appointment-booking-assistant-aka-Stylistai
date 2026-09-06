import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Lock, Mail, ArrowRight, Sparkles, Shield, User } from 'lucide-react';
import './AuthPage.css';

export default function LoginPage() {
  const { login, switchRolePreview } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(email, password);
      if (email.includes('admin')) {
        navigate('/admin', { replace: true });
      } else if (email.includes('staff') || email.includes('sarah')) {
        navigate('/staff', { replace: true });
      } else {
        navigate(from, { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Login failed');
    }
  };

  const handleQuickDemo = (roleKey, targetPath) => {
    switchRolePreview(roleKey);
    navigate(targetPath, { replace: true });
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="brand-badge">V2</div>
          <span className="brand-title">Stylist<span>AI</span></span>
        </div>

        <h1 className="auth-heading">Sign In</h1>
        <p className="auth-sub">Access your appointments, schedule, or business portal.</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>Email Address</label>
            <div className="input-wrapper">
              <Mail size={16} />
              <input
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Password</label>
            <div className="input-wrapper">
              <Lock size={16} />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button type="submit" className="btn-auth-submit">
            <span>Sign In</span>
            <ArrowRight size={16} />
          </button>
        </form>

        <div className="auth-divider">
          <span>OR TEST WITH DEMO ROLES</span>
        </div>

        {/* Instant Role Access for Development & Testing */}
        <div className="demo-roles-grid">
          <button
            type="button"
            onClick={() => handleQuickDemo('CUSTOMER', '/dashboard')}
            className="demo-role-card role-c"
          >
            <User size={16} />
            <div>
              <strong>Customer</strong>
              <small>Alex Johnson</small>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleQuickDemo('STAFF', '/staff')}
            className="demo-role-card role-s"
          >
            <Sparkles size={16} />
            <div>
              <strong>Staff / Stylist</strong>
              <small>Sarah Jenkins</small>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleQuickDemo('ADMIN', '/admin')}
            className="demo-role-card role-a"
          >
            <Shield size={16} />
            <div>
              <strong>Administrator</strong>
              <small>Elena Vance</small>
            </div>
          </button>
        </div>

        <div className="auth-footer">
          <span>Don't have an account? </span>
          <Link to="/register">Create one</Link>
        </div>
      </div>
    </div>
  );
}
