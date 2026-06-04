import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  if (!user.is_approved && !user.is_superuser) return <Navigate to="/pending" replace />

  const effectiveRole = user.is_superuser ? 'ADMIN' : user.role
  if (role && effectiveRole !== role) return <Navigate to="/dashboard" replace />

  return children
}
