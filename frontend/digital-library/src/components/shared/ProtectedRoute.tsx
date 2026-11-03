import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { isAdminRole } from '@/utils/roles'

interface ProtectedRouteProps {
  allowedRoles?: string[]
  requireAdmin?: boolean
}

export default function ProtectedRoute({ allowedRoles, requireAdmin }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuthStore()

  if (!isAuthenticated) {
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
