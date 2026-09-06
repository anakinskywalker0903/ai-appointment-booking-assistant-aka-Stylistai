import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/shared/Navbar';
import ProtectedRoute from './components/shared/ProtectedRoute';
import ChatPage from './pages/ChatPage';
import AdminPage from './pages/AdminPage';
import CustomerDashboard from './pages/customer/CustomerDashboard';
import StaffDashboard from './pages/staff/StaffDashboard';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="app-shell">
          <Navbar />
          <main className="app-content">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<ChatPage />} />
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
    </AuthProvider>
  );
}
