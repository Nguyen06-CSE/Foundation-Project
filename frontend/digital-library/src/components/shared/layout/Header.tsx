// frontend/digital-library/src/components/shared/Header.tsx

import { useState, useRef, useEffect } from "react";
import { Bell, Menu, LogOut, CheckCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Avatar } from "@/components/ui/Avatar";
import { useAuthStore } from "@/stores/authStore";
import { notificationService } from "@/services/notificationService";
import { formatRelativeDate } from "@/utils/formatDate";
import { cn } from "@/utils/cn";
import { SearchBar } from "./SearchBar";
import type { Notification } from "@/types/notification";

export interface HeaderProps {
  scopeLabel: string;
  notificationCount?: number;
  onMenuClick?: () => void;
}

export function Header({ scopeLabel, onMenuClick }: HeaderProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: notificationService.getUnreadCount,
    enabled: Boolean(user),
    refetchInterval: 30000,
    retry: false,
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications", "list"],
    queryFn: () => notificationService.getAll({ page: 1, page_size: 8 }),
    enabled: Boolean(user) && dropdownOpen,
    retry: false,
  });

  const markReadMutation = useMutation({
    mutationFn: notificationService.markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: notificationService.markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  const handleNotificationClick = (n: Notification) => {
    if (!n.is_read) {
      markReadMutation.mutate(n.id);
    }
    setDropdownOpen(false);
    if (n.link) {
      navigate(n.link);
    } else if (n.type === "community_submission_received") {
      navigate("/library/admin/submissions?status=pending");
    } else {
      navigate("/personal");
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const displayName = user?.full_name || user?.username || "Người dùng";
  const displayRole =
    user?.role === "student" || user?.role === "Sinh viên"
      ? "Sinh viên"
      : user?.role || "Người dùng";

  return (
    <header className="flex h-16 w-full items-center justify-between border-b border-gray-200 bg-white px-6">
      {/* Left: Logo & System Name */}
      <div className="flex shrink-0 items-center gap-2 md:w-[212px]">
        <button
          type="button"
          className="mr-1 rounded-lg p-2 text-gray-600 hover:bg-gray-100 md:hidden"
          onClick={onMenuClick}
          aria-label="Mở menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 text-lg font-bold text-white">
          L
        </div>
        <span className="hidden text-lg font-bold text-gray-900 sm:inline">Digital Library</span>
      </div>

      {/* Center: Search */}
      <div className="hidden flex-1 justify-center px-6 sm:flex">
        <SearchBar />
      </div>

      {/* Right: Actions & User */}
      <div className="flex shrink-0 items-center gap-4">
        <div className="hidden items-center gap-2 rounded-full bg-primary-50 px-3 py-1.5 text-sm font-medium text-primary-700 sm:flex">
          <div className="h-2 w-2 rounded-full bg-primary-500" />
          {scopeLabel}
        </div>

        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen((v) => !v)}
            aria-label="Thông báo"
            className="relative rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 text-[10px] font-bold text-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg sm:w-96">
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                <span className="text-sm font-semibold text-gray-900">
                  Thông báo {unreadCount > 0 ? `(${unreadCount})` : ""}
                </span>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={() => markAllReadMutation.mutate()}
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    Đọc tất cả
                  </button>
                )}
              </div>

              <div className="max-h-80 divide-y divide-gray-100 overflow-y-auto">
                {notifications.length > 0 ? (
                  notifications.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => handleNotificationClick(n)}
                      className={cn(
                        "flex w-full items-start gap-2.5 px-4 py-3 text-left transition-colors hover:bg-gray-50",
                        !n.is_read && "bg-primary-50/40"
                      )}
                    >
                      <span
                        className={cn(
                          "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                          !n.is_read ? "bg-primary-600" : "bg-gray-300"
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "text-xs text-gray-900",
                            !n.is_read ? "font-semibold" : "font-normal text-gray-700"
                          )}
                        >
                          {n.message}
                        </p>
                        {n.created_at && (
                          <p className="mt-0.5 text-[11px] text-gray-400">
                            {formatRelativeDate(n.created_at)}
                          </p>
                        )}
                      </div>
                    </button>
                  ))
                ) : (
                  <p className="px-4 py-8 text-center text-xs text-gray-500">
                    Chưa có thông báo nào.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 border-l border-gray-200 pl-4">
          <Avatar name={displayName} />
          <div className="hidden flex-col md:flex">
            <span className="text-sm font-semibold text-gray-900">{displayName}</span>
            <span className="text-xs text-gray-500">{displayRole}</span>
          </div>
          <button
            onClick={handleLogout}
            title="Đăng xuất"
            className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
