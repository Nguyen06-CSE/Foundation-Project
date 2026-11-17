// frontend/digital-library/src/components/library/PublicLayout.tsx

import { useState, useRef, useEffect, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogIn, LogOut, Home, BookOpen, ChevronDown, Shield, Menu } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Sidebar } from "@/components/shared/layout/Sidebar";

interface PublicLayoutProps {
  children: ReactNode;
}

export function PublicLayout({ children }: PublicLayoutProps) {
  const navigate = useNavigate();
  const { user, isAuthenticated, clearAuth } = useAuthStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    clearAuth();
    setDropdownOpen(false);
    navigate("/library");
  };

  const isAdmin = user && ["faculty_admin", "school_admin", "system_admin"].includes(user.role);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-gray-50 text-gray-900">
      {/* ======================================
          DESKTOP SIDEBAR
      ====================================== */}
      <div className="hidden h-full md:block shrink-0">
        <Sidebar />
      </div>

      {/* ======================================
          MOBILE SIDEBAR DRAWER
      ====================================== */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Đóng menu"
            className="absolute inset-0 bg-gray-900/40"
            onClick={() => setIsSidebarOpen(false)}
          />
          <div className="relative h-full w-[260px] bg-white shadow-xl">
            <Sidebar onNavigate={() => setIsSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* ======================================
          MAIN AREA
      ====================================== */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6">
          {/* Left: Mobile hamburger & Logo */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 md:hidden"
              onClick={() => setIsSidebarOpen(true)}
              aria-label="Mở menu điều hướng"
            >
              <Menu className="h-5 w-5" />
            </button>

            <Link to="/library" className="flex items-center gap-3 group">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600 text-white font-bold text-lg shadow-sm group-hover:bg-primary-700 transition-colors">
                <BookOpen className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm sm:text-base font-bold text-gray-900 group-hover:text-primary-600 transition-colors leading-tight">
                  Kho Học Liệu Cộng Đồng
                </span>
                <span className="text-[11px] text-gray-500 leading-tight">
                  Thư viện số · Đại học Đà Lạt
                </span>
              </div>
            </Link>
          </div>

          {/* Right Action: Scope badge + Auth */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
              <span className="h-2 w-2 rounded-full bg-primary-500" />
              Kho học liệu mở
            </div>

            {isAuthenticated && user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setDropdownOpen((v) => !v)}
                  className="flex items-center gap-2 p-1 sm:pl-2.5 rounded-full border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors focus:outline-none"
                >
                  <Avatar name={user.full_name || user.username} size="sm" />
                  <span className="text-xs sm:text-sm font-semibold text-gray-800 hidden md:inline-block max-w-[130px] truncate">
                    {user.full_name || user.username}
                  </span>
                  <ChevronDown className="h-4 w-4 text-gray-400 mr-1 hidden sm:block" />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-xl border border-gray-100 bg-white p-1.5 shadow-xl z-50">
                    <div className="px-3 py-2 border-b border-gray-100 mb-1">
                      <p className="text-xs font-semibold text-gray-900 truncate">
                        {user.full_name || user.username}
                      </p>
                      <p className="text-[11px] text-gray-400 truncate">
                        {user.email}
                      </p>
                    </div>

                    <Link
                      to="/personal"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      <Home className="h-4 w-4 text-gray-500" />
                      <span>Về trang chủ của tôi</span>
                    </Link>

                    {isAdmin && (
                      <Link
                        to="/library/admin"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-primary-700 hover:bg-primary-50 transition-colors"
                      >
                        <Shield className="h-4 w-4 text-primary-600" />
                        <span>Quản lý kho học liệu</span>
                      </Link>
                    )}

                    <div className="my-1 h-px bg-gray-100" />

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  sessionStorage.setItem("redirect_after_login", window.location.pathname + window.location.search);
                  navigate("/login");
                }}
                icon={<LogIn className="h-4 w-4" />}
                className="font-medium text-xs sm:text-sm"
              >
                Đăng nhập
              </Button>
            )}
          </div>
        </header>

       <main className="min-h-0 flex-1 overflow-y-auto bg-gray-50 p-4 sm:p-5 lg:p-6">
          <div className="mx-auto w-full max-w-[1680px]">
            {children}
          </div>
          
          {/* Footer */}
          <footer className="mt-12 border-t border-gray-200 bg-transparent py-6 text-center text-xs text-gray-500">
            <p>© Hệ thống Thư viện số — Trường Đại học Đà Lạt · Kho học liệu mở</p>
          </footer>
        </main>
      </div>
    </div>
  );
}

export default PublicLayout;
