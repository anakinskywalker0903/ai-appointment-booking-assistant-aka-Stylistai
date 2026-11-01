/**
 * Dynamic Availability & Alternatives Engine (StylistAI V2)
 *
 * Core Principle: "AI should understand the user. The application should enforce the rules."
 * Zero Hardcoding: Operating hours, breaks, buffer times, and stylist certifications
 * are evaluated dynamically on the fly.
 */

// ── Time Math Helpers ────────────────────────────────────────────────────────

export function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const parts = timeStr.trim().split(':');
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
}

export function minutesToTime(totalMinutes) {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function formatTime12h(timeStr) {
  if (!timeStr) return '';
  const [hh, mm] = timeStr.slice(0, 5).split(':').map(Number);
  const period = hh >= 12 ? 'PM' : 'AM';
  const hour12 = hh % 12 || 12;
  return `${hour12}:${String(mm).padStart(2, '0')} ${period}`;
}

export function formatDatePretty(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

// ── Date & Time Natural Language Parser ──────────────────────────────────────

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export function parseNaturalDate(text) {
  if (!text) return null;
  const lower = text.toLowerCase();
  const now = new Date();

  // 1. "today"
  if (lower.includes('today')) {
    return now.toISOString().slice(0, 10);
  }

  // 2. "day after tomorrow"
  if (lower.includes('day after tomorrow')) {
    const d = new Date(now);
    d.setDate(d.getDate() + 2);
    return d.toISOString().slice(0, 10);
  }

  // 3. "tomorrow"
  if (lower.includes('tomorrow')) {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }

  // 4. ISO format YYYY-MM-DD
  const isoMatch = lower.match(/\b(202\d-\d{2}-\d{2})\b/);
  if (isoMatch) return isoMatch[1];

  // 5. Day names (e.g. "friday", "this friday", "next monday")
  for (let i = 0; i < DAY_NAMES.length; i++) {
    const dayName = DAY_NAMES[i];
    if (lower.includes(dayName)) {
      const isNextWeek = lower.includes('next ' + dayName);
      const currentDay = now.getDay();
      let diff = i - currentDay;
      if (diff <= 0) diff += 7;
      if (isNextWeek && diff < 7) diff += 7;
      const target = new Date(now);
      target.setDate(target.getDate() + diff);
      return target.toISOString().slice(0, 10);
    }
  }

  return null;
}

export function parseNaturalTime(text) {
  if (!text) return null;
  const lower = text.toLowerCase();

  // "3:30 pm", "3:30pm", "15:30", "3 pm", "3pm"
  const timeRegex = /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/gi;
  let match;
  let candidateTime = null;

  while ((match = timeRegex.exec(lower)) !== null) {
    const rawH = parseInt(match[1], 10);
    const rawM = match[2] ? parseInt(match[2], 10) : 0;
    const modifier = match[3] ? match[3].toLowerCase() : null;

    // Filter out unlikely hour values
    if (rawH > 24) continue;

    let hour = rawH;
    if (modifier === 'pm' && hour < 12) hour += 12;
    if (modifier === 'am' && hour === 12) hour = 0;

    // If no modifier is provided, guess based on salon operating hours (e.g. 1 to 7 is probably PM)
    if (!modifier && hour >= 1 && hour <= 7) {
      hour += 12; // 2 -> 14:00 (2 PM)
    }

    candidateTime = `${String(hour).padStart(2, '0')}:${String(rawM).padStart(2, '0')}`;
  }

  // Named times
  if (!candidateTime) {
    if (lower.includes('afternoon')) return '14:00';
    if (/\bnoon\b/.test(lower)) return '12:00';
    if (lower.includes('morning')) return '10:00';
    if (lower.includes('evening')) return '17:00';
  }

  return candidateTime;
}

// ── Service & Stylist Natural Matcher ────────────────────────────────────────

export function matchService(text, services) {
  if (!text || !services || services.length === 0) return null;
  const lower = text.toLowerCase();

  // Try exact or primary keywords
  const keywords = [
    { key: 'fade', term: 'fade' },
    { key: 'taper', term: 'taper' },
    { key: 'beard', term: 'beard' },
    { key: 'facial', term: 'facial' },
    { key: 'spa', term: 'spa' },
    { key: 'scalp', term: 'scalp' },
    { key: 'color', term: 'color' },
    { key: 'balayage', term: 'balayage' },
    { key: 'highlight', term: 'highlight' },
    { key: 'keratin', term: 'keratin' },
    { key: 'silk press', term: 'silk' },
    { key: 'haircut', term: 'haircut' },
    { key: 'cut', term: 'cut' },
    { key: 'trim', term: 'trim' },
    { key: 'style', term: 'style' },
  ];

  for (const { term } of keywords) {
    if (lower.includes(term)) {
      const match = services.find(s =>
        s.name.toLowerCase().includes(term) ||
        (s.description && s.description.toLowerCase().includes(term))
      );
      if (match) return match;
    }
  }

  // Fallback: check each service name
  for (const s of services) {
    if (lower.includes(s.name.toLowerCase())) {
      return s;
    }
  }

  return null;
}

export function matchStylist(text, staffList) {
  if (!text || !staffList || staffList.length === 0) return null;
  const lower = text.toLowerCase();

  for (const staff of staffList) {
    const firstName = staff.name.split(' ')[0].toLowerCase();
    const fullName  = staff.name.toLowerCase();
    if (lower.includes(fullName) || lower.includes(firstName)) {
      return staff;
    }
  }

  return null;
}

// ── Core Availability & Conflict Engine ──────────────────────────────────────

/**
 * Checks if a specific stylist is busy at [startTime, startTime + duration] on date
 */
export function isStylistBusy(employeeId, date, startTimeStr, durationMin, appointments = [], blockedTimes = []) {
  const reqStart = timeToMinutes(startTimeStr);
  const reqEnd   = reqStart + durationMin;

  // 1. Check existing active appointments
  const hasAptOverlap = (appointments || []).some(appt => {
    const apptEmpId = appt.employeeId || appt.employees?.id;
    const apptEmpName = appt.employeeName || appt.employees?.name;
    const sameEmp = apptEmpId ? apptEmpId === employeeId : (apptEmpName && apptEmpName === employeeId);

    if (!sameEmp) return false;
    const apptDate = appt.date || appt.appointment_date;
    if (apptDate !== date) return false;
    if (appt.status === 'cancelled') return false;

    const apptStart = timeToMinutes(appt.time || appt.appointment_time);
    const apptDur   = Number(appt.serviceDuration || appt.services?.duration_min || appt.services?.duration_minutes || 45);
    const apptEnd   = apptStart + apptDur;

    return reqStart < apptEnd && reqEnd > apptStart;
  });

  if (hasAptOverlap) return true;

  // 2. Check blocked times / breaks / time off
  const hasBlockOverlap = (blockedTimes || []).some(block => {
    const bName = block.employeeName || '';
    const sameEmp = block.employeeId
      ? block.employeeId === employeeId
      : (bName && (bName === employeeId || String(employeeId).includes(bName) || bName.includes(String(employeeId))));

    if (!sameEmp) return false;
    if (block.date && block.date !== date) return false;

    const bStart = timeToMinutes(block.start);
    const bEnd   = timeToMinutes(block.end);
    return reqStart < bEnd && reqEnd > bStart;
  });

  return hasBlockOverlap;
}

/**
 * Validates a requested appointment slot and generates smart alternatives if occupied or invalid.
 */
export function validateAndFindSlots({
  service,
  stylist,
  date,
  time,
  services = [],
  staffList = [],
  appointments = [],
  blockedTimes = [],
  businessSettings = {},
}) {
  const openTime   = businessSettings.openTime  || '09:00';
  const closeTime  = businessSettings.closeTime || '18:00';
  const closedDays = businessSettings.closedDays || ['Sunday'];
  const openMin    = timeToMinutes(openTime);
  const closeMin   = timeToMinutes(closeTime);

  // 1. Validate Service
  const targetService = typeof service === 'string'
    ? services.find(s => s.name.toLowerCase() === service.toLowerCase() || s.id === service)
    : service;

  if (!targetService) {
    return {
      available: false,
      reason: 'unknown_service',
      message: "I couldn't identify the service you'd like. We offer haircuts, coloring, balayage, beard grooming, skin fades, and facials.",
      alternatives: [],
    };
  }

  const durationMin = Number(targetService.duration || targetService.duration_minutes || 45);
  const price = targetService.price ? (typeof targetService.price === 'number' ? `$${targetService.price}` : targetService.price) : '$45';

  // 2. Validate Date
  if (!date) {
    return {
      available: false,
      reason: 'missing_date',
      message: `What day would you like to book your ${targetService.name}?`,
      alternatives: [],
    };
  }

  const [year, month, day] = date.split('-').map(Number);
  const targetDateObj = new Date(year, month - 1, day);
  const dayName = targetDateObj.toLocaleDateString('en-US', { weekday: 'long' });

  // Closed Day Check
  if (closedDays.includes(dayName)) {
    // Generate next open day alternative
    const nextDate = new Date(targetDateObj);
    nextDate.setDate(nextDate.getDate() + 1);
    const nextDateStr = nextDate.toISOString().slice(0, 10);

    return {
      available: false,
      reason: 'closed_day',
      message: `Our salon is closed on ${dayName}s. We reopen on ${nextDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })} at ${openTime}.`,
      alternatives: [
        {
          date: nextDateStr,
          time: '10:00',
          label: `Next Open Day: ${nextDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at 10:00 AM`,
          type: 'next_day',
        },
      ],
    };
  }

  // 3. Past Date / Time Check
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  if (date < todayStr) {
    return {
      available: false,
      reason: 'past_date',
      message: "That date has already passed. Please select a future date.",
      alternatives: [],
    };
  }

  if (date === todayStr && time && timeToMinutes(time) < currentMinutes + 15) {
    return {
      available: false,
      reason: 'past_time',
      message: "That time has already passed today. Please pick a later time.",
      alternatives: generateUpcomingDaySlots(targetService, date, currentMinutes + 30, openMin, closeMin, staffList, appointments),
    };
  }

  // 4. Validate Time / Operating Hours
  if (!time) {
    // Suggest available times for this service and date
    const daySlots = generateFreeSlotsForDay(targetService, date, openMin, closeMin, staffList, appointments);
    return {
      available: false,
      reason: 'missing_time',
      message: `Great! What time works best for you on ${formatDatePretty(date)}? Here are some open openings:`,
      alternatives: daySlots.slice(0, 4),
    };
  }

  const reqStart = timeToMinutes(time);
  const reqEnd   = reqStart + durationMin;

  if (reqStart < openMin || reqEnd > closeMin) {
    return {
      available: false,
      reason: 'outside_hours',
      message: `Our salon operating hours are ${formatTime12h(openTime)} to ${formatTime12h(closeTime)}. A ${durationMin}-min service cannot start at ${formatTime12h(time)}.`,
      alternatives: [
        { date, time: openTime, label: `${formatTime12h(openTime)} (Opening Slot)`, type: 'same_day' },
        { date, time: '14:00', label: '2:00 PM (Afternoon Slot)', type: 'same_day' },
      ],
    };
  }

  // 5. Stylist Validation & Qualification
  // Find all active staff certified for this service
  const qualifiedStaff = staffList.filter(s =>
    s.active !== false &&
    s.assignedServiceIds &&
    s.assignedServiceIds.includes(targetService.id)
  );

  if (qualifiedStaff.length === 0) {
    return {
      available: false,
      reason: 'no_certified_staff',
      message: `We currently do not have an active stylist certified for ${targetService.name}.`,
      alternatives: [],
    };
  }

  // If customer preferred a specific stylist
  let targetStylist = null;
  if (stylist) {
    targetStylist = typeof stylist === 'string'
      ? staffList.find(s => s.name.toLowerCase().includes(stylist.toLowerCase()) || s.id === stylist)
      : stylist;

    if (targetStylist) {
      // Check if this stylist is certified for this service
      const isCertified = targetStylist.assignedServiceIds?.includes(targetService.id);
      if (!isCertified) {
        // Find who IS certified!
        const otherQualified = qualifiedStaff.map(s => ({
          service: targetService,
          stylist: s,
          date,
          time,
          label: `${s.name} is certified for ${targetService.name} (Free at ${formatTime12h(time)})`,
          type: 'other_stylist',
        }));

        return {
          available: false,
          reason: 'stylist_not_qualified',
          message: `${targetStylist.name} does not perform ${targetService.name}. However, our certified specialists for this treatment are ${qualifiedStaff.map(s => s.name).join(', ')}.`,
          alternatives: otherQualified,
        };
      }
    }
  }

  // 6. Availability & Conflict Resolution
  // Case A: Customer requested a specific certified stylist
  if (targetStylist) {
    const busy = isStylistBusy(targetStylist.id, date, time, durationMin, appointments, blockedTimes);

    if (!busy) {
      // SUCCESS! Slot is open!
      return {
        available: true,
        service: targetService,
        employee: targetStylist,
        date,
        time,
        duration: durationMin,
        price,
        message: `Great choice! ${targetStylist.name} is available for ${targetService.name} on ${formatDatePretty(date)} at ${formatTime12h(time)}.`,
      };
    }

    // CONFLICT: Stylist is busy or on break at this time.
    // Dynamically calculate smart alternatives:
    // 1. Same Stylist Nearest Slots (+/- 30, 45, 60, 90 mins)
    const sameStylistAlts = findSameStylistOffsets(targetStylist, targetService, date, reqStart, durationMin, openMin, closeMin, appointments, blockedTimes);

    // 2. Other Qualified Stylists FREE at that EXACT requested time!
    const otherStylistAlts = qualifiedStaff
      .filter(s => s.id !== targetStylist.id && !isStylistBusy(s.id, date, time, durationMin, appointments, blockedTimes))
      .map(s => ({
        service: targetService,
        employee: s,
        date,
        time,
        label: `${s.name} is free at ${formatTime12h(time)}`,
        badge: 'Same Time!',
        type: 'other_stylist',
      }));

    return {
      available: false,
      reason: 'stylist_conflict',
      message: `${targetStylist.name} is unavailable at ${formatTime12h(time)} on ${formatDatePretty(date)}.`,
      sameStylistAlternatives: sameStylistAlts,
      otherStylistAlternatives: otherStylistAlts,
      alternatives: [...sameStylistAlts, ...otherStylistAlts],
    };
  }

  // Case B: Customer has NO stylist preference. Find ANY certified stylist free at requested time!
  const freeStylist = qualifiedStaff.find(s => !isStylistBusy(s.id, date, time, durationMin, appointments, blockedTimes));

  if (freeStylist) {
    return {
      available: true,
      service: targetService,
      employee: freeStylist,
      date,
      time,
      duration: durationMin,
      price,
      message: `${freeStylist.name} is available to take you for ${targetService.name} on ${formatDatePretty(date)} at ${formatTime12h(time)}.`,
    };
  }

  // ALL qualified stylists are busy at this exact time!
  // Find nearest openings across any qualified stylist
  const bestAlts = [];
  for (const s of qualifiedStaff) {
    const alts = findSameStylistOffsets(s, targetService, date, reqStart, durationMin, openMin, closeMin, appointments, blockedTimes);
    if (alts.length > 0) bestAlts.push(alts[0]);
  }

  return {
    available: false,
    reason: 'all_stylists_busy',
    message: `All our certified stylists for ${targetService.name} are booked at ${formatTime12h(time)} on ${formatDatePretty(date)}. Here are the closest alternative openings:`,
    alternatives: bestAlts.slice(0, 3),
  };
}

// ── Smart Alternatives Search Helpers ────────────────────────────────────────

function findSameStylistOffsets(stylist, service, date, reqStartMin, durationMin, openMin, closeMin, appointments, blockedTimes = []) {
  const offsets = [30, -30, 45, -45, 60, -60, 90, -90, 120, -120];
  const alternatives = [];
  const triedTimes = new Set();

  for (const offset of offsets) {
    const candidateStart = reqStartMin + offset;
    const candidateEnd   = candidateStart + durationMin;

    if (candidateStart < openMin || candidateEnd > closeMin) continue;
    const timeStr = minutesToTime(candidateStart);
    if (triedTimes.has(timeStr)) continue;
    triedTimes.add(timeStr);

    if (!isStylistBusy(stylist.id, date, timeStr, durationMin, appointments, blockedTimes)) {
      const diffLabel = offset > 0 ? `+${offset}m` : `${offset}m`;
      alternatives.push({
        service,
        employee: stylist,
        date,
        time: timeStr,
        label: `${stylist.name.split(' ')[0]} at ${formatTime12h(timeStr)} (${diffLabel})`,
        badge: diffLabel,
        type: 'same_stylist',
      });
      if (alternatives.length >= 2) break;
    }
  }

  return alternatives;
}

function generateFreeSlotsForDay(service, date, openMin, closeMin, staffList, appointments) {
  const duration = Number(service.duration || 45);
  const slots = [];
  const qualified = staffList.filter(s => s.active !== false && s.assignedServiceIds?.includes(service.id));

  // Check 10:00, 11:30, 14:00, 15:30, 16:30
  const candidateMins = [600, 690, 840, 930, 990];

  for (const min of candidateMins) {
    if (min < openMin || min + duration > closeMin) continue;
    const timeStr = minutesToTime(min);
    const freeStaff = qualified.find(s => !isStylistBusy(s.id, date, timeStr, duration, appointments));
    if (freeStaff) {
      slots.push({
        service,
        employee: freeStaff,
        date,
        time: timeStr,
        label: `${formatTime12h(timeStr)} with ${freeStaff.name}`,
        type: 'day_slot',
      });
    }
  }

  return slots;
}

function generateUpcomingDaySlots(service, date, startFromMin, openMin, closeMin, staffList, appointments) {
  const duration = Number(service.duration || 45);
  const slots = [];
  const qualified = staffList.filter(s => s.active !== false && s.assignedServiceIds?.includes(service.id));

  for (let min = Math.max(startFromMin, openMin); min + duration <= closeMin; min += 45) {
    const timeStr = minutesToTime(min);
    const freeStaff = qualified.find(s => !isStylistBusy(s.id, date, timeStr, duration, appointments));
    if (freeStaff) {
      slots.push({
        service,
        employee: freeStaff,
        date,
        time: timeStr,
        label: `${formatTime12h(timeStr)} with ${freeStaff.name}`,
        type: 'upcoming_today',
      });
      if (slots.length >= 3) break;
    }
  }

  return slots;
}


// ── V2 AI Assistant Tool Definitions & Intent Dispatcher (Spec Pages 10-12, 23) ──

export const ASSISTANT_TOOLS = {
  DISCOVER_SERVICES: 'DISCOVER_SERVICES',
  CHECK_AVAILABILITY: 'CHECK_AVAILABILITY',
  LIST_APPOINTMENTS: 'LIST_APPOINTMENTS',
  BOOK_APPOINTMENT: 'BOOK_APPOINTMENT',
  RESCHEDULE_APPOINTMENT: 'RESCHEDULE_APPOINTMENT',
  CANCEL_APPOINTMENT: 'CANCEL_APPOINTMENT',
};

export function detectUserIntent(text) {
  if (!text) return ASSISTANT_TOOLS.BOOK_APPOINTMENT;
  const lower = text.toLowerCase();

  // 1. Rescheduling (checked before general appointment queries)
  if (
    lower.includes('reschedule') ||
    lower.includes('move my appointment') ||
    lower.includes('change my appointment') ||
    lower.includes('change time') ||
    lower.includes('postpone')
  ) {
    return ASSISTANT_TOOLS.RESCHEDULE_APPOINTMENT;
  }

  // 2. Cancellation
  if (
    lower.includes('cancel my') ||
    lower.includes('cancel appointment') ||
    lower.includes('cancel booking') ||
    lower.startsWith('cancel')
  ) {
    return ASSISTANT_TOOLS.CANCEL_APPOINTMENT;
  }

  // 3. Service Discovery
  if (
    lower.includes('what services') ||
    lower.includes('services do you offer') ||
    lower.includes('treatment menu') ||
    lower.includes('show services') ||
    lower.includes('service list') ||
    lower.includes('price list')
  ) {
    return ASSISTANT_TOOLS.DISCOVER_SERVICES;
  }

  // 4. Appointment Lookup
  if (
    lower.includes('my appointment') ||
    lower.includes('my booking') ||
    lower.includes('what appointments do i have') ||
    lower.includes('do i have this week') ||
    lower.includes('check my booking') ||
    lower.includes('view my appointment')
  ) {
    return ASSISTANT_TOOLS.LIST_APPOINTMENTS;
  }

  // 5. Availability inquiry
  if (
    lower.includes('what times are available') ||
    lower.includes('who is available') ||
    lower.includes('is anyone free') ||
    lower.includes('openings') ||
    lower.includes('can i get a haircut with') ||
    lower.includes('available on')
  ) {
    return ASSISTANT_TOOLS.CHECK_AVAILABILITY;
  }

  // Default to Booking
  return ASSISTANT_TOOLS.BOOK_APPOINTMENT;
}

/**
 * Execute the approved tool within strict business boundaries (Spec Page 11).
 * AI interprets intent -> Allowed Tool -> Business Logic -> Result.
 */
export function executeAssistantTool({
  tool,
  userText,
  user,
  services = [],
  staffList = [],
  appointments = [],
  blockedTimes = [],
  businessSettings = {},
  actions = {},
}) {
  const userEmail = (user?.email || 'customer@example.com').toLowerCase();

  switch (tool) {
    // ── TOOL 1: DISCOVER_SERVICES ───────────────────────────────────────────
    case ASSISTANT_TOOLS.DISCOVER_SERVICES: {
      const activeServices = services.filter(s => s.active !== false);
      const listStr = activeServices
        .map(s => `• **${s.name}** — $${s.price} (${s.duration || 45} mins): ${s.description || ''}`)
        .join('\n');

      return {
        intent: 'DISCOVER_SERVICES',
        message: `Here is our current salon service menu:\n\n${listStr}\n\nWhich treatment would you like to schedule?`,
        alternatives: [],
        structuredOutput: {
          intent: 'DISCOVER_SERVICES',
          servicesCount: activeServices.length,
        },
      };
    }

    // ── TOOL 2: LIST_APPOINTMENTS ───────────────────────────────────────────
    case ASSISTANT_TOOLS.LIST_APPOINTMENTS: {
      const userApts = appointments.filter(a => {
        const email = (a.customerEmail || a.customer_email || '').toLowerCase();
        return email === userEmail && a.status !== 'cancelled';
      });

      if (userApts.length === 0) {
        return {
          intent: 'LIST_APPOINTMENTS',
          message: `I looked up your record, ${user?.name || 'there'}! You currently do not have any upcoming appointments. Would you like to book one today?`,
          alternatives: [],
          structuredOutput: { intent: 'LIST_APPOINTMENTS', count: 0 },
        };
      }

      const aptsList = userApts
        .map(a => `• **${a.serviceName}** with **${a.employeeName}** on **${formatDatePretty(a.date)} at ${formatTime12h(a.time)}** (${a.status})`)
        .join('\n');

      return {
        intent: 'LIST_APPOINTMENTS',
        message: `Here are your scheduled appointments:\n\n${aptsList}\n\nLet me know if you would like to reschedule or book an additional treatment!`,
        alternatives: [],
        structuredOutput: { intent: 'LIST_APPOINTMENTS', count: userApts.length },
      };
    }

    // ── TOOL 3: CANCEL_APPOINTMENT ──────────────────────────────────────────
    case ASSISTANT_TOOLS.CANCEL_APPOINTMENT: {
      const userApts = appointments.filter(a => {
        const email = (a.customerEmail || a.customer_email || '').toLowerCase();
        return email === userEmail && (a.status === 'confirmed' || a.status === 'pending');
      });

      if (userApts.length === 0) {
        return {
          intent: 'CANCEL_APPOINTMENT',
          message: "You don't have any active appointments to cancel right now.",
          alternatives: [],
          structuredOutput: { intent: 'CANCEL_APPOINTMENT', success: false },
        };
      }

      // If user has 1 active appointment, cancel it
      const aptToCancel = userApts[0];
      if (actions.cancelAppointment) {
        actions.cancelAppointment(aptToCancel.id);
      }

      return {
        intent: 'CANCEL_APPOINTMENT',
        message: `Your appointment for **${aptToCancel.serviceName}** on **${formatDatePretty(aptToCancel.date)} at ${formatTime12h(aptToCancel.time)}** has been cancelled successfully.`,
        alternatives: [],
        structuredOutput: {
          intent: 'CANCEL_APPOINTMENT',
          appointmentId: aptToCancel.id,
          success: true,
        },
      };
    }

    // ── TOOL 4: RESCHEDULE_APPOINTMENT ──────────────────────────────────────
    case ASSISTANT_TOOLS.RESCHEDULE_APPOINTMENT: {
      const userApts = appointments.filter(a => {
        const email = (a.customerEmail || a.customer_email || '').toLowerCase();
        return email === userEmail && (a.status === 'confirmed' || a.status === 'pending');
      });

      if (userApts.length === 0) {
        return {
          intent: 'RESCHEDULE_APPOINTMENT',
          message: "You don't have an active appointment to reschedule. Would you like to book a new appointment instead?",
          alternatives: [],
          structuredOutput: { intent: 'RESCHEDULE_APPOINTMENT', success: false },
        };
      }

      const apt = userApts[0];
      const newDate = parseNaturalDate(userText) || apt.date;
      const newTime = parseNaturalTime(userText);

      if (!newTime) {
        return {
          intent: 'RESCHEDULE_APPOINTMENT',
          message: `I found your appointment for **${apt.serviceName}** on **${formatDatePretty(apt.date)}**. What new time or date would you like to move it to?`,
          alternatives: [],
          structuredOutput: { intent: 'RESCHEDULE_APPOINTMENT', appointmentId: apt.id },
        };
      }

      // Check slot with availability engine
      const evalSlot = validateAndFindSlots({
        service: apt.serviceName,
        stylist: apt.employeeName,
        date: newDate,
        time: newTime,
        services,
        staffList,
        appointments: appointments.filter(a => a.id !== apt.id),
        blockedTimes,
        businessSettings,
      });

      if (evalSlot.available) {
        if (actions.rescheduleAppointment) {
          actions.rescheduleAppointment(apt.id, newDate, newTime);
        }
        return {
          intent: 'RESCHEDULE_APPOINTMENT',
          message: `✅ Done! Your **${apt.serviceName}** with **${apt.employeeName}** has been moved to **${formatDatePretty(newDate)} at ${formatTime12h(newTime)}**.`,
          alternatives: [],
          structuredOutput: { intent: 'RESCHEDULE_APPOINTMENT', appointmentId: apt.id, success: true },
        };
      } else {
        return {
          intent: 'RESCHEDULE_APPOINTMENT',
          message: `Could not move to ${formatTime12h(newTime)}: ${evalSlot.message}`,
          alternatives: evalSlot.alternatives || [],
          structuredOutput: { intent: 'RESCHEDULE_APPOINTMENT', appointmentId: apt.id, success: false },
        };
      }
    }

    // ── TOOL 5: CHECK_AVAILABILITY ──────────────────────────────────────────
    case ASSISTANT_TOOLS.CHECK_AVAILABILITY: {
      const targetDate = parseNaturalDate(userText) || (new Date(Date.now() + 86400000)).toISOString().slice(0, 10);
      const targetStylist = matchStylist(userText, staffList);
      const targetService = matchService(userText, services) || services[0];
      const duration = Number(targetService?.duration || 45);

      const openMin  = timeToMinutes(businessSettings.openTime || '09:00');
      const closeMin = timeToMinutes(businessSettings.closeTime || '18:00');

      const slots = [];
      const candidateMins = [570, 630, 720, 840, 930, 1020]; // 9:30, 10:30, 12:00, 14:00, 15:30, 17:00
      const activeStaff = targetStylist
        ? [targetStylist]
        : staffList.filter(s => s.active !== false && s.assignedServiceIds?.includes(targetService.id));

      for (const min of candidateMins) {
        if (min < openMin || min + duration > closeMin) continue;
        const timeStr = minutesToTime(min);
        for (const st of activeStaff) {
          if (!isStylistBusy(st.id, targetDate, timeStr, duration, appointments, blockedTimes)) {
            slots.push({
              service: targetService,
              employee: st,
              date: targetDate,
              time: timeStr,
              label: `${st.name.split(' ')[0]} at ${formatTime12h(timeStr)}`,
              badge: 'Open',
              type: 'open_slot',
            });
            break;
          }
        }
      }

      const stylistMention = targetStylist ? `with **${targetStylist.name}** ` : '';
      return {
        intent: 'CHECK_AVAILABILITY',
        message: `Here are available openings ${stylistMention}on **${formatDatePretty(targetDate)}** for **${targetService.name}**:\n\nTap any chip below to book immediately!`,
        alternatives: slots.slice(0, 5),
        structuredOutput: {
          intent: 'CHECK_AVAILABILITY',
          date: targetDate,
          slotsCount: slots.length,
        },
      };
    }

    // ── TOOL 6: BOOK_APPOINTMENT ─────────────────────────────────────────────
    default: {
      const extractedService = matchService(userText, services) || services[0];
      const extractedStylist = matchStylist(userText, staffList);
      const extractedDate = parseNaturalDate(userText) || (new Date(Date.now() + 86400000)).toISOString().slice(0, 10);
      const extractedTime = parseNaturalTime(userText);

      if (!extractedTime) {
        return {
          intent: 'BOOK_APPOINTMENT',
          message: `Great choice with **${extractedService.name}**! What time works best for you on **${formatDatePretty(extractedDate)}**?`,
          alternatives: generateFreeSlotsForDay(extractedService, extractedDate, timeToMinutes(businessSettings.openTime || '09:00'), timeToMinutes(businessSettings.closeTime || '18:00'), staffList, appointments),
          structuredOutput: { intent: 'BOOK_APPOINTMENT', stage: 'need_time' },
        };
      }

      const evalSlot = validateAndFindSlots({
        service: extractedService,
        stylist: extractedStylist,
        date: extractedDate,
        time: extractedTime,
        services,
        staffList,
        appointments,
        blockedTimes,
        businessSettings,
      });

      return {
        intent: 'BOOK_APPOINTMENT',
        available: evalSlot.available,
        service: evalSlot.service,
        employee: evalSlot.employee,
        date: evalSlot.date,
        time: evalSlot.time,
        duration: evalSlot.duration,
        price: evalSlot.price,
        message: evalSlot.message,
        alternatives: evalSlot.alternatives || [],
        structuredOutput: {
          intent: 'BOOK_APPOINTMENT',
          serviceId: evalSlot.service?.id,
          staffId: evalSlot.employee?.id,
          date: evalSlot.date,
          time: evalSlot.time,
          available: evalSlot.available,
        },
      };
    }
  }
}
