import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import posthog from './services/posthog';

function PostHogPageTracker() {
  const location = useLocation();
  useEffect(() => {
    try {
      posthog.capture('$pageview', {
        $current_url: window.location.href,
        path: location.pathname,
      });
    } catch {
      /* ignore if not yet initialized */
    }
  }, [location]);
  return null;
}
import { AuthProvider } from './context/AuthContext';
import { AppointmentProvider } from './context/AppointmentContext';
import Navbar from './components/shared/Navbar';
import ProtectedRoute from './components/shared/ProtectedRoute';
import LandingGateway from './pages/LandingGateway';
import ChatPage from './pages/ChatPage';
import AdminPage from './pages/AdminPage';
import CustomerDashboard from './pages/customer/CustomerDashboard';
import StaffDashboard from './pages/staff/StaffDashboard';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';

export default function App() {
  return (
    <AuthProvider>
      <AppointmentProvider>
        <BrowserRouter>
          <PostHogPageTracker />
          <div className="app-shell">
            <Navbar />
            <main className="app-content">
              <Routes>
                {/* Landing & Portal Gateway */}
                <Route path="/" element={<LandingGateway />} />

                {/* Authentication */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />

                {/* Customer Portal */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute allowedRoles={['CUSTOMER', 'ADMIN']}>
                      <CustomerDashboard />
                    </ProtectedRoute>
                  }
                />

                {/* Customer AI Booking Assistant */}
                <Route
                  path="/ai-booking"
                  element={
                    <ProtectedRoute allowedRoles={['CUSTOMER', 'ADMIN']}>
                      <ChatPage />
                    </ProtectedRoute>
                  }
                />

                {/* Staff Portal */}
                <Route
                  path="/staff"
                  element={
                    <ProtectedRoute allowedRoles={['STAFF', 'ADMIN']}>
                      <StaffDashboard />
                    </ProtectedRoute>
                  }
                />

                {/* Business Admin Portal */}
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN']}>
                      <AdminPage />
                    </ProtectedRoute>
                  }
                />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
          </div>
        </BrowserRouter>
      </AppointmentProvider>
    </AuthProvider>
  );
}
