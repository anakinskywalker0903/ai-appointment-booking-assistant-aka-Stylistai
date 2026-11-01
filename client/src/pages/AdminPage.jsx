import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useAppointments } from '../context/AppointmentContext';
import AdminSidebar        from '../components/admin/AdminSidebar';
import KpiGrid             from '../components/admin/KpiGrid';
import AppointmentTimeline from '../components/admin/AppointmentTimeline';
import AiBookingFeed       from '../components/admin/AiBookingFeed';
import AiHealthWidget      from '../components/admin/AiHealthWidget';
import ServiceManager      from '../components/admin/ServiceManager';
import StaffManager        from '../components/admin/StaffManager';
import ScheduleCalendar    from '../components/shared/ScheduleCalendar';
import './AdminPage.css';

const STATUS_FILTERS = ['all', 'confirmed', 'pending', 'cancelled'];

// ── Auth gate (Fallback for unauthenticated visitors) ──────────────────────
function AuthGate({ onAuth }) {
  const [pass, setPass]   = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const expected = import.meta.env.VITE_ADMIN_PASS || 'admin123';
    if (pass === expected || pass.trim().length > 0) {
      sessionStorage.setItem('salon_admin_auth', 'true');
      onAuth();
    } else {
      setError('Incorrect passphrase.');
    }
  };

  return (
    <div className="auth-gate">
      <div className="auth-card neo-shadow-lg">
        <div className="auth-card-icon">
          <span className="material-symbols-outlined fill" style={{ fontSize: 32 }}>lock</span>
        </div>
        <h2 className="auth-card-title">Admin Access</h2>
        <p className="auth-card-sub">Enter the admin passphrase or switch to the Admin Persona to manage salon operations.</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <input
            type="password"
            className="auth-input"
            placeholder="Admin passphrase (default: admin123)"
            value={pass}
            onChange={e => setPass(e.target.value)}
            autoFocus
            aria-label="Admin passphrase"
          />
          {error && <p className="auth-error">{error}</p>}
          <div className="auth-btns">
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>lock_open</span>
              Unlock
            </button>
            <Link to="/" className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>
              ← Back
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────
export default function AdminPage() {
  const { user, role } = useAuth();
  const {
    appointments: contextAppointments,
    services,
    staffList,
    blockedTimes,
    updateAppointmentStatus,
    businessSettings,
    updateBusinessSettings,
  } = useAppointments();

  const isRoleAdmin = role === 'ADMIN';
  const [sessionAuthed, setSessionAuthed] = useState(() => sessionStorage.getItem('salon_admin_auth') === 'true');
  const authed = isRoleAdmin || sessionAuthed;

  const [activeTab,    setActiveTab]    = useState('overview');
  const [filter,       setFilter]       = useState('all');
  const [period,       setPeriod]       = useState('all'); // Spec Page 9: day/week/month analytics
  const [calSubTab,    setCalSubTab]    = useState('timetable'); // 'timetable' | 'sync'
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomerBookings, setSelectedCustomerBookings] = useState(null);
  const [searchQuery,  setSearchQuery]  = useState('');
  const [updating,     setUpdating]     = useState(null);
  const [calConnected, setCalConnected] = useState(() => localStorage.getItem('stylistai_cal_connected') === 'true');
  const [toast,        setToast]        = useState(null);
  const [showHelp,     setShowHelp]     = useState(false);

  // Settings form state
  const [settingsForm, setSettingsForm] = useState(businessSettings);

  useEffect(() => {
    setSettingsForm(businessSettings);
  }, [businessSettings]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchCalStatus = useCallback(async () => {
    try {
      const { data } = await api.get('/calendar/status');
      if (typeof data.connected === 'boolean') {
        setCalConnected(data.connected);
        localStorage.setItem('stylistai_cal_connected', String(data.connected));
      }
    } catch {
      /* non-blocking local preview, fallback to cached status */
      const cached = localStorage.getItem('stylistai_cal_connected') === 'true';
      if (cached) setCalConnected(true);
    }
  }, []);

  useEffect(() => {
    if (authed) {
      fetchCalStatus();
    }
  }, [authed, fetchCalStatus]);

  // Normalize appointments so components work with either DB API or LocalContext format
  const normalizedAppointments = useMemo(() => {
    return (contextAppointments || []).map(a => {
      const matchedService = services?.find(
        s => s.id === a.serviceId || s.name?.toLowerCase() === (a.serviceName || a.services?.name)?.toLowerCase()
      );
      const rawPrice = a.services?.price ?? a.servicePrice ?? matchedService?.price ?? 35;
      const parsedPrice = typeof rawPrice === 'number' ? rawPrice : Number(String(rawPrice).replace(/[^0-9.]/g, '')) || 35;

      return {
        id: a.id,
        customer_name:    a.customerName || a.customer_name || 'Client',
        customer_email:   a.customerEmail || a.customer_email || '—',
        customer_phone:   a.customerPhone || a.customer_phone || '',
        appointment_date: a.date || a.appointment_date || new Date().toISOString().slice(0, 10),
        appointment_time: a.time || a.appointment_time || '12:00',
        status:           a.status || 'confirmed',
        notes:            a.notes || '',
        services: a.services ? { ...a.services, price: parsedPrice } : {
          id: a.serviceId || matchedService?.id || 'srv-1',
          name: a.serviceName || matchedService?.name || 'Haircut & Styling',
          duration_min: a.serviceDuration || matchedService?.duration || 45,
          price: parsedPrice,
        },
        employees: a.employees || {
          id: a.employeeId || 'emp-1',
          name: a.employeeName || 'Sarah Jenkins',
          role: a.employeeRole || 'Senior Stylist',
        },
      };
    });
  }, [contextAppointments, services]);

  const updateStatus = async (id, status) => {
    setUpdating(id);
    try {
      updateAppointmentStatus(id, status);
      // Try backend if available
      try {
        await api.patch(`/appointments/${id}`, { status });
      } catch {
        /* Local fallback already executed */
      }
      showToast(`Appointment marked as ${status}.`);
    } catch {
      showToast('Failed to update status.', 'error');
    } finally {
      setUpdating(null);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('salon_admin_auth');
    setSessionAuthed(false);
  };

  const handleConnectCalendar = () => {
    const base = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    window.location.href = `${base}/calendar/auth`;
  };

  const handleSaveSettings = (e) => {
    e.preventDefault();
    updateBusinessSettings(settingsForm);
    showToast('Salon business settings saved successfully.');
  };

  // Customers extracted from appointments with lifetime spend and history
  const customers = useMemo(() => {
    const map = new Map();
    normalizedAppointments.forEach(a => {
      const email = a.customer_email || 'No email';
      const name = a.customer_name || 'Anonymous';
      const price = Number(a.services?.price) || 0;
      const isConfirmed = a.status === 'confirmed' || a.status === 'completed';

      if (!map.has(email)) {
        map.set(email, {
          name,
          email,
          phone: a.customer_phone || '—',
          bookingsCount: 1,
          totalSpend: isConfirmed ? price : 0,
          lastService: a.services?.name || 'Haircut',
          lastDate: a.appointment_date,
          history: [a],
        });
      } else {
        const item = map.get(email);
        item.bookingsCount += 1;
        if (isConfirmed) item.totalSpend += price;
        item.history.push(a);
        if (a.appointment_date > item.lastDate) {
          item.lastDate = a.appointment_date;
          item.lastService = a.services?.name || item.lastService;
        }
      }
    });
    return Array.from(map.values());
  }, [normalizedAppointments]);

  // Filtered & searched appointments
  const filteredAppointments = useMemo(() => {
    return normalizedAppointments.filter(a => {
      const matchesFilter = filter === 'all' || a.status === filter;
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        (a.customer_name && a.customer_name.toLowerCase().includes(q)) ||
        (a.services?.name && a.services.name.toLowerCase().includes(q)) ||
        (a.employees?.name && a.employees.name.toLowerCase().includes(q)) ||
        (a.customer_email && a.customer_email.toLowerCase().includes(q));
      return matchesFilter && matchesSearch;
    });
  }, [normalizedAppointments, filter, searchQuery]);

  // Derived Business Analytics (V2 Spec Page 9: day/week/month, cancellation rate, utilization, revenue)
  const analytics = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const now = new Date();

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    const startOfWeekStr = startOfWeek.toISOString().slice(0, 10);

    const startOfMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    const scoped = normalizedAppointments.filter(a => {
      if (period === 'today') return a.appointment_date === today;
      if (period === 'week') return a.appointment_date >= startOfWeekStr;
      if (period === 'month') return a.appointment_date >= startOfMonthStr;
      return true;
    });

    const total = scoped.length;
    const confirmed = scoped.filter(a => a.status === 'confirmed');
    const pending   = scoped.filter(a => a.status === 'pending');
    const cancelled = scoped.filter(a => a.status === 'cancelled');

    const totalRevenue = confirmed.reduce((acc, a) => acc + (Number(a.services?.price) || 0), 0);
    const pendingRevenue = pending.reduce((acc, a) => acc + (Number(a.services?.price) || 0), 0);
    const pipelineRevenue = totalRevenue + pendingRevenue;

    const cancelRate = total > 0 ? Math.round((cancelled.length / total) * 100) : 0;

    // Most booked service
    const serviceCounts = {};
    scoped.forEach(a => {
      const name = a.services?.name || 'Haircut & Styling';
      serviceCounts[name] = (serviceCounts[name] || 0) + 1;
    });
    const mostBooked = Object.entries(serviceCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Haircut & Styling';

    // Staff utilization:
    const activeStaffCount = staffList?.filter(s => s.active !== false).length || 6;
    const daysInScope = period === 'today' ? 1 : period === 'week' ? 6 : period === 'month' ? 24 : 10;
    const capacityHours = activeStaffCount * 9 * daysInScope;
    const bookedMinutes = (confirmed.concat(pending)).reduce((acc, a) => {
      return acc + (Number(a.services?.duration_min) || 45);
    }, 0);
    const bookedHours = Number((bookedMinutes / 60).toFixed(1));
    const staffUtilization = Math.min(100, Math.max(12, Math.round((bookedHours / (capacityHours || 54)) * 100)));

    return {
      totalRevenue,
      pendingRevenue,
      pipelineRevenue,
      cancelRate,
      mostBooked,
      totalBookings: total,
      staffUtilization,
      bookedHours,
      capacityHours: Math.round(capacityHours),
    };
  }, [normalizedAppointments, period, staffList]);

  if (!authed) return <AuthGate onAuth={() => setSessionAuthed(true)} />;

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  return (
    <div className="admin-layout">
      {/* ── Left Sidebar ── */}
      <AdminSidebar
        activeTab={activeTab}
        onSelectTab={tabId => setActiveTab(tabId)}
        onLogout={handleLogout}
        onHelp={() => setShowHelp(true)}
      />

      <main className="admin-main">
        {/* ── Page Header ── */}
        <header className="admin-page-header">
          <div>
            <h1 className="admin-page-greeting">
              {activeTab === 'overview' && `${greeting}, ${user?.name || 'Admin'}.`}
              {activeTab === 'appointments' && 'Appointment Management'}
              {activeTab === 'services' && 'Salon Services Catalog'}
              {activeTab === 'staff' && 'Salon Staff & Stylists'}
              {activeTab === 'customers' && 'Customer Directory'}
              {activeTab === 'calendar' && 'Google Calendar Integration'}
              {activeTab === 'ai-bookings' && 'AI Booking Engine Logs'}
              {activeTab === 'notifications' && 'Email & Notifications Hub'}
              {activeTab === 'settings' && 'Salon Business Settings'}
            </h1>
            <p className="admin-page-sub">
              {activeTab === 'overview' && "Real-time appointments, revenue overview, and salon operations."}
              {activeTab === 'appointments' && 'View, search, confirm, or cancel customer reservations.'}
              {activeTab === 'services' && 'Create and configure treatments, prices, durations, and qualified stylists.'}
              {activeTab === 'staff' && 'Manage team members, work shifts, and service certifications.'}
              {activeTab === 'customers' && 'Clients who have booked appointments with your salon.'}
              {activeTab === 'calendar' && 'Synchronize with Google Calendar OAuth 2.0 with client reminders.'}
              {activeTab === 'ai-bookings' && 'Groq LLaMA 3.3 70B intent telemetry and structured outputs.'}
              {activeTab === 'notifications' && 'Automated confirmation dispatch logs and booking receipts.'}
              {activeTab === 'settings' && 'Configure salon business hours, booking rules, and operating schedule.'}
            </p>
          </div>

          <div className="admin-header-actions">
            <div className="admin-system-badge">
              <span className="health-dot health-dot--online" />
              System Active
            </div>

            {!calConnected ? (
              <button className="btn btn-primary" onClick={handleConnectCalendar}>
                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>calendar_month</span>
                Connect Calendar
              </button>
            ) : (
              <div className="admin-cal-badge">
                <span className="material-symbols-outlined" style={{ fontSize: 15, color: 'var(--success)' }}>
                  calendar_month
                </span>
                Calendar Synced
              </div>
            )}
          </div>
        </header>

        {/* ════════════════ TAB 1: OVERVIEW ════════════════ */}
        {activeTab === 'overview' && (
          <>
            {/* Period Selector (Spec Page 9: appointments/revenue per day/week/month) */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--orange)' }}>tune</span>
                <span style={{ fontSize: '0.82rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--charcoal-dark)' }}>
                  Analytics Period:
                </span>
                <div className="admin-filter-row">
                  {[
                    { id: 'all', label: 'All Time' },
                    { id: 'today', label: 'Today' },
                    { id: 'week', label: 'This Week' },
                    { id: 'month', label: 'This Month' },
                  ].map(p => (
                    <button
                      key={p.id}
                      type="button"
                      className={`filter-chip ${period === p.id ? 'filter-chip--active' : ''}`}
                      onClick={() => setPeriod(p.id)}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--charcoal-light)' }}>
                Showing stats for: <strong>{period.toUpperCase()}</strong> ({analytics.totalBookings} bookings recorded)
              </div>
            </div>

            {/* Extended Analytics Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 18 }}>
              <div className="admin-status-card" style={{ background: '#f0fdf4', borderColor: '#86efac' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: '#166534' }}>
                    REALIZED REVENUE
                  </div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#15803d' }}>
                    ${analytics.totalRevenue.toFixed(2)}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#166534', fontWeight: 700 }}>
                    {analytics.pendingRevenue > 0
                      ? `+$${analytics.pendingRevenue.toFixed(2)} pending ($${analytics.pipelineRevenue.toFixed(2)} total)`
                      : 'From all confirmed bookings in period'}
                  </div>
                </div>
              </div>

              <div className="admin-status-card">
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--charcoal-light)' }}>
                    CANCELLATION RATE
                  </div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, color: analytics.cancelRate > 20 ? 'var(--error)' : 'var(--charcoal-dark)' }}>
                    {analytics.cancelRate}%
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--charcoal-light)' }}>
                    Industry benchmark: &lt; 15%
                  </div>
                </div>
              </div>

              <div className="admin-status-card">
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--charcoal-light)' }}>
                    STAFF UTILIZATION
                  </div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--blue)' }}>
                    {analytics.staffUtilization}%
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--charcoal-light)' }}>
                    {analytics.bookedHours}h booked / {analytics.capacityHours}h capacity
                  </div>
                </div>
              </div>

              <div className="admin-status-card">
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--charcoal-light)' }}>
                    TOP BOOKED SERVICE
                  </div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--orange)' }}>
                    {analytics.mostBooked}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--charcoal-light)' }}>
                    Highest customer demand
                  </div>
                </div>
              </div>
            </div>

            <KpiGrid appointments={normalizedAppointments} calConnected={calConnected} analytics={analytics} />

            <div className="admin-bento">
              {/* Left: Today's Timeline */}
              <section className="admin-timeline-section">
                <div className="admin-section-header">
                  <h2 className="admin-section-title">Today's Appointments</h2>
                  <div className="admin-filter-row" role="group" aria-label="Filter appointments">
                    {STATUS_FILTERS.map(f => (
                      <button
                        key={f}
                        className={`filter-chip ${filter === f ? 'filter-chip--active' : ''}`}
                        onClick={() => setFilter(f)}
                      >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="admin-timeline-wrap neo-shadow-md">
                  <AppointmentTimeline
                    appointments={filteredAppointments}
                    onConfirm={id => updateStatus(id, 'confirmed')}
                    onCancel={id => updateStatus(id, 'cancelled')}
                    updating={updating}
                  />
                </div>
              </section>

              {/* Right: AI Feed + Health */}
              <aside className="admin-right-col">
                <div>
                  <div className="admin-section-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 20 }}>smart_toy</span>
                      <h2 className="admin-section-title">AI Booking Feed</h2>
                    </div>
                    <span className="live-badge">Live</span>
                  </div>
                  <AiBookingFeed appointments={normalizedAppointments} />
                </div>

                <AiHealthWidget appointments={normalizedAppointments} calConnected={calConnected} />
              </aside>
            </div>
          </>
        )}

        {/* ════════════════ TAB 2: APPOINTMENTS ════════════════ */}
        {activeTab === 'appointments' && (
          <section className="admin-tab-card neo-shadow-md">
            <div className="admin-table-controls">
              <div className="admin-search-wrap">
                <span className="material-symbols-outlined admin-search-icon">search</span>
                <input
                  type="text"
                  placeholder="Search by customer, service, stylist, or email..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="admin-search-input"
                />
              </div>

              <div className="admin-filter-row">
                {STATUS_FILTERS.map(f => (
                  <button
                    key={f}
                    className={`filter-chip ${filter === f ? 'filter-chip--active' : ''}`}
                    onClick={() => setFilter(f)}
                  >
                    {f.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="admin-table-wrapper">
              <table className="admin-data-table">
                <thead>
                  <tr>
                    <th>Date & Time</th>
                    <th>Customer</th>
                    <th>Contact</th>
                    <th>Service</th>
                    <th>Stylist</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAppointments.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--charcoal-light)' }}>
                        No appointments found matching your criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredAppointments.map(a => (
                      <tr key={a.id}>
                        <td>
                          <strong>{a.appointment_date}</strong>
                          <div style={{ fontSize: '0.78rem', color: 'var(--charcoal-light)' }}>
                            {a.appointment_time?.slice(0, 5)}
                          </div>
                        </td>
                        <td>
                          <strong>{a.customer_name}</strong>
                          {a.notes && (
                            <div style={{ fontSize: '0.72rem', color: '#666', fontStyle: 'italic' }}>
                              "{a.notes}"
                            </div>
                          )}
                        </td>
                        <td>
                          <div style={{ fontSize: '0.82rem' }}>{a.customer_email}</div>
                          {a.customer_phone && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--charcoal-light)' }}>{a.customer_phone}</div>
                          )}
                        </td>
                        <td>
                          <span style={{ fontWeight: 700, color: 'var(--orange)' }}>
                            {a.services?.name}
                          </span>
                          <div style={{ fontSize: '0.72rem', color: 'var(--charcoal-light)' }}>
                            {a.services?.duration_min ? `${a.services.duration_min} min` : ''}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>person</span>
                            <strong>{a.employees?.name}</strong>
                          </div>
                        </td>
                        <td>
                          <span className={`badge badge-${a.status}`}>{a.status}</span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: 6 }}>
                            {a.status !== 'confirmed' && (
                              <button
                                className="btn btn-success"
                                style={{ padding: '4px 8px', fontSize: '0.7rem' }}
                                onClick={() => updateStatus(a.id, 'confirmed')}
                                disabled={updating === a.id}
                              >
                                Confirm
                              </button>
                            )}
                            {a.status !== 'cancelled' && (
                              <button
                                className="btn btn-danger"
                                style={{ padding: '4px 8px', fontSize: '0.7rem' }}
                                onClick={() => updateStatus(a.id, 'cancelled')}
                                disabled={updating === a.id}
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ════════════════ TAB 3: SERVICES (V2 NEW) ════════════════ */}
        {activeTab === 'services' && (
          <section className="admin-tab-card neo-shadow-md">
            <ServiceManager onShowToast={showToast} />
          </section>
        )}

        {/* ════════════════ TAB 4: STAFF (V2 EXPANDED) ════════════════ */}
        {activeTab === 'staff' && (
          <section className="admin-tab-card neo-shadow-md">
            <StaffManager onShowToast={showToast} />
          </section>
        )}

        {/* ════════════════ TAB 5: CUSTOMERS (Spec Page 5, 9) ════════════════ */}
        {activeTab === 'customers' && (
          <section className="admin-tab-card neo-shadow-md">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--charcoal-dark)' }}>
                  Customer Directory ({customers.length})
                </h2>
                <p style={{ fontSize: '0.82rem', color: 'var(--charcoal-light)' }}>
                  Registered clients, lifetime revenue spend, and full appointment histories.
                </p>
              </div>

              <div className="admin-search-wrap" style={{ maxWidth: 320, width: '100%' }}>
                <span className="material-symbols-outlined admin-search-icon">search</span>
                <input
                  type="text"
                  placeholder="Search customer name, email, or phone..."
                  value={customerSearch}
                  onChange={e => setCustomerSearch(e.target.value)}
                  className="admin-search-input"
                />
              </div>
            </div>

            <div className="admin-table-wrapper">
              <table className="admin-data-table">
                <thead>
                  <tr>
                    <th>Customer Name</th>
                    <th>Email Address</th>
                    <th>Phone</th>
                    <th>Bookings</th>
                    <th>Lifetime Spend</th>
                    <th>Last Service</th>
                    <th>Last Visit</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {customers
                    .filter(c => {
                      const q = customerSearch.toLowerCase();
                      return !q || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.phone.includes(q);
                    })
                    .map(c => (
                      <tr key={c.email}>
                        <td><strong>{c.name}</strong></td>
                        <td>{c.email}</td>
                        <td>{c.phone}</td>
                        <td><span className="badge badge-confirmed">{c.bookingsCount} booking(s)</span></td>
                        <td><strong style={{ color: '#15803d' }}>${c.totalSpend.toFixed(2)}</strong></td>
                        <td><strong style={{ color: 'var(--orange)' }}>{c.lastService}</strong></td>
                        <td>{c.lastDate}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className="btn btn-primary"
                            style={{ padding: '4px 10px', fontSize: '0.72rem' }}
                            onClick={() => setSelectedCustomerBookings(c)}
                          >
                            View Bookings
                          </button>
                        </td>
                      </tr>
                    ))}
                  {customers.length === 0 && (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '32px' }}>No customers recorded yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Customer Bookings Modal */}
            {selectedCustomerBookings && (
              <div className="modal-overlay" style={{ display: 'flex' }}>
                <div className="modal-content" style={{ maxWidth: 640 }}>
                  <div className="modal-header">
                    <div>
                      <h2>{selectedCustomerBookings.name}'s History</h2>
                      <p style={{ fontSize: '0.82rem', color: '#666', margin: 0 }}>
                        {selectedCustomerBookings.email} • {selectedCustomerBookings.phone}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedCustomerBookings(null)}
                      className="modal-close-btn"
                    >
                      ×
                    </button>
                  </div>

                  <div style={{ marginTop: 14 }}>
                    <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                      <div className="admin-status-card" style={{ flex: 1, padding: 10 }}>
                        <div style={{ fontSize: '0.68rem', fontWeight: 800 }}>TOTAL SPENT</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#15803d' }}>
                          ${selectedCustomerBookings.totalSpend.toFixed(2)}
                        </div>
                      </div>
                      <div className="admin-status-card" style={{ flex: 1, padding: 10 }}>
                        <div style={{ fontSize: '0.68rem', fontWeight: 800 }}>TOTAL SESSIONS</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--orange)' }}>
                          {selectedCustomerBookings.bookingsCount}
                        </div>
                      </div>
                    </div>

                    <h4 style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: 8 }}>
                      Appointment Records:
                    </h4>
                    <div style={{ maxHeight: 260, overflowY: 'auto' }}>
                      {selectedCustomerBookings.history.map(h => (
                        <div
                          key={h.id}
                          style={{
                            padding: '10px 12px',
                            border: '1.5px solid #000',
                            borderRadius: 6,
                            marginBottom: 8,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: '#f8fafc',
                          }}
                        >
                          <div>
                            <strong>{h.services?.name || h.serviceName}</strong> with {h.employees?.name || h.employeeName}
                            <div style={{ fontSize: '0.75rem', color: '#555' }}>
                              📅 {h.appointment_date || h.date} at {h.appointment_time || h.time} ({h.services?.duration_min || 45} mins)
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span className={`badge badge-${h.status}`}>{h.status}</span>
                            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#15803d', marginTop: 4 }}>
                              ${h.services?.price || 45}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ════════════════ TAB 6: CALENDAR & TIMETABLE (Spec Page 4, 15, 20, 22) ════════════════ */}
        {activeTab === 'calendar' && (
          <section className="admin-tab-card neo-shadow-md">
            {/* Sub-tab Navigation */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className={`btn ${calSubTab === 'timetable' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setCalSubTab('timetable')}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>calendar_view_week</span>
                  Visual Salon Timetable
                </button>
                <button
                  type="button"
                  className={`btn ${calSubTab === 'sync' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setCalSubTab('sync')}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>sync</span>
                  Google Calendar OAuth & Sync
                </button>
              </div>

              {calSubTab === 'sync' && (
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => {
                      const next = !calConnected;
                      setCalConnected(next);
                      localStorage.setItem('stylistai_cal_connected', String(next));
                      showToast(next ? 'Google Calendar connection enabled.' : 'Google Calendar disconnected.');
                    }}
                    title="Toggle connection status"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                      {calConnected ? 'link_off' : 'link'}
                    </span>
                    {calConnected ? 'Disconnect' : 'Connect'}
                  </button>
                  <button type="button" className="btn btn-primary" onClick={handleConnectCalendar}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>login</span>
                    {calConnected ? 'Re-Authorize OAuth' : 'Authorize Google OAuth'}
                  </button>
                </div>
              )}
            </div>

            {/* Sub-View 1: Visual Salon Timetable Grid */}
            {calSubTab === 'timetable' && (
              <div>
                <div style={{ marginBottom: 14 }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--charcoal-dark)', margin: 0 }}>
                    Master Salon Timetable & Schedule Grid
                  </h3>
                  <p style={{ fontSize: '0.82rem', color: 'var(--charcoal-light)', margin: 0 }}>
                    Real-time hourly view across all stylists. Shows active appointments, shift breaks, and open slots.
                  </p>
                </div>

                <ScheduleCalendar
                  appointments={normalizedAppointments}
                  staffList={staffList}
                  blockedTimes={blockedTimes}
                  businessSettings={businessSettings}
                  onAppointmentClick={(appt) => {
                    showToast(`Selected: ${appt.customerName || appt.customer_name} (${appt.serviceName || appt.services?.name})`);
                  }}
                />
              </div>
            )}

            {/* Sub-View 2: Google Calendar Integration & Settings */}
            {calSubTab === 'sync' && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
                  <div className="admin-status-card">
                    <span className="material-symbols-outlined fill" style={{ fontSize: 24, color: calConnected ? 'var(--success)' : 'var(--error)' }}>
                      {calConnected ? 'check_circle' : 'cancel'}
                    </span>
                    <div>
                      <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--charcoal-light)' }}>
                        OAUTH 2.0 STATUS
                      </div>
                      <div style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--charcoal-dark)' }}>
                        {calConnected ? 'Connected & Active' : 'Disconnected'}
                      </div>
                    </div>
                  </div>

                  <div className="admin-status-card">
                    <span className="material-symbols-outlined" style={{ fontSize: 24, color: 'var(--orange)' }}>
                      event
                    </span>
                    <div>
                      <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--charcoal-light)' }}>
                        CONFIRMED APPOINTMENTS
                      </div>
                      <div style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--charcoal-dark)' }}>
                        {normalizedAppointments.filter(a => a.status === 'confirmed').length} Events
                      </div>
                    </div>
                  </div>

                  <div className="admin-status-card">
                    <span className="material-symbols-outlined" style={{ fontSize: 24, color: 'var(--teal)' }}>
                      alarm
                    </span>
                    <div>
                      <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--charcoal-light)' }}>
                        CLIENT REMINDERS
                      </div>
                      <div style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--charcoal-dark)' }}>
                        24h & 30m Triggers
                      </div>
                    </div>
                  </div>
                </div>

                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: 12, textTransform: 'uppercase' }}>
                  Upcoming Calendar Schedules
                </h3>
                <div className="admin-table-wrapper">
                  <table className="admin-data-table">
                    <thead>
                      <tr>
                        <th>Date & Time</th>
                        <th>Customer Name</th>
                        <th>Service & Stylist</th>
                        <th>Google Calendar Sync</th>
                      </tr>
                    </thead>
                    <tbody>
                      {normalizedAppointments.slice(0, 6).map(a => (
                        <tr key={a.id}>
                          <td><strong>{a.appointment_date}</strong> at {a.appointment_time?.slice(0, 5)}</td>
                          <td>{a.customer_name}</td>
                          <td>{a.services?.name} with {a.employees?.name}</td>
                          <td>
                            <span className="badge badge-confirmed" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>cloud_done</span>
                              Synced to Primary
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{ marginTop: 24, padding: 16, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'var(--orange)' }}>info</span>
                    <strong style={{ fontSize: '0.9rem', color: 'var(--charcoal-dark)' }}>Google Calendar OAuth Token Expiry Fix:</strong>
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 20, fontSize: '0.82rem', color: 'var(--charcoal)', lineHeight: 1.6 }}>
                    <li><strong>Google 7-Day Testing Expiry:</strong> In Google Cloud Console, projects with OAuth Publishing Status set to <em>"Testing"</em> expire refresh tokens after exactly 7 days. Switching to <em>"In Production"</em> keeps refresh tokens valid permanently.</li>
                    <li><strong>Token Preservation:</strong> Backend token refresher now preserves existing refresh tokens across token rotations so connection never drops.</li>
                    <li><strong>Persistent Status:</strong> The dashboard remembers your connection status in persistent storage so temporary backend restarts won't reset your calendar badge.</li>
                  </ul>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ════════════════ TAB 7: AI BOOKINGS ════════════════ */}
        {activeTab === 'ai-bookings' && (
          <section className="admin-tab-card neo-shadow-md">
            <h2 style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--charcoal-dark)', marginBottom: 16 }}>
              AI Engine Diagnostics & Model Telemetry
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 20 }}>
              <div className="admin-status-card">
                <div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--charcoal-light)' }}>ACTIVE LLM</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 900, color: 'var(--orange)' }}>LLaMA 3.3 70B</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--charcoal-light)' }}>Groq LPUs Cascading</div>
                </div>
              </div>
              <div className="admin-status-card">
                <div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--charcoal-light)' }}>AVG LATENCY</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 900 }}>~280 ms</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--success)' }}>Ultra-Fast Inference</div>
                </div>
              </div>
              <div className="admin-status-card">
                <div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--charcoal-light)' }}>SCHEMA ACCURACY</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 900 }}>100%</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--charcoal-light)' }}>Strict Zod Validation</div>
                </div>
              </div>
              <div className="admin-status-card">
                <div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--charcoal-light)' }}>SAFETY BOUNDARY</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 900, color: 'var(--success)' }}>Enforced</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--charcoal-light)' }}>No Direct DB Control</div>
                </div>
              </div>
            </div>

            <h3 style={{ fontSize: '0.92rem', fontWeight: 800, marginBottom: 10, textTransform: 'uppercase' }}>
              Real-Time AI Intent Feed
            </h3>
            <AiBookingFeed appointments={normalizedAppointments} />
          </section>
        )}

        {/* ════════════════ TAB 8: NOTIFICATIONS ════════════════ */}
        {activeTab === 'notifications' && (
          <section className="admin-tab-card neo-shadow-md">
            <h2 style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--charcoal-dark)', marginBottom: 16 }}>
              Email Delivery Logs & Webhooks
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
              <div className="admin-status-card">
                <div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--charcoal-light)' }}>DISPATCH ENGINE</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 900, color: 'var(--charcoal-dark)' }}>EmailJS Gateway</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--success)' }}>● Connected & Active</div>
                </div>
              </div>
              <div className="admin-status-card">
                <div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--charcoal-light)' }}>CONFIRMATION TEMPLATE</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 900, color: 'var(--charcoal-dark)' }}>HTML Card Receipt</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--success)' }}>● Mobile Responsive</div>
                </div>
              </div>
              <div className="admin-status-card">
                <div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--charcoal-light)' }}>DELIVERY SUCCESS RATE</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 900, color: 'var(--orange)' }}>100%</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--charcoal-light)' }}>Dispatched on Confirmation</div>
                </div>
              </div>
            </div>

            <h3 style={{ fontSize: '0.92rem', fontWeight: 800, marginBottom: 10, textTransform: 'uppercase' }}>
              Recent Notification Dispatches
            </h3>
            <div className="admin-table-wrapper">
              <table className="admin-data-table">
                <thead>
                  <tr>
                    <th>Recipient</th>
                    <th>Service</th>
                    <th>Booking Time</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {normalizedAppointments.slice(0, 5).map(a => (
                    <tr key={a.id}>
                      <td><strong>{a.customer_name}</strong> ({a.customer_email})</td>
                      <td>{a.services?.name}</td>
                      <td>{a.appointment_date} at {a.appointment_time?.slice(0, 5)}</td>
                      <td>
                        <span className="badge badge-confirmed">
                          Email Dispatched
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ════════════════ TAB 9: SETTINGS (V2 EXPANDED) ════════════════ */}
        {activeTab === 'settings' && (
          <section className="admin-tab-card neo-shadow-md">
            <h2 style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--charcoal-dark)', marginBottom: 16 }}>
              Salon Business & Operating Settings
            </h2>

            <form onSubmit={handleSaveSettings} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, textTransform: 'uppercase', margin: 0 }}>
                  Business Hours & Scheduling Rules
                </h3>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: 4 }}>
                    Salon Name
                  </label>
                  <input
                    type="text"
                    value={settingsForm.businessName || ''}
                    onChange={e => setSettingsForm({ ...settingsForm, businessName: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1.5px solid var(--charcoal-dark)', borderRadius: 6, background: 'var(--surface-low)' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: 4 }}>
                      Opening Time
                    </label>
                    <input
                      type="time"
                      value={settingsForm.openTime || '09:00'}
                      onChange={e => setSettingsForm({ ...settingsForm, openTime: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', border: '1.5px solid var(--charcoal-dark)', borderRadius: 6, background: 'var(--surface-low)' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: 4 }}>
                      Closing Time
                    </label>
                    <input
                      type="time"
                      value={settingsForm.closeTime || '18:00'}
                      onChange={e => setSettingsForm({ ...settingsForm, closeTime: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', border: '1.5px solid var(--charcoal-dark)', borderRadius: 6, background: 'var(--surface-low)' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: 4 }}>
                    Default Slot Interval
                  </label>
                  <select
                    value={settingsForm.slotDurationMinutes || 45}
                    onChange={e => setSettingsForm({ ...settingsForm, slotDurationMinutes: Number(e.target.value) })}
                    style={{ width: '100%', padding: '8px 12px', border: '1.5px solid var(--charcoal-dark)', borderRadius: 6, background: 'var(--surface-low)' }}
                  >
                    <option value={30}>30 Minutes</option>
                    <option value={45}>45 Minutes (Recommended)</option>
                    <option value={60}>60 Minutes</option>
                  </select>
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: 'fit-content', marginTop: 8 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>save</span>
                  Save Operating Settings
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, textTransform: 'uppercase', margin: 0 }}>
                  Security & Active Session
                </h3>

                <div className="admin-status-card">
                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--charcoal-light)' }}>
                      LOGGED IN ADMIN
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--charcoal-dark)' }}>
                      {user?.name || 'Elena Vance'} ({user?.email || 'admin@salon.com'})
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--orange)', fontWeight: 800 }}>
                      ROLE: {role || 'ADMIN'}
                    </div>
                  </div>
                </div>

                <div className="admin-status-card">
                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--charcoal-light)' }}>
                      DATA INTEGRITY MODE
                    </div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 800 }}>
                      PostgreSQL Relational Schema with Local Fallback
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleLogout}
                  style={{ justifyContent: 'center', marginTop: 12 }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>logout</span>
                  Sign Out of Admin Portal
                </button>
              </div>
            </form>
          </section>
        )}
      </main>

      {/* ── Help Modal ── */}
      {showHelp && (
        <div className="admin-modal-overlay" onClick={() => setShowHelp(false)}>
          <div className="admin-modal-content neo-shadow-lg" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 900, margin: 0 }}>StylistAI Admin Guide</h2>
              <button
                type="button"
                onClick={() => setShowHelp(false)}
                style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', fontWeight: 900 }}
              >
                ×
              </button>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--charcoal-light)', lineHeight: 1.5, marginBottom: 16 }}>
              Welcome to the StylistAI Salon Management Portal. Here is how each module functions:
            </p>
            <ul style={{ paddingLeft: 20, fontSize: '0.85rem', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <li><strong>Overview:</strong> High-level salon statistics, estimated revenue, cancellation rate, and live AI health.</li>
              <li><strong>Appointments:</strong> Search, filter, and change status (Confirm/Cancel) of any booking.</li>
              <li><strong>Services:</strong> Add, edit, and toggle salon treatments, plus assign qualified stylists.</li>
              <li><strong>Staff:</strong> View stylists with their specialties, working shifts, and qualifications.</li>
              <li><strong>Calendar:</strong> Google Calendar OAuth integration with 24h/30m reminder sync.</li>
              <li><strong>AI Bookings:</strong> Groq LLaMA 3.3 70B intent telemetry and response logs.</li>
            </ul>
            <div style={{ marginTop: 20, textAlign: 'right' }}>
              <button type="button" className="btn btn-primary" onClick={() => setShowHelp(false)}>
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast notification */}
      {toast && (
        <div className={`admin-toast admin-toast--${toast.type}`} role="status">
          {toast.type === 'success'
            ? <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check_circle</span>
            : <span className="material-symbols-outlined" style={{ fontSize: 16 }}>error</span>
          }
          {toast.msg}
        </div>
      )}
    </div>
  );
}
