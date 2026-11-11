import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  timeToMinutes,
  minutesToTime,
  formatTime12h,
  parseNaturalTime,
  isStylistBusy,
  validateAndFindSlots,
  detectUserIntent,
  executeAssistantTool,
  ASSISTANT_TOOLS,
} from '../src/services/availabilityEngine.js';

// Test Fixtures
const MOCK_SERVICES = [
  { id: 'srv-1', name: 'Haircut & Styling', duration: 45, price: 45, active: true },
  { id: 'srv-2', name: 'Hair Coloring (Balayage)', duration: 120, price: 120, active: true },
  { id: 'srv-4', name: 'Classic Beard Grooming', duration: 30, price: 30, active: true },
];

const MOCK_STAFF = [
  { id: 'emp-1', name: 'Sarah Jenkins', role: 'Senior Stylist', active: true, assignedServiceIds: ['srv-1', 'srv-2'] },
  { id: 'emp-2', name: 'Emma Watson', role: 'Color Specialist', active: true, assignedServiceIds: ['srv-1', 'srv-2'] },
  { id: 'emp-3', name: 'David Miller', role: 'Master Barber', active: true, assignedServiceIds: ['srv-1', 'srv-4'] },
];

const MOCK_SETTINGS = {
  openTime: '09:00',
  closeTime: '18:00',
  closedDays: ['Sunday'],
};

