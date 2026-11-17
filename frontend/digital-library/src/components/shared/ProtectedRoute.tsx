import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { isAdminRole } from '@/utils/roles'

interface ProtectedRouteProps {
  allowedRoles?: string[]
  requireAdmin?: boolean
}

export default function ProtectedRoute({ allowedRoles, requireAdmin }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuthStore()
  const location = useLocation()

  if (!isAuthenticated) {
    sessionStorage.setItem('redirect_after_login', location.pathname + location.search)
    return <Navigate to="/login" replace />
  }

  if (requireAdmin && (!user || !isAdminRole(user.role))) {
    return <Navigate to="/personal" replace />
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/personal" replace />
  }

  return <Outlet />
}
