import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Role } from '../types';
import { api } from '../services/api';
import { initAndRegisterFcmToken } from '../utils/fcm';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password?: string) => Promise<void>;
  register: (payload: { name: string; email: string; password: string; confirmPassword?: string; companyName?: string }) => Promise<void>;
  logout: () => void;
  quickSwitchAccount: (email: string, password?: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('pms_auth_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = useCallback(async () => {
    localStorage.removeItem('pms_auth_token');
    setToken(null);
    setUser(null);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email: string, password?: string) => {
    setIsLoading(true);
    try {
      let pwd = password;
      if (!pwd) {
        if (email.includes('alex') || email.includes('sarah') || email.includes('admin')) {
          pwd = 'Admin@123';
        } else if (email.includes('jonathan') || email.includes('client') || email.includes('acme')) {
          pwd = 'Client@123';
        } else {
          pwd = 'User@123';
        }
      }
      const response = await api.login({ email, password: pwd });
      localStorage.setItem('pms_auth_token', response.token);
      setToken(response.token);
      setUser(response.user);

      // Request notification permission and register user's FCM token
      initAndRegisterFcmToken().catch((e) => console.info('[FCM] Token registration:', e?.message || e));
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (payload: { name: string; email: string; password: string; confirmPassword?: string; companyName?: string }) => {
    setIsLoading(true);
    try {
      const response = await api.register(payload);
      localStorage.setItem('pms_auth_token', response.token);
      setToken(response.token);
      setUser(response.user);

      // Request notification permission and register user's FCM token
      initAndRegisterFcmToken().catch((e) => console.info('[FCM] Token registration:', e?.message || e));
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('pms_auth_token');
    setToken(null);
    setUser(null);
  };

  const quickSwitchAccount = async (email: string, password?: string) => {
    await login(email, password);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        logout,
        quickSwitchAccount,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