// Dynamic date helpers to prevent test expiration
function getNextOpenDate() {
  const d = new Date();
  for (let i = 1; i <= 7; i++) {
    const candidate = new Date();
    candidate.setDate(d.getDate() + i);
    if (candidate.getDay() !== 0) { // not Sunday
      const year = candidate.getFullYear();
      const month = String(candidate.getMonth() + 1).padStart(2, '0');
      const day = String(candidate.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }
}

function getNextSunday() {
  const d = new Date();
  for (let i = 1; i <= 7; i++) {
    const candidate = new Date();
    candidate.setDate(d.getDate() + i);
    if (candidate.getDay() === 0) { // Sunday
      const year = candidate.getFullYear();
      const month = String(candidate.getMonth() + 1).padStart(2, '0');
      const day = String(candidate.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }
}

const TEST_OPEN_DATE = getNextOpenDate();
const TEST_SUNDAY = getNextSunday();

describe('Time and String Parsing Helpers', () => {
  test('timeToMinutes and minutesToTime conversions', () => {
    assert.equal(timeToMinutes('09:00'), 540);
    assert.equal(timeToMinutes('14:30'), 870);
    assert.equal(minutesToTime(540), '09:00');
    assert.equal(minutesToTime(870), '14:30');
  });

  test('formatTime12h converts 24h string to formatted 12h representation', () => {
    assert.equal(formatTime12h('09:00'), '9:00 AM');
    assert.equal(formatTime12h('12:00'), '12:00 PM');
    assert.equal(formatTime12h('14:30'), '2:30 PM');
  });

  test('parseNaturalTime parses natural strings into HH:MM', () => {
    assert.equal(parseNaturalTime('Can I book at 2pm?'), '14:00');
    assert.equal(parseNaturalTime('at 11:30 AM please'), '11:30');
    assert.equal(parseNaturalTime('tomorrow afternoon'), '14:00');
    assert.equal(parseNaturalTime('at noon'), '12:00');
  });
});

describe('Stylist Collision & Availability Engine', () => {
  test('isStylistBusy detects overlapping appointments', () => {
    const existingAppointments = [
      {
        id: 'apt-1',
        employeeId: 'emp-1',
        date: TEST_OPEN_DATE,
        time: '14:00',
        serviceDuration: 45,
        status: 'confirmed',
      },
    ];

    // Same stylist, overlapping window 14:15 - 15:00
    const busy = isStylistBusy('emp-1', TEST_OPEN_DATE, '14:15', 45, existingAppointments, []);
    assert.equal(busy, true);

    // Same stylist, non-overlapping window 15:00 - 15:45
    const free = isStylistBusy('emp-1', TEST_OPEN_DATE, '15:00', 45, existingAppointments, []);
    assert.equal(free, false);

    // Different stylist at the exact same time
    const otherStylistFree = isStylistBusy('emp-2', TEST_OPEN_DATE, '14:15', 45, existingAppointments, []);
    assert.equal(otherStylistFree, false);
  });

  test('isStylistBusy respects staff blocked breaks', () => {
    const blockedTimes = [
      {
        id: 'b1',
        employeeId: 'emp-1',
        start: '13:00',
        end: '14:00',
        reason: 'Lunch Break',
      },
    ];

    // Attempting to book during staff break 13:15
    const busyDuringBreak = isStylistBusy('emp-1', TEST_OPEN_DATE, '13:15', 45, [], blockedTimes);
    assert.equal(busyDuringBreak, true);

    // Attempting to book after staff break 14:00
    const freeAfterBreak = isStylistBusy('emp-1', TEST_OPEN_DATE, '14:00', 45, [], blockedTimes);
    assert.equal(freeAfterBreak, false);
  });
});

describe('Slot Validation & Smart Alternatives Generation', () => {
  test('refuses bookings outside business operating hours', () => {
    const result = validateAndFindSlots({
      service: 'Haircut & Styling',
      stylist: 'Sarah Jenkins',
      date: TEST_OPEN_DATE,
      time: '08:00', // Before 09:00 opening
      services: MOCK_SERVICES,
      staffList: MOCK_STAFF,
      appointments: [],
      blockedTimes: [],
      businessSettings: MOCK_SETTINGS,
    });

    assert.equal(result.available, false);
    assert.equal(result.reason, 'outside_hours');
    assert.ok(result.alternatives.length > 0);
  });

  test('refuses bookings on salon closed days and suggests next open day', () => {
    const result = validateAndFindSlots({
      service: 'Haircut & Styling',
      stylist: 'Sarah Jenkins',
      date: TEST_SUNDAY,
      time: '14:00',
      services: MOCK_SERVICES,
      staffList: MOCK_STAFF,
      appointments: [],
      blockedTimes: [],
      businessSettings: MOCK_SETTINGS,
    });

    assert.equal(result.available, false);
    assert.equal(result.reason, 'closed_day');
    assert.match(result.message, /closed on Sundays/i);
    assert.ok(result.alternatives.length > 0);
  });

  test('enforces stylist certification (stylist_not_qualified) and offers certified alternatives', () => {
    // David Miller is certified for Beard Grooming and Haircut, NOT Hair Coloring (Balayage)
    const result = validateAndFindSlots({
      service: 'Hair Coloring (Balayage)',
      stylist: 'David Miller',
      date: TEST_OPEN_DATE,
      time: '14:00',
      services: MOCK_SERVICES,
      staffList: MOCK_STAFF,
      appointments: [],
      blockedTimes: [],
      businessSettings: MOCK_SETTINGS,
    });

    assert.equal(result.available, false);
    assert.equal(result.reason, 'stylist_not_qualified');
    assert.match(result.message, /does not perform/i);
    // Suggests Emma Watson or Sarah Jenkins who ARE certified
    assert.ok(result.alternatives.length > 0);
  });

  test('generates dynamic alternatives when preferred stylist is booked', () => {
    const existingAppointments = [
      {
        id: 'apt-99',
        employeeId: 'emp-1',
        date: TEST_OPEN_DATE,
        time: '14:00',
        serviceDuration: 45,
        status: 'confirmed',
      },
    ];

    const result = validateAndFindSlots({
      service: 'Haircut & Styling',
      stylist: 'Sarah Jenkins',
      date: TEST_OPEN_DATE,
      time: '14:00',
      services: MOCK_SERVICES,
      staffList: MOCK_STAFF,
      appointments: existingAppointments,
      blockedTimes: [],
      businessSettings: MOCK_SETTINGS,
    });

    assert.equal(result.available, false);
    assert.equal(result.reason, 'stylist_conflict');
    // Expect both same-stylist offset alternatives (+/- 45 mins) AND cross-stylist alternative (Emma Watson at 14:00)
    assert.ok(result.alternatives.length >= 2);
    const hasSameTimeOtherStylist = result.alternatives.some(a => a.time === '14:00');
    assert.equal(hasSameTimeOtherStylist, true);
  });
});

describe('Critical Scenario: Double-Booking / Concurrency Invariant (PDF Page 8, 17)', () => {
  test('prevents two simultaneous requests from booking the exact same stylist and time', () => {
    let currentAppointments = [];

    function bookSlot(customer, time) {
      const evalSlot = validateAndFindSlots({
        service: 'Haircut & Styling',
        stylist: 'Sarah Jenkins',
        date: TEST_OPEN_DATE,
        time,
        services: MOCK_SERVICES,
        staffList: MOCK_STAFF,
        appointments: currentAppointments,
        blockedTimes: [],
        businessSettings: MOCK_SETTINGS,
      });

      if (evalSlot.available) {
        const newApt = {
          id: `apt-${Date.now()}-${customer}`,
          employeeId: evalSlot.employee.id,
          employeeName: evalSlot.employee.name,
          date: evalSlot.date,
          time: evalSlot.time,
          serviceDuration: evalSlot.duration,
          status: 'confirmed',
        };
        currentAppointments.push(newApt);
        return { success: true, appointment: newApt };
      }
      return { success: false, reason: evalSlot.reason, alternatives: evalSlot.alternatives };
    }

    // User A and User B attempt to book 15:00 with Sarah Jenkins simultaneously
    const resA = bookSlot('Alice', '15:00');
    const resB = bookSlot('Bob', '15:00');

    // Only ONE succeeds!
    assert.equal(resA.success, true);
    assert.equal(resB.success, false);
    assert.equal(resB.reason, 'stylist_conflict');
    assert.ok(resB.alternatives.length > 0);
  });
});

describe('AI Assistant Tool Definitions & Intent Dispatcher (Spec Pages 10-12, 23)', () => {
  test('correctly maps user queries to approved tool intents', () => {
    assert.equal(detectUserIntent('what services do you offer?'), ASSISTANT_TOOLS.DISCOVER_SERVICES);
    assert.equal(detectUserIntent('what appointments do i have this week?'), ASSISTANT_TOOLS.LIST_APPOINTMENTS);
    assert.equal(detectUserIntent('move my appointment to Friday afternoon'), ASSISTANT_TOOLS.RESCHEDULE_APPOINTMENT);
    assert.equal(detectUserIntent('cancel my booking tomorrow'), ASSISTANT_TOOLS.CANCEL_APPOINTMENT);
    assert.equal(detectUserIntent('what times are available on Friday?'), ASSISTANT_TOOLS.CHECK_AVAILABILITY);
    assert.equal(detectUserIntent('book me a haircut with Sarah at 2pm'), ASSISTANT_TOOLS.BOOK_APPOINTMENT);
  });

  test('executes DISCOVER_SERVICES tool returning structured menu', () => {
    const result = executeAssistantTool({
      tool: ASSISTANT_TOOLS.DISCOVER_SERVICES,
      userText: 'what services do you offer?',
      services: MOCK_SERVICES,
      staffList: MOCK_STAFF,
    });

    assert.equal(result.intent, 'DISCOVER_SERVICES');
    assert.match(result.message, /Haircut & Styling/);
    assert.match(result.message, /\$45/);
    assert.equal(result.structuredOutput.servicesCount, 3);
  });
});
