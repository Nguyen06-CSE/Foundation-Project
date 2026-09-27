// src/hooks/useAuth.ts
import { useState, useEffect } from 'react';

export interface User {
  id: number;
  email: string;
  full_name?: string;
  role: 'system_admin' | 'school_admin' | 'faculty_admin' | 'user' | string;
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Đọc thông tin user lưu trữ ở localStorage hoặc sessionStorage
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Lỗi parse thông tin user:', error);
      }
    }
    setLoading(false);
  }, []);

  const login = (userData: User, token: string) => {
    localStorage.setItem('access_token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    logout,
  };
};

export default useAuth;