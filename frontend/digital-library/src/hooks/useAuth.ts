// src/hooks/useAuth.ts
import { useState, useEffect } from 'react';

export interface User {
  id: number;
  email: string;
  username?: string;
  full_name?: string;
  role: string; // VD: 'sysadmin', 'admin_cntt', 'student', ...
  student_code?: string;
  faculty_id?: number;
}

const getUserFromStorage = (): User | null => {
  const storedUser = localStorage.getItem('user');
  if (!storedUser) return null;
  try {
    return JSON.parse(storedUser);
  } catch {
    return null;
  }
};

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(getUserFromStorage);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    // Hàm lắng nghe sự thay đổi của authState trên toàn hệ thống
    const handleAuthChange = () => {
      setUser(getUserFromStorage());
    };

    window.addEventListener('auth-state-changed', handleAuthChange);
    window.addEventListener('storage', handleAuthChange);

    return () => {
      window.removeEventListener('auth-state-changed', handleAuthChange);
      window.removeEventListener('storage', handleAuthChange);
    };
  }, []);

  const login = (userData: User, token: string) => {
    localStorage.setItem('access_token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    // Bắn event để thông báo cho toàn bộ app
    window.dispatchEvent(new Event('auth-state-changed'));
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    setUser(null);
    window.dispatchEvent(new Event('auth-state-changed'));
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