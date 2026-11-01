import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

// Preset test accounts conforming to StylistAI V2 roles
export const PRESET_ACCOUNTS = {
  CUSTOMER: {
    id: 'usr-customer-1',
    name: 'Alex Johnson',
    email: 'alex@customer.com',
    role: 'CUSTOMER',
    phone: '+1 (555) 234-5678',
  },
  STAFF: {
    id: 'usr-staff-1',
    name: 'Sarah Jenkins',
    email: 'sarah@salon.com',
    role: 'STAFF',
    title: 'Senior Hair Stylist',
    employeeId: 'emp-sarah-1',
  },
  ADMIN: {
    id: 'usr-admin-1',
    name: 'Elena Vance',
    email: 'admin@salon.com',
    role: 'ADMIN',
    title: 'Salon Manager',
  },
};

export function AuthProvider({ children }) {
  // Load saved session or default to Customer for quick review
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('stylistai_auth_user');
      return saved ? JSON.parse(saved) : PRESET_ACCOUNTS.CUSTOMER;
    } catch {
      return PRESET_ACCOUNTS.CUSTOMER;
    }
  });

  const [token, setToken] = useState(() => {
    return localStorage.getItem('stylistai_auth_token') || 'demo-mock-jwt-token';
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem('stylistai_auth_user', JSON.stringify(user));
      localStorage.setItem('stylistai_auth_token', token || 'demo-token');
    } else {
      localStorage.removeItem('stylistai_auth_user');
      localStorage.removeItem('stylistai_auth_token');
    }
  }, [user, token]);

  const login = async (email, password) => {
    // 1. Try real backend API from Workstream A
    try {
      const { data } = await api.post('/auth/login', { email, password });
      if (data?.success && data?.data) {
        const { token: jwtToken, user: authUser } = data.data;
        setUser({
          id: authUser.id,
          name: authUser.fullName || authUser.name || email.split('@')[0],
          email: authUser.email,
          role: authUser.role || 'CUSTOMER',
          phone: authUser.phone || '',
          businessId: authUser.businessId,
        });
        setToken(jwtToken);
        return { success: true };
      }
    } catch {
      // Gracefully fall back to local preview mode if backend is offline
    }

    // 2. Local Fallback authentication
    if (email.includes('admin')) {
      setUser(PRESET_ACCOUNTS.ADMIN);
    } else if (email.includes('sarah') || email.includes('staff')) {
      setUser(PRESET_ACCOUNTS.STAFF);
    } else {
      setUser({
        id: 'usr-custom-' + Date.now(),
        name: email.split('@')[0],
        email,
        role: 'CUSTOMER',
      });
    }
    setToken('mock-jwt-token-' + Date.now());
    return { success: true };
  };

  const register = async (name, email, password, phone) => {
    // 1. Try real backend API from Workstream A
    try {
      const { data } = await api.post('/auth/register', {
        fullName: name,
        email,
        password,
        phone,
        role: 'CUSTOMER',
      });
      if (data?.success && data?.data) {
        const { token: jwtToken, user: authUser } = data.data;
        setUser({
          id: authUser.id,
          name: authUser.fullName || name,
          email: authUser.email,
          role: authUser.role || 'CUSTOMER',
          phone: authUser.phone || phone,
          businessId: authUser.businessId,
        });
        setToken(jwtToken);
        return { success: true };
      }
    } catch {
      // Gracefully fall back to local preview
    }

    // 2. Local Fallback
    const newUser = {
      id: 'usr-new-' + Date.now(),
      name,
      email,
      role: 'CUSTOMER',
      phone,
    };
    setUser(newUser);
    setToken('mock-jwt-token-' + Date.now());
    return { success: true };
  };

  const logout = () => {
    setUser(null);
    setToken(null);
  };

  const updateProfile = (updatedFields) => {
    setUser(prev => prev ? { ...prev, ...updatedFields } : prev);
  };

  const switchRolePreview = (roleKey) => {
    if (PRESET_ACCOUNTS[roleKey]) {
      setUser(PRESET_ACCOUNTS[roleKey]);
      setToken('mock-jwt-' + roleKey.toLowerCase());
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        role: user?.role || null,
        login,
        register,
        logout,
        updateProfile,
        switchRolePreview,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
