import React, { createContext, useContext, useState, useEffect } from 'react';

const AppointmentContext = createContext(null);

const STORAGE_KEY = 'stylistai_appointments_v2';

const SEED_APPOINTMENTS = [
  {
    id: 'apt-seed-1',
    customerName: 'Alex Johnson',
    customerEmail: 'alex@customer.com',
    customerPhone: '+1 (555) 234-5678',
    serviceName: 'Haircut & Styling',
    serviceDuration: 45,
    servicePrice: '$35.00',
    employeeName: 'Sarah Jenkins',
    employeeRole: 'Senior Hair Stylist',
    date: '2026-09-15',
    time: '14:00',
    status: 'confirmed',
    notes: 'Low taper fade, textured crop on top',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'apt-seed-2',
    customerName: 'Jessica Taylor',
    customerEmail: 'jessica.t@example.com',
    customerPhone: '+1 (555) 456-7890',
    serviceName: 'Hair Coloring (Balayage)',
    serviceDuration: 120,
    servicePrice: '$95.00',
    employeeName: 'Sarah Jenkins',
    employeeRole: 'Senior Hair Stylist',
    date: '2026-09-15',
    time: '10:00',
    status: 'confirmed',
    notes: 'Ash blonde highlights, test strand was done last week',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'apt-seed-3',
    customerName: 'Alex Johnson',
    customerEmail: 'alex@customer.com',
    customerPhone: '+1 (555) 234-5678',
    serviceName: 'Hair Spa & Scalp Therapy',
    serviceDuration: 60,
    servicePrice: '$50.00',
    employeeName: 'Emma Watson',
    employeeRole: 'Hair & Beauty Expert',
    date: '2026-09-18',
    time: '16:30',
    status: 'pending',
    notes: 'Sensitive scalp, prefers organic products',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'apt-seed-4',
    customerName: 'Michael Chang',
    customerEmail: 'm.chang@example.com',
    customerPhone: '+1 (555) 789-0123',
    serviceName: 'Classic Beard Grooming',
    serviceDuration: 30,
    servicePrice: '$25.00',
    employeeName: 'David Miller',
    employeeRole: 'Master Barber',
    date: '2026-09-16',
    time: '11:00',
    status: 'confirmed',
    notes: 'Hot towel treatment included',
    createdAt: new Date().toISOString(),
  },
];

export function AppointmentProvider({ children }) {
  const [appointments, setAppointments] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_APPOINTMENTS));
      return SEED_APPOINTMENTS;
    } catch {
      return SEED_APPOINTMENTS;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(appointments));
    } catch (err) {
      console.error('Failed to persist appointments to localStorage:', err);
    }
  }, [appointments]);

  /**
   * Book a new appointment
   */
  const bookAppointment = ({
    customerName,
    customerEmail,
    customerPhone,
    serviceName,
    serviceDuration = 45,
    servicePrice = '$35.00',
    employeeName,
    employeeRole = 'Hair Stylist',
    date,
    time,
    notes = '',
  }) => {
    const newAppointment = {
      id: 'apt-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      customerName,
      customerEmail,
      customerPhone: customerPhone || '',
      serviceName,
      serviceDuration,
      servicePrice,
      employeeName,
      employeeRole,
      date,
      time,
      status: 'confirmed',
      notes,
      createdAt: new Date().toISOString(),
    };

    setAppointments((prev) => [newAppointment, ...prev]);
    return newAppointment;
  };

  /**
   * Cancel an appointment
   */
  const cancelAppointment = (appointmentId) => {
    setAppointments((prev) =>
      prev.map((apt) =>
        apt.id === appointmentId ? { ...apt, status: 'cancelled' } : apt
      )
    );
  };

  /**
   * Reschedule an appointment
   */
  const rescheduleAppointment = (appointmentId, newDate, newTime) => {
    setAppointments((prev) =>
      prev.map((apt) =>
        apt.id === appointmentId
          ? { ...apt, date: newDate, time: newTime, status: 'confirmed' }
          : apt
      )
    );
  };

  /**
   * Update status (e.g. 'confirmed', 'in_progress', 'completed', 'cancelled')
   */
  const updateAppointmentStatus = (appointmentId, status) => {
    setAppointments((prev) =>
      prev.map((apt) =>
        apt.id === appointmentId ? { ...apt, status } : apt
      )
    );
  };

  /**
   * Filter appointments for a specific customer
   */
  const getAppointmentsForCustomer = (email) => {
    if (!email) return [];
    return appointments.filter(
      (apt) => apt.customerEmail.toLowerCase() === email.toLowerCase()
    );
  };

  /**
   * Filter appointments for a specific staff member
   */
  const getAppointmentsForStaff = (staffName) => {
    if (!staffName) return [];
    return appointments.filter(
      (apt) => apt.employeeName.toLowerCase().includes(staffName.toLowerCase()) ||
               staffName.toLowerCase().includes(apt.employeeName.toLowerCase())
    );
  };

  return (
    <AppointmentContext.Provider
      value={{
        appointments,
        bookAppointment,
        cancelAppointment,
        rescheduleAppointment,
        updateAppointmentStatus,
        getAppointmentsForCustomer,
        getAppointmentsForStaff,
      }}
    >
      {children}
    </AppointmentContext.Provider>
  );
}

export function useAppointments() {
  const ctx = useContext(AppointmentContext);
  if (!ctx) {
    throw new Error('useAppointments must be used within an AppointmentProvider');
  }
  return ctx;
}
