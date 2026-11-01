import React from 'react';

/**
 * 4-card KPI stat grid (Spec Page 9)
 * appointments: normalized appointments array
 * calConnected: boolean
 * analytics: calculated business analytics
 */
export default function KpiGrid({ appointments = [], calConnected = false, analytics = {} }) {
  const today = new Date().toISOString().slice(0, 10);

  const todayCount = appointments.filter(a => a.appointment_date === today).length;
  const confirmedToday = appointments.filter(a => a.appointment_date === today && a.status === 'confirmed');

  const activeStylists = [...new Set(
    appointments.filter(a => a.status !== 'cancelled')
      .map(a => a.employees?.id || a.employees?.name).filter(Boolean)
  )].length || 6;

  const totalRevenue = analytics.totalRevenue ?? 0;
  const pendingRevenue = analytics.pendingRevenue ?? 0;
  const utilization = analytics.staffUtilization ?? 65;

  const cards = [
    {
      label: "Today's Bookings",
      value: todayCount || '0',
      icon: 'event_note',
      iconBg: 'var(--orange)',
      sub: confirmedToday.length > 0 ? `${confirmedToday.length} confirmed today` : 'No bookings today',
      subIcon: 'trending_up',
    },
    {
      label: 'Staff Utilization',
      value: `${utilization}%`,
      icon: 'speed',
      iconBg: 'var(--blue-light)',
      sub: `${analytics.bookedHours || 0}h booked / ${analytics.capacityHours || 54}h capacity`,
      subIcon: 'bolt',
    },
    {
      label: 'Realized Revenue',
      value: `$${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: 'payments',
      iconBg: 'var(--teal)',
      sub: pendingRevenue > 0 ? `+$${pendingRevenue.toFixed(2)} in pending pipeline` : 'From confirmed appointments',
      subIcon: 'attach_money',
    },
    {
      label: 'Active Stylists',
      value: activeStylists,
      icon: 'badge',
      iconBg: 'var(--silver)',
      sub: calConnected ? '📅 Calendar Two-Way Synced' : 'Sync Google Calendar',
      subIcon: calConnected ? 'check_circle' : 'cloud_off',
    },
  ];

  return (
    <div className="kpi-grid">
      {cards.map(card => (
        <div key={card.label} className="kpi-card neo-card neo-shadow-md">
          <div className="kpi-card-header">
            <span className="kpi-card-label">{card.label}</span>
            <span
              className="kpi-card-icon material-symbols-outlined"
              style={{ background: card.iconBg }}
            >
              {card.icon}
            </span>
          </div>
          <div className="kpi-card-value">{card.value}</div>
          <div className="kpi-card-sub">
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{card.subIcon}</span>
            {card.sub}
          </div>
        </div>
      ))}
    </div>
  );
}
