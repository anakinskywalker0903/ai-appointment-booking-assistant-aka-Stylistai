import React, { createContext, useContext, useState, useEffect } from 'react';

const AppointmentContext = createContext(null);

const STORAGE_KEY_APPOINTMENTS = 'stylistai_appointments_v2';
const STORAGE_KEY_SERVICES     = 'stylistai_services_v2';
const STORAGE_KEY_STAFF        = 'stylistai_staff_v2';
const STORAGE_KEY_SETTINGS     = 'stylistai_settings_v2';
const STORAGE_KEY_BLOCKED      = 'stylistai_blocked_v2';

const SEED_BLOCKED_TIMES = [
  { id: 'b1', employeeName: 'Sarah Jenkins', reason: 'Lunch Break', start: '13:00', end: '14:00', recurring: 'Daily' },
  { id: 'b2', employeeName: 'David Miller', reason: 'Supply Restock', start: '12:00', end: '12:45', recurring: 'Daily' },
];

const SEED_SERVICES = [
  {
    id: 'srv-1',
    name: 'Haircut & Styling',
    duration: 45,
    price: 45,
    description: 'Classic precision haircut, luxury wash, and blow dry finish.',
    active: true,
  },
  {
    id: 'srv-2',
    name: 'Hair Coloring (Balayage)',
    duration: 120,
    price: 120,
    description: 'Full custom hair coloring, multi-dimensional balayage, or highlights.',
    active: true,
  },
  {
    id: 'srv-3',
    name: 'Hair Spa & Scalp Therapy',
    duration: 60,
    price: 65,
    description: 'Deep conditioning scalp massage & organic restorative botanical mask.',
    active: true,
  },
  {
    id: 'srv-4',
    name: 'Classic Beard Grooming',
    duration: 30,
    price: 30,
    description: 'Precision beard shaping, edge razor detailing, and aromatic hot towel.',
    active: true,
  },
  {
    id: 'srv-5',
    name: 'Deep Cleansing Facial',
    duration: 60,
    price: 75,
    description: 'Exfoliation, steam pore purification, and rejuvenating collagen infusion.',
    active: true,
  },
  {
    id: 'srv-6',
    name: 'Precision Skin Fade & Taper',
    duration: 45,
    price: 40,
    description: 'Surgical zero-fade, razor neckline taper, and textured top styling.',
    active: true,
  },
  {
    id: 'srv-7',
    name: 'Silk Press & Keratin Smoothing',
    duration: 90,
    price: 110,
    description: 'Thermal straightening, keratin infusion treatment, and high-shine blowout.',
    active: true,
  },
  {
    id: 'srv-8',
    name: 'Express Beard Sculpting',
    duration: 20,
    price: 20,
    description: 'Quick lineup, contour edge sculpting, and organic beard oil treatment.',
    active: true,
  },
];

const SEED_STAFF = [
  {
    id: 'emp-1',
    name: 'Sarah Jenkins',
    role: 'Senior Hair Stylist',
    bio: 'Master colorist and modern cut specialist with 8 years of salon artistry.',
    active: true,
    assignedServiceIds: ['srv-1', 'srv-2', 'srv-3', 'srv-7'],
    hours: '09:00 AM - 05:00 PM',
  },
  {
    id: 'emp-2',
    name: 'Emma Watson',
    role: 'Hair & Beauty Expert',
    bio: 'Renowned expert in botanical hair spa treatments, facials, and bridal styling.',
    active: true,
    assignedServiceIds: ['srv-1', 'srv-3', 'srv-5'],
    hours: '10:00 AM - 06:00 PM',
  },
  {
    id: 'emp-3',
    name: 'David Miller',
    role: 'Master Barber',
    bio: 'Artisan barber dedicated to precision skin fades, beard sculpting, and hot towel care.',
    active: true,
    assignedServiceIds: ['srv-1', 'srv-4', 'srv-6', 'srv-8'],
    hours: '09:00 AM - 06:00 PM',
  },
  {
    id: 'emp-4',
    name: 'Aria Chen',
    role: 'Creative Color Director',
    bio: 'Celebrity colorist specializing in vivid pastel balayage, dimensional foils, and Asian hair textures.',
    active: true,
    assignedServiceIds: ['srv-1', 'srv-2', 'srv-3', 'srv-7'],
    hours: '11:00 AM - 07:00 PM',
  },
  {
    id: 'emp-5',
    name: 'Marcus Rivera',
    role: 'Grooming & Fade Specialist',
    bio: 'Razor specialist certified in straight-edge shaving, afro-textured fading, and bespoke beard trims.',
    active: true,
    assignedServiceIds: ['srv-1', 'srv-4', 'srv-6', 'srv-8'],
    hours: '09:00 AM - 05:00 PM',
  },
  {
    id: 'emp-6',
    name: 'Chloe Dubois',
    role: 'Senior Holistic Esthetician',
    bio: 'Licensed dermatological esthetician with expertise in organic peels, lymphatic drainage, and scalp health.',
    active: true,
    assignedServiceIds: ['srv-3', 'srv-5'],
    hours: '10:00 AM - 06:00 PM',
  },
];

