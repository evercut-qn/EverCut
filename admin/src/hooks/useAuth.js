'use client';

import { useContext, createContext } from 'react';

const AuthContext = createContext(null);

/**
 * Context provider to share the active admin profile and session states.
 *
 * @param {Object} props
 * @param {Object} props.value - Profile state values containing name, phone, and role
 * @param {React.ReactNode} props.children
 */
export function AuthProvider({ value, children }) {
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access the current admin operator's session and permissions.
 *
 * @returns {{id: string, name: string, role: string, phone: string}} Hydrated user session properties
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be executed within an AuthProvider');
  }
  return context;
}
