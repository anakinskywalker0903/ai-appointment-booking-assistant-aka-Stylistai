import React, { useState, useMemo } from 'react';
import { timeToMinutes, formatTime12h, formatDatePretty } from '../../services/availabilityEngine';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, User, Scissors, ShieldAlert } from 'lucide-react';
import './ScheduleCalendar.css';

export default function ScheduleCalendar({
  appointments = [],
  staffList = [],
  blockedTimes = [],
  businessSettings = { openTime: '09:00', closeTime: '18:00' },
  initialDate,
  filterStaffName = null,
  onBookSlot = null,
  onAppointmentClick = null,
}) {
  const [currentDate, setCurrentDate] = useState(() => {
    return initialDate || new Date().toISOString().slice(0, 10);
  });
  const [selectedStylist, setSelectedStylist] = useState(filterStaffName || 'all');

  const openHour = parseInt((businessSettings.openTime || '09:00').split(':')[0], 10);
  const closeHour = parseInt((businessSettings.closeTime || '18:00').split(':')[0], 10);

  // Generate array of hourly intervals (e.g. 9, 10, 11 ... 17)
  const hours = useMemo(() => {
    const list = [];
    for (let h = openHour; h <= closeHour; h++) {
      list.push(h);
    }
    return list;
  }, [openHour, closeHour]);

  // Active stylists to display as columns
  const visibleStaff = useMemo(() => {
    const active = staffList.filter(s => s.active !== false);
    if (selectedStylist !== 'all') {
      return active.filter(s => s.name.toLowerCase() === selectedStylist.toLowerCase());
    }
    return active;
  }, [staffList, selectedStylist]);

  // Appointments on selected date
  const dayAppointments = useMemo(() => {
    return (appointments || []).filter(a => {
      const aptDate = a.date || a.appointment_date;
      return aptDate === currentDate && a.status !== 'cancelled';
    });
  }, [appointments, currentDate]);

  // Blocked times on selected date
  const dayBlocks = useMemo(() => {
    return (blockedTimes || []).filter(b => {
      if (!b.date) return true; // recurring daily
      return b.date === currentDate;
    });
  }, [blockedTimes, currentDate]);

  // Date Navigation
  const handlePrevDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 1);
    setCurrentDate(d.toISOString().slice(0, 10));
  };

  const handleNextDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 1);
    setCurrentDate(d.toISOString().slice(0, 10));
  };

  const handleToday = () => {
    setCurrentDate(new Date().toISOString().slice(0, 10));
  };

  return (
    <div className="schedule-calendar-container neo-shadow-md">
      {/* ── Calendar Controls Bar ── */}
      <div className="calendar-toolbar">
        <div className="calendar-date-nav">
          <button type="button" onClick={handlePrevDay} className="cal-nav-btn" title="Previous Day">
            <ChevronLeft size={18} />
          </button>
          <button type="button" onClick={handleToday} className="cal-today-btn">
            Today
          </button>
          <button type="button" onClick={handleNextDay} className="cal-nav-btn" title="Next Day">
            <ChevronRight size={18} />
          </button>

          <div className="cal-current-date">
            <CalendarIcon size={18} style={{ color: 'var(--orange)' }} />
            <span>{formatDatePretty(currentDate)} ({currentDate})</span>
          </div>
        </div>

        {/* Staff Filter Dropdown */}
        <div className="calendar-stylist-filter">
          <User size={16} />
          <label htmlFor="cal-staff-select">Stylist:</label>
          <select
            id="cal-staff-select"
            value={selectedStylist}
            onChange={(e) => setSelectedStylist(e.target.value)}
            className="cal-select"
          >
            <option value="all">All Team Members ({staffList.length})</option>
            {staffList.map(s => (
              <option key={s.id} value={s.name}>{s.name} ({s.role})</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Timetable Grid ── */}
      <div className="timetable-wrapper">
        <table className="timetable-grid">
          <thead>
            <tr>
              <th className="timetable-time-header">Time</th>
              {visibleStaff.map(staff => (
                <th key={staff.id} className="timetable-staff-header">
                  <div className="staff-header-name">{staff.name}</div>
                  <div className="staff-header-role">{staff.role}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {hours.map(hour => {
              const timeString = `${String(hour).padStart(2, '0')}:00`;
              const displayTime = formatTime12h(timeString);
              const hourMin = hour * 60;

              return (
                <tr key={hour} className="timetable-row">
                  <td className="timetable-time-cell">
                    <span className="hour-label">{displayTime}</span>
                  </td>

                  {visibleStaff.map(staff => {
                    // Check if there is an appointment starting in this hour (e.g. 10:00 - 10:59)
                    const appt = dayAppointments.find(a => {
                      const aptStaff = a.employeeName || a.employees?.name;
                      const staffMatch = aptStaff && (
                        aptStaff.toLowerCase().includes(staff.name.toLowerCase()) ||
                        staff.name.toLowerCase().includes(aptStaff.toLowerCase())
                      );
                      if (!staffMatch) return false;

                      const aptTime = a.time || a.appointment_time || '00:00';
                      const aptMin = timeToMinutes(aptTime);
                      return aptMin >= hourMin && aptMin < hourMin + 60;
                    });

                    // Check if staff has a blocked break during this hour
                    const block = dayBlocks.find(b => {
                      const bName = b.employeeName || '';
                      const staffMatch = bName && (
                        bName.toLowerCase().includes(staff.name.toLowerCase()) ||
                        staff.name.toLowerCase().includes(bName.toLowerCase())
                      );
                      if (!staffMatch) return false;

                      const bStart = timeToMinutes(b.start);
                      const bEnd = timeToMinutes(b.end);
                      return hourMin < bEnd && (hourMin + 60) > bStart;
                    });

                    return (
                      <td key={staff.id} className="timetable-slot-cell">
                        {appt ? (
                          <div
                            className={`calendar-appt-block status-card-${appt.status}`}
                            onClick={() => onAppointmentClick && onAppointmentClick(appt)}
                            title={`Click to view details: ${appt.customerName || appt.customer_name} - ${appt.serviceName || appt.services?.name}`}
                          >
                            <div className="appt-block-top">
                              <span className="appt-block-time">
                                {formatTime12h(appt.time || appt.appointment_time)}
                              </span>
                              <span className={`appt-block-badge badge-${appt.status}`}>
                                {appt.status}
                              </span>
                            </div>
                            <div className="appt-block-client">
                              {appt.customerName || appt.customer_name || 'Client'}
                            </div>
                            <div className="appt-block-service">
                              <Scissors size={11} />
                              <span>{appt.serviceName || appt.services?.name || 'Haircut'}</span>
                            </div>
                          </div>
                        ) : block ? (
                          <div className="calendar-block-chip">
                            <ShieldAlert size={12} />
                            <span>{block.reason || 'Blocked Break'}</span>
                            <small>({block.start} - {block.end})</small>
                          </div>
                        ) : (
                          <div
                            className="calendar-open-slot"
                            onClick={() => onBookSlot && onBookSlot(staff, currentDate, timeString)}
                            title={`Available slot with ${staff.name} at ${displayTime}`}
                          >
                            <span className="slot-empty-label">Available</span>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Timetable Legend ── */}
      <div className="timetable-legend">
        <div className="legend-item">
          <span className="legend-color-box confirmed-box" />
          <span>Confirmed Booking</span>
        </div>
        <div className="legend-item">
          <span className="legend-color-box pending-box" />
          <span>Pending Confirmation</span>
        </div>
        <div className="legend-item">
          <span className="legend-color-box blocked-box" />
          <span>Staff Shift Break / Off</span>
        </div>
        <div className="legend-item">
          <span className="legend-color-box open-box" />
          <span>Open Slot (Bookable)</span>
        </div>
      </div>
    </div>
  );
}
