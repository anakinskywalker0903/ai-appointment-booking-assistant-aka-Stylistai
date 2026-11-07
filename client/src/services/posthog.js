import posthog from 'posthog-js';

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY || 'phc_kuB6uVU6SNoAE8JtpPnTTVmaonXQs2jH8FELxRMgyvYt';
const rawHost = import.meta.env.VITE_POSTHOG_HOST;
const POSTHOG_HOST = (rawHost && !rawHost.includes('us.i.posthog.com'))
  ? rawHost
  : 'https://eu.i.posthog.com';

let isInitialized = false;

export function initPostHog() {
  if (typeof window === 'undefined' || isInitialized) return;

  if (POSTHOG_KEY) {
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      ui_host: 'https://eu.posthog.com',
      autocapture: true,
      capture_pageview: true,
      capture_pageleave: true,
      disable_session_recording: false,
      session_recording: {
        maskAllInputs: false,
        maskInputOptions: {
          password: true,
        },
      },
      loaded: (ph) => {
        if (import.meta.env.DEV) {
          console.log('[PostHog] Initialized successfully with host:', POSTHOG_HOST);
        }
      },
    });
    isInitialized = true;
  }
}

export function trackEvent(eventName, properties = {}) {
  try {
    if (isInitialized) {
      posthog.capture(eventName, {
        timestamp: new Date().toISOString(),
        ...properties,
      });
    }
  } catch (err) {
    console.warn('[PostHog] Event track failed:', err.message);
  }
}

export function identifyUser(userId, traits = {}) {
  try {
    if (isInitialized && userId) {
      posthog.identify(userId, traits);
    }
  } catch (err) {
    console.warn('[PostHog] User identify failed:', err.message);
  }
}

export function resetUser() {
  try {
    if (isInitialized) {
      posthog.reset();
    }
  } catch (err) {
    console.warn('[PostHog] Reset failed:', err.message);
  }
}

export default posthog;