const SEED_SETTINGS = {
  businessName: 'StylistAI Salon & Spa',
  openTime: '09:00',
  closeTime: '18:00',
  closedDays: ['Sunday'],
  slotDurationMinutes: 45,
  currency: '$',
  cancellationNoticeHours: 2,
};

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
  // ── Appointments ──
  const [appointments, setAppointments] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_APPOINTMENTS);
      return saved ? JSON.parse(saved) : SEED_APPOINTMENTS;
    } catch {
      return SEED_APPOINTMENTS;
    }
  });

  // ── Services Catalog ──
  const [services, setServices] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SERVICES);
      if (!saved) return SEED_SERVICES;
      const parsed = JSON.parse(saved);
      // Seamlessly merge any new seeds if not present
      const existingIds = new Set(parsed.map(s => s.id));
      const missingSeeds = SEED_SERVICES.filter(s => !existingIds.has(s.id));
      return [...parsed, ...missingSeeds];
    } catch {
      return SEED_SERVICES;
    }
  });

  // ── Staff List ──
  const [staffList, setStaffList] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_STAFF);
      if (!saved) return SEED_STAFF;
      const parsed = JSON.parse(saved);
      // Seamlessly merge any new seeds if not present
      const existingIds = new Set(parsed.map(s => s.id));
      const missingSeeds = SEED_STAFF.filter(s => !existingIds.has(s.id));
      return [...parsed, ...missingSeeds];
    } catch {
      return SEED_STAFF;
    }
  });

  // ── Business Settings ──
  const [businessSettings, setBusinessSettings] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
      return saved ? JSON.parse(saved) : SEED_SETTINGS;
    } catch {
      return SEED_SETTINGS;
    }
  });

  // ── Blocked Times (Staff Breaks & Time Off) ──
  const [blockedTimes, setBlockedTimes] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_BLOCKED);
      return saved ? JSON.parse(saved) : SEED_BLOCKED_TIMES;
    } catch {
      return SEED_BLOCKED_TIMES;
    }
  });

  // Persistence effects
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_APPOINTMENTS, JSON.stringify(appointments));
    } catch (err) {
      console.error('Failed to persist appointments:', err);
    }
  }, [appointments]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SERVICES, JSON.stringify(services));
    } catch (err) {
      console.error('Failed to persist services:', err);
    }
  }, [services]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_STAFF, JSON.stringify(staffList));
    } catch (err) {
      console.error('Failed to persist staff:', err);
    }
  }, [staffList]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(businessSettings));
    } catch (err) {
      console.error('Failed to persist business settings:', err);
    }
  }, [businessSettings]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_BLOCKED, JSON.stringify(blockedTimes));
    } catch (err) {
      console.error('Failed to persist blocked times:', err);
    }
  }, [blockedTimes]);

  // Real-time cross-tab synchronization listener
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (!e.newValue) return;
      try {
        if (e.key === STORAGE_KEY_APPOINTMENTS) {
          setAppointments(JSON.parse(e.newValue));
        } else if (e.key === STORAGE_KEY_SERVICES) {
          setServices(JSON.parse(e.newValue));
        } else if (e.key === STORAGE_KEY_STAFF) {
          setStaffList(JSON.parse(e.newValue));
        } else if (e.key === STORAGE_KEY_SETTINGS) {
          setBusinessSettings(JSON.parse(e.newValue));
        } else if (e.key === STORAGE_KEY_BLOCKED) {
          setBlockedTimes(JSON.parse(e.newValue));
        }
      } catch (err) {
        console.error('Cross-tab synchronization error:', err);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // ── Appointment Methods ──
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

  const cancelAppointment = (appointmentId) => {
    setAppointments((prev) =>
      prev.map((apt) =>
        apt.id === appointmentId ? { ...apt, status: 'cancelled' } : apt
      )
    );
  };

  const rescheduleAppointment = (appointmentId, newDate, newTime) => {
    setAppointments((prev) =>
      prev.map((apt) =>
        apt.id === appointmentId
          ? { ...apt, date: newDate, time: newTime, status: 'confirmed' }
          : apt
      )
    );
  };

  const updateAppointmentStatus = (appointmentId, status) => {
    setAppointments((prev) =>
      prev.map((apt) =>
        apt.id === appointmentId ? { ...apt, status } : apt
      )
    );
  };

  const getAppointmentsForCustomer = (email) => {
    if (!email) return [];
    const target = email.toLowerCase().trim();
    return appointments.filter((apt) => {
      const aptEmail = (apt.customerEmail || apt.customer_email || '').toLowerCase().trim();
      return aptEmail === target;
    });
  };

  const getAppointmentsForStaff = (staffName) => {
    if (!staffName) return [];
    const target = staffName.toLowerCase().trim();
    return appointments.filter((apt) => {
      const name = (apt.employeeName || apt.employees?.name || '').toLowerCase().trim();
      if (!name) return false;
      return name.includes(target) || target.includes(name);
    });
  };

  // ── Service Catalog Methods ──
  const addService = ({ name, duration, price, description = '' }) => {
    const newService = {
      id: 'srv-' + Date.now().toString(36),
      name,
      duration: Number(duration),
      price: Number(price),
      description,
      active: true,
    };
    setServices((prev) => [...prev, newService]);
    return newService;
  };

  const updateService = (id, updatedFields) => {
    setServices((prev) =>
      prev.map((srv) => (srv.id === id ? { ...srv, ...updatedFields } : srv))
    );
  };

  const toggleServiceActive = (id) => {
    setServices((prev) =>
      prev.map((srv) => (srv.id === id ? { ...srv, active: !srv.active } : srv))
    );
  };

  const deleteService = (id) => {
    setServices((prev) => prev.filter((srv) => srv.id !== id));
    // Also remove from any staff's assigned services
    setStaffList((prev) =>
      prev.map((emp) => ({
        ...emp,
        assignedServiceIds: emp.assignedServiceIds.filter((sid) => sid !== id),
      }))
    );
  };

  // ── Staff Management Methods ──
  const addStaff = ({ name, role, bio = '', hours = '09:00 AM - 05:00 PM', assignedServiceIds = [] }) => {
    const newStaff = {
      id: 'emp-' + Date.now().toString(36),
      name,
      role,
      bio,
      active: true,
      assignedServiceIds,
      hours,
    };
    setStaffList((prev) => [...prev, newStaff]);
    return newStaff;
  };

  const updateStaff = (id, updatedFields) => {
    setStaffList((prev) =>
      prev.map((emp) => (emp.id === id ? { ...emp, ...updatedFields } : emp))
    );
  };

  const toggleStaffActive = (id) => {
    setStaffList((prev) =>
      prev.map((emp) => (emp.id === id ? { ...emp, active: !emp.active } : emp))
    );
  };

  const assignServicesToStaff = (staffId, serviceIds) => {
    setStaffList((prev) =>
      prev.map((emp) =>
        emp.id === staffId ? { ...emp, assignedServiceIds: serviceIds } : emp
      )
    );
  };

  // ── Blocked Times Methods (Staff Schedule) ──
  const addBlockedTime = ({ employeeName, reason, start, end, date, recurring = 'One-time' }) => {
    const newBlock = {
      id: 'b-' + Date.now().toString(36),
      employeeName,
      reason,
      start,
      end,
      date,
      recurring,
    };
    setBlockedTimes((prev) => [...prev, newBlock]);
    return newBlock;
  };

  const removeBlockedTime = (id) => {
    setBlockedTimes((prev) => prev.filter((b) => b.id !== id));
  };

  // ── Business Settings Methods ──
  const updateBusinessSettings = (newSettings) => {
    setBusinessSettings((prev) => ({ ...prev, ...newSettings }));
  };

  return (
    <AppointmentContext.Provider
      value={{
        // Appointments
        appointments,
        bookAppointment,
        cancelAppointment,
        rescheduleAppointment,
        updateAppointmentStatus,
        getAppointmentsForCustomer,
        getAppointmentsForStaff,
        // Blocked Times / Staff Breaks
        blockedTimes,
        addBlockedTime,
        removeBlockedTime,
        // Services
        services,
        addService,
        updateService,
        toggleServiceActive,
        deleteService,
        // Staff
        staffList,
        addStaff,
        updateStaff,
        toggleStaffActive,
        assignServicesToStaff,
        // Business Settings
        businessSettings,
        updateBusinessSettings,
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
